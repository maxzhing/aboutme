/* Cadence · JARVIS — schedule analysis: optimiser, briefings and insights.

   The optimiser looks over a window of the calendar and returns a list of
   concrete, individually-applicable improvements. Each one carries its own
   apply function and its own verification, so a person can take three of five
   suggestions and the other two simply never happen.

   Nothing in this file changes anything on its own. It returns findings; the
   console asks. That is deliberate: a schedule that rearranges itself while
   you are looking at it is not a schedule you trust. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};
  var DX = JV.DX;

  /* --------------------------------------------------------- optimiser */

  /* Each finding: {id, kind, severity, title, detail, apply(), verify()} */
  function analyse(opts) {
    opts = opts || {};
    var now = DX.nowWall();
    var start = opts.start || T.startOfDay(now);
    var days = opts.days || 7;
    var end = opts.end || T.endOfDay(T.addDays(start, days - 1));

    var findings = [];
    var events = Q.eventsInRange(start, end, { ignoreLayers: true });
    var timed = events.filter(function (e) { return !e.allDay; });

    findConflicts(timed, findings);
    findOverloadedDays(start, end, findings);
    findLongBlocks(timed, findings);
    findDeadlinesWithoutPrep(start, end, findings);
    findUnscheduledUrgentWork(now, findings);

    var order = { high: 0, medium: 1, low: 2 };
    findings.sort(function (a, b) { return order[a.severity] - order[b.severity]; });

    return {
      window: { start: start, end: end, days: days },
      findings: findings,
      stats: windowStats(start, end)
    };
  }

  /* Overlapping events. The fix moves the *lower priority* of the pair to the
     next slot that fits it. */
  function findConflicts(timed, findings) {
    var pairs = Q.findConflicts(timed);
    pairs.forEach(function (pair, i) {
      var a = pair[0], b = pair[1];
      var loser = rank(b) >= rank(a) ? b : a;   // higher rank number = less important
      var keeper = loser === b ? a : b;
      var minutes = T.diffMinutes(loser.startWall, loser.endWall);

      findings.push({
        id: 'conflict-' + i,
        kind: 'conflict',
        severity: 'high',
        title: 'Resolve the clash between “' + a.title + '” and “' + b.title + '”',
        detail: DX.fmtDay(a.startWall) + ' at ' + DX.fmtClock(a.startWall) +
          ' — move “' + loser.title + '” and keep “' + keeper.title + '” where it is',
        refs: [DX.ref('event', a), DX.ref('event', b)],
        preview: function () {
          var slot = nextSlotFor(minutes, loser.startWall);
          return slot
            ? 'Move “' + loser.title + '” to ' + DX.fmtDay(slot.start) + ' ' + DX.fmtClock(slot.start)
            : 'No free slot found for “' + loser.title + '”';
        },
        apply: function () {
          var slot = nextSlotFor(minutes, loser.startWall);
          if (!slot) throw new JV.ToolError('No free slot to move “' + loser.title + '” into.');
          A.moveEvent(loser, slot.start, T.addMinutes(slot.start, minutes));
          return { id: baseId(loser), start: slot.start };
        },
        verify: function (out) { return DX.verifyMoved(out.id, out.start); }
      });
    });
  }

  function rank(inst) {
    var order = { critical: 0, high: 1, medium: 2, low: 3 };
    var p = order[inst.priority] === undefined ? 2 : order[inst.priority];
    // A block JARVIS created is more movable than a real commitment.
    if (inst.type === 'block') p += 1;
    return p;
  }

  function baseId(inst) { return inst.seriesId || inst.id; }

  function nextSlotFor(minutes, after) {
    var slots = SCHED.findTime(minutes, { days: 10, limit: 3, now: T.addMinutes(after, 30) });
    return slots.length ? slots[0] : null;
  }

  /* A day carrying far more than the others in the window. */
  function findOverloadedDays(start, end, findings) {
    var days = [];
    var cursor = T.startOfDay(start);
    while (cursor <= end) {
      days.push({ day: new Date(cursor), load: SCHED.dayLoad(cursor) });
      cursor = T.addDays(cursor, 1);
    }
    if (days.length < 3) return;

    var busy = days.map(function (d) { return d.load.busyMinutes || 0; });
    var mean = busy.reduce(function (a, b) { return a + b; }, 0) / busy.length;
    var worst = days.slice().sort(function (a, b) {
      return (b.load.busyMinutes || 0) - (a.load.busyMinutes || 0);
    })[0];

    if (!worst || (worst.load.busyMinutes || 0) < mean * 1.6 || (worst.load.busyMinutes || 0) < 5 * 60) return;

    // Only movable blocks are candidates — never someone else's meeting.
    var movable = Q.eventsOnDay(worst.day, { ignoreLayers: true })
      .filter(function (e) { return !e.allDay && e.type === 'block'; })
      .sort(function (a, b) { return rank(b) - rank(a); });
    if (!movable.length) return;

    var target = movable[0];
    var minutes = T.diffMinutes(target.startWall, target.endWall);

    findings.push({
      id: 'overload-' + T.key(worst.day),
      kind: 'overload',
      severity: 'medium',
      title: DX.fmtDay(worst.day) + ' carries ' + DX.hours(worst.load.busyMinutes) + ' of commitments',
      detail: 'That is well above the ' + DX.hours(mean) + ' average for this window. ' +
        'Moving “' + target.title + '” would even it out.',
      refs: [DX.ref('event', target)],
      preview: function () {
        var slot = lighterDaySlot(minutes, days, worst.day);
        return slot ? 'Move “' + target.title + '” to ' + DX.fmtDay(slot.start) + ' ' + DX.fmtClock(slot.start)
          : 'No lighter day has room for “' + target.title + '”';
      },
      apply: function () {
        var slot = lighterDaySlot(minutes, days, worst.day);
        if (!slot) throw new JV.ToolError('No lighter day has room for “' + target.title + '”.');
        A.moveEvent(target, slot.start, T.addMinutes(slot.start, minutes));
        return { id: baseId(target), start: slot.start };
      },
      verify: function (out) { return DX.verifyMoved(out.id, out.start); }
    });
  }

  function lighterDaySlot(minutes, days, avoidDay) {
    var sorted = days.slice().sort(function (a, b) {
      return (a.load.busyMinutes || 0) - (b.load.busyMinutes || 0);
    });
    for (var i = 0; i < sorted.length; i++) {
      var d = sorted[i];
      if (T.sameDay(d.day, avoidDay)) continue;
      if (d.day < T.startOfDay(DX.nowWall())) continue;
      var slots = SCHED.freeSlots(d.day, { minMinutes: minutes });
      if (slots.length) return { start: T.snap(slots[0].start, 15) };
    }
    return null;
  }

  /* A single unbroken working block long enough to be worth splitting. */
  function findLongBlocks(timed, findings) {
    timed.filter(function (e) {
      return e.type === 'block' && T.diffMinutes(e.startWall, e.endWall) >= 150;
    }).forEach(function (e, i) {
      var minutes = T.diffMinutes(e.startWall, e.endWall);
      var half = Math.round(minutes / 2 / 5) * 5;

      findings.push({
        id: 'long-' + i + '-' + baseId(e),
        kind: 'long-block',
        severity: 'low',
        title: 'Split the ' + DX.hours(minutes) + ' block “' + e.title + '”',
        detail: DX.fmtDay(e.startWall) + ' ' + DX.fmtSpan(e.startWall, e.endWall) +
          ' — two sittings of ' + DX.hours(half) + ' usually work better than one long one.',
        refs: [DX.ref('event', e)],
        preview: function () {
          return 'Shorten to ' + DX.hours(half) + ' and add a second ' + DX.hours(half) + ' session';
        },
        apply: function () {
          // Shorten the original, then place the remainder somewhere sensible.
          var newEnd = T.addMinutes(e.startWall, half);
          A.updateEvent(e, { end: T.iso(newEnd) }, 'this', { message: 'Shortened by JARVIS' });
          var rest = JV.SCHEDULER.distribute({
            totalMinutes: minutes - half,
            sessionMinutes: minutes - half,
            title: e.title,
            days: 7
          });
          if (!rest.sessions.length) throw new JV.ToolError('No room for the second session.');
          var ids = JV.SCHEDULER.commitSessions(rest.sessions, {
            projectId: e.projectId || null, categoryId: e.categoryId || null
          });
          return { ids: ids, shortenedId: baseId(e) };
        },
        verify: function (out) { return DX.verifyEvents(out.ids, 'Second session confirmed on the calendar'); }
      });
    });
  }

  /* A deadline with no work scheduled in the days before it. */
  function findDeadlinesWithoutPrep(start, end, findings) {
    var now = DX.nowWall();
    Q.upcomingDeadlines(8, now).forEach(function (d, i) {
      var due = T.w(d.due);
      if (due < start || due > T.addDays(end, 7)) return;

      var windowStart = T.startOfDay(T.addDays(due, -5));
      var prep = Q.eventsInRange(windowStart, T.endOfDay(due), { ignoreLayers: true })
        .filter(function (e) {
          return e.type === 'block' &&
            (e.projectId && e.projectId === d.projectId ||
              DX.matchScore(e.title, d.title) >= 0);
        });
      if (prep.length) return;

      var daysLeft = T.diffDays(now, due);
      findings.push({
        id: 'noprep-' + d.id,
        kind: 'no-prep',
        severity: daysLeft <= 3 ? 'high' : 'medium',
        title: 'Nothing scheduled for “' + d.title + '”',
        detail: 'Due ' + DX.fmtDay(due) + (daysLeft >= 0 ? ' — ' + daysLeft + ' day' + (daysLeft === 1 ? '' : 's') + ' away' : '') +
          ', with no preparation time on the calendar.',
        refs: [DX.ref('deadline', d)],
        preview: function () {
          var p = JV.PROJECTS.plan({ title: d.title, deadline: due });
          return p.ok && p.sessions.length
            ? 'Add ' + p.sessions.length + ' session' + (p.sessions.length === 1 ? '' : 's') +
              ' totalling ' + DX.hours(p.placedMinutes)
            : 'No free time before the deadline';
        },
        apply: function () {
          var p = JV.PROJECTS.plan({ title: d.title, deadline: due });
          if (!p.ok || !p.sessions.length) throw new JV.ToolError('No free time before ' + DX.fmtDay(due) + '.');
          var ids = JV.SCHEDULER.commitSessions(p.sessions, {
            projectId: d.projectId || null,
            description: 'Preparation for ' + d.title
          });
          return { ids: ids };
        },
        verify: function (out) { return DX.verifyEvents(out.ids); }
      });
    });
  }

  /* High-priority work that is due soon and has no calendar time. */
  function findUnscheduledUrgentWork(now, findings) {
    var ranked = SCHED.rankedTasks(now, { excludeScheduled: true, horizonDays: 10 });
    ranked.slice(0, 3).forEach(function (r) {
      var t = r.task;
      if (t.priority !== 'critical' && t.priority !== 'high') return;
      var minutes = Q.taskEstimate(t);

      findings.push({
        id: 'unscheduled-' + t.id,
        kind: 'unscheduled',
        severity: t.priority === 'critical' ? 'high' : 'medium',
        title: 'Find time for “' + t.title + '”',
        detail: (t.due ? 'Due ' + DX.fmtDay(T.w(t.due)) + '. ' : '') +
          t.priority + ' priority, ' + DX.hours(minutes) + ' estimated, not on the calendar.',
        refs: [DX.ref('task', t)],
        preview: function () {
          var slots = SCHED.findTime(minutes, { days: 10, limit: 1 });
          return slots.length
            ? 'Schedule for ' + DX.fmtDay(slots[0].start) + ' ' + DX.fmtClock(slots[0].start)
            : 'No open slot in the next 10 days';
        },
        apply: function () {
          var slots = SCHED.findTime(minutes, { days: 10, limit: 1 });
          if (!slots.length) throw new JV.ToolError('No open slot for “' + t.title + '”.');
          A.scheduleTask(t.id, slots[0].start, minutes);
          return { taskId: t.id };
        },
        verify: function (out) {
          var t2 = S.get('tasks', out.taskId);
          return t2 && t2.scheduledEventId && S.get('events', t2.scheduledEventId)
            ? { ok: true, detail: 'Confirmed on the calendar' }
            : { ok: false, detail: 'The task was not scheduled' };
        }
      });
    });
  }

  function windowStats(start, end) {
    var events = Q.eventsInRange(start, end, { ignoreLayers: true });
    var timed = events.filter(function (e) { return !e.allDay; });
    var busy = timed.reduce(function (a, e) { return a + T.diffMinutes(e.startWall, e.endWall); }, 0);

    var free = 0;
    var cursor = T.startOfDay(start);
    var busiest = null;
    while (cursor <= end) {
      free += SCHED.freeMinutes(cursor, {});
      var load = SCHED.dayLoad(cursor);
      if (!busiest || (load.busyMinutes || 0) > (busiest.load.busyMinutes || 0)) {
        busiest = { day: new Date(cursor), load: load };
      }
      cursor = T.addDays(cursor, 1);
    }

    return {
      events: events.length,
      busyMinutes: busy,
      freeMinutes: free,
      busiest: busiest,
      deadlines: Q.upcomingDeadlines(20, DX.nowWall()).filter(function (d) {
        var due = T.w(d.due);
        return due >= start && due <= T.addDays(end, 7);
      }).length
    };
  }

  /* --------------------------------------------------------- briefings */

  function morningBrief() {
    var now = DX.nowWall();
    var day = T.startOfDay(now);
    var events = Q.eventsOnDay(day, { ignoreLayers: true });
    var timed = events.filter(function (e) { return !e.allDay; })
      .sort(function (a, b) { return a.startWall - b.startWall; });
    var due = Q.tasksDueOn(day).filter(function (t) { return t.status !== 'completed'; });
    var overdue = Q.overdueTasks(now);
    var deadlines = Q.upcomingDeadlines(4, now).filter(function (d) {
      return T.diffDays(now, T.w(d.due)) <= 7;
    });
    var free = SCHED.freeMinutes(day, {});
    var whatNow = SCHED.whatNow(now);

    var lines = [];
    timed.forEach(function (e) { lines.push(DX.fmtClock(e.startWall) + ' — ' + e.title); });
    if (!timed.length) lines.push('Nothing scheduled today.');

    var important = [];
    deadlines.forEach(function (d) {
      var days = T.diffDays(now, T.w(d.due));
      important.push(d.title + ' is due ' + (days <= 0 ? 'today' : 'in ' + days + ' day' + (days === 1 ? '' : 's')));
    });
    if (overdue.length) important.push(overdue.length + ' task' + (overdue.length === 1 ? '' : 's') + ' overdue');
    due.forEach(function (t) { important.push(t.title + ' is due today'); });

    var recommendation = null;
    var suggested = (whatNow.recommendation && whatNow.recommendation.task) ||
      (whatNow.partial && whatNow.partial.task) || null;
    if (suggested && free >= 30) {
      recommendation = 'You have ' + DX.hours(free) + ' free — a good window for “' + suggested.title + '”.';
    }

    return {
      kind: 'brief',
      day: day,
      events: timed,
      tasksDue: due,
      important: important,
      freeMinutes: free,
      recommendation: recommendation,
      refs: timed.slice(0, 6).map(function (e) { return DX.ref('event', e); }),
      headline: 'Today: ' + timed.length + ' event' + (timed.length === 1 ? '' : 's') +
        ', ' + DX.hours(free) + ' free' + (important.length ? ', ' + important.length + ' thing' + (important.length === 1 ? '' : 's') + ' needing attention' : ''),
      lines: lines
        .concat(important.length ? ['—'].concat(important) : [])
        .concat(recommendation ? ['—', recommendation] : [])
    };
  }

  function dayReview(dayWall) {
    var now = DX.nowWall();
    var day = T.startOfDay(dayWall || now);
    var tasks = S.all('tasks');

    var completed = tasks.filter(function (t) {
      return t.completedAt && T.sameDay(T.w(t.completedAt), day);
    });
    var missed = tasks.filter(function (t) {
      return t.status !== 'completed' && t.status !== 'archived' && t.due &&
        T.sameDay(T.w(t.due), day);
    });
    var events = Q.eventsOnDay(day, { ignoreLayers: true }).filter(function (e) { return !e.allDay; });
    var booked = events.reduce(function (a, e) { return a + T.diffMinutes(e.startWall, e.endWall); }, 0);

    var tomorrow = T.addDays(day, 1);
    var tomorrowEvents = Q.eventsOnDay(tomorrow, { ignoreLayers: true })
      .filter(function (e) { return !e.allDay; });
    var tomorrowRanked = SCHED.rankedTasks(tomorrow, { horizonDays: 7 }).slice(0, 3);

    var lines = [
      completed.length + ' task' + (completed.length === 1 ? '' : 's') + ' completed',
      missed.length + ' still open from today',
      DX.hours(booked) + ' in scheduled events'
    ];
    completed.slice(0, 5).forEach(function (t) { lines.push('Done: ' + t.title); });
    missed.slice(0, 5).forEach(function (t) { lines.push('Open: ' + t.title); });
    if (tomorrowRanked.length) {
      lines.push('—');
      lines.push('Tomorrow’s priorities:');
      tomorrowRanked.forEach(function (r) { lines.push(r.task.title); });
    }

    return {
      kind: 'review',
      day: day,
      completed: completed,
      missed: missed,
      bookedMinutes: booked,
      tomorrow: { events: tomorrowEvents, priorities: tomorrowRanked },
      refs: missed.slice(0, 5).map(function (t) { return DX.ref('task', t); }),
      headline: completed.length
        ? completed.length + ' done, ' + missed.length + ' still open'
        : (missed.length ? missed.length + ' task' + (missed.length === 1 ? '' : 's') + ' still open today' : 'Nothing was due today'),
      lines: lines
    };
  }

  /* ---------------------------------------------------------- insights */

  /* Observations worth surfacing. Never mutating — these are notices, and the
     app's own suggestion engine supplies some of them. */
  function insights() {
    var now = DX.nowWall();
    var out = [];

    var deadlines = Q.upcomingDeadlines(10, now).filter(function (d) {
      return T.diffDays(now, T.w(d.due)) <= 5;
    });
    if (deadlines.length >= 3) {
      out.push({
        icon: 'alert', tone: 'warn',
        text: 'You have ' + deadlines.length + ' deadlines within five days.',
        ask: 'optimize my schedule'
      });
    }

    var overdue = Q.overdueTasks(now);
    if (overdue.length) {
      out.push({
        icon: 'flag', tone: 'warn',
        text: overdue.length + ' task' + (overdue.length === 1 ? ' is' : 's are') + ' past due.',
        ask: 'what is overdue'
      });
    }

    var tomorrow = T.addDays(T.startOfDay(now), 1);
    var free = SCHED.freeMinutes(tomorrow, {});
    if (free >= 120) {
      out.push({
        icon: 'sparkle', tone: 'info',
        text: 'You have ' + DX.hours(free) + ' free tomorrow.',
        ask: 'plan tomorrow'
      });
    }

    var week = analyse({ days: 7 });
    var conflicts = week.findings.filter(function (f) { return f.kind === 'conflict'; });
    if (conflicts.length) {
      out.push({
        icon: 'alert', tone: 'warn',
        text: conflicts.length + ' scheduling conflict' + (conflicts.length === 1 ? '' : 's') + ' this week.',
        ask: 'optimize my schedule'
      });
    }

    return out.slice(0, 4);
  }

  JV.OPTIMIZE = {
    analyse: analyse,
    morningBrief: morningBrief,
    dayReview: dayReview,
    insights: insights,
    windowStats: windowStats
  };
})(window);
