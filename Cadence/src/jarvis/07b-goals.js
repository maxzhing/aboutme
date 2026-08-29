/* Cadence · JARVIS — goals, interests and what has actually been happening.

   Cadence already has goals: a name, a description, milestones, a due date and
   a progress calculation. This file does not replace them. It layers on the
   things JARVIS needs in order to *suggest* rather than merely display — what
   kind of thing a goal is, how often you want to touch it, and when you last
   actually did.

   A note on progress. Cadence's own goalProgress counts completed milestones
   and tasks, which is a real measure of a real thing. What this file adds is
   an *activity* indicator — how recently and how often you have worked on
   something. It is deliberately never presented as a skill level, because
   nothing here can measure whether you got better at the piano. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};
  var DX = JV.DX;

  /* ------------------------------------------------------------ domains */

  /* Domains exist so a suggestion can be concrete. "Practise piano" is a
     placeholder; "polish the hardest passage, then record one attempt" is an
     activity — and the difference is knowing that piano is music. */
  var DOMAINS = [
    { id: 'programming', test: /\b(java|python|javascript|typescript|c\+\+|c#|rust|go|swift|kotlin|cod(e|ing)|program|software|app|web ?dev|leetcode|algorithm)/i, label: 'programming' },
    { id: 'robotics', test: /\b(robot|arduino|raspberry pi|electronics|circuit|cad|3d print|mechatronic)/i, label: 'robotics' },
    { id: 'music', test: /\b(piano|guitar|violin|drums|bass|sing|vocal|music|compos|instrument|band|orchestra|cello|flute|sax)/i, label: 'music' },
    { id: 'math', test: /\b(math|maths|algebra|calculus|geometry|trig|statistic|probability|number theory)/i, label: 'maths' },
    { id: 'science', test: /\b(physic|chemis|biolog|science|lab|experiment|astronom|geolog)/i, label: 'science' },
    { id: 'writing', test: /\b(writ|essay|journal|blog|story|novel|poet|screenplay|script)/i, label: 'writing' },
    { id: 'art', test: /\b(draw|paint|sketch|art|design|illustrat|animat|photograph|film)/i, label: 'art' },
    { id: 'language', test: /\b(spanish|french|german|japanese|mandarin|chinese|korean|italian|latin|language|vocab)/i, label: 'languages' },
    { id: 'fitness', test: /\b(run|gym|fit|workout|exercise|swim|cycl|lift|strength|yoga|sport|football|basketball|tennis)/i, label: 'fitness' },
    { id: 'reading', test: /\b(read|book|literature|novel)/i, label: 'reading' },
    { id: 'college', test: /\b(college|university|sat|act|admission|application|scholarship|ucas|personal statement)/i, label: 'college prep' },
    { id: 'exam', test: /\b(exam|test|revis|study for|midterm|final|gcse|a.?level|ap )/i, label: 'exam prep' }
  ];

  function domainFor(text) {
    var s = String(text || '');
    for (var i = 0; i < DOMAINS.length; i++) {
      if (DOMAINS[i].test.test(s)) return DOMAINS[i].id;
    }
    return 'general';
  }

  function domainLabel(id) {
    for (var i = 0; i < DOMAINS.length; i++) if (DOMAINS[i].id === id) return DOMAINS[i].label;
    return 'general';
  }

  /* ------------------------------------------------------------ profile */

  /* Interests and preferences live in Cadence's settings so they persist with
     everything else and can be exported with a backup. */
  function profile() {
    var p = {};
    try { p = S.settings().jarvisProfile || {}; } catch (err) { p = {}; }
    return Object.assign({
      interests: [],          // free text the user gave us — never invented
      likedCategories: {},    // category -> score, learned from what they take
      blocked: [],            // "never suggest this again"
      proactive: true,
      goalSuggestions: true,
      useCalendar: true,
      frequency: 'medium',    // low | medium | high
      types: null,            // null = all; otherwise an allow-list
      log: []                 // [{at, category, domain, goalId, action}]
    }, p);
  }

  function saveProfile(patch) {
    var next = Object.assign(profile(), patch);
    // Keep the log from growing without bound.
    if (next.log.length > 200) next.log = next.log.slice(-150);
    S.setSetting('jarvisProfile', next);
    return next;
  }

  function addInterests(list) {
    var p = profile();
    var seen = {};
    var merged = p.interests.concat(list).map(function (s) {
      return String(s).trim();
    }).filter(function (s) {
      var k = s.toLowerCase();
      if (!s || seen[k]) return false;
      seen[k] = true;
      return true;
    });
    return saveProfile({ interests: merged });
  }

  /* Record what actually happened so balancing and variety have something to
     work from. */
  function record(entry) {
    var p = profile();
    p.log.push(Object.assign({ at: JV.nowTs() }, entry));
    return saveProfile({ log: p.log });
  }

  function recentLog(days) {
    var cutoff = JV.nowTs() - (days || 14) * 86400;
    return profile().log.filter(function (e) { return e.at >= cutoff; });
  }

  /* ------------------------------------------------------------- goals */

  /* A goal, plus the JARVIS metadata and the activity picture. */
  function decorate(goal) {
    var meta = goal.jarvis || {};
    var domain = meta.domain || domainFor(goal.name + ' ' + (goal.description || ''));
    var sessions = sessionsFor(goal, 14);
    var last = sessions.length ? sessions[0].when : null;

    return {
      goal: goal,
      id: goal.id,
      name: goal.name,
      description: goal.description || '',
      domain: domain,
      domainLabel: domainLabel(domain),
      priority: meta.priority || 'medium',
      frequency: meta.frequency || 'weekly',   // daily | weekly | occasional
      notes: meta.notes || '',
      due: goal.due ? T.w(goal.due) : null,
      progress: safeProgress(goal.id),
      sessions14: sessions.length,
      sessions7: sessions.filter(function (s) {
        return s.when >= T.addDays(DX.nowWall(), -7);
      }).length,
      lastWorked: last,
      daysSince: last ? Math.max(0, T.diffDays(last, DX.nowWall())) : null
    };
  }

  function safeProgress(id) {
    try { return Q.goalProgress(id); } catch (err) { return { pct: 0, done: 0, total: 0 }; }
  }

  /* Everything on the calendar that looks like work on this goal: events
     linked to it, events on its projects, and events whose title matches. */
  function sessionsFor(goal, days) {
    var out = [];
    try {
      var now = DX.nowWall();
      var projectIds = S.all('projects')
        .filter(function (p) { return p.goalId === goal.id; })
        .map(function (p) { return p.id; });

      Q.eventsInRange(T.addDays(now, -(days || 14)), now, { ignoreLayers: true })
        .forEach(function (e) {
          if (e.allDay) return;
          var linked = e.goalId === goal.id || projectIds.indexOf(e.projectId) >= 0;
          var named = DX.matchScore(e.title, goal.name) >= 0;
          if (linked || named) out.push({ when: e.startWall, minutes: T.diffMinutes(e.startWall, e.endWall) });
        });

      // Ideas the user accepted count too, even if they were never blocked out.
      recentLog(days || 14).forEach(function (entry) {
        if (entry.goalId === goal.id && entry.action === 'accepted') {
          out.push({ when: new Date(entry.at * 1000), minutes: entry.minutes || 0 });
        }
      });
    } catch (err) { /* an empty picture is better than a broken one */ }

    out.sort(function (a, b) { return b.when - a.when; });
    return out;
  }

  function list() {
    var goals = [];
    try {
      goals = S.all('goals').filter(function (g) { return !g.archived && g.status !== 'done'; });
    } catch (err) { return []; }
    return goals.map(decorate);
  }

  function find(name) {
    var all = list();
    var scored = all.map(function (g) { return { g: g, s: DX.matchScore(g.name, name) }; })
      .filter(function (r) { return r.s >= 0; })
      .sort(function (a, b) { return b.s - a.s; });
    return scored.length ? scored[0].g : null;
  }

  /* Create a goal through Cadence's own action so it appears in the Goals view
     like any other, then attach the JARVIS metadata. */
  function add(name, opts) {
    opts = opts || {};
    var goal = A.createGoal({
      name: name,
      description: opts.description || '',
      due: opts.due || null
    });
    var meta = {
      domain: opts.domain || domainFor(name + ' ' + (opts.description || '')),
      priority: opts.priority || 'medium',
      frequency: opts.frequency || 'weekly',
      notes: opts.notes || ''
    };
    S.update('goals', goal.id, { jarvis: meta }, 'Goal details');
    return decorate(S.get('goals', goal.id));
  }

  function update(id, meta) {
    var goal = S.get('goals', id);
    if (!goal) return null;
    S.update('goals', id, { jarvis: Object.assign({}, goal.jarvis || {}, meta) }, 'Goal details');
    return decorate(S.get('goals', id));
  }

  /* How overdue a goal is for attention, given how often you said you wanted
     to touch it. Drives balancing: three days of Java makes piano rise. */
  function neglect(g) {
    var target = g.frequency === 'daily' ? 1 : g.frequency === 'weekly' ? 3 : 7;
    if (g.daysSince === null) return 1;              // never worked on
    return Math.min(1.5, g.daysSince / target);
  }

  /* An honest activity indicator: sessions in the last fortnight against what
     the stated frequency implies. Not a skill level, and never labelled one. */
  function activityBar(g) {
    var expected = g.frequency === 'daily' ? 12 : g.frequency === 'weekly' ? 4 : 2;
    var ratio = Math.min(1, g.sessions14 / expected);
    var filled = Math.round(ratio * 10);
    return {
      filled: filled,
      total: 10,
      bar: new Array(filled + 1).join('█') + new Array(10 - filled + 1).join('░'),
      sessions: g.sessions14,
      label: g.sessions14
        ? g.sessions14 + ' session' + (g.sessions14 === 1 ? '' : 's') + ' in the last fortnight'
        : 'nothing logged in the last fortnight'
    };
  }

  JV.GOALS = {
    list: list, find: find, add: add, update: update, decorate: decorate,
    domainFor: domainFor, domainLabel: domainLabel, DOMAINS: DOMAINS,
    profile: profile, saveProfile: saveProfile, addInterests: addInterests,
    record: record, recentLog: recentLog,
    neglect: neglect, activityBar: activityBar, sessionsFor: sessionsFor
  };
})(window);
