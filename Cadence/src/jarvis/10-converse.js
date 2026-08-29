/* Cadence · JARVIS — the conversational engine.

   JARVIS lives in a calendar, but a person talking to it is not always issuing
   a calendar command. "I got a 5 on both my AP exams" is news, not a query, and
   answering it with a search result is the wrong shape of reply entirely.

   This file is the default path. Anything that is not clearly a request for an
   action lands here and gets a real answer. There is no "not detected" — the
   least confident branch is a curious follow-up question, which is what a
   person would do.

   Two things make the replies feel like replies rather than templates:

   · Register matching. Energy is read off the message (caps, exclamation,
     slang) and the response is chosen from a tier that matches it, so shouting
     good news gets a matching reaction and a quiet remark gets a quiet one.
   · Continuity. The engine keeps what was just discussed, so a bare
     "Computer Science Principles" after "I got a 5 on my AP exam" is
     understood as the answer to the question JARVIS just asked.

   When a language model is configured this engine steps aside for open-domain
   talk (see 13-assistant.js). Offline, it is honest about what it cannot know
   rather than inventing an answer. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};
  var DX = JV.DX;

  /* ------------------------------------------------------------- energy */

  /* 0 flat · 1 warm · 2 lively · 3+ genuinely hyped. */
  function energy(text) {
    var s = String(text || '');
    var letters = (s.match(/[a-zA-Z]/g) || []).length;
    var caps = (s.match(/[A-Z]/g) || []).length;
    var e = 0;

    if (letters > 5 && caps / letters > 0.6) e += 2;
    e += Math.min(2, (s.match(/!/g) || []).length);
    if (/\b(omg|yo|lets? go|suii+|yess+|woo+|wooo+|ayy+|bruh|fr fr|no way|holy|insane|goated|cooked|w)\b/i.test(s)) e += 2;
    if (/[😭🔥💯🎉🙌😤🥳✨]/.test(s)) e += 1;
    return Math.min(4, e);
  }

  /* Pick a variant deterministically per turn so a reply is stable if the view
     re-renders, but varied across turns so it never reads like a macro. */
  function pick(list, seed) {
    if (!list || !list.length) return '';
    return list[Math.abs(seed) % list.length];
  }

  /* ------------------------------------------------------------ context */

  function Context() {
    this.turns = 0;
    this.lastCategory = null;
    this.lastTopic = null;     // what we were just talking about
    this.awaiting = null;      // {type, about} — a question JARVIS asked
    this.history = [];
  }

  Context.prototype.remember = function (category, topic) {
    this.turns++;
    this.lastCategory = category;
    if (topic) this.lastTopic = topic;
    this.history.push({ category: category, topic: topic, at: JV.nowTs() });
    if (this.history.length > 20) this.history.shift();
  };

  Context.prototype.ask = function (type, about) { this.awaiting = { type: type, about: about }; };
  Context.prototype.clearAsk = function () { this.awaiting = null; };

  /* ---------------------------------------------------------- detectors */

  var GREETING = /^(hi|hey+|hello|yo+|sup|howdy|morning|good morning|good afternoon|good evening|hiya|heya)\b/i;
  var FAREWELL = /^(bye|goodbye|see ya|see you|later|night|goodnight|gn|cya)\b/i;
  var THANKS = /\b(thanks|thank you|ty|tysm|appreciate it|cheers)\b/i;
  var TEASER = /^(guess what|you'?ll never guess|wanna know something|can i tell you something|something happened)\b/i;
  var REACTION = /^(that'?s|thats|this is|so)\s+(actually\s+)?(crazy|wild|insane|nuts|mad|sick|cool|awesome|great|amazing|rough|tough|annoying|unfair|funny)\b|^(lol|lmao|haha|ha|wow|damn|oof|yikes|nice|fair|true|right|exactly|same|ikr)\b/i;

  var GOOD_NEWS = /\b(got|scored|passed|aced|won|earned|received|made|hit)\b.*\b(\d+|a|an|first|second|third|gold|prize|award|offer|acceptance|scholarship)\b|\b(i|we)\s+(passed|aced|won|nailed|crushed|smashed|killed it|did it)\b|\bgot in\b|\baccepted\b/i;
  var GRADE = /\b(?:a\s+)?([1-5]|[a-f][+-]?|\d{1,3}%|\d{2,3}\/\d{2,3})\b\s*(?:on|in|for)\b|\bgot\s+(?:a\s+)?([1-5]|[a-f][+-]?)\b/i;

  var COMPLETION = /\b(finally\s+)?(finished|done with|completed|handed in|submitted|turned in|wrapped up|shipped)\b/i;
  var TIRED = /\b(exhausted|tired|knackered|shattered|drained|wiped|burnt out|burned out|no energy|running on empty)\b/i;
  var STRESSED = /\b(stressed|overwhelmed|anxious|panicking|freaking out|swamped|drowning|too much|can'?t cope|behind on everything)\b/i;
  var LOW = /\b(sad|down|upset|rough day|bad day|awful|terrible|worst|gutted|bummed|disappointed)\b/i;
  var BORED = /\b(bored|nothing to do|so boring|meh)\b/i;
  var EXCITED = /\b(excited|can'?t wait|looking forward|pumped|hyped|stoked)\b/i;
  var WORRIED = /\b(worried|nervous|scared|dreading|not ready|unprepared)\b/i;

  var ADVICE = /\b(should i|do you think|what do you think|would you|is it worth|any advice|what would you do|help me decide|good idea)\b/i;
  var SELF_INTENT = /\b(i should|i ought to|i need to|i probably should|i'?ve got to|i have to|i must)\b/i;
  var ABOUT_JARVIS = /\b(what can you do|who are you|what are you|how do you work|what do you know how to|your (capabilities|features)|help)\b/i;
  var FACTUAL = /^(what|who|where|when|why|how)\b(?!.*\b(my|i|me)\b)|^(what'?s|whats|whos|who'?s)\s+(the|a|an)\b|\b(capital of|define|meaning of|who (was|is)|what (was|is) the)\b/i;

  /* An ordered table. First match wins, so the specific sits above the vague.
     `answer_to_question` is deliberately NOT in here: a short message is only
     read as the answer to JARVIS's last question when it matches nothing else.
     Otherwise "I'm exhausted" said right after "which exam was it?" would be
     swallowed as the name of an exam. */
  var CATEGORIES = [
    { id: 'about_jarvis', test: function (t) { return ABOUT_JARVIS.test(t); } },
    { id: 'teaser', test: function (t) { return TEASER.test(t); } },
    { id: 'thanks', test: function (t) { return THANKS.test(t) && t.length < 40; } },
    { id: 'farewell', test: function (t) { return FAREWELL.test(t); } },
    { id: 'greeting', test: function (t) { return GREETING.test(t) && t.length < 30; } },
    { id: 'celebration', test: function (t) { return GOOD_NEWS.test(t) || GRADE.test(t); } },
    { id: 'completion', test: function (t) { return COMPLETION.test(t); } },
    { id: 'stressed', test: function (t) { return STRESSED.test(t); } },
    { id: 'tired', test: function (t) { return TIRED.test(t); } },
    { id: 'low', test: function (t) { return LOW.test(t); } },
    { id: 'worried', test: function (t) { return WORRIED.test(t); } },
    { id: 'bored', test: function (t) { return BORED.test(t); } },
    { id: 'excited', test: function (t) { return EXCITED.test(t); } },
    { id: 'advice', test: function (t) { return ADVICE.test(t); } },
    { id: 'self_intent', test: function (t) { return SELF_INTENT.test(t); } },
    { id: 'reaction', test: function (t) { return REACTION.test(t); } },
    { id: 'factual', test: function (t) { return FACTUAL.test(t); } },
    /* A short agreement is a continuation of whatever was just said, so it is
       only meaningful with something to continue. */
    {
      id: 'continuation',
      test: function (t, ctx) {
        return !!ctx.lastCategory && AGREEMENT.test(t) && t.split(/\s+/).length <= 10;
      }
    }
  ];

  var AGREEMENT = /^(yeah|yea|yep|yup|yes|nah|no|kinda|sorta|pretty much|exactly|true|i guess|mhm|mm|right|honestly|basically|definitely|for sure)\b/i;

  function isShortAnswer(t) {
    var s = String(t).trim();
    return s.split(/\s+/).length <= 6 && !/\?$/.test(s);
  }

  function classify(text, ctx) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].test(text, ctx)) return CATEGORIES[i].id;
    }
    // Nothing else fits. If JARVIS just asked something and this is short
    // enough to be an answer, treat it as one — that is what continuity means.
    if (ctx.awaiting && isShortAnswer(text)) return 'answer_to_question';
    return 'smalltalk';
  }

  /* ---------------------------------------------------------- extraction */

  /* What the good news was about: "a 5 on both my AP exams" → "both my AP exams". */
  function achievement(text) {
    // Keep the possessive as "your" so it reads back naturally: "a 5 on your
    // AP exam", not the clipped "a 5 on AP exam".
    var m = text.match(/\bon\s+(both\s+)?(my\s+)?(?:the\s+)?([a-z0-9][a-z0-9 ']{1,40}?)(?=[.!?,]|$)/i);
    if (m) return (m[2] ? 'your ' : '') + tidy(m[3]);
    m = text.match(/\b(?:got|passed|aced|won|finished|nailed)\s+(?:my\s+|the\s+|a\s+)?([a-z0-9][a-z0-9 ']{1,40}?)(?=[.!?,]|$)/i);
    if (m) return tidy(m[1]);
    return null;
  }

  function score(text) {
    var m = text.match(/\bgot\s+(?:a\s+)?([1-5]|[a-f][+-]?|\d{1,3}%)\b/i);
    if (m) return m[1];
    m = text.match(/\b(\d{1,3}%|\d{2,3}\/\d{2,3})\b/);
    return m ? m[1] : null;
  }

  function thingFinished(text) {
    var m = text.match(/\b(?:finished|done with|completed|handed in|submitted|turned in|wrapped up)\s+(my\s+)?(?:the\s+|that\s+)?([a-z0-9][a-z0-9 ']{1,40}?)(?=[.!?,]|$)/i);
    if (!m) return null;
    var thing = tidy(m[2]);
    return { label: (m[1] ? 'your ' : '') + thing, bare: thing };
  }

  function intendedAction(text) {
    var m = text.match(/\bi\s+(?:should|ought to|need to|probably should|'?ve got to|have to|must)\s+(?:probably\s+)?([a-z0-9][a-z0-9 ']{1,50}?)(?=[.!?,]|$)/i);
    return m ? tidy(m[1]) : null;
  }

  function tidy(s) {
    return String(s || '').replace(/\s+/g, ' ')
      .replace(/\b(today|tomorrow|tonight|this week|later)\b\s*$/i, '')
      .replace(/^(into|in|on|at|to|for)\s+/i, '')     // "into my first choice" → "my first choice"
      .replace(/^my\b/i, 'your')                       // read it back in the second person
      .replace(/[.!?,;:\s]+$/, '')
      .trim();
  }

  /* ----------------------------------------------------------- responses */

  /* Each responder returns {text, chips?, ask?, topic?}.
     `chips` are one-tap follow-ups that run a real command, which is how a
     conversation turns into calendar work without a hard mode switch. */
  var RESPOND = {

    greeting: function (t, ctx, e) {
      var brief = calendarGlance();
      var hi = pick(e >= 2
        ? ['Hey! 👋', 'Yo!', 'Hey hey.']
        : ['Hey.', 'Hi.', 'Hey there.'], ctx.turns);
      return {
        text: hi + ' ' + brief.sentence,
        chips: brief.chips
      };
    },

    farewell: function (t, ctx) {
      return { text: pick(['See you. 👋', 'Later!', 'Catch you later.'], ctx.turns) };
    },

    thanks: function (t, ctx) {
      return { text: pick(['Anytime.', 'No problem at all.', 'Course. 🙂', 'Happy to.'], ctx.turns) };
    },

    teaser: function (t, ctx) {
      ctx.ask('news', null);
      return { text: pick(['What happened? 👀', 'Go on… 👀', 'Ooh, what? 👀'], ctx.turns) };
    },

    celebration: function (t, ctx, e) {
      var what = achievement(t);
      var sc = score(t);
      var both = /\bboth\b/i.test(t);

      var lead;
      if (e >= 3) {
        lead = pick([
          'LET’S GO 🔥',
          'YESSS 🎉',
          'AYYY 🙌'
        ], ctx.turns);
      } else if (e >= 1) {
        lead = pick(['Amazing! 🎉', 'Ohh nice! 🔥', 'Let’s go!'], ctx.turns);
      } else {
        lead = pick(['That’s great news.', 'Nice one.', 'Congratulations.'], ctx.turns);
      }

      var body;
      if (sc && both) body = 'A ' + sc + ' on both?! That is a serious result.';
      else if (sc && what) body = 'A ' + sc + ' on ' + what + ' — genuinely impressive.';
      else if (sc) body = 'A ' + sc + ' is no joke.';
      else if (what) body = what.charAt(0).toUpperCase() + what.slice(1) + ' — that is a real win.';
      else body = 'That’s a proper win.';

      var tail;
      if (what && /exam|test|ap\b/i.test(what) && !/which/i.test(what)) {
        ctx.ask('detail', what);
        tail = both ? 'Which two were they?' : 'Which one was it?';
      } else {
        ctx.ask('detail', what || 'that');
        tail = pick(['How long had you been working on that?', 'Tell me more?', 'How are you celebrating?'], ctx.turns);
      }

      return { text: lead + ' ' + body + ' ' + tail, topic: what || 'the result' };
    },

    answer_to_question: function (t, ctx, e) {
      var about = ctx.awaiting && ctx.awaiting.about;
      var kind = ctx.awaiting && ctx.awaiting.type;
      ctx.clearAsk();
      var subject = tidy(t.replace(/^(it was|it'?s|that was|the)\s+/i, ''));

      if (kind === 'detail' && ctx.lastCategory === 'celebration') {
        return {
          text: pick([
            subject + '?! That’s a hard one — even better. 🔥',
            'Ohh, ' + subject + '. Respect — that one is not easy.',
            subject + ' — nice. That’s a genuinely tough paper.'
          ], ctx.turns),
          topic: subject
        };
      }
      if (kind === 'news') {
        return { text: 'Ohh — ' + subject + '. Tell me more!', topic: subject };
      }
      return { text: 'Got it — ' + subject + '.', topic: subject };
    },

    completion: function (t, ctx, e) {
      var thing = thingFinished(t);
      var lead = e >= 2 ? pick(['Yesss! 🎉', 'Nice!! 🙌'], ctx.turns) : pick(['Nice!', 'Good stuff.', 'Great.'], ctx.turns);
      var body = thing
        ? 'That’s ' + thing.label + ' off your plate.'
        : 'That’s one thing off your plate.';

      var chips = [{ label: 'What’s next?', ask: 'what should I do now' }];
      var task = thing ? DX.findTask(thing.bare) : null;
      if (task) chips.unshift({ label: 'Mark “' + task.title + '” done', ask: 'complete ' + task.title });

      return {
        text: lead + ' ' + body + ' Want me to help you figure out what’s next?',
        chips: chips,
        topic: thing ? thing.bare : null
      };
    },

    tired: function (t, ctx) {
      var left = remainingToday();
      return {
        text: 'Sounds like a long one. ' + (left.count
          ? 'You’ve still got ' + left.summary + ' on today — want to keep it light and push the rest, or power through?'
          : 'Nothing left on your calendar today, so you’re clear to actually stop.'),
        chips: left.count
          ? [{ label: 'Move the rest to tomorrow', ask: 'move everything I have today to tomorrow' },
             { label: 'What actually matters?', ask: 'what are my priorities' }]
          : [{ label: 'How does tomorrow look?', ask: 'what is on my calendar tomorrow' }]
      };
    },

    stressed: function (t, ctx) {
      var counts = safeCounts();
      return {
        text: 'That’s a lot to be carrying. ' +
          (counts.overdue
            ? 'A chunk of it is ' + counts.overdue + ' overdue item' + (counts.overdue === 1 ? '' : 's') +
              ' — those tend to be most of the weight. Want to look at just those?'
            : 'Want to lay it all out and see what actually has to happen first?'),
        chips: [
          { label: 'What matters most', ask: 'what are my priorities' },
          { label: 'Sort my week out', ask: 'optimize my schedule this week' }
        ]
      };
    },

    low: function (t, ctx) {
      return {
        text: pick([
          'Sorry — that sounds rough. Want to talk about it, or would a distraction help more?',
          'That’s a rubbish day by the sound of it. Anything I can take off your plate?'
        ], ctx.turns),
        chips: [{ label: 'Lighten tomorrow', ask: 'what is on my calendar tomorrow' }]
      };
    },

    worried: function (t, ctx) {
      var about = tidy((t.match(/\b(?:about|for)\s+([a-z0-9][a-z0-9 ']{1,40})/i) || [])[1] || '');
      return {
        text: (about ? 'Nervous about ' + about + ' — that’s fair. ' : 'That’s a normal way to feel. ') +
          'Would it help to block out some prep time so it feels less open-ended?',
        chips: about
          ? [{ label: 'Plan for ' + about, ask: 'help me prepare for ' + about }]
          : [{ label: 'Find me prep time', ask: 'find me two hours this week' }]
      };
    },

    bored: function (t, ctx) {
      var free = freeNow();
      return {
        text: free.minutes >= 30
          ? 'You’ve got ' + DX.hours(free.minutes) + ' free right now. Want something useful to fill it, or something fun?'
          : 'Fair enough. Want me to find you something to chip away at, or are we just chatting?',
        chips: [
          { label: 'Give me something useful', ask: 'what should I do now' },
          { label: 'What’s coming up?', ask: 'what is on my calendar tomorrow' }
        ]
      };
    },

    excited: function (t, ctx, e) {
      var about = tidy((t.match(/\b(?:for|about)\s+([a-z0-9][a-z0-9 ']{1,40})/i) || [])[1] || '');
      return {
        text: (e >= 2 ? 'Ayy! ' : '') +
          (about ? 'Excited for ' + about + ' — nice. What’s the plan?' : 'Love that. What’s got you excited?'),
        topic: about || null
      };
    },

    reaction: function (t, ctx) {
      return {
        text: pick([
          'Right? 😄',
          'I know.',
          'Ha — tell me about it.',
          'Honestly, yeah.'
        ], ctx.turns)
      };
    },

    advice: function (t, ctx) {
      // Genuinely useful because it can look: this is where living inside a
      // calendar actually pays off.
      var about = tidy((t.match(/\bshould i\s+([a-z0-9][a-z0-9 ']{1,45})/i) || [])[1] || '');
      var free = freeNow();
      var ranked = safeRanked();

      var body;
      if (free.minutes < 30) {
        body = 'Honestly? Probably not — you’ve only got about ' + DX.hours(free.minutes) +
          ' before your next thing, which is not much of a run-up.';
      } else if (ranked.length) {
        body = 'I’d say yes — you have ' + DX.hours(free.minutes) + ' free, and “' +
          ranked[0].task.title + '” is the thing most worth that time right now.';
      } else {
        body = 'You have ' + DX.hours(free.minutes) + ' free and nothing pressing on the list, ' +
          'so it is genuinely your call.';
      }

      return {
        text: (about ? '' : '') + body,
        chips: [
          { label: 'Block the time', ask: about ? 'find time for ' + about : 'plan my day' },
          { label: 'What’s most urgent?', ask: 'what are my priorities' }
        ]
      };
    },

    /* "I should probably study biology tomorrow" is a statement, not a command
       — so JARVIS agrees and offers, rather than silently booking something. */
    self_intent: function (t, ctx) {
      var what = intendedAction(t);
      var when = /\btomorrow\b/i.test(t) ? 'tomorrow' : /\btonight\b/i.test(t) ? 'tonight'
        : /\btoday\b/i.test(t) ? 'today' : null;
      if (!what) {
        return { text: 'Sounds like a plan. Want me to put it on the calendar?' };
      }
      // "study biology" is a verb phrase, so it wants "time to", not "time for".
      var verbish = /^(study|revise|work|write|read|practi[cs]e|finish|start|review|do|call|email)\b/i.test(what);
      var phrase = (verbish ? 'time to ' : 'time for ') + what + (when ? ' ' + when : '');
      return {
        text: 'Probably a good idea. Want me to find ' + phrase + '?',
        chips: [
          { label: 'Yes, schedule it', ask: 'find time for ' + what + (when ? ' ' + when : '') },
          { label: 'Just add a task', ask: 'add ' + what + (when ? ' ' + when : '') }
        ],
        topic: what
      };
    },

    about_jarvis: function (t, ctx) {
      return {
        text: 'I’m the assistant built into this calendar. I can read and change your schedule — ' +
          'plan a day or a week, break a deadline into work sessions, find open time, spot clashes and ' +
          'overloaded days, and reschedule what slipped. I always show you a proposal before changing anything. ' +
          'And you can just talk to me — I don’t need commands.',
        chips: [
          { label: 'Optimize my schedule', ask: 'optimize my schedule this week' },
          { label: 'Plan my day', ask: 'plan my day' },
          { label: 'What’s on tomorrow?', ask: 'what is on my calendar tomorrow' }
        ]
      };
    },

    /* Offline, JARVIS has no way to look things up. Saying so is better than
       inventing an answer that sounds right. */
    factual: function (t, ctx, e, opts) {
      var remote = JV.assistant && JV.assistant.remote && JV.assistant.remote.available();
      // `noDefer` is set when the model was tried and could not be reached, so
      // the honest offline answer is the right thing to fall back to.
      if (remote && !(opts && opts.noDefer)) {
        return { text: null, deferToModel: true };
      }
      return {
        text: 'That one’s outside what I can answer — I run entirely inside this page, ' +
          'with no internet and no general knowledge model behind me, so I’d only be guessing. ' +
          'Connect a model in Settings → JARVIS and I can answer things like that properly. ' +
          'Anything about your schedule, though, I can help with right now.'
      };
    },

    /* Keep the thread going rather than restarting it. What "carry on" means
       depends on what was being carried. */
    continuation: function (t, ctx) {
      var was = ctx.lastCategory;
      if (was === 'tired' || was === 'stressed' || was === 'low') {
        return {
          text: pick([
            'Yeah. Do you want me to clear some space tomorrow so it is not another one of those?',
            'Fair enough. Want me to take a look at tomorrow and lighten it?'
          ], ctx.turns),
          chips: [
            { label: 'Lighten tomorrow', ask: 'what is on my calendar tomorrow' },
            { label: 'What actually matters', ask: 'what are my priorities' }
          ]
        };
      }
      if (was === 'celebration' || was === 'completion' || was === 'excited') {
        return { text: pick(['Well earned. 🙌', 'You should be pleased with that.', 'Nice one, genuinely.'], ctx.turns) };
      }
      if (was === 'advice' || was === 'self_intent') {
        return {
          text: 'Want me to block the time out so it actually happens?',
          chips: [{ label: 'Find me time', ask: 'plan my day' }]
        };
      }
      return { text: pick(['Fair.', 'Makes sense.', 'Yeah, I hear you.'], ctx.turns) };
    },

    smalltalk: function (t, ctx) {
      // The genuinely-unsure branch. A curious question, never an error.
      var opener = pick([
        'Tell me more?',
        'Go on?',
        'How do you mean?'
      ], ctx.turns);
      if (String(t).trim().split(/\s+/).length <= 3) {
        return { text: pick([
          'I’m listening — what’s up?',
          'Say more?',
          'What’s on your mind?'
        ], ctx.turns) };
      }
      return {
        text: 'I’m not totally sure what you’re after there — ' + opener.toLowerCase() +
          ' If you meant something on your calendar, just say the word.'
      };
    }
  };

  /* ------------------------------------------------------ calendar peeks */

  /* Small, cheap, failure-tolerant reads. Conversation should never break
     because a calendar query threw. */
  function safeCounts() {
    try { return Q.counts(); } catch (err) { return { overdue: 0, today: 0, captures: 0, inbox: 0 }; }
  }

  function safeRanked() {
    try { return SCHED.rankedTasks(DX.nowWall(), { horizonDays: 14 }).slice(0, 3); }
    catch (err) { return []; }
  }

  function freeNow() {
    try {
      var r = SCHED.whatNow(DX.nowWall());
      return { minutes: r.usable || 0, next: r.next || null };
    } catch (err) { return { minutes: 0, next: null }; }
  }

  function remainingToday() {
    try {
      var now = DX.nowWall();
      var left = Q.eventsOnDay(now, { ignoreLayers: true })
        .filter(function (e) { return !e.allDay && e.startWall > now; });
      var tasks = Q.tasksDueOn(now).filter(function (t) { return t.status !== 'completed'; });
      var bits = [];
      if (left.length) bits.push(left.length + ' event' + (left.length === 1 ? '' : 's'));
      if (tasks.length) bits.push(tasks.length + ' task' + (tasks.length === 1 ? '' : 's'));
      return { count: left.length + tasks.length, summary: bits.join(' and ') };
    } catch (err) { return { count: 0, summary: '' }; }
  }

  function calendarGlance() {
    try {
      var now = DX.nowWall();
      var events = Q.eventsOnDay(now, { ignoreLayers: true }).filter(function (e) { return !e.allDay; });
      var upcoming = events.filter(function (e) { return e.startWall > now; });
      var counts = safeCounts();

      if (counts.overdue) {
        return {
          sentence: 'You’ve got ' + counts.overdue + ' thing' + (counts.overdue === 1 ? '' : 's') +
            ' past due — want to start there?',
          chips: [{ label: 'Show me', ask: 'what is overdue' }]
        };
      }
      if (upcoming.length) {
        return {
          sentence: 'Next up is “' + upcoming[0].title + '” at ' + DX.fmtClock(upcoming[0].startWall) + '.',
          chips: [{ label: 'Rest of today', ask: 'what is on my calendar today' }]
        };
      }
      return {
        sentence: 'Nothing else scheduled today.',
        chips: [{ label: 'Plan my day', ask: 'plan my day' },
                { label: 'Tomorrow?', ask: 'what is on my calendar tomorrow' }]
      };
    } catch (err) {
      return { sentence: 'What can I do for you?', chips: [] };
    }
  }

  /* --------------------------------------------------------------- entry */

  var context = new Context();

  function respond(text, opts) {
    opts = opts || {};
    var ctx = opts.context || context;
    var e = energy(text);
    var category = classify(text, ctx);
    var responder = RESPOND[category] || RESPOND.smalltalk;

    var out;
    try {
      out = responder(text, ctx, e, opts) || { text: null };
    } catch (err) {
      out = { text: 'I’m not sure I caught that — what would you like me to help with?' };
    }

    // A responder may hand off to the model (factual questions with a model on).
    if (out.deferToModel) return { deferToModel: true, category: category };

    ctx.remember(category, out.topic || null);

    // A question JARVIS asked stays open for exactly one turn. Any longer and
    // an unrelated message two turns later gets read as a late reply.
    if (ctx.awaiting) {
      if (category === 'answer_to_question') ctx.clearAsk();
      else if (ctx.awaiting.age === undefined) ctx.awaiting.age = 1;
      else ctx.clearAsk();
    }

    return {
      category: category,
      energy: e,
      text: out.text,
      chips: out.chips || [],
      refs: out.refs || []
    };
  }

  function reset() { context = new Context(); }

  JV.CONVERSE = {
    respond: respond,
    classify: classify,
    energy: energy,
    reset: reset,
    context: function () { return context; },
    Context: Context
  };
})(window);
