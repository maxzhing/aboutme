/* Cadence · JARVIS — the Cadence tool belt.

   Where the Python JARVIS shipped filesystem/shell/http tools, the Cadence
   build ships tools over the user's own calendar, tasks, notes and plans.
   Every tool is a thin, validated wrapper over the app's existing Q (reads),
   SCHED (scheduling intelligence), NLP (language parsing) and A (mutations)
   modules — so the assistant is not a second, divergent implementation of the
   app's rules. It drives the same engine the buttons drive.

   Read tools run freely. Write tools are declared `mutates:true` and, under
   dry-run, return a proposal the console renders for approval. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};

  /* ------------------------------------------------------------ helpers */

  function nowWall() { return T.nowWall(); }

  /* Accepts 'today', 'tomorrow', 'monday', '2026-03-04', or a natural phrase
     NLP can date. Falls back to today rather than throwing, because a vague
     date is a reason to answer about today, not to fail. */
  function resolveDay(text) {
    var now = nowWall();
    if (!text) return T.startOfDay(now);
    var s = String(text).trim().toLowerCase();
    if (s === 'today' || s === 'now') return T.startOfDay(now);
    if (s === 'tomorrow') return T.startOfDay(T.addDays(now, 1));
    if (s === 'yesterday') return T.startOfDay(T.addDays(now, -1));
    var iso = /^\d{4}-\d{2}-\d{2}/.exec(s);
    if (iso) {
      var d = T.fromKey ? T.fromKey(iso[0]) : new Date(iso[0] + 'T00:00:00');
      if (d && !isNaN(d)) return T.startOfDay(d);
    }
    var dayIndex = T.DAY_NAMES.map(function (n) { return n.toLowerCase(); }).indexOf(s);
    if (dayIndex >= 0) {
      var cur = T.startOfDay(now);
      for (var i = 0; i < 7; i++) {
        var cand = T.addDays(cur, i);
        if (cand.getDay() === dayIndex) return cand;
      }
    }
    // Let the app's own parser have a go before giving up.
    try {
      var parsed = NLP.parse(s, { settings: S.settings() });
      if (parsed && parsed.startWall) return T.startOfDay(parsed.startWall);
      if (parsed && parsed.dueWall) return T.startOfDay(parsed.dueWall);
    } catch (err) { /* fall through to today */ }
    return T.startOfDay(now);
  }

  function fmtDay(d) { return T.relativeDay(d) || T.fmtDate(d); }
  function fmtClock(d) { return T.fmtTime(d, S.settings().use24Hour); }

  /* Words that carry no identifying signal. Without this list, "for the essay"
     matches any title containing "the", which is nearly all of them. */
  var STOPWORDS = {
    the: 1, for: 1, and: 1, with: 1, that: 1, this: 1, from: 1, into: 1,
    my: 1, our: 1, your: 1, a: 1, an: 1, of: 1, on: 1, in: 1, to: 1, at: 1,
    task: 1, tasks: 1, item: 1, thing: 1, some: 1, about: 1
  };

  /* Fuzzy-resolve a task by title. Exact match wins, then prefix, then
     substring, then overlap on meaningful words only — so "finish the deck"
     finds "Finish slide deck" without a fuzzy-search dependency, and
     "for the essay" does not match the first task containing "the". */
  function findTask(query) {
    if (!query) return null;
    var q = String(query).trim().toLowerCase()
      .replace(/^(for|on|with|about)\s+/, '')
      .replace(/^(the|my|a|an)\s+/, '')
      .trim();
    if (!q) return null;

    var tasks = Q.activeTasks();
    var byId = S.get('tasks', query);
    if (byId) return byId;

    var exact = tasks.filter(function (t) { return t.title.toLowerCase() === q; });
    if (exact.length) return exact[0];
    var prefix = tasks.filter(function (t) { return t.title.toLowerCase().indexOf(q) === 0; });
    if (prefix.length) return prefix[0];
    var sub = tasks.filter(function (t) { return t.title.toLowerCase().indexOf(q) >= 0; });
    if (sub.length) return sub[0];

    var terms = q.split(/\s+/).filter(function (w) {
      return w.length > 2 && !STOPWORDS[w];
    });
    if (!terms.length) return null;

    var scored = tasks.map(function (t) {
      var title = t.title.toLowerCase();
      var hits = terms.filter(function (w) { return title.indexOf(w) >= 0; }).length;
      return { task: t, hits: hits };
    }).filter(function (r) { return r.hits > 0; });

    scored.sort(function (a, b) { return b.hits - a.hits; });
    // One weak hit out of several terms is a coincidence, not a match. Saying
    // "which did you mean?" beats confidently scheduling the wrong thing.
    if (!scored.length) return null;
    if (scored[0].hits === 1 && terms.length > 2) return null;
    return scored[0].task;
  }

  function taskLine(t) {
    var bits = [t.title];
    if (t.due) bits.push('due ' + fmtDay(T.w(t.due)));
    if (t.priority && t.priority !== 'medium') bits.push(t.priority + ' priority');
    return bits.join(' · ');
  }

  function eventLine(e) {
    if (e.allDay) return e.title + ' · all day';
    return fmtClock(e.startWall) + '–' + fmtClock(e.endWall) + ' · ' + e.title;
  }

  /* -------------------------------------------------------------- build */

  function build() {
    var reg = new JV.ToolRegistry();

    /* ---------------------------------------------------------- reads */

    reg.define({
      name: 'agenda',
      description: 'Show what is scheduled on a given day, with the tasks due that day.',
      permission: 'calendar.read',
      inputSchema: { date: { type: 'string' } },
      run: function (ctx, args) {
        var day = resolveDay(args.date);
        var events = Q.eventsOnDay(day, { ignoreLayers: true });
        var timed = events.filter(function (e) { return !e.allDay; })
          .sort(function (a, b) { return a.startWall - b.startWall; });
        var allDay = events.filter(function (e) { return e.allDay; });
        var due = Q.tasksDueOn(day).filter(function (t) { return t.status !== 'completed'; });
        var free = SCHED.freeMinutes(day, {});
        return {
          kind: 'agenda',
          day: day,
          dayLabel: fmtDay(day),
          events: timed, allDay: allDay, tasks: due,
          freeMinutes: free,
          headline: timed.length || allDay.length || due.length
            ? fmtDay(day) + ': ' + timed.length + ' event' + (timed.length === 1 ? '' : 's') +
              (due.length ? ', ' + due.length + ' task' + (due.length === 1 ? '' : 's') + ' due' : '')
            : 'Nothing scheduled ' + fmtDay(day).toLowerCase() + '.',
          lines: timed.map(eventLine).concat(allDay.map(function (e) { return e.title + ' · all day'; }))
            .concat(due.map(function (t) { return 'Task: ' + t.title; }))
        };
      }
    });

    reg.define({
      name: 'find_time',
      description: 'Find open slots of a given length in the coming days.',
      permission: 'calendar.read',
      inputSchema: {
        minutes: { type: 'number', required: true },
        days: { type: 'number' },
        before: { type: 'string' },
        anyTime: { type: 'boolean' }
      },
      run: function (ctx, args) {
        var before = args.before ? T.iso(T.endOfDay(resolveDay(args.before))) : null;
        var slots = SCHED.findTime(args.minutes, {
          days: args.days || 14, limit: 6, before: before, anyTime: !!args.anyTime
        });
        return {
          kind: 'slots',
          minutes: args.minutes,
          slots: slots,
          headline: slots.length
            ? 'Found ' + slots.length + ' slot' + (slots.length === 1 ? '' : 's') +
              ' for ' + T.humanDuration(args.minutes) + '.'
            : 'No open ' + T.humanDuration(args.minutes) + ' slot in the next ' +
              (args.days || 14) + ' days.',
          lines: slots.map(function (s) {
            return fmtDay(s.start) + ' ' + fmtClock(s.start) + '–' + fmtClock(s.end) +
              (s.reasons && s.reasons.length ? ' (' + s.reasons.slice(0, 2).join(', ') + ')' : '');
          })
        };
      }
    });

    reg.define({
      name: 'what_now',
      description: 'Decide what the user should work on at this moment.',
      permission: 'calendar.read',
      inputSchema: {},
      run: function () {
        var r = SCHED.whatNow(nowWall());
        var lines = [];
        // 'recommend' mode carries `recommendation`; 'partial' carries `partial`;
        // 'in-event' carries the event itself and needs no task at all.
        var suggested = (r.recommendation && r.recommendation.task) ||
          (r.partial && r.partial.task) || null;
        if (suggested) lines.push('Suggested: ' + suggested.title);
        (r.alternatives || []).forEach(function (a) {
          lines.push('Alternative: ' + (a.task ? a.task.title : String(a)));
        });
        if (r.next) lines.push('Next up: ' + r.next.title + ' at ' + fmtClock(r.next.startWall));

        // The raw headline describes the *window* ("you have 3h free"); the
        // useful answer names the work. Lead with the work when there is any.
        var headline = suggested
          ? 'Work on “' + suggested.title + '” — ' + r.headline.charAt(0).toLowerCase() + r.headline.slice(1)
          : r.headline;
        return {
          kind: 'whatnow', result: r,
          headline: headline, detail: r.detail, lines: lines
        };
      }
    });

    reg.define({
      name: 'list_tasks',
      description: 'List tasks by scope: overdue, today, week, inbox, or all.',
      permission: 'tasks.read',
      inputSchema: {
        scope: { type: 'string', enum: ['overdue', 'today', 'week', 'inbox', 'all'] },
        limit: { type: 'number' }
      },
      run: function (ctx, args) {
        var scope = args.scope || 'today';
        var now = nowWall();
        var list;
        switch (scope) {
          case 'overdue': list = Q.overdueTasks(now); break;
          case 'today': list = Q.tasksDueOn(now).filter(function (t) { return t.status !== 'completed'; }); break;
          case 'week': list = Q.tasksDueInRange(T.startOfDay(now), T.endOfDay(T.addDays(now, 6))); break;
          case 'inbox': list = Q.activeTasks().filter(function (t) { return t.status === 'inbox'; }); break;
          default: list = Q.activeTasks();
        }
        list = list.filter(function (t) { return t.status !== 'completed'; });
        if (args.limit) list = list.slice(0, args.limit);
        return {
          kind: 'tasks', scope: scope, tasks: list,
          headline: list.length
            ? list.length + ' ' + (scope === 'all' ? 'open' : scope) + ' task' + (list.length === 1 ? '' : 's')
            : (scope === 'overdue' ? 'Nothing is overdue.' : 'No ' + scope + ' tasks.'),
          lines: list.map(taskLine)
        };
      }
    });

    reg.define({
      name: 'priorities',
      description: 'Rank the open tasks by urgency and importance and explain the order.',
      permission: 'tasks.read',
      inputSchema: { limit: { type: 'number' } },
      run: function (ctx, args) {
        var ranked = SCHED.rankedTasks(nowWall(), { horizonDays: 30 }).slice(0, args.limit || 6);
        return {
          kind: 'ranked', ranked: ranked,
          headline: ranked.length ? 'Ranked by what is most pressing.' : 'Nothing open to rank.',
          lines: ranked.map(function (r, i) {
            return (i + 1) + '. ' + r.task.title +
              (r.reasons && r.reasons.length ? ' — ' + r.reasons.slice(0, 2).join(', ') : '');
          })
        };
      }
    });

    reg.define({
      name: 'conflicts',
      description: 'Find overlapping events in the coming days.',
      permission: 'calendar.read',
      inputSchema: { days: { type: 'number' } },
      run: function (ctx, args) {
        var days = args.days || 7;
        var start = T.startOfDay(nowWall());
        var events = Q.eventsInRange(start, T.endOfDay(T.addDays(start, days - 1)), { ignoreLayers: true });
        var pairs = Q.findConflicts(events);
        return {
          kind: 'conflicts', pairs: pairs,
          headline: pairs.length
            ? pairs.length + ' overlap' + (pairs.length === 1 ? '' : 's') + ' in the next ' + days + ' days.'
            : 'No overlapping events in the next ' + days + ' days.',
          lines: pairs.map(function (p) {
            return fmtDay(p[0].startWall) + ': “' + p[0].title + '” overlaps “' + p[1].title + '”';
          })
        };
      }
    });

    reg.define({
      name: 'workload',
      description: 'Report how busy each of the next few days is.',
      permission: 'calendar.read',
      inputSchema: { days: { type: 'number' } },
      run: function (ctx, args) {
        var days = args.days || 7;
        var start = T.startOfDay(nowWall());
        var rows = [];
        for (var i = 0; i < days; i++) {
          var day = T.addDays(start, i);
          var load = SCHED.dayLoad(day);
          rows.push({ day: day, load: load, free: SCHED.freeMinutes(day, {}) });
        }
        var busiest = rows.slice().sort(function (a, b) {
          return (b.load.busyMinutes || 0) - (a.load.busyMinutes || 0);
        })[0];
        return {
          kind: 'workload', rows: rows,
          headline: busiest
            ? 'Busiest day is ' + fmtDay(busiest.day) + '.'
            : 'No load data.',
          lines: rows.map(function (r) {
            return fmtDay(r.day) + ': ' + T.humanDuration(r.load.busyMinutes || 0) + ' booked, ' +
              T.humanDuration(r.free) + ' free';
          })
        };
      }
    });

    reg.define({
      name: 'deadlines',
      description: 'List upcoming deadlines that are not done.',
      permission: 'tasks.read',
      inputSchema: { limit: { type: 'number' } },
      run: function (ctx, args) {
        var list = Q.upcomingDeadlines(args.limit || 8, nowWall());
        return {
          kind: 'deadlines', deadlines: list,
          headline: list.length ? list.length + ' deadline' + (list.length === 1 ? '' : 's') + ' ahead.' : 'No open deadlines.',
          lines: list.map(function (d) { return d.title + ' · ' + fmtDay(T.w(d.due)); })
        };
      }
    });

    reg.define({
      name: 'week_review',
      description: 'Summarise the past week: what got done, what slipped, where time went.',
      permission: 'calendar.read',
      inputSchema: { start: { type: 'string' } },
      run: function (ctx, args) {
        var start = args.start ? resolveDay(args.start) : T.startOfWeek(T.addDays(nowWall(), -7));
        var r = SCHED.weekReview(start);
        var lines = [
          r.completed.length + ' task' + (r.completed.length === 1 ? '' : 's') + ' completed',
          r.missed.length + ' missed',
          T.humanDuration(r.totalMinutes) + ' in scheduled events'
        ];
        (r.byCategory || []).slice(0, 4).forEach(function (c) {
          lines.push(c.label + ': ' + T.humanDuration(c.minutes));
        });
        return {
          kind: 'review', review: r,
          headline: 'Week of ' + T.fmtDate(r.start),
          lines: lines
        };
      }
    });

    reg.define({
      name: 'search',
      description: 'Search everything: events, tasks, notes, projects, goals, people.',
      permission: 'calendar.read',
      inputSchema: {
        query: { type: 'string', required: true },
        type: { type: 'string' },
        limit: { type: 'number' }
      },
      run: function (ctx, args) {
        var results = SEARCH.search(args.query, { type: args.type || null })
          .slice(0, args.limit || 8);
        return {
          kind: 'search', results: results, query: args.query,
          headline: results.length
            ? results.length + ' match' + (results.length === 1 ? '' : 'es') + ' for “' + args.query + '”'
            : 'Nothing matches “' + args.query + '”.',
          lines: results.map(function (r) {
            return r.doc.type + ': ' + r.doc.title + (r.doc.subtitle ? ' — ' + r.doc.subtitle : '');
          })
        };
      }
    });

    reg.define({
      name: 'recall',
      description: 'Recall what JARVIS has learned about how the user works.',
      permission: 'memory.read',
      inputSchema: { query: { type: 'string', required: true }, k: { type: 'number' } },
      run: function (ctx, args) {
        var mem = JV.assistant && JV.assistant.memory;
        if (!mem) return { kind: 'memory', hits: [], headline: 'Memory is not available.', lines: [] };
        var hits = mem.retrieveAll(args.query, args.k || 4);
        return {
          kind: 'memory', hits: hits,
          headline: hits.length ? 'Recalled ' + hits.length + ' relevant note' + (hits.length === 1 ? '' : 's') + '.'
            : 'Nothing relevant in memory yet.',
          lines: hits.map(function (h) { return h.doc.text; })
        };
      }
    });

    /* --------------------------------------------------------- writes */

    reg.define({
      name: 'create_event',
      description: 'Create a calendar event from a plain-language phrase.',
      permission: 'calendar.write',
      mutates: true,
      inputSchema: { text: { type: 'string', required: true } },
      run: function (ctx, args) {
        var parsed = NLP.parse(args.text, { settings: S.settings() });
        parsed.type = 'event';
        var payload = NLP.toPayload(parsed);
        if (!payload.title) throw new JV.ToolError('I could not find an event title in that.');
        var startWall = payload.start ? T.w(payload.start) : null;
        var detail = startWall
          ? fmtDay(startWall) + ' at ' + fmtClock(startWall) +
            (payload.end ? '–' + fmtClock(T.w(payload.end)) : '')
          : 'No time detected — it will be created as written.';
        if (!ctx.dryRun) return { created: A.createEvent(payload), payload: payload };
        return JV.proposal({
          title: 'Create event “' + payload.title + '”',
          detail: detail,
          items: [payload.title + ' · ' + detail],
          commit: function () { return A.createEvent(payload); }
        });
      }
    });

    reg.define({
      name: 'create_task',
      description: 'Create a task from a plain-language phrase.',
      permission: 'tasks.write',
      mutates: true,
      inputSchema: { text: { type: 'string', required: true } },
      run: function (ctx, args) {
        var parsed = NLP.parse(args.text, { settings: S.settings() });
        parsed.type = 'task';
        var payload = NLP.toPayload(parsed);
        if (!payload.title) throw new JV.ToolError('I could not find a task title in that.');
        var detail = payload.due ? 'Due ' + fmtDay(T.w(payload.due)) : 'No due date';
        if (!ctx.dryRun) return { created: A.createTask(payload), payload: payload };
        return JV.proposal({
          title: 'Create task “' + payload.title + '”',
          detail: detail,
          items: [payload.title + ' · ' + detail],
          commit: function () { return A.createTask(payload); }
        });
      }
    });

    reg.define({
      name: 'create_note',
      description: 'Write a note.',
      permission: 'notes.write',
      mutates: true,
      inputSchema: { title: { type: 'string', required: true }, body: { type: 'string' } },
      run: function (ctx, args) {
        var payload = { title: args.title, body: args.body || '' };
        if (!ctx.dryRun) return { created: A.createNote(payload) };
        return JV.proposal({
          title: 'Write note “' + args.title + '”',
          detail: args.body ? args.body.slice(0, 140) : 'Empty note',
          commit: function () { return A.createNote(payload); }
        });
      }
    });

    reg.define({
      name: 'create_deadline',
      description: 'Create a deadline from a plain-language phrase.',
      permission: 'tasks.write',
      mutates: true,
      inputSchema: { text: { type: 'string', required: true } },
      run: function (ctx, args) {
        var parsed = NLP.parse(args.text, { settings: S.settings() });
        parsed.type = 'deadline';
        var payload = NLP.toPayload(parsed);
        if (!payload.title) throw new JV.ToolError('I could not find a deadline title in that.');
        if (!payload.due) throw new JV.ToolError('A deadline needs a date — try “report due Friday”.');
        var detail = 'Due ' + fmtDay(T.w(payload.due));
        if (!ctx.dryRun) return { created: A.createDeadline(payload) };
        return JV.proposal({
          title: 'Create deadline “' + payload.title + '”',
          detail: detail,
          commit: function () { return A.createDeadline(payload); }
        });
      }
    });

    reg.define({
      name: 'capture',
      description: 'Drop a raw thought into the inbox to sort out later.',
      permission: 'tasks.write',
      mutates: true,
      inputSchema: { text: { type: 'string', required: true } },
      run: function (ctx, args) {
        if (!ctx.dryRun) return { created: A.addCapture(args.text) };
        return JV.proposal({
          title: 'Save to inbox',
          detail: args.text,
          commit: function () { return A.addCapture(args.text); }
        });
      }
    });

    reg.define({
      name: 'organize',
      description: 'Turn a messy brain dump into separate events, tasks and deadlines.',
      permission: 'tasks.write',
      mutates: true,
      inputSchema: { text: { type: 'string', required: true } },
      run: function (ctx, args) {
        var items = NLP.organize(args.text, { settings: S.settings() })
          .filter(function (i) { return i.payload && i.payload.title; });
        if (!items.length) throw new JV.ToolError('I could not pull anything structured out of that.');
        var lines = items.map(function (i) { return i.type + ': ' + i.payload.title; });
        if (!ctx.dryRun) return { created: A.applyOrganized(items, null), items: items };
        return JV.proposal({
          title: 'Add ' + items.length + ' item' + (items.length === 1 ? '' : 's'),
          detail: 'Parsed from your text.',
          items: lines,
          commit: function () { return A.applyOrganized(items, null); }
        });
      }
    });

    reg.define({
      name: 'schedule_task',
      description: 'Find time for an existing task and block it on the calendar.',
      permission: 'calendar.write',
      mutates: true,
      inputSchema: {
        task: { type: 'string', required: true },
        minutes: { type: 'number' },
        before: { type: 'string' }
      },
      run: function (ctx, args) {
        var task = findTask(args.task);
        if (!task) throw new JV.ToolError('I could not find an open task matching “' + args.task + '”.');
        var minutes = args.minutes || Q.taskEstimate(task);
        var slots = SCHED.findTime(minutes, {
          days: 14, limit: 3,
          before: args.before ? T.iso(T.endOfDay(resolveDay(args.before))) : null
        });
        if (!slots.length) throw new JV.ToolError('No open ' + T.humanDuration(minutes) + ' slot for “' + task.title + '”.');
        var slot = slots[0];
        var when = fmtDay(slot.start) + ' at ' + fmtClock(slot.start);
        if (!ctx.dryRun) return { scheduled: A.scheduleTask(task.id, slot.start, minutes), when: when };
        return JV.proposal({
          title: 'Schedule “' + task.title + '”',
          detail: when + ' for ' + T.humanDuration(minutes),
          items: slots.slice(1).map(function (s) {
            return 'Alternative: ' + fmtDay(s.start) + ' ' + fmtClock(s.start);
          }),
          commit: function () { return A.scheduleTask(task.id, slot.start, minutes); }
        });
      }
    });

    reg.define({
      name: 'complete_task',
      description: 'Mark a task done.',
      permission: 'tasks.write',
      mutates: true,
      inputSchema: { task: { type: 'string', required: true } },
      run: function (ctx, args) {
        var task = findTask(args.task);
        if (!task) throw new JV.ToolError('I could not find an open task matching “' + args.task + '”.');
        if (!ctx.dryRun) return { completed: A.completeTask(task.id, true) };
        return JV.proposal({
          title: 'Complete “' + task.title + '”',
          detail: 'Marks the task done.',
          commit: function () { return A.completeTask(task.id, true); }
        });
      }
    });

    reg.define({
      name: 'break_down_task',
      description: 'Split a large task into smaller subtasks.',
      permission: 'tasks.write',
      mutates: true,
      inputSchema: { task: { type: 'string', required: true }, steps: { type: 'array' } },
      run: function (ctx, args) {
        var task = findTask(args.task);
        if (!task) throw new JV.ToolError('I could not find an open task matching “' + args.task + '”.');
        var steps = (args.steps || []).filter(Boolean);
        if (!steps.length) {
          // A generic but honest skeleton the user then edits — better than
          // pretending to know the shape of work we have never seen.
          steps = ['Outline ' + task.title, 'Draft the first pass', 'Review and revise', 'Finish and file'];
        }
        if (!ctx.dryRun) return { broken: A.breakDownTask(task.id, steps) };
        return JV.proposal({
          title: 'Break down “' + task.title + '”',
          detail: steps.length + ' subtasks',
          items: steps,
          commit: function () { return A.breakDownTask(task.id, steps); }
        });
      }
    });

    reg.define({
      name: 'plan_day',
      description: 'Build a schedule for a day by fitting the top tasks into open time.',
      permission: 'calendar.write',
      mutates: true,
      timeoutMs: 12000,
      inputSchema: { date: { type: 'string' } },
      run: function (ctx, args) {
        var day = resolveDay(args.date);
        var plan = SCHED.planDay(day, {});
        var blocks = (plan.proposed || []).filter(function (p) { return p.selected !== false; });
        if (!blocks.length) {
          return {
            kind: 'plan', plan: plan,
            headline: 'Nothing to schedule for ' + fmtDay(day).toLowerCase() + '.',
            lines: (plan.warnings || []).map(function (w) { return w.text; })
          };
        }
        var lines = blocks.map(function (b) {
          return fmtClock(b.start) + '–' + fmtClock(b.end) + ' · ' + b.title;
        });
        if (!ctx.dryRun) return { applied: applyPlan(blocks) };
        return JV.proposal({
          title: 'Plan ' + fmtDay(day).toLowerCase(),
          detail: blocks.length + ' block' + (blocks.length === 1 ? '' : 's') + ', ' +
            T.humanDuration(plan.stats.remainingFree) + ' left free',
          items: lines.concat((plan.warnings || []).map(function (w) { return w.text; })),
          commit: function () { return applyPlan(blocks); }
        });
      }
    });

    reg.define({
      name: 'plan_week',
      description: 'Build a schedule across the next seven days.',
      permission: 'calendar.write',
      mutates: true,
      timeoutMs: 20000,
      inputSchema: { start: { type: 'string' } },
      run: function (ctx, args) {
        var start = args.start ? resolveDay(args.start) : T.startOfDay(nowWall());
        var days = SCHED.planWeek(start, {});
        var blocks = [];
        days.forEach(function (plan) {
          (plan.proposed || []).filter(function (p) { return p.selected !== false; })
            .forEach(function (b) { blocks.push(b); });
        });
        if (!blocks.length) {
          return {
            kind: 'plan', days: days,
            headline: 'No open time to plan into this week.', lines: []
          };
        }
        var lines = blocks.map(function (b) {
          return fmtDay(b.start) + ' ' + fmtClock(b.start) + '–' + fmtClock(b.end) + ' · ' + b.title;
        });
        if (!ctx.dryRun) return { applied: applyPlan(blocks) };
        return JV.proposal({
          title: 'Plan the week',
          detail: blocks.length + ' block' + (blocks.length === 1 ? '' : 's') + ' across ' +
            days.length + ' day' + (days.length === 1 ? '' : 's'),
          items: lines,
          commit: function () { return applyPlan(blocks); }
        });
      }
    });

    reg.define({
      name: 'remember',
      description: 'Store a durable fact about how the user works.',
      permission: 'memory.write',
      mutates: true,
      inputSchema: { text: { type: 'string', required: true } },
      run: function (ctx, args) {
        var mem = JV.assistant && JV.assistant.memory;
        if (!mem) throw new JV.ToolError('Memory is not available.');
        if (!ctx.dryRun) {
          mem.semantic.remember(args.text, { source: 'user' });
          if (JV.assistant.persist) JV.assistant.persist();
          return { remembered: args.text };
        }
        return JV.proposal({
          title: 'Remember this',
          detail: args.text,
          undoable: false,
          commit: function () {
            mem.semantic.remember(args.text, { source: 'user' });
            if (JV.assistant.persist) JV.assistant.persist();
            return { remembered: args.text };
          }
        });
      }
    });

    return reg;
  }

  /* Commit a set of planned blocks. Tasks get scheduled through the app's own
     scheduleTask so the task↔event link is maintained; pure breaks become
     plain events. */
  function applyPlan(blocks) {
    var count = 0;
    blocks.forEach(function (b) {
      if (b.task) {
        A.scheduleTask(b.task.id, b.start, b.minutes);
      } else {
        A.createEvent({
          title: b.title,
          start: T.iso(b.start),
          end: T.iso(b.end),
          calendarId: 'cal_personal',
          type: 'block'
        }, { silent: true });
      }
      count++;
    });
    return { blocks: count };
  }

  JV.buildToolbelt = build;
  JV.resolveDay = resolveDay;
  JV.findTask = findTask;
})(window);
