/* Cadence — time utilities.
   The app stores every instant as an ISO string in UTC. Everything the user
   sees is "wall time" in the display timezone. T.w(iso) converts an instant to
   a Date whose *local* getters read as wall time; T.u(wallDate) converts back. */
(function (global) {
  'use strict';

  var DISPLAY_TZ = null; // null = use the browser's own zone (the fast path)

  var MIN = 60000, HOUR = 3600000, DAY = 86400000;

  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAY_MIN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  var MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var offsetCache = Object.create(null);

  /* Minutes east of UTC for `tz` at instant `date`. */
  function zoneOffset(date, tz) {
    var bucket = Math.floor(date.getTime() / HOUR);
    var key = tz + '|' + bucket;
    if (offsetCache[key] !== undefined) return offsetCache[key];
    var parts;
    try {
      parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).formatToParts(date);
    } catch (e) {
      offsetCache[key] = -date.getTimezoneOffset();
      return offsetCache[key];
    }
    var p = {};
    for (var i = 0; i < parts.length; i++) p[parts[i].type] = parts[i].value;
    var hour = p.hour === '24' ? 0 : +p.hour;
    var asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, hour, +p.minute, +p.second);
    var value = Math.round((asUTC - date.getTime()) / MIN);
    offsetCache[key] = value;
    return value;
  }

  function setZone(tz) {
    DISPLAY_TZ = (!tz || tz === 'local' || tz === localZone()) ? null : tz;
  }
  function zone() { return DISPLAY_TZ || localZone(); }
  function localZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
    catch (e) { return 'UTC'; }
  }

  /* instant -> wall-clock Date in the display zone */
  function w(input) {
    var d = toDate(input);
    if (!DISPLAY_TZ) return d;
    var shift = zoneOffset(d, DISPLAY_TZ) + d.getTimezoneOffset();
    return new Date(d.getTime() + shift * MIN);
  }

  /* wall-clock Date in the display zone -> real instant */
  function u(wall) {
    var d = toDate(wall);
    if (!DISPLAY_TZ) return d;
    var guessShift = zoneOffset(d, DISPLAY_TZ) + d.getTimezoneOffset();
    var guess = new Date(d.getTime() - guessShift * MIN);
    var realShift = zoneOffset(guess, DISPLAY_TZ) + d.getTimezoneOffset();
    if (realShift !== guessShift) guess = new Date(d.getTime() - realShift * MIN);
    return guess;
  }

  function iso(wall) { return u(wall).toISOString(); }

  function toDate(v) {
    if (v instanceof Date) return v;
    if (typeof v === 'number') return new Date(v);
    if (typeof v === 'string') {
      var d = new Date(v);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date(NaN);
  }

  function valid(d) { return d instanceof Date && !isNaN(d.getTime()); }

  /* ---- wall-time arithmetic (operates on wall Dates) ---- */
  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function endOfDay(d) { var x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function addMinutes(d, n) { return new Date(d.getTime() + n * MIN); }
  function addMonths(d, n) {
    var x = new Date(d), day = x.getDate();
    x.setDate(1); x.setMonth(x.getMonth() + n);
    x.setDate(Math.min(day, daysInMonth(x.getFullYear(), x.getMonth())));
    return x;
  }
  function addYears(d, n) { var x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; }
  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

  function startOfWeek(d, firstDay) {
    firstDay = firstDay || 0;
    var x = startOfDay(d);
    var diff = (x.getDay() - firstDay + 7) % 7;
    return addDays(x, -diff);
  }
  function endOfWeek(d, firstDay) { return endOfDay(addDays(startOfWeek(d, firstDay), 6)); }
  function startOfMonth(d) { var x = startOfDay(d); x.setDate(1); return x; }
  function endOfMonth(d) { var x = startOfMonth(d); return endOfDay(addDays(addMonths(x, 1), -1)); }
  function startOfYear(d) { var x = startOfDay(d); x.setMonth(0, 1); return x; }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function sameMonth(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }

  /* A stable YYYY-MM-DD key built from wall-clock fields (never UTC-shifted). */
  function key(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function fromKey(k) {
    var p = String(k).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2], 0, 0, 0, 0);
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function minutesOfDay(d) { return d.getHours() * 60 + d.getMinutes(); }
  function atMinutes(day, mins) {
    var x = startOfDay(day);
    x.setMinutes(mins);
    return x;
  }
  function diffMinutes(a, b) { return Math.round((b.getTime() - a.getTime()) / MIN); }
  function diffDays(a, b) { return Math.round((startOfDay(b) - startOfDay(a)) / DAY); }

  /* ISO-8601 week number */
  function weekNumber(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7));
    var week1 = new Date(x.getFullYear(), 0, 4);
    return 1 + Math.round(((x - week1) / DAY - 3 + ((week1.getDay() + 6) % 7)) / 7);
  }

  /* ---- formatting ---- */
  function fmtTime(d, use24) {
    var h = d.getHours(), m = d.getMinutes();
    if (use24) return pad(h) + ':' + pad(m);
    var suffix = h < 12 ? 'AM' : 'PM';
    var hh = h % 12; if (hh === 0) hh = 12;
    return hh + (m ? ':' + pad(m) : '') + ' ' + suffix;
  }
  function fmtTimeFull(d, use24) {
    if (use24) return pad(d.getHours()) + ':' + pad(d.getMinutes());
    var h = d.getHours() % 12; if (h === 0) h = 12;
    return h + ':' + pad(d.getMinutes()) + ' ' + (d.getHours() < 12 ? 'AM' : 'PM');
  }
  function fmtHourLabel(hour, use24) {
    if (use24) return pad(hour) + ':00';
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return (hour % 12) + (hour < 12 ? ' AM' : ' PM');
  }
  function fmtDate(d) { return DAY_SHORT[d.getDay()] + ', ' + MONTH_SHORT[d.getMonth()] + ' ' + d.getDate(); }
  function fmtDateLong(d) {
    return DAY_NAMES[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }
  function fmtDateShort(d) { return MONTH_SHORT[d.getMonth()] + ' ' + d.getDate(); }
  function fmtMonthYear(d) { return MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function fmtInputDate(d) { return key(d); }
  function fmtInputTime(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  function fmtRange(a, b, use24) {
    if (sameDay(a, b)) return fmtTime(a, use24) + ' – ' + fmtTime(b, use24);
    return fmtDateShort(a) + ' ' + fmtTime(a, use24) + ' – ' + fmtDateShort(b) + ' ' + fmtTime(b, use24);
  }

  function humanDuration(mins) {
    mins = Math.max(0, Math.round(mins));
    if (mins < 60) return mins + ' min';
    var h = Math.floor(mins / 60), m = mins % 60;
    if (!m) return h + (h === 1 ? ' hr' : ' hrs');
    return h + 'h ' + m + 'm';
  }

  /* Human day reference relative to `now` ("Today", "Tomorrow", "Mon 4"...). */
  function relativeDay(d, now) {
    now = now || nowWall();
    var delta = diffDays(now, d);
    if (delta === 0) return 'Today';
    if (delta === 1) return 'Tomorrow';
    if (delta === -1) return 'Yesterday';
    if (delta > 1 && delta < 7) return DAY_NAMES[d.getDay()];
    if (delta < -1 && delta > -7) return 'Last ' + DAY_NAMES[d.getDay()];
    return fmtDateShort(d) + (d.getFullYear() !== now.getFullYear() ? ', ' + d.getFullYear() : '');
  }

  /* "in 3 days" / "2 hours ago" — used for deadline countdowns. */
  function relativeTime(target, now) {
    now = now || nowWall();
    var mins = diffMinutes(now, target);
    var past = mins < 0;
    var abs = Math.abs(mins);
    var text;
    if (abs < 1) text = 'now';
    else if (abs < 60) text = abs + ' min';
    else if (abs < 60 * 24) {
      var h = Math.round(abs / 60);
      text = h + (h === 1 ? ' hour' : ' hours');
    } else {
      var dd = Math.abs(diffDays(now, target));
      if (dd === 0) dd = 1;
      if (dd < 31) text = dd + (dd === 1 ? ' day' : ' days');
      else {
        var mo = Math.round(dd / 30);
        text = mo + (mo === 1 ? ' month' : ' months');
      }
    }
    if (text === 'now') return 'now';
    return past ? text + ' ago' : 'in ' + text;
  }

  function nowWall() { return w(new Date()); }

  /* Snap a wall Date to the nearest `step` minutes. */
  function snap(d, step) {
    step = step || 15;
    var x = new Date(d);
    x.setSeconds(0, 0);
    x.setMinutes(Math.round(x.getMinutes() / step) * step);
    return x;
  }
  function snapDown(d, step) {
    step = step || 15;
    var x = new Date(d);
    x.setSeconds(0, 0);
    x.setMinutes(Math.floor(x.getMinutes() / step) * step);
    return x;
  }

  function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;
  }

  function clamp(d, lo, hi) {
    if (d < lo) return new Date(lo);
    if (d > hi) return new Date(hi);
    return d;
  }

  function commonZones() {
    return ['America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York',
      'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
      'Africa/Lagos', 'Africa/Johannesburg', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok',
      'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul', 'Australia/Sydney', 'Pacific/Auckland', 'UTC'];
  }

  global.T = {
    MIN: MIN, HOUR: HOUR, DAY: DAY,
    DAY_NAMES: DAY_NAMES, DAY_SHORT: DAY_SHORT, DAY_MIN: DAY_MIN,
    MONTHS: MONTHS, MONTH_SHORT: MONTH_SHORT,
    setZone: setZone, zone: zone, localZone: localZone, zoneOffset: zoneOffset, commonZones: commonZones,
    w: w, u: u, iso: iso, toDate: toDate, valid: valid, nowWall: nowWall,
    startOfDay: startOfDay, endOfDay: endOfDay, addDays: addDays, addMinutes: addMinutes,
    addMonths: addMonths, addYears: addYears, daysInMonth: daysInMonth,
    startOfWeek: startOfWeek, endOfWeek: endOfWeek, startOfMonth: startOfMonth,
    endOfMonth: endOfMonth, startOfYear: startOfYear,
    sameDay: sameDay, sameMonth: sameMonth, key: key, fromKey: fromKey, pad: pad,
    minutesOfDay: minutesOfDay, atMinutes: atMinutes, diffMinutes: diffMinutes, diffDays: diffDays,
    weekNumber: weekNumber,
    fmtTime: fmtTime, fmtTimeFull: fmtTimeFull, fmtHourLabel: fmtHourLabel,
    fmtDate: fmtDate, fmtDateLong: fmtDateLong, fmtDateShort: fmtDateShort,
    fmtMonthYear: fmtMonthYear, fmtInputDate: fmtInputDate, fmtInputTime: fmtInputTime,
    fmtRange: fmtRange, humanDuration: humanDuration,
    relativeDay: relativeDay, relativeTime: relativeTime,
    snap: snap, snapDown: snapDown, overlaps: overlaps, clamp: clamp
  };
})(window);
