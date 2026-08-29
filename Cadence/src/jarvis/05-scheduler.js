/* Cadence · JARVIS — the session-distribution engine.

   Cadence's SCHED module already answers "where does this fit?" very well.
   What it does not do is decide *how work should be shaped* before it is
   placed: asked for two hours of study, the naive answer is one two-hour
   block, and the useful answer is an hour on Tuesday and an hour on Thursday.

   This file is that decision. It sizes sessions, spreads them across days,
   respects a deadline, keeps a day from being overloaded, prefers the times of
   day the user actually works, and front-loads when the deadline is tight.
   Placement is still delegated to SCHED.freeSlots, so the assistant and the
   app never disagree about what "free" means. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};
  var DX = JV.DX;

  /* How long a single sitting should be, given the total work to place. Short
     jobs stay in one piece; long ones break up. */
  function sessionLength(totalMinutes, opts) {
    opts = opts || {};
    if (opts.sessionMinutes) return opts.sessionMinutes;
    if (totalMinutes <= 90) return totalMinutes;
    if (totalMinutes <= 180) return 60;
    if (totalMinutes <= 360) return 75;
    return 90;
  }

  /* Spacing beats cramming, but a near deadline beats spacing. */
  function planShape(totalMinutes, daysAvailable, opts) {
    var length = sessionLength(totalMinutes, opts);
    var count = Math.max(1, Math.ceil(totalMinutes / length));

    // Never ask for more sittings than there are days, unless the user
    // explicitly wants more than one per day.
    var perDay = opts.maxPerDay || (daysAvailable <= 2 ? 2 : 1);
    var capacity = Math.max(1, daysAvailable * perDay);
    if (count > capacity) {
      count = capacity;
      length = Math.ceil(totalMinutes / count / 5) * 5;
    }
    return { count: count, length: length, perDay: perDay };
  }

  /* Score a candidate start for a work session. Higher is better.
     Deliberately explainable — every adjustment appends a human reason, which
     is what lets the console say *why* it chose a slot. */
  function scoreStart(start, ctx) {
    var st = S.settings();
    var reasons = [];
    var score = 100;

    var dayIndex = Math.max(0, T.diffDays(ctx.now, start));
    var minutesOfDay = T.minutesOfDay(start);

    // Earlier is better when a deadline is pushing.
    if (ctx.deadline) {
      var totalWindow = Math.max(1, T.diffDays(ctx.now, ctx.deadline));
      var urgency = 1 - (dayIndex / totalWindow);
      score += urgency * 18;
      if (urgency > 0.6) reasons.push('well before the deadline');
    } else {
      score -= dayIndex * 2;
    }

    // Respect the user's own working window from Settings.
    var dayStart = (st.dayStartHour || 8) * 60;
    var dayEnd = (st.dayEndHour || 18) * 60;
    if (minutesOfDay < dayStart || minutesOfDay >= dayEnd) {
      score -= 26;
      reasons.push('outside your usual hours');
    }

    // Learned or stated preference for a time of day.
    if (ctx.preferred === 'morning' && minutesOfDay < 12 * 60) {
      score += 14; reasons.push('morning, as you prefer');
    } else if (ctx.preferred === 'evening' && minutesOfDay >= 17 * 60) {
      score += 14; reasons.push('evening, as you prefer');
    } else if (ctx.preferred === 'afternoon' && minutesOfDay >= 12 * 60 && minutesOfDay < 17 * 60) {
      score += 14; reasons.push('afternoon, as you prefer');
    }

    // Spread out: penalise a day that already carries part of this plan.
    var key = T.key(start);
    var already = ctx.perDay[key] || 0;
    if (already) {
      score -= already * 30;
      if (already >= ctx.perDayCap) score -= 1000;   // effectively excluded
    } else {
      reasons.push('a day with nothing else from this plan');
    }

    // Avoid piling onto an already heavy day.
    var load = ctx.loads[key];
    if (load && load.busyMinutes > 6 * 60) {
      score -= 16; reasons.push('a busy day already');
    }

    // A little daylight between sessions helps more than back-to-back.
    if (ctx.lastStart) {
      var gapDays = Math.abs(T.diffDays(ctx.lastStart, start));
      if (gapDays >= 1 && gapDays <= 3) { score += 8; reasons.push('nicely spaced'); }
    }

    return { score: score, reasons: reasons };
  }

  /* Build a distribution of work sessions between now and a deadline.

     Returns { sessions, requestedMinutes, placedMinutes, shortfall, notes }.
     Sessions are proposals only — nothing is written here. */
  function distribute(opts) {
    opts = opts || {};
    var now = opts.now || DX.nowWall();
    var total = Math.max(15, opts.totalMinutes || 60);
    var deadline = opts.deadline || null;
    var title = opts.title || 'Focus block';

    // How many days can we actually use?
    var horizon = deadline
      ? Math.max(1, T.diffDays(T.startOfDay(now), T.startOfDay(deadline)) + 1)
      : (opts.days || 10);
    horizon = Math.min(horizon, opts.maxDays || 28);

    var shape = planShape(total, horizon, opts);
    var ctx = {
      now: now,
      deadline: deadline,
      preferred: opts.preferred || preferredTimeOfDay(),
      perDay: {},
      perDayCap: shape.perDay,
      loads: {},
      lastStart: null
    };

    // Pre-compute each day's load once rather than per candidate.
    for (var d = 0; d < horizon; d++) {
      var day = T.startOfDay(T.addDays(now, d));
      ctx.loads[T.key(day)] = SCHED.dayLoad(day);
    }

    var sessions = [];
    var taken = [];    // slots this plan has already claimed, so we don't double-book ourselves

    for (var i = 0; i < shape.count; i++) {
      var pick = bestSlot(shape.length, horizon, ctx, taken, opts);
      if (!pick) break;
      var reasons = pick.reasons;
      sessions.push({
        title: sessionTitle(title, i, shape.count, opts),
        start: pick.start,
        end: T.addMinutes(pick.start, shape.length),
        minutes: shape.length,
        reasons: reasons,
        phase: opts.phaseFor ? opts.phaseFor(i) : null
      });
      taken.push({ start: pick.start, end: T.addMinutes(pick.start, shape.length) });
      var key = T.key(pick.start);
      ctx.perDay[key] = (ctx.perDay[key] || 0) + 1;
      ctx.lastStart = pick.start;
    }

    sessions.sort(function (a, b) { return a.start - b.start; });

    var placed = sessions.reduce(function (a, s) { return a + s.minutes; }, 0);
    var notes = [];
    if (placed < total) {
      notes.push('Only ' + DX.hours(placed) + ' of the ' + DX.hours(total) +
        ' you asked for fits before ' + (deadline ? DX.fmtDay(deadline) : 'the end of the window') + '.');
    }
    if (shape.count > 1) {
      notes.push('Split into ' + shape.count + ' sessions of ' + DX.hours(shape.length) +
        ' rather than one long block.');
    }

    return {
      sessions: sessions,
      requestedMinutes: total,
      placedMinutes: placed,
      shortfall: Math.max(0, total - placed),
      shape: shape,
      notes: notes
    };
  }

  function sessionTitle(base, index, count, opts) {
    if (opts && opts.titleFor) return opts.titleFor(index);
    if (count <= 1) return base;
    return base + ' (' + (index + 1) + '/' + count + ')';
  }

  /* Walk the free slots Cadence reports and pick the best legal start. */
  function bestSlot(minutes, horizon, ctx, taken, opts) {
    var best = null;

    for (var d = 0; d < horizon; d++) {
      var day = T.startOfDay(T.addDays(ctx.now, d));
      if (ctx.deadline && day > T.endOfDay(ctx.deadline)) break;

      var slots = SCHED.freeSlots(day, {
        after: d === 0 ? T.snap(T.addMinutes(ctx.now, 15), 15) : null,
        minMinutes: minutes,
        anyTime: !!(opts && opts.anyTime)
      });

      slots.forEach(function (slot) {
        var cursor = T.snap(slot.start, 15);
        if (cursor < slot.start) cursor = T.addMinutes(cursor, 15);
        var guard = 0;
        while (T.addMinutes(cursor, minutes) <= slot.end && guard++ < 24) {
          var start = new Date(cursor);
          var end = T.addMinutes(start, minutes);
          if (!(ctx.deadline && end > ctx.deadline) && !clashes(start, end, taken)) {
            var scored = scoreStart(start, ctx);
            if (scored.score > -500 && (!best || scored.score > best.score)) {
              best = { start: start, score: scored.score, reasons: scored.reasons };
            }
          }
          cursor = T.addMinutes(cursor, 30);
        }
      });
    }
    return best;
  }

  function clashes(start, end, taken) {
    for (var i = 0; i < taken.length; i++) {
      if (T.overlaps(start, end, taken[i].start, taken[i].end)) return true;
    }
    return false;
  }

  /* Learn a time-of-day preference from what the user has actually scheduled.
     Only reports one when the evidence is clear — never invents a preference. */
  function preferredTimeOfDay() {
    var buckets = { morning: 0, afternoon: 0, evening: 0 };
    var now = DX.nowWall();
    var events = Q.eventsInRange(T.addDays(now, -28), now, { ignoreLayers: true })
      .filter(function (e) { return !e.allDay && e.type === 'block'; });
    if (events.length < 5) return null;

    events.forEach(function (e) {
      var m = T.minutesOfDay(e.startWall);
      if (m < 12 * 60) buckets.morning++;
      else if (m < 17 * 60) buckets.afternoon++;
      else buckets.evening++;
    });
    var top = Object.keys(buckets).sort(function (a, b) { return buckets[b] - buckets[a]; })[0];
    var total = events.length;
    // Needs a real majority, not just a plurality of a handful.
    return buckets[top] / total >= 0.5 ? top : null;
  }

  /* Write a distribution to the calendar. Returns the created event ids so the
     caller can verify them. */
  function commitSessions(sessions, meta) {
    meta = meta || {};
    var ids = [];
    S.commit('JARVIS scheduled ' + sessions.length + ' session' + (sessions.length === 1 ? '' : 's'), function (st) {
      sessions.forEach(function (s) {
        var ev = M.makeEvent({
          title: s.title,
          start: T.iso(s.start),
          end: T.iso(s.end),
          calendarId: meta.calendarId || 'cal_personal',
          categoryId: meta.categoryId || null,
          projectId: meta.projectId || null,
          goalId: meta.goalId || null,
          taskId: meta.taskId || null,
          priority: meta.priority || 'medium',
          type: 'block',
          description: s.phase
            ? s.phase + (meta.description ? ' — ' + meta.description : '')
            : (meta.description || '')
        });
        st.events.push(ev);
        ids.push(ev.id);
      });
    }, ['events']);
    return ids;
  }

  JV.SCHEDULER = {
    distribute: distribute,
    commitSessions: commitSessions,
    sessionLength: sessionLength,
    planShape: planShape,
    preferredTimeOfDay: preferredTimeOfDay
  };
})(window);
