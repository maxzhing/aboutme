/* Cadence · JARVIS — reading a series out of keywords, not out of a phrasing.

   The old recurring path only fired on a fixed shape ("every <weekday> at
   <time>"). Anything said a different way fell through to plain task creation,
   which is how the calendar ended up with a task literally named "Gym for the
   whole week", and how "add a run every morning this week" crashed with
   "Invalid time value".

   This file takes the opposite approach. It looks for keywords one at a time,
   anywhere in the sentence, and cuts each one out as it is understood. What is
   left over is the title. Nothing depends on word order, and no single missing
   keyword breaks the rest:

     span        a window            "for the whole week", "all month",
                                     "rest of the week", "next month"
     length      a window by count   "for two weeks", "for the next 5 days"
     until       a hard end          "until Friday", "through the 14th"
     from        a hard start        "starting Monday", "from tomorrow"
     repeat      a rhythm            "every day", "every other day",
                                     "weekdays", "every Mon and Wed", "monthly"
     perWeek     a rhythm by count   "twice a week", "3 times a week"
     timeOfDay   a clock or a part   "at 5pm", "every morning"
     duration    a length            "for 45 minutes", "hour long"

   A window with no stated rhythm means daily — "add gym for the whole week"
   asks for gym on each day of the week. A rhythm with no stated window runs
   for a sensible default rather than forever.

   What is *not* here is invention. If no time of day is given, the entries are
   all-day rather than being dropped at a time the user never said. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};
  var T = global.T, S = global.S;

  var WORDNUM = {
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
    couple: 2, few: 3
  };
  function count(word) {
    if (word === undefined || word === null) return null;
    var s = String(word).trim().toLowerCase();
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    return WORDNUM[s] !== undefined ? WORDNUM[s] : null;
  }

  var DAY_NAMES = {
    sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3, weds: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
    friday: 5, fri: 5, saturday: 6, sat: 6
  };
  var DAY_WORD = 'sunday|sundays|sun|monday|mondays|mon|tuesday|tuesdays|tues|tue|' +
    'wednesday|wednesdays|weds|wed|thursday|thursdays|thurs|thur|thu|' +
    'friday|fridays|fri|saturday|saturdays|sat';
  function dayIndex(word) {
    var s = String(word || '').toLowerCase().replace(/s$/, '');
    return DAY_NAMES[s] !== undefined ? DAY_NAMES[s] : null;
  }

  /* Named parts of the day. These are the user's own words, so reading
     "morning" as a morning hour is interpretation, not invention — but the
     chosen hour is always shown back so it can be corrected. */
  var PART_OF_DAY = {
    morning: 9 * 60, morn: 9 * 60, afternoon: 14 * 60,
    evening: 18 * 60, night: 20 * 60, lunchtime: 12 * 60, noon: 12 * 60
  };

  /* ------------------------------------------------------------ cutting */

  /* A tiny helper so every keyword reads the same way: try the pattern, and
     if it hits, remove it from the working text and hand back the match. */
  function Cutter(text) {
    this.text = ' ' + String(text || '') + ' ';
  }
  Cutter.prototype.cut = function (re) {
    var m = this.text.match(re);
    if (!m) return null;
    this.text = this.text.slice(0, m.index) + ' ' + this.text.slice(m.index + m[0].length);
    return m;
  };
  Cutter.prototype.has = function (re) { return re.test(this.text); };
  Cutter.prototype.rest = function () {
    return this.text.replace(/\s+/g, ' ').trim();
  };

  /* --------------------------------------------------------------- days */

  function startOfWeekWall(d) {
    return T.startOfWeek(d, S.settings().firstDayOfWeek);
  }
  function endOfWeekWall(d) {
    return T.endOfWeek(d, S.settings().firstDayOfWeek);
  }

  /* Never start a series in the past — "for the whole week" said on Wednesday
     means the rest of this week, not three days that already happened. */
  function noEarlierThanToday(day) {
    var today = T.startOfDay(JV.DX ? JV.DX.nowWall() : new Date());
    return day < today ? today : day;
  }

  /* ------------------------------------------------------------- parsing */

  function parse(text) {
    var slots = {
      raw: String(text || ''),
      title: '',
      repeat: null,          // { freq, interval, byDay }
      perWeek: null,
      from: null,            // wall Date, start of day
      until: null,           // wall Date, end of day
      timeOfDay: null,       // minutes from midnight
      duration: null,        // minutes
      allDay: false,
      spanWord: null,        // 'week' | 'month' | ... for the reply
      isSeries: false
    };
    var c = new Cutter(text);
    var m;

    /* --- polite openers ------------------------------------------------ */
    /* Note the \b after the particle list. Without it "add a meeting" loses
       the "me" out of "meeting" and books something called "Eting". */
    var LEAD = new RegExp('^\\s*(?:' + [
      'hey', 'ok(?:ay)?', 'so', 'alright', 'right', 'yeah', 'yh', 'please', 'pls', 'just',
      'could you', 'can you', 'would you', 'will you',
      "i(?:'| a)?m going to", "i(?:'| a)?m gonna", "let'?s",
      // The "to" forms must be tried before the bare ones, or "i want to
      // meditate" keeps a stranded "to".
      'i want to', 'i need to', "i'?d like to", 'i have to', 'i got to', 'i gotta', 'i should',
      'i want', 'i wanna', 'i need'
    ].join('|') + ')\\s+', 'i');
    var VERB = /^\s*(add|create|put|book|block(?: out| off)?|set up|schedule|make|stick|slot|pencil|pop|fit|throw|chuck|drop|get|do)\b(?:\s+(?:in|out|up|me|a|an|the|some|my)\b)*\s*/i;
    var phrasal = false;
    function stripOpener() {
      // "ok so for the next..." stacks two of them, so keep going.
      var guardL = 0;
      while (c.cut(LEAD) && guardL++ < 5) { /* keep stripping */ }
      var v = c.cut(VERB);
      // "put revision in every day" is one verb split around its object, so a
      // stranded particle belongs to the verb and not to the title.
      if (v && /^(put|pop|slot|pencil|fit|stick|block|throw|chuck|drop)/i.test(v[1].trim())) phrasal = true;
      return !!v;
    }
    stripOpener();

    /* --- an explicit end ----------------------------------------------- */
    var MONTH_WORD = 'january|february|march|april|may|june|july|august|september|october|november|december|' +
      'jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec';
    m = c.cut(new RegExp('\\b(?:until|till|til|up (?:un)?til|through|thru|ending|to the end of)\\s+' +
      '(?:the\\s+)?((?:' + MONTH_WORD + ')(?:\\s+\\d{1,2}(?:st|nd|rd|th)?)?|' + DAY_WORD +
      '|end of (?:the |this |next )*(?:week|month|year)|next (?:week|month)|' +
      '\\w+day|\\d{1,2}(?:st|nd|rd|th)?(?: of)?(?: \\w+)?)\\b', 'i'));
    var untilPhrase = m ? m[1] : null;

    /* --- an explicit start --------------------------------------------- */
    m = c.cut(new RegExp('\\b(?:starting|start(?:s)? (?:on|from)|from|beginning|begins? on|as of)\\s+' +
      '(?:the\\s+)?(today|tomorrow|next week|next month|this week|' + DAY_WORD + ')\\b', 'i'));
    var fromPhrase = m ? m[1] : null;

    /* --- a window said as a span --------------------------------------- */
    /* Three readings of a span word, and they are genuinely different:

         "the whole week"   a week's worth, starting now  → rolling
         "this week"        the calendar week we are in   → literal
         "next week"        the calendar week after it    → literal

       Said on a Saturday, "add gym for the whole week" means seven days of
       gym, not the two hours left of Saturday. Treating them the same is what
       made the first build return a one-day "week". */
    var spanWord = null, spanMode = null;   // 'rolling' | 'this' | 'next' | 'rest'

    // "for the next month", "over the next week" — a rolling span.
    m = c.cut(/\b(?:for|over|across|during|in)\s+the\s+next\s+(day|week|month|weekend|year)\b/i);
    if (m) { spanWord = m[1].toLowerCase(); spanMode = 'rolling'; }

    if (!spanWord) {
      m = c.cut(/\b(?:for\s+)?(?:the\s+)?(whole|entire|full|rest of(?: the)?|remainder of(?: the)?|all(?: of)?(?: the)?)\s+(day|week|month|weekend|year)\b/i);
      if (m) {
        spanWord = m[2].toLowerCase();
        spanMode = /rest of|remainder of/i.test(m[1]) ? 'rest' : 'rolling';
      }
    }
    if (!spanWord) {
      // "all week", "all month" — the same idea with the article dropped.
      m = c.cut(/\ball\s+(day|week|month|weekend|year)\s+(?:long\b)?/i);
      if (m) { spanWord = m[1].toLowerCase(); spanMode = 'rolling'; }
    }
    if (!spanWord) {
      // "this week", "next month", "for the week"
      m = c.cut(/\b(?:for\s+)?(this|next|the)\s+(day|week|month|weekend|year)\b/i);
      if (m) {
        spanWord = m[2].toLowerCase();
        spanMode = /next/i.test(m[1]) ? 'next' : 'this';
      }
    }

    /* --- a window said as a count -------------------------------------- */
    // "for two weeks", "for the next 5 days", "over the next month"
    m = c.cut(/\b(?:for|over|across|during)\s+(?:the\s+)?(?:next\s+)?(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|couple(?: of)?|few)\s+(day|days|week|weeks|month|months)\b/i);
    var lenN = m ? count(m[1].replace(/ of$/, '')) : null;
    var lenUnit = m ? m[2].replace(/s$/, '') : null;
    if (!lenN) {
      m = c.cut(/\b(?:the\s+)?next\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|couple(?: of)?|few)\s+(day|days|week|weeks|month|months)\b/i);
      if (m) { lenN = count(m[1].replace(/ of$/, '')); lenUnit = m[2].replace(/s$/, ''); }
    }

    /* --- a rhythm ------------------------------------------------------- */
    var repeat = null;

    // "every other day", "every 3 days", "every 2 weeks", "every other morning"
    m = c.cut(/\bevery\s+(other|\d+|second|third)\s+(days?|weeks?|months?|mornings?|afternoons?|evenings?|nights?)\b/i);
    if (m) {
      var iv = /other|second/i.test(m[1]) ? 2 : /third/i.test(m[1]) ? 3 : parseInt(m[1], 10);
      var unit0 = m[2].toLowerCase().replace(/s$/, '');
      if (PART_OF_DAY[unit0] !== undefined) {
        repeat = { freq: 'daily', interval: iv || 1, byDay: [] };
        slots.timeOfDay = PART_OF_DAY[unit0];
      } else {
        repeat = {
          freq: unit0 === 'day' ? 'daily' : unit0 === 'week' ? 'weekly' : 'monthly',
          interval: iv || 1, byDay: []
        };
      }
    }

    // "every weekday", "on weekdays", "each weekend"
    if (!repeat) {
      m = c.cut(/\b(?:every|each|on|all)\s+(weekday|week ?day|weekend|week ?end)s?\b/i);
      if (!m) m = c.cut(/\b(weekdays|weekends)\b/i);
      if (m) {
        var wk = /weekend/i.test(m[1]);
        repeat = { freq: 'weekly', interval: 1, byDay: wk ? [0, 6] : [1, 2, 3, 4, 5] };
      }
    }

    // "every Monday and Wednesday", "on Tuesdays", "Mon/Wed/Fri"
    if (!repeat) {
      var namedDays = [];
      var dayScan = new RegExp('\\b(?:every|each|on)?\\s*(' + DAY_WORD + ')\\b', 'ig');
      var hits = c.text.match(new RegExp('\\b(' + DAY_WORD + ')\\b', 'ig')) || [];
      var plural = new RegExp('\\b(?:' + DAY_WORD + ')s\\b', 'i').test(c.text);
      var everyDays = /\bevery\s+(?:\w+\s+)?(?:and\s+)?(?:sun|mon|tue|wed|thu|fri|sat)/i.test(c.text);
      if (hits.length && (plural || everyDays || hits.length > 1)) {
        hits.forEach(function (h) {
          var idx = dayIndex(h);
          if (idx !== null && namedDays.indexOf(idx) < 0) namedDays.push(idx);
        });
        if (namedDays.length) {
          repeat = { freq: 'weekly', interval: 1, byDay: namedDays.sort() };
          c.cut(new RegExp('\\bevery\\b(?=[^.]*\\b(?:' + DAY_WORD + ')\\b)', 'i'));
          var stripDays = new RegExp('\\b(?:on\\s+|and\\s+|,\\s*)?(?:' + DAY_WORD + ')\\b', 'ig');
          c.text = c.text.replace(stripDays, ' ');
        }
      }
      dayScan.lastIndex = 0;
    }

    // "every day", "daily", "each morning", "nightly"
    if (!repeat) {
      m = c.cut(/\b(?:every|each)\s+(?:single\s+)?(day|morning|afternoon|evening|night|week|month)\b/i);
      if (m) {
        var unit = m[1].toLowerCase();
        if (PART_OF_DAY[unit] !== undefined) {
          repeat = { freq: 'daily', interval: 1, byDay: [] };
          if (slots.timeOfDay === null) slots.timeOfDay = PART_OF_DAY[unit];
        } else {
          repeat = { freq: unit === 'day' ? 'daily' : unit === 'week' ? 'weekly' : 'monthly', interval: 1, byDay: [] };
        }
      }
    }
    if (!repeat) {
      m = c.cut(/\b(daily|weekly|monthly|nightly|every ?day)\b/i);
      if (m) {
        var w = m[1].toLowerCase().replace(/\s/g, '');
        repeat = {
          freq: w === 'weekly' ? 'weekly' : w === 'monthly' ? 'monthly' : 'daily',
          interval: 1, byDay: []
        };
        if (w === 'nightly' && slots.timeOfDay === null) slots.timeOfDay = PART_OF_DAY.night;
      }
    }

    /* --- a rhythm said as a count -------------------------------------- */
    // "twice a week", "3 times a week", "four times a month"
    m = c.cut(/\b(once|twice|thrice|\d+|one|two|three|four|five|six|seven)\s*(?:x|times?)?\s+(?:a|per|each|every)\s+(day|week|month)\b/i);
    if (m) {
      var per = /once/i.test(m[1]) ? 1 : /twice/i.test(m[1]) ? 2 : /thrice/i.test(m[1]) ? 3 : count(m[1]);
      var perUnit = m[2].toLowerCase();
      if (per) {
        if (perUnit === 'week') slots.perWeek = per;
        else if (perUnit === 'day') { repeat = repeat || { freq: 'daily', interval: 1, byDay: [] }; }
        else if (perUnit === 'month') { repeat = repeat || { freq: 'monthly', interval: 1, byDay: [] }; }
      }
    }

    /* --- a clock -------------------------------------------------------- */
    if (slots.timeOfDay === null && JV.EDITS) {
      // Look for a stated clock time before the loose part-of-day words, so
      // "every evening at 7" keeps the 7.
      var clockText = c.text;
      var clock = JV.EDITS.clockFrom(clockText);
      if (clock !== null && clock !== undefined) {
        slots.timeOfDay = clock;
        c.cut(/\b(?:at|from|around|about|@)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.|o'?clock)?/i);
        c.cut(/\b(?:at|around)\s+(?:half past|quarter (?:past|to))\s+\w+/i);
        c.cut(/\bat\s+(?:noon|midday|midnight)\b/i);
      }
    }
    if (slots.timeOfDay === null) {
      m = c.cut(/\b(?:in|during)\s+the\s+(morning|afternoon|evening)\b/i) ||
        c.cut(/\b(?:every|each)?\s*(mornings?|afternoons?|evenings?|nights?)\b/i);
      if (m) {
        var pod = m[1].toLowerCase().replace(/s$/, '');
        if (PART_OF_DAY[pod] !== undefined) slots.timeOfDay = PART_OF_DAY[pod];
      }
    }

    /* --- a length ------------------------------------------------------- */
    /* Matched and cut in one step, so the words that gave the length can never
       be left behind in the title ("45 minutes of reading" → 45 min, reading).
       Only spelled-out units count; a bare "m" or "h" is too easy to mistake
       for part of a name. */
    m = c.cut(/\bhalf an hour\b|\bquarter of an hour\b/i);
    if (m) slots.duration = /half/i.test(m[0]) ? 30 : 15;
    if (slots.duration === null) {
      m = c.cut(/\b(?:for|lasting|of)?\s*(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|half)\s*(?:-|\s)?\s*(hours?|hrs?|minutes?|mins?)\b(?:\s+long)?/i);
      if (m) {
        var qty = /^\d/.test(m[1]) ? parseFloat(m[1]) : (m[1].toLowerCase() === 'half' ? 0.5 : count(m[1]));
        if (qty) slots.duration = Math.round(qty * (/^h/i.test(m[2]) ? 60 : 1));
      }
    }

    /* --- resolve the window -------------------------------------------- */
    var today = T.startOfDay(JV.DX ? JV.DX.nowWall() : new Date());

    if (fromPhrase) {
      var fd = JV.DX ? JV.DX.parseDay(fromPhrase) : null;
      if (fd) slots.from = T.startOfDay(fd);
      else if (/next week/i.test(fromPhrase)) slots.from = T.addDays(startOfWeekWall(today), 7);
      else if (/next month/i.test(fromPhrase)) slots.from = T.startOfMonth(T.addDays(T.endOfMonth(today), 1));
    }

    if (spanWord === 'weekend') {
      /* A weekend is a pair of named days, not a slice of a week, and which
         week it sits in depends on where the week is said to start. Finding
         the Saturday directly sidesteps that entirely. */
      slots.spanWord = 'weekend';
      var anchor = T.startOfDay(slots.from || today);
      if (spanMode === 'next') anchor = T.addDays(anchor, 7);
      var guardW = 0;
      while (anchor.getDay() !== 6 && anchor.getDay() !== 0 && guardW++ < 7) anchor = T.addDays(anchor, 1);
      slots.from = anchor;
      // Saturday runs into Sunday; a Sunday is the last day of its own weekend.
      slots.until = T.endOfDay(anchor.getDay() === 6 ? T.addDays(anchor, 1) : anchor);
    } else if (spanWord) {
      slots.spanWord = spanWord;
      var LEN = { day: 1, week: 7, month: 30, year: 365 };
      var start = slots.from || today;

      if (spanMode === 'rolling') {
        slots.from = start;
        slots.until = T.endOfDay(T.addDays(start, LEN[spanWord] - 1));
      } else if (spanMode === 'rest') {
        slots.from = start;
        slots.until = spanWord === 'month' ? T.endOfMonth(start)
          : spanWord === 'year' ? T.endOfDay(T.addDays(T.startOfDay(start), 364))
            : spanWord === 'day' ? T.endOfDay(start)
              : endOfWeekWall(start);
      } else {
        var base = today;
        if (spanMode === 'next') {
          if (spanWord === 'week' || spanWord === 'weekend') base = T.addDays(startOfWeekWall(today), 7);
          else if (spanWord === 'month') base = T.startOfMonth(T.addDays(T.endOfMonth(today), 1));
          else if (spanWord === 'day') base = T.addDays(today, 1);
          else base = T.addDays(today, LEN[spanWord]);
        }
        var openTo = function (b) {
          return spanWord === 'month' ? { a: T.startOfMonth(b), z: T.endOfMonth(b) }
            : spanWord === 'day' ? { a: T.startOfDay(b), z: T.endOfDay(b) }
              : spanWord === 'year' ? { a: T.startOfDay(b), z: T.endOfDay(T.addDays(T.startOfDay(b), 364)) }
                : { a: startOfWeekWall(b), z: endOfWeekWall(b) };
        };
        var win = openTo(base);
        slots.from = slots.from || noEarlierThanToday(win.a);
        slots.until = win.z;
        // Remember how we got here so the thin-window check below — which
        // needs the finished rhythm to count occurrences — can roll forward.
        slots._span = { word: spanWord, mode: spanMode, openTo: openTo };
      }
      if (spanMode === 'rest') slots._span = { word: spanWord, mode: 'rest' };

    }
    if (spanWord === 'weekend') repeat = repeat || { freq: 'weekly', interval: 1, byDay: [0, 6] };

    if (!slots.until && lenN && lenUnit) {
      var start = slots.from || today;
      var end = lenUnit === 'day' ? T.addDays(start, lenN - 1)
        : lenUnit === 'week' ? T.addDays(start, lenN * 7 - 1)
          : T.addDays(start, lenN * 30 - 1);
      slots.until = T.endOfDay(end);
      slots.spanWord = slots.spanWord || (lenN + ' ' + lenUnit + (lenN === 1 ? '' : 's'));
    }

    if (!slots.until && untilPhrase) {
      var ud = null;
      if (/end of (?:the )?next week/i.test(untilPhrase)) ud = endOfWeekWall(T.addDays(startOfWeekWall(today), 7));
      else if (/end of (?:the )?next month/i.test(untilPhrase)) ud = T.endOfMonth(T.addDays(T.endOfMonth(today), 1));
      else if (/end of (?:the |this )?week/i.test(untilPhrase)) ud = endOfWeekWall(today);
      else if (/end of (?:the |this )?month/i.test(untilPhrase)) ud = T.endOfMonth(today);
      else if (/next week/i.test(untilPhrase)) ud = endOfWeekWall(T.addDays(startOfWeekWall(today), 7));
      else if (/next month/i.test(untilPhrase)) ud = T.endOfMonth(T.addDays(T.endOfMonth(today), 1));
      else if (new RegExp('^(?:' + MONTH_WORD + ')$', 'i').test(untilPhrase.trim())) {
        // "until December" means through the end of December, and the next one
        // — saying it in August cannot mean the December already gone.
        var mi = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
          .indexOf(untilPhrase.trim().slice(0, 3).toLowerCase());
        if (mi >= 0) {
          var yr = today.getFullYear() + (mi < today.getMonth() ? 1 : 0);
          ud = T.endOfMonth(new Date(yr, mi, 1));
        }
      } else if (JV.DX) ud = JV.DX.parseDay(untilPhrase);
      if (ud) slots.until = T.endOfDay(ud);
    }

    slots.explicitRhythm = !!repeat || !!slots.perWeek;

    /* A window means every day of it — but only when the window is a *filling*
       one. "For the whole week" asks to fill a week; "next week" only dates a
       single thing, and reading it as seven copies is how "add a meeting with
       sam next week" turned into a week of meetings. */
    if (slots.until && !repeat && !slots.perWeek && spanMode !== 'this' && spanMode !== 'next') {
      repeat = { freq: 'daily', interval: 1, byDay: [] };
    }

    /* A weekend is Saturday and Sunday whatever else was said, so a rhythm
       stated as "every day this weekend" still means those two days. */
    if (spanWord === 'weekend' && repeat && repeat.freq === 'daily') {
      repeat = { freq: 'weekly', interval: 1, byDay: [0, 6] };
    }

    /* A count-per-week with no named days: spread them evenly from the start
       day. Which days were picked is reported back, never hidden. */
    slots.repeat = repeat;
    if (slots.perWeek && (!repeat || !repeat.byDay.length)) {
      var startDay = slots.from || today;
      var n = Math.min(7, Math.max(1, slots.perWeek));
      var picks = [];
      for (var i = 0; i < n; i++) {
        var d = (startDay.getDay() + Math.round(i * 7 / n)) % 7;
        if (picks.indexOf(d) < 0) picks.push(d);
      }
      slots.repeat = { freq: 'weekly', interval: 1, byDay: picks.sort(function (a, b) { return a - b; }) };
    }

    /* How many days in [from, until] the rhythm actually lands on. This is the
       number that decides whether a window is worth using, and it can only be
       known once both the window and the rhythm are settled. */
    function occurrenceCount(rule, from, until) {
      if (!rule || !from || !until) return 0;
      var n = 0, cur = T.startOfDay(from), stop = T.startOfDay(until), guard = 0;
      while (cur <= stop && guard++ < 800) {
        var hit;
        if (rule.freq === 'daily') hit = T.diffDays(from, cur) % rule.interval === 0;
        else if (rule.freq === 'weekly') {
          var days = rule.byDay && rule.byDay.length ? rule.byDay : [from.getDay()];
          hit = days.indexOf(cur.getDay()) >= 0 &&
            Math.round(T.diffDays(startOfWeekWall(from), startOfWeekWall(cur)) / 7) % rule.interval === 0;
        } else hit = cur.getDate() === from.getDate();
        if (hit) n++;
        cur = T.addDays(cur, 1);
      }
      return n;
    }

    /* "This week" said on the last day of it, or "every weekday this month"
       said on the 29th, leaves one entry or none. Rolling to the next span is
       what was meant — and saying so is the difference between helpful and
       quietly wrong. */
    if (slots._span && slots.repeat &&
        occurrenceCount(slots.repeat, slots.from, slots.until) < 2) {
      var nextBase = slots._span.word === 'month'
        ? T.startOfMonth(T.addDays(T.endOfMonth(today), 1))
        : slots._span.word === 'day' ? T.addDays(today, 1)
          : T.addDays(startOfWeekWall(today), 7);
      var nextWin = slots._span.openTo ? slots._span.openTo(nextBase) : {
        a: nextBase,
        z: slots._span.word === 'month' ? T.endOfMonth(nextBase) : endOfWeekWall(nextBase)
      };
      slots.from = nextWin.a;
      slots.until = nextWin.z;
      slots.rolled = slots._span.word;
    }
    delete slots._span;

    /* A rhythm with no stated window still needs an end — an unbounded series
       is almost never what someone means when they say "for a bit". */
    if (slots.repeat && !slots.until) {
      var horizon = slots.repeat.freq === 'monthly' ? 365 : slots.repeat.freq === 'weekly' ? 84 : 28;
      slots.until = T.endOfDay(T.addDays(slots.from || today, horizon));
      slots.openEnded = true;
    }
    if (slots.repeat && !slots.from) slots.from = today;

    /* --- what is left is the title -------------------------------------- */
    /* The verb is not always at the front: "for the whole month, i want to
       meditate at 7am" puts the window first. Now that the keywords are gone,
       what was buried in the middle is at the front, so look again. */
    c.text = ' ' + c.text.replace(/^[\s,;:\-–—]+/, '') + ' ';
    stripOpener();

    var title = c.rest()
      .replace(/^(?:and|then|also|to|for|in|on|of|a|an|the|some|my|me|do|go|going to|i|will)\b\s*/i, '')
      .replace(/\b(?:on|in|to)\s+(?:my|the)\s+(?:calendar|schedule|diary)\b/ig, '')
      .replace(/\b(?:please|thanks|thank you)\b/ig, '')
      .replace(/^\s*(?:a|an|the|some|my)\s+/i, '')
      .replace(/[,\.\s]+$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (phrasal) title = title.replace(/\s+(in|out|up|down)$/i, '').trim();
    // A leftover that is only connective words is not a title.
    if (/^(?:it|this|that|them|those|time|slot|session|thing)$/i.test(title)) title = '';
    slots.title = title ? title.charAt(0).toUpperCase() + title.slice(1) : '';

    slots.allDay = slots.timeOfDay === null;
    slots.isSeries = !!slots.repeat && !!slots.title;
    return slots;
  }

  /* Would this sentence create a series? Used to route, so it must be cheap
     and must not fire on a plain one-off ("add gym tomorrow at 6"). */
  var RHYTHM = /\b(every|each|daily|weekly|monthly|nightly|weekdays?|weekends?|once a|twice a|thrice a|\d+\s*(?:x|times?)\s*(?:a|per|each))\b/i;
  var WINDOW = /\b(whole|entire|all (?:day|week|month|year)|rest of|remainder of|for the (?:week|month|year)|for the next|this (?:week|month|weekend)|next (?:week|month|weekend)|for (?:the next )?(?:\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|couple|few)\s+(?:days?|weeks?|months?)|until|through)\b/i;

  /* Spreading N hours of work is a different job from repeating one thing on a
     rhythm, and the two overlap in wording ("two hours of studying this week").
     A stated rhythm settles it; a bare window plus a quantity does not. */
  var QUANTITY = /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:-|\s)?\s*(?:hours?|hrs?|sessions?|blocks?|sittings?|chunks?)\b/i;

  /* "What do I have every Monday" carries a rhythm word but asks a question.
     Nothing gets written from a question. "Can you block …" is a polite
     imperative rather than an enquiry, so the courtesy openers are excluded. */
  var QUESTION = /\?\s*$/;
  var ASKS = /^\s*(what|when|where|who|which|why|how|whats|what'?s|am i|do i|did i|does|is there|are there|have i|has |can i|should i|could i|any )/i;

  function looksLikeSeries(text) {
    var s = String(text || '');
    if (QUESTION.test(s) || ASKS.test(s)) return false;
    if (!RHYTHM.test(s) && !WINDOW.test(s)) return false;
    if (!RHYTHM.test(s) && QUANTITY.test(s)) return false;
    var parsed;
    try { parsed = parse(s); } catch (err) { return false; }
    if (!parsed.isSeries) return false;
    // A remark is not an instruction. "I feel like I waste my whole week" has a
    // window in it, but nobody is asking for anything to be booked — so a
    // statement has to state a rhythm outright before it counts.
    if (!parsed.explicitRhythm && /^\s*(i|my|we|it|this|that|there)\b/i.test(s) &&
        !/^\s*i (?:want|need|have|'?d like|would like|'?m going)\s+to\b/i.test(s)) {
      return false;
    }
    return true;
  }

  JV.SLOTS = {
    parse: parse,
    looksLikeSeries: looksLikeSeries,
    dayIndex: dayIndex,
    PART_OF_DAY: PART_OF_DAY
  };
})(window);
