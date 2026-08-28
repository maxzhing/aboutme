/* Cadence — settings. Preferences a person would actually change, grouped the
   way they would look for them. Nothing technical is exposed here. */
(function (global) {
  'use strict';
  var Views = global.Views = global.Views || {};
  var F = null;

  var root = null;
  function rerender() { if (root) render(root); }

  function render(container) {
    F = UI.F;
    root = container;
    var s = S.settings();
    D.clear(container);

    container.appendChild(D.h('header.page__head', [
      D.h('div.page__head-main', [
        D.h('h1.page__title', { text: 'Settings' }),
        D.h('p.page__subtitle', { text: 'Everything saves as you change it.' })
      ])
    ]));

    container.appendChild(section('You', [
      F.field('What should the app call you?', F.text({
        value: s.name, placeholder: 'Your name',
        oninput: D.debounce(function (e) { S.setPref('name', e.target.value.trim()); }, 400)
      }), { hint: 'Used only in the greeting on the Today page.' })
    ]));

    /* ---- appearance ---- */
    container.appendChild(section('Appearance', [
      F.field('Theme', F.segmented({
        value: s.theme, ariaLabel: 'Theme',
        options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }],
        onChange: function (v) { S.setSetting('theme', v); UI.applyTheme(); }
      })),
      F.field('Accent colour', accentPicker(s.accent)),
      F.field('Density', F.segmented({
        value: s.density, ariaLabel: 'Density',
        options: [{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }],
        onChange: function (v) { S.setSetting('density', v); UI.applyTheme(); UI.refresh(); }
      }), { hint: 'Compact fits more of the day on screen.' })
    ]));

    /* ---- calendar ---- */
    container.appendChild(section('Calendar', [
      F.field('Time format', F.segmented({
        value: s.use24Hour ? '24' : '12', ariaLabel: 'Time format',
        options: [{ value: '12', label: '12-hour' }, { value: '24', label: '24-hour' }],
        onChange: function (v) { S.setSetting('use24Hour', v === '24'); UI.refresh(); }
      })),
      F.field('Week starts on', F.select({
        value: String(s.firstDayOfWeek),
        options: T.DAY_NAMES.map(function (n, i) { return { value: String(i), label: n }; }),
        onchange: function (e) { S.setSetting('firstDayOfWeek', +e.target.value); UI.refresh(); }
      })),
      F.field('Default view', F.select({
        value: s.defaultView,
        options: [
          { value: 'day', label: 'Day' }, { value: '3day', label: '3 days' },
          { value: 'week', label: 'Week' }, { value: 'workweek', label: 'Work week' },
          { value: 'month', label: 'Month' }, { value: 'agenda', label: 'Agenda' }
        ],
        onchange: function (e) { S.setSetting('defaultView', e.target.value); }
      })),
      F.field('Day runs from', D.h('div.when__inputs', [
        F.select({
          value: String(s.dayStartHour), ariaLabel: 'Day starts at',
          options: hours(0, 12), onchange: function (e) { S.setSetting('dayStartHour', +e.target.value); UI.refresh(); }
        }),
        D.h('span.when__dash', { text: 'to' }),
        F.select({
          value: String(s.dayEndHour), ariaLabel: 'Day ends at',
          options: hours(13, 23), onchange: function (e) { S.setSetting('dayEndHour', +e.target.value); UI.refresh(); }
        })
      ]), { hint: 'How much of the day the grid shows.' }),
      F.field('Time zone', F.select({
        value: s.timezone,
        options: [{ value: 'local', label: 'Your device (' + T.localZone() + ')' }].concat(
          T.commonZones().map(function (z) { return { value: z, label: z.replace(/_/g, ' ') }; })),
        onchange: function (e) {
          S.setSetting('timezone', e.target.value);
          T.setZone(e.target.value);
          UI.refresh();
        }
      }), { hint: 'Everything is displayed in this zone.' }),
      F.toggleRow('Show week numbers', {
        value: s.showWeekNumbers, hint: 'In the week and month views.',
        onChange: function (v) { S.setSetting('showWeekNumbers', v); UI.refresh(); }
      }),
      F.toggleRow('Show weekends', {
        value: s.showWeekends,
        onChange: function (v) { S.setSetting('showWeekends', v); UI.refresh(); }
      }),
      F.field('Default event length', F.duration({
        value: s.defaultEventDuration,
        onChange: function (v) { if (v) S.setSetting('defaultEventDuration', v); }
      }))
    ]));

    /* ---- working hours ---- */
    container.appendChild(section('Your hours', [
      F.field('Working hours', D.h('div.when__inputs', [
        F.time({
          value: T.atMinutes(T.nowWall(), s.workingHours.start),
          ariaLabel: 'Working hours start',
          onchange: function (e) {
            var p = e.target.value.split(':');
            S.setSetting('workingHours', { start: (+p[0]) * 60 + (+p[1]), end: s.workingHours.end });
            UI.refresh();
          }
        }),
        D.h('span.when__dash', { text: 'to' }),
        F.time({
          value: T.atMinutes(T.nowWall(), s.workingHours.end),
          ariaLabel: 'Working hours end',
          onchange: function (e) {
            var p = e.target.value.split(':');
            S.setSetting('workingHours', { start: S.settings().workingHours.start, end: (+p[0]) * 60 + (+p[1]) });
            UI.refresh();
          }
        })
      ]), { hint: 'Scheduling suggestions stay inside these hours unless you say otherwise.' }),
      F.field('Working days', dayToggles(s.workingDays, function (days) {
        S.setSetting('workingDays', days);
        UI.refresh();
      })),
      F.field('Break between long blocks', numberWithUnit(s.breakMinutes, 'minutes',
        function (v) { S.setSetting('breakMinutes', v); }, 'Break length in minutes')),
      F.field('Buffer around commitments', numberWithUnit(s.bufferMinutes, 'minutes',
        function (v) { S.setSetting('bufferMinutes', v); }, 'Buffer in minutes'),
        { hint: 'Kept free either side of anything already scheduled.' }),
      F.field('Longest single focus block', numberWithUnit(s.maxFocusBlock, 'minutes',
        function (v) { S.setSetting('maxFocusBlock', v); }, 'Longest focus block in minutes'),
        { hint: 'Longer tasks get split across sittings.' }),
      F.field('Free time to protect each day', numberWithUnit(s.minFreeMinutesPerDay, 'minutes',
        function (v) { S.setSetting('minFreeMinutesPerDay', v); }, 'Protected free minutes per day'),
        { hint: 'The planner stops before your day drops below this.' })
    ]));

    /* ---- assistance ---- */
    container.appendChild(section('Assistance', [
      F.toggleRow('Show suggestions', {
        value: s.suggestionsEnabled,
        hint: 'Occasional observations on the Today page. Each one explains itself and can be dismissed.',
        onChange: function (v) { S.setSetting('suggestionsEnabled', v); UI.refresh(); }
      }),
      F.toggleRow('Account for travel time', {
        value: s.travelTimeEnabled,
        hint: 'Events with a travel time block the minutes either side.',
        onChange: function (v) { S.setSetting('travelTimeEnabled', v); UI.refresh(); }
      })
    ]));

    /* ---- notifications ---- */
    container.appendChild(section('Reminders', [
      F.toggleRow('Reminders while the app is open', {
        value: s.notificationsEnabled,
        onChange: function (v) { S.setSetting('notificationsEnabled', v); }
      }),
      F.toggleRow('Also send system notifications', {
        value: s.desktopNotifications,
        hint: 'Your browser will ask permission the first time.',
        onChange: function (v) {
          if (!v) { S.setSetting('desktopNotifications', false); return; }
          UI.requestNotificationPermission().then(function (granted) {
            S.setSetting('desktopNotifications', granted);
            if (!granted) { UI.toast('Your browser declined notification permission'); rerender(); }
          });
        }
      }),
      F.field('Default reminder for events', F.reminders({
        value: s.defaultReminders.event || [],
        onChange: function () { }
      })),
      D.h('p.field__hint', { text: 'Change it here and new events start with it. Existing events keep what they have.' }),
      D.h('button.btn.btn--ghost.btn--sm', {
        type: 'button',
        onclick: function (e) {
          var picker = e.target.closest('.settings__section').querySelector('.reminders');
          if (!picker) return;
          var next = Object.assign({}, S.settings().defaultReminders, { event: picker.getValue() });
          S.setSetting('defaultReminders', next);
          UI.toast('Default reminder saved');
        }
      }, 'Save default reminder')
    ]));

    /* ---- calendars ---- */
    container.appendChild(section('Calendars', [
      calendarList(),
      D.h('button.btn.btn--ghost.btn--sm', {
        type: 'button',
        onclick: function () {
          var name = global.prompt('Calendar name');
          if (!name) return;
          A.createCalendar(name.trim(), F.SWATCHES[Math.floor(Math.random() * F.SWATCHES.length)]);
          rerender();
        }
      }, [D.icon('plus', 14), 'Add a calendar'])
    ]));

    /* ---- categories ---- */
    container.appendChild(section('Categories & time blocks', [
      D.h('p.field__hint', { text: 'Categories colour your calendar and drive the time-block view.' }),
      categoryList(),
      D.h('button.btn.btn--ghost.btn--sm', {
        type: 'button',
        onclick: function () {
          var name = global.prompt('Category name');
          if (!name) return;
          A.createCategory(name.trim(), F.SWATCHES[Math.floor(Math.random() * F.SWATCHES.length)]);
          rerender();
        }
      }, [D.icon('plus', 14), 'Add a category'])
    ]));

    /* ---- templates ---- */
    container.appendChild(section('Event templates', [
      templateList(),
      D.h('p.field__hint', { text: 'Save any event as a template from its “More” menu.' })
    ]));

    /* ---- accessibility ---- */
    container.appendChild(section('Accessibility', [
      F.toggleRow('Reduce motion', {
        value: s.reduceMotion, hint: 'Turns off transitions and animations.',
        onChange: function (v) { S.setSetting('reduceMotion', v); UI.applyTheme(); }
      }),
      F.toggleRow('Higher contrast', {
        value: s.highContrast, hint: 'Stronger borders and text contrast throughout.',
        onChange: function (v) { S.setSetting('highContrast', v); UI.applyTheme(); }
      }),
      F.toggleRow('Larger text', {
        value: s.largeText,
        onChange: function (v) { S.setSetting('largeText', v); UI.applyTheme(); }
      }),
      D.h('p.field__hint', {
        text: 'Every colour cue in the app is paired with a label or an icon, so nothing depends on colour alone.'
      })
    ]));

    /* ---- keyboard ---- */
    container.appendChild(section('Keyboard shortcuts', [shortcutTable()]));

    /* ---- data ---- */
    container.appendChild(section('Your data', [
      D.h('p.field__hint', {
        text: 'Everything lives in this browser. Nothing is sent anywhere. ' +
          'Current size: about ' + Math.round(S.approximateSize() / 1024) + ' KB.'
      }),
      D.h('div.settings__buttons', [
        D.h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: exportData }, [D.icon('download', 15), 'Export a backup']),
        D.h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: importData }, [D.icon('upload', 15), 'Import a backup']),
        D.h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: loadSample }, [D.icon('sparkle', 15), 'Load sample data']),
        D.h('button.btn.btn--ghost.btn--sm.btn--danger-text', { type: 'button', onclick: resetAll }, [D.icon('trash', 15), 'Start over'])
      ])
    ]));
  }

  function section(title, children) {
    return D.h('section.settings__section', [
      D.h('h2.settings__title', { text: title }),
      D.h('div.settings__body', children)
    ]);
  }

  function hours(from, to) {
    var out = [];
    for (var h = from; h <= to; h++) {
      out.push({ value: String(h), label: T.fmtHourLabel(h, S.settings().use24Hour) });
    }
    return out;
  }

  function numberWithUnit(value, unit, onChange, label) {
    var input = UI.F.number({ value: value, min: 0, max: 480, step: 5, ariaLabel: label || unit });
    input.addEventListener('change', function () {
      var v = input.getValue();
      if (v != null) onChange(v);
    });
    return D.h('div.inline-num', [input, D.h('span', { text: unit })]);
  }

  function dayToggles(days, onChange) {
    var state = {};
    (days || []).forEach(function (d) { state[d] = true; });
    var wrap = D.h('div.recur__days', { role: 'group', 'aria-label': 'Working days' });
    T.DAY_SHORT.forEach(function (name, i) {
      var b = D.h('button.recur__day', {
        type: 'button', 'aria-pressed': state[i] ? 'true' : 'false', 'aria-label': T.DAY_NAMES[i],
        onclick: function () {
          state[i] = !state[i];
          b.setAttribute('aria-pressed', state[i] ? 'true' : 'false');
          onChange(Object.keys(state).filter(function (k) { return state[k]; }).map(Number));
        }
      }, name.charAt(0));
      wrap.appendChild(b);
    });
    return wrap;
  }

  var ACCENTS = [
    { id: 'indigo', color: '#4a63d8' },
    { id: 'blue', color: '#2f7fd8' },
    { id: 'teal', color: '#2f9e8f' },
    { id: 'green', color: '#3f9e77' },
    { id: 'amber', color: '#c2871f' },
    { id: 'rose', color: '#c4569a' },
    { id: 'slate', color: '#5c6478' }
  ];

  function accentPicker(value) {
    var wrap = D.h('div.swatches', { role: 'radiogroup', 'aria-label': 'Accent colour' });
    ACCENTS.forEach(function (a) {
      wrap.appendChild(D.h('button.swatch', {
        type: 'button', role: 'radio', 'aria-checked': value === a.id ? 'true' : 'false',
        'aria-label': a.id, title: a.id,
        style: { background: a.color },
        onclick: function () {
          S.setSetting('accent', a.id);
          UI.applyTheme();
          rerender();
        }
      }, value === a.id ? D.icon('check', 13) : null));
    });
    return wrap;
  }

  function calendarList() {
    var list = D.h('div.settings__list');
    S.all('calendars').forEach(function (c) {
      var colorBtn = D.h('button.settings__swatch', {
        type: 'button', 'aria-label': 'Change colour for ' + c.name,
        style: { background: c.color },
        onclick: function (e) {
          UI.menu(e.currentTarget, UI.F.SWATCHES.map(function (col) {
            return {
              label: col, icon: null,
              onClick: function () { A.updateCalendar(c.id, { color: col }); rerender(); }
            };
          }), { align: 'left' });
        }
      });
      list.appendChild(D.h('div.settings__row', [
        colorBtn,
        D.h('input.settings__name', {
          type: 'text', value: c.name, 'aria-label': 'Calendar name',
          onchange: function (e) { A.updateCalendar(c.id, { name: e.target.value }); }
        }),
        D.h('label.checkline', [
          UI.F.toggle({
            value: c.visible !== false, ariaLabel: 'Show ' + c.name,
            onChange: function () { A.toggleCalendar(c.id); }
          }),
          D.h('span.sr-only', { text: 'Visible' })
        ]),
        D.iconButton('trash', 'Delete ' + c.name, function () {
          UI.confirm({
            title: 'Delete “' + c.name + '”?',
            message: 'Its events move to Personal — nothing is lost.',
            confirmLabel: 'Delete', tone: 'danger'
          }).then(function (ok) { if (ok) { A.deleteCalendar(c.id); rerender(); } });
        }, { size: 15 })
      ]));
    });
    return list;
  }

  function categoryList() {
    var list = D.h('div.settings__list');
    S.all('categories').forEach(function (c) {
      list.appendChild(D.h('div.settings__row', [
        D.h('button.settings__swatch', {
          type: 'button', 'aria-label': 'Change colour for ' + c.name,
          style: { background: c.color },
          onclick: function (e) {
            UI.menu(e.currentTarget, UI.F.SWATCHES.map(function (col) {
              return { label: col, onClick: function () { A.updateCategory(c.id, { color: col }); rerender(); } };
            }), { align: 'left' });
          }
        }),
        D.h('input.settings__name', {
          type: 'text', value: c.name, 'aria-label': 'Category name',
          onchange: function (e) { A.updateCategory(c.id, { name: e.target.value }); }
        }),
        D.iconButton('trash', 'Delete ' + c.name, function () {
          UI.confirm({
            title: 'Delete “' + c.name + '”?',
            message: 'Items using it keep their own colours.',
            confirmLabel: 'Delete', tone: 'danger'
          }).then(function (ok) { if (ok) { A.deleteCategory(c.id); rerender(); } });
        }, { size: 15 })
      ]));
    });
    return list;
  }

  function templateList() {
    var templates = S.all('templates');
    if (!templates.length) return D.h('p.card__note', { text: 'No templates saved yet.' });
    var list = D.h('div.settings__list');
    templates.forEach(function (t) {
      list.appendChild(D.h('div.settings__row', [
        D.h('span.settings__name-static', { text: t.name }),
        D.h('span.settings__meta', { text: t.payload.durationMinutes ? T.humanDuration(t.payload.durationMinutes) : '' }),
        D.h('button.btn.btn--ghost.btn--sm', {
          type: 'button',
          onclick: function () {
            var start = T.snap(T.nowWall(), 30);
            UI.editEvent({
              title: t.payload.title,
              start: T.iso(start),
              end: T.iso(T.addMinutes(start, t.payload.durationMinutes || 60)),
              categoryId: t.payload.categoryId,
              calendarId: t.payload.calendarId,
              location: t.payload.location,
              travelMinutes: t.payload.travelMinutes,
              description: t.payload.description,
              reminders: t.payload.reminders,
              tags: t.payload.tags
            });
          }
        }, 'Use'),
        D.iconButton('trash', 'Delete template ' + t.name, function () {
          A.deleteTemplate(t.id); rerender();
        }, { size: 15 })
      ]));
    });
    return list;
  }

  function shortcutTable() {
    var rows = [
      ['⌘K / Ctrl+K', 'Command palette'],
      ['/', 'Search'],
      ['C', 'Quick add'],
      ['N', 'New event'],
      ['T', 'New task'],
      ['D', 'Go to today'],
      ['W / M / A / Y', 'Week, month, agenda, year view'],
      ['1 – 8', 'Switch calendar view'],
      ['← / →', 'Previous / next period'],
      ['P', 'Plan my day'],
      ['F', 'Focus mode'],
      ['G', 'What should I do now?'],
      ['⌘Z / Ctrl+Z', 'Undo'],
      ['⇧⌘Z / Ctrl+Y', 'Redo'],
      ['Delete', 'Delete the selected event'],
      ['Esc', 'Close whatever is open'],
      ['?', 'Show this list']
    ];
    var table = D.h('dl.shortcuts');
    rows.forEach(function (r) {
      table.appendChild(D.h('div.shortcuts__row', [
        D.h('dt', D.h('kbd', { text: r[0] })),
        D.h('dd', { text: r[1] })
      ]));
    });
    return table;
  }

  /* ------------------------------------------------------------- data */

  function exportData() {
    try {
      var blob = new Blob([S.exportJSON()], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = D.h('a', { href: url, download: 'cadence-backup-' + T.key(T.nowWall()) + '.json' });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      UI.toast('Backup downloaded');
    } catch (e) {
      UI.toast('We could not create the backup file. Your data is untouched.', { tone: 'warn' });
    }
  }

  function importData() {
    var input = D.h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only' });
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      var file = input.files[0];
      document.body.removeChild(input);
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var parsed;
        try { parsed = JSON.parse(reader.result); }
        catch (e) {
          UI.toast('That file is not a Cadence backup. Nothing was changed.', { tone: 'warn' });
          return;
        }
        UI.confirm({
          title: 'Replace everything with this backup?',
          message: 'Your current events, tasks and notes will be replaced by the contents of the file.',
          confirmLabel: 'Replace', tone: 'danger'
        }).then(function (ok) {
          if (!ok) return;
          S.replaceState(parsed);
          UI.applyTheme();
          UI.refresh();
          UI.toast('Backup restored');
        });
      };
      reader.onerror = function () { UI.toast('We could not read that file. Try again.', { tone: 'warn' }); };
      reader.readAsText(file);
    });
    input.click();
  }

  function loadSample() {
    UI.confirm({
      title: 'Load the sample week?',
      message: 'This replaces everything currently in the app with a realistic example.',
      confirmLabel: 'Load sample', tone: 'danger'
    }).then(function (ok) {
      if (!ok) return;
      var sample = SEED.build();
      // Loading the sample deliberately should not re-run first-run setup.
      sample.settings = Object.assign({}, S.settings(), { onboarded: true });
      S.replaceState(sample);
      UI.applyTheme();
      UI.refresh();
      UI.toast('Sample data loaded');
    });
  }

  function resetAll() {
    UI.confirm({
      title: 'Delete everything and start over?',
      message: 'This cannot be undone. Export a backup first if you want to keep any of it.',
      confirmLabel: 'Delete everything', tone: 'danger'
    }).then(function (ok) {
      if (!ok) return;
      S.reset();
      UI.applyTheme();
      UI.refresh();
      UI.toast('Everything cleared');
    });
  }

  Views.settings = { render: render, rerender: rerender, shortcutTable: shortcutTable };
})(window);
