/* Cadence — tasks. Grouped how you want them, with the calendar one drag away. */
(function (global) {
  'use strict';
  var Views = global.Views = global.Views || {};

  var view = {
    group: 'due',        // due | status | priority | project | none
    filter: 'open',      // open | today | week | overdue | inbox | completed | all
    projectId: null,
    tag: null,
    query: ''
  };

  var root = null;
  function rerender() { if (root) render(root); }

  function render(container, params) {
    root = container;
    if (params && params.filter) view.filter = params.filter;
    if (params && params.projectId) view.projectId = params.projectId;
    if (params && params.tag) view.tag = params.tag;
    D.clear(container);

    container.appendChild(header());
    var tasks = filtered();
    var body = D.h('div.tasks__body');

    if (!tasks.length) {
      body.appendChild(emptyForFilter());
    } else {
      groupTasks(tasks).forEach(function (group) {
        body.appendChild(renderGroup(group));
      });
    }
    container.appendChild(body);
  }

  function header() {
    var head = D.h('header.page__head');
    head.appendChild(D.h('div.page__head-main', [
      D.h('h1.page__title', { text: 'Tasks' }),
      D.h('p.page__subtitle', { text: subtitle() })
    ]));
    head.appendChild(D.h('div.page__head-actions', [
      D.h('button.btn.btn--primary', {
        type: 'button', onclick: function () { UI.editTask(null); }
      }, [D.icon('plus', 16), 'New task'])
    ]));

    var quick = D.h('form.tasks__quick', {
      onsubmit: function (e) {
        e.preventDefault();
        var value = input.value.trim();
        if (!value) return;
        var parsed = NLP.parse(value);
        parsed.type = 'task';
        if (!parsed.dueWall && parsed.dayWall) parsed.dueWall = T.atMinutes(parsed.dayWall, 23 * 60 + 59);
        var payload = NLP.toPayload(parsed);
        if (view.projectId) payload.projectId = view.projectId;
        A.createTask(payload);
        input.value = '';
        rerender();
      }
    });
    var input = D.h('input.tasks__quick-input', {
      type: 'text',
      placeholder: 'Add a task — try “email Mr. Chen tomorrow !!”',
      'aria-label': 'Add a task'
    });
    quick.appendChild(D.icon('plus', 16));
    quick.appendChild(input);
    quick.appendChild(D.h('button.btn.btn--sm.btn--primary', { type: 'submit' }, 'Add'));

    var filters = D.h('div.tasks__filters');
    filters.appendChild(chipGroup('Show', [
      { value: 'open', label: 'Open' },
      { value: 'today', label: 'Today' },
      { value: 'week', label: 'This week' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'inbox', label: 'Inbox' },
      { value: 'completed', label: 'Done' },
      { value: 'all', label: 'All' }
    ], view.filter, function (v) { view.filter = v; rerender(); }));

    filters.appendChild(chipGroup('Group by', [
      { value: 'due', label: 'Date' },
      { value: 'priority', label: 'Priority' },
      { value: 'status', label: 'Status' },
      { value: 'project', label: 'Project' },
      { value: 'none', label: 'Flat' }
    ], view.group, function (v) { view.group = v; rerender(); }));

    if (view.projectId || view.tag) {
      var label = view.projectId ? (S.get('projects', view.projectId) || {}).name : '#' + view.tag;
      filters.appendChild(D.h('button.chip.chip--clear', {
        type: 'button',
        onclick: function () { view.projectId = null; view.tag = null; rerender(); }
      }, ['Filtered: ' + label, D.icon('x', 13)]));
    }

    var wrap = D.h('div.tasks__head', [head, quick, filters]);
    return wrap;
  }

  function chipGroup(label, options, value, onChange) {
    var group = D.h('div.chip-group', { role: 'group', 'aria-label': label });
    group.appendChild(D.h('span.chip-group__label', { text: label }));
    options.forEach(function (o) {
      group.appendChild(D.h('button.chip', {
        type: 'button',
        'aria-pressed': o.value === value ? 'true' : 'false',
        onclick: function () { onChange(o.value); }
      }, o.label));
    });
    return group;
  }

  function subtitle() {
    var counts = Q.counts();
    var parts = [];
    if (counts.overdue) parts.push(counts.overdue + ' overdue');
    if (counts.today) parts.push(counts.today + ' due today');
    if (counts.inbox) parts.push(counts.inbox + ' in the inbox');
    return parts.length ? parts.join(' · ') : 'Nothing overdue. Nice.';
  }

  function filtered() {
    var now = T.nowWall();
    var all = S.all('tasks');
    var out = all.filter(function (t) {
      if (view.projectId && t.projectId !== view.projectId) return false;
      if (view.tag && (t.tags || []).indexOf(view.tag) < 0) return false;
      switch (view.filter) {
        case 'open': return t.status !== 'completed' && t.status !== 'archived';
        case 'completed': return t.status === 'completed';
        case 'inbox': return t.status === 'inbox';
        case 'today':
          if (t.status === 'completed' || t.status === 'archived') return false;
          return t.due && T.sameDay(T.w(t.due), now);
        case 'week':
          if (t.status === 'completed' || t.status === 'archived') return false;
          if (!t.due) return false;
          var d = T.w(t.due);
          return d >= T.startOfDay(now) && d <= T.endOfWeek(now, S.settings().firstDayOfWeek);
        case 'overdue':
          if (t.status === 'completed' || t.status === 'archived' || !t.due) return false;
          return T.w(t.due) < (t.hasDueTime ? now : T.startOfDay(now));
        default: return t.status !== 'archived';
      }
    });
    return out;
  }

  function groupTasks(tasks) {
    var now = T.nowWall();
    var groups = [];
    var map = {};

    function bucket(key, label, order, meta) {
      if (!map[key]) {
        map[key] = { key: key, label: label, order: order, tasks: [], meta: meta };
        groups.push(map[key]);
      }
      return map[key];
    }

    tasks.forEach(function (t) {
      if (view.group === 'none') { bucket('all', 'All tasks', 0).tasks.push(t); return; }
      if (view.group === 'due') {
        if (!t.due) { bucket('nodate', 'No date', 99).tasks.push(t); return; }
        var d = T.w(t.due);
        var days = T.diffDays(now, d);
        if (days < 0) bucket('overdue', 'Overdue', -1).tasks.push(t);
        else if (days === 0) bucket('today', 'Today', 0).tasks.push(t);
        else if (days === 1) bucket('tomorrow', 'Tomorrow', 1).tasks.push(t);
        else if (days <= 7) bucket('week', 'This week', 2).tasks.push(t);
        else if (days <= 30) bucket('month', 'This month', 3).tasks.push(t);
        else bucket('later', 'Later', 4).tasks.push(t);
        return;
      }
      if (view.group === 'priority') {
        var p = M.PRIORITIES.filter(function (x) { return x.id === t.priority; })[0] || M.PRIORITIES[2];
        bucket(p.id, p.label, p.rank, { color: p.color }).tasks.push(t);
        return;
      }
      if (view.group === 'status') {
        var s = M.STATUSES.filter(function (x) { return x.id === t.status; })[0] || M.STATUSES[0];
        bucket(s.id, s.label, M.STATUSES.indexOf(s)).tasks.push(t);
        return;
      }
      if (view.group === 'project') {
        if (!t.projectId) { bucket('noproj', 'No project', 99).tasks.push(t); return; }
        var proj = S.get('projects', t.projectId);
        bucket(t.projectId, proj ? proj.name : 'Unknown project', 0, { color: proj ? proj.color : null }).tasks.push(t);
      }
    });

    groups.sort(function (a, b) { return a.order - b.order || a.label.localeCompare(b.label); });
    groups.forEach(function (g) {
      g.tasks.sort(function (a, b) {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (b.status === 'completed' && a.status !== 'completed') return -1;
        if (view.group === 'due') {
          var ad = a.due ? T.w(a.due).getTime() : Infinity;
          var bd = b.due ? T.w(b.due).getTime() : Infinity;
          if (ad !== bd) return ad - bd;
        }
        var ap = M.PRIORITY_RANK[a.priority], bp = M.PRIORITY_RANK[b.priority];
        if (ap !== bp) return ap - bp;
        return (a.order || 0) - (b.order || 0);
      });
    });
    return groups;
  }

  function renderGroup(group) {
    var section = D.h('section.tgroup');
    section.appendChild(D.h('h2.tgroup__title', [
      group.meta && group.meta.color ? D.h('span.tgroup__dot', { style: { background: group.meta.color } }) : null,
      D.h('span', { text: group.label }),
      D.h('span.tgroup__count', { text: String(group.tasks.length) })
    ]));
    var list = D.h('ul.tlist', { role: 'list' });
    group.tasks.forEach(function (t, i) {
      list.appendChild(taskRow(t, group, i));
    });
    section.appendChild(list);
    return section;
  }

  function taskRow(task, group, index) {
    var now = T.nowWall();
    var done = task.status === 'completed';
    var blocked = Q.taskIsBlocked(task);
    var row = D.h('li.trow' + (done ? '.is-done' : '') + (blocked ? '.is-blocked' : ''), {
      'data-task': task.id, role: 'listitem'
    });

    var handle = D.h('span.trow__handle', {
      title: 'Drag onto the calendar to schedule',
      'aria-hidden': 'true'
    }, D.icon('drag', 14));

    var check = D.h('button.check.trow__check', {
      type: 'button', role: 'checkbox', 'aria-checked': done ? 'true' : 'false',
      'aria-label': (done ? 'Reopen ' : 'Complete ') + task.title,
      onclick: function () { A.completeTask(task.id); }
    }, done ? D.icon('check', 13) : null);

    var titleBtn = D.h('button.trow__title', {
      type: 'button', onclick: function () { UI.editTask(task); }
    }, task.title);

    var meta = D.h('div.trow__meta');
    if (task.due) {
      var d = T.w(task.due);
      var overdue = !done && d < (task.hasDueTime ? now : T.startOfDay(now));
      meta.appendChild(D.h('span.trow__chip' + (overdue ? '.is-overdue' : ''), [
        D.icon('calendar', 12),
        D.h('span', { text: T.relativeDay(d, now) + (task.hasDueTime ? ' ' + T.fmtTime(d, S.settings().use24Hour) : '') })
      ]));
    }
    if (task.estimate) {
      meta.appendChild(D.h('span.trow__chip', [D.icon('clock', 12), D.h('span', { text: T.humanDuration(task.estimate) })]));
    }
    if (task.scheduledEventId) {
      var ev = S.get('events', task.scheduledEventId);
      if (ev) {
        meta.appendChild(D.h('span.trow__chip.is-scheduled', {
          title: 'Scheduled ' + T.fmtDateShort(T.w(ev.start)) + ' at ' + T.fmtTime(T.w(ev.start), S.settings().use24Hour)
        }, [D.icon('calendar', 12), D.h('span', { text: 'On the calendar' })]));
      }
    }
    if (task.projectId) {
      var proj = S.get('projects', task.projectId);
      if (proj && view.group !== 'project') {
        meta.appendChild(D.h('button.trow__chip.trow__chip--project', {
          type: 'button', style: { '--chip-color': proj.color },
          onclick: function () { view.projectId = proj.id; rerender(); }
        }, [D.h('span.trow__dot', { style: { background: proj.color } }), D.h('span', { text: proj.name })]));
      }
    }
    if ((task.subtasks || []).length) {
      var doneSubs = task.subtasks.filter(function (s) { return s.done; }).length;
      meta.appendChild(D.h('span.trow__chip', [
        D.icon('checkSquare', 12), D.h('span', { text: doneSubs + '/' + task.subtasks.length })
      ]));
    }
    if (blocked) {
      var blockers = Q.blockingTasks(task);
      meta.appendChild(D.h('span.trow__chip.is-blocked', {
        title: 'Waiting on: ' + blockers.map(function (b) { return b.title; }).join(', ')
      }, [D.icon('pause', 12), D.h('span', { text: 'Waiting on ' + blockers.length })]));
    }
    (task.tags || []).forEach(function (tag) {
      meta.appendChild(D.h('button.trow__chip.trow__chip--tag', {
        type: 'button', onclick: function () { view.tag = tag; rerender(); }
      }, '#' + tag));
    });

    var priority = M.PRIORITIES.filter(function (p) { return p.id === task.priority; })[0];
    var flag = D.h('span.trow__priority', {
      title: priority ? priority.label + ' priority' : '',
      'aria-label': priority ? priority.label + ' priority' : '',
      style: { '--p-color': priority ? priority.color : 'transparent' }
    }, priority && priority.rank <= 1 ? D.icon('zap', 12) : null);

    var actions = D.h('div.trow__actions', [
      D.iconButton('calendar', 'Find time for ' + task.title, function () {
        UI.findTimeDialog({
          minutes: Q.taskEstimate(task), title: task.title, before: task.due,
          onPick: function (slot) { A.scheduleTask(task.id, slot.start, slot.minutes); }
        });
      }, { size: 15 }),
      D.iconButton('more', 'More actions for ' + task.title, function (e) { taskMenu(e.currentTarget, task); }, { size: 15 })
    ]);

    row.appendChild(handle);
    row.appendChild(check);
    row.appendChild(D.h('div.trow__main', [titleBtn, meta]));
    row.appendChild(flag);
    row.appendChild(actions);

    attachTaskDrag(row, handle, task, group, index);
    return row;
  }

  /* Dragging a task does two things depending on where it lands: reorder inside
     the list, or schedule it if it is dropped on the calendar dock. */
  function attachTaskDrag(row, handle, task, group, index) {
    handle.addEventListener('pointerdown', function (e) {
      var list = row.parentElement;
      var siblings = D.qsa('.trow', list);
      var placeholder = null;

      DND.drag(e, {
        onStart: function () {
          DND.setPayload({ kind: 'task', id: task.id, minutes: Q.taskEstimate(task), title: task.title });
          DND.showGhost(task.title, Q.taskColor(task));
          row.classList.add('is-dragging-src');
          placeholder = D.h('li.trow-placeholder');
          placeholder.style.height = row.offsetHeight + 'px';
          list.insertBefore(placeholder, row.nextSibling);
        },
        onMove: function (st) {
          var over = document.elementFromPoint(st.x, st.y);
          var target = over && over.closest ? over.closest('.trow') : null;
          if (target && target !== row && target.parentElement === list) {
            var rect = target.getBoundingClientRect();
            var after = st.y > rect.top + rect.height / 2;
            list.insertBefore(placeholder, after ? target.nextSibling : target);
          }
        },
        onEnd: function (st) {
          row.classList.remove('is-dragging-src');
          var zone = DND.zoneAt(st.x, st.y);
          if (zone && zone.dataset.dropzone === 'timegrid') {
            if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
            return; // the calendar column handles the drop
          }
          if (placeholder && placeholder.parentNode) {
            list.insertBefore(row, placeholder);
            placeholder.parentNode.removeChild(placeholder);
          }
          var ids = D.qsa('.trow', list).map(function (n) { return n.dataset.task; });
          A.reorderTasks(ids);
        },
        onCancel: function () {
          row.classList.remove('is-dragging-src');
          if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
        }
      });
    });
  }

  function taskMenu(anchor, task) {
    var now = T.nowWall();
    UI.menu(anchor, [
      { label: 'Edit', icon: 'edit', onClick: function () { UI.editTask(task); } },
      { label: task.status === 'completed' ? 'Reopen' : 'Mark complete', icon: 'check', onClick: function () { A.completeTask(task.id); } },
      { separator: true },
      { heading: 'Move to' },
      { label: 'Today', onClick: function () { A.rescheduleTask(task.id, T.endOfDay(now)); } },
      { label: 'Tomorrow', onClick: function () { A.rescheduleTask(task.id, T.endOfDay(T.addDays(now, 1))); } },
      { label: 'Next week', onClick: function () { A.rescheduleTask(task.id, T.endOfDay(T.addDays(now, 7))); } },
      { label: 'No date', onClick: function () { A.updateTask(task.id, { due: null, hasDueTime: false }, 'Date removed'); } },
      { separator: true },
      {
        label: 'Find time', icon: 'search', onClick: function () {
          UI.findTimeDialog({
            minutes: Q.taskEstimate(task), title: task.title, before: task.due,
            onPick: function (slot) { A.scheduleTask(task.id, slot.start, slot.minutes); }
          });
        }
      },
      task.scheduledEventId ? { label: 'Remove from calendar', icon: 'x', onClick: function () { A.unscheduleTask(task.id); } } : null,
      { label: 'Break into steps', icon: 'list', onClick: function () { UI.breakDownDialog(task); } },
      { label: 'Start focus', icon: 'focus', onClick: function () { UI.startFocus({ task: task }); } },
      { separator: true },
      {
        label: 'Delete', icon: 'trash', danger: true, onClick: function () {
          UI.confirm({
            title: 'Delete this task?', message: '“' + task.title + '” will be removed.',
            confirmLabel: 'Delete', tone: 'danger'
          }).then(function (ok) { if (ok) A.deleteTask(task.id); });
        }
      }
    ].filter(Boolean), { align: 'right' });
  }

  function emptyForFilter() {
    var messages = {
      open: { title: 'Nothing open', body: 'Every task is done or archived.' },
      today: { title: 'Nothing due today', body: 'No task carries today’s date.' },
      week: { title: 'Nothing due this week', body: 'Your week is clear of dated tasks.' },
      overdue: { title: 'Nothing overdue', body: 'You are caught up.' },
      inbox: { title: 'Inbox empty', body: 'Everything has been given a date or a project.' },
      completed: { title: 'Nothing completed yet', body: 'Finished tasks collect here.' },
      all: { title: 'No tasks yet', body: 'Add the first one — or dump a list and let the app sort it.' }
    };
    var m = messages[view.filter] || messages.all;
    return UI.emptyState({
      icon: 'checkSquare',
      title: m.title,
      body: m.body,
      actions: [
        { label: 'New task', onClick: function () { UI.editTask(null); } },
        { label: 'Organize a brain dump', onClick: function () { UI.organizeDialog(); } }
      ]
    });
  }

  Views.tasks = { render: render, rerender: rerender, view: view };
})(window);
