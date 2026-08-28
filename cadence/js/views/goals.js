/* Cadence — goals and habits: the long game, and the small repeated things that
   actually move it. */
(function (global) {
  'use strict';
  var Views = global.Views = global.Views || {};

  /* ------------------------------------------------------------- goals */

  var openId = null;
  var goalRoot = null;
  function rerenderGoals() { if (goalRoot) renderGoals(goalRoot); }

  function renderGoals(container, params) {
    goalRoot = container;
    if (params && params.id !== undefined) openId = params.id;
    D.clear(container);
    var goal = openId ? S.get('goals', openId) : null;
    if (goal) return goalDetail(container, goal);

    container.appendChild(D.h('header.page__head', [
      D.h('div.page__head-main', [
        D.h('h1.page__title', { text: 'Goals' }),
        D.h('p.page__subtitle', { text: 'Outcomes worth months, broken into things you can do this week.' })
      ]),
      D.h('div.page__head-actions', [
        D.h('button.btn.btn--primary', { type: 'button', onclick: function () { UI.editGoal(null); } },
          [D.icon('plus', 16), 'New goal'])
      ])
    ]));

    var goals = S.all('goals').filter(function (g) { return !g.archived; });
    if (!goals.length) {
      container.appendChild(UI.emptyState({
        icon: 'target',
        title: 'No goals yet',
        body: 'A goal is where you want to end up. Projects and habits are how you get there — link them and the progress fills itself in.',
        actions: [{ label: 'Set a goal', onClick: function () { UI.editGoal(null); } }]
      }));
      return;
    }

    var grid = D.h('div.goals__grid');
    goals.forEach(function (g) { grid.appendChild(goalCard(g)); });
    container.appendChild(grid);
  }

  function goalCard(g) {
    var progress = Q.goalProgress(g.id);
    var now = T.nowWall();
    var card = D.h('article.goal', { style: { '--goal-color': g.color } });

    card.appendChild(D.h('div.goal__head', [
      D.h('button.goal__name', {
        type: 'button', onclick: function () { openId = g.id; rerenderGoals(); }
      }, g.name),
      D.iconButton('more', 'Goal actions', function (e) { goalMenu(e.currentTarget, g); }, { size: 15 })
    ]));
    if (g.description) card.appendChild(D.h('p.goal__desc', { text: g.description }));

    card.appendChild(Views.projects.progressBar(progress.pct, g.color));

    var meta = D.h('div.goal__meta');
    if (progress.total) meta.appendChild(D.h('span', { text: progress.done + ' of ' + progress.total + ' milestones' }));
    if (progress.projects.length) meta.appendChild(D.h('span', { text: progress.projects.length + ' project' + (progress.projects.length === 1 ? '' : 's') }));
    if (g.due) meta.appendChild(D.h('span', { text: T.relativeTime(T.w(g.due), now) }));
    card.appendChild(meta);

    if ((g.milestones || []).length) {
      var next = g.milestones.filter(function (m) { return !m.done; })[0];
      if (next) {
        card.appendChild(D.h('p.goal__next', [
          D.icon('arrowRight', 13),
          D.h('span', { text: 'Next: ' + next.title })
        ]));
      }
    }
    return card;
  }

  function goalMenu(anchor, g) {
    UI.menu(anchor, [
      { label: 'Open', icon: 'arrowRight', onClick: function () { openId = g.id; rerenderGoals(); } },
      { label: 'Edit', icon: 'edit', onClick: function () { UI.editGoal(g); } },
      { label: 'Add a project', icon: 'folder', onClick: function () { UI.editProject({ goalId: g.id }); } },
      { label: 'Add a habit', icon: 'repeat', onClick: function () { UI.editHabit({ goalId: g.id }); } },
      { separator: true },
      {
        label: 'Delete', icon: 'trash', danger: true, onClick: function () {
          UI.confirm({ title: 'Delete “' + g.name + '”?', message: 'Linked projects, tasks and habits are kept.', confirmLabel: 'Delete', tone: 'danger' })
            .then(function (ok) { if (ok) { A.deleteGoal(g.id); openId = null; rerenderGoals(); } });
        }
      }
    ], { align: 'right' });
  }

  function goalDetail(container, g) {
    var progress = Q.goalProgress(g.id);
    var now = T.nowWall();
    var habits = S.all('habits').filter(function (h) { return h.goalId === g.id && !h.archived; });
    var tasks = Q.tasksForGoal(g.id);

    container.appendChild(D.h('div.detail__back',
      D.h('button.btn.btn--ghost.btn--sm', {
        type: 'button', onclick: function () { openId = null; rerenderGoals(); }
      }, [D.icon('chevronLeft', 15), 'All goals'])));

    container.appendChild(D.h('header.page__head', [
      D.h('div.page__head-main', [
        D.h('h1.page__title', { text: g.name }),
        g.description ? D.h('p.page__subtitle', { text: g.description }) : null
      ]),
      D.h('div.page__head-actions', [
        D.h('button.btn.btn--ghost', { type: 'button', onclick: function () { UI.editGoal(g); } }, [D.icon('edit', 15), 'Edit'])
      ])
    ]));

    container.appendChild(D.h('div.detail__overview', [
      D.h('div.statblock', [
        D.h('span.statblock__value', { text: progress.pct + '%' }),
        D.h('span.statblock__label', { text: 'overall' }),
        Views.projects.progressBar(progress.pct, g.color)
      ]),
      D.h('div.statblock', [
        D.h('span.statblock__value', { text: progress.done + '/' + progress.total }),
        D.h('span.statblock__label', { text: 'milestones' })
      ]),
      D.h('div.statblock', [
        D.h('span.statblock__value', { text: g.due ? T.relativeTime(T.w(g.due), now).replace('in ', '') : '—' }),
        D.h('span.statblock__label', { text: g.due ? 'until the target date' : 'no target date' })
      ])
    ]));

    container.appendChild(D.h('h2.section-title', { text: 'Milestones' }));
    if (!(g.milestones || []).length) {
      container.appendChild(UI.emptyState({
        icon: 'list', title: 'No milestones yet',
        body: 'Milestones turn a goal into a sequence you can see yourself moving through.',
        actions: [{ label: 'Add milestones', onClick: function () { UI.editGoal(g); } }]
      }));
    } else {
      var list = D.h('ol.milestones');
      g.milestones.forEach(function (m, i) {
        list.appendChild(D.h('li.milestone' + (m.done ? '.is-done' : ''), [
          D.h('button.check', {
            type: 'button', role: 'checkbox', 'aria-checked': m.done ? 'true' : 'false',
            'aria-label': m.title,
            style: { '--check-color': g.color },
            onclick: function () { A.toggleMilestone(g.id, m.id); rerenderGoals(); }
          }, m.done ? D.icon('check', 13) : null),
          D.h('span.milestone__num', { text: String(i + 1) }),
          D.h('span.milestone__title', { text: m.title })
        ]));
      });
      container.appendChild(list);
    }

    container.appendChild(D.h('div.section-head', [
      D.h('h2.section-title', { text: 'Projects' }),
      D.h('button.btn.btn--ghost.btn--sm', {
        type: 'button', onclick: function () { UI.editProject({ goalId: g.id }); }
      }, [D.icon('plus', 14), 'Add project'])
    ]));
    if (!progress.projects.length) {
      container.appendChild(D.h('p.card__note', { text: 'No projects linked yet.' }));
    } else {
      var pg = D.h('div.projects__grid');
      progress.projects.forEach(function (p) {
        var pr = Q.projectProgress(p.id);
        pg.appendChild(D.h('article.project', { style: { '--proj-color': p.color } }, [
          D.h('div.project__head', [
            D.h('span.project__swatch', { style: { background: p.color } }),
            D.h('button.project__name', { type: 'button', onclick: function () { UI.go('projects', { id: p.id }); } }, p.name)
          ]),
          Views.projects.progressBar(pr.pct, p.color),
          D.h('div.project__meta', [D.h('span', { text: pr.done + ' of ' + pr.total + ' tasks' })])
        ]));
      });
      container.appendChild(pg);
    }

    container.appendChild(D.h('div.section-head', [
      D.h('h2.section-title', { text: 'Habits' }),
      D.h('button.btn.btn--ghost.btn--sm', {
        type: 'button', onclick: function () { UI.editHabit({ goalId: g.id }); }
      }, [D.icon('plus', 14), 'Add habit'])
    ]));
    if (!habits.length) {
      container.appendChild(D.h('p.card__note', { text: 'No habits linked to this goal.' }));
    } else {
      var hl = D.h('div.habits__grid');
      habits.forEach(function (h) { hl.appendChild(habitCard(h, rerenderGoals)); });
      container.appendChild(hl);
    }

    if (tasks.length) {
      container.appendChild(D.h('h2.section-title', { text: 'Tasks' }));
      var tl = D.h('ul.tlist');
      tasks.forEach(function (t) {
        var done = t.status === 'completed';
        tl.appendChild(D.h('li.trow' + (done ? '.is-done' : ''), [
          D.h('button.check.trow__check', {
            type: 'button', role: 'checkbox', 'aria-checked': done ? 'true' : 'false',
            'aria-label': t.title, onclick: function () { A.completeTask(t.id); rerenderGoals(); }
          }, done ? D.icon('check', 13) : null),
          D.h('div.trow__main', D.h('button.trow__title', { type: 'button', onclick: function () { UI.editTask(t); } }, t.title))
        ]));
      });
      container.appendChild(tl);
    }
  }

  /* ------------------------------------------------------------ habits */

  var habitRoot = null;
  function rerenderHabits() { if (habitRoot) renderHabits(habitRoot); }

  function renderHabits(container) {
    habitRoot = container;
    D.clear(container);

    container.appendChild(D.h('header.page__head', [
      D.h('div.page__head-main', [
        D.h('h1.page__title', { text: 'Habits' }),
        D.h('p.page__subtitle', { text: 'Small things, often. A missed day is just a missed day.' })
      ]),
      D.h('div.page__head-actions', [
        D.h('button.btn.btn--primary', { type: 'button', onclick: function () { UI.editHabit(null); } },
          [D.icon('plus', 16), 'New habit'])
      ])
    ]));

    var habits = S.all('habits').filter(function (h) { return !h.archived; });
    if (!habits.length) {
      container.appendChild(UI.emptyState({
        icon: 'repeat',
        title: 'No habits yet',
        body: 'Reading twenty minutes, practising an instrument, reviewing the day’s notes — the things that only work by repetition.',
        actions: [{ label: 'Add a habit', onClick: function () { UI.editHabit(null); } }]
      }));
      return;
    }

    var today = T.nowWall();
    var due = habits.filter(function (h) { return R.habitDueOn(h, today); });
    if (due.length) {
      container.appendChild(D.h('h2.section-title', { text: 'Today' }));
      var todayList = D.h('ul.habit-today');
      due.forEach(function (h) {
        var key = T.key(today);
        var done = !!(h.log || {})[key];
        var streak = R.habitStreak(h, today);
        todayList.appendChild(D.h('li.habit-today__row' + (done ? '.is-done' : ''), [
          D.h('button.check', {
            type: 'button', role: 'checkbox', 'aria-checked': done ? 'true' : 'false',
            'aria-label': (done ? 'Undo ' : 'Mark done: ') + h.name,
            style: { '--check-color': h.color },
            onclick: function () { A.toggleHabit(h.id, key); rerenderHabits(); }
          }, done ? D.icon('check', 13) : null),
          D.h('span.habit-today__name', { text: h.name }),
          h.time != null ? D.h('span.habit-today__time', { text: T.fmtTime(T.atMinutes(today, h.time), S.settings().use24Hour) }) : null,
          streak.value > 0 ? D.h('span.habit-today__streak', { text: streak.value + ' ' + streak.unit }) : null
        ]));
      });
      container.appendChild(todayList);
    }

    container.appendChild(D.h('h2.section-title', { text: 'All habits' }));
    var grid = D.h('div.habits__grid');
    habits.forEach(function (h) { grid.appendChild(habitCard(h, rerenderHabits)); });
    container.appendChild(grid);
  }

  function habitCard(h, refresh) {
    var today = T.nowWall();
    var streak = R.habitStreak(h, today);
    var target = R.habitTargetPerWeek(h);
    var card = D.h('article.habit', { style: { '--habit-color': h.color } });

    card.appendChild(D.h('div.habit__head', [
      D.h('button.habit__name', { type: 'button', onclick: function () { UI.editHabit(h); } }, h.name),
      D.iconButton('more', 'Habit actions', function (e) {
        UI.menu(e.currentTarget, [
          { label: 'Edit', icon: 'edit', onClick: function () { UI.editHabit(h); } },
          {
            label: 'Schedule it today', icon: 'calendar', onClick: function () {
              var start = h.time != null ? T.atMinutes(today, h.time) : T.snap(T.nowWall(), 30);
              A.createEvent({
                title: h.name, start: T.iso(start), end: T.iso(T.addMinutes(start, h.duration || 20)),
                type: 'block', color: h.color, habitId: h.id, categoryId: h.categoryId
              });
            }
          },
          { separator: true },
          {
            label: 'Delete', icon: 'trash', danger: true, onClick: function () {
              UI.confirm({ title: 'Delete “' + h.name + '”?', message: 'Its history goes too.', confirmLabel: 'Delete', tone: 'danger' })
                .then(function (ok) { if (ok) { A.deleteHabit(h.id); refresh(); } });
            }
          }
        ], { align: 'right' });
      }, { size: 15 })
    ]));

    card.appendChild(D.h('p.habit__schedule', { text: scheduleLabel(h) }));

    /* Last eight weeks, one dot per day. Absence is shown quietly. */
    var gridWrap = D.h('div.habit__grid', { role: 'img', 'aria-label': historyLabel(h) });
    var start = T.addDays(T.startOfWeek(today, 0), -7 * 7);
    for (var w = 0; w < 8; w++) {
      var col = D.h('div.habit__week');
      for (var d = 0; d < 7; d++) {
        var day = T.addDays(start, w * 7 + d);
        var future = day > today;
        var key = T.key(day);
        var done = !!(h.log || {})[key];
        var due = R.habitDueOn(h, day);
        var cell = D.h('span.habit__cell' +
          (done ? '.is-done' : '') +
          (future ? '.is-future' : '') +
          (!due && !done ? '.is-off' : ''), {
          title: T.fmtDate(day) + (done ? ' — done' : future ? '' : due ? ' — not logged' : '')
        });
        col.appendChild(cell);
      }
      gridWrap.appendChild(col);
    }
    card.appendChild(gridWrap);

    var weekDone = 0;
    var weekStart = T.startOfWeek(today, 0);
    for (var i = 0; i < 7; i++) if ((h.log || {})[T.key(T.addDays(weekStart, i))]) weekDone++;

    card.appendChild(D.h('div.habit__stats', [
      D.h('span', { text: weekDone + ' of ' + target + ' this week' }),
      streak.value > 0 ? D.h('span.habit__streak', { text: streak.value + ' ' + streak.unit + ' running' })
        : D.h('span.habit__streak.is-quiet', { text: 'Fresh start' })
    ]));
    return card;
  }

  function scheduleLabel(h) {
    var s = h.schedule || { type: 'daily' };
    var when = h.time != null ? ' · around ' + T.fmtTime(T.atMinutes(T.nowWall(), h.time), S.settings().use24Hour) : '';
    switch (s.type) {
      case 'daily': return 'Every day' + when;
      case 'weekdays': return 'Weekdays' + when;
      case 'weekly': return (s.days || []).map(function (d) { return T.DAY_SHORT[d]; }).join(', ') + when;
      case 'times-per-week': return (s.timesPerWeek || 3) + ' times a week' + when;
      default: return 'Repeats' + when;
    }
  }

  function historyLabel(h) {
    var count = Object.keys(h.log || {}).length;
    return h.name + ': ' + count + ' day' + (count === 1 ? '' : 's') + ' logged in total';
  }

  Views.goals = { render: renderGoals, rerender: rerenderGoals };
  Views.habits = { render: renderHabits, rerender: rerenderHabits, habitCard: habitCard };
})(window);
