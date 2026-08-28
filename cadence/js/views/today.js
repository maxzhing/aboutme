/* Cadence — Today. The one screen that answers "what now?" without scrolling. */
(function (global) {
  'use strict';
  var Views = global.Views = global.Views || {};

  function use24() { return S.settings().use24Hour; }

  function greeting(now) {
    var h = now.getHours();
    if (h < 5) return 'Still up';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good evening';
  }

  function render(container) {
    var now = T.nowWall();
    var st = S.settings();
    var name = st.name ? ', ' + st.name : '';
    D.clear(container);

    var events = Q.eventsOnDay(now).filter(function (e) { return !e.allDay; });
    var allDay = Q.eventsOnDay(now).filter(function (e) { return e.allDay; });
    var upcoming = events.filter(function (e) { return e.endWall > now; });
    var next = upcoming[0];
    var load = SCHED.dayLoad(now);
    var overdue = Q.overdueTasks(now);

    container.appendChild(D.h('header.today__head', [
      D.h('div', [
        D.h('h1.today__greeting', { text: greeting(now) + name }),
        D.h('p.today__date', { text: T.fmtDateLong(now) })
      ]),
      D.h('div.today__head-actions', [
        D.h('button.btn.btn--ghost', {
          type: 'button', onclick: function () { UI.whatNowDialog(); }
        }, [D.icon('compass', 16), 'What should I do now?']),
        D.h('button.btn.btn--primary', {
          type: 'button', onclick: function () { UI.planDayDialog(now, { onDone: function () { UI.refresh(); } }); }
        }, [D.icon('sparkle', 16), 'Plan my day'])
      ])
    ]));

    var grid = D.h('div.today__grid');

    /* --- next up --- */
    grid.appendChild(card({
      title: 'Next up',
      className: 'card--next',
      body: nextUpBody(next, now, events)
    }));

    /* --- progress --- */
    grid.appendChild(card({
      title: 'Today at a glance',
      className: 'card--glance',
      body: glanceBody(now, load, events)
    }));

    /* --- schedule --- */
    grid.appendChild(card({
      title: 'Today’s schedule',
      className: 'card--schedule card--wide',
      action: { label: 'Open calendar', onClick: function () { UI.go('calendar', { date: T.key(now), view: 'day' }); } },
      body: scheduleBody(events, allDay, now)
    }));

    /* --- priorities --- */
    grid.appendChild(card({
      title: 'Priorities',
      className: 'card--priorities',
      action: { label: 'All tasks', onClick: function () { UI.go('tasks'); } },
      body: prioritiesBody(now, overdue)
    }));

    /* --- deadlines --- */
    grid.appendChild(card({
      title: 'Deadlines',
      className: 'card--deadlines',
      body: deadlinesBody(now)
    }));

    /* --- free time --- */
    grid.appendChild(card({
      title: 'Free time left',
      className: 'card--free',
      body: freeBody(now)
    }));

    /* --- habits --- */
    var habits = Q.habitsForDay(now);
    if (habits.length) {
      grid.appendChild(card({
        title: 'Habits',
        className: 'card--habits',
        action: { label: 'All habits', onClick: function () { UI.go('habits'); } },
        body: habitsBody(habits)
      }));
    }

    /* --- capture --- */
    grid.appendChild(card({
      title: 'Capture a thought',
      className: 'card--capture',
      body: D.h('div', [
        UI.captureBox({ onAdd: function () { UI.refresh(); } }),
        D.h('p.card__hint', { text: 'Write it down now, sort it out later.' })
      ])
    }));

    /* --- suggestions --- */
    var suggestions = SCHED.suggestions(now);
    if (suggestions.length) {
      var sugBody = D.h('div.suggestions');
      suggestions.forEach(function (s) {
        sugBody.appendChild(UI.suggestionCard(s, function () { UI.refresh(); }));
      });
      grid.appendChild(card({
        title: 'Worth a look',
        className: 'card--suggestions card--wide',
        body: sugBody
      }));
    }

    container.appendChild(grid);
  }

  function card(opts) {
    var node = D.h('section.card' + (opts.className ? '.' + opts.className.split(' ').join('.') : ''));
    var head = D.h('div.card__head', [D.h('h2.card__title', { text: opts.title })]);
    if (opts.action) {
      head.appendChild(D.h('button.card__action', { type: 'button', onclick: opts.action.onClick }, [
        D.h('span', { text: opts.action.label }), D.icon('chevronRight', 14)
      ]));
    }
    node.appendChild(head);
    node.appendChild(D.h('div.card__body', opts.body));
    return node;
  }

  function nextUpBody(next, now, events) {
    var current = events.filter(function (e) { return e.startWall <= now && e.endWall > now; })[0];
    if (current) {
      return D.h('div.nextup', [
        D.h('span.nextup__label', { text: 'Happening now' }),
        D.h('h3.nextup__title', { text: current.title }),
        D.h('p.nextup__meta', {
          text: T.fmtTime(current.startWall, use24()) + ' – ' + T.fmtTime(current.endWall, use24()) +
            ' · ' + T.humanDuration(T.diffMinutes(now, current.endWall)) + ' left'
        }),
        current.location ? D.h('p.nextup__loc', [D.icon('pin', 13), D.h('span', { text: current.location })]) : null,
        D.h('div.nextup__actions', [
          D.h('button.btn.btn--sm.btn--primary', {
            type: 'button', onclick: function () { UI.startFocus({ event: current }); }
          }, [D.icon('focus', 15), 'Focus']),
          D.h('button.btn.btn--sm.btn--ghost', {
            type: 'button', onclick: function () { UI.editEvent(current); }
          }, 'Open')
        ])
      ]);
    }
    if (!next) {
      return UI.emptyState({
        icon: 'coffee',
        title: 'Nothing else today',
        body: 'The rest of the day is yours.',
        actions: [
          { label: 'Add an event', onClick: function () { UI.editEvent(null); } },
          { label: 'Plan my day', onClick: function () { UI.planDayDialog(); } }
        ]
      });
    }
    var until = T.diffMinutes(now, next.startWall);
    var travel = S.settings().travelTimeEnabled && next.travelMinutes ? next.travelMinutes : 0;
    return D.h('div.nextup', [
      D.h('span.nextup__label', { text: 'In ' + T.humanDuration(until) }),
      D.h('h3.nextup__title', { text: next.title }),
      D.h('p.nextup__meta', {
        text: T.fmtTime(next.startWall, use24()) + ' – ' + T.fmtTime(next.endWall, use24())
      }),
      next.location ? D.h('p.nextup__loc', [D.icon('pin', 13), D.h('span', { text: next.location })]) : null,
      travel ? D.h('p.nextup__travel', [
        D.icon('clock', 13),
        D.h('span', { text: 'Leave around ' + T.fmtTime(T.addMinutes(next.startWall, -travel), use24()) })
      ]) : null,
      D.h('div.nextup__actions', [
        D.h('button.btn.btn--sm.btn--ghost', {
          type: 'button', onclick: function () { UI.editEvent(next); }
        }, 'Open'),
        until > 20 ? D.h('button.btn.btn--sm.btn--ghost', {
          type: 'button', onclick: function () { UI.whatNowDialog(); }
        }, 'Use the time') : null
      ])
    ]);
  }

  function glanceBody(now, load, events) {
    var tasksToday = Q.tasksDueOn(now);
    var done = tasksToday.filter(function (t) { return t.status === 'completed'; }).length;
    var pct = tasksToday.length ? Math.round(done / tasksToday.length * 100) : 0;

    return D.h('div.glance', [
      D.h('div.glance__ring', ringNode(pct)),
      D.h('div.glance__stats', [
        glanceStat(String(events.length), events.length === 1 ? 'event' : 'events'),
        glanceStat(done + '/' + tasksToday.length, 'tasks due today'),
        glanceStat(T.humanDuration(load.freeMinutes), 'free in your day')
      ])
    ]);
  }

  function glanceStat(value, label) {
    return D.h('div.glance__stat', [
      D.h('span.glance__value', { text: value }),
      D.h('span.glance__label', { text: label })
    ]);
  }

  function ringNode(pct) {
    var size = 92, stroke = 8, r = (size - stroke) / 2, c = 2 * Math.PI * r;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('width', size); svg.setAttribute('height', size);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', pct + ' per cent of today’s tasks complete');
    svg.classList.add('ring');
    function circle(cls, offset) {
      var el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      el.setAttribute('cx', size / 2); el.setAttribute('cy', size / 2); el.setAttribute('r', r);
      el.setAttribute('fill', 'none'); el.setAttribute('stroke-width', stroke);
      el.setAttribute('class', cls);
      if (offset != null) {
        el.setAttribute('stroke-dasharray', c);
        el.setAttribute('stroke-dashoffset', offset);
        el.setAttribute('stroke-linecap', 'round');
        el.setAttribute('transform', 'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')');
      }
      return el;
    }
    svg.appendChild(circle('ring__track'));
    svg.appendChild(circle('ring__bar', c * (1 - pct / 100)));
    var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', size / 2); text.setAttribute('y', size / 2 + 5);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'ring__text');
    text.textContent = pct + '%';
    svg.appendChild(text);
    return svg;
  }

  function scheduleBody(events, allDay, now) {
    if (!events.length && !allDay.length) {
      return UI.emptyState({
        icon: 'calendar',
        title: 'No events today',
        body: 'A clear day. You can fill it deliberately, or leave it clear.',
        actions: [
          { label: 'Add an event', onClick: function () { UI.editEvent(null); } },
          { label: 'Plan my day', onClick: function () { UI.planDayDialog(); } },
          { label: 'Capture a thought', onClick: function () { UI.go('capture'); } }
        ]
      });
    }
    var list = D.h('div.mini-schedule');
    allDay.forEach(function (ev) {
      list.appendChild(D.h('button.mini-schedule__row.is-allday', {
        type: 'button', onclick: function () { UI.editEvent(ev); }
      }, [
        D.h('span.mini-schedule__time', { text: 'All day' }),
        D.h('span.mini-schedule__bar', { style: { background: Q.eventColor(ev) } }),
        D.h('span.mini-schedule__title', { text: ev.title })
      ]));
    });
    events.forEach(function (ev) {
      var past = ev.endWall < now;
      var current = ev.startWall <= now && ev.endWall > now;
      list.appendChild(D.h('button.mini-schedule__row' + (past ? '.is-past' : '') + (current ? '.is-current' : ''), {
        type: 'button', onclick: function () { UI.editEvent(ev); }
      }, [
        D.h('span.mini-schedule__time', { text: T.fmtTime(ev.startWall, use24()) }),
        D.h('span.mini-schedule__bar', { style: { background: Q.eventColor(ev) } }),
        D.h('span.mini-schedule__title', { text: ev.title }),
        D.h('span.mini-schedule__meta', { text: T.humanDuration(T.diffMinutes(ev.startWall, ev.endWall)) })
      ]));
    });
    return list;
  }

  function prioritiesBody(now, overdue) {
    var body = D.h('div');
    if (overdue.length) {
      body.appendChild(D.h('div.notice.notice--warn', [
        D.icon('undo', 15),
        D.h('span', {
          text: overdue.length === 1
            ? 'One task slipped past its date.'
            : overdue.length + ' tasks slipped past their dates.'
        }),
        D.h('button.btn.btn--sm.btn--ghost', {
          type: 'button', onclick: function () { UI.recoveryDialog({ tasks: overdue }); }
        }, 'Sort it out')
      ]));
    }
    var top = SCHED.rankedTasks(now, { horizonDays: 10 }).slice(0, 3);
    if (!top.length) {
      body.appendChild(UI.emptyState({
        icon: 'check',
        title: 'Nothing pressing',
        body: 'No task is asking for attention today.',
        actions: [{ label: 'Add a task', onClick: function () { UI.editTask(null); } }]
      }));
      return body;
    }
    var list = D.h('ol.priority-list');
    top.forEach(function (entry, i) {
      list.appendChild(priorityRow(entry, i));
    });
    body.appendChild(list);
    return body;
  }

  function priorityRow(entry, index) {
    var task = entry.task;
    var row = D.h('li.priority-row');
    row.appendChild(D.h('button.check', {
      type: 'button', role: 'checkbox', 'aria-checked': 'false',
      'aria-label': 'Complete ' + task.title,
      onclick: function () { A.completeTask(task.id, true); }
    }));
    row.appendChild(D.h('div.priority-row__main', [
      D.h('button.priority-row__title', {
        type: 'button', onclick: function () { UI.editTask(task); }
      }, task.title),
      D.h('span.priority-row__why', {
        text: entry.reasons.length ? entry.reasons.join(' · ') : T.humanDuration(Q.taskEstimate(task))
      })
    ]));
    row.appendChild(D.h('div.priority-row__actions', [
      D.iconButton('play', 'Focus on ' + task.title, function () {
        UI.startFocus({ task: task });
      }, { size: 15 }),
      D.iconButton('calendar', 'Find time for ' + task.title, function () {
        UI.findTimeDialog({
          minutes: Q.taskEstimate(task), title: task.title, before: task.due,
          onPick: function (slot) { A.scheduleTask(task.id, slot.start, slot.minutes); }
        });
      }, { size: 15 })
    ]));
    return row;
  }

  function deadlinesBody(now) {
    var list = Q.upcomingDeadlines(null, now).filter(function (d) {
      return T.diffDays(now, T.w(d.due)) <= 21;
    }).slice(0, 5);
    if (!list.length) {
      return UI.emptyState({
        icon: 'flag',
        title: 'No deadlines coming up',
        body: 'Nothing is due in the next three weeks.',
        actions: [{ label: 'Add a deadline', onClick: function () { UI.editDeadline(null); } }]
      });
    }
    var node = D.h('ul.deadline-list');
    list.forEach(function (d) {
      var status = Q.deadlineStatus(d, now);
      node.appendChild(D.h('li.deadline-row.is-' + status.level, [
        D.h('span.deadline-row__marker', { 'aria-hidden': 'true' }, D.icon('flag', 13)),
        D.h('button.deadline-row__title', {
          type: 'button', onclick: function () { UI.editDeadline(d); }
        }, d.title),
        D.h('span.deadline-row__when', { text: status.label })
      ]));
    });
    return node;
  }

  function freeBody(now) {
    var slots = SCHED.freeSlots(now, { after: now, minMinutes: 20 });
    if (!slots.length) {
      return D.h('p.card__note', { text: 'No open blocks left inside your working hours today.' });
    }
    var total = slots.reduce(function (a, s) { return a + s.minutes; }, 0);
    var node = D.h('div.free');
    node.appendChild(D.h('p.free__total', { text: T.humanDuration(total) + ' across ' + slots.length + ' block' + (slots.length === 1 ? '' : 's') }));
    var list = D.h('ul.free__list');
    slots.slice(0, 4).forEach(function (s) {
      list.appendChild(D.h('li.free__slot', [
        D.h('span.free__time', { text: T.fmtTime(s.start, use24()) + ' – ' + T.fmtTime(s.end, use24()) }),
        D.h('span.free__len', { text: T.humanDuration(s.minutes) }),
        D.h('button.free__use', {
          type: 'button',
          'aria-label': 'Use the block at ' + T.fmtTime(s.start, use24()),
          onclick: function () { Views.calendar.quickCreate(s.start, s.end); }
        }, D.icon('plus', 14))
      ]));
    });
    node.appendChild(list);
    return node;
  }

  function habitsBody(habits) {
    var list = D.h('ul.habit-today');
    habits.forEach(function (entry) {
      var streak = R.habitStreak(entry.habit, T.nowWall());
      list.appendChild(D.h('li.habit-today__row' + (entry.done ? '.is-done' : ''), [
        D.h('button.check', {
          type: 'button', role: 'checkbox', 'aria-checked': entry.done ? 'true' : 'false',
          'aria-label': (entry.done ? 'Undo ' : 'Mark done: ') + entry.habit.name,
          style: { '--check-color': entry.habit.color },
          onclick: function () { A.toggleHabit(entry.habit.id, entry.key); }
        }, entry.done ? D.icon('check', 13) : null),
        D.h('span.habit-today__name', { text: entry.habit.name }),
        streak.value > 0 ? D.h('span.habit-today__streak', { text: streak.value + ' ' + streak.unit }) : null
      ]));
    });
    return list;
  }

  Views.today = { render: render };
})(window);
