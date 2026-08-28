/* Cadence — the calendar. Day, 3-day, week, work week, month, year, agenda and
   timeline, sharing one toolbar, one colour system and one set of interactions:
   click a slot to create, drag to move, drag an edge to resize. */
(function (global) {
  'use strict';
  var Views = global.Views = global.Views || {};

  var VIEWS = [
    { id: 'day', label: 'Day', short: 'D', shortcut: '1' },
    { id: '3day', label: '3 days', short: '3', shortcut: '2' },
    { id: 'week', label: 'Week', short: 'W', shortcut: '3' },
    { id: 'workweek', label: 'Work week', short: 'WW', shortcut: '4' },
    { id: 'month', label: 'Month', short: 'M', shortcut: '5' },
    { id: 'year', label: 'Year', short: 'Y', shortcut: '6' },
    { id: 'agenda', label: 'Agenda', short: 'A', shortcut: '7' },
    { id: 'timeline', label: 'Timeline', short: 'T', shortcut: '8' }
  ];

  var state = {
    anchor: null,      // wall Date the view is centred on
    view: null,
    selectedId: null
  };

  function settings() { return S.settings(); }
  function use24() { return settings().use24Hour; }
  function hourHeight() { return settings().density === 'compact' ? 44 : 56; }
  function dayStart() { return settings().dayStartHour * 60; }
  function dayEnd() { return Math.min(24 * 60, settings().dayEndHour * 60 + 60); }

  function ensureState(params) {
    if (!state.anchor) state.anchor = T.startOfDay(T.nowWall());
    if (!state.view) state.view = settings().lastView || settings().defaultView || 'week';
    if (params && params.date) state.anchor = T.fromKey(params.date);
    if (params && params.view) state.view = params.view;
    if (VIEWS.filter(function (v) { return v.id === state.view; }).length === 0) state.view = 'week';
  }

  /* Which days does the current view show? */
  function visibleDays() {
    var s = settings();
    var a = T.startOfDay(state.anchor);
    switch (state.view) {
      case 'day': return [a];
      case '3day': return [0, 1, 2].map(function (i) { return T.addDays(a, i); });
      case 'workweek': {
        var start = T.startOfWeek(a, 1);
        return (s.workingDays.length ? s.workingDays : [1, 2, 3, 4, 5]).slice().sort()
          .map(function (d) { return T.addDays(T.startOfWeek(a, 0), d); });
      }
      case 'week': {
        var w = T.startOfWeek(a, s.firstDayOfWeek);
        var days = [];
        for (var i = 0; i < 7; i++) {
          var d = T.addDays(w, i);
          if (!s.showWeekends && (d.getDay() === 0 || d.getDay() === 6)) continue;
          days.push(d);
        }
        return days;
      }
      default: return [a];
    }
  }

  function rangeOf() {
    var s = settings();
    switch (state.view) {
      case 'month': return { start: T.startOfWeek(T.startOfMonth(state.anchor), s.firstDayOfWeek), end: T.endOfWeek(T.endOfMonth(state.anchor), s.firstDayOfWeek) };
      case 'year': return { start: T.startOfYear(state.anchor), end: T.endOfDay(new Date(state.anchor.getFullYear(), 11, 31)) };
      case 'agenda': return { start: T.startOfDay(state.anchor), end: T.endOfDay(T.addDays(state.anchor, 30)) };
      case 'timeline': return { start: T.startOfWeek(state.anchor, s.firstDayOfWeek), end: T.endOfWeek(T.addDays(state.anchor, 21), s.firstDayOfWeek) };
      default: {
        var days = visibleDays();
        return { start: T.startOfDay(days[0]), end: T.endOfDay(days[days.length - 1]) };
      }
    }
  }

  function title() {
    var s = settings();
    switch (state.view) {
      case 'day': return T.fmtDateLong(state.anchor);
      case 'year': return String(state.anchor.getFullYear());
      case 'month': return T.fmtMonthYear(state.anchor);
      case 'agenda': return 'From ' + T.fmtDateShort(state.anchor);
      default: {
        var days = visibleDays();
        var a = days[0], b = days[days.length - 1];
        if (state.view === 'timeline') { var r = rangeOf(); a = r.start; b = r.end; }
        if (a.getMonth() === b.getMonth()) return T.MONTHS[a.getMonth()] + ' ' + a.getDate() + ' – ' + b.getDate() + ', ' + a.getFullYear();
        return T.MONTH_SHORT[a.getMonth()] + ' ' + a.getDate() + ' – ' + T.MONTH_SHORT[b.getMonth()] + ' ' + b.getDate() + ', ' + b.getFullYear();
      }
    }
  }

  function step(dir) {
    switch (state.view) {
      case 'day': state.anchor = T.addDays(state.anchor, dir); break;
      case '3day': state.anchor = T.addDays(state.anchor, 3 * dir); break;
      case 'week': case 'workweek': state.anchor = T.addDays(state.anchor, 7 * dir); break;
      case 'month': state.anchor = T.addMonths(state.anchor, dir); break;
      case 'year': state.anchor = T.addYears(state.anchor, dir); break;
      case 'agenda': state.anchor = T.addDays(state.anchor, 14 * dir); break;
      case 'timeline': state.anchor = T.addDays(state.anchor, 21 * dir); break;
    }
    rerender();
  }

  var root = null;
  function rerender() { if (root) render(root); }

  /* ------------------------------------------------------------- toolbar */

  function toolbar() {
    var bar = D.h('div.cal__toolbar');

    var nav = D.h('div.cal__nav', [
      D.h('button.btn.btn--ghost.btn--sm.cal__today', {
        type: 'button', onclick: function () { state.anchor = T.startOfDay(T.nowWall()); rerender(); },
        title: 'Go to today (D)'
      }, 'Today'),
      D.iconButton('chevronLeft', 'Previous', function () { step(-1); }, { shortcut: '←' }),
      D.iconButton('chevronRight', 'Next', function () { step(1); }, { shortcut: '→' })
    ]);

    var heading = D.h('h1.cal__title', { text: title(), tabindex: '-1' });
    if (settings().showWeekNumbers && ['week', 'workweek', 'day', '3day'].indexOf(state.view) >= 0) {
      heading.appendChild(D.h('span.cal__week-no', { text: 'Week ' + T.weekNumber(visibleDays()[0]) }));
    }

    var switcher = D.h('div.segmented.cal__views', { role: 'radiogroup', 'aria-label': 'Calendar view' });
    VIEWS.forEach(function (v) {
      switcher.appendChild(D.h('button.segmented__btn', {
        type: 'button', role: 'radio',
        'aria-checked': state.view === v.id ? 'true' : 'false',
        title: v.label + ' (' + v.shortcut + ')',
        onclick: function () {
          state.view = v.id;
          S.setPref('lastView', v.id);
          rerender();
        }
      }, [D.h('span.seg-full', { text: v.label }), D.h('span.seg-short', { text: v.short })]));
    });

    bar.appendChild(D.h('div.cal__toolbar-left', [nav, heading]));
    bar.appendChild(D.h('div.cal__toolbar-right', [
      switcher,
      D.iconButton('filter', 'Layers and filters', function (e) { layerMenu(e.currentTarget); })
    ]));
    return bar;
  }

  function layerMenu(anchor) {
    var items = [{ heading: 'Calendars' }];
    S.all('calendars').forEach(function (c) {
      items.push({
        label: c.name, checked: c.visible !== false,
        onClick: function () { A.toggleCalendar(c.id); }
      });
    });
    items.push({ separator: true }, { heading: 'Layers' });
    M.LAYERS.forEach(function (l) {
      items.push({
        label: l.label, checked: Q.layerOn(l.id),
        onClick: function () { A.toggleLayer(l.id); }
      });
    });
    items.push({ separator: true }, {
      label: settings().showWeekNumbers ? 'Hide week numbers' : 'Show week numbers',
      icon: 'calendar',
      onClick: function () { S.setSetting('showWeekNumbers', !settings().showWeekNumbers); }
    });
    UI.menu(anchor, items, { align: 'right' });
  }

  /* ---------------------------------------------------------- time grid */

  function renderTimeGrid(days) {
    var s = settings();
    var hh = hourHeight();
    var startMin = dayStart(), endMin = dayEnd();
    var totalMin = endMin - startMin;
    var now = T.nowWall();

    var wrap = D.h('div.tg');

    /* --- day headers --- */
    var header = D.h('div.tg__header');
    header.appendChild(D.h('div.tg__gutter-head', s.showWeekNumbers
      ? D.h('span.tg__weekno', { text: 'W' + T.weekNumber(days[0]) }) : null));
    var headCols = D.h('div.tg__head-cols');
    days.forEach(function (day) {
      var isToday = T.sameDay(day, now);
      var col = D.h('button.tg__head-col' + (isToday ? '.is-today' : ''), {
        type: 'button',
        title: 'Show ' + T.fmtDateLong(day),
        onclick: function () { state.anchor = day; state.view = 'day'; S.setPref('lastView', 'day'); rerender(); }
      }, [
        D.h('span.tg__head-dow', { text: T.DAY_SHORT[day.getDay()] }),
        D.h('span.tg__head-num', { text: String(day.getDate()) })
      ]);
      headCols.appendChild(col);
    });
    header.appendChild(headCols);
    wrap.appendChild(header);

    /* --- all-day / deadlines row --- */
    var allDayRow = buildAllDayRow(days);
    wrap.appendChild(allDayRow);

    /* --- scrolling grid --- */
    var scroll = D.h('div.tg__scroll');
    var grid = D.h('div.tg__grid', { style: { height: (totalMin / 60 * hh) + 'px' } });

    var times = D.h('div.tg__times', { 'aria-hidden': 'true' });
    for (var m = startMin; m < endMin; m += 60) {
      times.appendChild(D.h('div.tg__time', {
        style: { height: hh + 'px' }
      }, D.h('span', { text: T.fmtHourLabel(Math.floor(m / 60) % 24, use24()) })));
    }
    grid.appendChild(times);

    var cols = D.h('div.tg__cols');
    grid.appendChild(cols);

    days.forEach(function (day, dayIndex) {
      cols.appendChild(buildDayColumn(day, dayIndex, days));
    });

    scroll.appendChild(grid);
    wrap.appendChild(scroll);

    // Open on the working day rather than at midnight.
    requestAnimationFrame(function () {
      var target = Math.max(0, ((s.workingHours.start - startMin) / 60) * hh - 20);
      var todayIdx = days.map(function (d) { return T.sameDay(d, now); }).indexOf(true);
      if (todayIdx >= 0) {
        var nowMin = T.minutesOfDay(now);
        if (nowMin > startMin && nowMin < endMin) target = Math.max(0, ((nowMin - startMin) / 60) * hh - scroll.clientHeight / 3);
      }
      scroll.scrollTop = target;
    });

    return wrap;
  }

  function buildAllDayRow(days) {
    var row = D.h('div.tg__allday');
    row.appendChild(D.h('div.tg__gutter-allday', D.h('span', { text: 'All day' })));
    var grid = D.h('div.tg__allday-grid', {
      style: { gridTemplateColumns: 'repeat(' + days.length + ', minmax(0,1fr))' }
    });

    var rangeStart = T.startOfDay(days[0]);
    var rangeEnd = T.endOfDay(days[days.length - 1]);
    var events = Q.eventsInRange(rangeStart, rangeEnd).filter(function (e) {
      return e.allDay || Q.isMultiDay(e);
    });

    var used = [];
    events.forEach(function (ev) {
      var startIdx = indexOfDay(days, ev.startWall);
      var endIdx = indexOfDay(days, new Date(ev.endWall.getTime() - 1000));
      if (startIdx < 0 && endIdx < 0) {
        if (ev.startWall > rangeEnd || ev.endWall < rangeStart) return;
        startIdx = 0; endIdx = days.length - 1;
      }
      if (startIdx < 0) startIdx = 0;
      if (endIdx < 0) endIdx = days.length - 1;
      var lane = findLane(used, startIdx, endIdx);
      var color = Q.eventColor(ev);
      var chip = D.h('button.allday-chip', {
        type: 'button',
        style: {
          gridColumn: (startIdx + 1) + ' / ' + (endIdx + 2),
          gridRow: String(lane + 1),
          background: D.mix(color, 0.18),
          borderLeftColor: color
        },
        title: ev.title,
        onclick: function (e) { e.stopPropagation(); openEvent(ev); }
      }, [
        D.h('span.allday-chip__dot', { style: { background: color } }),
        D.h('span.allday-chip__title', { text: ev.title })
      ]);
      grid.appendChild(chip);
    });

    if (Q.layerOn('deadlines')) {
      var deadlines = Q.deadlinesInRange(rangeStart, rangeEnd);
      deadlines.forEach(function (d) {
        var idx = indexOfDay(days, T.w(d.due));
        if (idx < 0) return;
        var lane = findLane(used, idx, idx);
        var status = Q.deadlineStatus(d);
        grid.appendChild(D.h('button.allday-chip.allday-chip--deadline.is-' + status.level, {
          type: 'button',
          style: { gridColumn: (idx + 1) + ' / ' + (idx + 2), gridRow: String(lane + 1) },
          title: d.title + ' — ' + status.label,
          onclick: function (e) { e.stopPropagation(); openDeadline(d); }
        }, [
          D.icon('flag', 12),
          D.h('span.allday-chip__title', { text: d.title })
        ]));
      });
    }

    if (!grid.childNodes.length) row.classList.add('is-empty');
    row.appendChild(grid);
    return row;
  }

  function findLane(used, startIdx, endIdx) {
    for (var lane = 0; lane < 6; lane++) {
      used[lane] = used[lane] || [];
      var clash = used[lane].some(function (r) { return startIdx <= r[1] && r[0] <= endIdx; });
      if (!clash) { used[lane].push([startIdx, endIdx]); return lane; }
    }
    used[5].push([startIdx, endIdx]);
    return 5;
  }

  function indexOfDay(days, wall) {
    for (var i = 0; i < days.length; i++) if (T.sameDay(days[i], wall)) return i;
    return -1;
  }

  function buildDayColumn(day, dayIndex, days) {
    var s = settings();
    var hh = hourHeight();
    var startMin = dayStart(), endMin = dayEnd();
    var now = T.nowWall();
    var isToday = T.sameDay(day, now);

    var col = D.h('div.tg__col' + (isToday ? '.is-today' : ''), {
      'data-dropzone': 'timegrid',
      'data-day': T.key(day)
    });
    col._day = day;

    // Working-hours band tells you at a glance which time is "yours".
    var isWorkDay = (s.workingDays || []).indexOf(day.getDay()) >= 0;
    if (isWorkDay) {
      var wStart = Math.max(startMin, s.workingHours.start);
      var wEnd = Math.min(endMin, s.workingHours.end);
      if (wEnd > wStart) {
        col.appendChild(D.h('div.tg__work', {
          'aria-hidden': 'true',
          style: { top: minToPx(wStart) + 'px', height: ((wEnd - wStart) / 60 * hh) + 'px' }
        }));
      }
    }

    var lines = D.h('div.tg__lines', { 'aria-hidden': 'true' });
    for (var m = startMin; m < endMin; m += 60) {
      lines.appendChild(D.h('div.tg__line', { style: { height: hh + 'px' } }));
    }
    col.appendChild(lines);

    var events = Q.eventsOnDay(day).filter(function (e) { return !e.allDay && !Q.isMultiDay(e); });
    var conflicts = Q.conflictIds(events);
    var placed = Q.layoutColumns(events);

    placed.forEach(function (p) {
      col.appendChild(buildEventNode(p, day, days, conflicts));
    });

    if (Q.layerOn('habits')) {
      Q.habitsForDay(day).forEach(function (entry) {
        if (entry.habit.time == null) return;
        col.appendChild(buildHabitNode(entry, day));
      });
    }

    if (isToday) {
      var nowMin = T.minutesOfDay(now);
      if (nowMin >= startMin && nowMin <= endMin) {
        col.appendChild(D.h('div.tg__now', {
          'aria-hidden': 'true',
          style: { top: minToPx(nowMin) + 'px' }
        }, D.h('span.tg__now-dot')));
      }
    }

    attachGridCreate(col, day);
    return col;
  }

  function minToPx(minutes) {
    return ((minutes - dayStart()) / 60) * hourHeight();
  }
  function pxToMin(px) {
    return dayStart() + (px / hourHeight()) * 60;
  }

  function buildEventNode(placement, day, days, conflicts) {
    var ev = placement.event;
    var s = settings();
    var color = Q.eventColor(ev);
    var startMin = Math.max(dayStart(), T.minutesOfDay(ev.startWall));
    var rawEnd = T.sameDay(ev.endWall, day) ? T.minutesOfDay(ev.endWall) : 24 * 60;
    var endMin = Math.min(dayEnd(), rawEnd);
    var height = Math.max(18, ((endMin - startMin) / 60) * hourHeight() - 2);
    var widthPct = 100 / placement.cols;
    var isConflicted = conflicts[ev.instanceId];
    var duration = T.diffMinutes(ev.startWall, ev.endWall);

    var node = D.h('div.ev', {
      tabindex: '0',
      role: 'button',
      'data-event': ev.instanceId,
      'aria-label': eventAriaLabel(ev),
      style: {
        top: minToPx(startMin) + 'px',
        height: height + 'px',
        left: (placement.col * widthPct) + '%',
        width: 'calc(' + (widthPct * placement.span) + '% - 3px)',
        '--ev-color': color,
        background: D.mix(color, ev.done ? 0.08 : 0.16),
        borderLeftColor: color
      }
    });
    if (ev.done) node.classList.add('is-done');
    if (ev.type === 'block') node.classList.add('is-block');
    if (isConflicted) node.classList.add('is-conflict');
    if (duration <= 30) node.classList.add('is-short');
    if (state.selectedId === ev.instanceId) node.classList.add('is-selected');

    // Travel band renders as a lighter extension either side of the event.
    if (s.travelTimeEnabled && ev.travelMinutes) {
      var pre = D.h('div.ev__travel.ev__travel--before', {
        'aria-hidden': 'true',
        style: { height: (ev.travelMinutes / 60 * hourHeight()) + 'px', top: (-(ev.travelMinutes / 60 * hourHeight())) + 'px' }
      });
      var post = D.h('div.ev__travel.ev__travel--after', {
        'aria-hidden': 'true',
        style: { height: (ev.travelMinutes / 60 * hourHeight()) + 'px', bottom: (-(ev.travelMinutes / 60 * hourHeight())) + 'px' }
      });
      node.appendChild(pre); node.appendChild(post);
    }

    var body = D.h('div.ev__body', [
      D.h('span.ev__title', { text: ev.title }),
      duration > 30 ? D.h('span.ev__time', {
        text: T.fmtTime(ev.startWall, use24()) + (duration >= 50 ? ' – ' + T.fmtTime(ev.endWall, use24()) : '')
      }) : null,
      duration > 75 && ev.location ? D.h('span.ev__loc', [D.icon('pin', 11), D.h('span', { text: ev.location })]) : null
    ]);
    node.appendChild(body);

    var badges = D.h('div.ev__badges');
    if (ev.recurrence || ev.seriesId) badges.appendChild(iconBadge('repeat', 'Repeats'));
    if (ev.taskId) badges.appendChild(iconBadge('checkSquare', 'From a task'));
    if (isConflicted) badges.appendChild(iconBadge('alert', 'Overlaps another event'));
    if ((ev.attachments || []).length) badges.appendChild(iconBadge('paperclip', 'Has attachments'));
    if (badges.childNodes.length) node.appendChild(badges);

    node.appendChild(D.h('div.ev__resize.ev__resize--top', { 'aria-hidden': 'true' }));
    node.appendChild(D.h('div.ev__resize.ev__resize--bottom', { 'aria-hidden': 'true' }));

    attachEventInteractions(node, ev, day, days);
    return node;
  }

  function iconBadge(name, label) {
    var span = D.h('span.ev__badge', { title: label, 'aria-label': label, role: 'img' }, D.icon(name, 11));
    return span;
  }

  function eventAriaLabel(ev) {
    var parts = [ev.title];
    if (ev.allDay) parts.push('all day');
    else parts.push(T.fmtTime(ev.startWall, use24()) + ' to ' + T.fmtTime(ev.endWall, use24()));
    parts.push(T.fmtDateLong(ev.startWall));
    if (ev.location) parts.push('at ' + ev.location);
    if (ev.recurrence) parts.push('repeating');
    return parts.join(', ');
  }

  function buildHabitNode(entry, day) {
    var h = entry.habit;
    var startMin = Math.max(dayStart(), h.time);
    var height = Math.max(16, (h.duration / 60) * hourHeight() - 2);
    var node = D.h('div.ev.ev--habit' + (entry.done ? '.is-done' : ''), {
      tabindex: '0', role: 'button',
      'aria-label': 'Habit: ' + h.name + (entry.done ? ', done today' : ', not yet done'),
      style: {
        top: minToPx(startMin) + 'px', height: height + 'px',
        '--ev-color': h.color, borderLeftColor: h.color, background: D.mix(h.color, 0.1)
      },
      onclick: function () { A.toggleHabit(h.id, entry.key); },
      onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); A.toggleHabit(h.id, entry.key); } }
    }, [
      D.h('div.ev__body', [
        D.h('span.ev__title', [entry.done ? D.icon('check', 12) : D.icon('repeat', 12), D.h('span', { text: h.name })])
      ])
    ]);
    return node;
  }

  /* ------------------------------------------------- event interactions */

  function attachEventInteractions(node, ev, day, days) {
    node.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEvent(ev); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteWithScope(ev); }
      else if (e.key.toLowerCase() === 'd' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); A.duplicateEvent(ev, 0); }
    });
    node.addEventListener('focus', function () { state.selectedId = ev.instanceId; });
    node.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      eventContextMenu(node, ev);
    });

    node.addEventListener('pointerdown', function (e) {
      if (e.target.classList.contains('ev__resize')) {
        startResize(e, node, ev, e.target.classList.contains('ev__resize--top') ? 'start' : 'end');
        return;
      }
      startMove(e, node, ev, day, days);
    });
  }

  function columnsContainer(node) {
    var el = node;
    while (el && !el.classList.contains('tg__cols')) el = el.parentElement;
    return el;
  }

  function startMove(e, node, ev, day, days) {
    var cols = columnsContainer(node);
    if (!cols) return;
    var colNodes = D.qsa('.tg__col', cols);
    var originalTop = parseFloat(node.style.top);
    var duration = T.diffMinutes(ev.startWall, ev.endWall);
    var preview = null;
    var lastDayIdx = colNodes.indexOf(node.parentElement);
    var lastStartMin = T.minutesOfDay(ev.startWall);

    DND.drag(e, {
      onStart: function () {
        node.classList.add('is-dragging-src');
        preview = D.h('div.ev-preview', { 'aria-hidden': 'true' });
        preview.style.height = node.offsetHeight + 'px';
        preview.appendChild(D.h('span', { text: ev.title }));
        cols.appendChild(preview);
        D.announce('Moving ' + ev.title);
      },
      onMove: function (st) {
        var rect = cols.getBoundingClientRect();
        var colWidth = rect.width / colNodes.length;
        var idx = Math.max(0, Math.min(colNodes.length - 1, Math.floor((st.x - rect.left) / colWidth)));
        var deltaMin = Math.round(((st.dy / hourHeight()) * 60) / 15) * 15;
        var newStart = clampMinutes(T.minutesOfDay(ev.startWall) + deltaMin, duration);
        lastDayIdx = idx; lastStartMin = newStart;
        var target = colNodes[idx];
        if (preview.parentElement !== target) target.appendChild(preview);
        preview.style.top = minToPx(newStart) + 'px';
        preview.style.left = '2px';
        preview.style.width = 'calc(100% - 6px)';
        D.clear(preview);
        preview.appendChild(D.h('span.ev-preview__time', {
          text: T.fmtTime(T.atMinutes(colNodes[idx]._day, newStart), use24()) + ' – ' +
            T.fmtTime(T.atMinutes(colNodes[idx]._day, newStart + duration), use24())
        }));
        preview.appendChild(D.h('span.ev-preview__title', { text: ev.title }));
      },
      onEnd: function () {
        node.classList.remove('is-dragging-src');
        if (preview && preview.parentNode) preview.parentNode.removeChild(preview);
        var targetDay = colNodes[lastDayIdx] ? colNodes[lastDayIdx]._day : day;
        var newStart = T.atMinutes(targetDay, lastStartMin);
        var newEnd = T.addMinutes(newStart, duration);
        if (Math.abs(newStart - ev.startWall) < 60000) return;
        commitMove(ev, newStart, newEnd);
      },
      onCancel: function () {
        node.classList.remove('is-dragging-src');
        if (preview && preview.parentNode) preview.parentNode.removeChild(preview);
        node.style.top = originalTop + 'px';
        UI.toast('Move cancelled');
      },
      onClick: function () { openEvent(ev); }
    });
  }

  function clampMinutes(start, duration) {
    var lo = dayStart(), hi = dayEnd();
    if (start < lo) start = lo;
    if (start + duration > hi) start = Math.max(lo, hi - duration);
    return start;
  }

  function startResize(e, node, ev, edge) {
    e.stopPropagation();
    var origStart = T.minutesOfDay(ev.startWall);
    var origEnd = origStart + T.diffMinutes(ev.startWall, ev.endWall);
    var newStart = origStart, newEnd = origEnd;
    var label = D.h('span.ev__resize-label');

    DND.drag(e, {
      onStart: function () { node.classList.add('is-resizing'); node.appendChild(label); },
      onMove: function (st) {
        var deltaMin = Math.round(((st.dy / hourHeight()) * 60) / 15) * 15;
        if (edge === 'end') newEnd = Math.max(origStart + 15, Math.min(dayEnd(), origEnd + deltaMin));
        else newStart = Math.min(origEnd - 15, Math.max(dayStart(), origStart + deltaMin));
        node.style.top = minToPx(newStart) + 'px';
        node.style.height = Math.max(18, ((newEnd - newStart) / 60) * hourHeight() - 2) + 'px';
        label.textContent = T.humanDuration(newEnd - newStart);
      },
      onEnd: function () {
        node.classList.remove('is-resizing');
        if (label.parentNode) label.parentNode.removeChild(label);
        if (newStart === origStart && newEnd === origEnd) return;
        var day = T.startOfDay(ev.startWall);
        commitMove(ev, T.atMinutes(day, newStart), T.atMinutes(day, newEnd));
      },
      onCancel: function () {
        node.classList.remove('is-resizing');
        if (label.parentNode) label.parentNode.removeChild(label);
        rerender();
      }
    });
  }

  function commitMove(ev, newStart, newEnd) {
    var base = A.baseEventOf(ev);
    if (base && base.recurrence) {
      UI.pickScope({ title: 'Move a repeating event', subtitle: 'Which occurrences should move?' })
        .then(function (scope) {
          if (!scope) { rerender(); return; }
          A.moveEvent(ev, newStart, newEnd, scope);
          checkConflictAfterMove(ev, newStart);
        });
      return;
    }
    A.moveEvent(ev, newStart, newEnd, 'all');
    checkConflictAfterMove(ev, newStart);
  }

  function checkConflictAfterMove(ev, newStart) {
    var items = Q.eventsOnDay(newStart, { ignoreLayers: true });
    var pairs = Q.findConflicts(items).filter(function (p) {
      var id = ev.seriesId || ev.id;
      return p[0].id === id || p[1].id === id || p[0].seriesId === id || p[1].seriesId === id;
    });
    if (pairs.length) {
      UI.toast('That now overlaps “' + (pairs[0][0].title === ev.title ? pairs[0][1].title : pairs[0][0].title) + '”', {
        tone: 'warn',
        actions: [{ label: 'Resolve', onClick: function () { UI.conflictDialog(pairs[0]); } }]
      });
    }
  }

  function eventContextMenu(anchor, ev) {
    UI.menu(anchor, [
      { label: 'Open', icon: 'edit', onClick: function () { openEvent(ev); } },
      { label: 'Duplicate', icon: 'copy', onClick: function () { A.duplicateEvent(ev, 0); } },
      { label: 'Duplicate tomorrow', onClick: function () { A.duplicateEvent(ev, 1); } },
      { label: 'Duplicate next week', onClick: function () { A.duplicateEvent(ev, 7); } },
      { separator: true },
      {
        label: 'Find another time', icon: 'search', onClick: function () {
          UI.findTimeDialog({
            minutes: T.diffMinutes(ev.startWall, ev.endWall), title: ev.title,
            onPick: function (slot) { commitMove(ev, slot.start, T.addMinutes(slot.start, slot.minutes)); }
          });
        }
      },
      ev.taskId ? {
        label: 'Open the task', icon: 'checkSquare',
        onClick: function () { var t = S.get('tasks', ev.taskId); if (t) UI.editTask(t); }
      } : null,
      { separator: true },
      { label: 'Delete', icon: 'trash', danger: true, onClick: function () { deleteWithScope(ev); } }
    ].filter(Boolean), { align: 'left' });
  }

  function deleteWithScope(ev) {
    var base = A.baseEventOf(ev);
    if (base && base.recurrence) {
      UI.pickScope({ title: 'Delete a repeating event', subtitle: 'Which occurrences should be deleted?' })
        .then(function (scope) { if (scope) A.deleteEvent(ev, scope); });
      return;
    }
    A.deleteEvent(ev, 'all');
  }

  function openEvent(ev) { UI.editEvent(ev); }
  function openDeadline(d) { UI.editDeadline(d); }

  /* ------------------------------------------------ create by dragging */

  function attachGridCreate(col, day) {
    col.addEventListener('pointerdown', function (e) {
      if (e.target !== col && !e.target.classList.contains('tg__lines') && !e.target.classList.contains('tg__line') && !e.target.classList.contains('tg__work')) return;
      var rect = col.getBoundingClientRect();
      var startMin = snap15(pxToMin(e.clientY - rect.top));
      var endMin = startMin + settings().defaultEventDuration;
      var band = null;

      DND.drag(e, {
        onStart: function () {
          band = D.h('div.tg__select', { 'aria-hidden': 'true' });
          col.appendChild(band);
        },
        onMove: function (st) {
          var cur = snap15(pxToMin(st.y - rect.top));
          var a = Math.min(startMin, cur), b = Math.max(startMin + 15, cur);
          endMin = b;
          band.style.top = minToPx(a) + 'px';
          band.style.height = Math.max(6, ((b - a) / 60) * hourHeight()) + 'px';
          D.clear(band);
          band.appendChild(D.h('span', {
            text: T.fmtTime(T.atMinutes(day, a), use24()) + ' – ' + T.fmtTime(T.atMinutes(day, b), use24())
          }));
        },
        onEnd: function (st) {
          if (band && band.parentNode) band.parentNode.removeChild(band);
          var cur = snap15(pxToMin(st.y - rect.top));
          var a = Math.min(startMin, cur), b = Math.max(startMin + 15, cur);
          quickCreate(T.atMinutes(day, a), T.atMinutes(day, b));
        },
        onCancel: function () { if (band && band.parentNode) band.parentNode.removeChild(band); },
        onClick: function () {
          quickCreate(T.atMinutes(day, startMin), T.atMinutes(day, endMin));
        }
      });
    });

    // Dropping a task from the sidebar or task list schedules it here.
    col.addEventListener('pointerup', function (e) {
      var p = DND.getPayload();
      if (!p || p.kind !== 'task') return;
      var rect = col.getBoundingClientRect();
      var mins = snap15(pxToMin(e.clientY - rect.top));
      A.scheduleTask(p.id, T.atMinutes(day, mins), p.minutes);
    });
  }

  function snap15(minutes) { return Math.round(minutes / 15) * 15; }

  /* A two-second path from empty slot to real event. */
  function quickCreate(startWall, endWall) {
    var titleInput = UI.F.text({ placeholder: 'What is it?', autofocus: true });
    titleInput.classList.add('input--title');
    var typeValue = 'event';
    var layer = UI.modal({
      size: 'sm',
      class: 'dialog--quickcreate',
      title: 'New on ' + T.relativeDay(startWall).toLowerCase(),
      subtitle: T.fmtDateShort(startWall) + ' · ' + T.fmtTime(startWall, use24()) + ' – ' + T.fmtTime(endWall, use24()),
      body: D.h('div.editor', [
        UI.F.field(null, titleInput, { class: 'field--title' }),
        UI.F.field('Kind', UI.F.segmented({
          value: 'event',
          ariaLabel: 'What kind of item',
          options: [
            { value: 'event', label: 'Event' },
            { value: 'block', label: 'Time block' }
          ],
          onChange: function (v) { typeValue = v; }
        }))
      ]),
      footer: function (l) {
        return [
          D.h('div.sheet__foot-left', D.h('button.btn.btn--ghost.btn--sm', {
            type: 'button',
            onclick: function () {
              l.close();
              UI.editEvent({ title: titleInput.getValue(), start: T.iso(startWall), end: T.iso(endWall) });
            }
          }, 'More options')),
          D.h('div.sheet__foot-right', [
            D.h('button.btn.btn--ghost', { type: 'button', onclick: function () { l.close(); } }, 'Cancel'),
            D.h('button.btn.btn--primary', { type: 'button', onclick: create }, 'Add')
          ])
        ];
      }
    });
    titleInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); create(); }
    });
    function create() {
      var ev = A.createEvent({
        title: titleInput.getValue() || 'New event',
        start: T.iso(startWall),
        end: T.iso(endWall),
        type: typeValue === 'block' ? 'block' : 'event'
      });
      layer.close();
      UI.warnAboutConflicts(ev);
    }
  }

  /* ------------------------------------------------------------- month */

  function renderMonth() {
    var s = settings();
    var range = rangeOf();
    var now = T.nowWall();
    var wrap = D.h('div.month');

    var head = D.h('div.month__weekdays');
    if (s.showWeekNumbers) head.appendChild(D.h('span.month__wk-head', { text: 'Wk' }));
    for (var i = 0; i < 7; i++) {
      var dow = (s.firstDayOfWeek + i) % 7;
      head.appendChild(D.h('span.month__weekday', { text: T.DAY_SHORT[dow] }));
    }
    wrap.appendChild(head);

    var grid = D.h('div.month__grid' + (s.showWeekNumbers ? '.has-weekno' : ''));
    var cursor = new Date(range.start);
    var weekCount = Math.ceil((T.diffDays(range.start, range.end) + 1) / 7);
    var buckets = Q.dayBuckets(range.start, range.end);

    for (var w = 0; w < weekCount; w++) {
      if (s.showWeekNumbers) {
        grid.appendChild(D.h('div.month__wk', { text: String(T.weekNumber(cursor)) }));
      }
      for (var d = 0; d < 7; d++) {
        grid.appendChild(monthCell(new Date(cursor), now, buckets));
        cursor = T.addDays(cursor, 1);
      }
    }
    wrap.appendChild(grid);
    return wrap;
  }

  function monthCell(day, now, buckets) {
    var dayKey = T.key(day);
    var inMonth = T.sameMonth(day, state.anchor);
    var isToday = T.sameDay(day, now);
    var cell = D.h('div.month__cell' + (inMonth ? '' : '.is-outside') + (isToday ? '.is-today' : ''), {
      'data-dropzone': 'monthcell', 'data-day': T.key(day)
    });
    cell._day = day;

    var num = D.h('button.month__num', {
      type: 'button',
      'aria-label': T.fmtDateLong(day),
      onclick: function () { state.anchor = day; state.view = 'day'; S.setPref('lastView', 'day'); rerender(); }
    }, String(day.getDate()));
    cell.appendChild(D.h('div.month__cell-head', [num]));

    var items = D.h('div.month__items');
    var events = buckets.events[dayKey] || [];
    var deadlines = Q.layerOn('deadlines') ? (buckets.deadlines[dayKey] || []) : [];
    var tasks = Q.layerOn('tasks')
      ? (buckets.tasks[dayKey] || []).filter(function (t) { return t.status !== 'completed'; })
      : [];

    var MAX = 4;
    var shown = 0;

    deadlines.forEach(function (dl) {
      if (shown >= MAX) return;
      shown++;
      var status = Q.deadlineStatus(dl, now);
      items.appendChild(D.h('button.month__chip.month__chip--deadline.is-' + status.level, {
        type: 'button', title: dl.title + ' — ' + status.label,
        onclick: function (e) { e.stopPropagation(); openDeadline(dl); }
      }, [D.icon('flag', 11), D.h('span', { text: dl.title })]));
    });

    events.forEach(function (ev) {
      if (shown >= MAX) return;
      shown++;
      var color = Q.eventColor(ev);
      items.appendChild(monthChip(ev, color, day));
    });

    tasks.forEach(function (t) {
      if (shown >= MAX) return;
      shown++;
      items.appendChild(D.h('button.month__chip.month__chip--task', {
        type: 'button', title: t.title,
        onclick: function (e) { e.stopPropagation(); UI.editTask(t); }
      }, [D.icon('checkSquare', 11), D.h('span', { text: t.title })]));
    });

    var total = events.length + deadlines.length + tasks.length;
    if (total > shown) {
      items.appendChild(D.h('button.month__more', {
        type: 'button',
        onclick: function () { state.anchor = day; state.view = 'day'; S.setPref('lastView', 'day'); rerender(); }
      }, '+' + (total - shown) + ' more'));
    }

    cell.appendChild(items);

    cell.addEventListener('dblclick', function (e) {
      if (e.target.closest('.month__chip')) return;
      var start = T.atMinutes(day, settings().workingHours.start);
      quickCreate(start, T.addMinutes(start, settings().defaultEventDuration));
    });
    cell.addEventListener('pointerup', function () {
      var p = DND.getPayload();
      if (!p) return;
      if (p.kind === 'task') {
        A.rescheduleTask(p.id, T.endOfDay(day));
      }
    });
    return cell;
  }

  function monthChip(ev, color, day) {
    var chip = D.h('button.month__chip', {
      type: 'button', title: ev.title + ' · ' + (ev.allDay ? 'all day' : T.fmtTime(ev.startWall, use24())),
      style: ev.allDay ? { background: D.mix(color, 0.2), color: 'inherit' } : null,
      'data-event': ev.instanceId,
      onclick: function (e) { e.stopPropagation(); openEvent(ev); }
    }, [
      ev.allDay ? null : D.h('span.month__dot', { style: { background: color } }),
      ev.allDay ? null : D.h('span.month__time', { text: T.fmtTime(ev.startWall, use24()) }),
      D.h('span.month__chip-title', { text: ev.title })
    ]);

    chip.addEventListener('pointerdown', function (e) {
      var startDay = day;
      DND.drag(e, {
        onStart: function () {
          DND.setPayload({ kind: 'event', instance: ev });
          DND.showGhost(ev.title, color);
          chip.classList.add('is-dragging-src');
        },
        onMove: function () { },
        onEnd: function (st) {
          chip.classList.remove('is-dragging-src');
          var zone = DND.zoneAt(st.x, st.y);
          if (!zone || zone.dataset.dropzone !== 'monthcell') return;
          var targetDay = T.fromKey(zone.dataset.day);
          if (T.sameDay(targetDay, startDay)) return;
          var delta = T.diffDays(startDay, targetDay);
          var newStart = T.addDays(ev.startWall, delta);
          var newEnd = T.addDays(ev.endWall, delta);
          commitMove(ev, newStart, newEnd);
        },
        onCancel: function () { chip.classList.remove('is-dragging-src'); },
        onClick: function () { openEvent(ev); }
      });
    });
    return chip;
  }

  /* -------------------------------------------------------------- year */

  function renderYear() {
    var year = state.anchor.getFullYear();
    prepareCounts(new Date(year, 0, 1), new Date(year, 11, 31));
    var wrap = D.h('div.year');
    for (var m = 0; m < 12; m++) {
      wrap.appendChild(yearMonth(year, m));
    }
    return wrap;
  }

  function yearMonth(year, monthIdx) {
    var s = settings();
    var now = T.nowWall();
    var first = new Date(year, monthIdx, 1);
    var gridStart = T.startOfWeek(first, s.firstDayOfWeek);
    var node = D.h('div.year__month');
    node.appendChild(D.h('button.year__title', {
      type: 'button',
      onclick: function () { state.anchor = first; state.view = 'month'; S.setPref('lastView', 'month'); rerender(); }
    }, T.MONTHS[monthIdx]));

    var dows = D.h('div.year__dows');
    for (var i = 0; i < 7; i++) {
      dows.appendChild(D.h('span', { text: T.DAY_MIN[(s.firstDayOfWeek + i) % 7] }));
    }
    node.appendChild(dows);

    var grid = D.h('div.year__grid');
    var cursor = new Date(gridStart);
    for (var c = 0; c < 42; c++) {
      var day = new Date(cursor);
      var inMonth = day.getMonth() === monthIdx;
      var count = inMonth ? countForDay(day) : 0;
      var cell = D.h('button.year__day' + (inMonth ? '' : '.is-outside') + (T.sameDay(day, now) ? '.is-today' : ''), {
        type: 'button',
        'aria-label': T.fmtDateLong(day) + (count ? ', ' + count + ' items' : ', nothing scheduled'),
        title: count ? count + ' item' + (count === 1 ? '' : 's') : '',
        onclick: (function (d) {
          return function () { state.anchor = d; state.view = 'day'; S.setPref('lastView', 'day'); rerender(); };
        })(day)
      }, String(day.getDate()));
      if (inMonth && count) {
        cell.classList.add('has-items');
        cell.style.setProperty('--load', String(Math.min(1, count / 6)));
      }
      grid.appendChild(cell);
      cursor = T.addDays(cursor, 1);
    }
    node.appendChild(grid);
    return node;
  }

  /* Day counts feed the year grid (366 cells) and the mini calendar (42 cells).
     They are filled a whole range at a time and cached until something changes,
     so drawing a year costs one pass over the events rather than 366. */
  var countCache = {};
  S.on('change', function () { countCache = {}; });

  function prepareCounts(from, to) {
    var missing = false;
    var cursor = T.startOfDay(from), end = T.startOfDay(to), guard = 0;
    while (cursor <= end && guard++ < 800) {
      if (countCache[T.key(cursor)] == null) { missing = true; break; }
      cursor = T.addDays(cursor, 1);
    }
    if (!missing) return;
    var buckets = Q.dayBuckets(T.startOfDay(from), T.endOfDay(to), { skipTasks: true });
    Object.keys(buckets.counts).forEach(function (k) { countCache[k] = buckets.counts[k]; });
  }

  function countForDay(day) {
    var key = T.key(day);
    if (countCache[key] == null) {
      prepareCounts(T.startOfMonth(T.addMonths(day, -1)), T.endOfMonth(T.addMonths(day, 1)));
    }
    return countCache[key] || 0;
  }

  /* ------------------------------------------------------------ agenda */

  function renderAgenda() {
    var range = rangeOf();
    var now = T.nowWall();
    var wrap = D.h('div.agenda');
    var any = false;
    var buckets = Q.dayBuckets(range.start, range.end);

    for (var i = 0; i <= T.diffDays(range.start, range.end); i++) {
      var day = T.addDays(range.start, i);
      var key = T.key(day);
      var events = buckets.events[key] || [];
      var deadlines = Q.layerOn('deadlines') ? (buckets.deadlines[key] || []) : [];
      var tasks = Q.layerOn('tasks')
        ? (buckets.tasks[key] || []).filter(function (t) { return t.status !== 'completed'; })
        : [];
      if (!events.length && !deadlines.length && !tasks.length) continue;
      any = true;
      wrap.appendChild(agendaDay(day, events, deadlines, tasks, now));
    }

    if (!any) {
      wrap.appendChild(UI.emptyState({
        icon: 'calendar',
        title: 'Nothing in the next month',
        body: 'Your agenda is clear from ' + T.fmtDateShort(range.start) + '.',
        actions: [
          { label: 'Add an event', onClick: function () { UI.editEvent(null); } },
          { label: 'Plan my day', onClick: function () { UI.planDayDialog(); } }
        ]
      }));
    }
    return wrap;
  }

  function agendaDay(day, events, deadlines, tasks, now) {
    var section = D.h('section.agenda__day' + (T.sameDay(day, now) ? '.is-today' : ''));
    section.appendChild(D.h('div.agenda__date', [
      D.h('span.agenda__dow', { text: T.DAY_SHORT[day.getDay()] }),
      D.h('span.agenda__num', { text: String(day.getDate()) }),
      D.h('span.agenda__rel', { text: T.relativeDay(day, now) })
    ]));
    var list = D.h('div.agenda__list');

    deadlines.forEach(function (d) {
      var status = Q.deadlineStatus(d, now);
      list.appendChild(D.h('button.agenda__row.agenda__row--deadline.is-' + status.level, {
        type: 'button', onclick: function () { openDeadline(d); }
      }, [
        D.h('span.agenda__time', [D.icon('flag', 13)]),
        D.h('span.agenda__title', { text: d.title }),
        D.h('span.agenda__meta', { text: status.label })
      ]));
    });

    events.forEach(function (ev) {
      var color = Q.eventColor(ev);
      list.appendChild(D.h('button.agenda__row' + (ev.done ? '.is-done' : ''), {
        type: 'button', style: { '--ev-color': color }, onclick: function () { openEvent(ev); }
      }, [
        D.h('span.agenda__time', { text: ev.allDay ? 'All day' : T.fmtTime(ev.startWall, use24()) }),
        D.h('span.agenda__bar', { style: { background: color } }),
        D.h('span.agenda__title', { text: ev.title }),
        D.h('span.agenda__meta', {
          text: [ev.location, ev.allDay ? null : T.humanDuration(T.diffMinutes(ev.startWall, ev.endWall))]
            .filter(Boolean).join(' · ')
        })
      ]));
    });

    tasks.forEach(function (t) {
      list.appendChild(D.h('div.agenda__row.agenda__row--task', [
        D.h('span.agenda__time', D.h('button.check', {
          type: 'button', role: 'checkbox', 'aria-checked': 'false',
          'aria-label': 'Complete ' + t.title,
          onclick: function () { A.completeTask(t.id, true); }
        })),
        D.h('button.agenda__title.agenda__title--btn', {
          type: 'button', onclick: function () { UI.editTask(t); }
        }, t.title),
        D.h('span.agenda__meta', { text: 'Task · ' + T.humanDuration(Q.taskEstimate(t)) })
      ]));
    });

    section.appendChild(list);
    return section;
  }

  /* ---------------------------------------------------------- timeline */

  /* A horizontal read of the next few weeks: one row per project or calendar,
     so multi-day work and deadlines are visible as spans rather than dots. */
  function renderTimeline() {
    var range = rangeOf();
    var days = T.diffDays(range.start, range.end) + 1;
    var wrap = D.h('div.timeline');

    var header = D.h('div.timeline__head');
    header.appendChild(D.h('div.timeline__label-head', { text: 'Track' }));
    var scale = D.h('div.timeline__scale', { style: { gridTemplateColumns: 'repeat(' + days + ', minmax(28px,1fr))' } });
    for (var i = 0; i < days; i++) {
      var d = T.addDays(range.start, i);
      var isToday = T.sameDay(d, T.nowWall());
      scale.appendChild(D.h('div.timeline__tick' + (isToday ? '.is-today' : '') + (d.getDay() === 0 || d.getDay() === 6 ? '.is-weekend' : ''), [
        d.getDate() === 1 || i === 0 ? D.h('span.timeline__month', { text: T.MONTH_SHORT[d.getMonth()] }) : null,
        D.h('span.timeline__dow', { text: T.DAY_MIN[d.getDay()] }),
        D.h('span.timeline__day', { text: String(d.getDate()) })
      ]));
    }
    header.appendChild(scale);
    wrap.appendChild(header);

    var tracks = [];
    S.all('projects').filter(function (p) { return p.status !== 'archived'; }).forEach(function (p) {
      tracks.push({ id: p.id, label: p.name, color: p.color, kind: 'project' });
    });
    S.all('calendars').filter(function (c) { return c.visible !== false; }).forEach(function (c) {
      tracks.push({ id: c.id, label: c.name, color: c.color, kind: 'calendar' });
    });

    var body = D.h('div.timeline__body');
    var allEvents = Q.eventsInRange(range.start, range.end);

    tracks.forEach(function (track) {
      var items = track.kind === 'project'
        ? allEvents.filter(function (e) { return e.projectId === track.id; })
        : allEvents.filter(function (e) { return e.calendarId === track.id && !e.projectId; });
      var deadlines = track.kind === 'project'
        ? Q.deadlinesInRange(range.start, range.end).filter(function (d) { return d.projectId === track.id; })
        : [];
      if (!items.length && !deadlines.length) return;

      var row = D.h('div.timeline__row');
      row.appendChild(D.h('div.timeline__label', [
        D.h('span.timeline__swatch', { style: { background: track.color } }),
        D.h('span', { text: track.label })
      ]));
      var lane = D.h('div.timeline__lane', { style: { gridTemplateColumns: 'repeat(' + days + ', minmax(28px,1fr))' } });

      var lanes = [];
      // Multi-day work reads as a labelled span. Single-day items would be
      // slivers too narrow for a title, so they collapse into one mark per day
      // carrying a count, with the detail in the tooltip.
      var singlesByDay = {};
      items.forEach(function (ev) {
        var startIdx = Math.max(0, T.diffDays(range.start, ev.startWall));
        var endIdx = Math.min(days - 1, T.diffDays(range.start, new Date(ev.endWall.getTime() - 1000)));
        if (endIdx < startIdx) endIdx = startIdx;
        if (endIdx > startIdx) {
          var laneIdx = findLane(lanes, startIdx, endIdx);
          lane.appendChild(D.h('button.timeline__bar', {
            type: 'button',
            title: ev.title + ' · ' + T.fmtDateShort(ev.startWall) + ' – ' + T.fmtDateShort(ev.endWall),
            style: {
              gridColumn: (startIdx + 1) + ' / ' + (endIdx + 2),
              gridRow: String(laneIdx + 1),
              background: D.mix(Q.eventColor(ev), 0.25),
              borderLeftColor: Q.eventColor(ev)
            },
            onclick: function () { openEvent(ev); }
          }, D.h('span', { text: ev.title })));
        } else {
          (singlesByDay[startIdx] || (singlesByDay[startIdx] = [])).push(ev);
        }
      });

      Object.keys(singlesByDay).forEach(function (idx) {
        var group = singlesByDay[idx];
        var dayWall = T.addDays(range.start, +idx);
        var laneIdx = findLane(lanes, +idx, +idx);
        var label = group.length === 1 ? group[0].title : group.length + ' events';
        lane.appendChild(D.h('button.timeline__mark', {
          type: 'button',
          title: T.fmtDateLong(dayWall) + '\n' + group.map(function (e) {
            return '• ' + e.title + (e.allDay ? '' : ' · ' + T.fmtTime(e.startWall, use24()));
          }).join('\n'),
          'aria-label': label + ' on ' + T.fmtDateLong(dayWall),
          style: {
            gridColumn: (+idx + 1) + ' / ' + (+idx + 2),
            gridRow: String(laneIdx + 1),
            background: D.mix(Q.eventColor(group[0]), 0.3),
            borderColor: Q.eventColor(group[0])
          },
          onclick: function () {
            if (group.length === 1) openEvent(group[0]);
            else { state.anchor = dayWall; state.view = 'day'; S.setPref('lastView', 'day'); rerender(); }
          }
        }, group.length > 1 ? D.h('span', { text: String(group.length) }) : null));
      });
      deadlines.forEach(function (d) {
        var idx = Math.max(0, Math.min(days - 1, T.diffDays(range.start, T.w(d.due))));
        var laneIdx = findLane(lanes, idx, idx);
        lane.appendChild(D.h('button.timeline__marker', {
          type: 'button', title: d.title,
          style: { gridColumn: (idx + 1) + ' / ' + (idx + 2), gridRow: String(laneIdx + 1) },
          onclick: function () { openDeadline(d); }
        }, D.icon('flag', 12)));
      });

      row.appendChild(lane);
      body.appendChild(row);
    });

    if (!body.childNodes.length) {
      body.appendChild(UI.emptyState({
        icon: 'chart',
        title: 'Nothing to lay out yet',
        body: 'The timeline groups work by project and calendar. Add a project, or give some events a project, to see them here.',
        actions: [{ label: 'New project', onClick: function () { UI.editProject(null); } }]
      }));
    }
    wrap.appendChild(body);
    return wrap;
  }

  /* ------------------------------------------------------ mini calendar */

  function miniCalendar(opts) {
    opts = opts || {};
    var s = settings();
    var anchor = opts.anchor || state.anchor || T.nowWall();
    var cursor = new Date(anchor);
    var node = D.h('div.mini');

    function paint() {
      D.clear(node);
      var now = T.nowWall();
      var head = D.h('div.mini__head', [
        D.iconButton('chevronLeft', 'Previous month', function () { cursor = T.addMonths(cursor, -1); paint(); }, { size: 15 }),
        D.h('button.mini__title', {
          type: 'button',
          onclick: function () { go(T.startOfMonth(cursor), 'month'); }
        }, T.fmtMonthYear(cursor)),
        D.iconButton('chevronRight', 'Next month', function () { cursor = T.addMonths(cursor, 1); paint(); }, { size: 15 })
      ]);
      node.appendChild(head);

      var dows = D.h('div.mini__dows', { 'aria-hidden': 'true' });
      for (var i = 0; i < 7; i++) dows.appendChild(D.h('span', { text: T.DAY_MIN[(s.firstDayOfWeek + i) % 7] }));
      node.appendChild(dows);

      var grid = D.h('div.mini__grid', { role: 'grid' });
      var start = T.startOfWeek(T.startOfMonth(cursor), s.firstDayOfWeek);
      prepareCounts(start, T.addDays(start, 41));
      for (var c = 0; c < 42; c++) {
        var day = T.addDays(start, c);
        var inMonth = T.sameMonth(day, cursor);
        var selected = state.anchor && T.sameDay(day, state.anchor);
        var count = inMonth ? countForDay(day) : 0;
        var cell = D.h('button.mini__day' +
          (inMonth ? '' : '.is-outside') +
          (T.sameDay(day, now) ? '.is-today' : '') +
          (selected ? '.is-selected' : ''), {
          type: 'button', role: 'gridcell',
          'aria-label': T.fmtDateLong(day),
          'aria-current': T.sameDay(day, now) ? 'date' : null,
          onclick: (function (d) { return function () { go(d); }; })(day)
        }, [
          D.h('span', { text: String(day.getDate()) }),
          count ? D.h('span.mini__dot') : null
        ]);
        grid.appendChild(cell);
      }
      node.appendChild(grid);
    }

    function go(day, view) {
      if (opts.onPick) { opts.onPick(day, view); return; }
      state.anchor = day;
      if (view) { state.view = view; S.setPref('lastView', view); }
      UI.go('calendar', { date: T.key(day) });
    }

    paint();
    return node;
  }

  /* ------------------------------------------------------------ render */

  function render(container, params) {
    root = container;
    ensureState(params);
    D.clear(container);
    container.appendChild(toolbar());

    var body = D.h('div.cal__body');
    switch (state.view) {
      case 'month': body.appendChild(renderMonth()); break;
      case 'year': body.appendChild(renderYear()); break;
      case 'agenda': body.appendChild(renderAgenda()); break;
      case 'timeline': body.appendChild(renderTimeline()); break;
      default: body.appendChild(renderTimeGrid(visibleDays()));
    }
    container.appendChild(body);
    attachSwipe(body);
  }

  /* Horizontal swipe moves through time on touch devices. */
  function attachSwipe(node) {
    var startX = 0, startY = 0, tracking = false;
    node.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX; startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });
    node.addEventListener('touchend', function (e) {
      if (!tracking) return;
      tracking = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - startX, dy = t.clientY - startY;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      step(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  function handleKey(e) {
    var k = e.key.toLowerCase();
    if (k === 'arrowleft') { step(-1); return true; }
    if (k === 'arrowright') { step(1); return true; }
    if (k === 'arrowup') { state.anchor = T.addDays(state.anchor, -7); rerender(); return true; }
    if (k === 'arrowdown') { state.anchor = T.addDays(state.anchor, 7); rerender(); return true; }
    var byKey = VIEWS.filter(function (v) { return v.shortcut === e.key; })[0];
    if (byKey) { state.view = byKey.id; S.setPref('lastView', byKey.id); rerender(); return true; }
    if (k === 'w') { state.view = 'week'; S.setPref('lastView', 'week'); rerender(); return true; }
    if (k === 'm') { state.view = 'month'; S.setPref('lastView', 'month'); rerender(); return true; }
    if (k === 'a') { state.view = 'agenda'; S.setPref('lastView', 'agenda'); rerender(); return true; }
    if (k === 'y') { state.view = 'year'; S.setPref('lastView', 'year'); rerender(); return true; }
    return false;
  }

  function goToDate(dayWall, view) {
    state.anchor = T.startOfDay(dayWall);
    if (view) { state.view = view; S.setPref('lastView', view); }
    rerender();
  }

  Views.calendar = {
    render: render,
    rerender: rerender,
    handleKey: handleKey,
    goToDate: goToDate,
    miniCalendar: miniCalendar,
    state: state,
    quickCreate: quickCreate
  };
})(window);
