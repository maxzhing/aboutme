/* Cadence · JARVIS — the local reasoner.

   The Python JARVIS shipped an Echo provider for offline runs: it echoed the
   prompt back, which proves the plumbing works but answers nothing. Inside a
   calendar app that would be useless, so Cadence replaces Echo with a real
   domain reasoner.

   It maps an utterance onto a plan of tool calls using an ordered intent table
   plus Cadence's own NLP parser. That is genuinely enough for a scheduling
   assistant, because the hard reasoning already lives in SCHED — the reasoner
   only has to decide *which* question is being asked and with what arguments.

   Everything here is local. A remote LLM can be attached for open-ended
   phrasing (see RemoteProvider) but it is off unless you turn it on. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};

  /* ------------------------------------------------------------ duration */

  var WORD_NUMBERS = {
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, half: 0.5
  };

  function parseDuration(text) {
    var s = String(text || '').toLowerCase();
    var m = s.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h)\b/);
    if (m) return Math.round(parseFloat(m[1]) * 60);
    m = s.match(/(\d+)\s*(minutes?|mins?|m)\b/);
    if (m) return parseInt(m[1], 10);
    if (/half an hour|30 ?min/.test(s)) return 30;
    if (/quarter of an hour/.test(s)) return 15;
    m = s.match(/\b(a|an|one|two|three|four|five|six)\s+(hours?|hrs?)\b/);
    if (m) return Math.round((WORD_NUMBERS[m[1]] || 1) * 60);
    return null;
  }

  /* Pull the day word out of a phrase, if there is one. */
  function parseWhen(text) {
    var s = String(text || '').toLowerCase();
    if (/\btomorrow\b/.test(s)) return 'tomorrow';
    if (/\btoday\b|\btonight\b|\bthis (morning|afternoon|evening)\b/.test(s)) return 'today';
    if (/\byesterday\b/.test(s)) return 'yesterday';
    var names = T.DAY_NAMES.map(function (n) { return n.toLowerCase(); });
    for (var i = 0; i < names.length; i++) {
      if (new RegExp('\\b' + names[i] + '\\b').test(s)) return names[i];
    }
    var iso = s.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (iso) return iso[1];
    return null;
  }

  /* Strip the command verb so what remains reads as a subject. */
  function subject(text, patterns) {
    var s = String(text || '').trim();
    patterns.forEach(function (p) { s = s.replace(p, ''); });
    return s.replace(/^[\s,:-]+|[\s,.!?]+$/g, '').trim();
  }

  /* ------------------------------------------------------------- intents */

  /* Ordered most-specific first. Each match returns one or more steps; a step
     is {text, tool, args} for an action or {text} for pure reasoning. */
  var INTENTS = [
    {
      id: 'recall',
      test: /\b(what do you know|what have you learned|do you remember|recall|remind me what)\b/i,
      steps: function (text) {
        var q = subject(text, [/\b(what do you know about|what have you learned about|do you remember|recall|remind me what)\b/i]);
        return [{ text: 'Search memory for “' + (q || 'anything relevant') + '”', tool: 'recall', args: { query: q || text } }];
      }
    },
    {
      id: 'remember',
      test: /^(remember|note that|keep in mind|don'?t forget)\b|\bi (always|usually|prefer|never)\b|\bfrom now on\b/i,
      steps: function (text) {
        var fact = subject(text, [/^(remember that|remember|note that|keep in mind that|keep in mind|don'?t forget that|don'?t forget)\b/i]);
        return [{ text: 'Store “' + fact + '” in memory', tool: 'remember', args: { text: fact || text } }];
      }
    },
    {
      /* Note on the trailing \b: these alternations match word *prefixes*
         ("conflict" inside "conflicts"), and a closing \b would fail exactly
         there — the character after the prefix is another word character. So
         prefix-style intents anchor only at the start. */
      /* "review" alone is not enough — "add design review with Priya" is a
         calendar entry, not a request for a retrospective. Require the word to
         travel with "week". */
      id: 'week_review',
      test: /\bweek\b[^.]*\b(review|recap|retrospective|went|go)\b|\b(review|recap|retrospective|summar(y|ise|ize))\b[^.]*\bweek\b|\bweekly (review|recap)\b/i,
      steps: function (text) {
        return [{ text: 'Review the past week', tool: 'week_review', args: {} }];
      }
    },
    {
      id: 'plan_week',
      test: /\b(plan|schedule|sort out|map out|organi[sz]e)\b.*\b(week)\b/i,
      steps: function () {
        return [{ text: 'Build a plan across the week', tool: 'plan_week', args: {} }];
      }
    },
    {
      /* The day word has to be the *object* of the verb. Matching it anywhere
         in the sentence made "organize: …, math test friday, …" read as a
         request to plan Friday. */
      id: 'plan_day',
      test: /\b(plan|schedule|sort out|map out|block out|organi[sz]e)\s+(out\s+)?(my\s+|the\s+)?(day|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      steps: function (text) {
        var when = parseWhen(text) || 'today';
        return [{ text: 'Plan ' + when, tool: 'plan_day', args: { date: when } }];
      }
    },
    {
      id: 'what_now',
      test: /\b(what (should|shall|can|do) i (be )?(do|doing|work on|start)|what now|what next|what'?s next)\b/i,
      steps: function () {
        return [{ text: 'Work out the best thing to do right now', tool: 'what_now', args: {} }];
      }
    },
    {
      id: 'break_down',
      test: /\b(break (down|up)|split up|split|subtasks? for|steps? for)\b/i,
      steps: function (text) {
        var task = subject(text, [/\b(can you |please )?(break (down|up)|split up|split|make subtasks? for|subtasks? for|steps? for)\b/i, /\binto (steps|subtasks|pieces|parts)\b/i]);
        return [{ text: 'Break down “' + task + '”', tool: 'break_down_task', args: { task: task } }];
      }
    },
    {
      id: 'complete',
      test: /\b(mark|tick|check)\b.*\b(done|off|complete)|^\s*(complete|finish|finished|completed|done with)\b|\bi (finished|completed|did)\b/i,
      steps: function (text) {
        var task = subject(text, [
          /^\s*(complete|finish|finished|completed|done with)\b/i,
          /\b(mark|tick|check)\b/i, /\b(as )?(done|complete[d]?|off)\b/i,
          /\bi (finished|completed|did)\b/i
        ]);
        return [{ text: 'Mark “' + task + '” done', tool: 'complete_task', args: { task: task } }];
      }
    },
    {
      id: 'schedule_task',
      test: /\b(find time for|make time for|block (out )?time for|schedule)\b/i,
      steps: function (text) {
        var minutes = parseDuration(text);
        var task = subject(text, [
          /\b(can you |please )?(find|make|block(?: out)?)\s+(some\s+)?time\s+(for|to)\b/i,
          /\bschedule\b/i,
          /\b\d+(\.\d+)?\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i,
          /\bfor (an?|one|two|three) hours?\b/i
        ]);
        var when = parseWhen(text);
        var args = { task: task };
        if (minutes) args.minutes = minutes;
        if (when) args.before = when;
        return [{ text: 'Find a slot for “' + task + '”', tool: 'schedule_task', args: args }];
      }
    },
    {
      id: 'find_time',
      /* Either an explicit "time/slot/gap" noun, or a bare duration — "find me
         an hour this week" names no noun but is unambiguously this question. */
      test: /\b(find|when|is there|do i have|any|got|get)\b.*(\b(time|slot|gap|space|free|opening)|\b(\d+|an?|one|two|three|half)\s*(hours?|hrs?|minutes?|mins?)\b)/i,
      steps: function (text) {
        var minutes = parseDuration(text) || 60;
        var when = parseWhen(text);
        var args = { minutes: minutes };
        // "this week" bounds the search; a weekday name is a hard deadline.
        if (/\bthis week\b/i.test(text)) args.days = 7;
        else if (when) args.before = when;
        return [{ text: 'Look for ' + T.humanDuration(minutes) + ' of open time', tool: 'find_time', args: args }];
      }
    },
    {
      id: 'conflicts',
      test: /\b(conflict|overlap|double.?book|clash|colliding)/i,
      steps: function () {
        return [{ text: 'Check the next week for overlaps', tool: 'conflicts', args: { days: 7 } }];
      }
    },
    {
      id: 'overdue',
      test: /\b(overdue|late|behind|slipped|missed|past due)\b/i,
      steps: function () {
        return [{ text: 'Pull everything overdue', tool: 'list_tasks', args: { scope: 'overdue' } }];
      }
    },
    {
      id: 'deadlines',
      test: /\bdeadlines?\b/i,
      steps: function () {
        return [{ text: 'List upcoming deadlines', tool: 'deadlines', args: {} }];
      }
    },
    {
      id: 'priorities',
      test: /\b(priorit|most important|what matters|focus on|top tasks?|biggest)/i,
      steps: function () {
        return [{ text: 'Rank open work by urgency and importance', tool: 'priorities', args: { limit: 6 } }];
      }
    },
    {
      id: 'workload',
      test: /\b(how busy|workload|how full|capacity|how much free|free time|busiest)\b/i,
      steps: function () {
        return [{ text: 'Measure load across the next week', tool: 'workload', args: { days: 7 } }];
      }
    },
    {
      id: 'agenda',
      test: /\b(agenda|schedule|calendar|what('?s| is| are)? (on|happening|scheduled)|what do i have|my day|what am i doing)\b/i,
      steps: function (text) {
        var when = parseWhen(text) || 'today';
        return [{ text: 'Read the agenda for ' + when, tool: 'agenda', args: { date: when } }];
      }
    },
    {
      id: 'tasks',
      test: /\b(tasks?|to.?dos?|todo list|what do i need to do)\b/i,
      steps: function (text) {
        var scope = /\bweek\b/i.test(text) ? 'week'
          : /\binbox\b/i.test(text) ? 'inbox'
            : /\ball\b/i.test(text) ? 'all' : 'today';
        return [{ text: 'List ' + scope + ' tasks', tool: 'list_tasks', args: { scope: scope } }];
      }
    },
    {
      id: 'organize',
      test: /\b(organi[sz]e|organi[sz]ing|brain ?dump|sort (this|these) out|make sense of)/i,
      steps: function (text) {
        var body = subject(text, [/\b(can you |please )?(organi[sz]e|sort (this|these) out|make sense of)\b/i, /^\s*brain ?dump:?/i]);
        return [{ text: 'Split that into separate items', tool: 'organize', args: { text: body || text } }];
      }
    },
    {
      id: 'create',
      test: /^\s*(add|create|new|book|set up|put|remind me to|i need to|i have to|i must)\b/i,
      steps: function (text) {
        var body = subject(text, [/^\s*(add|create|new|book|set up|put|remind me to|i need to|i have to|i must)\b/i, /\bto (my|the) (calendar|list|schedule)\b/i]);
        if (!body) return [{ text: 'Nothing to add' }];
        var type = 'task';
        try {
          var parsed = NLP.parse(body, { settings: S.settings() });
          type = parsed.type || 'task';
        } catch (err) { /* keep the default */ }
        var tool = type === 'event' ? 'create_event'
          : type === 'deadline' ? 'create_deadline'
            : type === 'note' ? 'create_note' : 'create_task';
        var args = tool === 'create_note' ? { title: body } : { text: body };
        return [{ text: 'Create a ' + type + ' from “' + body + '”', tool: tool, args: args }];
      }
    },
    {
      id: 'search',
      test: /\b(find|search|look up|where is|show me|when is|do i have)\b/i,
      steps: function (text) {
        var q = subject(text, [/\b(can you |please )?(find|search for|search|look up|where is|show me|when is|do i have)\b/i, /\bin (my )?(calendar|notes|tasks)\b/i]);
        return [{ text: 'Search for “' + q + '”', tool: 'search', args: { query: q || text, limit: 8 } }];
      }
    }
  ];

  function byId(id) {
    for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i].id === id) return INTENTS[i];
    return null;
  }

  /* Verbs and question words that can open an independent ask. A bare "and"
     only splits when what follows starts with one of these — otherwise
     "lunch with Sarah and Tom" would become two requests. */
  var OPENERS = 'find|plan|what|when|where|show|tell|add|create|schedule|book|list|review|recap|check|how|why|is there|are there|do i|give me|remind';

  /* Split a compound request into independent asks. */
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

  function LocalReasoner() {
    this.name = 'local';
  }

  LocalReasoner.prototype.available = function () { return true; };

  /* Decompose a goal into steps. Returns {steps, confidence, clarify}. */
  LocalReasoner.prototype.plan = function (goal) {
    var text = String(goal || '').trim();
    if (!text) {
      return { steps: [], confidence: 0.1, clarify: 'What would you like me to look at?' };
    }

    var steps = [];
    var matched = [];
    segments(text).forEach(function (segment) {
      // An explicit create verb at the start is unambiguous, and its object may
      // contain words that also read as queries ("add design review",
      // "book conflict resolution"). Settle it before the intent table runs.
      var intents = /^\s*(add|create|new|book|set up|put)\b/i.test(segment)
        ? [byId('create')].concat(INTENTS)
        : INTENTS;

      for (var i = 0; i < intents.length; i++) {
        if (intents[i] && intents[i].test.test(segment)) {
          var produced = intents[i].steps(segment) || [];
          produced.forEach(function (s) { steps.push(s); });
          matched.push(intents[i].id);
          return;
        }
      }

      // Nothing matched this segment. If it were dropped, a compound request
      // would quietly answer only half of what was asked — so fall back to a
      // search for this part rather than losing it.
      steps.push({
        text: 'Search everything for “' + segment + '”',
        tool: 'search', args: { query: segment, limit: 6 }
      });
      matched.push('fallback');
    });

    // Steps that name a subject we could not resolve are worth a question.
    var vague = steps.some(function (s) {
      return s.args && typeof s.args.task === 'string' && s.args.task.length < 2;
    });
    if (vague) {
      return {
        steps: steps, confidence: 0.3, matched: matched,
        clarify: 'Which task did you mean?'
      };
    }

    return {
      steps: steps,
      confidence: matched.indexOf('fallback') >= 0 ? 0.45 : 0.86,
      matched: matched
    };
  };

  /* ------------------------------------------------------ remote provider */

  /* Optional. Cadence is local-first and says so in its own noscript copy, so
     nothing here runs unless the user explicitly enables it in Settings and
     supplies a key. It is used only to phrase answers for requests the local
     reasoner could not classify — never to move data around on its own. */
  function RemoteProvider(config) {
    this.name = 'remote';
    this.config = config || {};
  }

  RemoteProvider.prototype.available = function () {
    return !!(this.config.enabled && this.config.endpoint && this.config.model);
  };

  RemoteProvider.prototype.complete = function (system, user) {
    if (!this.available()) return Promise.reject(new Error('Remote model is not configured.'));
    var cfg = this.config;
    var headers = { 'Content-Type': 'application/json' };
    var body;
    if (cfg.flavour === 'anthropic') {
      headers['x-api-key'] = cfg.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = {
        model: cfg.model, max_tokens: 800, system: system,
        messages: [{ role: 'user', content: user }]
      };
    } else {
      if (cfg.apiKey) headers.Authorization = 'Bearer ' + cfg.apiKey;
      body = {
        model: cfg.model, max_tokens: 800,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
      };
    }
    return fetch(cfg.endpoint, {
      method: 'POST', headers: headers, body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) throw new Error('Model returned ' + res.status);
      return res.json();
    }).then(function (data) {
      if (data.content && data.content.length) return data.content[0].text || '';
      if (data.choices && data.choices.length) {
        return (data.choices[0].message && data.choices[0].message.content) || '';
      }
      if (data.message && data.message.content) return data.message.content;
      return '';
    });
  };

  JV.LocalReasoner = LocalReasoner;
  JV.RemoteProvider = RemoteProvider;
  JV.parseDuration = parseDuration;
  JV.INTENTS = INTENTS;
})(window);
