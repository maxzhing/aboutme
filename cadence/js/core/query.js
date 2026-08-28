/* Cadence — derived reads. Views never walk the raw state; they ask here.
   Everything returned is wall-time (`startWall` / `endWall`) and ready to lay out. */
(function (global) {
  'use strict';

  var cache = { key: null, value: null };
  S.on('change', function () { cache.key = null; });

  function settings() { return S.settings(); }

  function visibleCalendars() {
    var out = {};
    S.all('calendars').forEach(function (c) { if (c.visible !== false) out[c.id] = true; });
    return out;
  }

  function layerOn(id) {
    var l = settings().layers || {};
    return l[id] !== false;
  }

  /* ---------- colours ---------- */
  function categoryColor(id) {
    var c = S.get('categories', id);
    return c ? c.color : null;
  }
  function calendarColor(id) {
    var c = S.get('calendars', id);
    return c ? c.color : '#4a86d8';
  }
  function eventColor(ev) {
    return ev.color || categoryColor(ev.categoryId) || projectColor(ev.projectId) || calendarColor(ev.calendarId);
  }
  function projectColor(id) {
    var p = id && S.get('projects', id);
    return p ? p.color : null;
  }
  function taskColor(task) {
    return categoryColor(task.categoryId) || projectColor(task.projectId) ||
      (M.PRIORITIES.filter(function (p) { return p.id === task.priority; })[0] || {}).color || '#7b8496';
  }

  /* ---------- calendar items ---------- */
  /* Every scheduled event instance overlapping [from,to], including detached
     single-occurrence edits, with series exclusions already applied. */
  function eventsInRange(from, to, opts) {
    opts = opts || {};
    var vis = visibleCalendars();
    var raw = S.all('events');
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var ev = raw[i];
      if (!opts.ignoreLayers && ev.calendarId && !vis[ev.calendarId]) continue;
      if (opts.calendarId && ev.calendarId !== opts.calendarId) continue;
      if (opts.projectId && ev.projectId !== opts.projectId) continue;
      var list = R.expandEvent(ev, from, to);
      for (var j = 0; j < list.length; j++) out.push(list[j]);
    }
    out.sort(function (a, b) {
      return (a.startWall - b.startWall) || (b.endWall - b.startWall) - (a.endWall - a.startWall);
    });
    return out;
  }

  function eventsOnDay(dayWall, opts) {
    return eventsInRange(T.startOfDay(dayWall), T.endOfDay(dayWall), opts);
  }

  /* One pass over a range, bucketed by day key.

     Views that draw many days at once (month, year, agenda) must not call
     eventsOnDay per cell: that re-expands every recurring event once per day,
     which turns a year view into a visible freeze on a large calendar. */
  function dayBuckets(from, to, opts) {
    opts = opts || {};
    var buckets = { events: {}, deadlines: {}, tasks: {}, counts: {} };
    var cursor = T.startOfDay(from), end = T.endOfDay(to), guard = 0;
    while (cursor <= end && guard++ < 800) {
      var k = T.key(cursor);
      buckets.events[k] = [];
      buckets.deadlines[k] = [];
      buckets.tasks[k] = [];
      buckets.counts[k] = 0;
      cursor = T.addDays(cursor, 1);
    }

    eventsInRange(from, to, opts).forEach(function (ev) {
      // A multi-day event belongs to every day it touches.
      var day = T.startOfDay(ev.startWall);
      var last = T.startOfDay(new Date(Math.max(ev.startWall.getTime(), ev.endWall.getTime() - 1000)));
      var steps = 0;
      while (day <= last && steps++ < 400) {
        var key = T.key(day);
        if (buckets.events[key]) { buckets.events[key].push(ev); buckets.counts[key]++; }
        day = T.addDays(day, 1);
      }
    });

    if (!opts.skipDeadlines) {
      S.all('deadlines').forEach(function (d) {
        if (d.done && !opts.includeDone) return;
        var key = T.key(T.w(d.due));
        if (buckets.deadlines[key]) { buckets.deadlines[key].push(d); buckets.counts[key]++; }
      });
    }
    if (!opts.skipTasks) {
      S.all('tasks').forEach(function (t) {
        if (!t.due || t.status === 'archived') return;
        var key = T.key(T.w(t.due));
        if (buckets.tasks[key]) buckets.tasks[key].push(t);
      });
    }

    Object.keys(buckets.deadlines).forEach(function (k) {
      buckets.deadlines[k].sort(function (a, b) { return T.w(a.due) - T.w(b.due); });
    });
    return buckets;
  }

  function timedEvents(list) {
    return list.filter(function (e) { return !e.allDay && !isMultiDay(e); });
  }
  function allDayEvents(list) {
    return list.filter(function (e) { return e.allDay || isMultiDay(e); });
  }
  function isMultiDay(e) {
    return !T.sameDay(e.startWall, new Date(e.endWall.getTime() - 1));
  }

  /* ---------- tasks ---------- */
  function activeTasks() {
    return S.all('tasks').filter(function (t) {
      return t.status !== 'completed' && t.status !== 'archived';
    });
  }

  function tasksDueOn(dayWall) {
    var start = T.startOfDay(dayWall), end = T.endOfDay(dayWall);
    return S.all('tasks').filter(function (t) {
      if (!t.due || t.status === 'archived') return false;
      var d = T.w(t.due);
      return d >= start && d <= end;
    });
  }

  function tasksDueInRange(from, to) {
    return S.all('tasks').filter(function (t) {
      if (!t.due || t.status === 'archived') return false;
      var d = T.w(t.due);
      return d >= from && d <= to;
    });
  }

  function overdueTasks(nowWall) {
    nowWall = nowWall || T.nowWall();
    var startToday = T.startOfDay(nowWall);
    return activeTasks().filter(function (t) {
      if (!t.due) return false;
      var d = T.w(t.due);
      return t.hasDueTime ? d < nowWall : d < startToday;
    }).sort(function (a, b) { return T.w(a.due) - T.w(b.due); });
  }

  function tasksForProject(projectId) {
    return S.all('tasks').filter(function (t) { return t.projectId === projectId; });
  }
  function tasksForGoal(goalId) {
    return S.all('tasks').filter(function (t) { return t.goalId === goalId; });
  }
  function tasksForDeadline(deadlineId) {
    return S.all('tasks').filter(function (t) { return t.deadlineId === deadlineId; });
  }

  function taskIsBlocked(task) {
    if (!task.dependsOn || !task.dependsOn.length) return false;
    return task.dependsOn.some(function (id) {
      var dep = S.get('tasks', id);
      return dep && dep.status !== 'completed';
    });
  }

  function blockingTasks(task) {
    return (task.dependsOn || []).map(function (id) { return S.get('tasks', id); })
      .filter(function (t) { return t && t.status !== 'completed'; });
  }

  function taskEstimate(task) {
    return task.estimate || settings().defaultTaskEstimate || 45;
  }

  /* ---------- deadlines ---------- */
  function deadlinesInRange(from, to, includeDone) {
    return S.all('deadlines').filter(function (d) {
      if (d.done && !includeDone) return false;
      var due = T.w(d.due);
      return due >= from && due <= to;
    }).sort(function (a, b) { return T.w(a.due) - T.w(b.due); });
  }

  function upcomingDeadlines(limit, nowWall) {
    nowWall = nowWall || T.nowWall();
    var out = S.all('deadlines').filter(function (d) { return !d.done; })
      .sort(function (a, b) { return T.w(a.due) - T.w(b.due); });
    return limit ? out.slice(0, limit) : out;
  }

  function deadlineStatus(d, nowWall) {
    nowWall = nowWall || T.nowWall();
    var due = T.w(d.due);
    var days = T.diffDays(nowWall, due);
    if (d.done) return { level: 'done', label: 'Completed' };
    if (due < nowWall) return { level: 'overdue', label: 'Overdue', days: days };
    if (days === 0) return { level: 'today', label: 'Due today', days: 0 };
    if (days === 1) return { level: 'tomorrow', label: 'Due tomorrow', days: 1 };
    if (days <= 3) return { level: 'soon', label: days + ' days remaining', days: days };
    if (days <= 14) return { level: 'upcoming', label: days + ' days remaining', days: days };
    return { level: 'far', label: T.fmtDateShort(due), days: days };
  }

  /* ---------- habits ---------- */
  function habitsForDay(dayWall) {
    var key = T.key(dayWall);
    return S.all('habits').filter(function (h) {
      return !h.archived && R.habitDueOn(h, dayWall);
    }).map(function (h) {
      return { habit: h, done: !!(h.log || {})[key], key: key };
    });
  }

  /* ---------- projects & goals ---------- */
  function projectProgress(projectId) {
    var tasks = tasksForProject(projectId).filter(function (t) { return t.status !== 'archived'; });
    if (!tasks.length) return { done: 0, total: 0, pct: 0 };
    var done = tasks.filter(function (t) { return t.status === 'completed'; }).length;
    return { done: done, total: tasks.length, pct: Math.round(done / tasks.length * 100) };
  }

  function goalProgress(goalId) {
    var goal = S.get('goals', goalId);
    if (!goal) return { pct: 0, done: 0, total: 0 };
    var ms = goal.milestones || [];
    var projects = S.all('projects').filter(function (p) { return p.goalId === goalId; });
    var tasks = tasksForGoal(goalId).filter(function (t) { return t.status !== 'archived'; });

    var parts = [];
    if (ms.length) parts.push(ms.filter(function (m) { return m.done; }).length / ms.length);
    projects.forEach(function (p) {
      var pr = projectProgress(p.id);
      if (pr.total) parts.push(pr.pct / 100);
    });
    if (tasks.length && !ms.length && !projects.length) {
      parts.push(tasks.filter(function (t) { return t.status === 'completed'; }).length / tasks.length);
    }
    var pct = parts.length ? Math.round(parts.reduce(function (a, b) { return a + b; }, 0) / parts.length * 100) : 0;
    return {
      pct: pct,
      done: ms.filter(function (m) { return m.done; }).length,
      total: ms.length,
      projects: projects, tasks: tasks
    };
  }

  /* ---------- links ---------- */
  function notesFor(field, id) {
    return S.all('notes').filter(function (n) { return n[field] === id && !n.archived; });
  }

  function eventsForProject(projectId, from, to) {
    return eventsInRange(from || T.addDays(T.nowWall(), -90), to || T.addDays(T.nowWall(), 180), { ignoreLayers: true })
      .filter(function (e) { return e.projectId === projectId; });
  }

  /* ---------- conflicts ---------- */
  /* Pairs of timed events that genuinely overlap. All-day items never conflict. */
  function findConflicts(items) {
    var timed = items.filter(function (e) { return !e.allDay; })
      .sort(function (a, b) { return a.startWall - b.startWall; });
    var pairs = [];
    for (var i = 0; i < timed.length; i++) {
      for (var j = i + 1; j < timed.length; j++) {
        if (timed[j].startWall >= timed[i].endWall) break;
        if (T.overlaps(timed[i].startWall, timed[i].endWall, timed[j].startWall, timed[j].endWall)) {
          pairs.push([timed[i], timed[j]]);
        }
      }
    }
    return pairs;
  }

  function conflictIds(items) {
    var set = {};
    findConflicts(items).forEach(function (p) {
      set[p[0].instanceId] = true;
      set[p[1].instanceId] = true;
    });
    return set;
  }

  /* ---------- layout ---------- */
  /* Assign overlapping events to columns so a busy day stays readable. */
  function layoutColumns(events) {
    var sorted = events.slice().sort(function (a, b) {
      return (a.startWall - b.startWall) || (b.endWall - a.endWall);
    });
    var groups = [];
    var current = [];
    var groupEnd = null;
    sorted.forEach(function (ev) {
      if (current.length && ev.startWall >= groupEnd) {
        groups.push(current); current = []; groupEnd = null;
      }
      current.push(ev);
      groupEnd = groupEnd ? new Date(Math.max(groupEnd, ev.endWall)) : new Date(ev.endWall);
    });
    if (current.length) groups.push(current);

    var out = [];
    groups.forEach(function (group) {
      var columns = [];
      group.forEach(function (ev) {
        var placed = false;
        for (var c = 0; c < columns.length; c++) {
          var col = columns[c];
          if (col[col.length - 1].endWall <= ev.startWall) {
            col.push(ev); ev._col = c; placed = true; break;
          }
        }
        if (!placed) { ev._col = columns.length; columns.push([ev]); }
      });
      group.forEach(function (ev) {
        // Widen an event into free columns to its right when nothing overlaps there.
        var span = 1;
        for (var c = ev._col + 1; c < columns.length; c++) {
          var blocked = columns[c].some(function (o) {
            return T.overlaps(ev.startWall, ev.endWall, o.startWall, o.endWall);
          });
          if (blocked) break;
          span++;
        }
        out.push({ event: ev, col: ev._col, span: span, cols: columns.length });
      });
    });
    return out;
  }

  /* ---------- misc ---------- */
  function allTags() {
    var set = {};
    ['events', 'tasks', 'notes', 'projects', 'goals', 'deadlines'].forEach(function (coll) {
      S.all(coll).forEach(function (item) {
        (item.tags || []).forEach(function (t) { set[t] = (set[t] || 0) + 1; });
      });
    });
    return Object.keys(set).sort(function (a, b) { return set[b] - set[a]; })
      .map(function (t) { return { tag: t, count: set[t] }; });
  }

  function counts() {
    var now = T.nowWall();
    return {
      inbox: S.all('tasks').filter(function (t) { return t.status === 'inbox'; }).length,
      captures: S.all('captures').filter(function (c) { return !c.processed; }).length,
      overdue: overdueTasks(now).length,
      today: tasksDueOn(now).filter(function (t) { return t.status !== 'completed'; }).length
    };
  }

  global.Q = {
    visibleCalendars: visibleCalendars, layerOn: layerOn,
    categoryColor: categoryColor, calendarColor: calendarColor, eventColor: eventColor,
    projectColor: projectColor, taskColor: taskColor,
    eventsInRange: eventsInRange, eventsOnDay: eventsOnDay, dayBuckets: dayBuckets,
    timedEvents: timedEvents, allDayEvents: allDayEvents, isMultiDay: isMultiDay,
    activeTasks: activeTasks, tasksDueOn: tasksDueOn, tasksDueInRange: tasksDueInRange,
    overdueTasks: overdueTasks, tasksForProject: tasksForProject, tasksForGoal: tasksForGoal,
    tasksForDeadline: tasksForDeadline, taskIsBlocked: taskIsBlocked, blockingTasks: blockingTasks,
    taskEstimate: taskEstimate,
    deadlinesInRange: deadlinesInRange, upcomingDeadlines: upcomingDeadlines, deadlineStatus: deadlineStatus,
    habitsForDay: habitsForDay,
    projectProgress: projectProgress, goalProgress: goalProgress,
    notesFor: notesFor, eventsForProject: eventsForProject,
    findConflicts: findConflicts, conflictIds: conflictIds, layoutColumns: layoutColumns,
    allTags: allTags, counts: counts
  };
})(window);
