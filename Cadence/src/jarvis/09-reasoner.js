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

  /* People ask politely. "Can you put biology study on my calendar tomorrow?"
     is the same request as "add biology study tomorrow", and an anchored
     imperative alone would miss every courteous phrasing of it. */
  var POLITE_CREATE = /^\s*(?:(?:can|could|would|will)\s+(?:you|u)\s+|please\s+|hey\s+|pls\s+)*(add|create|make|new|book|set\s+up|put|schedule|stick|pop|throw|remind me to)\b/i;

  /* Unmistakably social openings. Kept narrow on purpose: it only has to catch
     the shapes that would otherwise be mis-read as commands. */
  var SOCIAL = new RegExp([
    '^(hi|hey+|hello|yo+|sup|howdy|morning|hiya|heya)\\b',
    '^(bye|goodbye|see ya|later|goodnight|gn|cya)\\b',
    '^(thanks|thank you|ty|tysm|cheers)\\b',
    '^(guess what|you\'?ll never guess|wanna know something)\\b',
    '^(lol|lmao|haha|wow|damn|oof|yikes|nice|same|ikr|true|fair)\\b',
    '\\b(i|we)\\s+(got|scored|aced|passed|won)\\b.{0,30}\\b(\\d+|a|an|first|gold|offer|in)\\b',
    '\\bi\'?m\\s+(so\\s+)?(exhausted|tired|stressed|excited|nervous|happy|sad|proud|dead)\\b',
    '\\bi (just )?(finally )?(finished|aced|passed|nailed|crushed)\\b'
  ].join('|'), 'i');

  /* Verbs that open a request. A message that begins with one of these is
     asking for something to happen. */
  var ACTION_VERB = /^\s*(?:(?:can|could|would|will)\s+(?:you|u)\s+|please\s+|hey\s+|pls\s+|just\s+)*(add|create|make|new|book|set\s+up|put|stick|pop|throw|schedule|plan|move|reschedule|shift|push|bump|delete|cancel|remove|drop|find|search|look|show|tell|give|list|check|optimi[sz]e|organi[sz]e|sort|break|split|complete|finish|mark|remind|block|clear|rename|update|change|open|go)\b/i;

  /* Question forms that are genuinely about the calendar. */
  var CALENDAR_QUESTION = /\b(what('?s| is| are|'?ve)?\s+(on|happening|scheduled|next|due|left)|when (am|is|do|does|was)|what do i have|do i have (anything|any|time|space|room)|am i (free|busy|available)|how (busy|much time|many hours|full|packed)|what'?s my (schedule|day|week)|anything (on|due|left)|whats on)\b/i;

  /* A first-person statement is news, not an instruction — "my schedule is
     packed" is a remark about a week, not a request to read it back. Only a
     few intents are allowed to fire from one, because they are unambiguous
     even in statement form. */
  var STATEMENT_START = /^\s*(i|i'?m|i'?ve|my|we|it|this|that|there|school|work|today|tomorrow|everything|everyone|nothing|no one)\b/i;
  var STATEMENT_OK = ['project', 'reschedule', 'remember', 'recurring', 'series', 'research',
    'goal_add', 'goal_list', 'interests', 'ideas', 'idea_feedback', 'accept_idea',
    'idea_remood', 'surprise'];

  /* "I finished the history essay" is a statement, but if it names something
     actually on the list then it is also a completion — so look before
     deciding. Checking the real data beats guessing from the wording. */
  function statementExtras(text) {
    var m = text.match(/\bi\s+(?:just\s+|finally\s+)?(?:finished|completed|did|am done with|'?ve finished|'?ve done)\s+(.+)$/i);
    if (!m) return [];
    var subject = m[1].replace(/[.!?]+$/, '').trim();
    if (!subject) return [];
    try {
      var hits = JV.DX.findAnything(subject, { kinds: ['task', 'deadline', 'habit'] });
      return hits.length ? ['complete'] : [];
    } catch (err) {
      return [];
    }
  }

  function isStatement(text) {
    var s = String(text || '').trim();
    if (/\?\s*$/.test(s)) return false;                 // a question is not a statement
    if (ACTION_VERB.test(s)) return false;              // an imperative is not a statement
    if (CALENDAR_QUESTION.test(s)) return false;        // question-shaped without the mark
    return STATEMENT_START.test(s);
  }

  var PLANNABLE = /\b(project|essay|paper|report|exam|test|quiz|midterm|final|presentation|assignment|thesis|dissertation|deck|talk|lab|application|portfolio)\b/i;
  var PLAN_VERB = /\b(plan|prepare|prep|study|revise|get (it|this) done|make sure|help me|work on|finish|break (it|this) down|schedule)\b/i;
  var DATEISH = /\b(due|deadline|by|before|on)\b|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week)\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b|\b\d{4}-\d{2}-\d{2}\b/i;

  /* ------------------------------------------------------------- intents */

  var INTENTS = [
    {
      /* Setting a goal. "My goal is to get better at Java." */
      id: 'goal_add',
      test: /\b(my goal is|i want to (get better at|improve|learn|be better at|become)|i'?m trying to (get better at|learn|improve)|goal:|new goal)\b/i,
      steps: function (text) {
        var name = subject(text, [
          /\b(my goal is|goal:|new goal)\b/i,
          /\bi want to (get better at|improve|learn|be better at|become)\b/i,
          /\bi'?m trying to (get better at|learn|improve)\b/i,
          /^\s*(to|at)\s+/i,
          // "get better at Java" is a wish; "Java" is the goal.
          /^\s*(get|be|become|getting|being)\s+(better|good|great)\s+at\s+/i,
          /^\s*(improve|improving|learn|learning|master|mastering|practi[cs]e|practising)\s+/i,
          /^\s*(my|the)\s+/i
        ]);
        name = name.charAt(0).toUpperCase() + name.slice(1);
        var freq = /\bevery day|daily\b/i.test(text) ? 'daily'
          : /\bonce a week|weekly\b/i.test(text) ? 'weekly' : null;
        var args = { name: name };
        if (freq) args.frequency = freq;
        var by = parseDeadlinePhrase(text);
        if (by) args.due = by;
        return [{ text: 'Remember the goal \u201c' + name + '\u201d', tool: 'goals.add', args: args }];
      }
    },
    {
      id: 'goal_list',
      test: /\b(my goals|what (are|were) my goals|goal progress|how am i doing on my goals|show me my goals)\b/i,
      steps: function () {
        return [{ text: 'Read the goals and their activity', tool: 'goals.list', args: {} }];
      }
    },
    {
      id: 'interests',
      test: /\b(i'?m into|i like|i enjoy|my interests are|things i like|i'?m interested in)\b/i,
      steps: function (text) {
        var list = subject(text, [
          /\b(i'?m into|i like|i enjoy|my interests are|things i like|i'?m interested in)\b/i
        ]);
        return [{ text: 'Remember those interests', tool: 'goals.interests', args: { interests: list } }];
      }
    },
    {
      /* Feedback on suggestions \u2014 the loop that stops it repeating itself. */
      id: 'idea_feedback',
      test: /\b(never suggest|stop suggesting|don'?t suggest|more like (that|this)|less of (that|this))\b/i,
      steps: function (text) {
        var signal = /\bnever suggest|stop suggesting|don'?t suggest\b/i.test(text) ? 'never'
          : /\bmore like\b/i.test(text) ? 'more' : 'less';
        var about = subject(text, [
          /\b(never suggest|stop suggesting|don'?t suggest|more like|less of)\b/i,
          /\b(that|this|those|these|again|right now|anymore|any more)\b/i
        ]);
        var args = { signal: signal };
        if (about) args.about = about.toLowerCase();
        return [{ text: 'Take that on board', tool: 'ideas.feedback', args: args }];
      }
    },
    {
      /* "nah, something fun" right after a set of ideas is a re-roll with a
         different mood, not a new topic. */
      id: 'idea_remood',
      test: function (text) {
        if (!(JV.IDEAS && JV.IDEAS.lastOffered && JV.IDEAS.lastOffered.length)) return false;
        return /^\s*(nah|no|nope|meh|not really|something else|anything else|different)\b/i.test(text) ||
          /\b(something\s+(?:\w+\s+)?(fun|different|else|productive|easy|chill)|nothing productive|not productive|give me (something|another)|different idea|other ideas|anything else)\b/i.test(text);
      },
      steps: function (text) {
        var mood = /\b(fun|different|else|chill|relax|nothing productive|not productive)\b/i.test(text) ? 'fun'
          : /\b(productive|useful)\b/i.test(text) ? 'productive'
            : /\b(easy|gentle|light|tired)\b/i.test(text) ? 'gentle' : 'fun';
        return [{ text: 'Try again, ' + mood + ' this time', tool: 'ideas.suggest', args: { mood: mood } }];
      }
    },
    {
      /* The buttons on an idea card speak the same language as the person. */
      id: 'idea_action',
      test: /^\s*(start|schedule)\s+idea\s+\d+|^\s*give me a different idea\b/i,
      steps: function (text) {
        if (/different idea/i.test(text)) {
          return [{ text: 'Think of something else', tool: 'ideas.suggest', args: {} }];
        }
        var which = parseInt((text.match(/idea\s+(\d+)/i) || [])[1] || '1', 10);
        var later = /\bfor later\b|\bschedule\b/i.test(text);
        return [{
          text: (later ? 'Schedule' : 'Start') + ' idea ' + which,
          tool: 'ideas.schedule', args: { which: which, startNow: !later }
        }];
      }
    },
    {
      id: 'surprise',
      test: /\b(surprise me|something random|random idea|anything at all)\b/i,
      steps: function () {
        return [{ text: 'Pick something off the beaten track', tool: 'ideas.surprise', args: {} }];
      }
    },
    {
      /* "I'm bored" is a real request, not small talk. */
      id: 'ideas',
      test: /\b(i'?m bored|im bored|bored|give me something to do|what (can|should) i (do|work on)|something to do|entertain me|nothing to do|any ideas|got any ideas|suggest something)\b/i,
      steps: function (text) {
        var mood = /\b(fun|something else|something different|not productive|non.?school|chill|relax)\b/i.test(text) ? 'fun'
          : /\b(productive|useful|worthwhile)\b/i.test(text) ? 'productive'
            : /\b(easy|gentle|light|low effort|tired)\b/i.test(text) ? 'gentle' : null;
        var minutes = parseDuration(text);
        var args = {};
        if (mood) args.mood = mood;
        if (minutes) args.minutes = minutes;
        return [{ text: 'Work out what would actually be worth doing', tool: 'ideas.suggest', args: args }];
      }
    },
    {
      /* Accepting whatever was just offered. */
      id: 'accept_idea',
      test: function (text) {
        if (!/^\s*(yes|yeah|yep|yh|sure|ok|okay|go on|do it|let'?s do it|sounds good|why not|alright|deal|schedule it|book it|start now|start it)\b/i.test(text)) return false;
        return !!(JV.IDEAS && JV.IDEAS.lastOffered && JV.IDEAS.lastOffered.length);
      },
      steps: function (text) {
        var which = 1;
        var m = text.match(/\b(first|second|third|1st|2nd|3rd|one|two|three|1|2|3)\b/i);
        if (m) {
          which = { first: 1, '1st': 1, one: 1, '1': 1, second: 2, '2nd': 2, two: 2, '2': 2,
            third: 3, '3rd': 3, three: 3, '3': 3 }[m[1].toLowerCase()] || 1;
        }
        var later = /\b(later|schedule it|book it|not now|find time)\b/i.test(text);
        return [{
          text: 'Put that on the calendar', tool: 'ideas.schedule',
          args: { which: which, startNow: !later }
        }];
      }
    },
    {
      /* "good morning" on its own is a greeting, not a request for a briefing. */
      id: 'morning_brief',
      test: /\b(morning brief(ing)?|brief me|daily brief|start my day|what does today look like)\b/i,
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
      /* A question about one specific thing — the commonest thing anyone asks
         an assistant, and previously answered with "tell me more about that?" */
      id: 'describe',
      test: function (text) {
        // "when is my next free two hours" asks about availability, not about
        // a particular thing — that belongs to the free-time search.
        if (/\b(free|available|open|spare|gap)\b/i.test(text)) return false;
        return /\b(what time|when|how long|where|what'?s the (time|date|length)|how much time)\b[^.?]*\b(is|are|was|does|do)\b/i.test(text);
      },
      steps: function (text) {
        var aspect = /\bhow long|how much time|what'?s the length\b/i.test(text) ? 'duration'
          : /\bwhere\b/i.test(text) ? 'where' : 'when';
        var item = subject(text, [
          /\b(what time|when|how long|where|what'?s the (time|date|length)|how much time)\b/i,
          /\b(is|are|was|does|do)\b/i, /\bmy\b/i, /\bthe\b/i, /\bnext\b/i, /\bscheduled\b/i,
          /\b(for|at|on)\b\s*$/i
        ]);
        return [{
          text: 'Look up “' + item + '”',
          tool: 'calendar.describe_item',
          args: { item: item, aspect: aspect }
        }];
      }
    },
    {
      /* "Clear my afternoon" — a window, not a named event. */
      id: 'clear_period',
      test: /\b(clear|free up|empty|wipe|open up)\b[^.]*\b(morning|afternoon|evening|day|schedule|calendar)\b/i,
      steps: function (text) {
        var part = /\bmorning\b/i.test(text) ? 'morning'
          : /\bafternoon\b/i.test(text) ? 'afternoon'
            : /\bevening\b|\btonight\b/i.test(text) ? 'evening' : 'day';
        var when = parseWhen(text) || 'today';
        return [{
          text: 'Clear the ' + part, tool: 'calendar.clear_period',
          args: { date: when, part: part }
        }];
      }
    },
    {
      /* Every kind of edit — time, day, length, name — read from one sentence. */
      id: 'edit_event',
      test: function (text) {
        if (!JV.EDITS.looksLikeEdit(text)) return false;
        // "make", "set" and "put" create as often as they modify. When the
        // sentence could be either, let the data decide: it is an edit only if
        // the thing named is already there.
        if (POLITE_CREATE.test(text)) {
          var spec = JV.EDITS.parse(text);
          if (!spec.item) return false;
          try {
            return JV.DX.findAnything(spec.item, { kinds: ['event', 'task', 'deadline'] }).length > 0;
          } catch (err) { return false; }
        }
        return true;
      },
      steps: function (text) {
        var spec = JV.EDITS.parse(text);
        var args = { item: spec.item };
        if (spec.when !== undefined) args.when = spec.when;
        if (spec.date !== undefined) args.date = spec.date;
        if (spec.shift !== null && spec.shift !== undefined) args.shift = spec.shift;
        if (spec.duration !== null && spec.duration !== undefined) args.duration = spec.duration;
        if (spec.stretch !== null && spec.stretch !== undefined) args.stretch = spec.stretch;
        if (spec.title) args.title = spec.title;
        if (spec.travel !== undefined) args.travel = spec.travel;

        // "Change the time of my dentist appointment" names no new time, so
        // ask for one rather than guessing at a slot.
        if (!spec.hasEdit) {
          return [{
            text: 'Ask what to change about “' + spec.item + '”',
            tool: 'calendar.get_day', args: {}, clarify:
              'What would you like to change about “' + spec.item + '” — the time, the day, how long it runs, or its name?'
          }];
        }
        return [{ text: 'Update “' + spec.item + '”', tool: 'calendar.edit_event', args: args }];
      }
    },
    {
      /* Deletion is type-agnostic: whatever they named, find it and remove it. */
      id: 'delete_event',
      test: /\b(delete|cancel|remove|drop|call off|get rid of|bin|scrap|take .{1,20} off)\b/i,
      steps: function (text) {
        var kind = /\btasks?\b/i.test(text) ? 'task'
          : /\bevents?\b|\bappointments?\b|\bmeetings?\b/i.test(text) ? 'event'
            : /\bdeadlines?\b/i.test(text) ? 'deadline'
              : /\bnotes?\b/i.test(text) ? 'note'
                : /\bhabits?\b/i.test(text) ? 'habit' : null;
        var item = subject(text, [
          /\b(can you |please )?(delete|cancel|remove|drop|call off|get rid of|bin|scrap|take)\b/i,
          /\bthe (task|event|appointment|meeting|deadline|note|habit|project)\b/i,
          /\b(about|called|named)\b/i,
          /\boff (my|the) (list|calendar)\b/i,
          /\bfrom (my )?(calendar|list)\b/i, /\bmy\b/i
        ]);
        var args = { item: item };
        if (kind) args.kind = kind;
        return [{ text: 'Delete “' + item + '”', tool: 'calendar.delete_item', args: args }];
      }
    },
    {
      id: 'complete',
      test: /\b(mark|tick|check|cross|scratch)\b[^.]*\b(done|off|complete)|^\s*(complete|finish|finished|completed|done with)\b|\bi (finished|completed|did)\b/i,
      steps: function (text) {
        var task = subject(text, [
          /^\s*(complete|finish|finished|completed|done with)\b/i,
          /\b(mark|tick|check|cross|scratch)\b/i,
          /\b(as |it )?(done|complete[d]?|off)\b/i,
          /\bi (finished|completed|did)\b/i,
          /\b(the|my)\s+(task|item)\b/i, /\bmy\b/i,
          /\boff (my|the) list\b/i
        ]);
        return [{ text: 'Mark “' + task + '” done', tool: 'calendar.complete_item', args: { item: task } }];
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
      // Keyword-read series: any phrasing that carries a rhythm or a window,
      // in any order. "for the whole week", "twice a week for a month",
      // "every morning until Friday" all land here.
      id: 'series',
      test: function (text) {
        return !!(JV.SLOTS && JV.SLOTS.looksLikeSeries(text));
      },
      steps: function (text) {
        var slots = JV.SLOTS.parse(text);
        return [{
          text: 'Add “' + slots.title + '” across ' +
            (slots.spanWord ? 'the ' + slots.spanWord : 'the window you gave'),
          tool: 'calendar.create_series', args: { text: text }
        }];
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
      /* "find time for X" and the looser "find some time tomorrow for X". */
      id: 'schedule_task',
      test: /\b(find|make|block(?:\s+out)?|set aside|get)\s+(?:some\s+|me\s+)?time\b[^.?]*\bfor\b/i,
      steps: function (text) {
        var minutes = parseDuration(text);
        var deadline = parseDeadlinePhrase(text) || parseWhen(text);
        var work = subject(text, [
          /^.*?\bfor\s+/i,                       // everything up to "for" is the request
          /\b\d+(\.\d+)?\s*(hours?|hrs?|h|minutes?|mins?)\b/i,
          /\b(before|by|due|until)\s+.*$/i,
          /\b(tomorrow|today|tonight|this week|next week)\b/i,
          /\bmy\b/i
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
      /* "my schedule" is a noun; a sentence-initial "Schedule…" is a verb and
         belongs to creating something, not to reading the day back. */
      id: 'agenda',
      test: /\b(agenda|(?:my|the|your)\s+schedule|calendar|what('?s| is| are)? (on|happening|scheduled)|what do i have|my day|what am i doing|plans? for)\b/i,
      steps: function (text) {
        var when = parseWhen(text) || 'today';
        return [{ text: 'Read the agenda for ' + when, tool: 'calendar.get_day', args: { date: when } }];
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
      test: /\bevery\s+(day|week|month|weekday|weekend|other day|morning|evening|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+\s+(days|weeks))\b/i,
      steps: function (text) {
        var body = subject(text, [/^\s*(add|create|new|book|set up|put|schedule)\b/i]);
        return [{ text: 'Create a repeating event', tool: 'calendar.create_recurring_event', args: { text: body || text } }];
      }
    },
    {
      id: 'create',
      test: POLITE_CREATE,
      steps: function (text) {
        var body = subject(text, [
          POLITE_CREATE,
          /\b(on|to|in)\s+(my|the)\s+(calendar|list|schedule)\b/i,
          /^\s*(a|an|the)\s+/i          // "stick a dentist appointment" → "dentist appointment"
        ]);
        if (!body) return [{ text: 'Nothing to add' }];
        var type = 'task';
        try { type = NLP.parse(body, { settings: S.settings() }).type || 'task'; } catch (err) { /* default */ }
        // "put it on my calendar" asks for a calendar entry, whatever the
        // parser would otherwise have guessed from the wording.
        if (/\b(on|in|to)\s+(my|the)\s+calendar\b/i.test(text) && type === 'task') type = 'event';
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

    // Some shapes are unmistakably social — a greeting, good news, a thank-you.
    // They are checked before the intent table because the table is loose
    // enough to catch them by accident, and treating "hey" as a search is
    // exactly the failure this routing exists to prevent.
    // …unless the remark names something actually on the list. "I finished the
    // history essay" is both social and a completion, and the useful half is
    // the one that ticks it off.
    if (SOCIAL.test(text) && !POLITE_CREATE.test(text) && !statementExtras(text).length) {
      return { mode: 'conversation', confidence: 0.9, matched: ['social'] };
    }

    var steps = [];
    var matched = [];
    var unmatched = [];

    segments(text).forEach(function (segment) {
      // A whole-utterance project ask must not be split apart by a stray
      // "and" — check it against the full text before per-segment matching.
      // A polite imperative settles that this is a request, but not *which*
      // request: "schedule two hours of studying" is session-spreading, not a
      // task called "two hours of studying". Let the specific planners look
      // first, then fall through to plain creation.
      var intents = POLITE_CREATE.test(segment)
        ? [byId('series'), byId('recurring'), byId('edit_event'), byId('sessions'), byId('plan_week'), byId('plan_day'), byId('create')].concat(INTENTS)
        : INTENTS;

      // A statement only reaches the few intents that are unambiguous in
      // statement form. Everything else about it is conversation.
      var statement = isStatement(segment);
      var allowed = statement ? STATEMENT_OK.concat(statementExtras(segment)) : null;

      for (var i = 0; i < intents.length; i++) {
        if (statement && allowed.indexOf(intents[i] && intents[i].id) < 0) continue;
        if (intents[i] && matches(intents[i], segment)) {
          (intents[i].steps(segment) || []).forEach(function (s) { steps.push(s); });
          matched.push(intents[i].id);
          return;
        }
      }
      unmatched.push(segment);
    });

    // Nothing here is a request to do something, so this is a conversation.
    // There is no "command not recognised" branch — that was the bug.
    if (!steps.length) {
      return { mode: 'conversation', confidence: 0.8, matched: ['conversation'] };
    }

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

    // A step may carry a question instead of an action — "change the time of
    // my dentist appointment" names no new time, and guessing one is worse
    // than asking.
    var asking = steps.filter(function (st) { return st.clarify; })[0];
    if (asking) {
      return { steps: [], confidence: 0.34, matched: matched, clarify: asking.clarify };
    }

    return {
      steps: steps,
      confidence: 0.86,
      matched: matched,
      // Part of a compound message was chat, part was a request. Say both.
      aside: unmatched.length ? unmatched.join(' ') : null
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
