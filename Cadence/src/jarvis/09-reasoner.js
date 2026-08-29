/* Cadence · JARVIS — the local reasoner.

   Maps an utterance onto a plan of tool calls. The hard scheduling reasoning
   lives in SCHED and in the scheduler/optimiser modules; this file only has to
   decide *which* question is being asked and with what arguments.

   An intent's `test` may be a RegExp or a predicate. Predicates exist because
   the interesting cases are conjunctions — "a plannable noun AND a date AND a
   request to prepare" is what separates "my physics project is due Friday,
   help me plan" from "add physics project due Friday".

   Order matters and is deliberate: the most specific, most consequential
   intents are checked first, and the search fallback is last. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};

  /* ---------------------------------------------------------- extraction */

  var NUMBER_WORDS = {
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, half: 0.5
  };

  function wordNumber(w) {
    if (w === undefined || w === null) return null;
    var s = String(w).toLowerCase();
    if (NUMBER_WORDS[s] !== undefined) return NUMBER_WORDS[s];
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  function parseDuration(text) {
    var s = String(text || '').toLowerCase();
    var m = s.match(/(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|half)\s*(?:-|\s)?\s*(hours?|hrs?|h)\b/);
    if (m) {
      var n = wordNumber(m[1]);
      if (n !== null) return Math.round(n * 60);
    }
    m = s.match(/(\d+)\s*(?:-|\s)?\s*(minutes?|mins?|m)\b/);
    if (m) return parseInt(m[1], 10);
    if (/half an hour/.test(s)) return 30;
    if (/quarter of an hour/.test(s)) return 15;
    return null;
  }

  function parseSessionCount(text) {
    var m = String(text || '').toLowerCase()
      .match(/\b(\d+|one|two|three|four|five|six|seven|eight)\s+(?:\w+[- ])?(sessions?|blocks?|sittings?|slots?|chunks?)\b/);
    return m ? wordNumber(m[1]) : null;
  }

  /* Words that stand in for a date already mentioned ("before then"). They are
     not dates themselves, so they must not be handed to the date parser. */
  var ANAPHORA = /^(then|that|it|this|the deadline|the due date|the date)$/i;

  /* A trailing date phrase: "before Friday", "by the 20th", "due September 20". */
  function parseDeadlinePhrase(text) {
    var s = String(text || '');
    var m = s.match(/\b(?:before|by|due(?:\s+on)?|until|ahead of)\s+((?:next\s+|this\s+)?[a-z0-9][a-z0-9 ,]{1,28}?)(?=[.,;]|$|\s+(?:and|so|then|for|to)\b)/i);
    // "before then" points at a date stated earlier in the sentence; fall
    // through and find that date rather than trying to parse the pronoun.
    if (m && !ANAPHORA.test(m[1].trim())) return m[1].trim();
    m = s.match(/\b(tomorrow|today|tonight|this weekend|next week)\b/i);
    if (m) return m[1];
    m = s.match(/\b(?:next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
    if (m) return m[0];
    m = s.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/i);
    if (m) return m[0];
    m = s.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (m) return m[1];
    return null;
  }

  function parseWhen(text) {
    var s = String(text || '').toLowerCase();
    if (/\btomorrow\b/.test(s)) return 'tomorrow';
    if (/\btoday\b|\btonight\b/.test(s)) return 'today';
    if (/\byesterday\b/.test(s)) return 'yesterday';
    var m = s.match(/\b(?:next\s+|this\s+|on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
    if (m) return m[0].replace(/^on\s+/, '');
    m = s.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (m) return m[1];
    m = s.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/);
    if (m) return m[0];
    return null;
  }

  function parseClock(text) {
    var m = String(text || '').toLowerCase()
      .match(/\b(?:at|from)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/);
    return m ? m[1].trim() : null;
  }

  /* Strip command words so what remains reads as a subject. */
  function subject(text, patterns) {
    var s = String(text || '').trim();
    patterns.forEach(function (p) { s = s.replace(p, ' '); });
    return s.replace(/\s+/g, ' ').replace(/^[\s,:;-]+|[\s,.!?;:-]+$/g, '').trim();
  }

  var PLANNABLE = /\b(project|essay|paper|report|exam|test|quiz|midterm|final|presentation|assignment|thesis|dissertation|deck|talk|lab|application|portfolio)\b/i;
  var PLAN_VERB = /\b(plan|prepare|prep|study|revise|get (it|this) done|make sure|help me|work on|finish|break (it|this) down|schedule)\b/i;
  var DATEISH = /\b(due|deadline|by|before|on)\b|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week)\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b|\b\d{4}-\d{2}-\d{2}\b/i;

  /* ------------------------------------------------------------- intents */

  var INTENTS = [
    {
      id: 'morning_brief',
      test: /\b(morning brief(ing)?|brief me|daily brief|good morning|start my day|what does today look like)\b/i,
      steps: function () {
        return [{ text: 'Pull together the day ahead', tool: 'plan.morning_brief', args: {} }];
      }
    },
    {
      id: 'day_review',
      test: /\b(how did i do|how was (my|today)|end of day|day review|review my day|wrap up (my )?day)\b/i,
      steps: function (text) {
        var when = parseWhen(text);
        return [{ text: 'Review the day', tool: 'plan.day_review', args: when ? { date: when } : {} }];
      }
    },
    {
      id: 'week_review',
      test: /\bweek\b[^.]*\b(review|recap|retrospective|went|go)\b|\b(review|recap|retrospective|summar(y|ise|ize))\b[^.]*\bweek\b|\bweekly (review|recap)\b/i,
      steps: function () {
        return [{ text: 'Review the past week', tool: 'plan.week_review', args: {} }];
      }
    },
    {
      id: 'optimize',
      test: /\b(optimi[sz]e|improve|tidy up|clean up|fix|rebalance|sort out)\b[^.]*\b(schedule|calendar|week|day)\b|\bwhat should i change\b/i,
      steps: function (text) {
        var days = /\bmonth\b/i.test(text) ? 30 : /\bday|today\b/i.test(text) ? 1 : 7;
        return [{ text: 'Analyse the schedule for improvements', tool: 'plan.optimize', args: { days: days } }];
      }
    },
    {
      /* The flagship: a plannable thing, a date, and an implied ask to prepare. */
      id: 'project',
      test: function (text) {
        if (!PLANNABLE.test(text) || !DATEISH.test(text)) return false;
        if (!parseDeadlinePhrase(text)) return false;
        // "due X" alone is enough; otherwise we need a planning verb.
        return /\b(due|deadline)\b/i.test(text) || PLAN_VERB.test(text);
      },
      steps: function (text) {
        var deadline = parseDeadlinePhrase(text);
        var perDay = null;
        var m = text.match(/\b(?:about\s+)?(an?|\d+(?:\.\d+)?|one|two|three|four)\s*(hours?|hrs?|minutes?|mins?)\s+(?:a|per|each)\s+day\b/i);
        if (m) perDay = parseDuration(m[0]);
        var total = perDay ? null : parseDuration(text);

        // The subject lives in the first clause; everything after the first
        // sentence break is instructions about it, not part of its name.
        var head = String(text).split(/(?:[.!?]|\bso\b|\band\s+(?:find|schedule|make|prioriti))/i)[0];
        var title = subject(head, [
          /\b(i have|i've got|i got|there'?s|help me (with|plan|prepare for)?|make sure i|can you|please|plan|prepare for|prep for|study for|revise for|finish|work on|my|a|an)\b/gi,
          /\b(is |are )?(due|deadline)\b.*$/i,
          /\bby\s+.*$/i, /\bbefore\s+.*$/i,
          /\b(next\s+|this\s+|on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b/gi,
          /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/gi,
          /\b\d+(\.\d+)?\s*(hours?|hrs?|minutes?|mins?)\b.*$/i
        ]) || 'Project';
        // Capitalise so it reads as a name on the calendar.
        title = title.charAt(0).toUpperCase() + title.slice(1);

        var args = { title: title, deadline: deadline };
        if (total) args.totalMinutes = total;
        if (perDay) args.perDayMinutes = perDay;
        return [{ text: 'Plan “' + title + '” for ' + deadline, tool: 'plan.project', args: args }];
      }
    },
    {
      /* Asking JARVIS to look something up. It cannot, and says so rather than
         inventing a "researched" plan — but it still offers what it does have. */
      id: 'research',
      test: /\b(research|look up|search (the )?(web|internet|online)|find (me )?(a|the|some) (good|best|recommended)|google)\b/i,
      steps: function (text) {
        var topic = subject(text, [
          /\b(can you |please )?(research|look up|search (the )?(web|internet|online)|google)\b/i,
          /\bfind (me )?(a|the|some) (good|best|recommended)\b/i,
          /\band schedule it.*$/i, /\binto my calendar\b/i, /\bfor me\b/i,
          /\b(plan|schedule)\b/i, /\bmy\b/i
        ]);
        return [{ text: 'Explain what I can look up', tool: 'plan.research', args: topic ? { topic: topic } : {} }];
      }
    },
    {
      id: 'reschedule',
      test: /\b(couldn'?t|could not|didn'?t|did not|never)\s+(finish|do|get to|start|complete|make)\b|\bran out of time\b|\bfell behind\b|\bneed(s)? more time\b/i,
      steps: function (text) {
        var work = subject(text, [
          /\bi\s+(couldn'?t|could not|didn'?t|did not|never)\s+(finish|do|get to|start|complete|make)\b/i,
          /\b(couldn'?t|could not|didn'?t|did not)\s+(finish|do|get to|start|complete)\b/i,
          /\bran out of time (for|on)?\b/i, /\btoday\b/i, /\byesterday\b/i, /\bmy\b/i
        ]);
        return [{ text: 'Find new time for ' + (work || 'what slipped'), tool: 'plan.reschedule', args: work ? { work: work } : {} }];
      }
    },
    {
      id: 'recall',
      test: /\b(what do you know|what have you learned|do you remember|recall|remind me what)\b/i,
      steps: function (text) {
        var q = subject(text, [/\b(what do you know about|what have you learned about|do you remember|recall|remind me what)\b/i]);
        return [{ text: 'Search memory', tool: 'memory.recall', args: { query: q || text } }];
      }
    },
    {
      id: 'remember',
      test: /^(remember|note that|keep in mind|don'?t forget)\b|\bi (always|usually|generally|prefer|never)\b|\bfrom now on\b/i,
      steps: function (text) {
        var fact = subject(text, [/^(remember that|remember|note that|keep in mind that|keep in mind|don'?t forget that|don'?t forget)\b/i]);
        return [{ text: 'Store that in memory', tool: 'memory.remember', args: { text: fact || text } }];
      }
    },
    {
      id: 'move_range',
      test: /\bmove\b[^.]*\b(everything|all|the rest|my whole|anything)\b/i,
      steps: function (text) {
        var from = parseWhen(text) || 'today';
        // The destination is whatever follows "to".
        var toMatch = text.match(/\bto\s+((?:next\s+|this\s+)?[a-z0-9-]+(?:\s+\d{1,2})?)/i);
        var to = toMatch ? toMatch[1] : null;
        var afterMatch = text.match(/\bafter\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
        var args = { from: from, to: to || 'tomorrow' };
        if (afterMatch) args.after = afterMatch[1].trim();
        return [{ text: 'Move that day’s events', tool: 'calendar.move_range', args: args }];
      }
    },
    {
      id: 'move_event',
      test: /\b(move|reschedule|shift|push|bump)\b/i,
      steps: function (text) {
        var when = parseWhen(text);
        var clock = parseClock(text);
        var event = subject(text, [
          /\b(can you |please )?(move|reschedule|shift|push|bump)\b/i,
          /\bto\s+(next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|\d{4}-\d{2}-\d{2}).*$/i,
          /\b(to|at|from)\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b.*$/i,
          /\b(back|forward|later|earlier)\b/i, /\bmy\b/i
        ]);
        var args = { event: event };
        if (when) args.when = when;
        if (clock) args.time = clock;
        return [{ text: 'Move “' + event + '”', tool: 'calendar.move_event', args: args }];
      }
    },
    {
      id: 'delete_event',
      test: /\b(delete|cancel|remove|drop|call off|get rid of)\b/i,
      steps: function (text) {
        var event = subject(text, [
          /\b(can you |please )?(delete|cancel|remove|drop|call off|get rid of)\b/i, /\bmy\b/i, /\bfrom (my )?calendar\b/i
        ]);
        return [{ text: 'Delete “' + event + '”', tool: 'calendar.delete_event', args: { event: event } }];
      }
    },
    {
      id: 'update_event',
      test: /\b(rename|call it|change the (name|title|length)|make (it|my)\b[^.]*\b(minutes?|hours?)|shorten|lengthen|extend)\b/i,
      steps: function (text) {
        var minutes = parseDuration(text);
        var renameTo = (text.match(/\b(?:rename\s+.*?\s+to|call it)\s+(.+)$/i) || [])[1];
        var event = subject(text, [
          /\b(rename|call it)\b.*$/i, /\bchange the (name|title|length) of\b/i,
          /\b(make|shorten|lengthen|extend)\b/i, /\bto\s+\d+.*$/i,
          /\b\d+\s*(minutes?|mins?|hours?|hrs?)\b/i, /\bmy\b/i
        ]);
        var args = { event: event };
        if (minutes) args.minutes = minutes;
        if (renameTo) args.title = renameTo.trim();
        return [{ text: 'Update “' + event + '”', tool: 'calendar.update_event', args: args }];
      }
    },
    {
      id: 'complete',
      test: /\b(mark|tick|check)\b.*\b(done|off|complete)|^\s*(complete|finish|finished|completed|done with)\b|\bi (finished|completed|did)\b/i,
      steps: function (text) {
        var task = subject(text, [
          /^\s*(complete|finish|finished|completed|done with)\b/i,
          /\b(mark|tick|check)\b/i, /\b(as )?(done|complete[d]?|off)\b/i,
          /\bi (finished|completed|did)\b/i, /\bmy\b/i
        ]);
        return [{ text: 'Mark “' + task + '” done', tool: 'calendar.complete_task', args: { task: task } }];
      }
    },
    {
      id: 'break_down',
      test: /\b(break (down|up)|split up|subtasks? for|steps? for)\b/i,
      steps: function (text) {
        var task = subject(text, [
          /\b(can you |please )?(break (down|up)|split up|make subtasks? for|subtasks? for|steps? for)\b/i,
          /\binto (steps|subtasks|pieces|parts)\b/i, /\bmy\b/i
        ]);
        return [{ text: 'Break down “' + task + '”', tool: 'plan.break_down', args: { task: task } }];
      }
    },
    {
      /* Explicit multi-session work: "four study sessions before Friday",
         "two hours of studying tomorrow", "three hours this week for X". */
      id: 'sessions',
      test: function (text) {
        if (parseSessionCount(text)) return true;
        var dur = parseDuration(text);
        if (!dur) return false;
        // A duration plus something to spend it on.
        return /\b(of|for)\s+[a-z]/i.test(text) &&
          /\b(study|studying|work|working|practice|practise|revise|revising|read|reading|prep|preparing|schedule|find|block|spend)\b/i.test(text);
      },
      steps: function (text) {
        var count = parseSessionCount(text);
        var each = parseDuration(text);
        var deadline = parseDeadlinePhrase(text);

        var work = subject(text, [
          /\b(can you |please )?(find|schedule|book|block(?: out)?|set aside|spend|give me|make)\b/i,
          /\b(\d+|one|two|three|four|five|six|seven|eight)\s+(\w+[- ])?(sessions?|blocks?|sittings?|slots?|chunks?)\b/i,
          /\b\d+(\.\d+)?\s*(hours?|hrs?|h|minutes?|mins?)\b/i,
          /\b(an?|one|two|three|four|five|six)\s+(hours?|hrs?)\b/i,
          /\b(before|by|due|until|ahead of)\s+.*$/i,
          /\b(this|next)\s+(week|month|weekend)\b/i,
          /\b(tomorrow|today|tonight)\b/i,
          /\b(of|for|on)\b/i, /\bmy\b/i, /\btime\b/i
        ]) || 'Focus';

        var args = { work: work };
        if (count) args.sessions = count;
        if (each && count) args.sessionMinutes = each;
        else if (each) args.totalMinutes = each;
        if (deadline) args.deadline = deadline;
        return [{
          text: 'Spread ' + (count ? count + ' sessions' : (each ? JV.DX.hours(each) : 'the work')) +
            ' of “' + work + '” across free time',
          tool: 'plan.sessions', args: args
        }];
      }
    },
    {
      id: 'schedule_task',
      test: /\b(find time for|make time for|block (out )?time for|set aside time for)\b/i,
      steps: function (text) {
        var minutes = parseDuration(text);
        var deadline = parseDeadlinePhrase(text);
        var work = subject(text, [
          /\b(can you |please )?(find|make|block(?: out)?|set aside)\s+(some\s+)?time\s+(for|to)\b/i,
          /\b\d+(\.\d+)?\s*(hours?|hrs?|h|minutes?|mins?)\b/i,
          /\b(before|by|due|until)\s+.*$/i, /\bmy\b/i
        ]);
        var args = { work: work };
        if (minutes) args.totalMinutes = minutes;
        if (deadline) args.deadline = deadline;
        return [{ text: 'Find time for “' + work + '”', tool: 'plan.sessions', args: args }];
      }
    },
    {
      id: 'what_now',
      test: /\b(what (should|shall|can|do) i (be )?(do|doing|work on|start)|what now|what next|what'?s next)\b/i,
      steps: function () {
        return [{ text: 'Work out the best thing to do right now', tool: 'plan.what_now', args: {} }];
      }
    },
    {
      id: 'free_time',
      test: /\b(am i free|are we free|do i have (any )?(time|space)|when am i free|free time|any openings?|availabilit)/i,
      steps: function (text) {
        var minutes = parseDuration(text) || 60;
        var when = parseWhen(text) || (/\bweekend\b/i.test(text) ? 'saturday' : null);
        var args = { minutes: minutes };
        if (/\bthis week\b/i.test(text)) args.days = 7;
        else if (when) args.before = when;
        return [{ text: 'Look for open time', tool: 'calendar.find_free_time', args: args }];
      }
    },
    {
      id: 'find_time',
      test: /\b(find|when|is there|any)\b[^.]*\b(time|slot|gap|space|opening)\b/i,
      steps: function (text) {
        var minutes = parseDuration(text) || 60;
        var when = parseWhen(text);
        var args = { minutes: minutes };
        if (/\bthis week\b/i.test(text)) args.days = 7;
        else if (when) args.before = when;
        return [{ text: 'Look for ' + JV.DX.hours(minutes) + ' of open time', tool: 'calendar.find_free_time', args: args }];
      }
    },
    {
      id: 'conflicts',
      test: /\b(conflict|overlap|double.?book|clash|colliding)/i,
      steps: function () {
        return [{ text: 'Check the week for overlaps', tool: 'calendar.find_conflicts', args: { days: 7 } }];
      }
    },
    {
      id: 'overdue',
      test: /\b(overdue|late|behind|slipped|past due)\b/i,
      steps: function () {
        return [{ text: 'Pull everything overdue', tool: 'calendar.list_tasks', args: { scope: 'overdue' } }];
      }
    },
    {
      id: 'deadlines',
      test: /\bdeadlines?\b/i,
      steps: function () {
        return [{ text: 'List upcoming deadlines', tool: 'calendar.deadlines', args: {} }];
      }
    },
    {
      id: 'priorities',
      test: /\b(priorit|most important|what matters|focus on|top tasks?|biggest)/i,
      steps: function () {
        return [{ text: 'Rank open work', tool: 'plan.priorities', args: { limit: 6 } }];
      }
    },
    {
      id: 'time_spent',
      test: /\bhow (much|many)\b[^.]*\b(time|hours?)\b|\bwhere (is|does) my time\b|\btime spent\b/i,
      steps: function (text) {
        var topic = subject(text, [
          /\bhow (much|many)\b/i, /\b(time|hours?)\b/i, /\bam i\b/i, /\bspending\b/i, /\bspent\b/i,
          /\bdo i spend\b/i, /\bon\b/i, /\bwhere (is|does) my\b/i, /\bgo\b/i, /\bmy\b/i,
          /\b(this|last|past)\s+(week|month)\b/i
        ]);
        var days = /\b(month|30 days)\b/i.test(text) ? 30 : /\bweek\b/i.test(text) ? 7 : 28;
        return [{
          text: topic ? 'Add up time on “' + topic + '”' : 'Break down where time went',
          tool: 'calendar.time_spent', args: topic ? { query: topic, days: days } : { days: days }
        }];
      }
    },
    {
      id: 'workload',
      test: /\b(how busy|workload|how full|capacity|busiest|how packed)\b/i,
      steps: function (text) {
        var days = /\bmonth\b/i.test(text) ? 30 : 7;
        return [{ text: 'Measure load across the window', tool: 'calendar.workload', args: { days: days } }];
      }
    },
    {
      id: 'get_month',
      test: /\bthis month\b|\bthe month\b|\bmonthly\b/i,
      steps: function (text) {
        var type = /\bexams?\b|\btests?\b/i.test(text) ? 'deadline' : null;
        if (type) {
          var term = /\bexams?\b/i.test(text) ? 'exam' : 'test';
          return [{
            text: 'Find ' + term + 's this month', tool: 'calendar.search',
            args: { query: term, limit: 12, range: 'this month' }
          }];
        }
        return [{ text: 'Read the month', tool: 'calendar.get_month', args: {} }];
      }
    },
    {
      id: 'get_week',
      test: /\b(this|next|the) week\b|\bweekly schedule\b/i,
      steps: function (text) {
        var start = /\bnext week\b/i.test(text) ? null : null;
        return [{
          text: 'Read the week', tool: 'calendar.get_week',
          args: /\bnext week\b/i.test(text) ? { start: nextWeekStart() } : {}
        }];
      }
    },
    {
      id: 'agenda',
      test: /\b(agenda|schedule|calendar|what('?s| is| are)? (on|happening|scheduled)|what do i have|my day|what am i doing|plans? for)\b/i,
      steps: function (text) {
        var when = parseWhen(text) || 'today';
        return [{ text: 'Read the agenda for ' + when, tool: 'calendar.get_day', args: { date: when } }];
      }
    },
    {
      id: 'plan_week',
      test: /\b(plan|schedule|sort out|map out|organi[sz]e)\s+(out\s+)?(my\s+|the\s+)?week\b/i,
      steps: function () {
        return [{ text: 'Build a plan across the week', tool: 'plan.week', args: {} }];
      }
    },
    {
      id: 'plan_day',
      test: /\b(plan|schedule|sort out|map out|block out|organi[sz]e)\s+(out\s+)?(my\s+|the\s+)?(day|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      steps: function (text) {
        var when = parseWhen(text) || 'today';
        return [{ text: 'Plan ' + when, tool: 'plan.day', args: { date: when } }];
      }
    },
    {
      id: 'tasks',
      test: /\b(tasks?|to.?dos?|todo list|what do i need to do)\b/i,
      steps: function (text) {
        var scope = /\bweek\b/i.test(text) ? 'week'
          : /\binbox\b/i.test(text) ? 'inbox'
            : /\ball\b/i.test(text) ? 'all' : 'today';
        return [{ text: 'List ' + scope + ' tasks', tool: 'calendar.list_tasks', args: { scope: scope } }];
      }
    },
    {
      id: 'organize',
      test: /\b(organi[sz]e|organi[sz]ing|brain ?dump|sort (this|these) out|make sense of)/i,
      steps: function (text) {
        var body = subject(text, [
          /\b(can you |please )?(organi[sz]e|sort (this|these) out|make sense of)\b/i, /^\s*brain ?dump:?/i
        ]);
        return [{ text: 'Split that into separate items', tool: 'calendar.organize', args: { text: body || text } }];
      }
    },
    {
      id: 'recurring',
      test: /\bevery\s+(day|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+\s+(days|weeks))\b/i,
      steps: function (text) {
        var body = subject(text, [/^\s*(add|create|new|book|set up|put|schedule)\b/i]);
        return [{ text: 'Create a repeating event', tool: 'calendar.create_recurring_event', args: { text: body || text } }];
      }
    },
    {
      id: 'create',
      test: /^\s*(add|create|new|book|set up|put|remind me to|i need to|i have to|i must)\b/i,
      steps: function (text) {
        var body = subject(text, [
          /^\s*(add|create|new|book|set up|put|remind me to|i need to|i have to|i must)\b/i,
          /\bto (my|the) (calendar|list|schedule)\b/i
        ]);
        if (!body) return [{ text: 'Nothing to add' }];
        var type = 'task';
        try { type = NLP.parse(body, { settings: S.settings() }).type || 'task'; } catch (err) { /* default */ }
        var tool = type === 'event' ? 'calendar.create_event'
          : type === 'deadline' ? 'calendar.create_deadline'
            : type === 'note' ? 'calendar.create_note' : 'calendar.create_task';
        var args = tool === 'calendar.create_note' ? { title: body } : { text: body };
        return [{ text: 'Create a ' + type + ' from “' + body + '”', tool: tool, args: args }];
      }
    },
    {
      id: 'search',
      test: /\b(find|search|look up|where is|show me|when (is|was)|do i have)\b/i,
      steps: function (text) {
        var q = subject(text, [
          /\b(can you |please )?(find|search for|search|look up|where is|show me|when (is|was)|do i have)\b/i,
          /\bin (my )?(calendar|notes|tasks)\b/i, /\bmy\b/i, /\ball\b/i,
          // Time qualifiers describe the search, not the thing searched for.
          /\b(last|next|latest|most recent|previous|upcoming)\b/i,
          /\bwhat days?\b/i, /\bdo i have\b/i
        ]);
        return [{ text: 'Search for “' + q + '”', tool: 'calendar.search', args: { query: q || text, limit: 8 } }];
      }
    }
  ];

  function nextWeekStart() {
    return T.key(T.startOfWeek(T.addDays(T.nowWall(), 7)));
  }

  function byId(id) {
    for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i].id === id) return INTENTS[i];
    return null;
  }

  function matches(intent, segment) {
    return typeof intent.test === 'function' ? !!intent.test(segment) : intent.test.test(segment);
  }

  /* Openers that can begin an independent ask after a bare "and". */
  var OPENERS = 'find|plan|what|when|where|show|tell|add|create|schedule|book|list|review|recap|check|how|why|is there|are there|do i|give me|remind|move|delete|cancel|optimi[sz]e|make sure';

  function segments(text) {
    var parts = String(text || '')
      .split(new RegExp(
        '(?:\\s+and then\\s+|\\s+then\\s+|\\s*;\\s*|\\s+and also\\s+|\\s*,?\\s+also\\s+' +
        '|\\s+and\\s+(?=(?:' + OPENERS + ')\\b))', 'i'))
      .map(function (s) { return s ? s.trim() : ''; })
      .filter(Boolean);
    return parts.length ? parts : [String(text || '')];
  }

  /* ------------------------------------------------------- local reasoner */

  function LocalReasoner() { this.name = 'local'; }

  LocalReasoner.prototype.available = function () { return true; };

  LocalReasoner.prototype.plan = function (goal) {
    // People address the assistant by name; that is not part of the request,
    // and it must not end up in an event title.
    var text = String(goal || '').trim()
      .replace(/^(hey\s+|ok(ay)?\s+|hi\s+)?jarvis[,!:]?\s+/i, '')
      .trim();
    if (!text) return { steps: [], confidence: 0.1, clarify: 'What would you like me to look at?' };

    var steps = [];
    var matched = [];

    segments(text).forEach(function (segment) {
      // A whole-utterance project ask must not be split apart by a stray
      // "and" — check it against the full text before per-segment matching.
      var intents = /^\s*(add|create|new|book|set up|put)\b/i.test(segment)
        ? [byId('recurring'), byId('create')].concat(INTENTS)
        : INTENTS;

      for (var i = 0; i < intents.length; i++) {
        if (intents[i] && matches(intents[i], segment)) {
          (intents[i].steps(segment) || []).forEach(function (s) { steps.push(s); });
          matched.push(intents[i].id);
          return;
        }
      }

      // Nothing matched. Dropping the segment would answer half a compound
      // question silently, so fall back to a search over the user's own data.
      steps.push({
        text: 'Search everything for “' + segment + '”',
        tool: 'calendar.search', args: { query: segment, limit: 6 }
      });
      matched.push('fallback');
    });

    // A whole-text project match beats a set of fragments every time.
    var projectIntent = byId('project');
    if (matched.indexOf('project') < 0 && matches(projectIntent, text) && segments(text).length > 1) {
      steps = projectIntent.steps(text);
      matched = ['project'];
    }

    var vague = steps.some(function (s) {
      return s.args && typeof s.args.event === 'string' && s.args.event.length < 2;
    }) || steps.some(function (s) {
      return s.args && typeof s.args.task === 'string' && s.args.task.length < 2;
    });
    if (vague) {
      return { steps: steps, confidence: 0.3, matched: matched, clarify: 'Which one did you mean?' };
    }

    return {
      steps: steps,
      confidence: matched.indexOf('fallback') >= 0 ? 0.45 : 0.86,
      matched: matched
    };
  };

  /* ------------------------------------------------------ remote provider */

  /* Optional. Cadence is local-first and says so in its own copy, so nothing
     here runs unless the user configures it in Settings. */
  function RemoteProvider(config) {
    this.name = 'remote';
    this.config = config || {};
  }

  RemoteProvider.prototype.available = function () {
    return !!(this.config.enabled && this.config.endpoint && this.config.model);
  };

  RemoteProvider.prototype.complete = function (system, user) {
    if (!this.available()) return Promise.reject(new Error('No model is configured.'));
    var cfg = this.config;
    var headers = { 'Content-Type': 'application/json' };
    var body;
    if (cfg.flavour === 'anthropic') {
      headers['x-api-key'] = cfg.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = { model: cfg.model, max_tokens: 800, system: system, messages: [{ role: 'user', content: user }] };
    } else {
      if (cfg.apiKey) headers.Authorization = 'Bearer ' + cfg.apiKey;
      body = {
        model: cfg.model, max_tokens: 800,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
      };
    }
    return fetch(cfg.endpoint, { method: 'POST', headers: headers, body: JSON.stringify(body) })
      .then(function (res) {
        if (!res.ok) throw new Error('The model returned ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data.content && data.content.length) return data.content[0].text || '';
        if (data.choices && data.choices.length) return (data.choices[0].message || {}).content || '';
        if (data.message && data.message.content) return data.message.content;
        return '';
      });
  };

  JV.LocalReasoner = LocalReasoner;
  JV.RemoteProvider = RemoteProvider;
  JV.parseDuration = parseDuration;
  JV.INTENTS = INTENTS;
})(window);
