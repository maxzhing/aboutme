/* Cadence — create/edit sheets for every entity.
   Common shape: essential fields up top, advanced ones behind a disclosure, and
   a footer that always offers Cancel / Save plus the destructive action last. */
(function (global) {
  'use strict';
  var UI = global.UI = global.UI || {};
  var F = UI.F;

  /* Which occurrences does this edit apply to? */
  function pickScope(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var settled = false;
      var layer = UI.modal({
        size: 'sm',
        title: opts.title || 'This is a repeating event',
        subtitle: opts.subtitle || 'Which occurrences should change?',
        onClose: function () { if (!settled) resolve(null); },
        body: D.h('div.scope-choices', [
          choice('this', 'This event only', 'Other occurrences stay as they are'),
          choice('future', 'This and all future events', 'Earlier occurrences stay as they are'),
          choice('all', 'All events in the series', 'Every occurrence changes')
        ])
      });
      function choice(value, label, hint) {
        return D.h('button.scope-choice', {
          type: 'button',
          'data-autofocus': value === 'this' ? '' : null,
          onclick: function () { settled = true; layer.close(); resolve(value); }
        }, [
          D.h('span.scope-choice__label', { text: label }),
          D.h('span.scope-choice__hint', { text: hint })
        ]);
      }
    });
  }

  function footerButtons(layer, opts) {
    var right = D.h('div.sheet__foot-right', [
      D.h('button.btn.btn--ghost', { type: 'button', onclick: function () { layer.close(); } }, 'Cancel'),
      D.h('button.btn.btn--primary', { type: 'button', onclick: opts.onSave }, opts.saveLabel || 'Save')
    ]);
    var left = D.h('div.sheet__foot-left');
    if (opts.onDelete) {
      left.appendChild(D.h('button.btn.btn--ghost.btn--danger-text', {
        type: 'button', onclick: opts.onDelete
      }, [D.icon('trash', 15), 'Delete']));
    }
    if (opts.extra) D.append(left, opts.extra);
    return [left, right];
  }

  /* ------------------------------------------------------------------ event */

  function editEvent(source, opts) {
    opts = opts || {};
    var isNew = !source || !source.id;
    var base = isNew ? null : A.baseEventOf(source);
    var inst = source || {};
    var st = S.settings();

    var startWall = inst.startWall || (inst.start ? T.w(inst.start) : T.snap(T.nowWall(), 30));
    var endWall = inst.endWall || (inst.end ? T.w(inst.end) : T.addMinutes(startWall, st.defaultEventDuration));
    var repeats = base && base.recurrence;

    var titleInput = F.text({
      value: inst.title || '', placeholder: 'Add a title', autofocus: true, class: 'input--title'
    });
    titleInput.classList.add('input--title');

    var allDayToggle = F.toggle({ value: !!inst.allDay });
    var startDate = F.date({ value: startWall, ariaLabel: 'Start date' });
    var startTime = F.time({ value: startWall, ariaLabel: 'Start time' });
    var endDate = F.date({ value: endWall, ariaLabel: 'End date' });
    var endTime = F.time({ value: endWall, ariaLabel: 'End time' });
    var timeRow = D.h('div.when-grid');
    var durationHint = D.h('span.when__duration');

    function currentStart() {
      var d = startDate.getValue() || T.startOfDay(T.nowWall());
      var m = allDayToggle.getValue() ? 0 : (startTime.getValue() || 0);
      return T.atMinutes(d, m);
    }
    function currentEnd() {
      var d = endDate.getValue() || startDate.getValue() || T.startOfDay(T.nowWall());
      var m = allDayToggle.getValue() ? 24 * 60 - 1 : (endTime.getValue() == null ? 60 : endTime.getValue());
      return T.atMinutes(d, m);
    }
    function refreshDuration() {
      var s = currentStart(), e = currentEnd();
      if (e <= s) {
        durationHint.textContent = 'End is before start';
        durationHint.classList.add('is-error');
      } else {
        durationHint.classList.remove('is-error');
        durationHint.textContent = allDayToggle.getValue()
          ? (T.diffDays(s, e) + 1) + ' day' + (T.diffDays(s, e) ? 's' : '')
          : T.humanDuration(T.diffMinutes(s, e));
      }
    }
    // Dragging the start should carry the end along, the way a person expects.
    var lastStart = startWall.getTime();
    function onStartChanged() {
      var s = currentStart();
      var delta = s.getTime() - lastStart;
      if (delta) {
        var e = new Date(currentEnd().getTime() + delta);
        endDate.value = T.fmtInputDate(e);
        if (!allDayToggle.getValue()) endTime.value = T.fmtInputTime(e);
        lastStart = s.getTime();
      }
      refreshDuration();
    }
    startDate.addEventListener('change', onStartChanged);
    startTime.addEventListener('change', onStartChanged);
    endDate.addEventListener('change', refreshDuration);
    endTime.addEventListener('change', refreshDuration);

    function paintWhen() {
      D.clear(timeRow);
      var allDay = allDayToggle.getValue();
      timeRow.appendChild(D.h('div.when-grid__cell', [
        D.h('span.when__label', { text: 'Starts' }),
        D.h('div.when__inputs', allDay ? [startDate] : [startDate, startTime])
      ]));
      timeRow.appendChild(D.h('div.when-grid__cell', [
        D.h('span.when__label', { text: 'Ends' }),
        D.h('div.when__inputs', allDay ? [endDate] : [endDate, endTime])
      ]));
      refreshDuration();
    }
    allDayToggle.addEventListener('click', function () { setTimeout(paintWhen, 0); });
    paintWhen();

    var calendarSel = F.calendarSelect(inst.calendarId);
    var categorySel = F.categorySelect(inst.categoryId);
    var colorPick = F.colorPicker({ value: inst.color || null });
    var locationInput = F.text({ value: inst.location || '', placeholder: 'Add a location' });
    var travelInput = F.number({ value: inst.travelMinutes || null, min: 0, max: 240, step: 5, placeholder: '0', ariaLabel: 'Travel minutes' });
    var descInput = F.textarea({ value: inst.description || '', placeholder: 'Notes, agenda, links…', rows: 3 });
    var tagsInput = F.tags({ value: inst.tags || [] });
    var prioritySel = F.select({
      value: inst.priority || '', ariaLabel: 'Priority',
      options: [{ value: '', label: 'No priority' }].concat(M.PRIORITIES.map(function (p) { return { value: p.id, label: p.label }; }))
    });
    var projectSel = F.projectSelect(inst.projectId);
    var goalSel = F.goalSelect(inst.goalId);
    var peopleInput = F.participants({ value: inst.participants || [] });
    var reminderInput = F.reminders({ value: inst.reminders || st.defaultReminders.event || [] });
    var recurInput = F.recurrence({ value: base ? base.recurrence : null });
    var attachInput = F.attachments({ value: inst.attachments || [], links: inst.links || [] });
    var tzSel = F.select({
      value: inst.tz || '', ariaLabel: 'Time zone',
      options: [{ value: '', label: 'Your time zone (' + T.zone() + ')' }].concat(
        T.commonZones().map(function (z) { return { value: z, label: z.replace(/_/g, ' ') }; }))
    });

    var body = D.h('div.editor', [
      F.field(null, titleInput, { class: 'field--title' }),
      D.h('div.editor__row', [
        D.h('label.checkline', [allDayToggle, D.h('span', { text: 'All day' })])
      ]),
      timeRow,
      D.h('p.when__meta', durationHint),
      D.h('div.editor__grid', [
        F.field('Calendar', calendarSel),
        F.field('Category', categorySel)
      ]),
      F.field('Repeat', recurInput),
      F.disclosure('More options', D.h('div.editor__advanced', [
        F.field('Location', locationInput),
        F.field('Travel time', D.h('div.inline-num', [travelInput, D.h('span', { text: 'minutes before and after' })]), {
          hint: 'Blocks time either side so the calendar knows you are moving.'
        }),
        F.field('Description', descInput),
        F.field('People', peopleInput),
        D.h('div.editor__grid', [
          F.field('Project', projectSel),
          F.field('Goal', goalSel)
        ]),
        D.h('div.editor__grid', [
          F.field('Priority', prioritySel),
          F.field('Time zone', tzSel)
        ]),
        F.field('Tags', tagsInput),
        F.field('Colour', colorPick),
        F.field('Reminders', reminderInput),
        F.field('Attachments', attachInput)
      ]))
    ]);

    var layer = UI.sheet({
      title: isNew ? 'New event' : 'Edit event',
      subtitle: repeats ? R.describe(base.recurrence) : null,
      body: body,
      footer: function (l) {
        return footerButtons(l, {
          onSave: save,
          onDelete: isNew ? null : remove,
          extra: isNew ? null : D.h('button.btn.btn--ghost.btn--sm', {
            type: 'button',
            onclick: function (e) { openEventMenu(e.currentTarget, inst, l); }
          }, [D.icon('more', 15), 'More'])
        });
      }
    });

    function collect() {
      var s = currentStart(), e = currentEnd();
      if (e <= s) e = T.addMinutes(s, allDayToggle.getValue() ? 24 * 60 - 1 : st.defaultEventDuration);
      return {
        title: titleInput.getValue() || 'Untitled event',
        start: T.iso(s),
        end: T.iso(e),
        allDay: allDayToggle.getValue(),
        calendarId: calendarSel.getValue() || 'cal_personal',
        categoryId: categorySel.getValue(),
        color: colorPick.getValue(),
        location: locationInput.getValue(),
        travelMinutes: travelInput.getValue() || 0,
        description: descInput.getValue(),
        participants: peopleInput.getValue(),
        tags: tagsInput.getValue(),
        priority: prioritySel.getValue(),
        projectId: projectSel.getValue(),
        goalId: goalSel.getValue(),
        reminders: reminderInput.getValue(),
        recurrence: recurInput.getValue(),
        attachments: attachInput.getValue(),
        links: attachInput.getLinks(),
        tz: tzSel.getValue()
      };
    }

    function save() {
      var payload = collect();
      payload.participants.forEach(function (p) { if (p.name) A.upsertPerson(p.name); });

      if (isNew) {
        var made = A.createEvent(payload);
        layer.close();
        warnAboutConflicts(made);
        return;
      }
      var ruleChanged = JSON.stringify(R.normalize(payload.recurrence)) !== JSON.stringify(R.normalize(base.recurrence));
      if (repeats && !ruleChanged) {
        pickScope().then(function (scope) {
          if (!scope) return;
          A.updateEvent(inst, payload, scope);
          layer.close();
        });
      } else {
        A.updateEvent(inst, payload, 'all');
        layer.close();
      }
    }

    function remove() {
      if (repeats) {
        pickScope({ title: 'Delete repeating event', subtitle: 'Which occurrences should be deleted?' })
          .then(function (scope) {
            if (!scope) return;
            A.deleteEvent(inst, scope);
            layer.close();
          });
        return;
      }
      UI.confirm({
        title: 'Delete this event?',
        message: '“' + (inst.title || 'Untitled event') + '” will be removed. You can undo this straight away.',
        confirmLabel: 'Delete', tone: 'danger'
      }).then(function (ok) {
        if (!ok) return;
        A.deleteEvent(inst, 'all');
        layer.close();
      });
    }

    return layer;
  }

  function openEventMenu(anchor, inst, layer) {
    UI.menu(anchor, [
      { label: 'Duplicate', icon: 'copy', onClick: function () { A.duplicateEvent(inst, 0); layer.close(); } },
      { label: 'Duplicate tomorrow', icon: 'arrowRight', onClick: function () { A.duplicateEvent(inst, 1); layer.close(); } },
      { label: 'Duplicate next week', icon: 'arrowRight', onClick: function () { A.duplicateEvent(inst, 7); layer.close(); } },
      { separator: true },
      {
        label: 'Save as template', icon: 'save', onClick: function () {
          var name = global.prompt('Template name', inst.title || 'Template');
          if (!name) return;
          A.saveTemplate(name, {
            title: inst.title,
            durationMinutes: T.diffMinutes(T.w(inst.start), T.w(inst.end)),
            categoryId: inst.categoryId, calendarId: inst.calendarId,
            location: inst.location, travelMinutes: inst.travelMinutes,
            description: inst.description, reminders: inst.reminders, tags: inst.tags
          });
        }
      },
      {
        label: 'Find another time', icon: 'search', onClick: function () {
          layer.close();
          UI.findTimeDialog({
            minutes: T.diffMinutes(T.w(inst.start), T.w(inst.end)),
            title: inst.title,
            onPick: function (slot) {
              A.moveEvent(inst, slot.start, T.addMinutes(slot.start, slot.minutes), inst.isInstance ? 'this' : 'all');
            }
          });
        }
      }
    ], { align: 'right' });
  }

  function warnAboutConflicts(ev) {
    var day = T.w(ev.start);
    var items = Q.eventsOnDay(day, { ignoreLayers: true });
    var pairs = Q.findConflicts(items).filter(function (p) {
      return p[0].id === ev.id || p[1].id === ev.id;
    });
    if (!pairs.length) return;
    var other = pairs[0][0].id === ev.id ? pairs[0][1] : pairs[0][0];
    UI.toast('“' + ev.title + '” overlaps “' + other.title + '”', {
      tone: 'warn',
      actions: [{ label: 'Resolve', onClick: function () { UI.conflictDialog(pairs[0]); } }]
    });
  }

  /* ------------------------------------------------------------------- task */

  function editTask(source, opts) {
    opts = opts || {};
    var isNew = !source || !source.id;
    var task = source || {};
    var st = S.settings();

    var titleInput = F.text({ value: task.title || '', placeholder: 'What needs doing?', autofocus: true });
    titleInput.classList.add('input--title');
    var dueDate = F.date({ value: task.due ? T.w(task.due) : null, ariaLabel: 'Due date' });
    var dueTime = F.time({ value: task.hasDueTime && task.due ? T.w(task.due) : null, ariaLabel: 'Due time' });
    var estimateInput = F.duration({ value: task.estimate == null ? null : task.estimate });
    var prioritySel = F.prioritySelect(task.priority || 'medium');
    var statusSel = F.statusSelect(task.status || 'inbox');
    var projectSel = F.projectSelect(task.projectId);
    var goalSel = F.goalSelect(task.goalId);
    var deadlineSel = F.deadlineSelect(task.deadlineId);
    var categorySel = F.categorySelect(task.categoryId);
    var tagsInput = F.tags({ value: task.tags || [] });
    var descInput = F.textarea({ value: task.description || '', placeholder: 'Details…', rows: 2 });
    var notesInput = F.textarea({ value: task.notes || '', placeholder: 'Working notes…', rows: 2 });
    var recurInput = F.recurrence({ value: task.recurrence });
    var attachInput = F.attachments({ value: task.attachments || [], links: task.links || [] });
    var subtasksInput = subtaskEditor(task.subtasks || []);
    var dependsInput = dependencyEditor(task);

    var quadrantHint = D.h('p.field__hint');
    function refreshQuadrant() {
      var draft = { priority: prioritySel.getValue(), due: dueDate.getValue() ? T.iso(dueDate.getValue()) : null };
      var q = SCHED.quadrant(draft);
      quadrantHint.textContent = q.label + ' — ' + q.hint.toLowerCase() + '.';
    }
    prioritySel.addEventListener('click', function () { setTimeout(refreshQuadrant, 0); });
    dueDate.addEventListener('change', refreshQuadrant);
    refreshQuadrant();

    var body = D.h('div.editor', [
      F.field(null, titleInput, { class: 'field--title' }),
      D.h('div.editor__grid', [
        F.field('Due date', D.h('div.when__inputs', [dueDate, dueTime]), { hint: 'Leave the time blank for “any time that day”.' }),
        F.field('Status', statusSel)
      ]),
      F.field('How long will it take?', estimateInput, { hint: 'Used to find realistic slots on your calendar.' }),
      F.field('Priority', prioritySel),
      quadrantHint,
      F.field('Subtasks', subtasksInput),
      F.disclosure('More options', D.h('div.editor__advanced', [
        D.h('div.editor__grid', [F.field('Project', projectSel), F.field('Goal', goalSel)]),
        D.h('div.editor__grid', [F.field('Deadline', deadlineSel), F.field('Category', categorySel)]),
        F.field('Description', descInput),
        F.field('Notes', notesInput),
        F.field('Waiting on', dependsInput, { hint: 'This task stays out of suggestions until those are done.' }),
        F.field('Repeat', recurInput, { hint: 'A completed repeating task reappears on its next date.' }),
        F.field('Tags', tagsInput),
        F.field('Attachments', attachInput)
      ]))
    ]);

    var layer = UI.sheet({
      title: isNew ? 'New task' : 'Edit task',
      body: body,
      footer: function (l) {
        return footerButtons(l, {
          onSave: save,
          onDelete: isNew ? null : function () {
            UI.confirm({
              title: 'Delete this task?',
              message: '“' + task.title + '” will be removed. You can undo this straight away.',
              confirmLabel: 'Delete', tone: 'danger'
            }).then(function (ok) { if (ok) { A.deleteTask(task.id); l.close(); } });
          },
          extra: isNew ? null : D.h('button.btn.btn--ghost.btn--sm', {
            type: 'button',
            onclick: function () {
              l.close();
              UI.findTimeDialog({
                minutes: task.estimate || st.defaultTaskEstimate,
                title: task.title,
                before: task.due,
                onPick: function (slot) { A.scheduleTask(task.id, slot.start, slot.minutes); }
              });
            }
          }, [D.icon('calendar', 15), 'Find time'])
        });
      }
    });

    function collect() {
      var d = dueDate.getValue();
      var tm = dueTime.getValue();
      var due = null, hasDueTime = false;
      if (d) {
        if (tm != null) { due = T.atMinutes(d, tm); hasDueTime = true; }
        else { due = T.atMinutes(d, 23 * 60 + 59); }
      }
      return {
        title: titleInput.getValue() || 'Untitled task',
        due: due ? T.iso(due) : null,
        hasDueTime: hasDueTime,
        estimate: estimateInput.getValue(),
        priority: prioritySel.getValue(),
        status: statusSel.getValue(),
        projectId: projectSel.getValue(),
        goalId: goalSel.getValue(),
        deadlineId: deadlineSel.getValue(),
        categoryId: categorySel.getValue(),
        tags: tagsInput.getValue(),
        description: descInput.getValue(),
        notes: notesInput.getValue(),
        subtasks: subtasksInput.getValue(),
        dependsOn: dependsInput.getValue(),
        recurrence: recurInput.getValue(),
        attachments: attachInput.getValue(),
        links: attachInput.getLinks()
      };
    }

    function save() {
      var payload = collect();
      if (isNew) A.createTask(payload);
      else A.updateTask(task.id, payload);
      layer.close();
    }
    return layer;
  }

  function subtaskEditor(initial) {
    var items = (initial || []).map(function (s) { return Object.assign({}, s); });
    var wrap = D.h('div.subtasks');
    var list = D.h('div.subtasks__list');

    function render() {
      D.clear(list);
      items.forEach(function (s, i) {
        var check = D.h('button.check', {
          type: 'button', role: 'checkbox', 'aria-checked': s.done ? 'true' : 'false',
          'aria-label': (s.done ? 'Mark incomplete: ' : 'Mark complete: ') + s.title,
          onclick: function () { items[i].done = !items[i].done; render(); }
        }, s.done ? D.icon('check', 13) : null);
        var input = D.h('input.subtask__input', {
          type: 'text', value: s.title, 'aria-label': 'Subtask title',
          oninput: function (e) { items[i].title = e.target.value; },
          onkeydown: function (e) {
            if (e.key === 'Enter') { e.preventDefault(); addRow(i + 1); }
            if (e.key === 'Backspace' && !e.target.value && items.length > 1) {
              e.preventDefault(); items.splice(i, 1); render();
            }
          }
        });
        list.appendChild(D.h('div.subtask' + (s.done ? '.is-done' : ''), [
          check, input,
          D.h('button.tag-chip__x', {
            type: 'button', 'aria-label': 'Remove subtask',
            onclick: function () { items.splice(i, 1); render(); }
          }, D.icon('x', 12))
        ]));
      });
    }
    function addRow(at) {
      var item = { id: M.uid('sub'), title: '', done: false };
      if (at == null) items.push(item); else items.splice(at, 0, item);
      render();
      var inputs = D.qsa('.subtask__input', list);
      var target = inputs[at == null ? inputs.length - 1 : at];
      if (target) target.focus();
    }
    render();
    wrap.appendChild(list);
    wrap.appendChild(D.h('button.btn.btn--ghost.btn--sm', {
      type: 'button', onclick: function () { addRow(); }
    }, [D.icon('plus', 14), 'Add subtask']));
    wrap.getValue = function () {
      return items.filter(function (s) { return s.title.trim(); })
        .map(function (s) { return { id: s.id, title: s.title.trim(), done: !!s.done }; });
    };
    return wrap;
  }

  function dependencyEditor(task) {
    var values = (task.dependsOn || []).slice();
    var wrap = D.h('div.deps');
    var list = D.h('div.deps__list');
    var options = S.all('tasks').filter(function (t) {
      return t.id !== task.id && t.status !== 'completed' && t.status !== 'archived';
    });

    function render() {
      D.clear(list);
      if (!values.length) list.appendChild(D.h('p.reminders__empty', { text: 'Nothing' }));
      values.forEach(function (id) {
        var t = S.get('tasks', id);
        if (!t) return;
        list.appendChild(D.h('span.tag-chip', [
          D.h('span', { text: t.title }),
          D.h('button.tag-chip__x', {
            type: 'button', 'aria-label': 'Remove dependency',
            onclick: function () { values = values.filter(function (v) { return v !== id; }); render(); }
          }, D.icon('x', 12))
        ]));
      });
    }
    var picker = F.select({
      value: '', options: [{ value: '', label: 'Add a task…' }].concat(
        options.map(function (t) { return { value: t.id, label: t.title }; }))
    });
    picker.addEventListener('change', function () {
      var v = picker.getValue();
      if (v && values.indexOf(v) < 0) { values.push(v); render(); }
      picker.value = '';
    });
    render();
    wrap.appendChild(list);
    wrap.appendChild(picker);
    wrap.getValue = function () { return values.slice(); };
    return wrap;
  }

  /* --------------------------------------------------------------- deadline */

  function editDeadline(source) {
    var isNew = !source || !source.id;
    var d = source || {};
    var dueWall = d.due ? T.w(d.due) : T.endOfDay(T.addDays(T.nowWall(), 7));

    var titleInput = F.text({ value: d.title || '', placeholder: 'What is due?', autofocus: true });
    titleInput.classList.add('input--title');
    var dueDate = F.date({ value: dueWall, ariaLabel: 'Due date' });
    var dueTime = F.time({ value: d.hasDueTime === false ? null : dueWall, ariaLabel: 'Due time' });
    var kindSel = F.select({
      value: d.type || 'assignment', ariaLabel: 'Deadline type',
      options: M.DEADLINE_KINDS.map(function (k) { return { value: k.id, label: k.label }; })
    });
    var projectSel = F.projectSelect(d.projectId);
    var goalSel = F.goalSelect(d.goalId);
    var descInput = F.textarea({ value: d.description || '', placeholder: 'What does “done” look like?', rows: 2 });
    var tagsInput = F.tags({ value: d.tags || [] });
    var reminderInput = F.reminders({ value: d.reminders || S.settings().defaultReminders.deadline || [1440] });
    var colorPick = F.colorPicker({ value: d.color || null });

    var body = D.h('div.editor', [
      F.field(null, titleInput, { class: 'field--title' }),
      D.h('div.editor__grid', [
        F.field('Due', D.h('div.when__inputs', [dueDate, dueTime])),
        F.field('Type', kindSel)
      ]),
      D.h('div.editor__grid', [F.field('Project', projectSel), F.field('Goal', goalSel)]),
      F.disclosure('More options', D.h('div.editor__advanced', [
        F.field('Description', descInput),
        F.field('Tags', tagsInput),
        F.field('Colour', colorPick),
        F.field('Reminders', reminderInput)
      ]))
    ]);

    var layer = UI.sheet({
      title: isNew ? 'New deadline' : 'Edit deadline',
      subtitle: 'A deadline is the point something must be done by — not a block of time.',
      body: body,
      footer: function (l) {
        return footerButtons(l, {
          onSave: function () {
            var day = dueDate.getValue() || T.nowWall();
            var tm = dueTime.getValue();
            var payload = {
              title: titleInput.getValue() || 'Untitled deadline',
              due: T.iso(T.atMinutes(day, tm == null ? 23 * 60 + 59 : tm)),
              hasDueTime: tm != null,
              type: kindSel.getValue(),
              projectId: projectSel.getValue(),
              goalId: goalSel.getValue(),
              description: descInput.getValue(),
              tags: tagsInput.getValue(),
              color: colorPick.getValue(),
              reminders: reminderInput.getValue()
            };
            if (isNew) A.createDeadline(payload); else A.updateDeadline(d.id, payload);
            l.close();
          },
          onDelete: isNew ? null : function () {
            UI.confirm({
              title: 'Delete this deadline?', message: 'Linked tasks are kept.',
              confirmLabel: 'Delete', tone: 'danger'
            }).then(function (ok) { if (ok) { A.deleteDeadline(d.id); l.close(); } });
          }
        });
      }
    });
    return layer;
  }

  /* ------------------------------------------------------------------- note */

  function editNote(source, opts) {
    opts = opts || {};
    var isNew = !source || !source.id;
    var n = source || {};

    var titleInput = F.text({ value: n.title || '', placeholder: 'Title (optional)', autofocus: isNew });
    titleInput.classList.add('input--title');
    var kindSel = F.select({
      value: n.type || 'note', ariaLabel: 'Note type',
      options: M.NOTE_KINDS.map(function (k) { return { value: k.id, label: k.label }; })
    });
    var bodyInput = F.textarea({ value: n.body || '', placeholder: 'Write anything…', rows: 8, maxHeight: 460 });
    var checklistInput = checklistEditor(n.checklist || []);
    var checklistWrap = D.h('div', { hidden: (n.type || 'note') !== 'checklist' }, checklistInput);
    kindSel.addEventListener('change', function () {
      checklistWrap.hidden = kindSel.getValue() !== 'checklist';
    });
    var tagsInput = F.tags({ value: n.tags || [] });
    var projectSel = F.projectSelect(n.projectId != null ? n.projectId : opts.projectId);
    var goalSel = F.goalSelect(n.goalId);

    var body = D.h('div.editor', [
      F.field(null, titleInput, { class: 'field--title' }),
      F.field('Type', kindSel),
      F.field(null, bodyInput),
      checklistWrap,
      F.disclosure('More options', D.h('div.editor__advanced', [
        D.h('div.editor__grid', [F.field('Project', projectSel), F.field('Goal', goalSel)]),
        F.field('Tags', tagsInput)
      ]))
    ]);

    var layer = UI.sheet({
      title: isNew ? 'New note' : 'Edit note',
      body: body,
      footer: function (l) {
        return footerButtons(l, {
          onSave: function () {
            var payload = {
              title: titleInput.getValue(),
              type: kindSel.getValue(),
              body: bodyInput.getValue(),
              checklist: checklistInput.getValue(),
              tags: tagsInput.getValue(),
              projectId: projectSel.getValue(),
              goalId: goalSel.getValue(),
              eventId: n.eventId || opts.eventId || null,
              taskId: n.taskId || opts.taskId || null
            };
            if (isNew) A.createNote(payload); else A.updateNote(n.id, payload, 'Note saved');
            l.close();
          },
          onDelete: isNew ? null : function () {
            UI.confirm({ title: 'Delete this note?', message: 'You can undo this straight away.', confirmLabel: 'Delete', tone: 'danger' })
              .then(function (ok) { if (ok) { A.deleteNote(n.id); l.close(); } });
          }
        });
      }
    });
    return layer;
  }

  function checklistEditor(initial) {
    var items = (initial || []).map(function (c) { return Object.assign({}, c); });
    var wrap = D.h('div.subtasks');
    var list = D.h('div.subtasks__list');
    function render() {
      D.clear(list);
      items.forEach(function (s, i) {
        list.appendChild(D.h('div.subtask' + (s.done ? '.is-done' : ''), [
          D.h('button.check', {
            type: 'button', role: 'checkbox', 'aria-checked': s.done ? 'true' : 'false',
            'aria-label': s.title, onclick: function () { items[i].done = !items[i].done; render(); }
          }, s.done ? D.icon('check', 13) : null),
          D.h('input.subtask__input', {
            type: 'text', value: s.title, 'aria-label': 'Checklist item',
            oninput: function (e) { items[i].title = e.target.value; },
            onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); add(i + 1); } }
          }),
          D.h('button.tag-chip__x', {
            type: 'button', 'aria-label': 'Remove item',
            onclick: function () { items.splice(i, 1); render(); }
          }, D.icon('x', 12))
        ]));
      });
    }
    function add(at) {
      var item = { id: M.uid('ck'), title: '', done: false };
      if (at == null) items.push(item); else items.splice(at, 0, item);
      render();
      var inputs = D.qsa('.subtask__input', list);
      var t = inputs[at == null ? inputs.length - 1 : at];
      if (t) t.focus();
    }
    render();
    wrap.appendChild(list);
    wrap.appendChild(D.h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: function () { add(); } },
      [D.icon('plus', 14), 'Add item']));
    wrap.getValue = function () {
      return items.filter(function (c) { return c.title.trim(); })
        .map(function (c) { return { id: c.id, title: c.title.trim(), done: !!c.done }; });
    };
    return wrap;
  }

  /* ---------------------------------------------------------------- project */

  function editProject(source) {
    var isNew = !source || !source.id;
    var p = source || {};
    var nameInput = F.text({ value: p.name || '', placeholder: 'Project name', autofocus: true });
    nameInput.classList.add('input--title');
    var descInput = F.textarea({ value: p.description || '', placeholder: 'What is this project?', rows: 3 });
    var dueDate = F.date({ value: p.due ? T.w(p.due) : null, ariaLabel: 'Target date' });
    var colorPick = F.colorPicker({ value: p.color || '#4a86d8', allowAuto: false });
    var goalSel = F.goalSelect(p.goalId);
    var statusSel = F.select({
      value: p.status || 'active', ariaLabel: 'Status',
      options: [
        { value: 'active', label: 'Active' }, { value: 'on-hold', label: 'On hold' },
        { value: 'done', label: 'Done' }, { value: 'archived', label: 'Archived' }
      ]
    });
    var tagsInput = F.tags({ value: p.tags || [] });

    var layer = UI.sheet({
      title: isNew ? 'New project' : 'Edit project',
      body: D.h('div.editor', [
        F.field(null, nameInput, { class: 'field--title' }),
        F.field('Description', descInput),
        D.h('div.editor__grid', [F.field('Target date', dueDate), F.field('Status', statusSel)]),
        F.field('Goal', goalSel),
        F.field('Colour', colorPick),
        F.field('Tags', tagsInput)
      ]),
      footer: function (l) {
        return footerButtons(l, {
          onSave: function () {
            var payload = {
              name: nameInput.getValue() || 'Untitled project',
              description: descInput.getValue(),
              due: dueDate.getValue() ? T.iso(T.endOfDay(dueDate.getValue())) : null,
              color: colorPick.getValue() || '#4a86d8',
              goalId: goalSel.getValue(),
              status: statusSel.getValue(),
              tags: tagsInput.getValue()
            };
            if (isNew) A.createProject(payload); else A.updateProject(p.id, payload);
            l.close();
          },
          onDelete: isNew ? null : function () {
            UI.confirm({
              title: 'Delete this project?',
              message: 'Its tasks, notes and events are kept — they just stop being grouped here.',
              confirmLabel: 'Delete project', tone: 'danger'
            }).then(function (ok) { if (ok) { A.deleteProject(p.id); l.close(); } });
          }
        });
      }
    });
    return layer;
  }

  /* ------------------------------------------------------------------- goal */

  function editGoal(source) {
    var isNew = !source || !source.id;
    var g = source || {};
    var nameInput = F.text({ value: g.name || '', placeholder: 'What do you want to achieve?', autofocus: true });
    nameInput.classList.add('input--title');
    var descInput = F.textarea({ value: g.description || '', placeholder: 'Why does this matter?', rows: 3 });
    var dueDate = F.date({ value: g.due ? T.w(g.due) : null, ariaLabel: 'Target date' });
    var colorPick = F.colorPicker({ value: g.color || '#7a5cd8', allowAuto: false });
    var milestones = milestoneEditor(g.milestones || []);
    var tagsInput = F.tags({ value: g.tags || [] });

    var layer = UI.sheet({
      title: isNew ? 'New goal' : 'Edit goal',
      body: D.h('div.editor', [
        F.field(null, nameInput, { class: 'field--title' }),
        F.field('Description', descInput),
        F.field('Target date', dueDate),
        F.field('Milestones', milestones, { hint: 'Break the goal into steps you can actually finish.' }),
        F.field('Colour', colorPick),
        F.field('Tags', tagsInput)
      ]),
      footer: function (l) {
        return footerButtons(l, {
          onSave: function () {
            var payload = {
              name: nameInput.getValue() || 'Untitled goal',
              description: descInput.getValue(),
              due: dueDate.getValue() ? T.iso(T.endOfDay(dueDate.getValue())) : null,
              color: colorPick.getValue() || '#7a5cd8',
              milestones: milestones.getValue(),
              tags: tagsInput.getValue()
            };
            if (isNew) A.createGoal(payload); else A.updateGoal(g.id, payload);
            l.close();
          },
          onDelete: isNew ? null : function () {
            UI.confirm({ title: 'Delete this goal?', message: 'Linked projects and tasks are kept.', confirmLabel: 'Delete', tone: 'danger' })
              .then(function (ok) { if (ok) { A.deleteGoal(g.id); l.close(); } });
          }
        });
      }
    });
    return layer;
  }

  function milestoneEditor(initial) {
    var items = (initial || []).map(function (m) { return Object.assign({}, m); });
    var wrap = D.h('div.subtasks');
    var list = D.h('div.subtasks__list');
    function render() {
      D.clear(list);
      items.forEach(function (m, i) {
        list.appendChild(D.h('div.subtask' + (m.done ? '.is-done' : ''), [
          D.h('span.milestone__num', { text: String(i + 1), 'aria-hidden': 'true' }),
          D.h('input.subtask__input', {
            type: 'text', value: m.title, 'aria-label': 'Milestone ' + (i + 1),
            oninput: function (e) { items[i].title = e.target.value; },
            onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); add(i + 1); } }
          }),
          D.h('button.check', {
            type: 'button', role: 'checkbox', 'aria-checked': m.done ? 'true' : 'false',
            'aria-label': 'Milestone done', onclick: function () { items[i].done = !items[i].done; render(); }
          }, m.done ? D.icon('check', 13) : null),
          D.h('button.tag-chip__x', {
            type: 'button', 'aria-label': 'Remove milestone',
            onclick: function () { items.splice(i, 1); render(); }
          }, D.icon('x', 12))
        ]));
      });
    }
    function add(at) {
      var item = { id: M.uid('ms'), title: '', done: false };
      if (at == null) items.push(item); else items.splice(at, 0, item);
      render();
      var inputs = D.qsa('.subtask__input', list);
      var t = inputs[at == null ? inputs.length - 1 : at];
      if (t) t.focus();
    }
    render();
    wrap.appendChild(list);
    wrap.appendChild(D.h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: function () { add(); } },
      [D.icon('plus', 14), 'Add milestone']));
    wrap.getValue = function () {
      return items.filter(function (m) { return m.title.trim(); })
        .map(function (m) { return { id: m.id, title: m.title.trim(), done: !!m.done }; });
    };
    return wrap;
  }

  /* ------------------------------------------------------------------ habit */

  function editHabit(source) {
    var isNew = !source || !source.id;
    var hb = source || {};
    var sch = hb.schedule || { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6], timesPerWeek: 3 };

    var nameInput = F.text({ value: hb.name || '', placeholder: 'e.g. Read 20 minutes', autofocus: true });
    nameInput.classList.add('input--title');
    var typeSel = F.select({
      value: sch.type, ariaLabel: 'How often',
      options: [
        { value: 'daily', label: 'Every day' },
        { value: 'weekdays', label: 'Weekdays' },
        { value: 'weekly', label: 'Certain days' },
        { value: 'times-per-week', label: 'A few times a week' }
      ]
    });
    var dayState = {};
    (sch.days || []).forEach(function (d) { dayState[d] = true; });
    var dayPicker = D.h('div.recur__days', { role: 'group', 'aria-label': 'Days' });
    T.DAY_SHORT.forEach(function (name, i) {
      var b = D.h('button.recur__day', {
        type: 'button', 'aria-pressed': dayState[i] ? 'true' : 'false', 'aria-label': T.DAY_NAMES[i],
        onclick: function () { dayState[i] = !dayState[i]; b.setAttribute('aria-pressed', dayState[i] ? 'true' : 'false'); }
      }, name.charAt(0));
      b.dataset.day = i;
      dayPicker.appendChild(b);
    });
    var timesInput = F.number({ value: sch.timesPerWeek || 3, min: 1, max: 7 });
    var dayWrap = D.h('div', { hidden: sch.type !== 'weekly' }, dayPicker);
    var timesWrap = D.h('div.inline-num', { hidden: sch.type !== 'times-per-week' },
      [timesInput, D.h('span', { text: 'times per week' })]);
    typeSel.addEventListener('change', function () {
      dayWrap.hidden = typeSel.getValue() !== 'weekly';
      timesWrap.hidden = typeSel.getValue() !== 'times-per-week';
    });

    var timeInput = F.time({ value: hb.time != null ? T.atMinutes(T.nowWall(), hb.time) : null, ariaLabel: 'Usual time' });
    var durInput = F.number({ value: hb.duration || 20, min: 5, max: 240, step: 5, ariaLabel: 'Minutes' });
    var colorPick = F.colorPicker({ value: hb.color || '#3f9e77', allowAuto: false });
    var goalSel = F.goalSelect(hb.goalId);
    var categorySel = F.categorySelect(hb.categoryId);

    var layer = UI.sheet({
      title: isNew ? 'New habit' : 'Edit habit',
      subtitle: 'Missing a day never breaks anything here.',
      body: D.h('div.editor', [
        F.field(null, nameInput, { class: 'field--title' }),
        F.field('How often', typeSel),
        dayWrap, timesWrap,
        D.h('div.editor__grid', [
          F.field('Usual time', timeInput, { hint: 'Optional.' }),
          F.field('Minutes', durInput)
        ]),
        F.disclosure('More options', D.h('div.editor__advanced', [
          D.h('div.editor__grid', [F.field('Goal', goalSel), F.field('Category', categorySel)]),
          F.field('Colour', colorPick)
        ]))
      ]),
      footer: function (l) {
        return footerButtons(l, {
          onSave: function () {
            var type = typeSel.getValue();
            var days = Object.keys(dayState).filter(function (k) { return dayState[k]; }).map(Number);
            var schedule = { type: type, days: type === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : type === 'weekdays' ? [1, 2, 3, 4, 5] : days, timesPerWeek: timesInput.getValue() || 3 };
            var payload = {
              name: nameInput.getValue() || 'Untitled habit',
              schedule: schedule,
              time: timeInput.getValue(),
              duration: durInput.getValue() || 20,
              color: colorPick.getValue() || '#3f9e77',
              goalId: goalSel.getValue(),
              categoryId: categorySel.getValue()
            };
            if (isNew) A.createHabit(payload); else A.updateHabit(hb.id, payload);
            l.close();
          },
          onDelete: isNew ? null : function () {
            UI.confirm({ title: 'Delete this habit?', message: 'Its history goes too.', confirmLabel: 'Delete', tone: 'danger' })
              .then(function (ok) { if (ok) { A.deleteHabit(hb.id); l.close(); } });
          }
        });
      }
    });
    return layer;
  }

  Object.assign(UI, {
    pickScope: pickScope,
    editEvent: editEvent, editTask: editTask, editDeadline: editDeadline,
    editNote: editNote, editProject: editProject, editGoal: editGoal, editHabit: editHabit,
    warnAboutConflicts: warnAboutConflicts
  });
})(window);
