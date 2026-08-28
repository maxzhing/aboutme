/* Cadence — quick add, quick capture and the Organize review flow.

   The path from a messy thought to a scheduled action runs through here, and it
   always ends in a review step: the app shows exactly what it understood before
   anything is written. */
(function (global) {
  'use strict';
  var UI = global.UI = global.UI || {};
  var F = UI.F;

  var TYPE_OPTIONS = [
    { value: 'event', label: 'Event', icon: 'calendar', hint: 'Happens at a specific time' },
    { value: 'task', label: 'Task', icon: 'checkSquare', hint: 'Something to get done' },
    { value: 'deadline', label: 'Deadline', icon: 'flag', hint: 'A point something is due by' },
    { value: 'note', label: 'Note', icon: 'note', hint: 'Information to keep' },
    { value: 'habit', label: 'Habit', icon: 'repeat', hint: 'Something you repeat' },
    { value: 'project', label: 'Project', icon: 'folder', hint: 'A body of related work' },
    { value: 'goal', label: 'Goal', icon: 'target', hint: 'A long-term outcome' }
  ];

  var EXAMPLES = [
    'Study biology tomorrow from 4-6',
    'Doctor appointment Friday at 3',
    'Finish history project before Monday',
    'Practice piano for 45 minutes every weekday',
    'Remind me to submit the application next Thursday'
  ];

  /* ------------------------------------------------------------- quick add */

  function quickAdd(opts) {
    opts = opts || {};
    var parsed = null;
    var typeOverride = opts.type || null;

    var input = D.h('input.qa__input', {
      type: 'text',
      placeholder: EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)],
      'aria-label': 'Describe what you want to add',
      value: opts.text || '',
      autocomplete: 'off',
      spellcheck: 'false',
      'data-autofocus': ''
    });

    var preview = D.h('div.qa__preview', { 'aria-live': 'polite' });
    var typeRow = D.h('div.qa__types', { role: 'radiogroup', 'aria-label': 'What kind of item is this?' });

    function reparse() {
      var text = input.value.trim();
      if (!text) { parsed = null; renderEmpty(); return; }
      parsed = NLP.parse(text, opts.now ? { now: opts.now } : null);
      if (typeOverride) parsed.type = typeOverride;
      if (opts.projectId && !parsed.projectId) parsed.projectId = opts.projectId;
      NLP.toPayload(parsed); // keeps materialised fields in step with the type
      renderPreview();
    }

    function renderEmpty() {
      D.clear(preview);
      D.clear(typeRow);
      preview.appendChild(D.h('div.qa__hints', [
        D.h('p.qa__hints-title', { text: 'Try typing something like:' }),
        D.h('ul.qa__hints-list', EXAMPLES.map(function (e) {
          return D.h('li', D.h('button.qa__hint', {
            type: 'button',
            onclick: function () { input.value = e; reparse(); input.focus(); }
          }, e));
        }))
      ]));
    }

    function renderPreview() {
      D.clear(preview);
      D.clear(typeRow);

      TYPE_OPTIONS.forEach(function (t) {
        var active = parsed.type === t.value;
        var btn = D.h('button.qa__type', {
          type: 'button', role: 'radio', 'aria-checked': active ? 'true' : 'false',
          title: t.hint,
          onclick: function () {
            typeOverride = t.value;
            reparseAsType(t.value);
          }
        }, [D.icon(t.icon, 15), D.h('span', { text: t.label })]);
        typeRow.appendChild(btn);
      });

      var card = D.h('div.qa__card');
      card.appendChild(D.h('div.qa__card-title', { text: parsed.title || 'Untitled' }));

      var chips = D.h('div.qa__chips');
      summaryChips(parsed).forEach(function (c) {
        chips.appendChild(D.h('span.qa__chip' + (c.inferred ? '.is-inferred' : ''), [
          D.icon(c.icon, 13), D.h('span', { text: c.text })
        ]));
      });
      card.appendChild(chips);

      var assumptions = [];
      if (parsed.inferredDate) assumptions.push('No date was given, so this is set for ' + T.relativeDay(parsed.startWall || parsed.dueWall || T.nowWall()).toLowerCase() + '.');
      if (parsed.type === 'event' && parsed.allDay) assumptions.push('No time was given, so this is all day.');
      if (parsed.vagueDate) assumptions.push('“Next week” was read as ' + T.fmtDate(parsed.dayWall) + '.');
      if (parsed.type === 'task' && !parsed.dueWall) assumptions.push('No date — this goes to your inbox.');
      if (assumptions.length) {
        card.appendChild(D.h('p.qa__assume', [D.icon('alert', 13), D.h('span', { text: assumptions.join(' ') })]));
      }
      preview.appendChild(card);
    }

    function reparseAsType(type) {
      var text = input.value.trim();
      parsed = NLP.parse(text, opts.now ? { now: opts.now } : null);
      parsed.type = type;
      // Re-derive dates for the newly chosen shape.
      rematerialize(parsed);
      renderPreview();
    }

    function rematerialize(p) {
      var st = S.settings();
      var now = T.nowWall();
      var day = p.dayWall;
      if (p.type === 'event' || p.type === 'habit') {
        if (!day) { day = T.startOfDay(now); p.inferredDate = true; }
        var startMin = p.startMinutes;
        if (startMin === null) { p.allDay = p.type === 'event'; startMin = st.workingHours.start; }
        else p.allDay = false;
        p.startWall = T.atMinutes(day, startMin);
        var dur = p.durationMinutes || st.defaultEventDuration;
        p.endWall = p.endMinutes !== null ? T.atMinutes(day, p.endMinutes) : T.addMinutes(p.startWall, dur);
      } else if (p.type === 'deadline') {
        if (!day) { day = T.startOfDay(T.addDays(now, 7)); p.inferredDate = true; }
        p.dueWall = T.atMinutes(day, p.startMinutes !== null ? p.startMinutes : 23 * 60 + 59);
        p.hasDueTime = p.startMinutes !== null;
      } else if (p.type === 'task') {
        if (day) {
          p.dueWall = T.atMinutes(day, p.startMinutes !== null ? p.startMinutes : 23 * 60 + 59);
          p.hasDueTime = p.startMinutes !== null;
        } else p.dueWall = null;
        p.estimate = p.durationMinutes || null;
      } else {
        p.dueWall = day ? T.atMinutes(day, 23 * 60 + 59) : null;
      }
    }

    input.addEventListener('input', D.debounce(reparse, 90));
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(false); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(true); }
    });

    var layer = UI.modal({
      size: 'md',
      class: 'dialog--qa',
      title: 'Add something',
      subtitle: 'Write it however you think of it.',
      body: D.h('div.qa', [
        D.h('div.qa__inputwrap', [D.icon('sparkle', 17), input]),
        typeRow,
        preview
      ]),
      footer: function (l) {
        return [
          D.h('div.sheet__foot-left', D.h('button.btn.btn--ghost.btn--sm', {
            type: 'button', onclick: function () { commit(true); }
          }, 'Open full editor')),
          D.h('div.sheet__foot-right', [
            D.h('button.btn.btn--ghost', { type: 'button', onclick: function () { l.close(); } }, 'Cancel'),
            D.h('button.btn.btn--primary', { type: 'button', onclick: function () { commit(false); } },
              ['Add', D.h('kbd.btn__kbd', { text: '↵' })])
          ])
        ];
      }
    });

    function commit(openEditor) {
      if (!parsed || !input.value.trim()) {
        if (openEditor) { layer.close(); UI.editEvent(null); }
        return;
      }
      var payload = NLP.toPayload(parsed);
      layer.close();
      if (openEditor) {
        openEditorFor(parsed.type, payload);
        return;
      }
      createFrom(parsed.type, payload);
    }

    reparse();
    if (opts.text) setTimeout(reparse, 0);
    return layer;
  }

  function summaryChips(p) {
    var st = S.settings();
    var chips = [];
    // A habit has a rhythm and a length, not a date — describing it like an
    // event ("all day, Aug 28") would be actively misleading.
    if (p.type === 'habit') {
      chips.push({ icon: 'repeat', text: p.recurrence ? R.describe(p.recurrence) : 'Every day', inferred: !p.recurrence });
      chips.push({
        icon: 'clock',
        text: p.startMinutes !== null
          ? 'around ' + T.fmtTime(T.atMinutes(T.nowWall(), p.startMinutes), st.use24Hour)
          : 'no set time',
        inferred: p.startMinutes === null
      });
      chips.push({ icon: 'zap', text: T.humanDuration(p.durationMinutes || 20), inferred: !p.durationMinutes });
      (p.tags || []).forEach(function (t) { chips.push({ icon: 'tag', text: '#' + t }); });
      return chips;
    }
    if (p.type === 'event') {
      if (p.startWall) {
        chips.push({ icon: 'calendar', text: T.relativeDay(p.startWall) + ' · ' + T.fmtDateShort(p.startWall), inferred: p.inferredDate });
        if (!p.allDay) {
          chips.push({ icon: 'clock', text: T.fmtTime(p.startWall, st.use24Hour) + ' – ' + T.fmtTime(p.endWall, st.use24Hour) });
        } else chips.push({ icon: 'clock', text: 'All day', inferred: true });
      }
    } else if (p.dueWall) {
      chips.push({
        icon: 'flag',
        text: 'Due ' + T.relativeDay(p.dueWall).toLowerCase() + (p.hasDueTime ? ' at ' + T.fmtTime(p.dueWall, st.use24Hour) : ''),
        inferred: p.inferredDate
      });
    } else if (p.type === 'task') {
      chips.push({ icon: 'inbox', text: 'No date — goes to Inbox' });
    }
    if (p.estimate || (p.type !== 'event' && p.durationMinutes)) {
      chips.push({ icon: 'clock', text: T.humanDuration(p.estimate || p.durationMinutes) });
    }
    if (p.recurrence) chips.push({ icon: 'repeat', text: R.describe(p.recurrence) });
    if (p.priority) {
      var pr = M.PRIORITIES.filter(function (x) { return x.id === p.priority; })[0];
      chips.push({ icon: 'zap', text: pr ? pr.label : p.priority });
    }
    if (p.location) chips.push({ icon: 'pin', text: p.location });
    if (p.people && p.people.length) chips.push({ icon: 'users', text: p.people.join(', ') });
    if (p.projectId) {
      var proj = S.get('projects', p.projectId);
      if (proj) chips.push({ icon: 'folder', text: proj.name });
    }
    if (p.categoryId) {
      var cat = S.get('categories', p.categoryId);
      if (cat) chips.push({ icon: 'tag', text: cat.name, inferred: true });
    }
    (p.tags || []).forEach(function (t) { chips.push({ icon: 'tag', text: '#' + t }); });
    return chips;
  }

  function createFrom(type, payload) {
    switch (type) {
      case 'event': {
        var ev = A.createEvent(payload);
        UI.warnAboutConflicts(ev);
        return ev;
      }
      case 'task': return A.createTask(payload);
      case 'deadline': return A.createDeadline(payload);
      case 'note': return A.createNote(payload);
      case 'habit': return A.createHabit(payload);
      case 'project': return A.createProject(payload);
      case 'goal': return A.createGoal(payload);
    }
  }

  function openEditorFor(type, payload) {
    switch (type) {
      case 'event': return UI.editEvent(payload);
      case 'task': return UI.editTask(payload);
      case 'deadline': return UI.editDeadline(payload);
      case 'note': return UI.editNote(payload);
      case 'habit': return UI.editHabit(payload);
      case 'project': return UI.editProject(payload);
      case 'goal': return UI.editGoal(payload);
    }
  }

  /* --------------------------------------------------------- quick capture */

  /* Deliberately frictionless: type, press Enter, it is saved. Nothing to fill in. */
  function captureBox(opts) {
    opts = opts || {};
    var input = D.h('input.capture__input', {
      type: 'text',
      placeholder: opts.placeholder || 'Capture a thought…',
      'aria-label': 'Quick capture',
      autocomplete: 'off'
    });
    function submit() {
      var text = input.value.trim();
      if (!text) return;
      A.addCapture(text);
      input.value = '';
      UI.toast('Captured — organize it whenever you like', {
        actions: [{ label: 'Organize now', onClick: function () { organizeDialog({ text: text }); } }]
      });
      if (opts.onAdd) opts.onAdd();
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    var wrap = D.h('div.capture', [
      D.icon('zap', 16),
      input,
      D.h('button.btn.btn--sm.btn--primary', { type: 'button', onclick: submit }, 'Save')
    ]);
    wrap.focusInput = function () { input.focus(); };
    return wrap;
  }

  /* ------------------------------------------------------------- organize */

  function organizeDialog(opts) {
    opts = opts || {};
    var stage = opts.text ? 'review' : 'input';
    var rows = [];

    var textarea = D.h('textarea.organize__input', {
      placeholder: 'Dump everything here. For example:\n\nMath test Friday, need to buy poster board, meeting with Sarah Wednesday at 4, science project due next month.',
      rows: 7,
      'aria-label': 'Text to organize',
      'data-autofocus': ''
    });
    textarea.value = opts.text || '';

    var bodyNode = D.h('div.organize');
    var footNode = D.h('div.organize__foot');

    var layer = UI.modal({
      size: 'lg',
      class: 'dialog--organize',
      title: 'Organize this',
      subtitle: 'Paste anything. Nothing is saved until you approve it.',
      body: bodyNode,
      footer: footNode
    });

    function renderInput() {
      D.clear(bodyNode);
      D.clear(footNode);
      bodyNode.appendChild(textarea);
      bodyNode.appendChild(D.h('p.organize__tip', [
        D.icon('sparkle', 14),
        D.h('span', { text: 'Separate items with commas, “and”, or new lines. Dates, times and repeats are picked up automatically.' })
      ]));
      footNode.appendChild(D.h('div.sheet__foot-right', [
        D.h('button.btn.btn--ghost', { type: 'button', onclick: function () { layer.close(); } }, 'Cancel'),
        D.h('button.btn.btn--primary', {
          type: 'button',
          onclick: function () {
            var text = textarea.value.trim();
            if (!text) { UI.toast('Write something first'); return; }
            rows = NLP.organize(text).map(function (r) {
              return { parsed: r.parsed, type: r.type, source: r.source, include: true };
            });
            if (!rows.length) { UI.toast('Nothing to organize there'); return; }
            renderReview();
          }
        }, ['Organize', D.icon('arrowRight', 15)])
      ]));
      setTimeout(function () { textarea.focus(); }, 30);
    }

    function renderReview() {
      D.clear(bodyNode);
      D.clear(footNode);

      var summary = D.h('div.organize__summary', { 'aria-live': 'polite' });
      var list = D.h('div.organize__list', { role: 'list' });

      function refreshSummary() {
        var counts = {};
        rows.filter(function (r) { return r.include; }).forEach(function (r) {
          counts[r.type] = (counts[r.type] || 0) + 1;
        });
        var keys = Object.keys(counts);
        D.clear(summary);
        if (!keys.length) {
          summary.appendChild(D.h('span.organize__summary-empty', { text: 'Nothing selected' }));
          return;
        }
        keys.forEach(function (k) {
          var meta = TYPE_OPTIONS.filter(function (t) { return t.value === k; })[0] || { label: k, icon: 'circle' };
          summary.appendChild(D.h('span.organize__count', [
            D.icon(meta.icon, 14),
            D.h('span', { text: counts[k] + ' ' + (counts[k] === 1 ? meta.label.toLowerCase() : meta.label.toLowerCase() + 's') })
          ]));
        });
      }

      rows.forEach(function (row, i) {
        list.appendChild(reviewRow(row, i, refreshSummary));
      });

      bodyNode.appendChild(D.h('div.organize__head', [
        D.h('p.organize__lead', { text: 'Here is what that looks like. Change anything before adding.' }),
        summary
      ]));
      bodyNode.appendChild(list);
      refreshSummary();

      footNode.appendChild(D.h('div.sheet__foot-left', [
        D.h('button.btn.btn--ghost.btn--sm', {
          type: 'button', onclick: function () { stage = 'input'; renderInput(); }
        }, [D.icon('chevronLeft', 15), 'Back to text'])
      ]));
      footNode.appendChild(D.h('div.sheet__foot-right', [
        D.h('button.btn.btn--ghost', { type: 'button', onclick: function () { layer.close(); } }, 'Cancel'),
        D.h('button.btn.btn--primary', {
          type: 'button',
          onclick: function () {
            var items = rows.filter(function (r) { return r.include; }).map(function (r) {
              return { type: r.type, payload: NLP.toPayload(r.parsed) };
            });
            if (!items.length) { UI.toast('Nothing selected to add'); return; }
            A.applyOrganized(items, opts.captureId);
            layer.close();
            if (opts.onDone) opts.onDone();
          }
        }, 'Add selected')
      ]));
    }

    function reviewRow(row, index, onChange) {
      var node = D.h('div.orow', { role: 'listitem' });

      var include = D.h('button.check.orow__check', {
        type: 'button', role: 'checkbox', 'aria-checked': row.include ? 'true' : 'false',
        'aria-label': 'Include “' + row.parsed.title + '”',
        onclick: function () {
          row.include = !row.include;
          include.setAttribute('aria-checked', row.include ? 'true' : 'false');
          node.classList.toggle('is-excluded', !row.include);
          onChange();
        }
      }, row.include ? D.icon('check', 13) : null);

      var typeSel = F.select({
        value: row.type, ariaLabel: 'Item type',
        options: TYPE_OPTIONS.map(function (t) { return { value: t.value, label: t.label }; })
      });
      typeSel.classList.add('orow__type');
      typeSel.addEventListener('change', function () {
        row.type = typeSel.getValue();
        row.parsed.type = row.type;
        rematerializeRow(row.parsed);
        paintDetail();
        onChange();
      });

      var titleInput = D.h('input.orow__title', {
        type: 'text', value: row.parsed.title, 'aria-label': 'Title',
        oninput: function (e) { row.parsed.title = e.target.value; }
      });

      var detail = D.h('div.orow__detail');
      function paintDetail() {
        D.clear(detail);
        summaryChips(row.parsed).forEach(function (c) {
          detail.appendChild(D.h('span.qa__chip.qa__chip--sm' + (c.inferred ? '.is-inferred' : ''), [
            D.icon(c.icon, 12), D.h('span', { text: c.text })
          ]));
        });
        if (!detail.childNodes.length) {
          detail.appendChild(D.h('span.orow__nodetail', { text: 'No date — you can add one later' }));
        }
      }
      paintDetail();

      var editBtn = D.h('button.btn.btn--ghost.btn--sm.orow__edit', {
        type: 'button', title: 'Adjust details',
        onclick: function () { openRowEditor(row, paintDetail); }
      }, D.icon('edit', 14));

      node.appendChild(include);
      node.appendChild(D.h('div.orow__main', [
        D.h('div.orow__top', [typeSel, titleInput, editBtn]),
        detail,
        D.h('p.orow__source', { text: '“' + row.source + '”' })
      ]));
      return node;
    }

    function rematerializeRow(p) {
      var st = S.settings();
      var now = T.nowWall();
      var day = p.dayWall;
      if (p.type === 'event' || p.type === 'habit') {
        if (!day) { day = T.startOfDay(now); p.inferredDate = true; }
        var sm = p.startMinutes;
        if (sm === null) { p.allDay = p.type === 'event'; sm = st.workingHours.start; } else p.allDay = false;
        p.startWall = T.atMinutes(day, sm);
        p.endWall = p.endMinutes !== null ? T.atMinutes(day, p.endMinutes)
          : T.addMinutes(p.startWall, p.durationMinutes || st.defaultEventDuration);
      } else if (p.type === 'deadline') {
        if (!day) { day = T.startOfDay(T.addDays(now, 7)); p.inferredDate = true; }
        p.dueWall = T.atMinutes(day, p.startMinutes !== null ? p.startMinutes : 23 * 60 + 59);
        p.hasDueTime = p.startMinutes !== null;
      } else if (p.type === 'task') {
        p.dueWall = day ? T.atMinutes(day, p.startMinutes !== null ? p.startMinutes : 23 * 60 + 59) : null;
        p.hasDueTime = day ? p.startMinutes !== null : false;
        p.estimate = p.durationMinutes || null;
      } else {
        p.dueWall = day ? T.atMinutes(day, 23 * 60 + 59) : null;
      }
    }

    /* A compact inline editor so a row can be corrected without leaving review. */
    function openRowEditor(row, repaint) {
      var p = row.parsed;
      var isTimed = p.type === 'event' || p.type === 'habit';
      var dayInput = F.date({ value: p.dayWall || (isTimed ? p.startWall : p.dueWall) || null });
      var startInput = F.time({ value: isTimed && p.startWall && !p.allDay ? p.startWall : (p.hasDueTime && p.dueWall ? p.dueWall : null) });
      var endInput = F.time({ value: isTimed && p.endWall && !p.allDay ? p.endWall : null });
      var durInput = F.duration({ value: p.durationMinutes || p.estimate || null });
      var prioritySel = F.select({
        value: p.priority || '', ariaLabel: 'Priority',
        options: [{ value: '', label: 'No priority' }].concat(M.PRIORITIES.map(function (x) { return { value: x.id, label: x.label }; }))
      });
      var projectSel = F.projectSelect(p.projectId);

      var sub = UI.modal({
        size: 'sm',
        title: 'Adjust',
        subtitle: p.title,
        body: D.h('div.editor', [
          F.field('Date', dayInput),
          isTimed
            ? F.field('Time', D.h('div.when__inputs', [startInput, D.h('span.when__dash', { text: '–' }), endInput]))
            : F.field('Time (optional)', startInput),
          isTimed ? null : F.field('How long', durInput),
          F.field('Priority', prioritySel),
          F.field('Project', projectSel)
        ]),
        footer: function (l) {
          return D.h('div.sheet__foot-right', [
            D.h('button.btn.btn--ghost', { type: 'button', onclick: function () { l.close(); } }, 'Cancel'),
            D.h('button.btn.btn--primary', {
              type: 'button',
              onclick: function () {
                p.dayWall = dayInput.getValue();
                p.startMinutes = startInput.getValue();
                p.endMinutes = isTimed ? endInput.getValue() : null;
                if (!isTimed) p.durationMinutes = durInput.getValue();
                else if (p.startMinutes != null && p.endMinutes != null) p.durationMinutes = p.endMinutes - p.startMinutes;
                p.priority = prioritySel.getValue();
                p.projectId = projectSel.getValue();
                p.inferredDate = false;
                rematerializeRow(p);
                repaint();
                l.close();
              }
            }, 'Apply')
          ]);
        }
      });
    }

    if (stage === 'review' && opts.text) {
      rows = NLP.organize(opts.text).map(function (r) {
        return { parsed: r.parsed, type: r.type, source: r.source, include: true };
      });
      renderReview();
    } else renderInput();

    return layer;
  }

  /* The "+ Add" menu: one obvious entry point for all seven concepts. */
  function addMenu(anchor) {
    UI.menu(anchor, [
      { label: 'Quick add', icon: 'sparkle', shortcut: 'C', onClick: function () { quickAdd(); } },
      { separator: true },
      { label: 'Event', icon: 'calendar', shortcut: 'N', onClick: function () { UI.editEvent(null); } },
      { label: 'Task', icon: 'checkSquare', shortcut: 'T', onClick: function () { UI.editTask(null); } },
      { label: 'Deadline', icon: 'flag', onClick: function () { UI.editDeadline(null); } },
      { label: 'Note', icon: 'note', onClick: function () { UI.editNote(null); } },
      { label: 'Habit', icon: 'repeat', onClick: function () { UI.editHabit(null); } },
      { separator: true },
      { label: 'Project', icon: 'folder', onClick: function () { UI.editProject(null); } },
      { label: 'Goal', icon: 'target', onClick: function () { UI.editGoal(null); } },
      { separator: true },
      { label: 'Organize a brain dump', icon: 'zap', onClick: function () { organizeDialog(); } }
    ], { align: 'right' });
  }

  Object.assign(UI, {
    quickAdd: quickAdd,
    captureBox: captureBox,
    organizeDialog: organizeDialog,
    addMenu: addMenu,
    summaryChips: summaryChips,
    createFrom: createFrom
  });
})(window);
