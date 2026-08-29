/* Cadence · JARVIS — the domain layer.

   Everything the tools need in order to talk about the user's calendar in the
   user's own terms: resolving "the biology test" to a real event, turning a
   date phrase into a day, formatting a time the way the app formats it, and —
   most importantly — verifying that a write actually landed.

   Verification is the reason this file exists separately. A tool that catches
   no exception has not confirmed anything; it has only confirmed that nothing
   threw. Every mutating tool in the belt pairs its commit with a check that
   re-reads the store, so "done" means the data is there. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};
  var DX = JV.DX = {};

  /* ------------------------------------------------------------- clocks */

  function nowWall() { return T.nowWall(); }
  function use24() { return S.settings().use24Hour; }
  function fmtClock(d) { return T.fmtTime(d, use24()); }
  function fmtDay(d) { return T.relativeDay(d) || T.fmtDate(d); }
  function fmtDayLong(d) { return T.fmtDateLong ? T.fmtDateLong(d) : T.fmtDate(d); }
  function fmtSpan(a, b) { return fmtClock(a) + '–' + fmtClock(b); }

  /* Accepts 'today', 'tomorrow', a weekday, an ISO date, or a natural phrase
     Cadence's own parser can date. Returns null when nothing reads as a date,
     so callers can tell "no date given" from "today". */
  function parseDay(text) {
    if (!text) return null;
    var now = nowWall();
    var s = String(text).trim().toLowerCase();

    if (s === 'today' || s === 'now' || s === 'tonight') return T.startOfDay(now);
    if (s === 'tomorrow') return T.startOfDay(T.addDays(now, 1));
    if (s === 'yesterday') return T.startOfDay(T.addDays(now, -1));

    // Relative offsets — "in two weeks", "in 10 days", "in a month".
    var rel = s.match(/^in\s+(a|an|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(day|week|month)s?$/);
    if (rel) {
      var words = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
      var n = words[rel[1]] !== undefined ? words[rel[1]] : parseInt(rel[1], 10);
      if (isFinite(n)) {
        if (rel[2] === 'day') return T.startOfDay(T.addDays(now, n));
        if (rel[2] === 'week') return T.startOfDay(T.addDays(now, n * 7));
        return T.startOfDay(T.addMonths(now, n));
      }
    }
    if (/^next week$/.test(s)) return T.startOfWeek(T.addDays(now, 7));
    if (/^next month$/.test(s)) return T.startOfMonth(T.addMonths(now, 1));

    var iso = /^(\d{4}-\d{2}-\d{2})/.exec(s);
    if (iso) {
      var d = T.fromKey(iso[1]);
      if (d && !isNaN(d)) return T.startOfDay(d);
    }

    var names = T.DAY_NAMES.map(function (n) { return n.toLowerCase(); });
    var idx = names.indexOf(s.replace(/^(next|this|on)\s+/, ''));
    if (idx >= 0) {
      var cur = T.startOfDay(now);
      var ahead = /^next\s/.test(s) ? 7 : 0;
      for (var i = 0; i < 7; i++) {
        var cand = T.addDays(cur, i);
        if (cand.getDay() === idx) return T.addDays(cand, ahead);
      }
    }

    try {
      var parsed = NLP.parse(s, { settings: S.settings() });
      if (parsed && parsed.startWall) return T.startOfDay(parsed.startWall);
      if (parsed && parsed.dueWall) return T.startOfDay(parsed.dueWall);
    } catch (err) { /* not a date */ }
    return null;
  }

  function dayOrToday(text) { return parseDay(text) || T.startOfDay(nowWall()); }

  /* A named range: 'today' | 'tomorrow' | 'week' | 'month' | a day phrase. */
  function parseRange(text) {
    var now = nowWall();
    var s = String(text || '').trim().toLowerCase();
    if (/\bthis month\b|\bmonth\b/.test(s)) {
      return { start: T.startOfMonth(now), end: T.endOfMonth(now), label: 'this month' };
    }
    if (/\bnext week\b/.test(s)) {
      var ns = T.startOfWeek(T.addDays(now, 7));
      return { start: ns, end: T.endOfDay(T.addDays(ns, 6)), label: 'next week' };
    }
    if (/\bthis week\b|\bweek\b/.test(s)) {
      var ws = T.startOfWeek(now);
      return { start: ws, end: T.endOfDay(T.addDays(ws, 6)), label: 'this week' };
    }
    if (/\bweekend\b/.test(s)) {
      var cur = T.startOfDay(now);
      for (var i = 0; i < 7; i++) {
        var c = T.addDays(cur, i);
        if (c.getDay() === 6) return { start: c, end: T.endOfDay(T.addDays(c, 1)), label: 'this weekend' };
      }
    }
    var day = parseDay(s);
    if (day) return { start: day, end: T.endOfDay(day), label: fmtDay(day) };
    return { start: T.startOfDay(now), end: T.endOfDay(now), label: 'today' };
  }

  /* -------------------------------------------------------- text matching */

  var STOPWORDS = {
    the: 1, for: 1, and: 1, with: 1, that: 1, this: 1, from: 1, into: 1, all: 1,
    my: 1, our: 1, your: 1, a: 1, an: 1, of: 1, on: 1, in: 1, to: 1, at: 1, is: 1,
    task: 1, tasks: 1, event: 1, events: 1, item: 1, thing: 1, some: 1, about: 1,
    appointment: 1, meeting: 1, session: 1
  };

  function normalizeQuery(q) {
    return String(q || '').trim().toLowerCase()
      .replace(/^(for|on|with|about|my|the)\s+/, '')
      .replace(/^(the|my|a|an)\s+/, '')
      .replace(/\s+(please|thanks)$/, '')
      .trim();
  }

  /* Crude but effective stemming: "studying" and "studies" should both find
     "Study for biology test". Full stemming is overkill for event titles. */
  function stem(word) {
    var w = String(word || '');
    if (w.length > 5 && /ying$/.test(w)) return w.slice(0, -4) + 'y';
    if (w.length > 5 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3);
    if (w.length > 4 && /ed$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  }

  function terms(q) {
    return normalizeQuery(q).split(/\s+/).filter(function (w) {
      return w.length > 2 && !STOPWORDS[w];
    });
  }

  /* Score how well `title` answers `query`. -1 means "not a match at all", so
     callers can refuse rather than return the least-bad row. */
  function matchScore(title, query) {
    var t = String(title || '').toLowerCase();
    var q = normalizeQuery(query);
    if (!q) return -1;
    if (t === q) return 100;
    if (t.indexOf(q) === 0) return 80;
    if (t.indexOf(q) >= 0) return 60;

    var words = terms(query);
    if (!words.length) return -1;
    var stemmed = t.split(/\s+/).map(stem);
    var hits = words.filter(function (w) {
      if (t.indexOf(w) >= 0) return true;
      var sw = stem(w);
      return stemmed.some(function (tw) { return tw === sw || tw.indexOf(sw) === 0; });
    }).length;
    if (!hits) return -1;
    // A short query names one thing, so every word of it has to be there.
    // Matching "chemistry study session" against "Study for biology test" on
    // the strength of "study" alone would move the wrong event — and moving
    // the wrong event is worse than admitting nothing matched.
    if (words.length <= 3) return hits === words.length ? 20 * (hits / words.length) : -1;
    if (hits / words.length < 0.6) return -1;
    return 20 * (hits / words.length);
  }

  /* --------------------------------------------------------- resolvers */

  /* Event instances in a window around now, ranked by how well they match and
     how close they are to today. Returns instances (not base rows) because
     every mutation API in the app takes an instance. */
  function findEvents(query, opts) {
    opts = opts || {};
    var now = nowWall();
    var start = opts.start || T.startOfDay(T.addDays(now, opts.back === undefined ? -30 : -opts.back));
    var end = opts.end || T.endOfDay(T.addDays(now, opts.ahead === undefined ? 120 : opts.ahead));
    var all = Q.eventsInRange(start, end, { ignoreLayers: true });

    var scored = [];
    all.forEach(function (inst) {
      var score = matchScore(inst.title, query);
      if (score < 0) return;
      var days = Math.abs(T.diffDays(now, inst.startWall));
      scored.push({ inst: inst, score: score - Math.min(20, days * 0.4) });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.map(function (s) { return s.inst; });
  }

  function findEvent(query, opts) {
    var hits = findEvents(query, opts);
    return hits.length ? hits[0] : null;
  }

  function findTasks(query) {
    var out = [];
    Q.activeTasks().forEach(function (t) {
      var score = matchScore(t.title, query);
      if (score >= 0) out.push({ task: t, score: score });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.map(function (r) { return r.task; });
  }

  function findTask(query) {
    if (!query) return null;
    var byId = S.get('tasks', query);
    if (byId) return byId;
    var hits = findTasks(query);
    return hits.length ? hits[0] : null;
  }

  function findProject(query) {
    var all = S.all('projects');
    var scored = [];
    all.forEach(function (p) {
      var score = matchScore(p.name, query);
      if (score >= 0) scored.push({ p: p, score: score });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.length ? scored[0].p : null;
  }

  /* Resolve a name across everything the calendar holds.

     "Remove the library books thing" should work whether that is an event, a
     task, a deadline or a habit — the person naming it does not think in
     collections, and an assistant that only ever searched events would answer
     "I could not find an event matching that" while the task sat right there. */
  function findAnything(query, opts) {
    opts = opts || {};
    var kinds = opts.kinds || ['event', 'task', 'deadline', 'habit', 'note', 'project'];
    var now = nowWall();
    var out = [];

    function consider(kind, item, title, when, penalty) {
      var score = matchScore(title, query);
      if (score < 0) return;
      // Prefer things happening soon; a match from months ago is rarely meant.
      var recency = when ? Math.min(20, Math.abs(T.diffDays(now, when)) * 0.4) : 4;
      out.push({
        kind: kind, item: item, label: title,
        when: when || null,
        score: score - recency - (penalty || 0)
      });
    }

    if (kinds.indexOf('event') >= 0) {
      findEvents(query, opts).forEach(function (inst) {
        consider('event', inst, inst.title, inst.startWall, 0);
      });
    }
    if (kinds.indexOf('task') >= 0) {
      Q.activeTasks().forEach(function (t) {
        consider('task', t, t.title, t.due ? T.w(t.due) : null, 0);
      });
    }
    if (kinds.indexOf('deadline') >= 0) {
      S.all('deadlines').filter(function (d) { return !d.done; }).forEach(function (d) {
        consider('deadline', d, d.title, T.w(d.due), 0);
      });
    }
    if (kinds.indexOf('habit') >= 0) {
      S.all('habits').forEach(function (h) { consider('habit', h, h.title || h.name, null, 2); });
    }
    if (kinds.indexOf('note') >= 0) {
      S.all('notes').forEach(function (n) { consider('note', n, n.title, null, 4); });
    }
    if (kinds.indexOf('project') >= 0) {
      S.all('projects').forEach(function (p) { consider('project', p, p.name, p.due ? T.w(p.due) : null, 4); });
    }

    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }

  function findOne(query, opts) {
    var hits = findAnything(query, opts);
    return hits.length ? hits[0] : null;
  }

  /* When two different things match nearly as well, saying which is meant is
     better than picking one and deleting it. */
  function isAmbiguous(hits) {
    if (hits.length < 2) return false;
    return (hits[0].score - hits[1].score) < 6 && hits[0].label !== hits[1].label;
  }

  var KIND_NOUN = {
    event: 'event', task: 'task', deadline: 'deadline',
    habit: 'habit', note: 'note', project: 'project'
  };

  /* ------------------------------------------------------- verification */

  /* Re-read the store and confirm an expectation. Every mutating tool pairs
     its commit with one of these; the console reports whatever comes back
     rather than assuming the write worked. */
  function verifyEvents(ids, label) {
    var missing = ids.filter(function (id) { return !S.get('events', id); });
    if (!missing.length) {
      return { ok: true, detail: label || (ids.length + ' event' + (ids.length === 1 ? '' : 's') + ' confirmed on the calendar') };
    }
    return {
      ok: false,
      detail: missing.length + ' of ' + ids.length + ' events are not on the calendar after saving'
    };
  }

  function verifyCollection(collection, ids, noun) {
    var missing = ids.filter(function (id) { return !S.get(collection, id); });
    if (!missing.length) {
      return { ok: true, detail: ids.length + ' ' + noun + (ids.length === 1 ? '' : 's') + ' confirmed saved' };
    }
    return { ok: false, detail: missing.length + ' of ' + ids.length + ' ' + noun + 's were not saved' };
  }

  function verifyGone(collection, id, noun) {
    return S.get(collection, id)
      ? { ok: false, detail: 'The ' + noun + ' is still there — nothing was removed' }
      : { ok: true, detail: 'The ' + noun + ' is gone from the calendar' };
  }

  /* Confirm an event now sits at the time we asked for. */
  function verifyMoved(eventId, startWall) {
    var ev = S.get('events', eventId);
    if (!ev) return { ok: false, detail: 'The event no longer exists' };
    var actual = T.w(ev.start);
    var drift = Math.abs(T.diffMinutes(actual, startWall));
    if (drift <= 1) {
      return { ok: true, detail: 'Confirmed at ' + fmtDay(actual) + ' ' + fmtClock(actual) };
    }
    return { ok: false, detail: 'The event is at ' + fmtClock(actual) + ', not the time requested' };
  }

  /* ---------------------------------------------------------- rendering */

  /* A reference the console turns into a clickable chip that opens the real
     editor. Tools attach these so an answer mentioning an event is navigable. */
  function ref(kind, item, label) {
    return { kind: kind, id: item && item.id, item: item, label: label || (item && (item.title || item.name)) };
  }

  function eventLine(e) {
    if (e.allDay) return e.title + ' · all day';
    return fmtSpan(e.startWall, e.endWall) + ' · ' + e.title;
  }

  function taskLine(t) {
    var bits = [t.title];
    if (t.due) bits.push('due ' + fmtDay(T.w(t.due)));
    if (t.priority && t.priority !== 'medium') bits.push(t.priority);
    return bits.join(' · ');
  }

  function hours(minutes) { return T.humanDuration(Math.max(0, Math.round(minutes))); }

  Object.assign(DX, {
    nowWall: nowWall, use24: use24,
    fmtClock: fmtClock, fmtDay: fmtDay, fmtDayLong: fmtDayLong, fmtSpan: fmtSpan, hours: hours,
    parseDay: parseDay, dayOrToday: dayOrToday, parseRange: parseRange,
    matchScore: matchScore, normalizeQuery: normalizeQuery, terms: terms,
    findEvent: findEvent, findEvents: findEvents,
    findTask: findTask, findTasks: findTasks, findProject: findProject,
    findAnything: findAnything, findOne: findOne, isAmbiguous: isAmbiguous,
    KIND_NOUN: KIND_NOUN,
    verifyEvents: verifyEvents, verifyCollection: verifyCollection,
    verifyGone: verifyGone, verifyMoved: verifyMoved,
    ref: ref, eventLine: eventLine, taskLine: taskLine
  });
})(window);
