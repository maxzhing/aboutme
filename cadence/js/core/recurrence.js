/* Cadence — recurrence expansion.

   A recurring event is stored once. Instances are generated on demand for the
   visible window only, so a daily event running for years costs nothing until
   you look at it. Edits to a single occurrence are stored as detached events
   carrying `seriesId` + `overrideKey`, with the date added to the parent's
   `exdates` — that is what makes "this event / this and future / all" work. */
(function (global) {
  'use strict';

  var MAX_INSTANCES = 750; // hard stop so a malformed rule can never hang the UI

  function normalize(rec) {
    if (!rec) return null;
    return {
      freq: rec.freq || 'weekly',
      interval: Math.max(1, rec.interval || 1),
      byDay: Array.isArray(rec.byDay) && rec.byDay.length ? rec.byDay.slice() : null,
      byMonthDay: rec.byMonthDay || null,
      until: rec.until || null,
      count: rec.count || null
    };
  }

  /* Does `rec` fire on this wall-clock day, given the series anchor day? */
  function matchesDay(rec, anchor, day) {
    var interval = rec.interval;
    switch (rec.freq) {
      case 'daily': {
        var dd = T.diffDays(anchor, day);
        return dd >= 0 && dd % interval === 0;
      }
      case 'weekly': {
        var days = rec.byDay || [anchor.getDay()];
        if (days.indexOf(day.getDay()) < 0) return false;
        var aw = T.startOfWeek(anchor, 0), dw = T.startOfWeek(day, 0);
        var weeks = Math.round(T.diffDays(aw, dw) / 7);
        return weeks >= 0 && weeks % interval === 0;
      }
      case 'monthly': {
        var months = (day.getFullYear() - anchor.getFullYear()) * 12 + (day.getMonth() - anchor.getMonth());
        if (months < 0 || months % interval !== 0) return false;
        var target = rec.byMonthDay || anchor.getDate();
        // Clamp to the last day for short months so "the 31st" still fires.
        var last = T.daysInMonth(day.getFullYear(), day.getMonth());
        return day.getDate() === Math.min(target, last);
      }
      case 'yearly': {
        var years = day.getFullYear() - anchor.getFullYear();
        if (years < 0 || years % interval !== 0) return false;
        return day.getMonth() === anchor.getMonth() && day.getDate() === anchor.getDate();
      }
      default:
        return false;
    }
  }

  /* All occurrences of `ev` intersecting [from, to] as wall-time instances. */
  function expandEvent(ev, from, to) {
    var startWall = T.w(ev.start);
    var endWall = T.w(ev.end);
    var durationMs = Math.max(0, endWall - startWall);

    if (!ev.recurrence) {
      if (endWall >= from && startWall <= to) return [instance(ev, startWall, durationMs, null)];
      return [];
    }

    var rec = normalize(ev.recurrence);
    var anchor = T.startOfDay(startWall);
    var until = rec.until ? T.endOfDay(T.w(rec.until)) : null;
    var exdates = ev.exdates || [];

    var scanStart = T.startOfDay(from);
    // Step back so an occurrence that began before the window but overlaps it is included.
    var overlapDays = Math.ceil(durationMs / T.DAY) + 1;
    scanStart = T.addDays(scanStart, -overlapDays);
    if (scanStart < anchor) scanStart = anchor;

    var out = [];
    var cursor = new Date(scanStart);
    var scanEnd = T.endOfDay(to);
    var guard = 0;

    // `count` is defined from the series start, so when the rule is capped we
    // must count occurrences from the anchor rather than from the window.
    var ordinal = 0;
    if (rec.count) {
      var c = new Date(anchor);
      while (c < scanStart && guard++ < 4000) {
        if (matchesDay(rec, anchor, c)) ordinal++;
        c = T.addDays(c, 1);
      }
      if (ordinal >= rec.count) return [];
    }

    guard = 0;
    while (cursor <= scanEnd && out.length < MAX_INSTANCES && guard++ < 4000) {
      if ((!until || cursor <= until) && matchesDay(rec, anchor, cursor)) {
        if (rec.count && ordinal >= rec.count) break;
        ordinal++;
        var key = T.key(cursor);
        if (exdates.indexOf(key) < 0) {
          var occStart = new Date(cursor);
          occStart.setHours(startWall.getHours(), startWall.getMinutes(), 0, 0);
          var occEnd = new Date(occStart.getTime() + durationMs);
          if (occEnd >= from && occStart <= to) {
            out.push(instance(ev, occStart, durationMs, key));
          }
        }
      }
      cursor = T.addDays(cursor, 1);
    }
    return out;
  }

  function instance(ev, startWall, durationMs, occurrenceKey) {
    var endWall = new Date(startWall.getTime() + durationMs);
    var inst = Object.assign({}, ev);
    inst.startWall = startWall;
    inst.endWall = endWall;
    inst.start = T.iso(startWall);
    inst.end = T.iso(endWall);
    inst.isInstance = !!occurrenceKey;
    inst.occurrenceKey = occurrenceKey;
    inst.seriesId = occurrenceKey ? ev.id : ev.seriesId || null;
    inst.instanceId = occurrenceKey ? ev.id + '::' + occurrenceKey : ev.id;
    return inst;
  }

  function nextOccurrence(ev, after) {
    after = after || T.nowWall();
    var list = expandEvent(ev, after, T.addDays(after, 400));
    list.sort(function (a, b) { return a.startWall - b.startWall; });
    for (var i = 0; i < list.length; i++) if (list[i].endWall > after) return list[i];
    return null;
  }

  /* Split a series so edits apply only from `fromDay` onward.
     Returns the patch for the original plus the payload for the new series. */
  function splitSeries(ev, fromDayWall) {
    var untilDay = T.endOfDay(T.addDays(fromDayWall, -1));
    var head = { recurrence: Object.assign({}, normalize(ev.recurrence), { until: T.iso(untilDay), count: null }) };
    var startWall = T.w(ev.start);
    var newStart = new Date(fromDayWall);
    newStart.setHours(startWall.getHours(), startWall.getMinutes(), 0, 0);
    var duration = T.w(ev.end) - startWall;
    var tail = Object.assign({}, ev);
    delete tail.id; delete tail.createdAt;
    tail.start = T.iso(newStart);
    tail.end = T.iso(new Date(newStart.getTime() + duration));
    tail.exdates = [];
    return { head: head, tail: tail };
  }

  var DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function describe(rec) {
    if (!rec) return 'Does not repeat';
    rec = normalize(rec);
    var s;
    var n = rec.interval;
    switch (rec.freq) {
      case 'daily':
        s = n === 1 ? 'Daily' : 'Every ' + n + ' days';
        break;
      case 'weekly': {
        var days = rec.byDay;
        if (days && days.length === 5 && [1, 2, 3, 4, 5].every(function (d) { return days.indexOf(d) >= 0; })) {
          s = n === 1 ? 'Every weekday' : 'Every ' + n + ' weeks on weekdays';
        } else if (days && days.length) {
          var names = days.slice().sort().map(function (d) { return DAY_ABBR[d]; }).join(', ');
          s = (n === 1 ? 'Weekly on ' : 'Every ' + n + ' weeks on ') + names;
        } else {
          s = n === 1 ? 'Weekly' : 'Every ' + n + ' weeks';
        }
        break;
      }
      case 'monthly':
        s = n === 1 ? 'Monthly' : 'Every ' + n + ' months';
        break;
      case 'yearly':
        s = n === 1 ? 'Yearly' : 'Every ' + n + ' years';
        break;
      default:
        s = 'Repeats';
    }
    if (rec.count) s += ', ' + rec.count + ' times';
    else if (rec.until) s += ', until ' + T.fmtDateShort(T.w(rec.until));
    return s;
  }

  /* ---- habits ---- */
  function habitDueOn(habit, dayWall) {
    var sch = habit.schedule || { type: 'daily' };
    switch (sch.type) {
      case 'daily': return true;
      case 'weekdays': return dayWall.getDay() >= 1 && dayWall.getDay() <= 5;
      case 'weekly': return (sch.days || []).indexOf(dayWall.getDay()) >= 0;
      case 'times-per-week': return true; // flexible: any day counts
      default: return true;
    }
  }

  function habitTargetPerWeek(habit) {
    var sch = habit.schedule || { type: 'daily' };
    if (sch.type === 'daily') return 7;
    if (sch.type === 'weekdays') return 5;
    if (sch.type === 'weekly') return (sch.days || []).length;
    if (sch.type === 'times-per-week') return sch.timesPerWeek || 3;
    return 7;
  }

  /* Streak counts back from today. A flexible habit is never "broken" by one
     missed day — only by a fully empty week — because guilt is not a feature. */
  function habitStreak(habit, todayWall) {
    var log = habit.log || {};
    var sch = habit.schedule || { type: 'daily' };
    var streak = 0;
    var cursor = new Date(todayWall);
    if (sch.type === 'times-per-week') {
      var weekCursor = T.startOfWeek(todayWall, 0);
      for (var w = 0; w < 104; w++) {
        var count = 0;
        for (var i = 0; i < 7; i++) {
          if (log[T.key(T.addDays(weekCursor, i))]) count++;
        }
        var isCurrent = w === 0;
        if (count >= (sch.timesPerWeek || 3) || (isCurrent && count > 0)) streak++;
        else break;
        weekCursor = T.addDays(weekCursor, -7);
      }
      return { value: streak, unit: streak === 1 ? 'week' : 'weeks' };
    }
    // Today not yet done doesn't break a streak that is otherwise intact.
    if (!log[T.key(cursor)]) cursor = T.addDays(cursor, -1);
    for (var d = 0; d < 400; d++) {
      var key = T.key(cursor);
      if (!habitDueOn(habit, cursor)) { cursor = T.addDays(cursor, -1); continue; }
      if (log[key]) { streak++; cursor = T.addDays(cursor, -1); }
      else break;
    }
    return { value: streak, unit: streak === 1 ? 'day' : 'days' };
  }

  global.R = {
    normalize: normalize, expandEvent: expandEvent, nextOccurrence: nextOccurrence,
    splitSeries: splitSeries, describe: describe, matchesDay: matchesDay,
    habitDueOn: habitDueOn, habitStreak: habitStreak, habitTargetPerWeek: habitTargetPerWeek
  };
})(window);
