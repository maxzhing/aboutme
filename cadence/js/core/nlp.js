/* Cadence — natural language parsing.

   Turns "study biology tomorrow from 4-6 #school !!" into a structured draft.
   Two rules govern everything here:
     1. Every value we infer is reported back in `parts` so the confirm sheet can
        show its work. Nothing important is assumed silently.
     2. Text we consume is tracked by character range, so the leftover really is
        the title — no brittle string replacement. */
(function (global) {
  'use strict';

  var WEEKDAYS = {
    sunday: 0, sun: 0, sundays: 0,
    monday: 1, mon: 1, mondays: 1,
    tuesday: 2, tue: 2, tues: 2, tuesdays: 2,
    wednesday: 3, wed: 3, weds: 3, wednesdays: 3,
    thursday: 4, thu: 4, thur: 4, thurs: 4, thursdays: 4,
    friday: 5, fri: 5, fridays: 5,
    saturday: 6, sat: 6, saturdays: 6
  };
  var MONTHS = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
    may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
    sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10,
    dec: 11, december: 11
  };
  var NAMED_TIMES = {
    noon: 12 * 60, midday: 12 * 60, midnight: 0,
    morning: 9 * 60, afternoon: 14 * 60, evening: 19 * 60, night: 20 * 60,
    breakfast: 8 * 60, lunch: 12 * 60 + 30, dinner: 18 * 60 + 30
  };

  var FILLERS = [
    /^(?:i\s+)?(?:need|have|want|got)\s+to\s+/i,
    /^(?:please\s+)?remind\s+me\s+to\s+/i,
    /^(?:please\s+)?remember\s+to\s+/i,
    /^don'?t\s+forget\s+to\s+/i,
    /^make\s+sure\s+(?:to|i)\s+/i,
    /^i\s+should\s+/i,
    /^i\s+must\s+/i,
    /^todo:?\s+/i,
    /^my\s+/i
  ];

  var HABIT_VERBS = /\b(practice|read|journal|meditat|exercise|workout|work out|stretch|run|jog|walk|drink|review|study vocab|floss|water)\b/i;

  function Cursor(text) {
    this.text = text;
    this.taken = [];
  }
  Cursor.prototype.free = function (start, end) {
    for (var i = 0; i < this.taken.length; i++) {
      if (start < this.taken[i][1] && this.taken[i][0] < end) return false;
    }
    return true;
  };
  Cursor.prototype.take = function (start, end) { this.taken.push([start, end]); };
  /* First regex match in untouched text. Returns the match (with .index). */
  Cursor.prototype.find = function (re) {
    re.lastIndex = 0;
    var m, guard = 0;
    var global_ = re.global;
    while ((m = re.exec(this.text)) && guard++ < 200) {
      if (this.free(m.index, m.index + m[0].length)) return m;
      if (!global_) return null;
    }
    return null;
  };
  Cursor.prototype.remaining = function () {
    var ranges = this.taken.slice().sort(function (a, b) { return a[0] - b[0]; });
    var out = '', pos = 0;
    for (var i = 0; i < ranges.length; i++) {
      if (ranges[i][0] > pos) out += this.text.slice(pos, ranges[i][0]);
      pos = Math.max(pos, ranges[i][1]);
    }
    out += this.text.slice(pos);
    return out;
  };

  function cleanTitle(s) {
    var t = s.replace(/\s+/g, ' ').trim();
    var changed = true, guard = 0;
    while (changed && guard++ < 8) {
      changed = false;
      FILLERS.forEach(function (re) {
        var next = t.replace(re, '');
        if (next !== t) { t = next; changed = true; }
      });
    }
    t = t.replace(/^[\s,;:\-–—.]+/, '').replace(/[\s,;:\-–—.]+$/, '');
    // Trailing dangling prepositions left behind after we lifted a date/time out.
    t = t.replace(/\s+\b(on|at|from|for|by|before|due|to|the|this|next|every|in|of|with|and)\b\s*$/i, '');
    t = t.replace(/^\b(on|at|from|for|by|before|due|to|the|and)\b\s+/i, '');
    t = t.replace(/\s+/g, ' ').trim();
    if (!t) return '';
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function hhmm(h, m, meridiem) {
    h = +h; m = m ? +m : 0;
    if (meridiem) {
      meridiem = meridiem.toLowerCase().replace(/\./g, '');
      if (meridiem.charAt(0) === 'p' && h < 12) h += 12;
      if (meridiem.charAt(0) === 'a' && h === 12) h = 0;
    }
    if (h > 23) h = 23;
    if (m > 59) m = 59;
    return h * 60 + m;
  }

  /* When no am/pm is given, pick the reading a person actually means. */
  function inferMeridiem(h, minutes, hint) {
    if (h === 0 || h > 12) return minutes;
    if (hint === 'am') return h === 12 ? minutes - 12 * 60 : minutes;
    if (hint === 'pm') return h < 12 ? minutes + 12 * 60 : minutes;
    if (h >= 1 && h <= 6) return minutes + 12 * 60;   // "at 4" means the afternoon
    if (h === 12) return minutes;                      // noon
    return minutes;                                    // 7–11 read as morning
  }

  /* ---------------- parse ---------------- */

  function parse(input, opts) {
    opts = opts || {};
    var now = opts.now || T.nowWall();
    var settings = S.settings();
    var raw = String(input || '').trim();
    var cur = new Cursor(raw);

    var out = {
      input: raw,
      type: null,
      title: '',
      dayWall: null,
      endDayWall: null,
      startMinutes: null,
      endMinutes: null,
      durationMinutes: null,
      allDay: false,
      recurrence: null,
      priority: null,
      tags: [],
      projectId: null,
      goalId: null,
      categoryId: null,
      location: '',
      people: [],
      isDeadline: false,
      isReminder: false,
      parts: [],
      warnings: []
    };

    function note(label, text, value) {
      out.parts.push({ label: label, text: text, value: value });
    }

    /* --- explicit type prefix --- */
    var typeM = cur.find(/^\s*(event|task|todo|to-do|note|idea|deadline|habit|project|goal|reminder)\s*:\s*/i);
    if (typeM && typeM.index === 0) {
      cur.take(typeM.index, typeM.index + typeM[0].length);
      var t = typeM[1].toLowerCase();
      out.type = (t === 'todo' || t === 'to-do') ? 'task' : (t === 'reminder' ? 'task' : t);
      if (t === 'reminder') out.isReminder = true;
      note('Type', typeM[1], out.type);
    }

    /* --- tags --- */
    var tagRe = /#([a-z0-9][a-z0-9_-]*)/gi, tm;
    tagRe.lastIndex = 0;
    while ((tm = tagRe.exec(raw))) {
      if (!cur.free(tm.index, tm.index + tm[0].length)) continue;
      cur.take(tm.index, tm.index + tm[0].length);
      out.tags.push(tm[1].toLowerCase());
    }
    if (out.tags.length) note('Tags', out.tags.map(function (x) { return '#' + x; }).join(' '), out.tags);

    /* --- project (+name, or a name we already know) --- */
    var projRe = /\+([a-z0-9][a-z0-9 _-]*)/i;
    var pm = cur.find(projRe);
    if (pm) {
      var pname = pm[1].trim();
      var found = matchProject(pname);
      cur.take(pm.index, pm.index + pm[0].length);
      if (found) { out.projectId = found.id; note('Project', found.name, found.id); }
      else { out.projectName = pname; note('Project', pname + ' (new)', null); }
    } else {
      var known = findKnownProject(raw, cur);
      if (known) { out.projectId = known.id; note('Project', known.name, known.id); }
    }

    /* --- priority --- */
    var prio = cur.find(/\b(urgent|asap|critical|highest priority|high priority|important|low priority|whenever|someday)\b/i);
    if (prio) {
      cur.take(prio.index, prio.index + prio[0].length);
      var word = prio[1].toLowerCase();
      out.priority = /urgent|asap|critical/.test(word) ? 'critical'
        : /high|important/.test(word) ? 'high'
          : 'low';
      note('Priority', prio[1], out.priority);
    } else {
      var bang = cur.find(/(!{1,3})(?=\s|$)/);
      if (bang) {
        cur.take(bang.index, bang.index + bang[0].length);
        out.priority = bang[1].length >= 3 ? 'critical' : bang[1].length === 2 ? 'high' : 'medium';
        note('Priority', bang[1], out.priority);
      }
    }

    /* --- recurrence --- */
    parseRecurrence(cur, out, note);

    /* --- duration --- */
    var dur = cur.find(/\bfor\s+(\d+(?:\.\d+)?)\s*(minutes?|mins?|m|hours?|hrs?|h)\b/i) ||
      cur.find(/\b(\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?)\b/i) ||
      cur.find(/\b(\d+(?:\.\d+)?)(h|m)\b/i);
    if (dur) {
      cur.take(dur.index, dur.index + dur[0].length);
      var n = parseFloat(dur[1]);
      var unit = dur[2].toLowerCase();
      out.durationMinutes = /^h/.test(unit) ? Math.round(n * 60) : Math.round(n);
      // "for 45 minutes" states a length; a bare "20 minutes" is usually part
      // of the name, so only the bare form is restored into the title later.
      out.durationExplicit = /^for\b/i.test(dur[0]);
      out.durationText = dur[0].replace(/^for\s+/i, '');
      note('Duration', T.humanDuration(out.durationMinutes), out.durationMinutes);
    }

    /* --- deadline / reminder intent --- */
    var dl = cur.find(/\b(due|deadline|by end of|due by)\b/i);
    if (dl) {
      out.isDeadline = true;
      cur.take(dl.index, dl.index + dl[0].length);
    } else {
      var byRe = cur.find(/\b(before|by)\s+(?=\w)/i);
      if (byRe) { out.isDeadline = true; cur.take(byRe.index, byRe.index + byRe[0].length); }
    }
    if (/\bremind me\b/i.test(raw)) out.isReminder = true;

    /* --- time --- */
    parseTime(cur, out, note, settings);

    /* --- date --- */
    parseDate(cur, out, note, now);

    /* --- location --- */
    var loc = cur.find(/\b(?:at|in)\s+(?:the\s+)?([A-Z][\w'&.-]*(?:\s+[A-Z][\w'&.-]*)*)/) ||
      cur.find(/\b(?:at|in)\s+(?:the\s+)?([a-z][\w'&.-]*(?:\s+[a-z][\w'&.-]*){0,2}\s+(?:center|centre|room|gym|library|office|hall|field|studio|park|cafe|clinic|school|building))\b/i);
    if (loc && !/^\d/.test(loc[1])) {
      cur.take(loc.index, loc.index + loc[0].length);
      out.location = loc[1].trim();
      note('Location', out.location, out.location);
    }

    /* --- participants --- */
    /* Read but do not consume: "Meeting with Sarah" is the title a person
       expects to see, even though Sarah is also recorded as a participant. */
    var withM = cur.find(/\bwith\s+([A-Z][a-z]+(?:\s+(?:and|,)\s*[A-Z][a-z]+)*)/);
    if (withM) {
      out.people = withM[1].split(/\s*(?:,|and)\s*/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (out.people.length) note('With', out.people.join(', '), out.people);
    }

    /* --- title --- */
    out.title = cleanTitle(cur.remaining());
    if (!out.title) out.title = cleanTitle(raw.replace(/#\S+/g, '')) || 'Untitled';
    // "Read 20 minutes" is the name of the thing, not "Read" with a duration
    // attached — put the length back when nothing else is left of the title.
    if (out.durationText && !out.durationExplicit && out.title.split(/\s+/).length < 2) {
      out.title = cleanTitle(out.title + ' ' + out.durationText);
    }

    /* --- category inference from the words that survived --- */
    out.categoryId = guessCategory(out.title, out.tags);

    /* --- decide the type --- */
    decideType(out, settings);

    /* --- build concrete date objects --- */
    materialize(out, now, settings);

    return out;
  }

  function parseRecurrence(cur, out, note) {
    var m;
    if ((m = cur.find(/\bevery\s+(?:other\s+)?(day|weekday|weekdays|weekend|week|month|year)\b/i))) {
      cur.take(m.index, m.index + m[0].length);
      var every = m[0].toLowerCase();
      var interval = /other/.test(every) ? 2 : 1;
      var unit = m[1].toLowerCase();
      if (unit === 'day') out.recurrence = { freq: 'daily', interval: interval };
      else if (unit === 'weekday' || unit === 'weekdays') out.recurrence = { freq: 'weekly', interval: interval, byDay: [1, 2, 3, 4, 5] };
      else if (unit === 'weekend') out.recurrence = { freq: 'weekly', interval: interval, byDay: [0, 6] };
      else if (unit === 'week') out.recurrence = { freq: 'weekly', interval: interval };
      else if (unit === 'month') out.recurrence = { freq: 'monthly', interval: interval };
      else out.recurrence = { freq: 'yearly', interval: interval };
      note('Repeats', R.describe(out.recurrence), out.recurrence);
      return;
    }
    if ((m = cur.find(/\bevery\s+(\d+)\s+(days?|weeks?|months?)\b/i))) {
      cur.take(m.index, m.index + m[0].length);
      var u = m[2].toLowerCase();
      out.recurrence = {
        freq: /^d/.test(u) ? 'daily' : /^w/.test(u) ? 'weekly' : 'monthly',
        interval: Math.max(1, +m[1])
      };
      note('Repeats', R.describe(out.recurrence), out.recurrence);
      return;
    }
    // "every mon and wed", "every tuesday"
    if ((m = cur.find(/\bevery\s+((?:mon|tues?|wed(?:nes)?|thur?s?|fri|sat(?:ur)?|sun)(?:day)?s?(?:\s*(?:,|and|&)\s*(?:mon|tues?|wed(?:nes)?|thur?s?|fri|sat(?:ur)?|sun)(?:day)?s?)*)\b/i))) {
      cur.take(m.index, m.index + m[0].length);
      var days = [];
      m[1].split(/\s*(?:,|and|&)\s*/).forEach(function (d) {
        var key = d.trim().toLowerCase();
        if (WEEKDAYS[key] !== undefined) days.push(WEEKDAYS[key]);
      });
      if (days.length) {
        out.recurrence = { freq: 'weekly', interval: 1, byDay: days };
        note('Repeats', R.describe(out.recurrence), out.recurrence);
      }
      return;
    }
    if ((m = cur.find(/\b(daily|weekly|biweekly|fortnightly|monthly|yearly|annually)\b/i))) {
      cur.take(m.index, m.index + m[0].length);
      var w = m[1].toLowerCase();
      out.recurrence = w === 'daily' ? { freq: 'daily', interval: 1 }
        : w === 'weekly' ? { freq: 'weekly', interval: 1 }
          : (w === 'biweekly' || w === 'fortnightly') ? { freq: 'weekly', interval: 2 }
            : w === 'monthly' ? { freq: 'monthly', interval: 1 }
              : { freq: 'yearly', interval: 1 };
      note('Repeats', R.describe(out.recurrence), out.recurrence);
      return;
    }
    if ((m = cur.find(/\bon\s+weekdays\b/i))) {
      cur.take(m.index, m.index + m[0].length);
      out.recurrence = { freq: 'weekly', interval: 1, byDay: [1, 2, 3, 4, 5] };
      note('Repeats', R.describe(out.recurrence), out.recurrence);
    }
  }

  function parseTime(cur, out, note, settings) {
    var m;
    // 4-6, 4–6pm, from 4 to 6, between 2 and 3:30
    var rangeRe = /\b(?:from\s+|between\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\s*(?:-|–|—|to|until|till|thru|through|and)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/i;
    m = cur.find(rangeRe);
    if (m && plausibleTime(m[1]) && plausibleTime(m[4])) {
      // "between 2 and 3" is a time range; "meet 5 and 6 people" is not — require
      // an explicit meridiem, a colon, or a from/between/dash form.
      var explicit = m[3] || m[6] || m[2] || m[5] || /^(?:from|between)/i.test(m[0]) || /[-–—]/.test(m[0]) || /\bto\b/i.test(m[0]);
      if (explicit) {
        cur.take(m.index, m.index + m[0].length);
        var s = hhmm(m[1], m[2], m[3]);
        var e = hhmm(m[4], m[5], m[6]);
        if (!m[3] && m[6]) s = inferMeridiem(+m[1], s, /p/i.test(m[6]) ? 'pm' : 'am');
        else if (!m[3] && !m[6]) s = inferMeridiem(+m[1], s);
        if (!m[6] && m[3]) e = inferMeridiem(+m[4], e, /p/i.test(m[3]) ? 'pm' : 'am');
        else if (!m[6] && !m[3]) e = inferMeridiem(+m[4], e);
        if (e <= s) e += 12 * 60;            // "4-6" where 6 landed in the morning
        if (e > 24 * 60) e = 24 * 60 - 1;
        out.startMinutes = s;
        out.endMinutes = e;
        out.durationMinutes = e - s;
        note('Time', fmtMin(s, settings) + ' – ' + fmtMin(e, settings), [s, e]);
        return;
      }
    }
    // at 3, @ 3:30pm, 3pm
    m = cur.find(/\b(?:at|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/i);
    if (m && plausibleTime(m[1])) {
      cur.take(m.index, m.index + m[0].length);
      // An explicit am/pm is already applied by hhmm; inferring on top of it
      // would shift "9pm" to 33:00.
      out.startMinutes = m[3] ? hhmm(m[1], m[2], m[3]) : inferMeridiem(+m[1], hhmm(m[1], m[2], null));
      note('Time', fmtMin(out.startMinutes, settings), out.startMinutes);
      return;
    }
    m = cur.find(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\b/i);
    if (m && plausibleTime(m[1])) {
      cur.take(m.index, m.index + m[0].length);
      out.startMinutes = hhmm(m[1], m[2], m[3]);
      note('Time', fmtMin(out.startMinutes, settings), out.startMinutes);
      return;
    }
    m = cur.find(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (m) {
      cur.take(m.index, m.index + m[0].length);
      out.startMinutes = hhmm(m[1], m[2], null);
      note('Time', fmtMin(out.startMinutes, settings), out.startMinutes);
      return;
    }
    m = cur.find(/\b(noon|midday|midnight|morning|afternoon|evening|tonight)\b/i);
    if (m) {
      var word = m[1].toLowerCase();
      var mins = word === 'tonight' ? NAMED_TIMES.evening : NAMED_TIMES[word];
      if (mins !== undefined) {
        // "tonight" also carries the day, so leave it for the date parser.
        if (word !== 'tonight') cur.take(m.index, m.index + m[0].length);
        out.startMinutes = mins;
        out.vagueTime = true;
        note('Time', fmtMin(mins, settings) + ' (' + word + ')', mins);
        return;
      }
    }
    // A meal word suggests a time but is almost always part of the title too
    // ("Lunch with Marcus"), so it is read without being consumed.
    m = cur.find(/\b(breakfast|lunch|dinner)\b/i);
    if (m) {
      out.startMinutes = NAMED_TIMES[m[1].toLowerCase()];
      out.vagueTime = true;
      note('Time', fmtMin(out.startMinutes, settings) + ' (around ' + m[1].toLowerCase() + ')', out.startMinutes);
    }
  }

  function plausibleTime(h) { return +h >= 0 && +h <= 24; }

  function fmtMin(mins, settings) {
    var d = new Date(2000, 0, 1, 0, 0, 0, 0);
    d.setMinutes(mins);
    return T.fmtTime(d, settings.use24Hour);
  }

  function parseDate(cur, out, note, now) {
    var m;
    if ((m = cur.find(/\b(today|tonight|tonite)\b/i))) {
      cur.take(m.index, m.index + m[0].length);
      out.dayWall = T.startOfDay(now);
      note('Date', 'Today', T.key(out.dayWall));
      return;
    }
    if ((m = cur.find(/\b(tomorrow|tmrw|tmr|tmw)\b/i))) {
      cur.take(m.index, m.index + m[0].length);
      out.dayWall = T.startOfDay(T.addDays(now, 1));
      note('Date', 'Tomorrow', T.key(out.dayWall));
      return;
    }
    if ((m = cur.find(/\byesterday\b/i))) {
      cur.take(m.index, m.index + m[0].length);
      out.dayWall = T.startOfDay(T.addDays(now, -1));
      note('Date', 'Yesterday', T.key(out.dayWall));
      return;
    }
    if ((m = cur.find(/\bday after tomorrow\b/i))) {
      cur.take(m.index, m.index + m[0].length);
      out.dayWall = T.startOfDay(T.addDays(now, 2));
      note('Date', T.fmtDate(out.dayWall), T.key(out.dayWall));
      return;
    }
    // next monday / this friday / on wednesday
    if ((m = cur.find(/\b(?:(next|this|coming|on)\s+)?(sunday|sun|monday|mon|tuesday|tues|tue|wednesday|weds|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat)\b/i))) {
      var qualifier = (m[1] || '').toLowerCase();
      var dayName = m[2].toLowerCase();
      var target = WEEKDAYS[dayName];
      if (target !== undefined) {
        cur.take(m.index, m.index + m[0].length);
        var d = T.startOfDay(now);
        if (qualifier === 'next') {
          out.dayWall = nextWeekDay(d, target);
        } else {
          var delta = (target - d.getDay() + 7) % 7;
          // A bare weekday name means the next one coming up, not today.
          if (delta === 0 && qualifier !== 'this') delta = 7;
          out.dayWall = T.addDays(d, delta);
        }
        note('Date', T.relativeDay(out.dayWall, now) + ' · ' + T.fmtDateShort(out.dayWall), T.key(out.dayWall));
        return;
      }
    }
    if ((m = cur.find(/\bnext\s+(week|month|year)\b/i))) {
      cur.take(m.index, m.index + m[0].length);
      var unit = m[1].toLowerCase();
      out.dayWall = unit === 'week' ? T.addDays(now, 7) : unit === 'month' ? T.addMonths(now, 1) : T.addYears(now, 1);
      out.dayWall = T.startOfDay(out.dayWall);
      out.vagueDate = true;
      note('Date', 'Next ' + unit + ' · ' + T.fmtDateShort(out.dayWall), T.key(out.dayWall));
      return;
    }
    if ((m = cur.find(/\bin\s+(\d+)\s+(days?|weeks?|months?)\b/i))) {
      cur.take(m.index, m.index + m[0].length);
      var n = +m[1], u = m[2].toLowerCase();
      out.dayWall = T.startOfDay(/^d/.test(u) ? T.addDays(now, n) : /^w/.test(u) ? T.addDays(now, n * 7) : T.addMonths(now, n));
      note('Date', T.fmtDate(out.dayWall), T.key(out.dayWall));
      return;
    }
    // ISO
    if ((m = cur.find(/\b(\d{4})-(\d{2})-(\d{2})\b/))) {
      cur.take(m.index, m.index + m[0].length);
      out.dayWall = new Date(+m[1], +m[2] - 1, +m[3]);
      note('Date', T.fmtDate(out.dayWall), T.key(out.dayWall));
      return;
    }
    // Month name + day  /  day + month name
    var monthNames = Object.keys(MONTHS).join('|');
    if ((m = cur.find(new RegExp('\\b(' + monthNames + ')\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?\\b', 'i')))) {
      cur.take(m.index, m.index + m[0].length);
      out.dayWall = resolveMonthDay(MONTHS[m[1].toLowerCase()], +m[2], m[3] ? +m[3] : null, now);
      note('Date', T.fmtDate(out.dayWall), T.key(out.dayWall));
      return;
    }
    if ((m = cur.find(new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(' + monthNames + ')\\.?(?:,?\\s*(\\d{4}))?\\b', 'i')))) {
      cur.take(m.index, m.index + m[0].length);
      out.dayWall = resolveMonthDay(MONTHS[m[2].toLowerCase()], +m[1], m[3] ? +m[3] : null, now);
      note('Date', T.fmtDate(out.dayWall), T.key(out.dayWall));
      return;
    }
    // 10/18 or 10/18/2026
    if ((m = cur.find(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
      cur.take(m.index, m.index + m[0].length);
      var yr = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : null;
      out.dayWall = resolveMonthDay(+m[1] - 1, +m[2], yr, now);
      note('Date', T.fmtDate(out.dayWall), T.key(out.dayWall));
      return;
    }
    // "the 15th"
    if ((m = cur.find(/\bthe\s+(\d{1,2})(?:st|nd|rd|th)\b/i))) {
      cur.take(m.index, m.index + m[0].length);
      var day = +m[1];
      var candidate = new Date(now.getFullYear(), now.getMonth(), Math.min(day, T.daysInMonth(now.getFullYear(), now.getMonth())));
      if (candidate < T.startOfDay(now)) candidate = T.addMonths(candidate, 1);
      out.dayWall = T.startOfDay(candidate);
      note('Date', T.fmtDate(out.dayWall), T.key(out.dayWall));
    }
  }

  /* "next Monday" = the Monday of the following calendar week. */
  function nextWeekDay(from, targetDow) {
    var startNextWeek = T.addDays(T.startOfWeek(from, 0), 7);
    return T.addDays(startNextWeek, targetDow);
  }

  function resolveMonthDay(monthIdx, day, year, now) {
    if (monthIdx < 0 || monthIdx > 11) monthIdx = now.getMonth();
    var y = year || now.getFullYear();
    var d = new Date(y, monthIdx, Math.min(day, T.daysInMonth(y, monthIdx)));
    // Bare "Oct 18" in December means next year.
    if (!year && d < T.startOfDay(T.addDays(now, -1))) d = new Date(y + 1, monthIdx, Math.min(day, T.daysInMonth(y + 1, monthIdx)));
    return T.startOfDay(d);
  }

  function matchProject(name) {
    var lower = String(name).toLowerCase().trim();
    var list = S.all('projects');
    for (var i = 0; i < list.length; i++) {
      if (list[i].name.toLowerCase() === lower) return list[i];
    }
    for (var j = 0; j < list.length; j++) {
      if (list[j].name.toLowerCase().indexOf(lower) >= 0 || lower.indexOf(list[j].name.toLowerCase()) >= 0) return list[j];
    }
    return null;
  }

  function findKnownProject(raw, cur) {
    var lower = raw.toLowerCase();
    var best = null, bestIdx = -1;
    S.all('projects').forEach(function (p) {
      var n = p.name.toLowerCase();
      if (n.length < 4) return;
      var idx = lower.indexOf(n);
      if (idx >= 0 && cur.free(idx, idx + n.length) && (!best || n.length > best.name.length)) {
        best = p; bestIdx = idx;
      }
    });
    // The project name usually *is* part of the title, so don't consume it.
    return best;
  }

  var CATEGORY_HINTS = [
    { re: /\b(class|lecture|school|homeroom|seminar|period)\b/i, cat: 'cat_school' },
    { re: /\b(homework|essay|assignment|worksheet|problem set|pset)\b/i, cat: 'cat_homework' },
    { re: /\b(study|studying|review|revise|exam|test|quiz|midterm|final)\b/i, cat: 'cat_study' },
    { re: /\b(gym|run|running|workout|exercise|soccer|basketball|swim|practice drills|training)\b/i, cat: 'cat_exercise' },
    { re: /\b(piano|guitar|violin|rehearsal|practice|band|choir)\b/i, cat: 'cat_practice' },
    { re: /\b(draw|design|write|writing|paint|compose|edit video|creative)\b/i, cat: 'cat_creative' },
    { re: /\b(family|mom|dad|grandma|grandpa|sister|brother|dinner with)\b/i, cat: 'cat_family' },
    { re: /\b(doctor|dentist|appointment|therapy|checkup|clinic)\b/i, cat: 'cat_health' },
    { re: /\b(relax|rest|break|nap|chill|unwind)\b/i, cat: 'cat_relax' },
    { re: /\b(drive|flight|train|commute|travel|leave for)\b/i, cat: 'cat_travel' }
  ];

  function guessCategory(title, tags) {
    var hay = (title + ' ' + (tags || []).join(' ')).toLowerCase();
    for (var i = 0; i < CATEGORY_HINTS.length; i++) {
      if (CATEGORY_HINTS[i].re.test(hay) && S.get('categories', CATEGORY_HINTS[i].cat)) {
        return CATEGORY_HINTS[i].cat;
      }
    }
    return null;
  }

  var EXAM_WORDS = /\b(test|exam|quiz|midterm|finals?|presentation due|assignment)\b/i;
  var PROJECT_WORDS = /\b(project|portfolio|thesis|dissertation|campaign)\b/i;

  function decideType(out, settings) {
    if (out.type) return;

    // "Math test Friday" is a point in time you must be ready for, not a to-do.
    if (out.dayWall && out.endMinutes === null && EXAM_WORDS.test(out.title) && !/\bstudy|revise|prepare|practice\b/i.test(out.input)) {
      out.type = 'deadline'; return;
    }
    // "Science project due next month" describes a body of work, not one task.
    if (PROJECT_WORDS.test(out.title) && !/\b(finish|submit|hand in|turn in|email|print|buy)\b/i.test(out.input) &&
      (out.vagueDate || (out.dayWall && T.diffDays(T.nowWall(), out.dayWall) > 21))) {
      out.type = 'project'; return;
    }
    if (out.isDeadline && out.startMinutes === null) { out.type = 'deadline'; return; }
    if (out.isDeadline && out.startMinutes !== null && out.endMinutes === null) { out.type = 'deadline'; return; }
    if (out.recurrence && out.endMinutes === null && HABIT_VERBS.test(out.input) && (out.durationMinutes || 0) <= 60) {
      out.type = 'habit'; return;
    }
    if (out.recurrence) { out.type = 'event'; return; }
    if (out.isReminder) { out.type = 'task'; return; }
    if (out.endMinutes !== null) { out.type = 'event'; return; }
    if (out.startMinutes !== null && !out.vagueTime) { out.type = 'event'; return; }
    if (out.dayWall && !out.durationMinutes && /\b(meeting|appointment|class|lunch|dinner|party|concert|game|interview|call)\b/i.test(out.input)) {
      out.type = 'event'; return;
    }
    out.type = 'task';
  }

  /* Turn the parsed fragments into real instants plus a payload per type. */
  function materialize(out, now, settings) {
    var day = out.dayWall;
    var defaultDur = settings.defaultEventDuration || 60;

    if (out.type === 'event' || out.type === 'habit') {
      if (!day) {
        day = T.startOfDay(now);
        // A time already gone today naturally means tomorrow.
        if (out.startMinutes !== null && out.startMinutes < T.minutesOfDay(now)) day = T.addDays(day, 1);
        // "every Mon and Wed" should start on the next Monday or Wednesday,
        // not on whatever day it happens to be typed.
        if (out.recurrence && out.recurrence.byDay && out.recurrence.byDay.length) {
          for (var i = 0; i < 7; i++) {
            var candidate = T.addDays(day, i);
            if (out.recurrence.byDay.indexOf(candidate.getDay()) >= 0) { day = candidate; break; }
          }
        }
        out.inferredDate = true;
      }
      var startMin = out.startMinutes;
      if (startMin === null) {
        // A habit without a time is simply untimed, not an all-day event.
        out.allDay = out.type === 'event';
        startMin = settings.workingHours.start;
      }
      var start = T.atMinutes(day, startMin);
      var dur = out.durationMinutes || defaultDur;
      var end = out.endMinutes !== null ? T.atMinutes(day, out.endMinutes) : T.addMinutes(start, dur);
      out.startWall = start;
      out.endWall = end;
      out.durationMinutes = T.diffMinutes(start, end);
    } else if (out.type === 'deadline') {
      if (!day) { day = T.startOfDay(now); out.inferredDate = true; }
      var dueMin = out.startMinutes !== null ? out.startMinutes : 23 * 60 + 59;
      out.dueWall = T.atMinutes(day, dueMin);
      out.hasDueTime = out.startMinutes !== null;
    } else if (out.type === 'task') {
      if (day) {
        var tm = out.startMinutes !== null ? out.startMinutes : 23 * 60 + 59;
        out.dueWall = T.atMinutes(day, tm);
        out.hasDueTime = out.startMinutes !== null;
      }
      out.estimate = out.durationMinutes || null;
    } else if (day) {
      // Projects, goals and notes keep a target date when one was written.
      out.dueWall = T.atMinutes(day, 23 * 60 + 59);
    }
  }

  /* ---------------- payload builders ---------------- */

  function toPayload(p) {
    switch (p.type) {
      case 'event':
        return {
          title: p.title,
          start: T.iso(p.startWall),
          end: T.iso(p.endWall),
          allDay: !!p.allDay,
          recurrence: p.recurrence,
          categoryId: p.categoryId,
          projectId: p.projectId,
          goalId: p.goalId,
          tags: p.tags,
          location: p.location,
          priority: p.priority,
          participants: (p.people || []).map(function (n) { return { name: n, rsvp: 'none' }; })
        };
      case 'task':
        return {
          title: p.title,
          due: p.dueWall ? T.iso(p.dueWall) : null,
          hasDueTime: !!p.hasDueTime,
          estimate: p.estimate || null,
          priority: p.priority || 'medium',
          categoryId: p.categoryId,
          projectId: p.projectId,
          goalId: p.goalId,
          tags: p.tags,
          recurrence: p.recurrence,
          status: 'inbox'
        };
      case 'deadline':
        return {
          title: p.title,
          due: T.iso(p.dueWall),
          hasDueTime: !!p.hasDueTime,
          type: guessDeadlineKind(p.title),
          projectId: p.projectId,
          goalId: p.goalId,
          tags: p.tags
        };
      case 'habit':
        return {
          name: p.title,
          schedule: recurrenceToSchedule(p.recurrence),
          time: p.startMinutes,
          duration: p.durationMinutes || 20,
          categoryId: p.categoryId,
          goalId: p.goalId
        };
      case 'note':
        return { title: p.title, body: p.body || '', type: 'note', tags: p.tags, projectId: p.projectId };
      case 'project':
        return { name: p.title, due: p.dueWall ? T.iso(p.dueWall) : null, tags: p.tags };
      case 'goal':
        return { name: p.title, due: p.dueWall ? T.iso(p.dueWall) : null, tags: p.tags };
      default:
        return { title: p.title };
    }
  }

  function guessDeadlineKind(title) {
    var t = String(title).toLowerCase();
    if (/\b(test|exam|quiz|midterm|final)\b/.test(t)) return 'exam';
    if (/\b(essay|homework|assignment|problem set|lab report|worksheet)\b/.test(t)) return 'assignment';
    if (/\b(application|apply|admission|scholarship|form)\b/.test(t)) return 'application';
    if (/\b(project|presentation|portfolio)\b/.test(t)) return 'project';
    return 'other';
  }

  function recurrenceToSchedule(rec) {
    if (!rec) return { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] };
    if (rec.freq === 'daily') return { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] };
    if (rec.freq === 'weekly' && rec.byDay) {
      var wd = rec.byDay.slice().sort().join(',');
      if (wd === '1,2,3,4,5') return { type: 'weekdays', days: [1, 2, 3, 4, 5] };
      return { type: 'weekly', days: rec.byDay };
    }
    return { type: 'times-per-week', timesPerWeek: 3, days: [] };
  }

  /* ---------------- brain dump splitting ---------------- */

  /* Break a messy paragraph into candidate items without shredding phrases that
     legitimately contain commas or "and". */
  function split(text) {
    var GUARD = '\u0001';
    var lines = String(text).split(/\n+/);
    var pieces = [];
    lines.forEach(function (line) {
      line = line.replace(/^\s*(?:[-*\u2022\u00b7\u2013\u2014]|\d+[.)])\s*/, '').trim();
      if (!line) return;
      // "4 and 5" or "Mon and Wed" is one value, not two items. Hide those
      // conjunctions from the splitter, then put them back afterwards.
      var guarded = line
        .replace(/(\d)\s+and\s+(?=\d)/gi, '$1' + GUARD)
        .replace(/\b((?:mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun)(?:day)?)\s+and\s+(?=(?:mon|tue|wed|thu|fri|sat|sun))/gi, '$1' + GUARD);
      var chunks = guarded.split(/\s*(?:;|,\s*(?=\S)|\s+and\s+|\s+then\s+|\s+also\s+|\s+plus\s+)\s*/i);
      chunks.forEach(function (c) {
        c = c.split(GUARD).join(' and ').trim();
        // Fragments of two characters or fewer are noise, not items.
        if (c.length < 3) return;
        pieces.push(c);
      });
    });
    // Re-attach an orphan fragment that clearly continues the previous item,
    // e.g. "meeting with Sarah" + "at 4" arriving as two chunks.
    var merged = [];
    pieces.forEach(function (p) {
      if (merged.length && /^(?:at|on|by|before|from|for|due|in)\b/i.test(p) && p.split(/\s+/).length <= 4) {
        merged[merged.length - 1] += ' ' + p;
      } else merged.push(p);
    });
    return merged;
  }

  function organize(text, opts) {
    return split(text).map(function (piece) {
      var parsed = parse(piece, opts);
      return { parsed: parsed, type: parsed.type, payload: toPayload(parsed), source: piece };
    });
  }

  global.NLP = {
    parse: parse, toPayload: toPayload, organize: organize, split: split,
    cleanTitle: cleanTitle, guessCategory: guessCategory, guessDeadlineKind: guessDeadlineKind
  };
})(window);
