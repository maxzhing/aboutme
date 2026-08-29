/* Cadence · JARVIS — deadline to plan.

   "I have a physics project due September 20." One sentence in; a real
   project, a real deadline, and a set of scheduled work sessions out, arranged
   around everything already on the calendar.

   A note on where the phase structures come from: they are JARVIS's own
   built-in templates, written into this file. They are not researched, and the
   console says so when it proposes one. If a remote model is configured the
   assistant can draft a bespoke breakdown instead — but it will not pretend
   that an offline template came from anywhere but here. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};
  var DX = JV.DX;

  /* Built-in structures. `weight` is the share of total effort. */
  var TEMPLATES = [
    {
      id: 'exam',
      test: /\b(exam|test|quiz|midterm|final|assessment)\b/i,
      defaultMinutes: 240,
      label: 'exam preparation',
      phases: [
        { name: 'Review notes', weight: 0.25 },
        { name: 'Practice problems', weight: 0.30 },
        { name: 'Work through weak areas', weight: 0.25 },
        { name: 'Final review', weight: 0.20 }
      ]
    },
    {
      id: 'essay',
      test: /\b(essay|paper|report|article|write.?up|thesis|dissertation)\b/i,
      defaultMinutes: 210,
      label: 'writing',
      phases: [
        { name: 'Research and notes', weight: 0.25 },
        { name: 'Outline', weight: 0.15 },
        { name: 'Draft', weight: 0.35 },
        { name: 'Revise and proofread', weight: 0.25 }
      ]
    },
    {
      id: 'presentation',
      test: /\b(presentation|talk|slides|deck|pitch|demo)\b/i,
      defaultMinutes: 240,
      label: 'presentation prep',
      phases: [
        { name: 'Research', weight: 0.25 },
        { name: 'Outline the story', weight: 0.15 },
        { name: 'Build slides', weight: 0.35 },
        { name: 'Rehearse', weight: 0.25 }
      ]
    },
    {
      id: 'reading',
      test: /\b(read|reading|chapters?|book|novel)\b/i,
      defaultMinutes: 180,
      label: 'reading',
      phases: [
        { name: 'Reading', weight: 0.5 },
        { name: 'Reading', weight: 0.5 }
      ]
    },
    {
      id: 'build',
      test: /\b(project|build|app|website|prototype|experiment|lab|model|design)\b/i,
      defaultMinutes: 360,
      label: 'project work',
      phases: [
        { name: 'Research', weight: 0.20 },
        { name: 'Plan the approach', weight: 0.15 },
        { name: 'Build', weight: 0.40 },
        { name: 'Review and test', weight: 0.15 },
        { name: 'Final preparation', weight: 0.10 }
      ]
    }
  ];

  var DEFAULT_TEMPLATE = {
    id: 'general',
    defaultMinutes: 180,
    label: 'general preparation',
    phases: [
      { name: 'Prepare', weight: 0.25 },
      { name: 'Main work', weight: 0.50 },
      { name: 'Review', weight: 0.25 }
    ]
  };

  function templateFor(title) {
    for (var i = 0; i < TEMPLATES.length; i++) {
      if (TEMPLATES[i].test.test(title)) return TEMPLATES[i];
    }
    return DEFAULT_TEMPLATE;
  }

  /* Turn phase weights into a per-session phase label, so session 3 of 8 knows
     it belongs to "Draft". */
  function phaseAssignments(phases, sessionCount) {
    var out = [];
    var cursor = 0;
    phases.forEach(function (phase, i) {
      var n = Math.max(1, Math.round(phase.weight * sessionCount));
      for (var k = 0; k < n && out.length < sessionCount; k++) out.push(phase.name);
      cursor += n;
    });
    // Pad or trim to exactly sessionCount.
    while (out.length < sessionCount) out.push(phases[phases.length - 1].name);
    return out.slice(0, sessionCount);
  }

  /* Build a full plan. Nothing is written; this is a proposal. */
  function plan(opts) {
    opts = opts || {};
    var title = String(opts.title || 'Project').trim();
    var deadline = opts.deadline || null;
    var now = DX.nowWall();

    if (!deadline) return { ok: false, reason: 'no-deadline' };
    if (deadline < now) return { ok: false, reason: 'past-deadline' };

    var template = opts.template || templateFor(title);
    var total = opts.totalMinutes || template.defaultMinutes;

    // Leave the deadline day itself clear of new work where possible: finishing
    // the night before beats finishing an hour before.
    var workUntil = opts.useDeadlineDay
      ? T.endOfDay(deadline)
      : T.endOfDay(T.addDays(T.startOfDay(deadline), -1));
    if (workUntil < now) workUntil = T.endOfDay(deadline);

    var daysAvailable = Math.max(1, T.diffDays(T.startOfDay(now), T.startOfDay(workUntil)) + 1);
    var shape = JV.SCHEDULER.planShape(total, daysAvailable, opts);
    var phases = phaseAssignments(template.phases, shape.count);

    var distribution = JV.SCHEDULER.distribute({
      totalMinutes: total,
      deadline: workUntil,
      title: title,
      sessionMinutes: shape.length,
      maxPerDay: shape.perDay,
      anyTime: !!opts.anyTime,
      preferred: opts.preferred,
      titleFor: function (i) { return title + ' — ' + phases[i]; },
      phaseFor: function (i) { return phases[i]; }
    });

    var notes = distribution.notes.slice();
    notes.push('Phases come from JARVIS’s built-in ' + template.label + ' structure, not from the web.');
    if (!opts.useDeadlineDay && distribution.sessions.length) {
      notes.push('The deadline day itself is left clear.');
    }

    return {
      ok: true,
      title: title,
      deadline: deadline,
      template: template,
      phases: template.phases.map(function (p) { return p.name; }),
      sessions: distribution.sessions,
      totalMinutes: total,
      placedMinutes: distribution.placedMinutes,
      shortfall: distribution.shortfall,
      notes: notes
    };
  }

  /* Write the plan: a project, a deadline, and the linked work sessions.
     Returns ids so the caller can verify each one actually landed. */
  function commit(planned) {
    var projectId = null;
    var deadlineId = null;

    S.commit('JARVIS planned “' + planned.title + '”', function (st) {
      var project = M.makeProject({
        name: planned.title,
        due: T.iso(planned.deadline),
        description: 'Planned by JARVIS · ' + planned.phases.join(' → ')
      });
      st.projects.push(project);
      projectId = project.id;

      var deadline = M.makeDeadline({
        title: planned.title + ' due',
        due: T.iso(planned.deadline),
        hasDueTime: false,
        projectId: project.id,
        description: 'Created with the JARVIS plan for this project.'
      });
      st.deadlines.push(deadline);
      deadlineId = deadline.id;
    }, ['projects', 'deadlines']);

    var eventIds = JV.SCHEDULER.commitSessions(planned.sessions, {
      projectId: projectId,
      description: 'Part of the JARVIS plan for ' + planned.title
    });

    return { projectId: projectId, deadlineId: deadlineId, eventIds: eventIds };
  }

  function verify(result, planned) {
    var checks = [];
    if (!S.get('projects', result.projectId)) checks.push('the project was not created');
    if (!S.get('deadlines', result.deadlineId)) checks.push('the deadline was not created');
    var missing = result.eventIds.filter(function (id) { return !S.get('events', id); });
    if (missing.length) checks.push(missing.length + ' of ' + result.eventIds.length + ' sessions are missing');

    if (checks.length) return { ok: false, detail: 'Verification failed: ' + checks.join('; ') };
    return {
      ok: true,
      detail: 'Confirmed: project, deadline and ' + result.eventIds.length +
        ' session' + (result.eventIds.length === 1 ? '' : 's') + ' are on the calendar'
    };
  }

  JV.PROJECTS = {
    plan: plan,
    commit: commit,
    verify: verify,
    templateFor: templateFor,
    TEMPLATES: TEMPLATES
  };
})(window);
