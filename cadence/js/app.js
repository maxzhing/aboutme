/* Cadence — the shell. Routing, navigation, keyboard control, theming,
   reminders and first-run onboarding. */
(function (global) {
  'use strict';
  var UI = global.UI = global.UI || {};

  var ROUTES = [
    { id: 'today', label: 'Today', icon: 'home', view: 'today' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar', view: 'calendar' },
    { id: 'tasks', label: 'Tasks', icon: 'checkSquare', view: 'tasks', badge: 'tasks' },
    { id: 'capture', label: 'Inbox', icon: 'inbox', view: 'capture', badge: 'captures' },
    { id: 'notes', label: 'Notes', icon: 'note', view: 'notes' },
    { id: 'projects', label: 'Projects', icon: 'folder', view: 'projects' },
    { id: 'goals', label: 'Goals', icon: 'target', view: 'goals' },
    { id: 'habits', label: 'Habits', icon: 'repeat', view: 'habits' },
    { id: 'planning', label: 'Planning', icon: 'compass', view: 'planning' },
    { id: 'insights', label: 'Insights', icon: 'chart', view: 'insights' },
    { id: 'search', label: 'Search', icon: 'search', view: 'search' },
    { id: 'settings', label: 'Settings', icon: 'settings', view: 'settings' }
  ];

  var MOBILE_ROUTES = ['today', 'calendar', 'tasks', 'notes', 'search'];

  var current = { route: 'today', params: {} };
  var viewNode = null;
  var sidebarNode = null;
  var dockNode = null;

  /* ------------------------------------------------------------- theme */

  function applyTheme() {
    var s = S.settings();
    var el = document.documentElement;
    var theme = s.theme;
    if (theme === 'system') {
      theme = global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    el.setAttribute('data-theme', theme);
    el.setAttribute('data-accent', s.accent || 'indigo');
    el.setAttribute('data-density', s.density || 'comfortable');
    el.classList.toggle('is-contrast', !!s.highContrast);
    el.classList.toggle('is-large-text', !!s.largeText);
    el.classList.toggle('is-reduced-motion', !!s.reduceMotion);
    var meta = D.qs('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#101216' : '#f7f8fa');
  }

  function cycleTheme() {
    var order = ['light', 'dark', 'system'];
    var next = order[(order.indexOf(S.settings().theme) + 1) % order.length];
    S.setSetting('theme', next);
    applyTheme();
    UI.toast('Theme: ' + next);
    renderShellChrome();
  }

  /* ----------------------------------------------------------- routing */

  function go(route, params) {
    if (!ROUTES.some(function (r) { return r.id === route; })) route = 'today';
    current = { route: route, params: params || {} };
    if (route === 'search' && params && params.q !== undefined && Views.search) Views.search.setQuery(params.q);
    try {
      global.history.replaceState(null, '', '#' + route + (params && params.date ? '/' + params.date : ''));
    } catch (e) { /* file:// has no history to write to */ }
    renderView();
    renderShellChrome();
    var main = D.qs('#view');
    if (main) main.scrollTop = 0;
    var title = ROUTES.filter(function (r) { return r.id === route; })[0];
    document.title = (title ? title.label + ' · ' : '') + 'Cadence';
  }

  function renderView() {
    if (!viewNode) return;
    var def = ROUTES.filter(function (r) { return r.id === current.route; })[0] || ROUTES[0];
    var view = Views[def.view];
    D.clear(viewNode);
    viewNode.className = 'view view--' + def.id;
    if (!view) {
      viewNode.appendChild(UI.emptyState({ icon: 'alert', title: 'That page is missing', body: 'Try another section.' }));
      return;
    }
    try {
      view.render(viewNode, current.params);
    } catch (e) {
      console.error('view render failed', e);
      D.clear(viewNode);
      viewNode.appendChild(UI.emptyState({
        icon: 'alert',
        title: 'Something went wrong drawing this page',
        body: 'Your data is safe. Try another section, or reload.',
        actions: [{ label: 'Reload', onClick: function () { global.location.reload(); } }]
      }));
    }
    updateDock();
  }

  function refresh() {
    renderView();
    renderShellChrome();
  }

  /* ------------------------------------------------------------- shell */

  function buildShell() {
    var app = D.h('div.app');

    /* --- sidebar --- */
    sidebarNode = D.h('aside.sidebar', { 'aria-label': 'Main navigation' });
    app.appendChild(sidebarNode);

    /* --- main --- */
    var main = D.h('main.main');
    main.appendChild(buildTopbar());
    viewNode = D.h('div#view.view', { tabindex: '-1' });
    main.appendChild(viewNode);
    app.appendChild(main);

    dockNode = D.h('aside.dock', { 'aria-label': 'Unscheduled tasks', hidden: true });
    app.appendChild(dockNode);

    document.body.appendChild(app);
    document.body.appendChild(buildMobileNav());
    document.body.appendChild(buildFab());
    renderSidebar();
  }

  function buildTopbar() {
    var bar = D.h('header.topbar');

    var menuBtn = D.iconButton('menu', 'Open navigation', function () {
      document.documentElement.classList.toggle('nav-open');
    }, { class: 'topbar__menu' });

    var brand = D.h('button.topbar__brand', {
      type: 'button', onclick: function () { go('today'); }, 'aria-label': 'Cadence home'
    }, [
      D.h('span.brand__mark', { 'aria-hidden': 'true' }, D.icon('calendar', 17)),
      D.h('span.brand__name', { text: 'Cadence' })
    ]);

    var search = D.h('button.topbar__search', {
      type: 'button',
      onclick: function () { UI.palette(); },
      'aria-label': 'Search or run a command'
    }, [
      D.icon('search', 16),
      D.h('span.topbar__search-text', { text: 'Search or type a command' }),
      D.h('kbd.topbar__kbd', { text: isMac() ? '⌘K' : 'Ctrl K' })
    ]);

    var actions = D.h('div.topbar__actions', [
      D.h('button.btn.btn--ghost.btn--sm.topbar__whatnow', {
        type: 'button', onclick: function () { UI.whatNowDialog(); },
        title: 'What should I do now? (G)'
      }, [D.icon('compass', 15), D.h('span.topbar__label', { text: 'What now?' })]),
      D.iconButton('undo', 'Undo (Ctrl+Z)', function () { A.undo(); }, { class: 'topbar__undo' }),
      D.iconButton('moon', 'Switch theme', function () { cycleTheme(); }, { class: 'topbar__theme' }),
      D.h('button.btn.btn--primary.btn--sm.topbar__add', {
        type: 'button',
        onclick: function (e) { UI.addMenu(e.currentTarget); },
        'aria-haspopup': 'menu'
      }, [D.icon('plus', 16), D.h('span.topbar__label', { text: 'Add' })])
    ]);

    bar.appendChild(D.h('div.topbar__left', [menuBtn, brand]));
    bar.appendChild(search);
    bar.appendChild(actions);
    return bar;
  }

  function renderSidebar() {
    if (!sidebarNode) return;
    D.clear(sidebarNode);
    var counts = Q.counts();

    var nav = D.h('nav.nav', { 'aria-label': 'Sections' });
    ROUTES.forEach(function (r) {
      if (r.id === 'search') return; // reachable from the top bar and ⌘K
      var badge = null;
      if (r.badge === 'tasks' && (counts.overdue || counts.today)) badge = String(counts.overdue + counts.today);
      if (r.badge === 'captures' && counts.captures) badge = String(counts.captures);
      var item = D.h('button.nav__item' + (current.route === r.id ? '.is-active' : ''), {
        type: 'button',
        'aria-current': current.route === r.id ? 'page' : null,
        onclick: function () { go(r.id); document.documentElement.classList.remove('nav-open'); }
      }, [
        D.h('span.nav__icon', D.icon(r.icon, 17)),
        D.h('span.nav__label', { text: r.label }),
        badge ? D.h('span.nav__badge', { text: badge }) : null
      ]);
      nav.appendChild(item);
    });
    sidebarNode.appendChild(nav);

    sidebarNode.appendChild(D.h('div.sidebar__block', Views.calendar.miniCalendar({
      onPick: function (day) { go('calendar', { date: T.key(day) }); }
    })));

    /* quick actions */
    sidebarNode.appendChild(D.h('div.sidebar__block.sidebar__actions', [
      sideAction('sparkle', 'Plan my day', function () { UI.planDayDialog(); }),
      sideAction('zap', 'Organize a dump', function () { UI.organizeDialog(); }),
      sideAction('focus', 'Focus mode', function () { UI.focusEntry(); })
    ]));

    /* layers */
    var layers = D.h('div.sidebar__block');
    layers.appendChild(D.h('h2.sidebar__title', { text: 'Calendars' }));
    S.all('calendars').forEach(function (c) {
      layers.appendChild(layerToggle(c.name, c.color, c.visible !== false, function () {
        A.toggleCalendar(c.id);
        renderSidebar();
        renderView();
      }));
    });
    layers.appendChild(D.h('h2.sidebar__title', { text: 'Layers' }));
    M.LAYERS.forEach(function (l) {
      layers.appendChild(layerToggle(l.label, null, Q.layerOn(l.id), function () {
        A.toggleLayer(l.id);
        renderSidebar();
        renderView();
      }));
    });
    sidebarNode.appendChild(layers);
  }

  function sideAction(icon, label, onClick) {
    return D.h('button.sidebar__action', { type: 'button', onclick: onClick }, [D.icon(icon, 15), D.h('span', { text: label })]);
  }

  function layerToggle(label, color, on, onToggle) {
    return D.h('button.layer' + (on ? '.is-on' : ''), {
      type: 'button', role: 'switch', 'aria-checked': on ? 'true' : 'false', onclick: onToggle
    }, [
      D.h('span.layer__box', { style: color ? { '--layer-color': color } : null }, on ? D.icon('check', 12) : null),
      D.h('span.layer__label', { text: label })
    ]);
  }

  function renderShellChrome() {
    renderSidebar();
    D.qsa('.mobilenav__item').forEach(function (btn) {
      var on = btn.dataset.route === current.route;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-current', on ? 'page' : 'false');
    });
    var undo = D.qs('.topbar__undo');
    if (undo) {
      undo.disabled = !S.canUndo();
      undo.title = S.canUndo() ? 'Undo ' + (S.lastLabel() || '').toLowerCase() : 'Nothing to undo';
    }
  }

  function buildMobileNav() {
    var nav = D.h('nav.mobilenav', { 'aria-label': 'Sections' });
    MOBILE_ROUTES.forEach(function (id) {
      var r = ROUTES.filter(function (x) { return x.id === id; })[0];
      var btn = D.h('button.mobilenav__item', {
        type: 'button',
        onclick: function () { go(r.id); }
      }, [D.h('span.mobilenav__icon', D.icon(r.icon, 20)), D.h('span.mobilenav__label', { text: r.label })]);
      btn.dataset.route = r.id;
      nav.appendChild(btn);
    });
    return nav;
  }

  function buildFab() {
    return D.h('button.fab', {
      type: 'button',
      'aria-label': 'Add something',
      onclick: function (e) { UI.addMenu(e.currentTarget); }
    }, D.icon('plus', 22));
  }

  /* Unscheduled tasks beside the calendar, so dragging one onto a day works. */
  function updateDock() {
    if (!dockNode) return;
    var show = current.route === 'calendar' && global.innerWidth >= 1180;
    dockNode.hidden = !show;
    document.documentElement.classList.toggle('has-dock', show);
    if (!show) return;

    D.clear(dockNode);
    dockNode.appendChild(D.h('div.dock__head', [
      D.h('h2.dock__title', { text: 'Unscheduled' }),
      D.iconButton('plus', 'New task', function () { UI.editTask(null); }, { size: 15 })
    ]));
    dockNode.appendChild(D.h('p.dock__hint', { text: 'Drag one onto the calendar to give it time.' }));

    var tasks = SCHED.rankedTasks(T.nowWall(), { excludeScheduled: true, horizonDays: 60 }).slice(0, 14);
    if (!tasks.length) {
      dockNode.appendChild(UI.emptyState({
        icon: 'check', title: 'Everything has a home',
        body: 'No unscheduled tasks are waiting.'
      }));
      return;
    }
    var list = D.h('ul.dock__list');
    tasks.forEach(function (entry) {
      list.appendChild(dockRow(entry));
    });
    dockNode.appendChild(list);
  }

  function dockRow(entry) {
    var task = entry.task;
    var minutes = Q.taskEstimate(task);
    var row = D.h('li.dock__task', {
      tabindex: '0',
      role: 'button',
      'aria-label': task.title + ', ' + T.humanDuration(minutes) + '. Press Enter to find time.',
      style: { '--task-color': Q.taskColor(task) }
    }, [
      D.h('span.dock__task-title', { text: task.title }),
      D.h('span.dock__task-meta', {
        text: T.humanDuration(minutes) + (task.due ? ' · due ' + T.relativeDay(T.w(task.due)).toLowerCase() : '')
      })
    ]);

    row.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      UI.findTimeDialog({
        minutes: minutes, title: task.title, before: task.due,
        onPick: function (slot) { A.scheduleTask(task.id, slot.start, slot.minutes); }
      });
    });

    row.addEventListener('pointerdown', function (e) {
      DND.drag(e, {
        onStart: function () {
          DND.setPayload({ kind: 'task', id: task.id, minutes: minutes, title: task.title });
          DND.showGhost(task.title, Q.taskColor(task));
          row.classList.add('is-dragging-src');
        },
        onMove: function () { },
        onEnd: function () { row.classList.remove('is-dragging-src'); },
        onCancel: function () { row.classList.remove('is-dragging-src'); },
        onClick: function () { UI.editTask(task); }
      });
    });
    return row;
  }

  /* --------------------------------------------------------- shortcuts */

  function isMac() {
    return /Mac|iPhone|iPad/.test(global.navigator.platform || global.navigator.userAgent || '');
  }

  function isTypingTarget(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function onKeyDown(e) {
    var mod = e.metaKey || e.ctrlKey;

    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); UI.palette(); return; }
    if (mod && e.key.toLowerCase() === 'z') {
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      if (e.shiftKey) A.redo(); else A.undo();
      return;
    }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); A.redo(); return; }

    if (e.key === 'Escape') {
      if (UI.focusActive()) { UI.exitFocus(); return; }
      if (UI.closeTop()) return;
      if (document.documentElement.classList.contains('nav-open')) {
        document.documentElement.classList.remove('nav-open');
        return;
      }
      return;
    }

    if (isTypingTarget(e.target) || UI.anyOpen() || UI.focusActive()) return;
    if (e.altKey || mod) return;

    var k = e.key.toLowerCase();
    switch (k) {
      case '/': e.preventDefault(); go('search'); return;
      case 'c': e.preventDefault(); UI.quickAdd(); return;
      case 'n': e.preventDefault(); UI.editEvent(null); return;
      case 't': e.preventDefault(); UI.editTask(null); return;
      case 'p': e.preventDefault(); UI.planDayDialog(); return;
      case 'f': e.preventDefault(); UI.focusEntry(); return;
      case 'g': e.preventDefault(); UI.whatNowDialog(); return;
      case 'd':
        e.preventDefault();
        if (current.route === 'calendar') Views.calendar.goToDate(T.nowWall());
        else go('today');
        return;
      case '?': e.preventDefault(); showShortcuts(); return;
    }
    if (e.key === '?') { e.preventDefault(); showShortcuts(); return; }

    if (current.route === 'calendar' && Views.calendar.handleKey(e)) { e.preventDefault(); return; }

    // View letters work from anywhere; they take you to the calendar.
    if (['w', 'm', 'a', 'y'].indexOf(k) >= 0) {
      e.preventDefault();
      var map = { w: 'week', m: 'month', a: 'agenda', y: 'year' };
      go('calendar', { view: map[k] });
    }
  }

  function showShortcuts() {
    UI.modal({
      size: 'md',
      title: 'Keyboard shortcuts',
      body: Views.settings.shortcutTable()
    });
  }

  /* --------------------------------------------------------- reminders */

  var reminderTimer = null;

  function startReminders() {
    if (reminderTimer) clearInterval(reminderTimer);
    reminderTimer = setInterval(checkReminders, 30000);
    setTimeout(checkReminders, 4000);
  }

  function checkReminders() {
    var s = S.settings();
    if (!s.notificationsEnabled) return;
    var now = T.nowWall();
    var horizon = T.addMinutes(now, 1);
    var log = S.state.reminderLog || {};
    var fired = [];

    Q.eventsInRange(T.startOfDay(now), T.addDays(now, 3), { ignoreLayers: true }).forEach(function (ev) {
      var mins = ev.reminders || s.defaultReminders.event || [];
      mins.forEach(function (m) {
        var at = T.addMinutes(ev.startWall, -m);
        if (at > horizon || at < T.addMinutes(now, -5)) return;
        var key = ev.instanceId + '@' + m;
        if (log[key]) return;
        fired.push({ key: key, title: ev.title, body: reminderBody(ev, m), instance: ev });
      });
    });

    S.all('deadlines').filter(function (d) { return !d.done; }).forEach(function (d) {
      var due = T.w(d.due);
      var mins = d.reminders || s.defaultReminders.deadline || [1440];
      mins.forEach(function (m) {
        var at = T.addMinutes(due, -m);
        if (at > horizon || at < T.addMinutes(now, -5)) return;
        var key = d.id + '@dl' + m;
        if (log[key]) return;
        fired.push({
          key: key, title: d.title,
          body: 'Due ' + T.relativeTime(due, now) + ' (' + T.fmtDateShort(due) + ')',
          deadline: d
        });
      });
    });

    if (!fired.length) return;
    S.quiet(function (st) {
      st.reminderLog = st.reminderLog || {};
      fired.forEach(function (f) { st.reminderLog[f.key] = Date.now(); });
      // Keep the log from growing forever.
      var keys = Object.keys(st.reminderLog);
      if (keys.length > 400) {
        keys.sort(function (a, b) { return st.reminderLog[a] - st.reminderLog[b]; })
          .slice(0, keys.length - 300)
          .forEach(function (k) { delete st.reminderLog[k]; });
      }
    }, true);

    fired.slice(0, 3).forEach(function (f) {
      UI.toast(f.title + ' — ' + f.body, {
        duration: 12000,
        actions: [{
          label: 'Open',
          onClick: function () {
            if (f.instance) UI.editEvent(f.instance);
            else if (f.deadline) UI.editDeadline(f.deadline);
          }
        }]
      });
      if (s.desktopNotifications && global.Notification && Notification.permission === 'granted') {
        try { new Notification(f.title, { body: f.body, tag: f.key }); } catch (e) { }
      }
    });
  }

  function reminderBody(ev, minutes) {
    var s = S.settings();
    if (minutes === 0) return 'Starting now';
    if (ev.travelMinutes && s.travelTimeEnabled && minutes >= ev.travelMinutes) {
      return 'In ' + T.humanDuration(minutes) + ' · leave around ' +
        T.fmtTime(T.addMinutes(ev.startWall, -ev.travelMinutes), s.use24Hour);
    }
    return 'In ' + T.humanDuration(minutes) + ' at ' + T.fmtTime(ev.startWall, s.use24Hour);
  }

  function requestNotificationPermission() {
    return new Promise(function (resolve) {
      if (!global.Notification) { resolve(false); return; }
      if (Notification.permission === 'granted') { resolve(true); return; }
      if (Notification.permission === 'denied') { resolve(false); return; }
      Notification.requestPermission().then(function (p) { resolve(p === 'granted'); })
        .catch(function () { resolve(false); });
    });
  }

  /* -------------------------------------------------------- onboarding */

  function onboarding() {
    var answers = { purposes: [], start: 8 * 60, end: 18 * 60, view: 'week', reminders: true, name: '' };
    var stepIndex = 0;
    var bodyNode = D.h('div.onboard');
    var footNode = D.h('div.onboard__foot');

    var layer = UI.modal({
      size: 'md',
      class: 'dialog--onboard',
      dismissible: false,
      title: 'Welcome to Cadence',
      subtitle: 'Four quick questions. Skip any of them.',
      body: bodyNode,
      footer: footNode
    });

    var steps = [
      {
        title: 'What do you mostly use a calendar for?',
        hint: 'Pick any that fit. It only changes which categories appear first.',
        render: function () {
          var options = [
            { id: 'school', label: 'School or study' },
            { id: 'work', label: 'Work' },
            { id: 'personal', label: 'Personal life' },
            { id: 'projects', label: 'Projects and deadlines' },
            { id: 'habits', label: 'Habits and routines' }
          ];
          var wrap = D.h('div.onboard__choices');
          options.forEach(function (o) {
            var on = answers.purposes.indexOf(o.id) >= 0;
            var btn = D.h('button.onboard__choice', {
              type: 'button', 'aria-pressed': on ? 'true' : 'false',
              onclick: function () {
                var i = answers.purposes.indexOf(o.id);
                if (i >= 0) answers.purposes.splice(i, 1); else answers.purposes.push(o.id);
                btn.setAttribute('aria-pressed', answers.purposes.indexOf(o.id) >= 0 ? 'true' : 'false');
              }
            }, o.label);
            wrap.appendChild(btn);
          });
          return wrap;
        }
      },
      {
        title: 'When are you usually working or in class?',
        hint: 'Used to find realistic slots. You can change it any time.',
        render: function () {
          var start = UI.F.time({ value: T.atMinutes(T.nowWall(), answers.start) });
          var end = UI.F.time({ value: T.atMinutes(T.nowWall(), answers.end) });
          start.addEventListener('change', function () { answers.start = start.getValue(); });
          end.addEventListener('change', function () { answers.end = end.getValue(); });
          return D.h('div.when__inputs', [start, D.h('span.when__dash', { text: 'to' }), end]);
        }
      },
      {
        title: 'Which calendar view do you prefer?',
        render: function () {
          return UI.F.segmented({
            value: answers.view, ariaLabel: 'Preferred view',
            options: [
              { value: 'day', label: 'Day' }, { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' }, { value: 'agenda', label: 'Agenda' }
            ],
            onChange: function (v) { answers.view = v; }
          });
        }
      },
      {
        title: 'Reminders?',
        hint: 'Ten minutes before events, a day before deadlines. Nothing else.',
        render: function () {
          return UI.F.toggleRow('Remind me while the app is open', {
            value: answers.reminders,
            onChange: function (v) { answers.reminders = v; }
          });
        }
      }
    ];

    function paint() {
      D.clear(bodyNode);
      D.clear(footNode);
      var step = steps[stepIndex];
      bodyNode.appendChild(D.h('div.onboard__progress', steps.map(function (s, i) {
        return D.h('span.onboard__pip' + (i <= stepIndex ? '.is-on' : ''));
      })));
      bodyNode.appendChild(D.h('h3.onboard__title', { text: step.title }));
      if (step.hint) bodyNode.appendChild(D.h('p.onboard__hint', { text: step.hint }));
      bodyNode.appendChild(step.render());

      footNode.appendChild(D.h('div.sheet__foot-left',
        D.h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: finish }, 'Skip all')));
      footNode.appendChild(D.h('div.sheet__foot-right', [
        stepIndex > 0 ? D.h('button.btn.btn--ghost', {
          type: 'button', onclick: function () { stepIndex--; paint(); }
        }, 'Back') : null,
        D.h('button.btn.btn--primary', {
          type: 'button',
          onclick: function () {
            if (stepIndex < steps.length - 1) { stepIndex++; paint(); }
            else finish();
          }
        }, stepIndex < steps.length - 1 ? 'Next' : 'Get started')
      ]));
    }

    function finish() {
      S.commit('Finish setup', function (st) {
        st.settings.onboarded = true;
        st.settings.purposes = answers.purposes;
        if (answers.start != null && answers.end != null && answers.end > answers.start) {
          st.settings.workingHours = { start: answers.start, end: answers.end };
        }
        st.settings.defaultView = answers.view;
        st.settings.lastView = answers.view;
        st.settings.notificationsEnabled = answers.reminders;
      }, ['settings']);
      layer.close();
      applyTheme();
      go('today');
      UI.toast('You can change any of that in Settings');
    }

    paint();
  }

  /* --------------------------------------------------------------- boot */

  function boot() {
    var loaded = S.load();
    if (!loaded) {
      // A first run should look like a real week, not an empty grid.
      S.replaceState(SEED.build());
    }
    if (S.storageError() === 'corrupt') {
      setTimeout(function () {
        UI.toast('Your saved data could not be read, so we started fresh. The old copy was kept in case you need it.', { duration: 12000, tone: 'warn' });
      }, 800);
    }

    T.setZone(S.settings().timezone);
    applyTheme();
    // Announcement targets must be in the DOM before anything changes.
    D.ensureLiveRegion();
    UI.ensureToastStack();
    buildShell();

    if (global.matchMedia) {
      var mq = global.matchMedia('(prefers-color-scheme: dark)');
      var onScheme = function () { if (S.settings().theme === 'system') applyTheme(); };
      if (mq.addEventListener) mq.addEventListener('change', onScheme);
      else if (mq.addListener) mq.addListener(onScheme);
    }

    var initial = (global.location.hash || '').replace('#', '').split('/');
    var route = initial[0] || (S.settings().onboarded ? 'today' : 'today');
    go(ROUTES.some(function (r) { return r.id === route; }) ? route : 'today',
      initial[1] ? { date: initial[1] } : {});

    document.addEventListener('keydown', onKeyDown, true);
    global.addEventListener('resize', D.debounce(function () { updateDock(); }, 150));

    /* Views re-draw on state change, unless the user is mid-typing in one. */
    var scheduled = false;
    S.on('change', function () {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        var active = document.activeElement;
        if (active && viewNode && viewNode.contains(active) &&
          (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          renderShellChrome();
          return;
        }
        refresh();
      });
    });

    S.on('save-error', function (kind) {
      UI.toast(
        kind === 'quota'
          ? 'This browser is out of storage space, so the last change was not saved. Export a backup and remove some attachments.'
          : 'We could not save that change. Your work is still on screen — try again.',
        { duration: 14000, tone: 'warn' }
      );
    });

    startReminders();

    // Keep "today" honest across midnight and keep the now-line moving.
    setInterval(function () {
      if (current.route === 'calendar' || current.route === 'today') {
        if (!UI.anyOpen() && !UI.focusActive()) renderView();
      }
    }, 60000);

    if (!S.settings().onboarded) setTimeout(onboarding, 400);
  }

  Object.assign(UI, {
    go: go,
    refresh: refresh,
    applyTheme: applyTheme,
    cycleTheme: cycleTheme,
    requestNotificationPermission: requestNotificationPermission,
    openSearchResult: function (doc) { Views.search.openResult(doc); },
    routes: ROUTES,
    currentRoute: function () { return current; },
    showShortcuts: showShortcuts,
    onboarding: onboarding
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
