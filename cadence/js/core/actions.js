/* Cadence — the verbs. Views call these; they never mutate state directly.
   Anything destructive or surprising routes through here so it lands in the
   undo stack and announces itself with a toast. */
(function (global) {
  'use strict';

  function toast(msg, opts) {
    if (global.UI && UI.toast) UI.toast(msg, opts);
  }
  function undoable(msg) { toast(msg, { undo: true }); }

  /* ---------------- events ---------------- */

  function createEvent(payload, opts) {
    opts = opts || {};
    var ev = M.makeEvent(payload);
    S.add('events', ev, 'Create event');
    if (!opts.silent) undoable('Event created');
    return ev;
  }

  function baseEventOf(inst) {
    return S.get('events', inst.seriesId || inst.id) || S.get('events', inst.id);
  }

  /* scope: 'this' | 'future' | 'all' (ignored when the event does not repeat) */
  function updateEvent(inst, patch, scope, opts) {
    opts = opts || {};
    var base = baseEventOf(inst);
    if (!base) return null;
    var repeats = !!base.recurrence;
    if (!repeats) scope = 'all';
    scope = scope || 'all';

    if (scope === 'all') {
      var applied = Object.assign({}, patch);
      if (repeats && (patch.start || patch.end)) {
        // Shift the whole series by however far this occurrence moved.
        var deltaStart = patch.start ? (T.w(patch.start) - inst.startWall) : 0;
        var deltaEnd = patch.end ? (T.w(patch.end) - inst.endWall) : 0;
        applied.start = T.iso(new Date(T.w(base.start).getTime() + deltaStart));
        applied.end = T.iso(new Date(T.w(base.end).getTime() + deltaEnd));
      }
      S.update('events', base.id, applied, 'Edit event');
      if (!opts.silent) undoable(opts.message || 'Event updated');
      return S.get('events', base.id);
    }

    if (scope === 'this') {
      var key = inst.occurrenceKey || T.key(inst.startWall);
      var detached = Object.assign({}, base, {
        start: inst.start, end: inst.end
      }, patch);
      delete detached.id; delete detached.createdAt;
      detached.recurrence = null;
      detached.exdates = [];
      detached.seriesId = base.id;
      detached.overrideKey = key;
      var made = M.makeEvent(detached);
      S.commit('Edit occurrence', function (st) {
        var b = null;
        for (var i = 0; i < st.events.length; i++) if (st.events[i].id === base.id) b = st.events[i];
        if (b) {
          b.exdates = (b.exdates || []).concat([key]);
          b.updatedAt = new Date().toISOString();
        }
        st.events.push(made);
      }, ['events']);
      if (!opts.silent) undoable(opts.message || 'This occurrence updated');
      return made;
    }

    // 'future'
    var split = R.splitSeries(base, T.startOfDay(inst.startWall));
    var tail = Object.assign(split.tail, patch);
    if (patch.start) {
      var d = T.w(patch.start) - inst.startWall;
      tail.start = T.iso(new Date(T.w(split.tail.start).getTime() + d));
    }
    if (patch.end) {
      var d2 = T.w(patch.end) - inst.endWall;
      tail.end = T.iso(new Date(T.w(split.tail.end).getTime() + d2));
    }
    var newSeries = M.makeEvent(tail);
    S.commit('Edit future occurrences', function (st) {
      for (var i = 0; i < st.events.length; i++) {
        if (st.events[i].id === base.id) {
          Object.assign(st.events[i], split.head, { updatedAt: new Date().toISOString() });
        }
      }
      st.events.push(newSeries);
    }, ['events']);
    if (!opts.silent) undoable(opts.message || 'This and future events updated');
    return newSeries;
  }

  function moveEvent(inst, newStartWall, newEndWall, scope) {
    return updateEvent(inst, {
      start: T.iso(newStartWall),
      end: T.iso(newEndWall)
    }, scope || (inst.isInstance ? 'this' : 'all'), { message: 'Event moved' });
  }

  function deleteEvent(inst, scope, opts) {
    opts = opts || {};
    var base = baseEventOf(inst);
    if (!base) return false;
    var repeats = !!base.recurrence;
    if (!repeats) scope = 'all';

    if (scope === 'this') {
      var key = inst.occurrenceKey || T.key(inst.startWall);
      S.commit('Delete occurrence', function (st) {
        for (var i = 0; i < st.events.length; i++) {
          if (st.events[i].id === base.id) {
            st.events[i].exdates = (st.events[i].exdates || []).concat([key]);
            st.events[i].updatedAt = new Date().toISOString();
          }
        }
      }, ['events']);
      undoable('Occurrence deleted');
      return true;
    }
    if (scope === 'future') {
      var split = R.splitSeries(base, T.startOfDay(inst.startWall));
      S.update('events', base.id, split.head, 'Delete future occurrences');
      undoable('Future occurrences deleted');
      return true;
    }
    // 'all' — also clears the link on a task that pointed at this block.
    S.commit('Delete event', function (st) {
      st.events = st.events.filter(function (e) {
        return e.id !== base.id && e.seriesId !== base.id;
      });
      st.tasks.forEach(function (t) {
        if (t.scheduledEventId === base.id) {
          t.scheduledEventId = null;
          if (t.status === 'planned') t.status = 'inbox';
        }
      });
    }, ['events', 'tasks']);
    if (!opts.silent) undoable('Event deleted');
    return true;
  }

  function duplicateEvent(inst, offsetDays, customDayWall) {
    var base = baseEventOf(inst) || inst;
    var startWall = inst.startWall || T.w(inst.start);
    var endWall = inst.endWall || T.w(inst.end);
    var duration = endWall - startWall;
    var newStart;
    if (customDayWall) {
      newStart = new Date(customDayWall);
      newStart.setHours(startWall.getHours(), startWall.getMinutes(), 0, 0);
    } else {
      newStart = T.addDays(startWall, offsetDays || 0);
    }
    var copy = Object.assign({}, base);
    delete copy.id; delete copy.createdAt;
    copy.recurrence = null;
    copy.exdates = [];
    copy.seriesId = null;
    copy.title = base.title;
    copy.start = T.iso(newStart);
    copy.end = T.iso(new Date(newStart.getTime() + duration));
    var made = M.makeEvent(copy);
    S.add('events', made, 'Duplicate event');
    undoable('Event duplicated to ' + T.relativeDay(newStart));
    return made;
  }

  /* ---------------- tasks ---------------- */

  function createTask(payload, opts) {
    opts = opts || {};
    var task = M.makeTask(payload);
    S.add('tasks', task, 'Create task');
    if (!opts.silent) undoable('Task created');
    return task;
  }

  function updateTask(id, patch, message) {
    var t = S.update('tasks', id, patch, 'Edit task');
    if (message !== false) undoable(message || 'Task updated');
    return t;
  }

  function completeTask(id, done) {
    var task = S.get('tasks', id);
    if (!task) return null;
    var isDone = done === undefined ? task.status !== 'completed' : done;
    var next = isDone
      ? { status: 'completed', completedAt: new Date().toISOString() }
      : { status: task.scheduledEventId ? 'planned' : 'inbox', completedAt: null };

    S.commit(isDone ? 'Complete task' : 'Reopen task', function (st) {
      var t = null;
      for (var i = 0; i < st.tasks.length; i++) if (st.tasks[i].id === id) t = st.tasks[i];
      if (!t) return false;
      Object.assign(t, next, { updatedAt: new Date().toISOString() });
      // Keep any linked calendar block in step so the day view reads honestly.
      if (t.scheduledEventId) {
        for (var j = 0; j < st.events.length; j++) {
          if (st.events[j].id === t.scheduledEventId) st.events[j].done = isDone;
        }
      }
      // A recurring task rolls forward instead of disappearing.
      if (isDone && t.recurrence && t.due) {
        var nextDue = nextRecurrenceDate(t.recurrence, T.w(t.due));
        if (nextDue) {
          var clone = M.makeTask(Object.assign({}, t, {
            id: undefined, createdAt: undefined,
            status: 'inbox', completedAt: null, scheduledEventId: null,
            due: T.iso(nextDue),
            subtasks: (t.subtasks || []).map(function (s) { return { id: M.uid('sub'), title: s.title, done: false }; })
          }));
          st.tasks.push(clone);
        }
      }
    }, ['tasks', 'events']);
    undoable(isDone ? 'Task completed' : 'Task reopened');
    return S.get('tasks', id);
  }

  function nextRecurrenceDate(rec, fromWall) {
    var n = R.normalize(rec);
    var cursor = T.addDays(fromWall, 1);
    for (var i = 0; i < 400; i++) {
      if (R.matchesDay(n, fromWall, cursor)) return cursor;
      cursor = T.addDays(cursor, 1);
    }
    return null;
  }

  function deleteTask(id) {
    var task = S.get('tasks', id);
    if (!task) return false;
    S.commit('Delete task', function (st) {
      st.tasks = st.tasks.filter(function (t) { return t.id !== id; });
      st.tasks.forEach(function (t) {
        if (t.dependsOn && t.dependsOn.indexOf(id) >= 0) {
          t.dependsOn = t.dependsOn.filter(function (d) { return d !== id; });
        }
      });
      if (task.scheduledEventId) {
        st.events = st.events.filter(function (e) { return e.id !== task.scheduledEventId; });
      }
    }, ['tasks', 'events']);
    undoable('Task deleted');
    return true;
  }

  /* Turn a task into a real block on the calendar and link the two together. */
  function scheduleTask(taskId, startWall, minutes) {
    var task = S.get('tasks', taskId);
    if (!task) return null;
    minutes = minutes || Q.taskEstimate(task);
    var endWall = T.addMinutes(startWall, minutes);
    var ev = M.makeEvent({
      title: task.title,
      start: T.iso(startWall),
      end: T.iso(endWall),
      categoryId: task.categoryId,
      projectId: task.projectId,
      goalId: task.goalId,
      taskId: task.id,
      priority: task.priority,
      tags: task.tags,
      calendarId: 'cal_personal',
      type: 'block',
      description: task.description
    });
    S.commit('Schedule task', function (st) {
      st.events.push(ev);
      for (var i = 0; i < st.tasks.length; i++) {
        if (st.tasks[i].id === taskId) {
          // Remove a previous block so a task never has two homes.
          var old = st.tasks[i].scheduledEventId;
          if (old) st.events = st.events.filter(function (e) { return e.id !== old; });
          st.tasks[i].scheduledEventId = ev.id;
          if (st.tasks[i].status === 'inbox') st.tasks[i].status = 'planned';
          st.tasks[i].updatedAt = new Date().toISOString();
        }
      }
    }, ['tasks', 'events']);
    undoable('Scheduled for ' + T.relativeDay(startWall) + ' at ' + T.fmtTime(startWall, S.settings().use24Hour));
    return ev;
  }

  function unscheduleTask(taskId) {
    var task = S.get('tasks', taskId);
    if (!task || !task.scheduledEventId) return false;
    S.commit('Unschedule task', function (st) {
      st.events = st.events.filter(function (e) { return e.id !== task.scheduledEventId; });
      for (var i = 0; i < st.tasks.length; i++) {
        if (st.tasks[i].id === taskId) {
          st.tasks[i].scheduledEventId = null;
          if (st.tasks[i].status === 'planned') st.tasks[i].status = 'inbox';
        }
      }
    }, ['tasks', 'events']);
    undoable('Removed from calendar');
    return true;
  }

  /* Convert a task into a standalone event, dropping the task. */
  function convertTaskToEvent(taskId, startWall, minutes) {
    var task = S.get('tasks', taskId);
    if (!task) return null;
    minutes = minutes || Q.taskEstimate(task);
    var ev = M.makeEvent({
      title: task.title,
      start: T.iso(startWall),
      end: T.iso(T.addMinutes(startWall, minutes)),
      description: task.description,
      categoryId: task.categoryId,
      projectId: task.projectId,
      goalId: task.goalId,
      tags: task.tags,
      priority: task.priority
    });
    S.commit('Convert task to event', function (st) {
      st.events.push(ev);
      st.tasks = st.tasks.filter(function (t) { return t.id !== taskId; });
    }, ['tasks', 'events']);
    undoable('Task converted to event');
    return ev;
  }

  function rescheduleTask(taskId, newDueWall, message) {
    var task = S.get('tasks', taskId);
    if (!task) return null;
    var due = new Date(newDueWall);
    if (!task.hasDueTime) due.setHours(23, 59, 0, 0);
    var t = S.update('tasks', taskId, { due: T.iso(due) }, 'Reschedule task');
    undoable(message || ('Moved to ' + T.relativeDay(due)));
    return t;
  }

  function reorderTasks(orderedIds) {
    S.commit('Reorder tasks', function (st) {
      orderedIds.forEach(function (id, i) {
        for (var j = 0; j < st.tasks.length; j++) {
          if (st.tasks[j].id === id) st.tasks[j].order = i;
        }
      });
    }, ['tasks']);
  }

  function toggleSubtask(taskId, subId) {
    S.commit('Toggle subtask', function (st) {
      st.tasks.forEach(function (t) {
        if (t.id !== taskId) return;
        (t.subtasks || []).forEach(function (s) { if (s.id === subId) s.done = !s.done; });
        t.updatedAt = new Date().toISOString();
      });
    }, ['tasks']);
  }

  /* Split an oversized task into a checklist of smaller steps. */
  function breakDownTask(taskId, titles) {
    var task = S.get('tasks', taskId);
    if (!task || !titles.length) return null;
    var each = task.estimate ? Math.max(15, Math.round(task.estimate / titles.length / 5) * 5) : null;
    var made = titles.map(function (title, i) {
      return M.makeTask({
        title: title,
        due: task.due,
        hasDueTime: task.hasDueTime,
        estimate: each,
        priority: task.priority,
        projectId: task.projectId,
        goalId: task.goalId,
        deadlineId: task.deadlineId,
        categoryId: task.categoryId,
        tags: task.tags,
        status: 'inbox',
        order: (task.order || 0) + i * 0.001
      });
    });
    S.commit('Break down task', function (st) {
      st.tasks = st.tasks.filter(function (t) { return t.id !== taskId; });
      st.tasks = st.tasks.concat(made);
      if (task.scheduledEventId) {
        st.events = st.events.filter(function (e) { return e.id !== task.scheduledEventId; });
      }
    }, ['tasks', 'events']);
    undoable('Split into ' + made.length + ' tasks');
    return made;
  }

  /* ---------------- deadlines ---------------- */
  function createDeadline(payload, opts) {
    var d = M.makeDeadline(payload);
    S.add('deadlines', d, 'Create deadline');
    if (!(opts && opts.silent)) undoable('Deadline created');
    return d;
  }
  function updateDeadline(id, patch, message) {
    var d = S.update('deadlines', id, patch, 'Edit deadline');
    if (message !== false) undoable(message || 'Deadline updated');
    return d;
  }
  function toggleDeadline(id) {
    var d = S.get('deadlines', id);
    if (!d) return null;
    var done = !d.done;
    S.update('deadlines', id, { done: done, completedAt: done ? new Date().toISOString() : null }, 'Complete deadline');
    undoable(done ? 'Deadline marked complete' : 'Deadline reopened');
    return S.get('deadlines', id);
  }
  function deleteDeadline(id) {
    S.commit('Delete deadline', function (st) {
      st.deadlines = st.deadlines.filter(function (d) { return d.id !== id; });
      st.tasks.forEach(function (t) { if (t.deadlineId === id) t.deadlineId = null; });
    }, ['deadlines', 'tasks']);
    undoable('Deadline deleted');
  }

  /* ---------------- notes ---------------- */
  function createNote(payload, opts) {
    var n = M.makeNote(payload);
    S.add('notes', n, 'Create note');
    if (!(opts && opts.silent)) undoable('Note created');
    return n;
  }
  function updateNote(id, patch, message) {
    var n = S.update('notes', id, patch, 'Edit note');
    if (message) undoable(message);
    return n;
  }
  function deleteNote(id) {
    S.remove('notes', id, 'Delete note');
    undoable('Note deleted');
  }

  /* ---------------- projects ---------------- */
  function createProject(payload, opts) {
    var p = M.makeProject(payload);
    S.add('projects', p, 'Create project');
    if (!(opts && opts.silent)) undoable('Project created');
    return p;
  }
  function updateProject(id, patch, message) {
    var p = S.update('projects', id, patch, 'Edit project');
    if (message !== false) undoable(message || 'Project updated');
    return p;
  }
  /* Deleting a project never deletes its contents — it only unlinks them. */
  function deleteProject(id) {
    S.commit('Delete project', function (st) {
      st.projects = st.projects.filter(function (p) { return p.id !== id; });
      st.tasks.forEach(function (t) { if (t.projectId === id) t.projectId = null; });
      st.events.forEach(function (e) { if (e.projectId === id) e.projectId = null; });
      st.notes.forEach(function (n) { if (n.projectId === id) n.projectId = null; });
      st.deadlines.forEach(function (d) { if (d.projectId === id) d.projectId = null; });
    }, ['projects', 'tasks', 'events', 'notes', 'deadlines']);
    undoable('Project deleted — its tasks and notes were kept');
  }

  /* ---------------- goals ---------------- */
  function createGoal(payload, opts) {
    var g = M.makeGoal(payload);
    S.add('goals', g, 'Create goal');
    if (!(opts && opts.silent)) undoable('Goal created');
    return g;
  }
  function updateGoal(id, patch, message) {
    var g = S.update('goals', id, patch, 'Edit goal');
    if (message !== false) undoable(message || 'Goal updated');
    return g;
  }
  function toggleMilestone(goalId, milestoneId) {
    S.commit('Toggle milestone', function (st) {
      st.goals.forEach(function (g) {
        if (g.id !== goalId) return;
        (g.milestones || []).forEach(function (m) {
          if (m.id === milestoneId) { m.done = !m.done; m.completedAt = m.done ? new Date().toISOString() : null; }
        });
        g.updatedAt = new Date().toISOString();
      });
    }, ['goals']);
  }
  function deleteGoal(id) {
    S.commit('Delete goal', function (st) {
      st.goals = st.goals.filter(function (g) { return g.id !== id; });
      st.tasks.forEach(function (t) { if (t.goalId === id) t.goalId = null; });
      st.projects.forEach(function (p) { if (p.goalId === id) p.goalId = null; });
      st.habits.forEach(function (h) { if (h.goalId === id) h.goalId = null; });
    }, ['goals', 'tasks', 'projects', 'habits']);
    undoable('Goal deleted');
  }

  /* ---------------- habits ---------------- */
  function createHabit(payload, opts) {
    var h = M.makeHabit(payload);
    S.add('habits', h, 'Create habit');
    if (!(opts && opts.silent)) undoable('Habit created');
    return h;
  }
  function updateHabit(id, patch, message) {
    var h = S.update('habits', id, patch, 'Edit habit');
    if (message !== false) undoable(message || 'Habit updated');
    return h;
  }
  function toggleHabit(id, dayKey) {
    S.commit('Log habit', function (st) {
      st.habits.forEach(function (h) {
        if (h.id !== id) return;
        h.log = h.log || {};
        if (h.log[dayKey]) delete h.log[dayKey];
        else h.log[dayKey] = true;
        h.updatedAt = new Date().toISOString();
      });
    }, ['habits']);
  }
  function deleteHabit(id) {
    S.remove('habits', id, 'Delete habit');
    undoable('Habit deleted');
  }

  /* ---------------- captures ---------------- */
  function addCapture(text) {
    var c = M.makeCapture({ text: text });
    S.add('captures', c, 'Quick capture');
    return c;
  }
  function deleteCapture(id) {
    S.remove('captures', id, 'Discard capture');
    undoable('Note discarded');
  }
  function markCaptureProcessed(id) {
    S.update('captures', id, { processed: true }, 'Process capture');
  }

  /* Apply a reviewed batch of parsed items in one undoable step. */
  function applyOrganized(items, captureId) {
    var created = { events: 0, tasks: 0, deadlines: 0, notes: 0, projects: 0, goals: 0, habits: 0 };
    S.commit('Organize items', function (st) {
      items.forEach(function (item) {
        switch (item.type) {
          case 'event': st.events.push(M.makeEvent(item.payload)); created.events++; break;
          case 'task': st.tasks.push(M.makeTask(item.payload)); created.tasks++; break;
          case 'deadline': st.deadlines.push(M.makeDeadline(item.payload)); created.deadlines++; break;
          case 'note': st.notes.push(M.makeNote(item.payload)); created.notes++; break;
          case 'project': st.projects.push(M.makeProject(item.payload)); created.projects++; break;
          case 'goal': st.goals.push(M.makeGoal(item.payload)); created.goals++; break;
          case 'habit': st.habits.push(M.makeHabit(item.payload)); created.habits++; break;
        }
      });
      if (captureId) {
        st.captures = st.captures.filter(function (c) { return c.id !== captureId; });
      }
    }, ['events', 'tasks', 'deadlines', 'notes', 'projects', 'goals', 'habits', 'captures']);

    var parts = [];
    Object.keys(created).forEach(function (k) {
      if (created[k]) parts.push(created[k] + ' ' + (created[k] === 1 ? k.replace(/s$/, '') : k));
    });
    undoable(parts.length ? 'Added ' + parts.join(', ') : 'Nothing added');
    return created;
  }

  /* ---------------- templates ---------------- */
  function saveTemplate(name, payload) {
    var t = M.makeTemplate({ name: name, payload: payload });
    S.add('templates', t, 'Save template');
    toast('Template “' + name + '” saved');
    return t;
  }
  function deleteTemplate(id) {
    S.remove('templates', id, 'Delete template');
    undoable('Template deleted');
  }

  /* ---------------- calendars & categories ---------------- */
  function toggleCalendar(id) {
    S.quiet(function (st) {
      st.calendars.forEach(function (c) { if (c.id === id) c.visible = c.visible === false; });
    });
  }
  function toggleLayer(id) {
    S.quiet(function (st) {
      st.settings.layers = st.settings.layers || {};
      st.settings.layers[id] = st.settings.layers[id] === false;
    });
  }
  function createCalendar(name, color) {
    var cal = { id: M.uid('cal'), name: name, color: color, visible: true };
    S.commit('Add calendar', function (st) { st.calendars.push(cal); }, ['calendars']);
    return cal;
  }
  function updateCalendar(id, patch) {
    S.commit('Edit calendar', function (st) {
      st.calendars.forEach(function (c) { if (c.id === id) Object.assign(c, patch); });
    }, ['calendars']);
  }
  function deleteCalendar(id) {
    S.commit('Delete calendar', function (st) {
      st.calendars = st.calendars.filter(function (c) { return c.id !== id; });
      st.events.forEach(function (e) { if (e.calendarId === id) e.calendarId = 'cal_personal'; });
    }, ['calendars', 'events']);
    undoable('Calendar deleted — its events moved to Personal');
  }
  function createCategory(name, color) {
    var cat = { id: M.uid('cat'), name: name, color: color, block: true };
    S.commit('Add category', function (st) { st.categories.push(cat); }, ['categories']);
    return cat;
  }
  function updateCategory(id, patch) {
    S.commit('Edit category', function (st) {
      st.categories.forEach(function (c) { if (c.id === id) Object.assign(c, patch); });
    }, ['categories']);
  }
  function deleteCategory(id) {
    S.commit('Delete category', function (st) {
      st.categories = st.categories.filter(function (c) { return c.id !== id; });
      ['events', 'tasks', 'habits'].forEach(function (coll) {
        st[coll].forEach(function (item) { if (item.categoryId === id) item.categoryId = null; });
      });
    }, ['categories', 'events', 'tasks', 'habits']);
    undoable('Category deleted');
  }

  /* ---------------- people ---------------- */
  function upsertPerson(name) {
    var existing = S.all('people').filter(function (p) {
      return p.name.toLowerCase() === String(name).toLowerCase();
    })[0];
    if (existing) return existing;
    var p = M.makePerson({ name: name });
    S.add('people', p, 'Add person');
    return p;
  }

  /* ---------------- undo ---------------- */
  function undo() {
    var entry = S.undo();
    if (!entry) { toast('Nothing to undo'); return; }
    toast('Undone: ' + entry.label.toLowerCase(), { redo: true });
  }
  function redo() {
    var entry = S.redo();
    if (!entry) { toast('Nothing to redo'); return; }
    toast('Redone: ' + entry.label.toLowerCase());
  }

  global.A = {
    createEvent: createEvent, updateEvent: updateEvent, moveEvent: moveEvent,
    deleteEvent: deleteEvent, duplicateEvent: duplicateEvent, baseEventOf: baseEventOf,
    createTask: createTask, updateTask: updateTask, completeTask: completeTask,
    deleteTask: deleteTask, scheduleTask: scheduleTask, unscheduleTask: unscheduleTask,
    convertTaskToEvent: convertTaskToEvent, rescheduleTask: rescheduleTask,
    reorderTasks: reorderTasks, toggleSubtask: toggleSubtask, breakDownTask: breakDownTask,
    createDeadline: createDeadline, updateDeadline: updateDeadline,
    toggleDeadline: toggleDeadline, deleteDeadline: deleteDeadline,
    createNote: createNote, updateNote: updateNote, deleteNote: deleteNote,
    createProject: createProject, updateProject: updateProject, deleteProject: deleteProject,
    createGoal: createGoal, updateGoal: updateGoal, toggleMilestone: toggleMilestone, deleteGoal: deleteGoal,
    createHabit: createHabit, updateHabit: updateHabit, toggleHabit: toggleHabit, deleteHabit: deleteHabit,
    addCapture: addCapture, deleteCapture: deleteCapture, markCaptureProcessed: markCaptureProcessed,
    applyOrganized: applyOrganized,
    saveTemplate: saveTemplate, deleteTemplate: deleteTemplate,
    toggleCalendar: toggleCalendar, toggleLayer: toggleLayer,
    createCalendar: createCalendar, updateCalendar: updateCalendar, deleteCalendar: deleteCalendar,
    createCategory: createCategory, updateCategory: updateCategory, deleteCategory: deleteCategory,
    upsertPerson: upsertPerson,
    undo: undo, redo: redo
  };
})(window);
