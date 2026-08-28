/* Cadence — insights.
   Descriptive, never disciplinary: "you scheduled 7 hours and completed 5" is a
   fact worth knowing; "you were unproductive" is not information. */
(function (global) {
  'use strict';
  var Views = global.Views = global.Views || {};

  var rangeDays = 28;
  var root = null;
  function rerender() { if (root) render(root); }

  function render(container) {
    root = container;
    D.clear(container);
    var now = T.nowWall();
    var start = T.startOfDay(T.addDays(now, -(rangeDays - 1)));
    var end = T.endOfDay(now);

    container.appendChild(D.h('header.page__head', [
      D.h('div.page__head-main', [
        D.h('h1.page__title', { text: 'Insights' }),
        D.h('p.page__subtitle', { text: 'What your time actually looked like. No scores, no streetlights.' })
      ]),
      D.h('div.page__head-actions', [
        D.h('div.segmented', { role: 'radiogroup', 'aria-label': 'Time range' },
          [7, 28, 90].map(function (d) {
            return D.h('button.segmented__btn', {
              type: 'button', role: 'radio', 'aria-checked': rangeDays === d ? 'true' : 'false',
              onclick: function () { rangeDays = d; rerender(); }
            }, d + ' days');
          }))
      ])
    ]));

    var events = Q.eventsInRange(start, end, { ignoreLayers: true }).filter(function (e) { return !e.allDay; });
    var tasks = S.all('tasks');
    var completed = tasks.filter(function (t) {
      if (!t.completedAt) return false;
      var c = T.w(t.completedAt);
      return c >= start && c <= end;
    });

    var scheduledMinutes = events.reduce(function (a, e) { return a + T.diffMinutes(e.startWall, e.endWall); }, 0);
    var completedFromBlocks = events.filter(function (e) { return e.taskId && e.done; })
      .reduce(function (a, e) { return a + T.diffMinutes(e.startWall, e.endWall); }, 0);

    container.appendChild(D.h('div.review__stats', [
      Views.planning.statCard(T.humanDuration(scheduledMinutes), 'scheduled in this period'),
      Views.planning.statCard(String(completed.length), 'tasks completed'),
      Views.planning.statCard(String(events.length), 'events'),
      Views.planning.statCard(T.humanDuration(Math.round(scheduledMinutes / rangeDays)), 'scheduled per day on average')
    ]));

    /* --- where time went --- */
    container.appendChild(D.h('h2.section-title', { text: 'Where your time went' }));
    var byCategory = {};
    events.forEach(function (e) {
      var cat = e.categoryId ? (S.get('categories', e.categoryId) || {}).name : null;
      var label = cat || (S.get('calendars', e.calendarId) || {}).name || 'Other';
      byCategory[label] = (byCategory[label] || 0) + T.diffMinutes(e.startWall, e.endWall);
    });
    var catRows = Object.keys(byCategory).map(function (k) {
      return { label: k, value: byCategory[k], display: T.humanDuration(byCategory[k]) };
    }).sort(function (a, b) { return b.value - a.value; });
    if (!catRows.length) {
      container.appendChild(D.h('p.card__note', { text: 'Nothing was scheduled in this period.' }));
    } else {
      container.appendChild(Views.planning.barChart(catRows));
    }

    /* --- planned vs completed --- */
    container.appendChild(D.h('h2.section-title', { text: 'Planned against finished' }));
    var plannedBlocks = events.filter(function (e) { return e.taskId; });
    if (!plannedBlocks.length) {
      container.appendChild(D.h('p.card__note', {
        text: 'You have not scheduled task blocks in this period, so there is nothing to compare. Scheduling a task turns it into a block you can measure against.'
      }));
    } else {
      var doneBlocks = plannedBlocks.filter(function (e) { return e.done; }).length;
      container.appendChild(D.h('p.insight__sentence', {
        text: 'You set aside ' + T.humanDuration(plannedBlocks.reduce(function (a, e) { return a + T.diffMinutes(e.startWall, e.endWall); }, 0)) +
          ' across ' + plannedBlocks.length + ' blocks, and marked ' + doneBlocks + ' of them done' +
          (completedFromBlocks ? ' (' + T.humanDuration(completedFromBlocks) + ').' : '.')
      }));
      container.appendChild(Views.planning.barChart([
        { label: 'Blocks scheduled', value: plannedBlocks.length, display: String(plannedBlocks.length) },
        { label: 'Blocks completed', value: doneBlocks, display: String(doneBlocks) }
      ]));
    }

    /* --- completions over time --- */
    container.appendChild(D.h('h2.section-title', { text: 'Tasks completed' }));
    var buckets = [];
    var bucketDays = rangeDays <= 7 ? 1 : 7;
    for (var offset = rangeDays - 1; offset >= 0; offset -= bucketDays) {
      var bStart = T.startOfDay(T.addDays(now, -offset));
      var bEnd = T.endOfDay(T.addDays(bStart, bucketDays - 1));
      var count = completed.filter(function (t) {
        var c = T.w(t.completedAt);
        return c >= bStart && c <= bEnd;
      }).length;
      buckets.push({ label: T.fmtDateShort(bStart), value: count });
    }
    container.appendChild(Views.planning.sparkline(buckets));

    /* --- workload ahead --- */
    container.appendChild(D.h('h2.section-title', { text: 'The two weeks ahead' }));
    var ahead = [];
    for (var i = 0; i < 14; i++) {
      var day = T.startOfDay(T.addDays(now, i));
      var load = SCHED.dayLoad(day);
      var dueCount = Q.tasksDueOn(day).filter(function (t) { return t.status !== 'completed'; }).length;
      ahead.push({ day: day, load: load, due: dueCount });
    }
    container.appendChild(loadChart(ahead));

    var busiest = ahead.slice().sort(function (a, b) { return b.load.utilization - a.load.utilization; })[0];
    if (busiest && busiest.load.utilization > 70) {
      container.appendChild(D.h('p.insight__sentence', {
        text: T.fmtDateLong(busiest.day) + ' is your fullest day ahead — about ' +
          T.humanDuration(busiest.load.busyMinutes) + ' committed, leaving ' +
          T.humanDuration(busiest.load.freeMinutes) + ' inside your working hours.'
      }));
    }

    /* --- consistency --- */
    container.appendChild(D.h('h2.section-title', { text: 'Rhythm' }));
    container.appendChild(consistencyBlock(start, end, events));

    /* --- projects --- */
    var projects = S.all('projects').filter(function (p) { return p.status !== 'archived'; });
    if (projects.length) {
      container.appendChild(D.h('h2.section-title', { text: 'Time by project' }));
      var byProject = projects.map(function (p) {
        var mins = events.filter(function (e) { return e.projectId === p.id; })
          .reduce(function (a, e) { return a + T.diffMinutes(e.startWall, e.endWall); }, 0);
        return { label: p.name, value: mins, display: mins ? T.humanDuration(mins) : 'none' };
      }).sort(function (a, b) { return b.value - a.value; });
      container.appendChild(Views.planning.barChart(byProject));
    }
  }

  /* Utilisation per day, with the free portion shown as well as the busy one. */
  function loadChart(rows) {
    var wrap = D.h('div.loadchart', { role: 'list' });
    rows.forEach(function (r) {
      var pct = r.load.utilization;
      wrap.appendChild(D.h('div.loadchart__col', {
        role: 'listitem',
        title: T.fmtDateLong(r.day) + ': ' + T.humanDuration(r.load.busyMinutes) + ' committed, ' +
          T.humanDuration(r.load.freeMinutes) + ' free' + (r.due ? ', ' + r.due + ' tasks due' : ''),
        onclick: function () { UI.go('calendar', { date: T.key(r.day), view: 'day' }); }
      }, [
        D.h('span.loadchart__bar-wrap', D.h('span.loadchart__bar' + (pct > 85 ? '.is-full' : ''), {
          style: { height: Math.max(3, pct) + '%' }
        })),
        r.due ? D.h('span.loadchart__due', { text: String(r.due) }) : D.h('span.loadchart__due.is-empty'),
        D.h('span.loadchart__label', { text: T.DAY_MIN[r.day.getDay()] }),
        D.h('span.loadchart__date', { text: String(r.day.getDate()) })
      ]));
    });
    return wrap;
  }

  function consistencyBlock(start, end, events) {
    var byDow = [0, 0, 0, 0, 0, 0, 0];
    var counts = [0, 0, 0, 0, 0, 0, 0];
    events.forEach(function (e) {
      var d = e.startWall.getDay();
      byDow[d] += T.diffMinutes(e.startWall, e.endWall);
    });
    var days = T.diffDays(start, end) + 1;
    for (var i = 0; i < days; i++) counts[T.addDays(start, i).getDay()]++;

    var rows = byDow.map(function (mins, i) {
      var avg = counts[i] ? Math.round(mins / counts[i]) : 0;
      return { label: T.DAY_NAMES[i], value: avg, display: avg ? T.humanDuration(avg) : 'nothing scheduled' };
    });
    var wrap = D.h('div');
    wrap.appendChild(D.h('p.insight__sentence', { text: 'Average scheduled time on each day of the week.' }));
    wrap.appendChild(Views.planning.barChart(rows));
    return wrap;
  }

  Views.insights = { render: render, rerender: rerender };
})(window);
