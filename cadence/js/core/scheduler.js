/* Cadence — the scheduling brain.

   Everything here proposes; nothing here commits. Each suggestion carries the
   reasoning that produced it, because a recommendation you can't interrogate is
   just a guess wearing a suit. The planner also refuses to fill a day: it stops
   once free time would fall below the user's floor. */
(function (global) {
  'use strict';

  function settings() { return S.settings(); }

  /* ---------------- busy / free ---------------- */

  /* Occupied wall-time intervals for a day, travel time included when enabled. */
  function busyIntervals(dayWall, opts) {
    opts = opts || {};
    var st = settings();
    var dayStart = T.startOfDay(dayWall), dayEnd = T.endOfDay(dayWall);
    var events = Q.eventsInRange(dayStart, dayEnd, { ignoreLayers: true });
    var out = [];
    events.forEach(function (e) {
      if (e.allDay) return;
      if (opts.excludeEventIds && opts.excludeEventIds.indexOf(e.id) >= 0) return;
      if (opts.excludeDone && e.done) return;
      var s = new Date(Math.max(e.startWall, dayStart));
      var en = new Date(Math.min(e.endWall, dayEnd));
      if (st.travelTimeEnabled && e.travelMinutes) {
        s = T.addMinutes(s, -e.travelMinutes);
        en = T.addMinutes(en, e.travelMinutes);
      }
      if (en > s) out.push({ start: s, end: en, event: e });
    });
    return merge(out);
  }

  function merge(intervals) {
    var sorted = intervals.slice().sort(function (a, b) { return a.start - b.start; });
    var out = [];
    sorted.forEach(function (iv) {
      var last = out[out.length - 1];
      if (last && iv.start <= last.end) {
        if (iv.end > last.end) last.end = iv.end;
      } else {
        out.push({ start: new Date(iv.start), end: new Date(iv.end) });
      }
    });
    return out;
  }

  /* The window we are willing to schedule inside on a given day. */
  function dayWindow(dayWall, opts) {
    opts = opts || {};
    var st = settings();
    var isWorkDay = (st.workingDays || [1, 2, 3, 4, 5]).indexOf(dayWall.getDay()) >= 0;
    var startMin, endMin;
    if (opts.anyTime || !isWorkDay) {
      // Off days still get a sensible waking window rather than the full 24h.
      startMin = opts.anyTime ? st.dayStartHour * 60 : Math.max(st.dayStartHour * 60, 9 * 60);
      endMin = opts.anyTime ? st.dayEndHour * 60 : Math.min(st.dayEndHour * 60, 21 * 60);
    } else {
      startMin = st.workingHours.start;
      endMin = st.workingHours.end;
    }
    var start = T.atMinutes(dayWall, startMin);
    var end = T.atMinutes(dayWall, Math.min(endMin, 24 * 60 - 1));
    return { start: start, end: end, isWorkDay: isWorkDay };
  }

  /* Free gaps on a day, honouring buffer time around existing commitments. */
  function freeSlots(dayWall, opts) {
    opts = opts || {};
    var st = settings();
    var win = dayWindow(dayWall, opts);
    var lower = opts.after && opts.after > win.start ? new Date(opts.after) : win.start;
    if (lower >= win.end) return [];

    var buffer = opts.buffer === undefined ? (st.bufferMinutes || 0) : opts.buffer;
    var busy = busyIntervals(dayWall, opts).map(function (b) {
      return { start: T.addMinutes(b.start, -buffer), end: T.addMinutes(b.end, buffer) };
    });
    busy = merge(busy);

    var slots = [];
    var cursor = new Date(lower);
    busy.forEach(function (b) {
      if (b.start > cursor) {
        var end = new Date(Math.min(b.start, win.end));
        if (end > cursor) slots.push({ start: new Date(cursor), end: end });
      }
      if (b.end > cursor) cursor = new Date(b.end);
    });
    if (cursor < win.end) slots.push({ start: new Date(cursor), end: new Date(win.end) });

    var minLen = opts.minMinutes || 15;
    return slots.map(function (s) {
      s.minutes = T.diffMinutes(s.start, s.end);
      return s;
    }).filter(function (s) { return s.minutes >= minLen; });
  }

  function freeMinutes(dayWall, opts) {
    return freeSlots(dayWall, opts).reduce(function (a, s) { return a + s.minutes; }, 0);
  }

  function dayLoad(dayWall) {
    var win = dayWindow(dayWall, {});
    var total = T.diffMinutes(win.start, win.end);
    var busy = busyIntervals(dayWall, {}).reduce(function (a, b) {
      var s = new Date(Math.max(b.start, win.start));
      var e = new Date(Math.min(b.end, win.end));
      return a + Math.max(0, T.diffMinutes(s, e));
    }, 0);
    return {
      totalMinutes: total,
      busyMinutes: Math.min(busy, total),
      freeMinutes: Math.max(0, total - busy),
      utilization: total ? Math.min(100, Math.round(busy / total * 100)) : 0
    };
  }

  /* ---------------- task ranking ---------------- */

  /* Urgency from the deadline, priority from the user, blocked tasks excluded.
     Returned with `reasons` so any recommendation can explain itself. */
  function scoreTask(task, nowWall) {
    nowWall = nowWall || T.nowWall();
    var reasons = [];
    var score = 0;

    var prank = M.PRIORITY_RANK[task.priority] === undefined ? 2 : M.PRIORITY_RANK[task.priority];
    var pScore = (3 - prank) * 12;
    score += pScore;
    if (task.priority === 'critical') reasons.push('critical priority');
    else if (task.priority === 'high') reasons.push('high priority');

    var due = task.due ? T.w(task.due) : null;
    if (due) {
      var days = T.diffDays(nowWall, due);
      if (days < 0) { score += 70; reasons.push('overdue'); }
      else if (days === 0) { score += 55; reasons.push('due today'); }
      else if (days === 1) { score += 42; reasons.push('due tomorrow'); }
      else if (days <= 3) { score += 30; reasons.push('due in ' + days + ' days'); }
      else if (days <= 7) { score += 16; reasons.push('due this week'); }
      else { score += 6; }
    }

    if (task.deadlineId) {
      var dl = S.get('deadlines', task.deadlineId);
      if (dl && !dl.done) {
        var dd = T.diffDays(nowWall, T.w(dl.due));
        if (dd <= 3) { score += 18; reasons.push('feeds a deadline ' + (dd <= 0 ? 'today' : 'in ' + dd + ' days')); }
      }
    }

    if (task.status === 'in-progress') { score += 14; reasons.push('already started'); }
    if (task.status === 'waiting') score -= 25;

    // A task nobody has looked at in a while quietly rises.
    var ageDays = T.diffDays(T.w(task.createdAt), nowWall);
    if (ageDays > 7 && !due) { score += Math.min(10, ageDays / 3); reasons.push('been waiting ' + ageDays + ' days'); }

    if (Q.taskIsBlocked(task)) { score = -1; reasons.push('blocked by another task'); }

    return { score: score, reasons: reasons };
  }

  /* Eisenhower-style quadrant, used to explain rather than to enforce. */
  function quadrant(task, nowWall) {
    nowWall = nowWall || T.nowWall();
    var prank = M.PRIORITY_RANK[task.priority];
    var important = task.important != null ? task.important : (prank <= 1);
    var urgent = false;
    if (task.due) {
      var days = T.diffDays(nowWall, T.w(task.due));
      urgent = days <= 2;
    }
    if (task.priority === 'critical') urgent = true;
    var id = important ? (urgent ? 'do' : 'schedule') : (urgent ? 'delegate' : 'later');
    var labels = {
      do: { label: 'Important & urgent', hint: 'Do these first' },
      schedule: { label: 'Important, not urgent', hint: 'Give these real time' },
      delegate: { label: 'Urgent, less important', hint: 'Batch or shrink these' },
      later: { label: 'Neither', hint: 'Fine to leave for later' }
    };
    return Object.assign({ id: id, important: important, urgent: urgent }, labels[id]);
  }

  function rankedTasks(nowWall, opts) {
    opts = opts || {};
    nowWall = nowWall || T.nowWall();
    var horizon = opts.horizonDays === undefined ? 14 : opts.horizonDays;
    return Q.activeTasks()
      .filter(function (t) {
        if (opts.excludeScheduled && t.scheduledEventId) return false;
        if (Q.taskIsBlocked(t)) return false;
        if (t.due) {
          var days = T.diffDays(nowWall, T.w(t.due));
          if (days > horizon) return false;
        } else if (opts.dueOnly) return false;
        return true;
      })
      .map(function (t) {
        var s = scoreTask(t, nowWall);
        return { task: t, score: s.score, reasons: s.reasons };
      })
      .filter(function (r) { return r.score >= 0; })
      .sort(function (a, b) { return b.score - a.score; });
  }

  /* ---------------- find time ---------------- */

  /* Ranked candidate slots for a block of `minutes`, across the next `days`. */
  function findTime(minutes, opts) {
    opts = opts || {};
    var st = settings();
    var now = opts.now || T.nowWall();
    var days = opts.days || 10;
    var before = opts.before ? T.w(opts.before) : null;
    var results = [];

    for (var i = 0; i < days; i++) {
      var day = T.startOfDay(T.addDays(now, i));
      if (before && day > T.endOfDay(before)) break;
      var slots = freeSlots(day, {
        after: i === 0 ? T.snap(T.addMinutes(now, 10), 15) : null,
        minMinutes: minutes,
        anyTime: opts.anyTime
      });
      var load = dayLoad(day);
      slots.forEach(function (slot) {
        // Walk the slot in 30-minute starts so a long gap offers real choices.
        var starts = [];
        var cursor = T.snap(slot.start, 15);
        if (cursor < slot.start) cursor = T.addMinutes(cursor, 15);
        var guard = 0;
        while (T.addMinutes(cursor, minutes) <= slot.end && guard++ < 24) {
          starts.push(new Date(cursor));
          cursor = T.addMinutes(cursor, 30);
        }
        starts.forEach(function (start) {
          var end = T.addMinutes(start, minutes);
          if (before && end > before) return;
          results.push(scoreSlot(start, end, { dayIndex: i, load: load, slot: slot, now: now, before: before, minutes: minutes }));
        });
      });
    }

    results.sort(function (a, b) { return b.score - a.score; });
    return dedupe(results).slice(0, opts.limit || 6);
  }

  /* Keep at most two candidates per day so the list shows real alternatives. */
  function dedupe(results) {
    var perDay = {};
    var out = [];
    results.forEach(function (r) {
      var k = T.key(r.start);
      perDay[k] = (perDay[k] || 0) + 1;
      if (perDay[k] <= 2) out.push(r);
    });
    return out;
  }

  function scoreSlot(start, end, ctx) {
    var st = settings();
    var score = 100;
    var reasons = [];

    score -= ctx.dayIndex * 6;                       // sooner is generally better
    if (ctx.dayIndex === 0) reasons.push('today');
    else if (ctx.dayIndex === 1) reasons.push('tomorrow');

    var hour = start.getHours();
    var win = dayWindow(start, {});
    var inWorking = start >= win.start && end <= win.end;
    if (inWorking && win.isWorkDay) { score += 10; reasons.push('inside your usual hours'); }
    if (hour >= 9 && hour <= 11) { score += 8; reasons.push('morning focus window'); }
    else if (hour >= 13 && hour <= 17) { score += 5; }
    else if (hour >= 20) { score -= 12; reasons.push('late in the day'); }
    else if (hour < 8) { score -= 10; reasons.push('early morning'); }

    // A lightly booked day absorbs new work better than a packed one.
    if (ctx.load.utilization < 40) { score += 8; reasons.push('a light day'); }
    else if (ctx.load.utilization > 80) { score -= 14; reasons.push('already a busy day'); }

    // Prefer slots with elbow room on either side.
    var slack = T.diffMinutes(start, ctx.slot.end) - ctx.minutes;
    if (slack >= 30) score += 5;
    if (T.diffMinutes(ctx.slot.start, start) === 0 && slack < 15) {
      score -= 4; reasons.push('fills the gap exactly');
    }

    if (ctx.before) {
      var margin = T.diffDays(start, ctx.before);
      if (margin >= 1) { score += 6; reasons.push('leaves ' + margin + ' day' + (margin === 1 ? '' : 's') + ' before it is due'); }
      else if (margin === 0) { score -= 3; reasons.push('same day as the deadline'); }
    }

    return {
      start: start, end: end, minutes: ctx.minutes,
      score: Math.round(score),
      reasons: reasons,
      load: ctx.load
    };
  }

  /* ---------------- plan my day ---------------- */

  /* Builds a proposed schedule: fixed commitments plus suggested task blocks,
     with breaks between them, stopping before the day gets airless. */
  function planDay(dayWall, opts) {
    opts = opts || {};
    var st = settings();
    var now = opts.now || T.nowWall();
    var isToday = T.sameDay(dayWall, now);
    var after = isToday ? T.snap(T.addMinutes(now, 5), 15) : null;

    var fixed = Q.eventsOnDay(dayWall, { ignoreLayers: true })
      .filter(function (e) { return !e.allDay; })
      .map(function (e) {
        return { kind: 'fixed', title: e.title, start: e.startWall, end: e.endWall, event: e, minutes: T.diffMinutes(e.startWall, e.endWall) };
      });

    var slots = freeSlots(dayWall, { after: after, minMinutes: 20, anyTime: opts.anyTime });
    var totalFree = slots.reduce(function (a, s) { return a + s.minutes; }, 0);
    var floor = opts.reserveMinutes === undefined ? (st.minFreeMinutesPerDay || 90) : opts.reserveMinutes;
    var budget = Math.max(0, totalFree - floor);

    var candidates = rankedTasks(now, { excludeScheduled: true, horizonDays: 21 })
      .filter(function (r) {
        // Something due much later shouldn't crowd out today's work.
        if (!r.task.due) return r.score >= 20;
        return true;
      });

    var proposed = [];
    var used = 0;
    var breakLen = st.breakMinutes || 15;
    var maxBlock = st.maxFocusBlock || 90;
    var skipped = [];

    slots.forEach(function (slot) {
      var cursor = new Date(slot.start);
      var placedInSlot = 0;
      while (candidates.length && used < budget) {
        var remainingSlot = T.diffMinutes(cursor, slot.end);
        if (remainingSlot < 20) break;

        var pick = -1;
        for (var i = 0; i < candidates.length; i++) {
          var need = Math.min(Q.taskEstimate(candidates[i].task), maxBlock);
          if (need <= remainingSlot && used + need <= budget) { pick = i; break; }
        }
        if (pick < 0) break;

        var chosen = candidates.splice(pick, 1)[0];
        var estimate = Q.taskEstimate(chosen.task);
        var length = Math.min(estimate, maxBlock, remainingSlot);
        length = Math.max(20, Math.round(length / 5) * 5);
        if (length > remainingSlot) length = remainingSlot;

        var end = T.addMinutes(cursor, length);
        proposed.push({
          kind: 'task',
          title: chosen.task.title,
          task: chosen.task,
          start: new Date(cursor),
          end: end,
          minutes: length,
          partial: length < estimate,
          remainder: Math.max(0, estimate - length),
          reasons: chosen.reasons,
          selected: true
        });
        used += length;
        cursor = end;
        placedInSlot++;

        // A break after sustained focus, only when the slot can spare it.
        if (length >= 50 && T.diffMinutes(cursor, slot.end) > breakLen + 20 && used + breakLen <= budget) {
          proposed.push({
            kind: 'break',
            title: 'Break',
            start: new Date(cursor),
            end: T.addMinutes(cursor, breakLen),
            minutes: breakLen,
            selected: true
          });
          cursor = T.addMinutes(cursor, breakLen);
        } else {
          cursor = T.addMinutes(cursor, st.bufferMinutes ? Math.min(st.bufferMinutes, 10) : 0);
        }
      }
    });

    candidates.forEach(function (c) { skipped.push(c); });

    var items = fixed.concat(proposed).sort(function (a, b) { return a.start - b.start; });
    var remainingFree = totalFree - used;

    var warnings = [];
    if (!slots.length) {
      warnings.push({ level: 'info', text: 'No open time left in your day — nothing to schedule into.' });
    } else if (remainingFree < 60 && proposed.length) {
      warnings.push({
        level: 'warn',
        text: 'This plan leaves only ' + T.humanDuration(remainingFree) + ' unscheduled. Consider dropping a lower-priority block.'
      });
    }
    if (skipped.length) {
      warnings.push({
        level: 'info',
        text: skipped.length + ' task' + (skipped.length === 1 ? '' : 's') + " didn't fit today. They stay on your list."
      });
    }
    var overdue = Q.overdueTasks(now);
    if (overdue.length && !proposed.some(function (p) { return p.task && overdue.indexOf(p.task) >= 0; })) {
      warnings.push({ level: 'warn', text: 'You have ' + overdue.length + ' overdue task' + (overdue.length === 1 ? '' : 's') + ' that this plan does not cover.' });
    }

    return {
      day: dayWall,
      items: items,
      proposed: proposed,
      fixed: fixed,
      skipped: skipped,
      warnings: warnings,
      stats: {
        totalFree: totalFree,
        scheduled: used,
        remainingFree: remainingFree,
        reserve: floor
      }
    };
  }

  /* ---------------- plan my week ---------------- */

  function planWeek(startWall, opts) {
    opts = opts || {};
    var now = opts.now || T.nowWall();
    var days = [];
    var taken = {};

    for (var i = 0; i < 7; i++) {
      var day = T.startOfDay(T.addDays(startWall, i));
      if (day < T.startOfDay(now)) continue;
      var plan = planDay(day, { now: now, reserveMinutes: opts.reserveMinutes });
      // Don't propose the same task twice across the week.
      plan.proposed = plan.proposed.filter(function (p) {
        if (p.kind !== 'task') return true;
        if (taken[p.task.id]) return false;
        taken[p.task.id] = true;
        return true;
      });
      plan.items = plan.fixed.concat(plan.proposed).sort(function (a, b) { return a.start - b.start; });
      days.push(plan);
    }
    return days;
  }

  /* ---------------- what should I do now ---------------- */

  function whatNow(nowWall) {
    nowWall = nowWall || T.nowWall();
    var todayEvents = Q.eventsOnDay(nowWall, { ignoreLayers: true }).filter(function (e) { return !e.allDay; });

    var current = todayEvents.filter(function (e) {
      return e.startWall <= nowWall && e.endWall > nowWall && !e.done;
    })[0];

    var next = todayEvents.filter(function (e) { return e.startWall > nowWall; })
      .sort(function (a, b) { return a.startWall - b.startWall; })[0];

    if (current) {
      return {
        mode: 'in-event',
        event: current,
        untilMinutes: T.diffMinutes(nowWall, current.endWall),
        next: next,
        headline: 'You are in “' + current.title + '” right now',
        detail: T.humanDuration(T.diffMinutes(nowWall, current.endWall)) + ' left'
      };
    }

    var gapEnd = next ? next.startWall : T.atMinutes(nowWall, Math.min(settings().dayEndHour * 60, 24 * 60 - 1));
    var gap = Math.max(0, T.diffMinutes(nowWall, gapEnd));
    var travel = next && settings().travelTimeEnabled && next.travelMinutes ? next.travelMinutes : 0;
    var usable = Math.max(0, gap - travel - Math.min(10, settings().bufferMinutes || 0));

    if (usable < 10) {
      return {
        mode: 'no-time',
        next: next,
        gap: gap,
        headline: next ? '“' + next.title + '” starts in ' + T.humanDuration(gap) : 'Your day is winding down',
        detail: next ? (travel ? 'Leave in about ' + T.humanDuration(Math.max(0, gap - travel)) + '.' : 'Not enough time to start something new.') : 'Nothing else scheduled.'
      };
    }

    var ranked = rankedTasks(nowWall, { horizonDays: 30 });
    var fits = ranked.filter(function (r) {
      var est = Q.taskEstimate(r.task);
      return est <= usable;
    });
    var best = fits[0] || null;
    var alternatives = fits.slice(1, 4);

    // Nothing fits whole — offer a first chunk of the top task instead.
    var partial = null;
    if (!best && ranked.length) {
      partial = ranked[0];
    }

    return {
      mode: best ? 'recommend' : (partial ? 'partial' : 'free'),
      usable: usable,
      gap: gap,
      next: next,
      recommendation: best,
      partial: partial,
      alternatives: alternatives,
      headline: 'You have ' + T.humanDuration(usable) + (next ? ' before ' + next.title : ' free'),
      detail: best
        ? best.task.title + ' — ' + T.humanDuration(Q.taskEstimate(best.task))
        : partial
          ? 'Nothing fits completely. You could make a start on ' + partial.task.title + '.'
          : 'Nothing on your list needs attention right now.'
    };
  }

  /* ---------------- suggestions ---------------- */

  /* Observations worth surfacing, each with an explanation and an action.
     Dismissals are remembered so nothing nags. */
  function suggestions(nowWall) {
    nowWall = nowWall || T.nowWall();
    var st = settings();
    if (!st.suggestionsEnabled) return [];
    var out = [];
    var dismissed = S.state.dismissed || {};

    function push(s) {
      if (dismissed[s.id] && Date.now() - dismissed[s.id] < 1000 * 60 * 60 * 20) return;
      out.push(s);
    }

    // 1. Deadlines with no work scheduled against them.
    Q.upcomingDeadlines(null, nowWall).forEach(function (d) {
      var days = T.diffDays(nowWall, T.w(d.due));
      if (days < 0 || days > 10) return;
      var linked = Q.tasksForDeadline(d.id);
      var scheduled = linked.some(function (t) { return t.scheduledEventId; });
      var relatedEvents = Q.eventsInRange(T.startOfDay(nowWall), T.w(d.due), { ignoreLayers: true })
        .filter(function (e) { return e.title.toLowerCase().indexOf(d.title.toLowerCase().split(' ')[0]) >= 0; });
      if (!scheduled && !relatedEvents.length) {
        push({
          id: 'dl-unscheduled-' + d.id,
          tone: days <= 2 ? 'urgent' : 'normal',
          text: '“' + d.title + '” is due ' + (days === 0 ? 'today' : days === 1 ? 'tomorrow' : 'in ' + days + ' days') + ', but you have not scheduled time for it.',
          why: 'No calendar block or task on your schedule references this deadline.',
          action: { type: 'find-time', label: 'Find time', deadlineId: d.id, minutes: 60, title: d.title }
        });
      }
    });

    // 2. Overdue work — offered as recovery, never as a scolding.
    var overdue = Q.overdueTasks(nowWall);
    if (overdue.length) {
      push({
        id: 'overdue-' + overdue.length + '-' + T.key(nowWall),
        tone: 'urgent',
        text: overdue.length === 1
          ? '“' + overdue[0].title + '” slipped past its date.'
          : overdue.length + ' tasks slipped past their dates.',
        why: 'Their due dates are in the past and they are not marked complete.',
        action: { type: 'recover', label: 'Reschedule them' }
      });
    }

    // 3. Overloaded day.
    for (var i = 0; i < 7; i++) {
      var day = T.startOfDay(T.addDays(nowWall, i));
      var due = Q.tasksDueOn(day).filter(function (t) { return t.status !== 'completed'; });
      if (due.length >= 5) {
        var totalNeeded = due.reduce(function (a, t) { return a + Q.taskEstimate(t); }, 0);
        var free = freeMinutes(day, { after: i === 0 ? nowWall : null });
        if (totalNeeded > free) {
          push({
            id: 'overload-' + T.key(day),
            tone: 'warn',
            text: due.length + ' tasks are due ' + T.relativeDay(day, nowWall).toLowerCase() +
              ' — about ' + T.humanDuration(totalNeeded) + ' of work in ' + T.humanDuration(free) + ' of free time.',
            why: 'Estimated task time exceeds the open time in your day.',
            action: { type: 'goto-day', label: 'Look at that day', day: T.key(day) }
          });
          break;
        }
      }
    }

    // 4. Conflicts in the next week.
    for (var d2 = 0; d2 < 7; d2++) {
      var dayW = T.startOfDay(T.addDays(nowWall, d2));
      var items = Q.eventsOnDay(dayW, { ignoreLayers: true });
      var conflicts = Q.findConflicts(items);
      if (conflicts.length) {
        push({
          id: 'conflict-' + T.key(dayW),
          tone: 'warn',
          text: conflicts.length === 1
            ? '“' + conflicts[0][0].title + '” and “' + conflicts[0][1].title + '” overlap ' + T.relativeDay(dayW, nowWall).toLowerCase() + '.'
            : conflicts.length + ' overlapping commitments ' + T.relativeDay(dayW, nowWall).toLowerCase() + '.',
          why: 'These events share the same time window.',
          action: { type: 'goto-day', label: 'Resolve', day: T.key(dayW) }
        });
        break;
      }
    }

    // 5. A large free block worth claiming.
    for (var d3 = 0; d3 < 5; d3++) {
      var day3 = T.startOfDay(T.addDays(nowWall, d3));
      var slots = freeSlots(day3, { after: d3 === 0 ? nowWall : null, minMinutes: 150 });
      if (!slots.length) continue;
      var unscheduled = rankedTasks(nowWall, { excludeScheduled: true, horizonDays: 14 })[0];
      if (!unscheduled) break;
      push({
        id: 'freeblock-' + T.key(day3),
        tone: 'normal',
        text: 'You have ' + T.humanDuration(slots[0].minutes) + ' free ' +
          T.relativeDay(day3, nowWall).toLowerCase() + ' from ' + T.fmtTime(slots[0].start, st.use24Hour) +
          '. “' + unscheduled.task.title + '” could fit there.',
        why: unscheduled.reasons.length ? 'That task is ' + unscheduled.reasons.join(' and ') + '.' : 'It is the highest-ranked task with no time set aside.',
        action: { type: 'schedule-task', label: 'Schedule it', taskId: unscheduled.task.id, start: slots[0].start.getTime() }
      });
      break;
    }

    // 6. Inbox that has stopped being an inbox.
    var inbox = S.all('tasks').filter(function (t) { return t.status === 'inbox'; });
    if (inbox.length >= 8) {
      push({
        id: 'inbox-' + Math.floor(inbox.length / 5),
        tone: 'normal',
        text: inbox.length + ' tasks are still sitting in your inbox.',
        why: 'They have no date and no plan, so they are easy to lose track of.',
        action: { type: 'goto', label: 'Open tasks', route: 'tasks' }
      });
    }

    // 7. Unprocessed captures.
    var caps = S.all('captures').filter(function (c) { return !c.processed; });
    if (caps.length) {
      push({
        id: 'captures-' + caps.length,
        tone: 'normal',
        text: caps.length + ' captured thought' + (caps.length === 1 ? '' : 's') + ' waiting to be organized.',
        why: 'You wrote these down but have not turned them into anything yet.',
        action: { type: 'goto', label: 'Organize', route: 'capture' }
      });
    }

    return out.slice(0, 5);
  }

  function dismissSuggestion(id) {
    S.quiet(function (st) {
      st.dismissed = st.dismissed || {};
      st.dismissed[id] = Date.now();
    });
  }

  /* ---------------- conflict resolution ---------------- */

  /* Where could this event go instead, keeping its length? */
  function alternativesFor(inst, opts) {
    var minutes = T.diffMinutes(inst.startWall, inst.endWall);
    return findTime(minutes, {
      now: T.nowWall(),
      days: 7,
      limit: 3,
      excludeEventIds: [inst.seriesId || inst.id]
    });
  }

  /* ---------------- reviews ---------------- */

  function weekReview(startWall) {
    var start = T.startOfDay(startWall);
    var end = T.endOfDay(T.addDays(start, 6));
    var tasks = S.all('tasks');

    var completed = tasks.filter(function (t) {
      if (!t.completedAt) return false;
      var c = T.w(t.completedAt);
      return c >= start && c <= end;
    });
    var missed = tasks.filter(function (t) {
      if (t.status === 'completed' || t.status === 'archived' || !t.due) return false;
      var d = T.w(t.due);
      return d >= start && d <= end && d < T.nowWall();
    });
    var unfinished = tasks.filter(function (t) {
      if (t.status === 'completed' || t.status === 'archived' || !t.due) return false;
      var d = T.w(t.due);
      return d >= start && d <= end;
    });

    var events = Q.eventsInRange(start, end, { ignoreLayers: true }).filter(function (e) { return !e.allDay; });
    var byCategory = {};
    var totalMinutes = 0;
    events.forEach(function (e) {
      var mins = T.diffMinutes(e.startWall, e.endWall);
      var cat = e.categoryId ? (S.get('categories', e.categoryId) || {}).name : null;
      var label = cat || (S.get('calendars', e.calendarId) || {}).name || 'Other';
      byCategory[label] = (byCategory[label] || 0) + mins;
      totalMinutes += mins;
    });

    var upcomingDeadlines = Q.deadlinesInRange(T.addDays(end, 0), T.addDays(end, 14));
    var nextWeekPriorities = rankedTasks(T.addDays(start, 7), { horizonDays: 10 }).slice(0, 5);

    var habits = S.all('habits').filter(function (h) { return !h.archived; }).map(function (h) {
      var done = 0, target = R.habitTargetPerWeek(h);
      for (var i = 0; i < 7; i++) {
        if ((h.log || {})[T.key(T.addDays(start, i))]) done++;
      }
      return { habit: h, done: done, target: target };
    });

    return {
      start: start, end: end,
      completed: completed,
      missed: missed,
      unfinished: unfinished,
      events: events,
      byCategory: Object.keys(byCategory).map(function (k) { return { label: k, minutes: byCategory[k] }; })
        .sort(function (a, b) { return b.minutes - a.minutes; }),
      totalMinutes: totalMinutes,
      upcomingDeadlines: upcomingDeadlines,
      nextWeekPriorities: nextWeekPriorities,
      habits: habits
    };
  }

  function monthReview(anchorWall) {
    var start = T.startOfMonth(anchorWall);
    var end = T.endOfMonth(anchorWall);
    var tasks = S.all('tasks');
    var completed = tasks.filter(function (t) {
      if (!t.completedAt) return false;
      var c = T.w(t.completedAt);
      return c >= start && c <= end;
    });
    var events = Q.eventsInRange(start, end, { ignoreLayers: true }).filter(function (e) { return !e.allDay; });
    var byCategory = {};
    events.forEach(function (e) {
      var mins = T.diffMinutes(e.startWall, e.endWall);
      var cat = e.categoryId ? (S.get('categories', e.categoryId) || {}).name : null;
      var label = cat || (S.get('calendars', e.calendarId) || {}).name || 'Other';
      byCategory[label] = (byCategory[label] || 0) + mins;
    });
    var projects = S.all('projects').map(function (p) {
      return { project: p, progress: Q.projectProgress(p.id) };
    });
    var goals = S.all('goals').filter(function (g) { return !g.archived; }).map(function (g) {
      return { goal: g, progress: Q.goalProgress(g.id) };
    });

    // Weekly completion counts, for the trend line.
    var weeks = [];
    var cursor = T.startOfWeek(start, S.settings().firstDayOfWeek);
    while (cursor <= end) {
      var wEnd = T.endOfDay(T.addDays(cursor, 6));
      var count = tasks.filter(function (t) {
        if (!t.completedAt) return false;
        var c = T.w(t.completedAt);
        return c >= cursor && c <= wEnd;
      }).length;
      weeks.push({ start: new Date(cursor), count: count });
      cursor = T.addDays(cursor, 7);
    }

    return {
      start: start, end: end,
      completed: completed,
      events: events,
      deadlines: Q.deadlinesInRange(start, end, true),
      byCategory: Object.keys(byCategory).map(function (k) { return { label: k, minutes: byCategory[k] }; })
        .sort(function (a, b) { return b.minutes - a.minutes; }),
      projects: projects,
      goals: goals,
      weeks: weeks
    };
  }

  global.SCHED = {
    busyIntervals: busyIntervals, freeSlots: freeSlots, freeMinutes: freeMinutes,
    dayWindow: dayWindow, dayLoad: dayLoad,
    scoreTask: scoreTask, rankedTasks: rankedTasks, quadrant: quadrant,
    findTime: findTime, planDay: planDay, planWeek: planWeek, whatNow: whatNow,
    suggestions: suggestions, dismissSuggestion: dismissSuggestion,
    alternativesFor: alternativesFor,
    weekReview: weekReview, monthReview: monthReview
  };
})(window);
