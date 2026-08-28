/* Cadence — planning: the weekly and monthly review, the priority matrix, and
   the entry points to the planners. Reviews report; they never grade. */
(function (global) {
  'use strict';
  var Views = global.Views = global.Views || {};

  var tab = 'week';
  var weekAnchor = null;
  var monthAnchor = null;
  var root = null;
  function rerender() { if (root) render(root); }

  function render(container, params) {
    root = container;
    if (params && params.tab) tab = params.tab;
    if (!weekAnchor) weekAnchor = T.startOfWeek(T.nowWall(), S.settings().firstDayOfWeek);
    if (!monthAnchor) monthAnchor = T.startOfMonth(T.nowWall());
    D.clear(container);

    container.appendChild(D.h('header.page__head', [
      D.h('div.page__head-main', [
        D.h('h1.page__title', { text: 'Planning' }),
        D.h('p.page__subtitle', { text: 'Look back honestly, then decide what next week is for.' })
      ]),
      D.h('div.page__head-actions', [
        D.h('button.btn.btn--ghost', {
          type: 'button', onclick: function () { UI.planDayDialog(T.nowWall(), { onDone: rerender }); }
        }, [D.icon('sparkle', 16), 'Plan my day']),
        D.h('button.btn.btn--primary', {
          type: 'button', onclick: function () { UI.planWeekDialog(weekAnchor); }
        }, [D.icon('grid', 16), 'Plan the week'])
      ])
    ]));

    var tabs = D.h('div.segmented.planning__tabs', { role: 'radiogroup', 'aria-label': 'Planning view' });
    [{ id: 'week', label: 'Weekly review' }, { id: 'month', label: 'Monthly review' }, { id: 'matrix', label: 'Priorities' }]
      .forEach(function (t) {
        tabs.appendChild(D.h('button.segmented__btn', {
          type: 'button', role: 'radio', 'aria-checked': tab === t.id ? 'true' : 'false',
          onclick: function () { tab = t.id; rerender(); }
        }, t.label));
      });
    container.appendChild(tabs);

    if (tab === 'week') renderWeek(container);
    else if (tab === 'month') renderMonth(container);
    else renderMatrix(container);
  }

  /* --------------------------------------------------------- week review */

  function renderWeek(container) {
    var review = SCHED.weekReview(weekAnchor);
    var now = T.nowWall();
    var isCurrent = T.sameDay(weekAnchor, T.startOfWeek(now, S.settings().firstDayOfWeek));

    container.appendChild(D.h('div.review__nav', [
      D.iconButton('chevronLeft', 'Previous week', function () { weekAnchor = T.addDays(weekAnchor, -7); rerender(); }),
      D.h('h2.review__range', {
        text: T.fmtDateShort(review.start) + ' – ' + T.fmtDateShort(review.end) + (isCurrent ? ' · this week' : '')
      }),
      D.iconButton('chevronRight', 'Next week', function () { weekAnchor = T.addDays(weekAnchor, 7); rerender(); })
    ]));

    var stats = D.h('div.review__stats', [
      statCard(String(review.completed.length), 'tasks completed'),
      statCard(String(review.unfinished.length), 'still open from this week'),
      statCard(T.humanDuration(review.totalMinutes), 'scheduled across ' + review.events.length + ' events'),
      statCard(String(review.upcomingDeadlines.length), 'deadlines in the next two weeks')
    ]);
    container.appendChild(stats);

    /* Where the time went */
    container.appendChild(D.h('h3.section-title', { text: 'Where the time went' }));
    if (!review.byCategory.length) {
      container.appendChild(D.h('p.card__note', { text: 'Nothing was scheduled this week, so there is nothing to break down.' }));
    } else {
      container.appendChild(barChart(review.byCategory.map(function (c) {
        return { label: c.label, value: c.minutes, display: T.humanDuration(c.minutes) };
      })));
    }

    /* Completed */
    container.appendChild(D.h('h3.section-title', { text: 'Finished' }));
    if (!review.completed.length) {
      container.appendChild(D.h('p.card__note', { text: 'No tasks were marked complete in this week.' }));
    } else {
      var doneList = D.h('ul.review__list');
      review.completed.slice(0, 12).forEach(function (t) {
        doneList.appendChild(D.h('li.review__row', [
          D.h('span.review__tick', D.icon('check', 13)),
          D.h('span', { text: t.title }),
          D.h('span.review__meta', { text: T.relativeDay(T.w(t.completedAt), now) })
        ]));
      });
      container.appendChild(doneList);
    }

    /* Unfinished — framed as choices, not failures */
    container.appendChild(D.h('div.section-head', [
      D.h('h3.section-title', { text: 'Still open' }),
      review.unfinished.length ? D.h('button.btn.btn--ghost.btn--sm', {
        type: 'button', onclick: function () { UI.recoveryDialog({ tasks: review.unfinished }); }
      }, 'Decide what to do with these') : null
    ]));
    if (!review.unfinished.length) {
      container.appendChild(D.h('p.card__note', { text: 'Nothing dated in this week is still open.' }));
    } else {
      var openList = D.h('ul.review__list');
      review.unfinished.forEach(function (t) {
        openList.appendChild(D.h('li.review__row', [
          D.h('span.review__tick.is-open', D.icon('circle', 12)),
          D.h('button.link', { type: 'button', onclick: function () { UI.editTask(t); } }, t.title),
          D.h('span.review__meta', { text: t.due ? T.relativeDay(T.w(t.due), now) : '' })
        ]));
      });
      container.appendChild(openList);
    }

    /* Habits */
    if (review.habits.length) {
      container.appendChild(D.h('h3.section-title', { text: 'Habits this week' }));
      var hl = D.h('ul.review__list');
      review.habits.forEach(function (h) {
        hl.appendChild(D.h('li.review__row', [
          D.h('span.review__swatch', { style: { background: h.habit.color } }),
          D.h('span', { text: h.habit.name }),
          D.h('span.review__meta', { text: h.done + ' of ' + h.target })
        ]));
      });
      container.appendChild(hl);
    }

    /* Next week */
    container.appendChild(D.h('div.section-head', [
      D.h('h3.section-title', { text: 'What next week is for' }),
      D.h('button.btn.btn--primary.btn--sm', {
        type: 'button', onclick: function () { UI.planWeekDialog(T.addDays(weekAnchor, 7)); }
      }, [D.icon('sparkle', 14), 'Plan next week'])
    ]));
    if (!review.nextWeekPriorities.length) {
      container.appendChild(D.h('p.card__note', { text: 'Nothing is queued up yet for next week.' }));
    } else {
      var pl = D.h('ol.review__priorities');
      review.nextWeekPriorities.forEach(function (entry) {
        pl.appendChild(D.h('li.review__priority', [
          D.h('button.link', { type: 'button', onclick: function () { UI.editTask(entry.task); } }, entry.task.title),
          D.h('span.review__meta', { text: entry.reasons.join(', ') || T.humanDuration(Q.taskEstimate(entry.task)) })
        ]));
      });
      container.appendChild(pl);
    }
  }

  /* -------------------------------------------------------- month review */

  function renderMonth(container) {
    var review = SCHED.monthReview(monthAnchor);
    var now = T.nowWall();

    container.appendChild(D.h('div.review__nav', [
      D.iconButton('chevronLeft', 'Previous month', function () { monthAnchor = T.addMonths(monthAnchor, -1); rerender(); }),
      D.h('h2.review__range', { text: T.fmtMonthYear(monthAnchor) }),
      D.iconButton('chevronRight', 'Next month', function () { monthAnchor = T.addMonths(monthAnchor, 1); rerender(); })
    ]));

    var totalMinutes = review.byCategory.reduce(function (a, c) { return a + c.minutes; }, 0);
    container.appendChild(D.h('div.review__stats', [
      statCard(String(review.completed.length), 'tasks completed'),
      statCard(String(review.events.length), 'events'),
      statCard(T.humanDuration(totalMinutes), 'scheduled time'),
      statCard(String(review.deadlines.length), 'deadlines this month')
    ]));

    container.appendChild(D.h('h3.section-title', { text: 'Time by category' }));
    if (!review.byCategory.length) container.appendChild(D.h('p.card__note', { text: 'Nothing scheduled this month.' }));
    else container.appendChild(barChart(review.byCategory.map(function (c) {
      return { label: c.label, value: c.minutes, display: T.humanDuration(c.minutes) };
    })));

    container.appendChild(D.h('h3.section-title', { text: 'Tasks completed each week' }));
    container.appendChild(sparkline(review.weeks.map(function (w) {
      return { label: T.fmtDateShort(w.start), value: w.count };
    })));

    container.appendChild(D.h('h3.section-title', { text: 'Deadlines' }));
    if (!review.deadlines.length) container.appendChild(D.h('p.card__note', { text: 'No deadlines fell in this month.' }));
    else {
      var dl = D.h('ul.review__list');
      review.deadlines.forEach(function (d) {
        var status = Q.deadlineStatus(d, now);
        dl.appendChild(D.h('li.review__row', [
          D.h('span.review__tick' + (d.done ? '' : '.is-open'), d.done ? D.icon('check', 13) : D.icon('flag', 12)),
          D.h('button.link', { type: 'button', onclick: function () { UI.editDeadline(d); } }, d.title),
          D.h('span.review__meta', { text: d.done ? 'Completed' : status.label })
        ]));
      });
      container.appendChild(dl);
    }

    container.appendChild(D.h('h3.section-title', { text: 'Project progress' }));
    if (!review.projects.length) container.appendChild(D.h('p.card__note', { text: 'No projects yet.' }));
    else {
      var pl = D.h('div.review__projects');
      review.projects.forEach(function (entry) {
        pl.appendChild(D.h('div.review__project', [
          D.h('button.link', { type: 'button', onclick: function () { UI.go('projects', { id: entry.project.id }); } }, entry.project.name),
          Views.projects.progressBar(entry.progress.pct, entry.project.color)
        ]));
      });
      container.appendChild(pl);
    }

    if (review.goals.length) {
      container.appendChild(D.h('h3.section-title', { text: 'Goal progress' }));
      var gl = D.h('div.review__projects');
      review.goals.forEach(function (entry) {
        gl.appendChild(D.h('div.review__project', [
          D.h('button.link', { type: 'button', onclick: function () { UI.go('goals', { id: entry.goal.id }); } }, entry.goal.name),
          Views.projects.progressBar(entry.progress.pct, entry.goal.color)
        ]));
      });
      container.appendChild(gl);
    }
  }

  /* ------------------------------------------------------ priority matrix */

  function renderMatrix(container) {
    var now = T.nowWall();
    var tasks = Q.activeTasks();
    var buckets = { do: [], schedule: [], delegate: [], later: [] };
    tasks.forEach(function (t) { buckets[SCHED.quadrant(t, now).id].push(t); });

    container.appendChild(D.h('p.page__lead', {
      text: 'A way to see the shape of your list. Nothing here changes how the app behaves — it is a lens, not a rulebook.'
    }));

    var grid = D.h('div.matrix');
    [
      { id: 'do', title: 'Important & urgent', hint: 'Do these first' },
      { id: 'schedule', title: 'Important, not urgent', hint: 'Give these real time' },
      { id: 'delegate', title: 'Urgent, less important', hint: 'Batch or shrink these' },
      { id: 'later', title: 'Neither', hint: 'Fine to leave' }
    ].forEach(function (q) {
      var cell = D.h('section.matrix__cell.matrix__cell--' + q.id);
      cell.appendChild(D.h('div.matrix__head', [
        D.h('h3.matrix__title', { text: q.title }),
        D.h('span.matrix__hint', { text: q.hint }),
        D.h('span.matrix__count', { text: String(buckets[q.id].length) })
      ]));
      if (!buckets[q.id].length) {
        cell.appendChild(D.h('p.matrix__empty', { text: 'Nothing here' }));
      } else {
        var list = D.h('ul.matrix__list');
        buckets[q.id].slice(0, 12).forEach(function (t) {
          list.appendChild(D.h('li', D.h('button.matrix__task', {
            type: 'button', onclick: function () { UI.editTask(t); }
          }, [
            D.h('span', { text: t.title }),
            t.due ? D.h('span.matrix__due', { text: T.relativeDay(T.w(t.due), now) }) : null
          ])));
        });
        if (buckets[q.id].length > 12) {
          list.appendChild(D.h('li.matrix__more', { text: '+' + (buckets[q.id].length - 12) + ' more' }));
        }
        cell.appendChild(list);
      }
      grid.appendChild(cell);
    });
    container.appendChild(grid);
  }

  /* ------------------------------------------------------------- charts */

  function statCard(value, label) {
    return D.h('div.statcard', [
      D.h('span.statcard__value', { text: value }),
      D.h('span.statcard__label', { text: label })
    ]);
  }

  /* Horizontal bars: readable at a glance, honest about scale, and labelled in
     text as well as length so colour is never the only signal. */
  function barChart(rows) {
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    var chart = D.h('div.barchart', { role: 'list' });
    rows.forEach(function (r) {
      chart.appendChild(D.h('div.barchart__row', { role: 'listitem' }, [
        D.h('span.barchart__label', { text: r.label }),
        D.h('span.barchart__track', D.h('span.barchart__bar', {
          style: { width: Math.max(2, r.value / max * 100) + '%' }
        })),
        D.h('span.barchart__value', { text: r.display || String(r.value) })
      ]));
    });
    return chart;
  }

  function sparkline(points) {
    if (!points.length) return D.h('p.card__note', { text: 'Not enough data yet.' });
    var max = Math.max.apply(null, points.map(function (p) { return p.value; }).concat([1]));
    var wrap = D.h('div.sparkline', {
      role: 'img',
      'aria-label': points.map(function (p) { return p.label + ': ' + p.value; }).join(', ')
    });
    points.forEach(function (p) {
      wrap.appendChild(D.h('div.sparkline__col', [
        D.h('span.sparkline__value', { text: String(p.value) }),
        D.h('span.sparkline__bar', { style: { height: Math.max(4, p.value / max * 100) + '%' } }),
        D.h('span.sparkline__label', { text: p.label })
      ]));
    });
    return wrap;
  }

  Views.planning = { render: render, rerender: rerender, barChart: barChart, sparkline: sparkline, statCard: statCard };
})(window);
