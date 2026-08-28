/* Cadence — form controls shared by every editor.
   Each returns a node with a `.getValue()` so editors stay declarative. */
(function (global) {
  'use strict';
  var UI = global.UI = global.UI || {};
  var F = {};

  var idSeq = 0;
  function nextId(p) { idSeq++; return (p || 'f') + idSeq; }

  function field(label, control, opts) {
    opts = opts || {};
    var id = control && control.id ? control.id : nextId('fld');
    if (control && !control.id && control.tagName) control.id = id;
    var wrap = D.h('div.field' + (opts.inline ? '.field--inline' : ''), { class: opts.class || null });
    if (label) {
      wrap.appendChild(D.h('label.field__label', {
        for: id,
        text: label + (opts.required ? ' *' : '')
      }));
    }
    wrap.appendChild(control);
    if (opts.hint) wrap.appendChild(D.h('p.field__hint', { text: opts.hint }));
    wrap.control = control;
    return wrap;
  }

  function text(opts) {
    opts = opts || {};
    var input = D.h('input.input', {
      type: opts.type || 'text',
      value: opts.value == null ? '' : opts.value,
      placeholder: opts.placeholder || '',
      id: opts.id || nextId('in'),
      'aria-label': opts.ariaLabel || null,
      autocomplete: opts.autocomplete || 'off',
      maxlength: opts.maxlength || null,
      inputmode: opts.inputmode || null,
      'data-autofocus': opts.autofocus ? '' : null,
      oninput: opts.oninput || null,
      onkeydown: opts.onkeydown || null
    });
    input.getValue = function () { return input.value.trim(); };
    return input;
  }

  function textarea(opts) {
    opts = opts || {};
    var ta = D.h('textarea.input.input--area', {
      placeholder: opts.placeholder || '',
      rows: opts.rows || 3,
      id: opts.id || nextId('ta'),
      'data-autofocus': opts.autofocus ? '' : null,
      oninput: opts.oninput || null
    });
    ta.value = opts.value || '';
    ta.getValue = function () { return ta.value.trim(); };
    // Grow with content rather than making the user scroll a 3-line box.
    if (opts.autosize !== false) {
      var fit = function () {
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight + 2, opts.maxHeight || 360) + 'px';
      };
      ta.addEventListener('input', fit);
      setTimeout(fit, 0);
    }
    return ta;
  }

  function number(opts) {
    opts = opts || {};
    var input = D.h('input.input.input--num', {
      type: 'number', value: opts.value == null ? '' : opts.value,
      min: opts.min == null ? null : opts.min, max: opts.max == null ? null : opts.max,
      step: opts.step || 1, id: opts.id || nextId('num'), placeholder: opts.placeholder || '',
      'aria-label': opts.ariaLabel || null
    });
    input.getValue = function () { return input.value === '' ? null : +input.value; };
    return input;
  }

  function date(opts) {
    opts = opts || {};
    var input = D.h('input.input.input--date', {
      type: 'date',
      value: opts.value ? T.fmtInputDate(opts.value) : '',
      id: opts.id || nextId('date'),
      'aria-label': opts.ariaLabel || null,
      onchange: opts.onchange || null
    });
    input.getValue = function () {
      if (!input.value) return null;
      return T.fromKey(input.value);
    };
    return input;
  }

  function time(opts) {
    opts = opts || {};
    var input = D.h('input.input.input--time', {
      type: 'time',
      value: opts.value ? T.fmtInputTime(opts.value) : '',
      step: 300,
      id: opts.id || nextId('time'),
      'aria-label': opts.ariaLabel || null,
      onchange: opts.onchange || null
    });
    input.getValue = function () {
      if (!input.value) return null;
      var p = input.value.split(':');
      return (+p[0]) * 60 + (+p[1]);
    };
    return input;
  }

  function select(opts) {
    opts = opts || {};
    var sel = D.h('select.input.input--select', {
      id: opts.id || nextId('sel'), onchange: opts.onchange || null,
      'aria-label': opts.ariaLabel || null
    });
    (opts.options || []).forEach(function (o) {
      var option = D.h('option', { value: o.value == null ? '' : o.value, text: o.label });
      if (String(o.value) === String(opts.value) || (o.value == null && opts.value == null)) option.selected = true;
      sel.appendChild(option);
    });
    sel.getValue = function () { return sel.value === '' ? null : sel.value; };
    return sel;
  }

  /* Segmented radio group — used for view switching and small choices. */
  function segmented(opts) {
    opts = opts || {};
    var value = opts.value;
    var wrap = D.h('div.segmented', { role: 'radiogroup', 'aria-label': opts.ariaLabel || '' });
    var buttons = [];
    (opts.options || []).forEach(function (o) {
      var btn = D.h('button.segmented__btn', {
        type: 'button', role: 'radio',
        'aria-checked': String(o.value) === String(value) ? 'true' : 'false',
        title: o.title || o.label,
        onclick: function () {
          value = o.value;
          buttons.forEach(function (b) { b.setAttribute('aria-checked', b.dataset.value === String(value) ? 'true' : 'false'); });
          if (opts.onChange) opts.onChange(value);
        }
      }, o.icon ? [D.icon(o.icon, 15), o.label ? D.h('span', { text: o.label }) : null] : o.label);
      btn.dataset.value = String(o.value);
      buttons.push(btn);
      wrap.appendChild(btn);
    });
    wrap.getValue = function () { return value; };
    wrap.setValue = function (v) {
      value = v;
      buttons.forEach(function (b) { b.setAttribute('aria-checked', b.dataset.value === String(value) ? 'true' : 'false'); });
    };
    return wrap;
  }

  function toggle(opts) {
    opts = opts || {};
    var checked = !!opts.value;
    var btn = D.h('button.toggle', {
      type: 'button', role: 'switch', 'aria-checked': checked ? 'true' : 'false',
      'aria-label': opts.ariaLabel || opts.label || 'Toggle',
      id: opts.id || nextId('tg'),
      onclick: function () {
        checked = !checked;
        btn.setAttribute('aria-checked', checked ? 'true' : 'false');
        if (opts.onChange) opts.onChange(checked);
      }
    }, D.h('span.toggle__knob'));
    btn.getValue = function () { return checked; };
    btn.setValue = function (v) { checked = !!v; btn.setAttribute('aria-checked', checked ? 'true' : 'false'); };
    return btn;
  }

  function toggleRow(label, opts) {
    opts = opts || {};
    var tg = toggle(opts);
    var row = D.h('div.toggle-row', [
      D.h('div.toggle-row__text', [
        D.h('span.toggle-row__label', { text: label }),
        opts.hint ? D.h('span.toggle-row__hint', { text: opts.hint }) : null
      ]),
      tg
    ]);
    row.getValue = tg.getValue;
    row.control = tg;
    return row;
  }

  /* Tag input: type, press Enter or comma to commit. */
  function tags(opts) {
    opts = opts || {};
    var values = (opts.value || []).slice();
    var wrap = D.h('div.tags-input');
    var input = D.h('input.tags-input__field', {
      type: 'text', placeholder: opts.placeholder || 'Add a tag…',
      id: opts.id || nextId('tags'), 'aria-label': 'Add a tag',
      onkeydown: function (e) {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          commit(input.value);
        } else if (e.key === 'Backspace' && !input.value && values.length) {
          values.pop(); render();
        }
      },
      onblur: function () { if (input.value.trim()) commit(input.value); }
    });

    function commit(raw) {
      String(raw).split(/[,\s]+/).forEach(function (t) {
        var clean = t.replace(/^#/, '').trim().toLowerCase();
        if (clean && values.indexOf(clean) < 0) values.push(clean);
      });
      input.value = '';
      render();
    }

    var listNode = D.h('div.tags-input__list');
    function render() {
      D.clear(listNode);
      values.forEach(function (t) {
        listNode.appendChild(D.h('span.tag-chip', [
          D.h('span', { text: '#' + t }),
          D.h('button.tag-chip__x', {
            type: 'button', 'aria-label': 'Remove tag ' + t,
            onclick: function () { values = values.filter(function (v) { return v !== t; }); render(); }
          }, D.icon('x', 12))
        ]));
      });
    }
    render();
    wrap.appendChild(listNode);
    wrap.appendChild(input);
    wrap.getValue = function () {
      if (input.value.trim()) commit(input.value);
      return values.slice();
    };
    return wrap;
  }

  var SWATCHES = ['#4a86d8', '#5b6fd8', '#7a5cd8', '#c4569a', '#e0524a', '#d0764a',
    '#c2871f', '#6f9e5b', '#3f9e77', '#2f9e8f', '#5aa0b8', '#7b8496'];

  function colorPicker(opts) {
    opts = opts || {};
    var value = opts.value || null;
    var wrap = D.h('div.swatches', { role: 'radiogroup', 'aria-label': 'Colour' });
    var buttons = [];
    function make(color, label) {
      var b = D.h('button.swatch', {
        type: 'button', role: 'radio', title: label,
        'aria-label': label,
        'aria-checked': color === value ? 'true' : 'false',
        style: color ? { background: color } : null,
        class: color ? null : 'swatch--auto',
        onclick: function () {
          value = color;
          buttons.forEach(function (x) { x.setAttribute('aria-checked', x.dataset.color === String(color) ? 'true' : 'false'); });
          if (opts.onChange) opts.onChange(value);
        }
      }, color ? D.icon('check', 13) : D.h('span', { text: 'Auto' }));
      b.dataset.color = String(color);
      buttons.push(b);
      return b;
    }
    if (opts.allowAuto !== false) wrap.appendChild(make(null, 'Automatic colour'));
    SWATCHES.forEach(function (c) { wrap.appendChild(make(c, 'Colour ' + c)); });
    wrap.getValue = function () { return value; };
    return wrap;
  }

  var DURATIONS = [15, 30, 45, 60, 90, 120, 180];

  function duration(opts) {
    opts = opts || {};
    var value = opts.value == null ? null : opts.value;
    var wrap = D.h('div.duration');
    var chips = D.h('div.chips');
    var custom = number({ value: null, min: 5, max: 1440, step: 5, placeholder: 'min' });
    custom.classList.add('duration__custom');
    custom.setAttribute('aria-label', 'Custom duration in minutes');

    function paint() {
      D.qsa('.chip', chips).forEach(function (c) {
        c.setAttribute('aria-pressed', +c.dataset.value === value ? 'true' : 'false');
      });
      if (value != null && DURATIONS.indexOf(value) < 0) custom.value = value;
    }
    DURATIONS.forEach(function (m) {
      var chip = D.h('button.chip', {
        type: 'button', 'aria-pressed': 'false',
        onclick: function () { value = m; custom.value = ''; paint(); if (opts.onChange) opts.onChange(value); }
      }, T.humanDuration(m));
      chip.dataset.value = m;
      chips.appendChild(chip);
    });
    custom.addEventListener('input', function () {
      value = custom.value ? +custom.value : null;
      paint();
      if (opts.onChange) opts.onChange(value);
    });
    paint();
    wrap.appendChild(chips);
    wrap.appendChild(D.h('div.duration__custom-wrap', [custom, D.h('span.duration__unit', { text: 'minutes' })]));
    wrap.getValue = function () { return value; };
    wrap.setValue = function (v) { value = v; paint(); };
    return wrap;
  }

  /* ---- recurrence ---- */
  function recurrence(opts) {
    opts = opts || {};
    var value = opts.value ? R.normalize(opts.value) : null;
    var wrap = D.h('div.recur');

    var presets = [
      { label: 'Does not repeat', value: null },
      { label: 'Daily', value: { freq: 'daily', interval: 1 } },
      { label: 'Every weekday', value: { freq: 'weekly', interval: 1, byDay: [1, 2, 3, 4, 5] } },
      { label: 'Weekly', value: { freq: 'weekly', interval: 1 } },
      { label: 'Every 2 weeks', value: { freq: 'weekly', interval: 2 } },
      { label: 'Monthly', value: { freq: 'monthly', interval: 1 } },
      { label: 'Yearly', value: { freq: 'yearly', interval: 1 } },
      { label: 'Custom…', value: 'custom' }
    ];

    var sel = D.h('select.input.input--select', { 'aria-label': 'Repeat' });
    presets.forEach(function (p, i) {
      sel.appendChild(D.h('option', { value: String(i), text: p.label }));
    });

    var advanced = D.h('div.recur__adv', { hidden: true });
    var intervalInput = number({ value: value ? value.interval : 1, min: 1, max: 99 });
    var freqSel = select({
      value: value ? value.freq : 'weekly',
      options: [
        { value: 'daily', label: 'days' }, { value: 'weekly', label: 'weeks' },
        { value: 'monthly', label: 'months' }, { value: 'yearly', label: 'years' }
      ]
    });
    var dayPicker = D.h('div.recur__days', { role: 'group', 'aria-label': 'Repeat on' });
    var dayState = {};
    T.DAY_SHORT.forEach(function (name, i) {
      var b = D.h('button.recur__day', {
        type: 'button', 'aria-pressed': 'false', 'aria-label': T.DAY_NAMES[i],
        onclick: function () {
          dayState[i] = !dayState[i];
          b.setAttribute('aria-pressed', dayState[i] ? 'true' : 'false');
        }
      }, name.charAt(0));
      dayPicker.appendChild(b);
      b.dataset.day = i;
    });
    var endMode = select({
      value: value && value.until ? 'until' : value && value.count ? 'count' : 'never',
      options: [{ value: 'never', label: 'Never ends' }, { value: 'until', label: 'Ends on date' }, { value: 'count', label: 'Ends after' }]
    });
    var untilInput = date({ value: value && value.until ? T.w(value.until) : null });
    var countInput = number({ value: value && value.count ? value.count : 10, min: 1, max: 999 });
    var endExtra = D.h('div.recur__end-extra');

    function paintEnd() {
      D.clear(endExtra);
      var mode = endMode.getValue();
      if (mode === 'until') endExtra.appendChild(untilInput);
      else if (mode === 'count') endExtra.appendChild(D.h('div.recur__count', [countInput, D.h('span', { text: 'times' })]));
    }
    endMode.addEventListener('change', paintEnd);

    advanced.appendChild(D.h('div.recur__row', [
      D.h('span.recur__lead', { text: 'Every' }), intervalInput, freqSel
    ]));
    advanced.appendChild(D.h('div.recur__row.recur__row--days', [D.h('span.recur__lead', { text: 'On' }), dayPicker]));
    advanced.appendChild(D.h('div.recur__row', [endMode, endExtra]));

    function syncFromValue() {
      if (!value) { sel.value = '0'; advanced.hidden = true; return; }
      var idx = -1;
      presets.forEach(function (p, i) {
        if (p.value && p.value !== 'custom' && sameRule(p.value, value) && !value.until && !value.count) idx = i;
      });
      if (idx >= 0) { sel.value = String(idx); advanced.hidden = true; }
      else {
        sel.value = String(presets.length - 1);
        advanced.hidden = false;
        intervalInput.value = value.interval;
        freqSel.value = value.freq;
        (value.byDay || []).forEach(function (d) {
          dayState[d] = true;
          var btn = D.qs('[data-day="' + d + '"]', dayPicker);
          if (btn) btn.setAttribute('aria-pressed', 'true');
        });
      }
      paintEnd();
    }

    function sameRule(a, b) {
      if (a.freq !== b.freq || (a.interval || 1) !== (b.interval || 1)) return false;
      var ad = (a.byDay || []).slice().sort().join(), bd = (b.byDay || []).slice().sort().join();
      return ad === bd;
    }

    sel.addEventListener('change', function () {
      var p = presets[+sel.value];
      if (p.value === 'custom') {
        advanced.hidden = false;
        if (!value) value = { freq: 'weekly', interval: 1 };
      } else {
        advanced.hidden = true;
        value = p.value ? Object.assign({}, p.value) : null;
      }
      if (opts.onChange) opts.onChange(wrap.getValue());
    });

    syncFromValue();
    paintEnd();
    wrap.appendChild(sel);
    wrap.appendChild(advanced);

    wrap.getValue = function () {
      var p = presets[+sel.value];
      if (p.value === null) return null;
      if (p.value !== 'custom') return Object.assign({}, p.value);
      var days = Object.keys(dayState).filter(function (k) { return dayState[k]; }).map(Number);
      var rule = {
        freq: freqSel.getValue() || 'weekly',
        interval: Math.max(1, intervalInput.getValue() || 1),
        byDay: days.length ? days : null
      };
      var mode = endMode.getValue();
      if (mode === 'until') { var d = untilInput.getValue(); if (d) rule.until = T.iso(T.endOfDay(d)); }
      else if (mode === 'count') rule.count = countInput.getValue() || null;
      return rule;
    };
    return wrap;
  }

  /* ---- reminders ---- */
  function reminders(opts) {
    opts = opts || {};
    var values = (opts.value || []).slice();
    var wrap = D.h('div.reminders');
    var list = D.h('div.reminders__list');

    function label(mins) {
      var found = M.REMINDER_OPTIONS.filter(function (o) { return o.value === mins; })[0];
      if (found) return found.label;
      if (mins === 0) return 'At time of event';
      if (mins < 60) return mins + ' minutes before';
      if (mins < 1440) return T.humanDuration(mins) + ' before';
      return Math.round(mins / 1440) + ' days before';
    }
    function render() {
      D.clear(list);
      if (!values.length) list.appendChild(D.h('p.reminders__empty', { text: 'No reminders' }));
      values.slice().sort(function (a, b) { return a - b; }).forEach(function (m) {
        list.appendChild(D.h('span.reminder-chip', [
          D.icon('bell', 13),
          D.h('span', { text: label(m) }),
          D.h('button.tag-chip__x', {
            type: 'button', 'aria-label': 'Remove reminder ' + label(m),
            onclick: function () { values = values.filter(function (v) { return v !== m; }); render(); }
          }, D.icon('x', 12))
        ]));
      });
    }
    var adder = select({
      value: '', options: [{ value: '', label: 'Add a reminder…' }].concat(
        M.REMINDER_OPTIONS.map(function (o) { return { value: o.value, label: o.label }; }))
    });
    adder.addEventListener('change', function () {
      var v = adder.getValue();
      if (v !== null && values.indexOf(+v) < 0) { values.push(+v); render(); }
      adder.value = '';
    });
    render();
    wrap.appendChild(list);
    wrap.appendChild(adder);
    wrap.getValue = function () { return values.slice().sort(function (a, b) { return a - b; }); };
    return wrap;
  }

  /* ---- attachments (files kept inline, plus plain links) ---- */
  var MAX_FILE = 1.5 * 1024 * 1024;

  function attachments(opts) {
    opts = opts || {};
    var files = (opts.value || []).slice();
    var links = (opts.links || []).slice();
    var wrap = D.h('div.attachments');
    var list = D.h('div.attachments__list');

    function render() {
      D.clear(list);
      files.forEach(function (f) {
        list.appendChild(D.h('div.attachment', [
          D.icon('paperclip', 14),
          f.dataUrl
            ? D.h('a.attachment__name', { href: f.dataUrl, download: f.name, text: f.name, target: '_blank', rel: 'noopener' })
            : D.h('span.attachment__name', { text: f.name }),
          D.h('span.attachment__size', { text: prettySize(f.size) }),
          D.h('button.tag-chip__x', {
            type: 'button', 'aria-label': 'Remove ' + f.name,
            onclick: function () { files = files.filter(function (x) { return x.id !== f.id; }); render(); }
          }, D.icon('x', 12))
        ]));
      });
      links.forEach(function (l) {
        list.appendChild(D.h('div.attachment', [
          D.icon('link', 14),
          D.h('a.attachment__name', { href: l.url, text: l.label || l.url, target: '_blank', rel: 'noopener noreferrer' }),
          D.h('button.tag-chip__x', {
            type: 'button', 'aria-label': 'Remove link',
            onclick: function () { links = links.filter(function (x) { return x.id !== l.id; }); render(); }
          }, D.icon('x', 12))
        ]));
      });
      if (!files.length && !links.length) list.appendChild(D.h('p.reminders__empty', { text: 'Nothing attached' }));
    }

    var fileInput = D.h('input', {
      type: 'file', multiple: true, class: 'sr-only', id: nextId('file'),
      onchange: function () {
        Array.prototype.forEach.call(fileInput.files, function (file) {
          if (file.size > MAX_FILE) {
            UI.toast('“' + file.name + '” is larger than 1.5 MB and was not attached.', { tone: 'warn' });
            return;
          }
          var reader = new FileReader();
          reader.onload = function () {
            files.push({ id: M.uid('att'), name: file.name, type: file.type, size: file.size, dataUrl: reader.result });
            render();
          };
          reader.onerror = function () { UI.toast('We could not read “' + file.name + '”. Try again.', { tone: 'warn' }); };
          reader.readAsDataURL(file);
        });
        fileInput.value = '';
      }
    });

    var addFile = D.h('button.btn.btn--ghost.btn--sm', {
      type: 'button', onclick: function () { fileInput.click(); }
    }, [D.icon('paperclip', 14), 'Attach file']);

    var addLink = D.h('button.btn.btn--ghost.btn--sm', {
      type: 'button',
      onclick: function () {
        var url = global.prompt('Link URL');
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        var label = global.prompt('Label (optional)', '') || '';
        links.push({ id: M.uid('lnk'), url: url, label: label });
        render();
      }
    }, [D.icon('link', 14), 'Add link']);

    render();
    wrap.appendChild(list);
    wrap.appendChild(D.h('div.attachments__actions', [addFile, addLink, fileInput]));
    wrap.getValue = function () { return files.slice(); };
    wrap.getLinks = function () { return links.slice(); };
    return wrap;
  }

  function prettySize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  /* ---- participants ---- */
  var RSVP = [
    { value: 'none', label: 'No reply' }, { value: 'yes', label: 'Going' },
    { value: 'maybe', label: 'Maybe' }, { value: 'no', label: 'Not going' }
  ];

  function participants(opts) {
    opts = opts || {};
    var values = (opts.value || []).map(function (p) { return Object.assign({ rsvp: 'none', role: '' }, p); });
    var wrap = D.h('div.participants');
    var list = D.h('div.participants__list');

    function render() {
      D.clear(list);
      values.forEach(function (p, i) {
        var rsvp = select({
          value: p.rsvp, options: RSVP, ariaLabel: 'RSVP for ' + p.name,
          onchange: function (e) { values[i].rsvp = e.target.value; }
        });
        rsvp.classList.add('participants__rsvp');
        list.appendChild(D.h('div.participant', [
          D.h('span.avatar', { text: (p.name || '?').charAt(0).toUpperCase(), 'aria-hidden': 'true' }),
          D.h('span.participant__name', { text: p.name }),
          rsvp,
          D.h('button.tag-chip__x', {
            type: 'button', 'aria-label': 'Remove ' + p.name,
            onclick: function () { values.splice(i, 1); render(); }
          }, D.icon('x', 12))
        ]));
      });
      if (!values.length) list.appendChild(D.h('p.reminders__empty', { text: 'No one added' }));
    }

    var known = S.all('people').map(function (p) { return p.name; });
    var listId = nextId('people');
    var dataList = D.h('datalist', { id: listId }, known.map(function (n) { return D.h('option', { value: n }); }));
    var input = text({
      placeholder: 'Add someone…',
      onkeydown: function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        var name = input.value.trim();
        if (!name) return;
        values.push({ name: name, rsvp: 'none', role: '' });
        input.value = '';
        render();
      }
    });
    input.setAttribute('list', listId);

    render();
    wrap.appendChild(list);
    wrap.appendChild(D.h('div.participants__add', [input, dataList]));
    wrap.getValue = function () {
      if (input.value.trim()) values.push({ name: input.value.trim(), rsvp: 'none', role: '' });
      return values.slice();
    };
    return wrap;
  }

  /* ---- relation pickers ---- */
  function projectSelect(value, onChange) {
    return select({
      value: value || '',
      onchange: onChange,
      ariaLabel: 'Project',
      options: [{ value: '', label: 'No project' }].concat(
        S.all('projects').filter(function (p) { return p.status !== 'archived'; })
          .map(function (p) { return { value: p.id, label: p.name }; }))
    });
  }
  function goalSelect(value) {
    return select({
      value: value || '', ariaLabel: 'Goal',
      options: [{ value: '', label: 'No goal' }].concat(
        S.all('goals').filter(function (g) { return !g.archived; })
          .map(function (g) { return { value: g.id, label: g.name }; }))
    });
  }
  function deadlineSelect(value) {
    return select({
      value: value || '', ariaLabel: 'Deadline',
      options: [{ value: '', label: 'No deadline' }].concat(
        S.all('deadlines').filter(function (d) { return !d.done; })
          .map(function (d) { return { value: d.id, label: d.title + ' · ' + T.fmtDateShort(T.w(d.due)) }; }))
    });
  }
  function categorySelect(value) {
    return select({
      value: value || '', ariaLabel: 'Category',
      options: [{ value: '', label: 'No category' }].concat(
        S.all('categories').map(function (c) { return { value: c.id, label: c.name }; }))
    });
  }
  function calendarSelect(value) {
    return select({
      value: value || 'cal_personal', ariaLabel: 'Calendar',
      options: S.all('calendars').map(function (c) { return { value: c.id, label: c.name }; })
    });
  }
  function prioritySelect(value) {
    return segmented({
      value: value || 'medium', ariaLabel: 'Priority',
      options: M.PRIORITIES.map(function (p) { return { value: p.id, label: p.label }; })
    });
  }
  function statusSelect(value) {
    return select({
      value: value || 'inbox', ariaLabel: 'Status',
      options: M.STATUSES.map(function (s) { return { value: s.id, label: s.label }; })
    });
  }

  /* Progressive disclosure — advanced fields stay out of the way until wanted. */
  function disclosure(label, content, opts) {
    opts = opts || {};
    var open = !!opts.open;
    var body = D.h('div.disclosure__body', { hidden: !open });
    D.append(body, content);
    var chevron = D.icon(open ? 'chevronUp' : 'chevronDown', 15);
    var btn = D.h('button.disclosure__toggle', {
      type: 'button', 'aria-expanded': open ? 'true' : 'false',
      onclick: function () {
        open = !open;
        body.hidden = !open;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        D.clear(chevronWrap).appendChild(D.icon(open ? 'chevronUp' : 'chevronDown', 15));
      }
    });
    var chevronWrap = D.h('span.disclosure__chev', chevron);
    btn.appendChild(D.h('span', { text: label }));
    btn.appendChild(chevronWrap);
    var wrap = D.h('div.disclosure', [btn, body]);
    wrap.body = body;
    return wrap;
  }

  Object.assign(F, {
    field: field, text: text, textarea: textarea, number: number, date: date, time: time,
    select: select, segmented: segmented, toggle: toggle, toggleRow: toggleRow,
    tags: tags, colorPicker: colorPicker, duration: duration, recurrence: recurrence,
    reminders: reminders, attachments: attachments, participants: participants,
    projectSelect: projectSelect, goalSelect: goalSelect, deadlineSelect: deadlineSelect,
    categorySelect: categorySelect, calendarSelect: calendarSelect,
    prioritySelect: prioritySelect, statusSelect: statusSelect,
    disclosure: disclosure, SWATCHES: SWATCHES
  });
  UI.F = F;
})(window);
