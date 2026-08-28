/* Cadence — universal search.

   One index over every entity, with subsequence matching so "biolgy" and "bio"
   both find "Biology test". Results carry the matched character positions so the
   UI can highlight exactly what matched. */
(function (global) {
  'use strict';

  var index = null;
  S.on('change', function () { index = null; });

  var TYPE_META = {
    event: { label: 'Event', route: 'calendar', icon: 'calendar' },
    task: { label: 'Task', route: 'tasks', icon: 'check' },
    deadline: { label: 'Deadline', route: 'calendar', icon: 'flag' },
    note: { label: 'Note', route: 'notes', icon: 'note' },
    project: { label: 'Project', route: 'projects', icon: 'folder' },
    goal: { label: 'Goal', route: 'goals', icon: 'target' },
    habit: { label: 'Habit', route: 'habits', icon: 'repeat' },
    person: { label: 'Person', route: 'calendar', icon: 'user' },
    tag: { label: 'Tag', route: 'search', icon: 'tag' },
    location: { label: 'Location', route: 'calendar', icon: 'pin' }
  };

  function build() {
    var docs = [];
    var seenPeople = {}, seenPlaces = {};

    S.all('events').forEach(function (e) {
      docs.push({
        type: 'event', id: e.id, title: e.title,
        text: [e.title, e.description, e.location, (e.tags || []).join(' '),
        (e.participants || []).map(function (p) { return p.name; }).join(' ')].join(' '),
        subtitle: eventSubtitle(e), item: e, when: T.w(e.start)
      });
      (e.participants || []).forEach(function (p) {
        if (p.name && !seenPeople[p.name.toLowerCase()]) {
          seenPeople[p.name.toLowerCase()] = true;
          docs.push({ type: 'person', id: 'person:' + p.name, title: p.name, text: p.name, subtitle: 'Participant', item: p });
        }
      });
      if (e.location && !seenPlaces[e.location.toLowerCase()]) {
        seenPlaces[e.location.toLowerCase()] = true;
        docs.push({ type: 'location', id: 'loc:' + e.location, title: e.location, text: e.location, subtitle: 'Location', item: e });
      }
    });

    S.all('people').forEach(function (p) {
      if (seenPeople[p.name.toLowerCase()]) return;
      seenPeople[p.name.toLowerCase()] = true;
      docs.push({ type: 'person', id: p.id, title: p.name, text: [p.name, p.contact, p.role].join(' '), subtitle: p.role || 'Person', item: p });
    });

    S.all('tasks').forEach(function (t) {
      docs.push({
        type: 'task', id: t.id, title: t.title,
        text: [t.title, t.description, t.notes, (t.tags || []).join(' '),
        (t.subtasks || []).map(function (s) { return s.title; }).join(' ')].join(' '),
        subtitle: taskSubtitle(t), item: t, when: t.due ? T.w(t.due) : null
      });
    });

    S.all('deadlines').forEach(function (d) {
      docs.push({
        type: 'deadline', id: d.id, title: d.title,
        text: [d.title, d.description, (d.tags || []).join(' ')].join(' '),
        subtitle: 'Due ' + T.fmtDateShort(T.w(d.due)), item: d, when: T.w(d.due)
      });
    });

    S.all('notes').forEach(function (n) {
      docs.push({
        type: 'note', id: n.id, title: n.title || firstLine(n.body) || 'Untitled note',
        text: [n.title, n.body, (n.tags || []).join(' '),
        (n.checklist || []).map(function (c) { return c.title; }).join(' ')].join(' '),
        subtitle: (TYPE_META.note.label) + ' · ' + T.fmtDateShort(T.w(n.updatedAt)), item: n, when: T.w(n.updatedAt)
      });
    });

    S.all('projects').forEach(function (p) {
      var pr = Q.projectProgress(p.id);
      docs.push({
        type: 'project', id: p.id, title: p.name,
        text: [p.name, p.description, (p.tags || []).join(' ')].join(' '),
        subtitle: pr.total ? pr.pct + '% · ' + pr.done + '/' + pr.total + ' tasks' : 'Project', item: p
      });
    });

    S.all('goals').forEach(function (g) {
      docs.push({
        type: 'goal', id: g.id, title: g.name,
        text: [g.name, g.description, (g.milestones || []).map(function (m) { return m.title; }).join(' ')].join(' '),
        subtitle: Q.goalProgress(g.id).pct + '% complete', item: g
      });
    });

    S.all('habits').forEach(function (h) {
      docs.push({
        type: 'habit', id: h.id, title: h.name,
        text: [h.name, h.notes].join(' '),
        subtitle: 'Habit', item: h
      });
    });

    Q.allTags().forEach(function (t) {
      docs.push({
        type: 'tag', id: 'tag:' + t.tag, title: '#' + t.tag,
        text: '#' + t.tag + ' ' + t.tag,
        subtitle: t.count + ' item' + (t.count === 1 ? '' : 's'), item: t
      });
    });

    docs.forEach(function (d) { d.lower = (d.text || '').toLowerCase(); d.titleLower = (d.title || '').toLowerCase(); });
    return docs;
  }

  function firstLine(s) {
    return String(s || '').split('\n')[0].slice(0, 60);
  }

  function eventSubtitle(e) {
    var st = S.settings();
    var start = T.w(e.start);
    var base = e.allDay ? T.fmtDateShort(start) : T.fmtDateShort(start) + ' · ' + T.fmtTime(start, st.use24Hour);
    if (e.recurrence) base += ' · repeats';
    return base;
  }

  function taskSubtitle(t) {
    var status = (M.STATUSES.filter(function (s) { return s.id === t.status; })[0] || {}).label || '';
    if (t.due) return status + ' · due ' + T.fmtDateShort(T.w(t.due));
    return status;
  }

  /* Subsequence match with a score that rewards prefixes, word starts and runs. */
  function fuzzyScore(needle, hay) {
    if (!needle) return { score: 0, positions: [] };
    var n = needle.length, h = hay.length;
    if (!h || n > h) return null;

    var exact = hay.indexOf(needle);
    if (exact >= 0) {
      var positions = [];
      for (var k = 0; k < n; k++) positions.push(exact + k);
      var boundary = exact === 0 || /[\s\-_/#(]/.test(hay.charAt(exact - 1));
      return { score: 1000 - exact * 2 + (boundary ? 120 : 0) + (exact === 0 ? 80 : 0), positions: positions };
    }

    var pos = [], hi = 0, score = 0, run = 0;
    for (var i = 0; i < n; i++) {
      var c = needle.charAt(i);
      var found = -1;
      while (hi < h) {
        if (hay.charAt(hi) === c) { found = hi; break; }
        hi++;
      }
      if (found < 0) return null;
      var isBoundary = found === 0 || /[\s\-_/#(]/.test(hay.charAt(found - 1));
      score += 12;
      if (isBoundary) score += 22;
      if (pos.length && found === pos[pos.length - 1] + 1) { run++; score += 10 + run * 4; }
      else run = 0;
      pos.push(found);
      hi = found + 1;
    }
    score -= pos[0] * 1.5;
    score -= (h - n) * 0.15;
    return { score: score, positions: pos };
  }

  function search(query, opts) {
    opts = opts || {};
    var q = String(query || '').trim().toLowerCase();
    if (!index) index = build();
    if (!q) {
      if (!opts.emptyAll) return [];
      return index.slice(0, opts.limit || 50).map(function (d) { return { doc: d, score: 0, positions: [] }; });
    }

    var typeFilter = null;
    var m = q.match(/^(event|task|deadline|note|project|goal|habit|person|tag)s?:\s*(.*)$/);
    if (m) { typeFilter = m[1]; q = m[2].trim(); }
    if (opts.type) typeFilter = opts.type;

    var terms = q.split(/\s+/).filter(Boolean);
    var results = [];

    for (var i = 0; i < index.length; i++) {
      var doc = index[i];
      if (typeFilter && doc.type !== typeFilter) continue;
      if (opts.types && opts.types.indexOf(doc.type) < 0) continue;

      var total = 0, positions = [], ok = true;
      for (var t = 0; t < terms.length; t++) {
        var titleHit = fuzzyScore(terms[t], doc.titleLower);
        var bodyHit = titleHit ? null : fuzzyScore(terms[t], doc.lower);
        if (!titleHit && !bodyHit) { ok = false; break; }
        if (titleHit) { total += titleHit.score * 1.6; positions = positions.concat(titleHit.positions); }
        else total += bodyHit.score * 0.5;
      }
      if (!ok) continue;

      // Nudge things happening soon above things long past.
      if (doc.when) {
        var days = Math.abs(T.diffDays(T.nowWall(), doc.when));
        total += Math.max(0, 40 - days * 0.6);
      }
      if (doc.item && doc.item.status === 'completed') total -= 60;
      if (doc.item && doc.item.done) total -= 60;

      results.push({ doc: doc, score: total, positions: dedupePositions(positions) });
    }

    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, opts.limit || 40);
  }

  function dedupePositions(arr) {
    var seen = {}, out = [];
    arr.forEach(function (p) { if (!seen[p]) { seen[p] = 1; out.push(p); } });
    return out.sort(function (a, b) { return a - b; });
  }

  /* Split a title into matched / unmatched runs for highlighting. */
  function highlight(text, positions) {
    if (!positions || !positions.length) return [{ text: text, hit: false }];
    var set = {};
    positions.forEach(function (p) { set[p] = true; });
    var out = [], buf = '', mode = false;
    for (var i = 0; i < text.length; i++) {
      var hit = !!set[i];
      if (i && hit !== mode) { out.push({ text: buf, hit: mode }); buf = ''; }
      mode = hit;
      buf += text.charAt(i);
    }
    if (buf) out.push({ text: buf, hit: mode });
    return out;
  }

  function typeMeta(type) { return TYPE_META[type] || { label: type, route: 'calendar' }; }

  global.SEARCH = { search: search, highlight: highlight, typeMeta: typeMeta, invalidate: function () { index = null; } };
})(window);
