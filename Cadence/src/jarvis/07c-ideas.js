/* Cadence · JARVIS — the idea engine.

   Answers "what would actually be a good thing to do right now?" rather than
   "what command did you type?". It reads the goals, the free time, the time of
   day, what is due, and what has already been done lately, then proposes a
   handful of concrete things.

   Three rules shape everything here.

   · Concrete beats generic. "Practise piano" is a category, not an activity.
     "Polish the hardest passage, then record one attempt and listen back" is
     something a person can start. Every template is written to be startable.

   · It does not only suggest work. A day with nothing on it is not a problem
     to be solved. Fun, rest, outdoors and social ideas are first-class, and
     when someone is plainly tired the ranking prefers them.

   · It never invents what you like. With no goals and no stated interests it
     asks instead of guessing, and the generic ideas it offers are not dressed
     up as personal knowledge. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};
  var DX = JV.DX;

  var EASY = 'easy', MODERATE = 'moderate', CHALLENGE = 'challenge';

  /* ---------------------------------------------------------- templates */

  /* Each entry: minutes it wants, difficulty, and a phrase builder that takes
     the goal so the idea names the actual subject. */
  function T_(minutes, difficulty, build) {
    return { minutes: minutes, difficulty: difficulty, build: build };
  }

  var TEMPLATES = {
    programming: [
      T_(10, EASY, function (g) { return 'Ten minutes: read someone else\u2019s ' + lang(g) + ' code and work out one thing they did that you would not have.'; }),

      T_(15, EASY, function (g) { return 'Re-read your last ' + lang(g) + ' file and rename three things so they read better in six months.'; }),
      T_(20, EASY, function (g) { return 'Do one small ' + lang(g) + ' kata: reverse a string, count word frequencies, or FizzBuzz without an if-statement.'; }),
      T_(30, MODERATE, function (g) { return 'Write a tiny ' + lang(g) + ' program where the player guesses a random number, with hints for too high and too low.'; }),
      T_(45, MODERATE, function (g) { return 'Build a small ' + lang(g) + ' command-line tool that does one useful thing — a unit converter, or a to-do list that saves to a file.'; }),
      T_(45, MODERATE, function (g) { return 'Take something you wrote recently in ' + lang(g) + ' and add tests for the parts you are least sure about.'; }),
      T_(90, CHALLENGE, function (g) { return 'Build a scheduling algorithm in ' + lang(g) + ': give it a list of tasks with durations and deadlines, and have it work out a sensible order.'; }),
      T_(90, CHALLENGE, function (g) { return 'Write a tiny ' + lang(g) + ' interpreter for arithmetic — parse "3 + 4 * 2" and get 11.'; })
    ],
    robotics: [
      T_(20, EASY, function () { return 'Sketch the movement your robot needs to make, and label which joint or wheel does each part.'; }),
      T_(30, MODERATE, function () { return 'Write pseudocode for one behaviour — line following, obstacle avoidance — down to the individual sensor reads.'; }),
      T_(60, MODERATE, function () { return 'Simulate your robot\'s movement on paper or in code: given wheel speeds, where does it end up after ten seconds?'; }),
      T_(90, CHALLENGE, function () { return 'Prototype one subsystem end to end and write down every assumption it depends on.'; })
    ],
    music: [
      T_(10, EASY, function () { return 'Ten minutes of scales or warm-ups \u2014 the boring bit that actually moves the needle.'; }),

      T_(15, EASY, function (g) { return 'Slow practice: take the hardest four bars in your current piece and play them at half speed, five times clean.'; }),
      T_(25, MODERATE, function (g) { return 'Polish the hardest passage you have, then record one attempt and listen back — you will hear things you cannot hear while playing.'; }),
      T_(30, MODERATE, function (g) { return 'Learn something entirely by ear: pick a short phrase from a song you like and work it out without notation.'; }),
      T_(45, MODERATE, function (g) { return 'Sight-read three pieces you have never seen, badly and without stopping. Sight-reading only improves by doing it.'; }),
      T_(60, CHALLENGE, function (g) { return 'Compose an eight-bar melody with a constraint you have not used before — no repeated notes, or only three pitches.'; })
    ],
    math: [
      T_(10, EASY, function () { return 'Two problems, properly, with working written out rather than in your head.'; }),

      T_(15, EASY, function (g) { return 'Five quick problems on whatever you got wrong most recently — the topic you avoid is the one worth ten minutes.'; }),
      T_(30, MODERATE, function (g) { return 'Take one theorem you use often and prove it from scratch without looking.'; }),
      T_(30, MODERATE, function (g) { return 'Try five genuinely difficult problems on the topic you have been struggling with. Getting stuck is the point.'; }),
      T_(60, CHALLENGE, function (g) { return 'Pick a problem you could not solve last time and work it properly, writing down where your reasoning breaks.'; })
    ],
    science: [
      T_(20, EASY, function (g) { return 'Explain the concept you are studying out loud, as if to someone two years younger. The gaps show up immediately.'; }),
      T_(40, MODERATE, function (g) { return 'Draw the full diagram from memory, then check it and mark what you missed.'; }),
      T_(60, CHALLENGE, function (g) { return 'Design an experiment that would actually test the idea you are learning — including what result would prove you wrong.'; })
    ],
    writing: [
      T_(15, EASY, function () { return 'Write 200 words about the most interesting thing that happened this week. No editing.'; }),
      T_(30, MODERATE, function () { return 'Take a paragraph you wrote recently and cut it by a third without losing meaning.'; }),
      T_(45, MODERATE, function () { return 'Write the opening of something with a constraint: no adjectives, or every sentence under eight words.'; }),
      T_(90, CHALLENGE, function () { return 'Draft a full short piece start to finish, badly, without going back to fix anything.'; })
    ],
    art: [
      T_(15, EASY, function () { return 'Twenty one-minute gesture sketches of whatever is in the room.'; }),
      T_(30, MODERATE, function () { return 'Draw the same object three times: once from observation, once from memory, once from imagination.'; }),
      T_(60, MODERATE, function () { return 'Work in a medium or palette you normally avoid — restriction does more for style than practice does.'; })
    ],
    language: [
      T_(15, EASY, function (g) { return 'Ten minutes of vocabulary, then use five of the words in sentences about your actual day.'; }),
      T_(30, MODERATE, function (g) { return 'Watch something short in the language with subtitles in the language, not in English.'; }),
      T_(45, CHALLENGE, function (g) { return 'Write a diary entry about today entirely in the language, then look up only the words you genuinely could not get around.'; })
    ],
    fitness: [
      T_(20, EASY, function () { return 'Twenty minutes of movement you actually enjoy. It does not have to be a workout to count.'; }),
      T_(40, MODERATE, function () { return 'A proper session with a warm-up and something you have been avoiding.'; }),
      T_(60, CHALLENGE, function () { return 'Go longer or harder than usual, and write down afterwards what your limit actually was.'; })
    ],
    reading: [
      T_(20, EASY, function () { return 'Twenty pages of whatever you are part-way through. No phone in the room.'; }),
      T_(45, MODERATE, function () { return 'Read a chapter and write three sentences on what you would argue with.'; })
    ],
    college: [
      T_(20, EASY, function () { return 'Write down three things you have actually done that you would want an admissions officer to know.'; }),
      T_(45, MODERATE, function () { return 'Draft one paragraph of a personal statement about a specific moment rather than a general quality.'; }),
      T_(60, CHALLENGE, function () { return 'Take a full timed section of a practice test under real conditions, then mark it honestly.'; })
    ],
    exam: [
      T_(15, EASY, function (g) { return 'Ten flashcards on the topic you keep forgetting.'; }),
      T_(30, MODERATE, function (g) { return 'Do a past-paper question under time, then mark it against the scheme yourself.'; }),
      T_(60, CHALLENGE, function (g) { return 'Full past paper section under exam conditions — timed, no notes.'; })
    ],
    general: [
      T_(10, EASY, function (g) { return 'Ten minutes on ' + g.name.toLowerCase() + '. Short is fine \u2014 starting is the hard part.'; }),

      T_(20, EASY, function (g) { return 'Twenty focused minutes on ' + g.name.toLowerCase() + ', with the phone in another room.'; }),
      T_(45, MODERATE, function (g) { return 'A proper session on ' + g.name.toLowerCase() + ' — pick the part you have been putting off.'; }),
      T_(90, CHALLENGE, function (g) { return 'A long block on ' + g.name.toLowerCase() + '. Decide the one outcome before you start.'; })
    ]
  };

  /* Pull a language name out of a programming goal so the idea says "Java"
     rather than "programming". */
  function lang(g) {
    var m = String(g.name + ' ' + (g.description || ''))
      .match(/\b(java|python|javascript|typescript|c\+\+|c#|rust|go|swift|kotlin|ruby|php|sql|html|css)\b/i);
    if (!m) return 'code';
    var word = m[1];
    return word.length <= 3 ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1);
  }

  /* Ideas that have nothing to do with goals. These are not personalised and
     are not pretending to be — they exist so JARVIS is not a productivity
     robot, which is a real failure mode for something living in a calendar. */
  var NON_GOAL = [
    { category: 'rest', minutes: 10, difficulty: EASY, text: 'Ten minutes away from a screen. Stand up, look out of a window, drink something.' },
    { category: 'fun', minutes: 10, difficulty: EASY, text: 'One quick puzzle \u2014 a crossword clue, a chess puzzle, a riddle.' },
    { category: 'physical', minutes: 10, difficulty: EASY, text: 'Ten minutes of moving about. Stairs, a lap of the block, anything.' },
    { category: 'fun', minutes: 15, difficulty: EASY, text: 'Take a logic puzzle that gets harder as you go — start with an easy one and keep going until you are stuck.' },
    { category: 'fun', minutes: 30, difficulty: EASY, text: 'Play something you have not played in ages. Not a productive choice, and that is the point.' },
    { category: 'fun', minutes: 20, difficulty: EASY, text: 'Find the strangest Wikipedia article you can get to in six clicks from a topic you like.' },
    { category: 'physical', minutes: 25, difficulty: EASY, text: 'Go for a walk and listen to something you have been meaning to get to.' },
    { category: 'physical', minutes: 15, difficulty: EASY, text: 'Get outside for fifteen minutes without your phone out. It resets more than it sounds like it should.' },
    { category: 'social', minutes: 30, difficulty: EASY, text: 'Message or ring someone you have not spoken to in a while. No agenda.' },
    { category: 'social', minutes: 45, difficulty: EASY, text: 'Play something with someone else — a game, a call, anything with a second person in it.' },
    { category: 'creative', minutes: 30, difficulty: MODERATE, text: 'Make something small with no purpose: a drawing, a playlist with a rule, a very short story.' },
    { category: 'creative', minutes: 20, difficulty: EASY, text: 'Reorganise something you look at every day so it annoys you less.' },
    { category: 'rest', minutes: 30, difficulty: EASY, text: 'Genuinely rest. Put something on you enjoy and do not multitask through it.' },
    { category: 'rest', minutes: 20, difficulty: EASY, text: 'Do nothing in particular for twenty minutes. Free time is not a gap to be filled.' },
    { category: 'learning', minutes: 20, difficulty: EASY, text: 'Watch one good explainer on something you know nothing about and could not have searched for.' }
  ];

  /* ------------------------------------------------------------ context */

  function context(opts) {
    opts = opts || {};
    var now = DX.nowWall();
    var profile = JV.GOALS.profile();
    var goals = JV.GOALS.list();

    var available = opts.minutes;
    var next = null;
    if (available === undefined || available === null) {
      try {
        var whatNow = SCHED.whatNow(now);
        available = whatNow.usable || 0;
        next = whatNow.next || null;
      } catch (err) { available = 60; }
    }

    var hour = now.getHours();
    var deadlines = [];
    try {
      deadlines = Q.upcomingDeadlines(5, now).filter(function (d) {
        return T.diffDays(now, T.w(d.due)) <= 5;
      });
    } catch (err) { /* none */ }

    var doneToday = [];
    try {
      doneToday = Q.eventsOnDay(now, { ignoreLayers: true })
        .filter(function (e) { return !e.allDay && e.endWall <= now; });
    } catch (err) { /* none */ }

    return {
      now: now,
      minutes: Math.max(0, available),
      next: next,
      hour: hour,
      partOfDay: hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 22 ? 'evening' : 'night',
      weekend: now.getDay() === 0 || now.getDay() === 6,
      goals: goals,
      profile: profile,
      deadlines: deadlines,
      doneToday: doneToday,
      workedTodayMinutes: doneToday.reduce(function (a, e) {
        return a + T.diffMinutes(e.startWall, e.endWall);
      }, 0),
      recent: JV.GOALS.recentLog(14),
      mood: opts.mood || null            // 'fun' | 'productive' | 'gentle'
    };
  }

  /* ---------------------------------------------------------- generate */

  function generate(ctx) {
    var out = [];

    ctx.goals.forEach(function (g) {
      var pool = TEMPLATES[g.domain] || TEMPLATES.general;
      pool.forEach(function (t) {
        out.push({
          id: JV.uid('idea'),
          title: t.build(g),
          minutes: t.minutes,
          difficulty: t.difficulty,
          category: categoryForDomain(g.domain),
          goalId: g.id,
          goalName: g.name,
          domain: g.domain,
          neglect: JV.GOALS.neglect(g),
          priority: g.priority
        });
      });
    });

    // Work that is genuinely due soon deserves a place in the list.
    ctx.deadlines.forEach(function (d) {
      var days = T.diffDays(ctx.now, T.w(d.due));
      out.push({
        id: JV.uid('idea'),
        title: 'Put ' + (ctx.minutes >= 45 ? '45 minutes' : 'a short session') + ' into “' + d.title + '”.',
        minutes: Math.min(45, Math.max(20, ctx.minutes)),
        difficulty: MODERATE,
        category: 'project',
        deadlineId: d.id,
        urgency: Math.max(0, 5 - days),
        domain: JV.GOALS.domainFor(d.title)
      });
    });

    NON_GOAL.forEach(function (n) {
      out.push({
        id: JV.uid('idea'),
        title: n.text,
        minutes: n.minutes,
        difficulty: n.difficulty,
        category: n.category,
        generic: true
      });
    });

    return out;
  }

  function categoryForDomain(domain) {
    if (domain === 'music' || domain === 'art' || domain === 'writing') return 'creative';
    if (domain === 'fitness') return 'physical';
    if (domain === 'programming' || domain === 'robotics') return 'project';
    if (domain === 'reading') return 'learning';
    return 'learning';
  }

  /* ------------------------------------------------------------ filter */

  function filter(ideas, ctx) {
    var blocked = ctx.profile.blocked || [];
    var allowed = ctx.profile.types;

    return ideas.filter(function (idea) {
      // Never suggest something that cannot fit in the time actually available.
      if (ctx.minutes > 0 && idea.minutes > ctx.minutes) return false;

      // Things the user told us never to suggest again.
      if (blocked.indexOf(idea.category) >= 0) return false;
      if (idea.domain && blocked.indexOf(idea.domain) >= 0) return false;

      // A preferred-types allow-list, when one has been set.
      if (allowed && allowed.length && allowed.indexOf(idea.category) < 0) return false;

      // Don't offer the same thing twice in a row.
      var seen = (ctx.recent || []).filter(function (e) {
        return e.title === idea.title && e.at > JV.nowTs() - 2 * 86400;
      });
      if (seen.length) return false;

      // Late at night, a 90-minute challenge is not a kind suggestion.
      if (ctx.hour >= 22 && idea.minutes > 45) return false;

      return true;
    });
  }

  /* -------------------------------------------------------------- rank */

  function rank(ideas, ctx) {
    var liked = ctx.profile.likedCategories || {};
    var tiredish = ctx.workedTodayMinutes > 5 * 60 || ctx.hour >= 21;

    ideas.forEach(function (idea) {
      var score = 50;
      var why = [];

      // Time fit: something that uses the window well beats something that
      // barely touches it.
      if (ctx.minutes > 0) {
        var fit = idea.minutes / ctx.minutes;
        if (fit >= 0.5 && fit <= 1) score += 16;
        else if (fit >= 0.3) score += 6;
        // Offering a ten-minute idea into a two-hour gap wastes the gap. The
        // penalty has to scale, or short ideas win every long window.
        else score -= (0.3 - fit) * 90;
      }

      // Goals that have been left alone rise; goals hammered all week fall.
      if (idea.neglect !== undefined) {
        score += idea.neglect * 22;
        if (idea.neglect >= 1) why.push('you have not touched ' + idea.goalName.toLowerCase() + ' in a while');
        else if (idea.neglect < 0.4) score -= 12;
      }

      if (idea.priority === 'high' || idea.priority === 'critical') score += 8;

      // A real deadline matters, but not so much that it drowns everything.
      if (idea.urgency) {
        score += idea.urgency * 7;
        why.push('the deadline is close');
      }

      // What the user actually picks, over time.
      score += (liked[idea.category] || 0) * 6;

      // Somebody who has already worked five hours does not need a project.
      if (tiredish) {
        if (idea.category === 'rest' || idea.category === 'physical' || idea.category === 'fun') {
          score += 18;
          why.push('you have already put in a long day');
        } else if (idea.category === 'project' || idea.category === 'learning') {
          score -= 14;
        }
      }

      // An explicit mood beats every inference above. "Something fun" means
      // not-work: a music goal is creative, but it is still a goal, and
      // offering it back is exactly the productivity-robot failure.
      if (ctx.mood === 'fun') {
        if (idea.generic && ['fun', 'social', 'rest', 'physical', 'creative'].indexOf(idea.category) >= 0) score += 60;
        else if (idea.goalId || idea.deadlineId) score -= 60;
        else score -= 20;
      } else if (ctx.mood === 'productive') {
        score += (['project', 'learning', 'creative'].indexOf(idea.category) >= 0) ? 35 : -25;
      } else if (ctx.mood === 'gentle') {
        score += (['rest', 'physical', 'social', 'fun'].indexOf(idea.category) >= 0) ? 40 : -30;
      }

      // Evenings and weekends bias away from grind, gently.
      if (ctx.weekend && idea.category === 'project') score -= 6;
      if (ctx.partOfDay === 'morning' && idea.difficulty === CHALLENGE) score += 6;

      // A little noise so the same list is not returned every single time.
      score += Math.random() * 6;

      idea.score = score;
      idea.why = why;
    });

    ideas.sort(function (a, b) { return b.score - a.score; });
    return ideas;
  }

  /* Take the best few, but not five variations of the same thing. */
  function diversify(ideas, count) {
    var out = [];
    var seenGoals = {};
    var seenCategories = {};
    var seenText = {};

    ideas.forEach(function (idea) {
      if (out.length >= count) return;
      // Two goals in the same domain can produce word-for-word the same idea.
      if (seenText[idea.title]) return;
      var goalKey = idea.goalId || idea.deadlineId || ('generic:' + idea.category);
      if (seenGoals[goalKey]) return;
      seenText[idea.title] = true;
      if ((seenCategories[idea.category] || 0) >= 2) return;
      seenGoals[goalKey] = true;
      seenCategories[idea.category] = (seenCategories[idea.category] || 0) + 1;
      out.push(idea);
    });

    // Make sure at least one option is not work, unless the user asked for
    // productivity specifically.
    var hasBreak = out.some(function (i) {
      return ['fun', 'rest', 'physical', 'social'].indexOf(i.category) >= 0;
    });
    if (!hasBreak) {
      var relief = ideas.filter(function (i) {
        return ['fun', 'rest', 'physical', 'social'].indexOf(i.category) >= 0;
      })[0];
      if (relief) out[out.length - 1] = relief;
    }

    return out;
  }

  /* -------------------------------------------------------------- entry */

  function suggest(opts) {
    opts = opts || {};
    var ctx = context(opts);

    // With nothing to go on, ask rather than invent a personality.
    if (!ctx.goals.length && !(ctx.profile.interests || []).length && !opts.allowGeneric) {
      return { needsProfile: true, ctx: ctx };
    }

    var ideas = diversify(rank(filter(generate(ctx), ctx), ctx), opts.count || 3);
    ideas.forEach(function (idea) { idea.why = reason(idea, ctx); });
    return { ideas: ideas, ctx: ctx };
  }

  /* One honest sentence about why this, now. */
  function reason(idea, ctx) {
    var bits = [];
    if (idea.goalName && idea.neglect >= 1) {
      var d = ctx.goals.filter(function (g) { return g.id === idea.goalId; })[0];
      if (d && d.daysSince !== null) {
        bits.push('you last worked on ' + idea.goalName.toLowerCase() + ' ' +
          (d.daysSince === 0 ? 'today' : d.daysSince + ' day' + (d.daysSince === 1 ? '' : 's') + ' ago'));
      } else {
        bits.push('you have not logged any time on ' + idea.goalName.toLowerCase() + ' yet');
      }
    } else if (idea.urgency) {
      bits.push('it is due soon');
    } else if (idea.generic) {
      bits.push('not everything has to be productive');
    }
    return bits.length ? bits.join(', and ') + '.' : '';
  }

  /* "Surprise me" — deliberately not the obvious top pick. */
  function surprise(opts) {
    opts = opts || {};
    var result = suggest(Object.assign({}, opts, { count: 8, allowGeneric: true }));
    if (result.needsProfile) return result;
    var pool = result.ideas;
    if (!pool.length) return { ideas: [], ctx: result.ctx };

    // Prefer something away from whatever has dominated lately.
    var recentDomains = {};
    (result.ctx.recent || []).forEach(function (e) {
      if (e.domain) recentDomains[e.domain] = (recentDomains[e.domain] || 0) + 1;
    });
    var fresh = pool.filter(function (i) { return !recentDomains[i.domain]; });
    var chosen = (fresh.length ? fresh : pool.slice(1))[0] || pool[0];
    chosen.surprise = true;
    return { ideas: [chosen], ctx: result.ctx };
  }

  JV.IDEAS = {
    suggest: suggest,
    surprise: surprise,
    context: context,
    generate: generate,
    filter: filter,
    rank: rank,
    TEMPLATES: TEMPLATES,
    NON_GOAL: NON_GOAL
  };
})(window);
