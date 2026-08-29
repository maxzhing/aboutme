/* Cadence · JARVIS — reading an edit out of a sentence.

   "Change my dentist appointment to 5pm", "make it half an hour", "push it
   back an hour", "start at 4 and run for 90 minutes" — these are all one kind
   of request, and a person hearing them has no trouble. The earlier build had
   them scattered across three intents with a clock parser that only understood
   "at 4", which is why "move it to 4:30" moved the event to the wrong day.

   This file reads every edit dimension out of one sentence at once:

     when        an absolute time      "to 5pm", "at 3:15", "half past four"
     date        an absolute day       "to Tuesday", "on the 14th"
     shift       a relative move       "push back an hour", "30 min earlier"
     duration    an absolute length    "make it 30 minutes", "an hour long"
     stretch     a relative length     "extend by 20", "shorten by a quarter"
     title       a rename              "rename it to X", "call it X"

   Anything it cannot find is left undefined so the caller keeps what the event
   already had. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};

  var WORD_NUM = {
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, quarter: 0.25, half: 0.5
  };

  function num(word) {
    if (word === undefined || word === null) return null;
    var w = String(word).toLowerCase();
    if (WORD_NUM[w] !== undefined) return WORD_NUM[w];
    var n = parseFloat(w);
    return isFinite(n) ? n : null;
  }

  /* ------------------------------------------------------------ duration */

  /* Minutes from "90 minutes", "an hour and a half", "1.5 hrs", "half an hour",
     "a quarter of an hour". */
  function minutesFrom(text) {
    var s = String(text || '').toLowerCase();

    if (/\bhalf an hour\b|\bhalf hour\b/.test(s)) return 30;
    if (/\bquarter of an hour\b|\bquarter hour\b/.test(s)) return 15;

    var both = s.match(/\b(\d+|an?|one|two|three|four|five|six)\s*(?:hours?|hrs?|h)\s*(?:and\s*)?(?:a\s*)?(half|quarter|\d+)\s*(?:minutes?|mins?)?\b/);
    if (both) {
      var h = num(both[1]);
      var extra = both[2] === 'half' ? 30 : both[2] === 'quarter' ? 15 : num(both[2]);
      if (h !== null && extra !== null) return Math.round(h * 60 + extra);
    }

    var hours = s.match(/\b(\d+(?:\.\d+)?|an?|one|two|three|four|five|six|seven|eight|half|quarter)\s*(?:-|\s)?\s*(?:hours?|hrs?|h)\b/);
    if (hours) {
      var n = num(hours[1]);
      if (n !== null) return Math.round(n * 60);
    }

    var mins = s.match(/\b(\d+)\s*(?:-|\s)?\s*(?:minutes?|mins?|m)\b/);
    if (mins) return parseInt(mins[1], 10);

    return null;
  }

  /* --------------------------------------------------------------- clock */

  var NAMED_TIME = {
    noon: 12 * 60, midday: 12 * 60, midnight: 0,
    breakfast: 8 * 60, lunch: 12 * 60 + 30, dinner: 18 * 60 + 30, teatime: 16 * 60
  };

  /* Minutes-of-day from a clock phrase, or null. Understands "5pm", "4:30",
     "3:15 pm", "16:00", "half past four", "quarter to five", "noon". */
  function clockFrom(text, opts) {
    opts = opts || {};
    var s = String(text || '').toLowerCase();

    var named = s.match(/\b(noon|midday|midnight|lunch|dinner|breakfast|teatime)\b/);
    if (named) return NAMED_TIME[named[1]];

    var past = s.match(/\b(half|quarter|\d{1,2})\s+(past|to|after|before)\s+(\d{1,2}|noon|midday)\b/);
    if (past) {
      var base = past[3] === 'noon' || past[3] === 'midday' ? 12 : parseInt(past[3], 10);
      var off = past[1] === 'half' ? 30 : past[1] === 'quarter' ? 15 : parseInt(past[1], 10);
      var mins = base * 60 + (/(to|before)/.test(past[2]) ? -off : off);
      return normaliseHour(mins, s, opts);
    }

    // An explicit clock, optionally introduced by to/at/from/until/for.
    var m = s.match(/\b(?:to|at|from|until|till|by|around|about)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/);
    if (!m) return null;

    // A bare number with no meridiem and no colon is only a time when the
    // sentence framed it as one — "to 4" yes, "by 30 minutes" no.
    var framed = /\b(?:to|at|from|until|till|starting|start(?:s|ing)? at|by)\s*$/.test(
      s.slice(0, m.index + (m[0].length - m[0].trimStart().length))
    ) || /\b(?:to|at|from|until|till|around|about)\b/.test(m[0]);
    if (!m[2] && !m[3] && !framed) return null;

    var hour = parseInt(m[1], 10);
    var minute = m[2] ? parseInt(m[2], 10) : 0;
    if (hour > 23 || minute > 59) return null;

    var mer = (m[3] || '').replace(/\./g, '');
    if (mer === 'pm' && hour < 12) hour += 12;
    if (mer === 'am' && hour === 12) hour = 0;
    if (!mer) return normaliseHour(hour * 60 + minute, s, opts);
    return hour * 60 + minute;
  }

  /* A bare "4" almost always means the afternoon in a diary; "9" means the
     morning. Anchor to the event's own time where we have one. */
  function normaliseHour(mins, source, opts) {
    if (mins < 0) mins += 24 * 60;
    var hour = Math.floor(mins / 60);
    if (hour > 12) return mins;
    if (/\b(am|morning)\b/.test(source)) return mins;
    if (/\b(pm|afternoon|evening|tonight)\b/.test(source)) {
      return hour < 12 ? mins + 12 * 60 : mins;
    }
    // 1–7 reads as afternoon, 8–12 as morning — the usual diary convention.
    if (hour >= 1 && hour <= 7) return mins + 12 * 60;
    return mins;
  }

  /* ---------------------------------------------------------- direction */

  var LATER = /\b(back|later|delay|postpone|push (?:it |them )?back|put back)\b/i;
  var EARLIER = /\b(earlier|sooner|forward|up|bring forward|move up|ahead)\b/i;

  /* Minutes to shift the event by: positive later, negative earlier. */
  function shiftFrom(text) {
    var s = String(text || '');
    // Only read a shift when the sentence is talking about moving in time.
    if (!/\b(push|move|shift|bump|delay|postpone|bring|put|make it|nudge)\b/i.test(s)) return null;
    if (!LATER.test(s) && !EARLIER.test(s)) return null;

    var amount = minutesFrom(s);
    if (amount === null) return null;

    // "push back" wins over a stray "forward" elsewhere in the sentence.
    var later = /\bpush (?:it |them )?back\b|\b(back|later|delay|postpone|put back)\b/i.test(s);
    return later ? amount : -amount;
  }

  /* Relative length change: "extend by 20", "shorten by a quarter of an hour",
     "add 15 minutes", "cut it by half an hour". */
  function stretchFrom(text) {
    var s = String(text || '');
    var grow = /\b(extend|lengthen|add|increase|stretch|give it)\b/i.test(s);
    var shrink = /\b(shorten|cut|trim|reduce|shave|take)\b/i.test(s);
    if (!grow && !shrink) return null;
    var amount = minutesFrom(s);
    if (amount === null) return null;
    return shrink ? -amount : amount;
  }

  /* Absolute length: "make it 30 minutes", "an hour long", "run for 90 mins". */
  function durationFrom(text) {
    var s = String(text || '');
    if (stretchFrom(s) !== null) return null;          // relative, not absolute
    var m = s.match(/\b(?:make|set|book|run|last|go)\b[^.]*?\b(?:for|to|it|them)?\s*((?:\d+(?:\.\d+)?|an?|one|two|three|four|five|six|half|quarter)[^.]{0,18}?(?:hours?|hrs?|h|minutes?|mins?))\b/i);
    if (m) return minutesFrom(m[1]);
    m = s.match(/\b((?:\d+(?:\.\d+)?|an?|one|two|three|four|five|six|half|quarter)[^.]{0,18}?(?:hours?|hrs?|minutes?|mins?))\s+long\b/i);
    if (m) return minutesFrom(m[1]);
    m = s.match(/\bfor\s+((?:\d+(?:\.\d+)?|an?|one|two|three|four|five|six|half|quarter)[^.]{0,18}?(?:hours?|hrs?|h|minutes?|mins?))\b/i);
    if (m) return minutesFrom(m[1]);
    return null;
  }

  /* ---------------------------------------------------------- the whole */

  var EDIT_VERB = /\b(change|move|reschedule|shift|push|bump|delay|postpone|bring|set|make|rename|call|shorten|lengthen|extend|cut|trim|reduce|adjust|update|edit|nudge|put)\b/i;

  var PRONOUN_SUBJECT = /\b(it|them|that|this|those)\b/i;

  /* Strip everything that describes the edit, leaving the thing being edited.
     When nothing survives but the sentence pointed at something ("move it to
     5pm"), hand back the pronoun so the resolver can use what is in focus. */
  function subjectOf(text) {
    var stripped = stripSubject(text);
    if (!stripped && PRONOUN_SUBJECT.test(text)) return 'it';
    return stripped;
  }

  function stripSubject(text) {
    return String(text || '')
      .replace(/\b(actually|instead|please|just|now|then|maybe|also)\b/gi, ' ')
      // "give me 20 minutes before X to get there" — everything but X.
      .replace(/^\s*(?:give me|leave|allow|add)\s+(?:\d+|an?|one|two|three|half|quarter)[^.]{0,14}?(?:hours?|hrs?|minutes?|mins?)\s+(?:before|ahead of)\s*/i, ' ')
      .replace(/\bto get (?:there|to)\b.*$/i, ' ')
      .replace(/^\s*(?:(?:can|could|would|will)\s+(?:you|u)\s+|please\s+|hey\s+|pls\s+)*/i, '')
      // The new name has to go before the verb is stripped, or the pattern
      // that recognises it loses its anchor.
      .replace(/\bto\s+[^.]*$/i, function (tail, offset, whole) {
        return /\b(rename|call)\b/i.test(whole.slice(0, offset)) ? ' ' : tail;
      })
      .replace(EDIT_VERB, ' ')
      .replace(/\bto\s+(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midday|midnight).*$/i, ' ')
      .replace(/\b(?:at|from|until|till|by|around)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?.*$/i, ' ')
      .replace(/\b(?:half|quarter)\s+(?:past|to)\s+\w+.*$/i, ' ')
      .replace(/\b(?:next|this|on)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|tonight)\b.*$/i, ' ')
      .replace(/\b(?:by|for)\s+(?:\d+(?:\.\d+)?|an?|one|two|three|four|five|six|half|quarter)[^.]{0,18}?(?:hours?|hrs?|h|minutes?|mins?)\b.*$/i, ' ')
      .replace(/\b(?:\d+(?:\.\d+)?|an?|one|two|three|four|five|six|half|quarter)\s*(?:hours?|hrs?|h|minutes?|mins?)\b.*$/i, ' ')
      .replace(/\b(back|earlier|later|forward|up|sooner|ahead|long|longer|shorter)\b/gi, ' ')
      .replace(/\b(the|my|it|them|that|this|start|starts|starting|run|runs|running|and|to|of|time)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^[\s,.:;-]+|[\s,.!?:;-]+$/g, '')
      .trim();
  }

  function renameTo(text) {
    var m = String(text || '').match(/\b(?:rename\s+.*?\s+to|call\s+(?:it|them)?\s*)\s*["“']?([^"”'.!?]{1,60})["”']?\s*$/i);
    return m ? m[1].trim() : null;
  }

  /* Read every dimension of an edit out of one sentence. */
  function parse(text) {
    var s = String(text || '');
    var spec = { raw: s };

    spec.item = subjectOf(s);
    spec.title = renameTo(s);
    spec.shift = shiftFrom(s);
    spec.stretch = stretchFrom(s);
    spec.duration = spec.stretch === null ? durationFrom(s) : null;

    // A clock only counts when it is not just the duration read twice.
    if (spec.shift === null) {
      var timePart = s.match(/\b(?:to|at|from|starting at|starts at|start at|until|till|by|around)\s+[^.]{1,24}/i);
      var clock = clockFrom(timePart ? timePart[0] : s);
      if (clock !== null && !/\bby\s+(?:\d+(?:\.\d+)?|an?|one|two|three|half|quarter)[^.]{0,12}(?:hours?|hrs?|minutes?|mins?)\b/i.test(s)) {
        spec.when = clock;
      }
    }

    var day = s.match(/\b(?:to|on|for)\s+((?:next\s+|this\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today))\b/i);
    if (day) spec.date = day[1];
    else if (/\b(tomorrow|today|tonight)\b/i.test(s)) {
      spec.date = /\btomorrow\b/i.test(s) ? 'tomorrow' : 'today';
    }

    // "give me 20 minutes before the dentist appointment to get there" — travel
    // time is a real field on a Cadence event, not a separate reminder.
    var travel = s.match(/\b(?:give me|leave|allow|add)\s+((?:\d+|an?|one|two|three|half|quarter)[^.]{0,14}?(?:hours?|hrs?|minutes?|mins?))\s+(?:before|ahead of|to get to|to get there)/i);
    if (travel) spec.travel = minutesFrom(travel[1]);

    spec.hasEdit = spec.title !== null || spec.shift !== null || spec.stretch !== null ||
      spec.duration !== null || spec.when !== undefined || spec.date !== undefined ||
      spec.travel !== undefined;

    return spec;
  }

  /* Does this sentence read as editing something that already exists? */
  function looksLikeEdit(text) {
    if (/\b(?:give me|leave|allow)\s+[^.]{1,20}(?:before|ahead of|to get to|to get there)/i.test(text)) return true;
    if (!EDIT_VERB.test(text)) return false;
    var spec = parse(text);
    return spec.hasEdit || /\b(change|reschedule|move|rename)\b/i.test(text);
  }

  JV.EDITS = {
    parse: parse,
    looksLikeEdit: looksLikeEdit,
    minutesFrom: minutesFrom,
    clockFrom: clockFrom,
    shiftFrom: shiftFrom,
    stretchFrom: stretchFrom,
    durationFrom: durationFrom,
    subjectOf: subjectOf
  };
})(window);
