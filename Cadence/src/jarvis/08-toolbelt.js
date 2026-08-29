/* Cadence · JARVIS — the tool belt.

   Every capability JARVIS has over the user's calendar, namespaced the way the
   product talks about them: `calendar.*` reads and writes, `plan.*` for the
   thinking, `memory.*` for what it remembers.

   Two rules hold throughout:

   1. Reads run freely. Writes are `mutates: true`, return a proposal under
      dry-run, and pair their commit with a `verify` that re-reads the store.
      "Done" is only ever said after the data has been read back.
   2. Nothing is invented. A tool that cannot do the job raises, and the
      failure is reported as a failure. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};
  var DX = JV.DX;

  function build() {
    var reg = new JV.ToolRegistry();
    var def = function (spec) { reg.define(spec); };

    /* =================================================== calendar reads */

    def({
      name: 'calendar.get_day',
      description: 'Everything happening on one day, with the tasks due that day.',
      permission: 'calendar.read',
      inputSchema: { date: { type: 'string' } },
      run: function (ctx, args) { return dayReport(DX.dayOrToday(args.date)); }
    });

    def({
      name: 'calendar.get_events',
      description: 'Events across a date range.',
      permission: 'calendar.read',
      inputSchema: { range: { type: 'string' }, start: { type: 'string' }, end: { type: 'string' } },
      run: function (ctx, args) {
        var r = args.start
          ? { start: DX.dayOrToday(args.start), end: T.endOfDay(DX.dayOrToday(args.end || args.start)), label: 'that range' }
          : DX.parseRange(args.range);
        return rangeReport(r.start, r.end, r.label);
      }
    });

    def({
      name: 'calendar.get_week',
      description: 'The whole week, day by day.',
      permission: 'calendar.read',
      inputSchema: { start: { type: 'string' } },
      run: function (ctx, args) {
        var start = args.start ? DX.dayOrToday(args.start) : T.startOfWeek(DX.nowWall());
        return rangeReport(start, T.endOfDay(T.addDays(start, 6)), 'this week', true);
      }
    });

    def({
      name: 'calendar.get_month',
      description: 'The month at a glance.',
      permission: 'calendar.read',
      inputSchema: { month: { type: 'string' } },
      run: function (ctx, args) {
        var anchor = args.month ? DX.dayOrToday(args.month) : DX.nowWall();
        return rangeReport(T.startOfMonth(anchor), T.endOfMonth(anchor), T.fmtMonthYear(anchor));
      }
    });

    def({
      name: 'calendar.find_free_time',
      description: 'Find open slots of a given length in the coming days.',
      permission: 'calendar.read',
      inputSchema: {
        minutes: { type: 'number', required: true },
        days: { type: 'number' }, before: { type: 'string' }, anyTime: { type: 'boolean' }
      },
      run: function (ctx, args) {
        var before = args.before ? DX.parseDay(args.before) : null;
        var slots = SCHED.findTime(args.minutes, {
          days: args.days || 14, limit: 6,
          before: before ? T.iso(T.endOfDay(before)) : null,
          anyTime: !!args.anyTime
        });
        return {
          kind: 'slots', slots: slots, minutes: args.minutes,
          headline: slots.length
            ? 'Found ' + slots.length + ' opening' + (slots.length === 1 ? '' : 's') + ' of ' + DX.hours(args.minutes) + '.'
            : 'No open ' + DX.hours(args.minutes) + ' slot' + (before ? ' before ' + DX.fmtDay(before) : '') + '.',
          lines: slots.map(function (s) {
            return DX.fmtDay(s.start) + ' ' + DX.fmtSpan(s.start, s.end) +
              (s.reasons && s.reasons.length ? ' · ' + s.reasons.slice(0, 2).join(', ') : '');
          })
        };
      }
    });

    def({
      name: 'calendar.find_conflicts',
      description: 'Find overlapping events.',
      permission: 'calendar.read',
      inputSchema: { days: { type: 'number' } },
      run: function (ctx, args) {
        var days = args.days || 7;
        var start = T.startOfDay(DX.nowWall());
        var events = Q.eventsInRange(start, T.endOfDay(T.addDays(start, days - 1)), { ignoreLayers: true });
        var pairs = Q.findConflicts(events);
        return {
          kind: 'conflicts', pairs: pairs,
          refs: pairs.slice(0, 4).map(function (p) { return DX.ref('event', p[0]); }),
          headline: pairs.length
            ? pairs.length + ' overlap' + (pairs.length === 1 ? '' : 's') + ' in the next ' + days + ' days.'
            : 'No overlapping events in the next ' + days + ' days.',
          lines: pairs.map(function (p) {
            return DX.fmtDay(p[0].startWall) + ' ' + DX.fmtClock(p[0].startWall) +
              ': “' + p[0].title + '” overlaps “' + p[1].title + '”';
          })
        };
      }
    });

    def({
      name: 'calendar.search',
      description: 'Search events, tasks, notes, projects, goals and people.',
      permission: 'calendar.read',
      inputSchema: {
        query: { type: 'string', required: true }, type: { type: 'string' },
        limit: { type: 'number' }, range: { type: 'string' }
      },
      run: function (ctx, args) {
        var results = SEARCH.search(args.query, { type: args.type || null });

        // "…this month" is a filter, not part of the query text.
        var window = args.range ? DX.parseRange(args.range) : null;
        if (window) {
          results = results.filter(function (r) {
            var when = r.doc.when || (r.doc.item && r.doc.item.due ? T.w(r.doc.item.due) : null);
            return when ? (when >= window.start && when <= window.end) : false;
          });
        }
        results = results.slice(0, args.limit || 8);

        return {
          kind: 'search', results: results, query: args.query,
          scope: window ? window.label : null,
          refs: results.slice(0, 6).map(function (r) { return DX.ref(r.doc.type, r.doc.item, r.doc.title); }),
          headline: results.length
            ? results.length + ' match' + (results.length === 1 ? '' : 'es') + ' for “' + args.query + '”' +
              (window ? ' ' + window.label : '')
            : 'Nothing matches “' + args.query + '”' + (window ? ' ' + window.label : '') + '.',
          lines: results.map(function (r) {
            return r.doc.type + ': ' + r.doc.title + (r.doc.subtitle ? ' — ' + r.doc.subtitle : '');
          })
        };
      }
    });

    def({
      name: 'calendar.list_tasks',
      description: 'List tasks by scope: overdue, today, week, inbox or all.',
      permission: 'tasks.read',
      inputSchema: { scope: { type: 'string', enum: ['overdue', 'today', 'week', 'inbox', 'all'] }, limit: { type: 'number' } },
      run: function (ctx, args) {
        var scope = args.scope || 'today';
        var now = DX.nowWall();
        var list;
        switch (scope) {
          case 'overdue': list = Q.overdueTasks(now); break;
          case 'today': list = Q.tasksDueOn(now); break;
          case 'week': list = Q.tasksDueInRange(T.startOfDay(now), T.endOfDay(T.addDays(now, 6))); break;
          case 'inbox': list = Q.activeTasks().filter(function (t) { return t.status === 'inbox'; }); break;
          default: list = Q.activeTasks();
        }
        list = list.filter(function (t) { return t.status !== 'completed'; });
        if (args.limit) list = list.slice(0, args.limit);
        return {
          kind: 'tasks', tasks: list, scope: scope,
          refs: list.slice(0, 8).map(function (t) { return DX.ref('task', t); }),
          headline: list.length
            ? list.length + ' ' + (scope === 'all' ? 'open' : scope) + ' task' + (list.length === 1 ? '' : 's')
            : (scope === 'overdue' ? 'Nothing is overdue.' : 'No ' + scope + ' tasks.'),
          lines: list.map(DX.taskLine)
        };
      }
    });

    def({
      name: 'calendar.deadlines',
      description: 'Upcoming deadlines that are not done.',
      permission: 'tasks.read',
      inputSchema: { limit: { type: 'number' } },
      run: function (ctx, args) {
        var list = Q.upcomingDeadlines(args.limit || 8, DX.nowWall());
        return {
          kind: 'deadlines', deadlines: list,
          refs: list.slice(0, 6).map(function (d) { return DX.ref('deadline', d); }),
          headline: list.length ? list.length + ' deadline' + (list.length === 1 ? '' : 's') + ' ahead.' : 'No open deadlines.',
          lines: list.map(function (d) {
            var days = T.diffDays(DX.nowWall(), T.w(d.due));
            return d.title + ' · ' + DX.fmtDay(T.w(d.due)) + (days >= 0 ? ' (' + days + 'd)' : ' (overdue)');
          })
        };
      }
    });

    def({
      name: 'calendar.workload',
      description: 'How busy each of the next few days is.',
      permission: 'calendar.read',
      inputSchema: { days: { type: 'number' } },
      run: function (ctx, args) {
        var days = args.days || 7;
        var start = T.startOfDay(DX.nowWall());
        var stats = JV.OPTIMIZE.windowStats(start, T.endOfDay(T.addDays(start, days - 1)));
        var rows = [];
        for (var i = 0; i < days; i++) {
          var day = T.addDays(start, i);
          rows.push({ day: day, load: SCHED.dayLoad(day), free: SCHED.freeMinutes(day, {}) });
        }
        return {
          kind: 'workload', rows: rows, stats: stats,
          headline: stats.busiest
            ? DX.fmtDay(stats.busiest.day) + ' is your busiest day · ' +
              stats.events + ' events, ' + DX.hours(stats.freeMinutes) + ' free across ' + days + ' days'
            : 'Nothing scheduled in this window.',
          lines: rows.map(function (r) {
            return DX.fmtDay(r.day) + ': ' + DX.hours(r.load.busyMinutes || 0) + ' booked, ' + DX.hours(r.free) + ' free';
          })
        };
      }
    });

    def({
      name: 'calendar.time_spent',
      description: 'How much time is going to a topic, category or project.',
      permission: 'calendar.read',
      inputSchema: { query: { type: 'string' }, days: { type: 'number' } },
      run: function (ctx, args) {
        var days = args.days || 28;
        var now = DX.nowWall();
        var start = T.startOfDay(T.addDays(now, -days));
        var events = Q.eventsInRange(start, T.endOfDay(now), { ignoreLayers: true })
          .filter(function (e) { return !e.allDay; });

        if (args.query) {
          var hits = events.filter(function (e) { return DX.matchScore(e.title, args.query) >= 0; });
          var mins = hits.reduce(function (a, e) { return a + T.diffMinutes(e.startWall, e.endWall); }, 0);

          // Looking only backwards reads as "you have never done this" when in
          // fact it is all still ahead. Report both.
          var ahead = Q.eventsInRange(now, T.endOfDay(T.addDays(now, 28)), { ignoreLayers: true })
            .filter(function (e) { return !e.allDay && DX.matchScore(e.title, args.query) >= 0; });
          var aheadMins = ahead.reduce(function (a, e) { return a + T.diffMinutes(e.startWall, e.endWall); }, 0);

          var headline;
          if (mins) {
            headline = DX.hours(mins) + ' on “' + args.query + '” over the last ' + days +
              ' days (' + hits.length + ' session' + (hits.length === 1 ? '' : 's') + ')' +
              (aheadMins ? ', with ' + DX.hours(aheadMins) + ' scheduled ahead.' : '.');
          } else if (aheadMins) {
            headline = 'Nothing on “' + args.query + '” in the last ' + days + ' days, but ' +
              DX.hours(aheadMins) + ' is scheduled over the next four weeks.';
          } else {
            headline = 'Nothing matching “' + args.query + '” in the last ' + days + ' days or the next four.';
          }

          return {
            kind: 'timespent', minutes: mins, events: hits, upcomingMinutes: aheadMins,
            refs: hits.concat(ahead).slice(0, 6).map(function (e) { return DX.ref('event', e); }),
            headline: headline,
            lines: hits.slice(0, 6).map(function (e) {
              return DX.fmtDay(e.startWall) + ' · ' + DX.hours(T.diffMinutes(e.startWall, e.endWall)) + ' · ' + e.title;
            }).concat(ahead.slice(0, 6).map(function (e) {
              return 'Upcoming · ' + DX.fmtDay(e.startWall) + ' · ' + DX.hours(T.diffMinutes(e.startWall, e.endWall)) + ' · ' + e.title;
            }))
          };
        }

        var byCat = {};
        events.forEach(function (e) {
          var cat = e.categoryId ? (S.get('categories', e.categoryId) || {}).name : null;
          var label = cat || (S.get('calendars', e.calendarId) || {}).name || 'Other';
          byCat[label] = (byCat[label] || 0) + T.diffMinutes(e.startWall, e.endWall);
        });
        var rows = Object.keys(byCat).map(function (k) { return { label: k, minutes: byCat[k] }; })
          .sort(function (a, b) { return b.minutes - a.minutes; });
        return {
          kind: 'timespent', rows: rows,
          headline: 'Where your last ' + days + ' days went.',
          lines: rows.map(function (r) { return r.label + ': ' + DX.hours(r.minutes); })
        };
      }
    });

    /* ================================================== calendar writes */

    def({
      name: 'calendar.create_event',
      description: 'Create an event from a plain-language phrase.',
      permission: 'calendar.write', mutates: true, lowRisk: true,
      inputSchema: { text: { type: 'string', required: true } },
      run: function (ctx, args) { return createFromText(ctx, args.text, 'event'); }
    });

    def({
      name: 'calendar.create_recurring_event',
      description: 'Create a repeating event ("every Tuesday at 5pm for six weeks").',
      permission: 'calendar.write', mutates: true, lowRisk: true,
      inputSchema: { text: { type: 'string', required: true } },
      run: function (ctx, args) {
        var payload = parseRecurring(args.text);
        if (!payload.title) throw new JV.ToolError('I could not find a title in that.');
        if (!payload.recurrence) {
          throw new JV.ToolError('I could not find a repeat pattern in that — try "every Tuesday at 5pm".');
        }
        var when = payload.start ? DX.fmtDay(T.w(payload.start)) + ' at ' + DX.fmtClock(T.w(payload.start)) : '';
        var detail = R.describe(payload.recurrence) + (when ? ', starting ' + when : '');

        if (!ctx.dryRun) return commitEvent(payload, detail);
        return JV.proposal({
          title: 'Repeat “' + payload.title + '”',
          detail: detail,
          commit: function () { return A.createEvent(payload); },
          verify: function (ev) { return DX.verifyEvents([ev.id]); }
        });
      }
    });

    def({
      name: 'calendar.update_event',
      description: 'Change an event’s title or length.',
      permission: 'calendar.write', mutates: true, lowRisk: true,
      inputSchema: {
        event: { type: 'string', required: true },
        title: { type: 'string' }, minutes: { type: 'number' }
      },
      run: function (ctx, args) {
        var inst = DX.findEvent(args.event);
        if (!inst) throw new JV.ToolError('I could not find an event matching “' + args.event + '”.');
        var patch = {};
        var parts = [];
        if (args.title) { patch.title = args.title; parts.push('rename to “' + args.title + '”'); }
        if (args.minutes) {
          patch.end = T.iso(T.addMinutes(inst.startWall, args.minutes));
          parts.push('set the length to ' + DX.hours(args.minutes));
        }
        if (!parts.length) throw new JV.ToolError('Tell me what to change — a new title or a new length.');

        var id = inst.seriesId || inst.id;
        if (!ctx.dryRun) {
          A.updateEvent(inst, patch, 'this');
          var v = DX.verifyEvents([id]);
          return { kind: 'written', headline: v.detail, verified: v.ok, lines: [] };
        }
        return JV.proposal({
          title: 'Update “' + inst.title + '”',
          detail: parts.join(' and '),
          refs: [DX.ref('event', inst)],
          commit: function () { A.updateEvent(inst, patch, 'this'); return { id: id }; },
          verify: function (out) { return DX.verifyEvents([out.id]); }
        });
      }
    });

    /* "What time is my dentist appointment?" — a specific question about a
       specific thing, which is most of what anyone asks an assistant. */
    def({
      name: 'calendar.describe_item',
      description: 'Answer a question about one thing: when it is, how long, where, what state.',
      permission: 'calendar.read',
      inputSchema: { item: { type: 'string', required: true }, aspect: { type: 'string' } },
      run: function (ctx, args) {
        var hits = DX.findAnything(args.item);
        if (!hits.length) {
          return {
            kind: 'empty',
            headline: 'I could not find anything called “' + args.item + '”.',
            lines: []
          };
        }
        var hit = hits[0];
        DX.setFocus(hit.kind, hit.item, hit.label);
        var it = hit.item;
        var aspect = args.aspect || 'when';
        var lines = [];
        var headline;

        if (hit.kind === 'event') {
          var mins = T.diffMinutes(it.startWall, it.endWall);
          var away = T.diffDays(DX.nowWall(), it.startWall);
          if (aspect === 'duration') {
            headline = '“' + it.title + '” runs for ' + DX.hours(mins) + ' — ' +
              DX.fmtDay(it.startWall) + ' ' + DX.fmtSpan(it.startWall, it.endWall) + '.';
          } else if (aspect === 'where') {
            headline = it.location
              ? '“' + it.title + '” is at ' + it.location + '.'
              : 'No location is set on “' + it.title + '”.';
          } else {
            headline = '“' + it.title + '” is ' + DX.fmtDay(it.startWall) + ' at ' +
              DX.fmtClock(it.startWall) +
              (away === 0 ? ' — today' : away === 1 ? ' — tomorrow' : '') + '.';
          }
          lines.push(DX.fmtDay(it.startWall) + ' ' + DX.fmtSpan(it.startWall, it.endWall) +
            ' · ' + DX.hours(mins));
          if (it.location) lines.push('Location: ' + it.location);
          if (it.description) lines.push(it.description.slice(0, 140));
        } else if (hit.kind === 'task') {
          headline = it.due
            ? '“' + it.title + '” is due ' + DX.fmtDay(T.w(it.due)) + '.'
            : '“' + it.title + '” has no due date.';
          lines.push('Priority: ' + (it.priority || 'medium'));
          lines.push('Estimated ' + DX.hours(Q.taskEstimate(it)));
          if (it.scheduledEventId) {
            var ev = S.get('events', it.scheduledEventId);
            if (ev) lines.push('Blocked out ' + DX.fmtDay(T.w(ev.start)) + ' at ' + DX.fmtClock(T.w(ev.start)));
          } else {
            lines.push('Not on the calendar yet');
          }
        } else if (hit.kind === 'deadline') {
          var days = T.diffDays(DX.nowWall(), T.w(it.due));
          headline = '“' + it.title + '” is due ' + DX.fmtDay(T.w(it.due)) +
            (days >= 0 ? ' — ' + days + ' day' + (days === 1 ? '' : 's') + ' away' : ' — overdue') + '.';
        } else {
          headline = '“' + hit.label + '” is a ' + DX.KIND_NOUN[hit.kind] + '.';
        }

        return {
          kind: 'detail', item: it, itemKind: hit.kind,
          refs: [DX.ref(hit.kind, it, hit.label)],
          headline: headline, lines: lines
        };
      }
    });

    /* "Clear my afternoon" — empty a window rather than a named event. */
    def({
      name: 'calendar.clear_period',
      description: 'Clear a day or part of a day, moving what can move and reporting what cannot.',
      permission: 'calendar.write', mutates: true, timeoutMs: 15000,
      inputSchema: { date: { type: 'string' }, part: { type: 'string' } },
      run: function (ctx, args) {
        var day = DX.dayOrToday(args.date);
        var window = partOfDay(args.part);
        var inWindow = Q.eventsOnDay(day, { ignoreLayers: true }).filter(function (e) {
          if (e.allDay) return false;
          var m = T.minutesOfDay(e.startWall);
          return m >= window.from && m < window.to;
        }).sort(function (a, b) { return a.startWall - b.startWall; });

        if (!inWindow.length) {
          return {
            kind: 'empty',
            headline: 'Your ' + window.label + ' on ' + DX.fmtDay(day).toLowerCase() + ' is already clear.',
            lines: []
          };
        }

        // Only blocks JARVIS or the planner created are safely movable; a real
        // commitment with other people in it is not ours to shuffle silently.
        var movable = inWindow.filter(function (e) { return e.type === 'block'; });
        var fixed = inWindow.filter(function (e) { return e.type !== 'block'; });

        var placements = [];
        var claimed = [];
        movable.forEach(function (e) {
          var mins = T.diffMinutes(e.startWall, e.endWall);
          var slot = firstFreeOutside(day, window, mins, claimed);
          if (!slot) return;
          claimed.push({ start: slot, end: T.addMinutes(slot, mins) });
          placements.push({ inst: e, start: slot, minutes: mins });
        });

        var lines = placements.map(function (p) {
          return '“' + p.inst.title + '” → ' + DX.fmtDay(p.start) + ' ' + DX.fmtClock(p.start);
        });
        if (fixed.length) {
          lines.push('Staying put: ' + fixed.map(function (e) { return '“' + e.title + '”'; }).join(', ') +
            ' — ' + (fixed.length === 1 ? 'that is a real commitment' : 'those are real commitments') + ', not a work block.');
        }

        if (!placements.length) {
          return {
            kind: 'empty',
            headline: 'Nothing in your ' + window.label + ' is mine to move — ' +
              inWindow.map(function (e) { return '“' + e.title + '”'; }).join(', ') +
              (fixed.length ? ' ' + (fixed.length === 1 ? 'is a real commitment.' : 'are real commitments.') : '.'),
            lines: []
          };
        }

        if (!ctx.dryRun) return applyMoves(placements, []);
        return JV.proposal({
          title: 'Clear your ' + window.label + ' on ' + DX.fmtDay(day).toLowerCase(),
          detail: 'Moving ' + placements.length + ' block' + (placements.length === 1 ? '' : 's') +
            (fixed.length ? ', leaving ' + fixed.length + ' commitment' + (fixed.length === 1 ? '' : 's') + ' alone' : ''),
          items: lines,
          refs: inWindow.slice(0, 5).map(function (e) { return DX.ref('event', e); }),
          commit: function () { return applyMoves(placements, []); },
          verify: function (out) {
            var bad = out.moved.filter(function (m) { return !DX.verifyMoved(m.id, m.start).ok; });
            return bad.length
              ? { ok: false, detail: bad.length + ' of ' + out.moved.length + ' moves did not take effect' }
              : { ok: true, detail: 'Moved ' + out.moved.length + ' block' + (out.moved.length === 1 ? '' : 's') + ' out of your ' + window.label + '.' };
          }
        });
      }
    });

    /* One tool for every kind of edit, because a person makes them in one
       sentence: "start at 4 and run for 90 minutes" is a single request. */
    def({
      name: 'calendar.edit_event',
      description: 'Change an event: its time, day, length, or name — in any combination.',
      permission: 'calendar.write', mutates: true, lowRisk: true,
      inputSchema: {
        item: { type: 'string', required: true },
        when: { type: 'number' },          // minutes into the day
        date: { type: 'string' },
        shift: { type: 'number' },         // minutes, signed
        duration: { type: 'number' },      // absolute minutes
        stretch: { type: 'number' },       // signed minutes
        title: { type: 'string' },
        travel: { type: 'number' }         // getting-there time before it starts
      },
      run: function (ctx, args) {
        var hits = DX.findAnything(args.item, { kinds: ['event', 'task', 'deadline'] });
        if (!hits.length) {
          throw new JV.ToolError('I could not find anything called “' + args.item + '”.');
        }
        if (DX.isAmbiguous(hits)) {
          throw new JV.ToolError('More than one thing matches “' + args.item + '”: ' +
            hits.slice(0, 3).map(function (h) { return '“' + h.label + '”'; }).join(', ') +
            '. Which did you mean?');
        }
        var hit = hits[0];
        DX.setFocus(hit.kind, hit.item, hit.label);
        if (hit.kind !== 'event') return editNonEvent(ctx, hit, args);

        var inst = hit.item;
        var id = inst.seriesId || inst.id;
        var oldStart = inst.startWall;
        var oldMinutes = T.diffMinutes(inst.startWall, inst.endWall);

        // Work out the new start.
        var start = new Date(oldStart);
        var changes = [];

        if (args.date) {
          var day = DX.parseDay(args.date);
          if (day) {
            start = T.atMinutes(day, T.minutesOfDay(start));
            changes.push('moved to ' + DX.fmtDay(start));
          }
        }
        if (args.when !== undefined && args.when !== null) {
          start = T.atMinutes(start, args.when);
          changes.push('starts at ' + DX.fmtClock(start));
        }
        if (args.shift) {
          start = T.addMinutes(start, args.shift);
          changes.push(args.shift > 0
            ? DX.hours(args.shift) + ' later'
            : DX.hours(-args.shift) + ' earlier');
        }

        // …and the new length.
        var minutes = oldMinutes;
        if (args.duration) {
          minutes = args.duration;
          changes.push('now ' + DX.hours(minutes) + ' long');
        } else if (args.stretch) {
          minutes = Math.max(5, oldMinutes + args.stretch);
          changes.push(args.stretch > 0
            ? DX.hours(args.stretch) + ' longer'
            : DX.hours(-args.stretch) + ' shorter');
        }

        var patch = {};
        var moved = start.getTime() !== oldStart.getTime();
        if (moved || minutes !== oldMinutes) {
          patch.start = T.iso(start);
          patch.end = T.iso(T.addMinutes(start, minutes));
        }
        if (args.title) { patch.title = args.title; changes.push('renamed to “' + args.title + '”'); }
        if (args.travel) {
          // Cadence already models this, and reminders respect it.
          patch.travelMinutes = args.travel;
          changes.push(DX.hours(args.travel) + ' of travel time before it');
          if (!S.settings().travelTimeEnabled) {
            S.setSetting('travelTimeEnabled', true);
          }
        }

        if (!changes.length) {
          throw new JV.ToolError('Tell me what to change about “' + inst.title +
            '” — a new time, a new day, a different length, or a new name.');
        }

        var summary = 'Now ' + DX.fmtDay(start) + ' ' +
          DX.fmtSpan(start, T.addMinutes(start, minutes)) + ' · ' + changes.join(', ');

        function commit() {
          A.updateEvent(inst, patch, inst.seriesId ? 'this' : 'all');
          return { id: id, start: start, minutes: minutes, title: patch.title || inst.title };
        }
        function verify(out) {
          var ev = S.get('events', out.id);
          if (!ev) return { ok: false, detail: 'The event is no longer there.' };
          var actualStart = T.w(ev.start);
          var actualMinutes = T.diffMinutes(actualStart, T.w(ev.end));
          var timeOk = Math.abs(T.diffMinutes(actualStart, out.start)) <= 1;
          var lenOk = Math.abs(actualMinutes - out.minutes) <= 1;
          var nameOk = !patch.title || ev.title === patch.title;
          return (timeOk && lenOk && nameOk)
            ? { ok: true, detail: '“' + ev.title + '” is now ' + DX.fmtDay(actualStart) + ' ' +
                DX.fmtSpan(actualStart, T.w(ev.end)) + '.' }
            : { ok: false, detail: 'The change did not take: it is still ' +
                DX.fmtDay(actualStart) + ' ' + DX.fmtSpan(actualStart, T.w(ev.end)) + '.' };
        }

        if (!ctx.dryRun) {
          var out = commit();
          var v = verify(out);
          return { kind: 'written', headline: v.detail, verified: v.ok,
            refs: [DX.ref('event', S.get('events', id), out.title)], lines: [] };
        }
        return JV.proposal({
          title: 'Update “' + inst.title + '”',
          detail: summary,
          refs: [DX.ref('event', inst)],
          commit: commit, verify: verify
        });
      }
    });

    def({
      name: 'calendar.move_event',
      description: 'Move an event to another day or time.',
      permission: 'calendar.write', mutates: true, lowRisk: true,
      inputSchema: {
        event: { type: 'string', required: true },
        when: { type: 'string' }, time: { type: 'string' }
      },
      run: function (ctx, args) {
        var inst = DX.findEvent(args.event);
        if (!inst) throw new JV.ToolError('I could not find an event matching “' + args.event + '”.');
        var minutes = T.diffMinutes(inst.startWall, inst.endWall);
        var target = resolveMoveTarget(inst, args, minutes);
        var id = inst.seriesId || inst.id;

        if (!ctx.dryRun) {
          A.moveEvent(inst, target.start, T.addMinutes(target.start, minutes));
          var v = DX.verifyMoved(id, target.start);
          return { kind: 'written', headline: v.detail, verified: v.ok, lines: [] };
        }
        return JV.proposal({
          title: 'Move “' + inst.title + '”',
          detail: 'From ' + DX.fmtDay(inst.startWall) + ' ' + DX.fmtClock(inst.startWall) +
            ' to ' + DX.fmtDay(target.start) + ' ' + DX.fmtClock(target.start) +
            (target.note ? ' · ' + target.note : ''),
          refs: [DX.ref('event', inst)],
          commit: function () {
            A.moveEvent(inst, target.start, T.addMinutes(target.start, minutes));
            return { id: id, start: target.start };
          },
          verify: function (out) { return DX.verifyMoved(out.id, out.start); }
        });
      }
    });

    def({
      name: 'calendar.delete_event',
      description: 'Delete an event.',
      permission: 'calendar.write', mutates: true, lowRisk: true,
      inputSchema: { event: { type: 'string', required: true } },
      run: function (ctx, args) {
        var inst = DX.findEvent(args.event);
        if (!inst) throw new JV.ToolError('I could not find an event matching “' + args.event + '”.');
        var id = inst.seriesId || inst.id;
        var repeats = !!inst.seriesId;

        if (!ctx.dryRun) {
          A.deleteEvent(inst, repeats ? 'this' : 'all');
          return { kind: 'written', headline: 'Deleted “' + inst.title + '”.', verified: true, lines: [] };
        }
        return JV.proposal({
          title: 'Delete “' + inst.title + '”',
          detail: DX.fmtDay(inst.startWall) + ' ' + DX.fmtSpan(inst.startWall, inst.endWall) +
            (repeats ? ' · just this occurrence' : ''),
          refs: [DX.ref('event', inst)],
          commit: function () { A.deleteEvent(inst, repeats ? 'this' : 'all'); return { id: id, repeats: repeats }; },
          verify: function (out) {
            // A single occurrence of a series leaves the series row in place,
            // so the honest check is different for the two cases.
            if (out.repeats) {
              return { ok: true, detail: 'That occurrence was removed from the series' };
            }
            return DX.verifyGone('events', out.id, 'event');
          }
        });
      }
    });

    /* Delete whatever the person named, whichever collection it lives in. */
    def({
      name: 'calendar.delete_item',
      description: 'Delete an event, task, deadline, habit, note or project by name.',
      permission: 'calendar.write', mutates: true, lowRisk: true,
      inputSchema: { item: { type: 'string', required: true }, kind: { type: 'string' } },
      run: function (ctx, args) {
        var hits = DX.findAnything(args.item, args.kind ? { kinds: [args.kind] } : {});
        if (!hits.length) {
          throw new JV.ToolError('I could not find anything called “' + args.item + '”.');
        }
        if (DX.isAmbiguous(hits)) {
          throw new JV.ToolError('I found more than one match for “' + args.item + '”: ' +
            hits.slice(0, 3).map(function (h) {
              return '“' + h.label + '” (' + DX.KIND_NOUN[h.kind] + ')';
            }).join(', ') + '. Which did you mean?');
        }

        var hit = hits[0];
        DX.setFocus(hit.kind, hit.item, hit.label);
        var noun = DX.KIND_NOUN[hit.kind];
        var detail = describeHit(hit);

        if (!ctx.dryRun) {
          var res = removeHit(hit);
          var v = verifyRemoved(hit, res);
          return { kind: 'written', headline: v.detail, verified: v.ok, lines: [] };
        }
        return JV.proposal({
          title: 'Delete the ' + noun + ' “' + hit.label + '”',
          detail: detail,
          refs: [DX.ref(hit.kind, hit.item, hit.label)],
          commit: function () { return removeHit(hit); },
          verify: function (res) { return verifyRemoved(hit, res); }
        });
      }
    });

    /* Complete whatever the person named — a task, a deadline, or today's
       instance of a habit. */
    def({
      name: 'calendar.complete_item',
      description: 'Mark a task, deadline or habit done by name.',
      permission: 'tasks.write', mutates: true, lowRisk: true,
      inputSchema: { item: { type: 'string', required: true } },
      run: function (ctx, args) {
        var hits = DX.findAnything(args.item, { kinds: ['task', 'deadline', 'habit'] });
        if (!hits.length) {
          throw new JV.ToolError('I could not find an open task, deadline or habit called “' + args.item + '”.');
        }
        if (DX.isAmbiguous(hits)) {
          throw new JV.ToolError('More than one thing matches “' + args.item + '”: ' +
            hits.slice(0, 3).map(function (h) { return '“' + h.label + '”'; }).join(', ') +
            '. Which did you mean?');
        }

        var hit = hits[0];
        DX.setFocus(hit.kind, hit.item, hit.label);
        var noun = DX.KIND_NOUN[hit.kind];

        if (!ctx.dryRun) {
          var res = completeHit(hit);
          var v = verifyCompleted(hit);
          return { kind: 'written', headline: v.detail, verified: v.ok, lines: [] };
        }
        return JV.proposal({
          title: 'Complete “' + hit.label + '”',
          detail: 'Marks the ' + noun + ' done.' + (hit.when ? ' Due ' + DX.fmtDay(hit.when) + '.' : ''),
          refs: [DX.ref(hit.kind, hit.item, hit.label)],
          commit: function () { return completeHit(hit); },
          verify: function () { return verifyCompleted(hit); }
        });
      }
    });

    def({
      name: 'calendar.move_range',
      description: 'Move everything in a period to another day.',
      permission: 'calendar.write', mutates: true, timeoutMs: 15000,
      inputSchema: {
        from: { type: 'string', required: true },
        to: { type: 'string', required: true },
        after: { type: 'string' }
      },
      run: function (ctx, args) {
        var fromDay = DX.dayOrToday(args.from);
        var toDay = DX.dayOrToday(args.to);
        var afterMinutes = args.after ? clockToMinutes(args.after) : null;

        var moving = Q.eventsOnDay(fromDay, { ignoreLayers: true }).filter(function (e) {
          if (e.allDay) return false;
          if (afterMinutes !== null && T.minutesOfDay(e.startWall) < afterMinutes) return false;
          return true;
        }).sort(function (a, b) { return a.startWall - b.startWall; });

        if (!moving.length) {
          return {
            kind: 'empty',
            headline: 'Nothing on ' + DX.fmtDay(fromDay).toLowerCase() +
              (afterMinutes !== null ? ' after ' + args.after : '') + ' to move.',
            lines: []
          };
        }

        // Find a home for each, in order, without colliding with each other.
        var placements = [];
        var claimed = [];
        var unplaced = [];
        moving.forEach(function (e) {
          var minutes = T.diffMinutes(e.startWall, e.endWall);
          var slot = firstFreeOn(toDay, minutes, claimed);
          if (!slot) { unplaced.push(e); return; }
          claimed.push({ start: slot, end: T.addMinutes(slot, minutes) });
          placements.push({ inst: e, start: slot, minutes: minutes });
        });

        if (!placements.length) {
          throw new JV.ToolError(DX.fmtDay(toDay) + ' has no free time for any of those ' + moving.length + ' events.');
        }

        var lines = placements.map(function (p) {
          return '“' + p.inst.title + '” → ' + DX.fmtDay(p.start) + ' ' + DX.fmtClock(p.start);
        });
        if (unplaced.length) {
          lines.push('No room for: ' + unplaced.map(function (e) { return '“' + e.title + '”'; }).join(', '));
        }

        if (!ctx.dryRun) return applyMoves(placements, unplaced);
        return JV.proposal({
          title: 'Move ' + placements.length + ' event' + (placements.length === 1 ? '' : 's') +
            ' to ' + DX.fmtDay(toDay).toLowerCase(),
          detail: unplaced.length
            ? placements.length + ' will fit; ' + unplaced.length + ' will not and stay where they are'
            : 'All of them fit.',
          items: lines,
          changes: placements.map(function (p) {
            return {
              title: 'Move “' + p.inst.title + '”',
              detail: DX.fmtDay(p.start) + ' ' + DX.fmtClock(p.start),
              apply: function () {
                A.moveEvent(p.inst, p.start, T.addMinutes(p.start, p.minutes));
                return { id: p.inst.seriesId || p.inst.id, start: p.start };
              },
              verify: function (out) { return DX.verifyMoved(out.id, out.start); }
            };
          }),
          refs: placements.slice(0, 5).map(function (p) { return DX.ref('event', p.inst); }),
          commit: function () { return applyMoves(placements, unplaced); },
          verify: function (out) {
            var bad = out.moved.filter(function (m) { return !DX.verifyMoved(m.id, m.start).ok; });
            return bad.length
              ? { ok: false, detail: bad.length + ' of ' + out.moved.length + ' moves did not take effect' }
              : { ok: true, detail: out.moved.length + ' event' + (out.moved.length === 1 ? '' : 's') + ' confirmed at the new times' };
          }
        });
      }
    });

    def({
      name: 'calendar.create_task',
      description: 'Create a task from a plain-language phrase.',
      permission: 'tasks.write', mutates: true, lowRisk: true,
      inputSchema: { text: { type: 'string', required: true } },
      run: function (ctx, args) { return createFromText(ctx, args.text, 'task'); }
    });

    def({
      name: 'calendar.create_deadline',
      description: 'Create a deadline from a plain-language phrase.',
      permission: 'tasks.write', mutates: true, lowRisk: true,
      inputSchema: { text: { type: 'string', required: true } },
      run: function (ctx, args) { return createFromText(ctx, args.text, 'deadline'); }
    });

    def({
      name: 'calendar.create_note',
      description: 'Write a note.',
      permission: 'notes.write', mutates: true, lowRisk: true,
      inputSchema: { title: { type: 'string', required: true }, body: { type: 'string' } },
      run: function (ctx, args) {
        var payload = { title: args.title, body: args.body || '' };
        if (!ctx.dryRun) {
          var n = A.createNote(payload);
          var v = DX.verifyCollection('notes', [n.id], 'note');
          return { kind: 'written', headline: v.detail, verified: v.ok, lines: [] };
        }
        return JV.proposal({
          title: 'Write note “' + args.title + '”',
          detail: args.body ? args.body.slice(0, 140) : 'Empty note',
          commit: function () { return A.createNote(payload); },
          verify: function (n) { return DX.verifyCollection('notes', [n.id], 'note'); }
        });
      }
    });

    def({
      name: 'calendar.complete_task',
      description: 'Mark a task done.',
      permission: 'tasks.write', mutates: true, lowRisk: true,
      inputSchema: { task: { type: 'string', required: true } },
      run: function (ctx, args) {
        var task = DX.findTask(args.task);
        if (!task) throw new JV.ToolError('I could not find an open task matching “' + args.task + '”.');
        if (!ctx.dryRun) {
          A.completeTask(task.id, true);
          return { kind: 'written', headline: 'Marked “' + task.title + '” done.', verified: true, lines: [] };
        }
        return JV.proposal({
          title: 'Complete “' + task.title + '”',
          detail: 'Marks the task done.',
          refs: [DX.ref('task', task)],
          commit: function () { A.completeTask(task.id, true); return { id: task.id }; },
          verify: function (out) {
            var t = S.get('tasks', out.id);
            return t && t.status === 'completed'
              ? { ok: true, detail: 'Confirmed complete' }
              : { ok: false, detail: 'The task is still open' };
          }
        });
      }
    });

    def({
      name: 'calendar.capture',
      description: 'Drop a raw thought into the inbox to sort out later.',
      permission: 'tasks.write', mutates: true, lowRisk: true,
      inputSchema: { text: { type: 'string', required: true } },
      run: function (ctx, args) {
        if (!ctx.dryRun) { A.addCapture(args.text); return { kind: 'written', headline: 'Saved to your inbox.', verified: true, lines: [] }; }
        return JV.proposal({
          title: 'Save to inbox', detail: args.text,
          commit: function () { return A.addCapture(args.text); },
          verify: function (c) { return DX.verifyCollection('captures', [c.id], 'capture'); }
        });
      }
    });

    def({
      name: 'calendar.organize',
      description: 'Turn a messy brain dump into separate events, tasks and deadlines.',
      permission: 'tasks.write', mutates: true,
      inputSchema: { text: { type: 'string', required: true } },
      run: function (ctx, args) {
        var items = NLP.organize(args.text, { settings: S.settings() })
          .filter(function (i) { return i.payload && i.payload.title; });
        if (!items.length) throw new JV.ToolError('I could not pull anything structured out of that.');
        if (!ctx.dryRun) {
          var created = A.applyOrganized(items, null);
          return { kind: 'written', headline: describeCreated(created), verified: true, lines: [] };
        }
        return JV.proposal({
          title: 'Add ' + items.length + ' item' + (items.length === 1 ? '' : 's'),
          detail: 'Parsed from your text.',
          items: items.map(function (i) { return i.type + ': ' + i.payload.title; }),
          commit: function () { return A.applyOrganized(items, null); },
          verify: function (created) {
            var n = Object.keys(created).reduce(function (a, k) { return a + created[k]; }, 0);
            return n ? { ok: true, detail: describeCreated(created) }
              : { ok: false, detail: 'Nothing was added' };
          }
        });
      }
    });

    /* ========================================================== planning */

    def({
      name: 'plan.what_now',
      description: 'Decide what to work on at this moment.',
      permission: 'calendar.read',
      inputSchema: {},
      run: function () {
        var r = SCHED.whatNow(DX.nowWall());
        var suggested = (r.recommendation && r.recommendation.task) || (r.partial && r.partial.task) || null;
        var lines = [];
        if (suggested) lines.push('Suggested: ' + suggested.title);
        (r.alternatives || []).forEach(function (a) {
          if (a && a.task) lines.push('Alternative: ' + a.task.title);
        });
        if (r.next) lines.push('Next up: ' + r.next.title + ' at ' + DX.fmtClock(r.next.startWall));
        return {
          kind: 'whatnow', result: r,
          refs: suggested ? [DX.ref('task', suggested)] : [],
          headline: suggested
            ? 'Work on “' + suggested.title + '” — ' + r.headline.charAt(0).toLowerCase() + r.headline.slice(1)
            : r.headline,
          detail: r.detail, lines: lines
        };
      }
    });

    def({
      name: 'plan.priorities',
      description: 'Rank open work by urgency and importance, with reasons.',
      permission: 'tasks.read',
      inputSchema: { limit: { type: 'number' } },
      run: function (ctx, args) {
        var ranked = SCHED.rankedTasks(DX.nowWall(), { horizonDays: 30 }).slice(0, args.limit || 6);
        return {
          kind: 'ranked', ranked: ranked,
          refs: ranked.slice(0, 6).map(function (r) { return DX.ref('task', r.task); }),
          headline: ranked.length ? 'Ranked by what is most pressing.' : 'Nothing open to rank.',
          lines: ranked.map(function (r, i) {
            return (i + 1) + '. ' + r.task.title +
              (r.reasons && r.reasons.length ? ' — ' + r.reasons.slice(0, 2).join(', ') : '');
          })
        };
      }
    });

    def({
      name: 'plan.day',
      description: 'Build a schedule for a day by fitting top tasks into open time.',
      permission: 'calendar.write', mutates: true, timeoutMs: 12000,
      inputSchema: { date: { type: 'string' } },
      run: function (ctx, args) {
        var day = DX.dayOrToday(args.date);
        var plan = SCHED.planDay(day, {});
        var blocks = (plan.proposed || []).filter(function (p) { return p.selected !== false; });
        if (!blocks.length) {
          return {
            kind: 'plan',
            headline: 'Nothing to schedule for ' + DX.fmtDay(day).toLowerCase() + '.',
            lines: (plan.warnings || []).map(function (w) { return w.text; })
          };
        }
        var lines = blocks.map(function (b) { return DX.fmtSpan(b.start, b.end) + ' · ' + b.title; });
        if (!ctx.dryRun) return applyDayPlan(blocks);
        return JV.proposal({
          title: 'Plan ' + DX.fmtDay(day).toLowerCase(),
          detail: blocks.length + ' block' + (blocks.length === 1 ? '' : 's') + ', ' +
            DX.hours(plan.stats.remainingFree) + ' left free',
          items: lines.concat((plan.warnings || []).map(function (w) { return w.text; })),
          commit: function () { return applyDayPlan(blocks); },
          verify: function (out) { return DX.verifyEvents(out.ids); }
        });
      }
    });

    def({
      name: 'plan.week',
      description: 'Build a schedule across the next seven days.',
      permission: 'calendar.write', mutates: true, timeoutMs: 20000,
      inputSchema: { start: { type: 'string' } },
      run: function (ctx, args) {
        var start = args.start ? DX.dayOrToday(args.start) : T.startOfDay(DX.nowWall());
        var days = SCHED.planWeek(start, {});
        var blocks = [];
        days.forEach(function (p) {
          (p.proposed || []).filter(function (b) { return b.selected !== false; })
            .forEach(function (b) { blocks.push(b); });
        });
        if (!blocks.length) {
          return { kind: 'plan', headline: 'No open time to plan into this week.', lines: [] };
        }
        if (!ctx.dryRun) return applyDayPlan(blocks);
        return JV.proposal({
          title: 'Plan the week',
          detail: blocks.length + ' block' + (blocks.length === 1 ? '' : 's') + ' across ' + days.length + ' days',
          items: blocks.map(function (b) {
            return DX.fmtDay(b.start) + ' ' + DX.fmtSpan(b.start, b.end) + ' · ' + b.title;
          }),
          commit: function () { return applyDayPlan(blocks); },
          verify: function (out) { return DX.verifyEvents(out.ids); }
        });
      }
    });

    def({
      name: 'plan.sessions',
      description: 'Spread work across several spaced sessions before a deadline.',
      permission: 'calendar.write', mutates: true, timeoutMs: 15000,
      inputSchema: {
        work: { type: 'string', required: true },
        totalMinutes: { type: 'number' },
        sessions: { type: 'number' },
        sessionMinutes: { type: 'number' },
        deadline: { type: 'string' }
      },
      run: function (ctx, args) {
        var deadline = args.deadline ? T.endOfDay(DX.dayOrToday(args.deadline)) : null;
        var total = args.totalMinutes ||
          (args.sessions && args.sessionMinutes ? args.sessions * args.sessionMinutes : null) ||
          (args.sessions ? args.sessions * 60 : 120);

        var dist = JV.SCHEDULER.distribute({
          totalMinutes: total,
          deadline: deadline,
          title: args.work,
          sessionMinutes: args.sessionMinutes || (args.sessions ? Math.round(total / args.sessions) : null),
          maxPerDay: args.sessions && deadline ? 2 : 1
        });

        if (!dist.sessions.length) {
          throw new JV.ToolError('No open time for “' + args.work + '”' +
            (deadline ? ' before ' + DX.fmtDay(deadline) : '') + '.');
        }

        var lines = dist.sessions.map(function (s) {
          return DX.fmtDay(s.start) + ' ' + DX.fmtSpan(s.start, s.end) +
            (s.reasons && s.reasons.length ? ' · ' + s.reasons[0] : '');
        });

        if (!ctx.dryRun) {
          var ids = JV.SCHEDULER.commitSessions(dist.sessions, {});
          var v = DX.verifyEvents(ids);
          return { kind: 'written', headline: v.detail, verified: v.ok, lines: lines };
        }
        return JV.proposal({
          title: dist.sessions.length + ' session' + (dist.sessions.length === 1 ? '' : 's') + ' for “' + args.work + '”',
          detail: DX.hours(dist.placedMinutes) + ' total' +
            (deadline ? ', all before ' + DX.fmtDay(deadline) : '') +
            (dist.shortfall ? ' · ' + DX.hours(dist.shortfall) + ' would not fit' : ''),
          items: lines.concat(dist.notes),
          commit: function () { return { ids: JV.SCHEDULER.commitSessions(dist.sessions, {}) }; },
          verify: function (out) { return DX.verifyEvents(out.ids); }
        });
      }
    });

    def({
      name: 'plan.project',
      description: 'Turn a deadline into a full plan: phases, sessions, project and deadline.',
      permission: 'calendar.write', mutates: true, timeoutMs: 20000,
      inputSchema: {
        title: { type: 'string', required: true },
        deadline: { type: 'string', required: true },
        totalMinutes: { type: 'number' },
        perDayMinutes: { type: 'number' }
      },
      run: function (ctx, args) {
        var due = DX.parseDay(args.deadline);
        if (!due) throw new JV.ToolError('I could not read “' + args.deadline + '” as a date.');
        var deadline = T.endOfDay(due);

        var total = args.totalMinutes;
        if (!total && args.perDayMinutes) {
          var days = Math.max(1, T.diffDays(T.startOfDay(DX.nowWall()), due));
          total = args.perDayMinutes * days;
        }

        var planned = JV.PROJECTS.plan({ title: args.title, deadline: deadline, totalMinutes: total });
        if (!planned.ok) {
          throw new JV.ToolError(planned.reason === 'past-deadline'
            ? 'That deadline has already passed.'
            : 'I need a deadline to plan against.');
        }
        if (!planned.sessions.length) {
          throw new JV.ToolError('There is no free time before ' + DX.fmtDay(due) + ' to plan into.');
        }

        var lines = planned.sessions.map(function (s) {
          return DX.fmtDay(s.start) + ' ' + DX.fmtSpan(s.start, s.end) + ' · ' + s.phase;
        });

        if (!ctx.dryRun) {
          var res = JV.PROJECTS.commit(planned);
          var v = JV.PROJECTS.verify(res, planned);
          return { kind: 'written', headline: v.detail, verified: v.ok, lines: lines };
        }
        return JV.proposal({
          title: 'Plan “' + planned.title + '” for ' + DX.fmtDay(due),
          detail: planned.sessions.length + ' sessions · ' + DX.hours(planned.placedMinutes) +
            ' · phases: ' + planned.phases.join(' → '),
          items: lines.concat(planned.notes),
          commit: function () { return JV.PROJECTS.commit(planned); },
          verify: function (res) { return JV.PROJECTS.verify(res, planned); }
        });
      }
    });

    def({
      name: 'plan.optimize',
      description: 'Analyse the schedule and propose concrete improvements.',
      permission: 'calendar.write', mutates: true, timeoutMs: 20000,
      inputSchema: { days: { type: 'number' } },
      run: function (ctx, args) {
        var report = JV.OPTIMIZE.analyse({ days: args.days || 7 });
        var findings = report.findings;
        if (!findings.length) {
          return {
            kind: 'optimize', report: report,
            headline: 'Nothing needs fixing — no conflicts, no overloaded days, no unprepared deadlines.',
            lines: [
              report.stats.events + ' events in the window',
              DX.hours(report.stats.freeMinutes) + ' unscheduled',
              report.stats.busiest ? DX.fmtDay(report.stats.busiest.day) + ' is the busiest day' : ''
            ].filter(Boolean)
          };
        }

        var changes = findings.map(function (f) {
          return {
            title: f.title,
            detail: f.detail,
            preview: f.preview ? safePreview(f) : '',
            severity: f.severity,
            refs: f.refs || [],
            apply: f.apply,
            verify: f.verify
          };
        });

        if (!ctx.dryRun) return applyChanges(changes);
        return JV.proposal({
          title: 'JARVIS found ' + findings.length + ' improvement' + (findings.length === 1 ? '' : 's'),
          detail: 'Across the next ' + report.window.days + ' days. Apply any or all of them.',
          items: changes.map(function (c, i) {
            return (i + 1) + '. ' + c.title + (c.preview ? ' — ' + c.preview : '');
          }),
          changes: changes,
          refs: findings.reduce(function (a, f) { return a.concat(f.refs || []); }, []).slice(0, 6),
          commit: function () { return applyChanges(changes); },
          verify: function (out) {
            return out.failed.length
              ? { ok: false, detail: out.applied + ' applied, ' + out.failed.length + ' failed: ' + out.failed.join('; ') }
              : { ok: true, detail: out.applied + ' improvement' + (out.applied === 1 ? '' : 's') + ' applied and confirmed' };
          }
        });
      }
    });

    def({
      name: 'plan.reschedule',
      description: 'Find new time for work that did not get done.',
      permission: 'calendar.write', mutates: true, timeoutMs: 15000,
      inputSchema: { work: { type: 'string' } },
      run: function (ctx, args) {
        var now = DX.nowWall();
        var task = args.work ? DX.findTask(args.work) : null;

        // Naming something we cannot find must not silently become "reschedule
        // whatever slipped" — that rearranges the wrong work.
        if (args.work && !task) {
          throw new JV.ToolError('I could not find anything matching “' + args.work +
            '”. Tell me which task you mean and I will find new time for it.');
        }

        // No name given: fall back to what was actually due today and missed.
        if (!task) {
          var missed = S.all('tasks').filter(function (t) {
            return t.status !== 'completed' && t.status !== 'archived' && t.due &&
              T.w(t.due) <= T.endOfDay(now);
          }).sort(function (a, b) { return T.w(a.due) - T.w(b.due); });
          if (!missed.length) {
            return { kind: 'empty', headline: 'Nothing was due today that is still open.', lines: [] };
          }
          task = missed[0];
        }

        var minutes = Q.taskEstimate(task);
        var deadline = task.due ? T.w(task.due) : null;
        // Past its due date already — plan against the coming week instead of
        // a deadline that cannot be met.
        var window = (deadline && deadline > now) ? deadline : T.endOfDay(T.addDays(now, 7));

        var dist = JV.SCHEDULER.distribute({
          totalMinutes: minutes, deadline: window, title: task.title
        });
        if (!dist.sessions.length) throw new JV.ToolError('No open time for “' + task.title + '” in the next week.');

        var lines = dist.sessions.map(function (s) {
          return DX.fmtDay(s.start) + ' ' + DX.fmtSpan(s.start, s.end);
        });
        var overdueNote = deadline && deadline < now
          ? 'It was due ' + DX.fmtDay(deadline) + ', so this is catch-up time.' : null;

        if (!ctx.dryRun) {
          var ids = JV.SCHEDULER.commitSessions(dist.sessions, { taskId: task.id });
          var v = DX.verifyEvents(ids);
          return { kind: 'written', headline: v.detail, verified: v.ok, lines: lines };
        }
        return JV.proposal({
          title: 'Reschedule “' + task.title + '”',
          detail: (overdueNote ? overdueNote + ' ' : '') + DX.hours(dist.placedMinutes) + ' across ' +
            dist.sessions.length + ' session' + (dist.sessions.length === 1 ? '' : 's'),
          items: lines,
          refs: [DX.ref('task', task)],
          commit: function () { return { ids: JV.SCHEDULER.commitSessions(dist.sessions, { taskId: task.id }) }; },
          verify: function (out) { return DX.verifyEvents(out.ids); }
        });
      }
    });

    def({
      name: 'plan.break_down',
      description: 'Split a large task into smaller subtasks.',
      permission: 'tasks.write', mutates: true,
      inputSchema: { task: { type: 'string', required: true }, steps: { type: 'array' } },
      run: function (ctx, args) {
        var task = DX.findTask(args.task);
        if (!task) throw new JV.ToolError('I could not find an open task matching “' + args.task + '”.');
        var steps = (args.steps || []).filter(Boolean);
        if (!steps.length) {
          var tpl = JV.PROJECTS.templateFor(task.title);
          steps = tpl.phases.map(function (p) { return p.name + ' — ' + task.title; });
        }
        if (!ctx.dryRun) {
          A.breakDownTask(task.id, steps);
          return { kind: 'written', headline: 'Added ' + steps.length + ' subtasks.', verified: true, lines: steps };
        }
        return JV.proposal({
          title: 'Break down “' + task.title + '”',
          detail: steps.length + ' subtasks, from JARVIS’s built-in structure',
          items: steps,
          refs: [DX.ref('task', task)],
          commit: function () { A.breakDownTask(task.id, steps); return { id: task.id, n: steps.length }; },
          verify: function (out) {
            var t = S.get('tasks', out.id);
            return t && t.subtasks && t.subtasks.length >= out.n
              ? { ok: true, detail: out.n + ' subtasks confirmed' }
              : { ok: false, detail: 'The subtasks were not saved' };
          }
        });
      }
    });

    def({
      name: 'plan.research',
      description: 'Explain what JARVIS can and cannot look up, and offer the built-in structure instead.',
      permission: 'calendar.read',
      inputSchema: { topic: { type: 'string' } },
      run: function (ctx, args) {
        var topic = args.topic || 'that';
        var tpl = JV.PROJECTS.templateFor(topic);
        var remote = JV.assistant && JV.assistant.remote && JV.assistant.remote.available();

        // §31: nothing is faked. This build runs entirely in the browser with
        // no network, so it cannot browse the web, and says so.
        return {
          kind: 'capability',
          headline: 'I cannot search the web from here — Cadence runs entirely in your browser and sends nothing out.',
          lines: [
            'What I can do is build a plan from my own built-in ' + tpl.label + ' structure: ' +
              tpl.phases.map(function (p) { return p.name; }).join(' → ') + '.',
            'Give me a deadline — “' + topic + ' by June 3” — and I will schedule it around what you already have.',
            remote
              ? 'A language model is configured in Settings, but it is a model, not a web search, so it cannot look things up either.'
              : 'If you want researched material, paste it in and I will turn it into a schedule.'
          ]
        };
      }
    });

    def({
      name: 'plan.morning_brief',
      description: 'The day ahead: schedule, what matters, free time and a recommendation.',
      permission: 'calendar.read',
      inputSchema: {},
      run: function () { return JV.OPTIMIZE.morningBrief(); }
    });

    def({
      name: 'plan.day_review',
      description: 'How the day went, and what matters tomorrow.',
      permission: 'calendar.read',
      inputSchema: { date: { type: 'string' } },
      run: function (ctx, args) { return JV.OPTIMIZE.dayReview(args.date ? DX.dayOrToday(args.date) : null); }
    });

    def({
      name: 'plan.week_review',
      description: 'Summarise a week: what got done, what slipped, where time went.',
      permission: 'calendar.read',
      inputSchema: { start: { type: 'string' } },
      run: function (ctx, args) {
        var start = args.start ? DX.dayOrToday(args.start) : T.startOfWeek(T.addDays(DX.nowWall(), -7));
        var r = SCHED.weekReview(start);
        var lines = [
          r.completed.length + ' task' + (r.completed.length === 1 ? '' : 's') + ' completed',
          r.missed.length + ' missed',
          DX.hours(r.totalMinutes) + ' in scheduled events'
        ];
        (r.byCategory || []).slice(0, 5).forEach(function (c) {
          lines.push(c.label + ': ' + DX.hours(c.minutes));
        });
        return { kind: 'review', review: r, headline: 'Week of ' + T.fmtDate(r.start), lines: lines };
      }
    });

    /* ============================================================ memory */

    def({
      name: 'memory.remember',
      description: 'Store a durable fact about how the user works.',
      permission: 'memory.write', mutates: true,
      inputSchema: { text: { type: 'string', required: true } },
      run: function (ctx, args) {
        var mem = JV.assistant && JV.assistant.memory;
        if (!mem) throw new JV.ToolError('Memory is not available.');
        if (JV.assistant.memoryEnabled === false) {
          throw new JV.ToolError('Memory is switched off in the JARVIS settings.');
        }
        function store() {
          var id = mem.semantic.remember(args.text, { source: 'user' });
          JV.assistant.persist();
          return { id: id };
        }
        if (!ctx.dryRun) {
          var out = store();
          return { kind: 'written', headline: 'Remembered.', verified: !!mem.semantic.store.get(out.id), lines: [args.text] };
        }
        return JV.proposal({
          title: 'Remember this', detail: args.text, undoable: false,
          commit: store,
          verify: function (out) {
            return mem.semantic.store.get(out.id)
              ? { ok: true, detail: 'Saved to memory' }
              : { ok: false, detail: 'It was not saved' };
          }
        });
      }
    });

    def({
      name: 'memory.recall',
      description: 'Recall what JARVIS has learned about how the user works.',
      permission: 'memory.read',
      inputSchema: { query: { type: 'string', required: true }, k: { type: 'number' } },
      run: function (ctx, args) {
        var mem = JV.assistant && JV.assistant.memory;
        if (!mem) return { kind: 'memory', hits: [], headline: 'Memory is not available.', lines: [] };
        var hits = mem.retrieveAll(args.query, args.k || 4);
        return {
          kind: 'memory', hits: hits,
          headline: hits.length
            ? 'Recalled ' + hits.length + ' relevant note' + (hits.length === 1 ? '' : 's') + '.'
            : 'Nothing relevant in memory yet.',
          lines: hits.map(function (h) { return h.doc.text; })
        };
      }
    });

    return reg;
  }

  /* ------------------------------------------------------------ helpers */

  function dayReport(day) {
    var events = Q.eventsOnDay(day, { ignoreLayers: true });
    var timed = events.filter(function (e) { return !e.allDay; })
      .sort(function (a, b) { return a.startWall - b.startWall; });
    var allDay = events.filter(function (e) { return e.allDay; });
    var due = Q.tasksDueOn(day).filter(function (t) { return t.status !== 'completed'; });
    var free = SCHED.freeMinutes(day, {});

    return {
      kind: 'agenda', day: day, events: timed, allDay: allDay, tasks: due, freeMinutes: free,
      refs: timed.slice(0, 8).map(function (e) { return DX.ref('event', e); })
        .concat(due.slice(0, 4).map(function (t) { return DX.ref('task', t); })),
      headline: (timed.length || allDay.length || due.length)
        ? DX.fmtDay(day) + ': ' + timed.length + ' event' + (timed.length === 1 ? '' : 's') +
          (due.length ? ', ' + due.length + ' task' + (due.length === 1 ? '' : 's') + ' due' : '') +
          ', ' + DX.hours(free) + ' free'
        : 'Nothing scheduled ' + DX.fmtDay(day).toLowerCase() + ' — ' + DX.hours(free) + ' free.',
      lines: allDay.map(function (e) { return e.title + ' · all day'; })
        .concat(timed.map(DX.eventLine))
        .concat(due.map(function (t) { return 'Task due: ' + t.title; }))
    };
  }

  function rangeReport(start, end, label, perDay) {
    var events = Q.eventsInRange(start, end, { ignoreLayers: true });
    var timed = events.filter(function (e) { return !e.allDay; })
      .sort(function (a, b) { return a.startWall - b.startWall; });
    var stats = JV.OPTIMIZE.windowStats(start, end);

    var lines;
    if (perDay) {
      lines = [];
      var cursor = T.startOfDay(start);
      while (cursor <= end) {
        var onDay = timed.filter(function (e) { return T.sameDay(e.startWall, cursor); });
        lines.push(DX.fmtDay(cursor) + ': ' + (onDay.length
          ? onDay.map(function (e) { return e.title; }).join(', ')
          : 'clear'));
        cursor = T.addDays(cursor, 1);
      }
    } else {
      lines = timed.slice(0, 14).map(function (e) {
        return DX.fmtDay(e.startWall) + ' ' + DX.fmtClock(e.startWall) + ' · ' + e.title;
      });
    }

    return {
      kind: 'agenda', events: timed, stats: stats,
      refs: timed.slice(0, 8).map(function (e) { return DX.ref('event', e); }),
      headline: timed.length
        ? timed.length + ' event' + (timed.length === 1 ? '' : 's') + ' ' + label + ' · ' +
          DX.hours(stats.busyMinutes) + ' booked, ' + DX.hours(stats.freeMinutes) + ' free' +
          (stats.deadlines ? ' · ' + stats.deadlines + ' deadline' + (stats.deadlines === 1 ? '' : 's') : '')
        : 'Nothing scheduled ' + label + '.',
      lines: lines
    };
  }

  /* Create an event / task / deadline from natural language. */
  function createFromText(ctx, text, forceType) {
    var parsed = NLP.parse(text, { settings: S.settings() });

    // The parser only materialises start/end for text it read as an event.
    // When the *caller* forces 'event' ("put it on my calendar"), those fields
    // can be missing, and toPayload would reach T.iso(undefined) and die as
    // "Invalid time value" — so repair the parse before converting it.
    if (forceType === 'event' && !parsed.startWall) {
      if (parsed.dueWall) {
        parsed.startWall = T.startOfDay(parsed.dueWall);
        parsed.endWall = T.endOfDay(parsed.dueWall);
        parsed.allDay = true;
      } else {
        // No date anywhere, so a task is the honest shape for it.
        forceType = null;
      }
    }

    if (forceType) parsed.type = forceType;
    var type = parsed.type || 'task';
    var payload = NLP.toPayload(parsed);
    if (!payload.title) throw new JV.ToolError('I could not find a title in “' + text + '”.');

    if (type === 'deadline' && !payload.due) {
      throw new JV.ToolError('A deadline needs a date — try “report due Friday”.');
    }

    var detail;
    if (type === 'event') {
      var s = payload.start ? T.w(payload.start) : null;
      detail = s
        ? (payload.allDay ? DX.fmtDay(s) + ' · all day' : DX.fmtDay(s) + ' at ' + DX.fmtSpan(s, T.w(payload.end)))
        : 'No time detected';
    } else {
      detail = payload.due ? 'Due ' + DX.fmtDay(T.w(payload.due)) : 'No due date';
    }

    var collection = type === 'event' ? 'events' : type === 'deadline' ? 'deadlines' : 'tasks';
    var create = type === 'event' ? A.createEvent : type === 'deadline' ? A.createDeadline : A.createTask;

    if (!ctx.dryRun) {
      var made = create(payload);
      var v = DX.verifyCollection(collection, [made.id], type);
      return {
        kind: 'written',
        // Say what landed and when, not just that a write succeeded.
        headline: v.ok ? 'Added “' + payload.title + '” — ' + detail + '.' : v.detail,
        verified: v.ok,
        refs: v.ok ? [DX.ref(type, made, payload.title)] : [],
        lines: []
      };
    }
    return JV.proposal({
      title: 'Create ' + type + ' “' + payload.title + '”',
      detail: detail,
      items: [payload.title + ' · ' + detail],
      commit: function () { return create(payload); },
      verify: function (made) { return DX.verifyCollection(collection, [made.id], type); }
    });
  }

  /* Recurrence phrases often put the subject last — "every Tuesday at 5pm for
     six weeks, piano practice". Cadence's parser reads front-loaded titles, so
     when the parsed title still looks like schedule words, try the sentence
     the other way round and keep whichever reads better. */
  function parseRecurring(text) {
    function attempt(s) {
      var p = NLP.parse(s, { settings: S.settings() });
      p.type = 'event';
      return NLP.toPayload(p);
    }

    var first = attempt(text);
    var scheduleWords = /^(the\s+)?(next|following|coming)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)?\s*(days?|weeks?|months?|times?)\b/i;
    var looksWrong = !first.title || scheduleWords.test(first.title);

    if (looksWrong) {
      // Move a trailing comma clause to the front and re-read.
      var m = String(text).match(/^(.*),\s*([^,]+)$/);
      if (m) {
        var swapped = m[2].trim() + ' ' + m[1].trim();
        var second = attempt(swapped);
        if (second.title && !scheduleWords.test(second.title)) return second;
      }
    }
    return first;
  }

  /* Tasks and deadlines have a due date and a name rather than a span, so the
     same sentence means something slightly different for them. */
  function editNonEvent(ctx, hit, args) {
    var noun = DX.KIND_NOUN[hit.kind];
    var patch = {};
    var changes = [];

    if (args.date || args.when !== undefined) {
      var day = args.date ? DX.parseDay(args.date) : (hit.item.due ? T.w(hit.item.due) : DX.nowWall());
      if (day) {
        var when = args.when !== undefined && args.when !== null
          ? T.atMinutes(day, args.when) : day;
        patch.due = T.iso(when);
        if (args.when !== undefined && args.when !== null) patch.hasDueTime = true;
        changes.push('due ' + DX.fmtDay(when) +
          (args.when !== undefined && args.when !== null ? ' at ' + DX.fmtClock(when) : ''));
      }
    }
    if (args.shift && hit.item.due) {
      var shifted = T.addMinutes(T.w(hit.item.due), args.shift);
      patch.due = T.iso(shifted);
      changes.push(args.shift > 0 ? 'pushed back to ' + DX.fmtDay(shifted) : 'brought forward to ' + DX.fmtDay(shifted));
    }
    if (args.duration && hit.kind === 'task') {
      patch.estimate = args.duration;
      changes.push('estimated at ' + DX.hours(args.duration));
    }
    if (args.title) { patch.title = args.title; changes.push('renamed to “' + args.title + '”'); }

    if (!changes.length) {
      throw new JV.ToolError('“' + hit.label + '” is a ' + noun +
        ' — I can change its due date, its name, or how long you think it will take.');
    }

    var collection = hit.kind === 'task' ? 'tasks' : 'deadlines';
    function commit() {
      if (hit.kind === 'task') A.updateTask(hit.item.id, patch);
      else A.updateDeadline(hit.item.id, patch);
      return { id: hit.item.id };
    }
    function verify(out) {
      var row = S.get(collection, out.id);
      if (!row) return { ok: false, detail: 'The ' + noun + ' is no longer there.' };
      var ok = (!patch.title || row.title === patch.title) &&
        (!patch.due || Math.abs(T.diffMinutes(T.w(row.due), T.w(patch.due))) <= 1);
      return ok
        ? { ok: true, detail: 'Updated “' + row.title + '” — ' + changes.join(', ') + '.' }
        : { ok: false, detail: 'The change did not take.' };
    }

    if (!ctx.dryRun) {
      var out = commit();
      var v = verify(out);
      return { kind: 'written', headline: v.detail, verified: v.ok, lines: [] };
    }
    return JV.proposal({
      title: 'Update the ' + noun + ' “' + hit.label + '”',
      detail: changes.join(', '),
      refs: [DX.ref(hit.kind, hit.item, hit.label)],
      commit: commit, verify: verify
    });
  }

  /* ------------------------------------------- acting on a resolved item */

  function describeHit(hit) {
    switch (hit.kind) {
      case 'event':
        return hit.item.allDay
          ? DX.fmtDay(hit.item.startWall) + ' · all day'
          : DX.fmtDay(hit.item.startWall) + ' ' + DX.fmtSpan(hit.item.startWall, hit.item.endWall);
      case 'task':
        return hit.item.due ? 'Task, due ' + DX.fmtDay(T.w(hit.item.due)) : 'Task with no due date';
      case 'deadline':
        return 'Deadline on ' + DX.fmtDay(T.w(hit.item.due));
      case 'project':
        return 'Project — its tasks and notes are kept';
      default:
        return DX.KIND_NOUN[hit.kind].charAt(0).toUpperCase() + DX.KIND_NOUN[hit.kind].slice(1);
    }
  }

  function removeHit(hit) {
    var id = hit.item.seriesId || hit.item.id;
    switch (hit.kind) {
      case 'event':
        // A single occurrence of a repeating event is removed from the series
        // rather than deleting the whole series.
        var repeats = !!hit.item.seriesId;
        A.deleteEvent(hit.item, repeats ? 'this' : 'all');
        return { id: id, repeats: repeats };
      case 'task': A.deleteTask(id); return { id: id };
      case 'deadline': A.deleteDeadline(id); return { id: id };
      case 'habit': A.deleteHabit(id); return { id: id };
      case 'note': A.deleteNote(id); return { id: id };
      case 'project': A.deleteProject(id); return { id: id };
      default: throw new JV.ToolError('I do not know how to delete that.');
    }
  }

  var COLLECTION = {
    event: 'events', task: 'tasks', deadline: 'deadlines',
    habit: 'habits', note: 'notes', project: 'projects'
  };

  function verifyRemoved(hit, res) {
    if (hit.kind === 'event' && res.repeats) {
      return { ok: true, detail: 'That occurrence was removed from the series.' };
    }
    var gone = !S.get(COLLECTION[hit.kind], res.id);
    return gone
      ? { ok: true, detail: 'Deleted the ' + DX.KIND_NOUN[hit.kind] + ' “' + hit.label + '”.' }
      : { ok: false, detail: 'The ' + DX.KIND_NOUN[hit.kind] + ' is still there — nothing was removed.' };
  }

  function completeHit(hit) {
    switch (hit.kind) {
      case 'task': A.completeTask(hit.item.id, true); return { id: hit.item.id };
      case 'deadline': A.toggleDeadline(hit.item.id); return { id: hit.item.id };
      case 'habit': A.toggleHabit(hit.item.id, T.key(DX.nowWall())); return { id: hit.item.id };
      default: throw new JV.ToolError('That is not something that can be completed.');
    }
  }

  function verifyCompleted(hit) {
    if (hit.kind === 'task') {
      var t = S.get('tasks', hit.item.id);
      return t && t.status === 'completed'
        ? { ok: true, detail: 'Marked “' + hit.label + '” done.' }
        : { ok: false, detail: 'The task is still open.' };
    }
    if (hit.kind === 'deadline') {
      var d = S.get('deadlines', hit.item.id);
      return d && d.done
        ? { ok: true, detail: 'Marked the deadline “' + hit.label + '” done.' }
        : { ok: false, detail: 'The deadline is still open.' };
    }
    var h = S.get('habits', hit.item.id);
    var key = T.key(DX.nowWall());
    return h && h.log && h.log[key]
      ? { ok: true, detail: 'Logged “' + hit.label + '” for today.' }
      : { ok: false, detail: 'The habit was not logged.' };
  }

  function commitEvent(payload, detail) {
    var ev = A.createEvent(payload);
    var v = DX.verifyEvents([ev.id]);
    return { kind: 'written', headline: v.detail, verified: v.ok, lines: [payload.title + ' · ' + detail] };
  }

  /* Commit a set of day-plan blocks. Tasks go through scheduleTask so the
     task↔event link survives; pure breaks become plain events. */
  function applyDayPlan(blocks) {
    var ids = [];
    blocks.forEach(function (b) {
      if (b.task) {
        A.scheduleTask(b.task.id, b.start, b.minutes);
        var t = S.get('tasks', b.task.id);
        if (t && t.scheduledEventId) ids.push(t.scheduledEventId);
      } else {
        var ev = A.createEvent({
          title: b.title, start: T.iso(b.start), end: T.iso(b.end),
          calendarId: 'cal_personal', type: 'block'
        }, { silent: true });
        ids.push(ev.id);
      }
    });
    return { ids: ids, blocks: blocks.length };
  }

  function applyMoves(placements, unplaced) {
    var moved = [];
    placements.forEach(function (p) {
      A.moveEvent(p.inst, p.start, T.addMinutes(p.start, p.minutes));
      moved.push({ id: p.inst.seriesId || p.inst.id, start: p.start });
    });
    return { moved: moved, unplaced: (unplaced || []).length };
  }

  /* Apply a list of independent changes, keeping going when one fails so a
     single bad item does not lose the rest. */
  function applyChanges(changes) {
    var applied = 0;
    var failed = [];
    changes.forEach(function (c) {
      try {
        var out = c.apply();
        var v = c.verify ? c.verify(out) : { ok: true };
        if (v.ok) applied++; else failed.push(c.title + ' (' + v.detail + ')');
      } catch (err) {
        failed.push(c.title + ' (' + (err && err.message ? err.message : err) + ')');
      }
    });
    return { applied: applied, failed: failed };
  }

  function safePreview(finding) {
    try { return finding.preview(); } catch (err) { return ''; }
  }

  var DAY_PARTS = {
    morning: { from: 5 * 60, to: 12 * 60, label: 'morning' },
    afternoon: { from: 12 * 60, to: 17 * 60, label: 'afternoon' },
    evening: { from: 17 * 60, to: 23 * 60, label: 'evening' },
    day: { from: 0, to: 24 * 60, label: 'day' }
  };

  function partOfDay(part) {
    return DAY_PARTS[String(part || 'day').toLowerCase()] || DAY_PARTS.day;
  }

  /* A free slot on this day but outside the window being cleared; failing
     that, the next few days. */
  function firstFreeOutside(day, window, minutes, claimed) {
    for (var d = 0; d < 7; d++) {
      var target = T.addDays(day, d);
      var slots = SCHED.freeSlots(target, { minMinutes: minutes });
      for (var i = 0; i < slots.length; i++) {
        var cursor = T.snap(slots[i].start, 15);
        if (cursor < slots[i].start) cursor = T.addMinutes(cursor, 15);
        var guard = 0;
        while (T.addMinutes(cursor, minutes) <= slots[i].end && guard++ < 32) {
          var end = T.addMinutes(cursor, minutes);
          var insideCleared = d === 0 &&
            T.minutesOfDay(cursor) < window.to && T.minutesOfDay(end) > window.from;
          var clash = claimed.some(function (c) { return T.overlaps(cursor, end, c.start, c.end); });
          if (!insideCleared && !clash) return new Date(cursor);
          cursor = T.addMinutes(cursor, 15);
        }
      }
    }
    return null;
  }

  function firstFreeOn(day, minutes, claimed) {
    var slots = SCHED.freeSlots(day, { minMinutes: minutes });
    for (var i = 0; i < slots.length; i++) {
      var cursor = T.snap(slots[i].start, 15);
      if (cursor < slots[i].start) cursor = T.addMinutes(cursor, 15);
      var guard = 0;
      while (T.addMinutes(cursor, minutes) <= slots[i].end && guard++ < 32) {
        var end = T.addMinutes(cursor, minutes);
        var clash = claimed.some(function (c) { return T.overlaps(cursor, end, c.start, c.end); });
        if (!clash) return new Date(cursor);
        cursor = T.addMinutes(cursor, 15);
      }
    }
    return null;
  }

  function resolveMoveTarget(inst, args, minutes) {
    var day = args.when ? DX.parseDay(args.when) : null;
    var clock = args.time ? clockToMinutes(args.time) : null;

    if (day && clock !== null) return { start: T.atMinutes(day, clock) };
    if (day) {
      var slot = firstFreeOn(day, minutes, []);
      if (!slot) {
        // Keep the original time of day when the target day has no gap; the
        // user asked to move it, and a same-time move is a defensible answer.
        return { start: T.atMinutes(day, T.minutesOfDay(inst.startWall)), note: 'that day is full, so it keeps its usual time' };
      }
      return { start: slot, note: 'first free slot that day' };
    }
    if (clock !== null) return { start: T.atMinutes(inst.startWall, clock) };

    var next = SCHED.findTime(minutes, { days: 10, limit: 1, now: T.addMinutes(inst.startWall, 30) });
    if (!next.length) throw new JV.ToolError('Tell me where to move it to — I could not find an obvious slot.');
    return { start: next[0].start, note: 'the next opening that fits' };
  }

  function clockToMinutes(text) {
    var s = String(text || '').trim().toLowerCase();
    var m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (!m) return null;
    var h = parseInt(m[1], 10);
    var min = m[2] ? parseInt(m[2], 10) : 0;
    if (m[3] === 'pm' && h < 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
    if (!m[3] && h <= 7) h += 12;   // "move it to 4" means the afternoon
    if (h > 23) return null;
    return h * 60 + min;
  }

  function describeCreated(created) {
    var parts = [];
    Object.keys(created).forEach(function (k) {
      if (created[k]) parts.push(created[k] + ' ' + (created[k] === 1 ? k.replace(/s$/, '') : k));
    });
    return parts.length ? 'Added ' + parts.join(', ') + '.' : 'Nothing was added.';
  }

  JV.buildToolbelt = build;
})(window);
