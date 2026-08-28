/* Cadence — the command palette (⌘K). Commands and universal search in one
   box, because power users should never have to remember which is which. */
(function (global) {
  'use strict';
  var UI = global.UI = global.UI || {};

  var open = false;
  var layer = null;

  function commands() {
    return [
      { id: 'add-quick', label: 'Quick add', hint: 'Write it in plain language', icon: 'sparkle', shortcut: 'C', run: function () { UI.quickAdd(); } },
      { id: 'add-event', label: 'New event', icon: 'calendar', shortcut: 'N', run: function () { UI.editEvent(null); } },
      { id: 'add-task', label: 'New task', icon: 'checkSquare', shortcut: 'T', run: function () { UI.editTask(null); } },
      { id: 'add-deadline', label: 'New deadline', icon: 'flag', run: function () { UI.editDeadline(null); } },
      { id: 'add-note', label: 'New note', icon: 'note', run: function () { UI.editNote(null); } },
      { id: 'add-project', label: 'New project', icon: 'folder', run: function () { UI.editProject(null); } },
      { id: 'add-goal', label: 'New goal', icon: 'target', run: function () { UI.editGoal(null); } },
      { id: 'add-habit', label: 'New habit', icon: 'repeat', run: function () { UI.editHabit(null); } },
      { id: 'organize', label: 'Organize a brain dump', hint: 'Turn messy text into a plan', icon: 'zap', run: function () { UI.organizeDialog(); } },
      { id: 'what-now', label: 'What should I do now?', icon: 'compass', shortcut: 'W', run: function () { UI.whatNowDialog(); } },
      { id: 'plan-day', label: 'Plan my day', icon: 'sparkle', shortcut: 'P', run: function () { UI.planDayDialog(); } },
      { id: 'plan-week', label: 'Plan my week', icon: 'grid', run: function () { UI.planWeekDialog(); } },
      { id: 'find-time', label: 'Find time…', icon: 'search', run: function () { UI.findTimeDialog({ minutes: 60 }); } },
      { id: 'focus', label: 'Start focus mode', icon: 'focus', shortcut: 'F', run: function () { UI.focusEntry(); } },
      { id: 'recover', label: 'Reschedule what I missed', icon: 'undo', run: function () { UI.recoveryDialog(); } },
      { id: 'go-today', label: 'Go to today', icon: 'home', shortcut: 'D', run: function () { UI.go('today'); } },
      { id: 'go-calendar', label: 'Go to calendar', icon: 'calendar', run: function () { UI.go('calendar'); } },
      { id: 'go-tasks', label: 'Go to tasks', icon: 'checkSquare', run: function () { UI.go('tasks'); } },
      { id: 'go-notes', label: 'Go to notes', icon: 'note', run: function () { UI.go('notes'); } },
      { id: 'go-projects', label: 'Go to projects', icon: 'folder', run: function () { UI.go('projects'); } },
      { id: 'go-goals', label: 'Go to goals', icon: 'target', run: function () { UI.go('goals'); } },
      { id: 'go-habits', label: 'Go to habits', icon: 'repeat', run: function () { UI.go('habits'); } },
      { id: 'go-planning', label: 'Go to planning', icon: 'compass', run: function () { UI.go('planning'); } },
      { id: 'go-insights', label: 'Go to insights', icon: 'chart', run: function () { UI.go('insights'); } },
      { id: 'go-capture', label: 'Open the capture inbox', icon: 'inbox', run: function () { UI.go('capture'); } },
      { id: 'go-settings', label: 'Open settings', icon: 'settings', run: function () { UI.go('settings'); } },
      { id: 'view-day', label: 'Calendar: day view', icon: 'list', run: function () { UI.go('calendar', { view: 'day' }); } },
      { id: 'view-week', label: 'Calendar: week view', icon: 'grid', run: function () { UI.go('calendar', { view: 'week' }); } },
      { id: 'view-month', label: 'Calendar: month view', icon: 'grid', run: function () { UI.go('calendar', { view: 'month' }); } },
      { id: 'view-agenda', label: 'Calendar: agenda view', icon: 'list', run: function () { UI.go('calendar', { view: 'agenda' }); } },
      { id: 'view-year', label: 'Calendar: year view', icon: 'grid', run: function () { UI.go('calendar', { view: 'year' }); } },
      { id: 'view-timeline', label: 'Calendar: timeline view', icon: 'chart', run: function () { UI.go('calendar', { view: 'timeline' }); } },
      { id: 'theme', label: 'Switch light / dark', icon: 'moon', run: function () { UI.cycleTheme(); } },
      { id: 'undo', label: 'Undo', icon: 'undo', shortcut: '⌘Z', run: function () { A.undo(); } },
      { id: 'review-week', label: 'Weekly review', icon: 'chart', run: function () { UI.go('planning', { tab: 'week' }); } },
      { id: 'review-month', label: 'Monthly review', icon: 'chart', run: function () { UI.go('planning', { tab: 'month' }); } }
    ];
  }

  function paletteOpen(initial) {
    if (open) return;
    open = true;

    var input = D.h('input.palette__input', {
      type: 'text',
      placeholder: 'Search everything, or type a command…',
      'aria-label': 'Search or run a command',
      'aria-controls': 'palette-list',
      'aria-expanded': 'true',
      role: 'combobox',
      autocomplete: 'off',
      spellcheck: 'false',
      value: initial || '',
      'data-autofocus': ''
    });

    var list = D.h('div.palette__list', { id: 'palette-list', role: 'listbox' });
    var rows = [];
    var active = 0;

    function render() {
      var q = input.value.trim();
      rows = [];
      D.clear(list);

      var groups = [];

      // Jump to a date when the query looks like one.
      var dateGuess = q ? parseDateQuery(q) : null;
      if (dateGuess) {
        groups.push({
          title: 'Jump to', items: [{
            label: 'Go to ' + T.fmtDateLong(dateGuess),
            icon: 'calendar',
            run: function () { UI.go('calendar', { date: T.key(dateGuess) }); }
          }]
        });
      }

      var cmds = commands();
      if (q) {
        var scored = [];
        cmds.forEach(function (c) {
          var res = SEARCH.search ? null : null;
          var idx = c.label.toLowerCase().indexOf(q.toLowerCase());
          var sub = subsequence(q.toLowerCase(), c.label.toLowerCase());
          if (idx >= 0) scored.push({ cmd: c, score: 1000 - idx });
          else if (sub) scored.push({ cmd: c, score: 400 });
        });
        scored.sort(function (a, b) { return b.score - a.score; });
        if (scored.length) {
          groups.push({ title: 'Commands', items: scored.slice(0, 6).map(toCmdItem) });
        }
      } else {
        groups.push({ title: 'Actions', items: cmds.slice(0, 8).map(function (c) { return toCmdItem({ cmd: c }); }) });
      }

      if (q) {
        var results = SEARCH.search(q, { limit: 24 });
        var byType = {};
        results.forEach(function (r) {
          (byType[r.doc.type] || (byType[r.doc.type] = [])).push(r);
        });
        ['event', 'task', 'deadline', 'note', 'project', 'goal', 'habit', 'person', 'location', 'tag'].forEach(function (type) {
          var items = byType[type];
          if (!items || !items.length) return;
          var meta = SEARCH.typeMeta(type);
          groups.push({
            title: meta.label + 's',
            items: items.slice(0, 5).map(function (r) {
              return {
                label: r.doc.title,
                positions: r.positions,
                hint: r.doc.subtitle,
                icon: meta.icon,
                run: function () { UI.openSearchResult(r.doc); }
              };
            })
          });
        });
      }

      if (!groups.length || !groups.some(function (g) { return g.items.length; })) {
        list.appendChild(D.h('p.palette__empty', { text: 'Nothing matches “' + q + '”.' }));
        list.appendChild(D.h('div.palette__empty-actions', [
          D.h('button.btn.btn--sm.btn--primary', {
            type: 'button', onclick: function () { close(); UI.quickAdd({ text: q }); }
          }, 'Add “' + q + '”')
        ]));
        return;
      }

      groups.forEach(function (group) {
        if (!group.items.length) return;
        list.appendChild(D.h('div.palette__group', { text: group.title }));
        group.items.forEach(function (item) {
          var row = D.h('button.palette__row', {
            type: 'button', role: 'option', 'aria-selected': 'false',
            onclick: function () { close(); item.run(); }
          });
          row.appendChild(D.h('span.palette__icon', D.icon(item.icon || 'circle', 16)));
          var labelNode = D.h('span.palette__label');
          if (item.positions && item.positions.length) {
            SEARCH.highlight(item.label, item.positions).forEach(function (part) {
              labelNode.appendChild(part.hit ? D.h('mark', { text: part.text }) : document.createTextNode(part.text));
            });
          } else labelNode.textContent = item.label;
          row.appendChild(labelNode);
          if (item.hint) row.appendChild(D.h('span.palette__hint', { text: item.hint }));
          if (item.shortcut) row.appendChild(D.h('kbd.palette__kbd', { text: item.shortcut }));
          rows.push(row);
          list.appendChild(row);
        });
      });

      active = 0;
      paint();
    }

    function toCmdItem(entry) {
      var c = entry.cmd;
      return {
        label: c.label, hint: c.hint, icon: c.icon, shortcut: c.shortcut,
        run: function () { c.run(); }
      };
    }

    function paint() {
      rows.forEach(function (r, i) {
        var on = i === active;
        r.classList.toggle('is-active', on);
        r.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) {
          input.setAttribute('aria-activedescendant', r.id || (r.id = 'pal-row-' + i));
          r.scrollIntoView({ block: 'nearest' });
        }
      });
    }

    input.addEventListener('input', D.debounce(render, 60));
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (rows.length) { active = (active + 1) % rows.length; paint(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (rows.length) { active = (active - 1 + rows.length) % rows.length; paint(); } }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (rows[active]) rows[active].click();
      } else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });

    layer = UI.modal({
      size: 'md',
      class: 'dialog--palette',
      dismissible: true,
      body: D.h('div.palette', [
        D.h('div.palette__head', [D.icon('search', 17), input]),
        list,
        D.h('div.palette__foot', [
          hintKey('↑↓', 'navigate'), hintKey('↵', 'select'), hintKey('esc', 'close')
        ])
      ]),
      onClose: function () { open = false; layer = null; }
    });
    // The palette is a search box, not a titled dialog.
    var head = D.qs('.dialog__head', layer.node);
    if (head) head.remove();

    render();
    return layer;
  }

  function hintKey(key, label) {
    return D.h('span.palette__foot-item', [D.h('kbd', { text: key }), D.h('span', { text: label })]);
  }

  function close() { if (layer) layer.close(); open = false; }

  function subsequence(needle, hay) {
    var i = 0;
    for (var j = 0; j < hay.length && i < needle.length; j++) {
      if (hay.charAt(j) === needle.charAt(i)) i++;
    }
    return i === needle.length;
  }

  /* "go to march 3", "tomorrow", "next friday" → a date to jump to. */
  function parseDateQuery(q) {
    var cleaned = q.replace(/^(?:go\s+to|jump\s+to|open)\s+/i, '');
    if (!/\d|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|next|week/i.test(cleaned)) return null;
    var parsed = NLP.parse(cleaned);
    return parsed.dayWall || null;
  }

  UI.palette = paletteOpen;
  UI.paletteOpen = function () { return open; };
  UI.commands = commands;
})(window);
