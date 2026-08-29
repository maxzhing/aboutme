/* ========================================================================
   js/ui/jarvis.js
   ======================================================================== */
/* Cadence — the JARVIS console.

   One renderer drives two surfaces: a docked right rail for working alongside
   the calendar, and a full route for longer sessions. Both show the same
   thread, the same reasoning trace, and the same approval cards, because a
   person should not have to learn the assistant twice.

   The console never mutates anything itself. It renders what the orchestrator
   returned and calls `assistant.apply` when — and only when — you approve. */
(function (global) {
  'use strict';

  var UI = global.UI = global.UI || {};
  var Views = global.Views = global.Views || {};

  var state = {
    busy: false,
    liveTrace: null,      // trace entries for the run in flight
    draft: '',
    traceOpen: {},        // turn index -> bool
    listening: false,
    heard: '',            // live transcript while the mic is open
    voiceError: null
  };

  /* --------------------------------------------------------------- voice */

  var listener = null;

  function voicePrefs() {
    var p = {};
    try { p = S.settings().jarvisVoice || {}; } catch (err) { p = {}; }
    return p;
  }

  function setVoicePref(patch) {
    var p = Object.assign({}, voicePrefs(), patch);
    S.setSetting('jarvisVoice', p);
    return p;
  }

  function speakingOn() { return !!voicePrefs().speak; }

  // Restore the chosen voice once the browser has finished loading its list.
  function restoreVoice() {
    var name = voicePrefs().voice;
    if (name) JV.VOICE.setVoice(name);
  }

  function ensureListener() {
    if (listener) return listener;
    listener = new JV.VOICE.Listener({
      onPartial: function (text) {
        state.heard = text;
        // Show the words landing in the composer as they are recognised.
        surfaces.forEach(function (s) {
          if (s.input) { s.input.value = text; }
        });
      },
      onFinal: function (text) {
        state.heard = '';
        state.draft = text;
        // Speaking a request implies wanting it answered, so send it.
        submit(text);
      },
      onState: function (st) {
        state.listening = (st === 'listening');
        if (!state.listening) state.heard = '';
        renderAll();
      },
      onError: function (message) {
        state.voiceError = message;
        state.listening = false;
        UI.toast(message, { tone: 'warn', duration: 7000 });
        renderAll();
      }
    });
    return listener;
  }

  function toggleListening() {
    if (!JV.VOICE.canListen()) {
      UI.toast(JV.VOICE.listenUnavailableReason(), { tone: 'warn', duration: 7000 });
      return;
    }
    var l = ensureListener();
    if (state.listening) { l.stop(); return; }
    // Talking over JARVIS is the usual reason to press the mic mid-sentence.
    JV.VOICE.cancel();
    state.voiceError = null;
    l.start();
  }

  /* Read a reply aloud, if speaking is on. Only the prose — the cards below
     already say the same thing on screen, and hearing them twice is worse. */
  function speakReply(text) {
    if (!speakingOn() || !JV.VOICE.canSpeak()) return;
    JV.VOICE.speak(text, {
      onStart: function () { state.speaking = true; },
      onEnd: function () { state.speaking = false; }
    });
  }

  var surfaces = [];      // mounted {root, thread, composer} to keep in sync

  function assistant() { return JV.assistant || JV.boot(); }

  /* ------------------------------------------------------------ helpers */

  function agentByline(text) {
    return D.h('div.jv__byline', [
      D.h('span.jv__byline-mark', { 'aria-hidden': 'true' }, D.icon('sparkle', 10)),
      D.h('span', { text: text || 'JARVIS' })
    ]);
  }

  /* -------------------------------------------------------------- state */

  var STATES = {
    ready: { label: 'Ready', tone: 'ok' },
    thinking: { label: 'Thinking', tone: 'think' },
    scheduling: { label: 'Scheduling', tone: 'work' },
    waiting: { label: 'Waiting for you', tone: 'wait' },
    error: { label: 'Something failed', tone: 'bad' }
  };

  function stateChip() {
    var a = assistant();
    var s = STATES[a.state] || STATES.ready;
    return D.h('span.jv-state.is-' + s.tone, {
      title: a.note || s.label, 'aria-live': 'polite'
    }, [
      D.h('span.jv-state__dot', { 'aria-hidden': 'true' }),
      D.h('span.jv-state__label', { text: a.note && a.state !== 'ready' ? a.note : s.label })
    ]);
  }

  /* --------------------------------------------------------------- refs */

  /* A reference chip opens the real editor for the real record. This is what
     makes an answer navigable rather than a wall of text about your calendar. */
  function openRef(r) {
    if (!r || !r.item) return;
    switch (r.kind) {
      case 'event': UI.editEvent(r.item); break;
      case 'task': UI.editTask(r.item); break;
      case 'deadline': UI.editDeadline(r.item); break;
      case 'note': UI.editNote(r.item); break;
      case 'project': UI.editProject(r.item); break;
      case 'goal': UI.editGoal(r.item); break;
      case 'habit': UI.editHabit(r.item); break;
      default:
        if (r.item.id) UI.go('search');
    }
  }

  function refsRow(refs) {
    if (!refs || !refs.length) return null;
    var row = D.h('div.jv-refs');
    refs.slice(0, 8).forEach(function (r) {
      if (!r || !r.label) return;
      row.appendChild(D.h('button.jv-ref', {
        type: 'button',
        title: 'Open ' + r.label,
        onclick: function () { openRef(r); }
      }, [
        D.icon(refIcon(r.kind), 11),
        D.h('span', { text: r.label })
      ]));
    });
    return row.childNodes.length ? row : null;
  }

  function chipRow(chips) {
    if (!chips || !chips.length) return null;
    var row = D.h('div.jv-chips');
    chips.slice(0, 3).forEach(function (c) {
      if (!c || !c.label) return;
      row.appendChild(D.h('button.jv-chip', {
        type: 'button',
        onclick: function () { submit(c.ask); }
      }, [D.icon('arrowRight', 11), D.h('span', { text: c.label })]));
    });
    return row.childNodes.length ? row : null;
  }

  function refIcon(kind) {
    return {
      event: 'calendar', task: 'checkSquare', deadline: 'flag', note: 'note',
      project: 'folder', goal: 'target', habit: 'repeat', person: 'users'
    }[kind] || 'link';
  }

  /* --------------------------------------------------------- result card */

  function resultCard(output) {
    if (!output || !output.lines || !output.lines.length) return null;
    var card = D.h('div.jv-card');
    card.appendChild(D.h('div.jv-card__head', [
      D.icon(iconForKind(output.kind), 12),
      D.h('span', { text: headingForKind(output.kind) })
    ]));
    var list = D.h('ul.jv-list');
    output.lines.slice(0, 12).forEach(function (line) {
      list.appendChild(D.h('li.jv-list__item', [
        D.h('span.jv-list__dot', { 'aria-hidden': 'true' }),
        D.h('span', { text: line })
      ]));
    });
    if (output.lines.length > 12) {
      list.appendChild(D.h('li.jv-list__item', [
        D.h('span.jv-list__dot', { 'aria-hidden': 'true' }),
        D.h('span', { text: '…and ' + (output.lines.length - 12) + ' more' })
      ]));
    }
    card.appendChild(D.h('div.jv-card__body', list));
    return card;
  }

  function iconForKind(kind) {
    return {
      agenda: 'calendar', slots: 'clock', whatnow: 'compass', tasks: 'checkSquare',
      ranked: 'flag', conflicts: 'alert', workload: 'chart', deadlines: 'flag',
      review: 'chart', search: 'search', memory: 'book', plan: 'sparkle'
    }[kind] || 'list';
  }

  function headingForKind(kind) {
    return {
      agenda: 'Agenda', slots: 'Open time', whatnow: 'Right now', tasks: 'Tasks',
      ranked: 'Priorities', conflicts: 'Conflicts', workload: 'Workload',
      deadlines: 'Deadlines', review: 'Week review', search: 'Results',
      memory: 'Recalled', plan: 'Plan'
    }[kind] || 'Result';
  }

  /* ------------------------------------------------------- proposal card */

  function proposalCard(entry, turn, index) {
    var proposal = entry.proposal;
    var node = D.h('div.jv-propose');
    var state = (turn.applied && turn.applied[index]) || null;   // {status, detail}
    var bulk = proposal.changes && proposal.changes.length > 1;

    node.appendChild(D.h('div.jv-propose__head', [
      D.h('span.jv-propose__icon', { 'aria-hidden': 'true' },
        D.icon(state && state.status === 'applied' ? 'check' : bulk ? 'layers' : 'sparkle', 12)),
      D.h('div', [
        D.h('p.jv-propose__title', { text: proposal.title }),
        proposal.detail ? D.h('p.jv-propose__detail', { text: proposal.detail }) : null
      ])
    ]));

    // A bulk proposal lists each change with its own Apply, so three of five
    // can be taken and the rest simply never happen.
    if (bulk) {
      turn.changeState = turn.changeState || {};
      var cstate = turn.changeState[index] = turn.changeState[index] || {};
      var list = D.h('ul.jv-propose__changes');

      proposal.changes.forEach(function (change, ci) {
        var done = cstate[ci];
        var row = D.h('li.jv-change' + (done ? '.is-' + done.status : ''));
        row.appendChild(D.h('div.jv-change__body', [
          D.h('p.jv-change__title', { text: change.title }),
          change.detail ? D.h('p.jv-change__detail', { text: change.detail }) : null,
          change.preview ? D.h('p.jv-change__preview', { text: change.preview }) : null,
          done ? D.h('p.jv-change__result' + (done.status === 'applied' ? '' : '.is-bad'), {
            text: done.detail
          }) : null,
          refsRow(change.refs)
        ]));

        if (!done && !state) {
          row.appendChild(D.h('div.jv-change__actions', [
            D.h('button.btn.btn--ghost.btn--sm', {
              type: 'button',
              onclick: function () {
                var res = assistant().applyChange(change);
                cstate[ci] = { status: res.ok ? 'applied' : 'failed', detail: res.detail };
                UI.toast(res.ok ? change.title : 'Could not apply: ' + res.detail,
                  { tone: res.ok ? 'ok' : 'warn' });
                afterChange();
              }
            }, 'Apply'),
            D.h('button.btn.btn--ghost.btn--sm.jv-change__skip', {
              type: 'button',
              onclick: function () {
                cstate[ci] = { status: 'skipped', detail: 'Skipped — nothing changed.' };
                renderAll();
              }
            }, 'Skip')
          ]));
        }
        list.appendChild(row);
      });
      node.appendChild(list);
    } else if (proposal.items && proposal.items.length) {
      var items = D.h('ul.jv-propose__items');
      proposal.items.slice(0, 12).forEach(function (item) {
        items.appendChild(D.h('li.jv-propose__item', { text: item }));
      });
      node.appendChild(items);
    }

    var refs = refsRow(proposal.refs);
    if (refs && !bulk) node.appendChild(D.h('div.jv-propose__refs', refs));

    if (state) {
      node.classList.add(state.status === 'applied' ? 'is-applied' : 'is-discarded');
      node.appendChild(D.h('div.jv-propose__done' + (state.status === 'failed' ? '.is-bad' : ''), [
        D.icon(state.status === 'applied' ? 'check' : state.status === 'failed' ? 'alert' : 'x', 13),
        D.h('span', { text: state.detail })
      ]));
      return node;
    }

    node.appendChild(D.h('div.jv-propose__foot', [
      D.h('button.btn.btn--primary.btn--sm', {
        type: 'button',
        onclick: function () {
          // The assistant commits, then reads the data back. What is reported
          // here is the verification result, not the absence of an exception.
          var res = assistant().apply(proposal);
          turn.applied = turn.applied || {};
          turn.applied[index] = {
            status: res.ok ? 'applied' : 'failed',
            detail: res.ok
              ? res.detail + ' Undo from the top bar or Ctrl+Z.'
              : res.detail
          };
          UI.toast(res.ok ? proposal.title : 'Not applied: ' + res.detail,
            { tone: res.ok ? 'ok' : 'warn' });
          afterChange();
        }
      }, [D.icon('check', 14), D.h('span', { text: bulk ? 'Apply all' : 'Apply' })]),
      D.h('button.btn.btn--ghost.btn--sm', {
        type: 'button',
        onclick: function () {
          turn.applied = turn.applied || {};
          turn.applied[index] = { status: 'discarded', detail: 'Discarded — nothing was changed.' };
          renderAll();
        }
      }, 'Discard'),
      D.h('span.jv-propose__detail', { text: 'Nothing changes until you approve.' })
    ]));

    return node;
  }

  /* Re-render the console and the calendar together, so a change JARVIS made
     appears in the calendar in the same frame it is confirmed in the thread. */
  function afterChange() {
    renderAll();
    UI.refresh();
    document.documentElement.classList.add('jv-just-changed');
    setTimeout(function () {
      document.documentElement.classList.remove('jv-just-changed');
    }, 700);
  }

  /* --------------------------------------------------------------- trace */

  function traceBlock(trace, key) {
    if (!trace || !trace.length) return null;
    var open = !!state.traceOpen[key];
    var node = D.h('div.jv-trace' + (open ? '.is-open' : ''));
    var body = D.h('div.jv-trace__body');

    trace.forEach(function (entry) {
      body.appendChild(D.h('div.jv-trace__row', [
        D.h('span.jv-trace__phase', { text: entry.phase }),
        D.h('span.jv-trace__detail', { text: entry.detail }),
        D.h('span.jv-trace__conf', { text: entry.confidence === undefined ? '' : entry.confidence.toFixed(2) })
      ]));
    });

    node.appendChild(D.h('button.jv-trace__toggle', {
      type: 'button',
      'aria-expanded': open ? 'true' : 'false',
      onclick: function () {
        state.traceOpen[key] = !state.traceOpen[key];
        renderAll();
      }
    }, [
      D.icon('layers', 12),
      D.h('span', { text: trace.length + ' reasoning step' + (trace.length === 1 ? '' : 's') }),
      D.h('span.jv-trace__chev', { 'aria-hidden': 'true' }, D.icon('chevronRight', 12))
    ]));
    node.appendChild(body);
    return node;
  }

  /* -------------------------------------------------------------- thread */

  function renderThread(container) {
    D.clear(container);
    var a = assistant();

    if (!a.conversation.length && !state.busy) {
      container.appendChild(emptyState());
      return;
    }

    a.conversation.forEach(function (turn, i) {
      if (turn.role === 'user') {
        container.appendChild(D.h('div.jv__turn.jv__turn--user', [
          D.h('div.jv__bubble', { text: turn.text })
        ]));
        return;
      }

      var block = D.h('div.jv__turn.jv__turn--agent' + (turn.error ? '.is-error' : ''));
      block.appendChild(agentByline(
        turn.run && turn.run.status === 'needs_clarification' ? 'JARVIS · needs a detail' : 'JARVIS'
      ));
      block.appendChild(D.h('div.jv__bubble', { text: turn.text }));

      var run = turn.run;
      if (run) {
        // Result cards for every step that produced structured output.
        (run.tree ? run.tree.children(run.tree.rootId) : []).forEach(function (task) {
          if (task.proposal) return;    // proposals render separately below
          var card = resultCard(task.output);
          if (card) block.appendChild(card);
          // Anything the answer named is clickable straight through to the
          // real record, so JARVIS's replies navigate the calendar.
          var refs = refsRow(task.output && task.output.refs);
          if (refs) block.appendChild(refs);
        });

        (run.proposals || []).forEach(function (entry, index) {
          block.appendChild(proposalCard(entry, turn, index));
        });

        // One-tap follow-ups that run a real command — how a conversation
        // turns into calendar work without a mode switch.
        var chips = chipRow(run.chips);
        if (chips) block.appendChild(chips);

        // A plain chat turn does not need a reasoning trace; showing "5 steps"
        // for "hey" is noise. Keep it for work that actually did something.
        if (run.mode !== 'conversation') {
          var trace = traceBlock(run.trace, 'turn' + i);
          if (trace) block.appendChild(trace);
        }
      }

      container.appendChild(block);
    });

    if (state.busy) {
      var live = D.h('div.jv__turn.jv__turn--agent');
      live.appendChild(agentByline('JARVIS'));
      var last = state.liveTrace && state.liveTrace.length
        ? state.liveTrace[state.liveTrace.length - 1]
        : null;
      live.appendChild(D.h('div.jv-thinking', [
        D.h('span.jv-thinking__dots', [
          D.h('span.jv-thinking__dot'), D.h('span.jv-thinking__dot'), D.h('span.jv-thinking__dot')
        ]),
        D.h('span', { text: last ? last.phase + ' — ' + last.detail : 'Thinking…' })
      ]));
      container.appendChild(live);
    }

    container.scrollTop = container.scrollHeight;
  }

  function emptyState() {
    var node = D.h('div.jv__empty');
    node.appendChild(D.h('span.jv__empty-mark', { 'aria-hidden': 'true' }, D.icon('sparkle', 20)));
    node.appendChild(D.h('h3.jv__empty-title', { text: 'JARVIS' }));
    node.appendChild(D.h('p.jv__empty-body', {
      text: 'Ask about your calendar, your tasks or your week. I plan before I act, ' +
        'show my reasoning, and never change anything without asking first.'
    }));
    return node;
  }

  /* ------------------------------------------------------------ composer */

  function buildComposer() {
    var a = assistant();
    var wrap = D.h('div.jv__composer');

    var openers = D.h('div.jv__openers');
    a.openers().forEach(function (o) {
      openers.appendChild(D.h('button.jv__opener', {
        type: 'button',
        onclick: function () { submit(o.text); }
      }, o.label));
    });

    var input = D.h('textarea.jv__input', {
      rows: 1,
      placeholder: state.listening ? 'Listening…' : 'Ask JARVIS, or press the mic and talk…',
      'aria-label': 'Ask JARVIS'
    });
    input.value = state.listening ? state.heard : state.draft;

    var mic = JV.VOICE.canListen()
      ? D.h('button.jv__mic' + (state.listening ? '.is-live' : ''), {
        type: 'button',
        'aria-label': state.listening ? 'Stop listening' : 'Speak to JARVIS',
        'aria-pressed': state.listening ? 'true' : 'false',
        title: state.listening ? 'Listening — click to stop' : 'Speak to JARVIS',
        onclick: toggleListening
      }, D.icon(state.listening ? 'pause' : 'mic', 15))
      : null;

    var send = D.h('button.jv__send', {
      type: 'button', 'aria-label': 'Send', disabled: !state.draft.trim() || state.busy
    }, D.icon('arrowRight', 15));

    function autosize() {
      input.style.height = 'auto';
      input.style.height = Math.min(140, input.scrollHeight) + 'px';
    }

    input.addEventListener('input', function () {
      state.draft = input.value;
      send.disabled = !input.value.trim() || state.busy;
      autosize();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit(input.value);
      }
    });

    send.addEventListener('click', function () { submit(input.value); });

    wrap.appendChild(openers);
    wrap.appendChild(D.h('div.jv__input-row' + (state.listening ? '.is-listening' : ''),
      [input, mic, send].filter(Boolean)));
    wrap.appendChild(D.h('div.jv__composer-meta', state.listening
      ? [
        D.h('span.jv__listening', [
          D.h('span.jv__listening-dot', { 'aria-hidden': 'true' }),
          D.h('span', { text: 'Listening — pause when you are done' })
        ])
      ]
      : [
        D.h('kbd', { text: 'Enter' }),
        D.h('span', { text: 'send' }),
        D.h('kbd', { text: 'Shift ↵' }),
        D.h('span', { text: 'new line' }),
        D.h('span', { text: '·' }),
        D.h('span', { text: a.autoApply ? 'Auto-apply is on' : 'Asks before changing anything' })
      ]));

    setTimeout(autosize, 0);
    return { node: wrap, input: input };
  }

  /* ----------------------------------------------------------------- run */

  function submit(text) {
    var goal = String(text || '').trim();
    if (!goal || state.busy) return;

    state.draft = '';
    state.busy = true;
    state.liveTrace = [];
    renderAll();

    assistant().ask(goal, {
      onTrace: function (entry, trace) {
        state.liveTrace = trace.slice();
        renderAll();
      }
    }).then(function (result) {
      state.busy = false;
      state.liveTrace = null;
      // Open the trace for a run that needed clarification: the reason is the
      // interesting part when the answer is a question.
      if (result && result.status === 'needs_clarification') {
        state.traceOpen['turn' + (assistant().conversation.length - 1)] = true;
      }
      if (result && result.answer) speakReply(result.answer);
      renderAll();
      focusInput();
    }).catch(function () {
      state.busy = false;
      state.liveTrace = null;
      renderAll();
    });
  }

  function focusInput() {
    var last = surfaces[surfaces.length - 1];
    if (last && last.input && document.body.contains(last.input)) last.input.focus();
  }

  /* -------------------------------------------------------------- panels */

  function statusPanel() {
    var a = assistant();
    var s = a.status();
    var panel = D.h('div.jv-panel');
    panel.appendChild(D.h('h3.jv-panel__title', { text: 'Agents' }));

    var agents = D.h('div.jv-agents');
    s.agents.forEach(function (agent) {
      agents.appendChild(D.h('span.jv-agent' + (agent.health === 'ok' ? '' : '.is-' + agent.health), [
        D.h('span.jv-agent__dot', { 'aria-hidden': 'true' }),
        D.h('span', { text: agent.name })
      ]));
    });
    panel.appendChild(agents);

    panel.appendChild(D.h('div', { style: { marginTop: 'var(--sp-4)' } }, [
      D.h('h3.jv-panel__title', { text: 'Memory' }),
      D.h('div.jv-stat', [
        D.h('span.jv-stat__label', { text: 'Facts' }),
        D.h('span.jv-stat__value', { text: String(s.memory.semantic) })
      ]),
      D.h('div.jv-stat', [
        D.h('span.jv-stat__label', { text: 'Episodes' }),
        D.h('span.jv-stat__value', { text: String(s.memory.episodic) })
      ]),
      D.h('div.jv-stat', [
        D.h('span.jv-stat__label', { text: 'Learned skills' }),
        D.h('span.jv-stat__value', { text: String(s.memory.procedural) })
      ])
    ]));

    return panel;
  }

  function toolsPanel() {
    var a = assistant();
    var panel = D.h('div.jv-panel');
    panel.appendChild(D.h('h3.jv-panel__title', { text: 'Tools · ' + a.tools.size() }));
    var list = D.h('div.jv-tools');
    a.tools.specs().forEach(function (spec) {
      list.appendChild(D.h('span.jv-tool' + (spec.mutates ? '.is-write' : ''), {
        text: spec.name, title: spec.description
      }));
    });
    panel.appendChild(list);
    panel.appendChild(D.h('p.jv__empty-body', {
      style: { marginTop: 'var(--sp-3)', textAlign: 'left', maxWidth: 'none' },
      text: 'Warm names change your data and always ask first.'
    }));
    return panel;
  }

  /* Everything JARVIS holds, readable and editable one row at a time.
     A memory you cannot inspect is not something you can consent to. */
  function memoryPanel() {
    var a = assistant();
    var panel = D.h('div.jv-panel');
    var entries = a.memoryList();

    panel.appendChild(D.h('h3.jv-panel__title', {
      text: 'What JARVIS remembers · ' + entries.length
    }));

    var toggle = D.h('input', { type: 'checkbox', checked: a.memoryEnabled });
    toggle.addEventListener('change', function () {
      a.setMemoryEnabled(toggle.checked);
      UI.toast(toggle.checked ? 'Memory on' : 'Memory off — nothing will be read or written');
      renderAll();
    });
    panel.appendChild(D.h('label.jv-switch', [
      toggle, D.h('span', { text: 'Remember how I work' })
    ]));

    if (!a.memoryEnabled) {
      panel.appendChild(D.h('p.jv-panel__note', {
        text: 'Memory is off. Nothing is read or written; what is already stored is kept but unused.'
      }));
    }

    if (!entries.length) {
      panel.appendChild(D.h('p.jv-panel__note', {
        text: 'Nothing stored yet. Tell JARVIS something like “I focus best in the mornings”.'
      }));
    } else {
      var list = D.h('ul.jv-mem');
      entries.slice(0, 12).forEach(function (entry) {
        var row = D.h('li.jv-mem__row');
        var text = D.h('span.jv-mem__text', { text: entry.text });
        row.appendChild(D.h('span.jv-mem__kind', { text: entry.kind }));
        row.appendChild(text);
        row.appendChild(D.h('span.jv-mem__actions', [
          D.iconButton('edit', 'Edit this memory', function () {
            var next = global.prompt('Edit this memory', entry.text);
            if (next === null) return;
            var trimmed = next.trim();
            if (!trimmed) return;
            a.editMemory(entry, trimmed);
            renderAll();
          }, { class: 'jv-mem__btn' }),
          D.iconButton('trash', 'Forget this', function () {
            a.forget(entry);
            UI.toast('Forgotten');
            renderAll();
          }, { class: 'jv-mem__btn' })
        ]));
        list.appendChild(row);
      });
      panel.appendChild(list);
      if (entries.length > 12) {
        panel.appendChild(D.h('p.jv-panel__note', {
          text: 'Showing the 12 most recent of ' + entries.length + '.'
        }));
      }
    }

    return panel;
  }

  /* Observations, never actions. Each one hands the question back to you. */
  function insightsPanel() {
    var a = assistant();
    var items = a.insights();
    if (!items.length) return null;

    var panel = D.h('div.jv-panel');
    panel.appendChild(D.h('h3.jv-panel__title', { text: 'Worth knowing' }));
    items.forEach(function (i) {
      panel.appendChild(D.h('button.jv-insight.is-' + (i.tone || 'info'), {
        type: 'button',
        onclick: function () { UI.jarvis(i.ask); }
      }, [
        D.icon(i.icon || 'sparkle', 13),
        D.h('span', { text: i.text })
      ]));
    });
    return panel;
  }

  /* Connecting a model is what turns JARVIS from "good at your calendar and
     honest about the rest" into a general assistant. It is off until you fill
     this in, and the panel says plainly what turning it on means. */
  function modelPanel() {
    var a = assistant();
    var cfg = {};
    try { cfg = Object.assign({}, S.settings().jarvisRemote || {}); } catch (err) { cfg = {}; }

    var panel = D.h('div.jv-panel');
    panel.appendChild(D.h('h3.jv-panel__title', { text: 'Language model' }));

    var live = a.remote && a.remote.available();
    panel.appendChild(D.h('p.jv-panel__note', {
      text: live
        ? 'Connected. JARVIS can answer general questions and chat freely. Calendar changes still go through its own tools, so it cannot invent an event.'
        : 'Not connected. JARVIS handles your calendar and everyday conversation on its own, and says so plainly when a question needs knowledge it does not have. Nothing leaves this browser until you connect a model here.'
    }));

    function save(patch) {
      Object.assign(cfg, patch);
      S.setSetting('jarvisRemote', cfg);
      a.refreshRemote();
      renderAll();
    }

    var enable = D.h('input', { type: 'checkbox', checked: !!cfg.enabled });
    enable.addEventListener('change', function () { save({ enabled: enable.checked }); });
    panel.appendChild(D.h('label.jv-switch', [
      enable, D.h('span', { text: 'Use a language model for conversation' })
    ]));

    /* One-click setup for the options that cost nothing. Ollama is the only
       one that needs no account at all — it runs on your own machine. The rest
       have free tiers and want a key you paste in below. */
    var PRESETS = [
      {
        id: 'ollama', label: 'Ollama', hint: 'Runs on your machine · no key, no account',
        cfg: { flavour: 'openai', endpoint: 'http://localhost:11434/v1/chat/completions', model: 'llama3.2', apiKey: '' }
      },
      {
        id: 'groq', label: 'Groq', hint: 'Free tier · needs a key',
        cfg: { flavour: 'openai', endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile' }
      },
      {
        id: 'gemini', label: 'Google AI Studio', hint: 'Free tier · needs a key',
        cfg: { flavour: 'openai', endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.0-flash' }
      },
      {
        id: 'openrouter', label: 'OpenRouter', hint: 'Has free models · needs a key',
        cfg: { flavour: 'openai', endpoint: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-3.3-70b-instruct:free' }
      },
      {
        id: 'anthropic', label: 'Anthropic', hint: 'Paid · needs a key',
        cfg: { flavour: 'anthropic', endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-4-5' }
      }
    ];

    panel.appendChild(D.h('p.jv-panel__note', { text: 'Start from a preset, then paste your key:' }));
    var presetRow = D.h('div.jv-presets');
    PRESETS.forEach(function (preset) {
      presetRow.appendChild(D.h('button.jv-preset' + (cfg.endpoint === preset.cfg.endpoint ? '.is-on' : ''), {
        type: 'button', title: preset.hint,
        onclick: function () { save(Object.assign({ enabled: true }, preset.cfg)); }
      }, [
        D.h('span.jv-preset__name', { text: preset.label }),
        D.h('span.jv-preset__hint', { text: preset.hint })
      ]));
    });
    panel.appendChild(presetRow);

    var form = D.h('div.jv-form');
    [
      { key: 'flavour', label: 'Provider', placeholder: 'anthropic / openai / ollama' },
      { key: 'endpoint', label: 'Endpoint', placeholder: 'https://api.anthropic.com/v1/messages' },
      { key: 'model', label: 'Model', placeholder: 'claude-sonnet-4-5' },
      { key: 'apiKey', label: 'API key', placeholder: 'stored in this browser only', password: true }
    ].forEach(function (f) {
      var input = D.h('input.jv-form__input', {
        type: f.password ? 'password' : 'text',
        value: cfg[f.key] || '',
        placeholder: f.placeholder,
        'aria-label': f.label
      });
      input.addEventListener('change', function () {
        var patch = {};
        patch[f.key] = input.value.trim();
        save(patch);
      });
      form.appendChild(D.h('label.jv-form__row', [
        D.h('span.jv-form__label', { text: f.label }), input
      ]));
    });
    panel.appendChild(form);

    return panel;
  }

  /* Voice settings. Both halves use what the browser already provides, so
     there is nothing to install and no key — but recognition and synthesis
     have very different privacy properties and the panel says which is which. */
  function voicePanel() {
    var prefs = voicePrefs();
    var panel = D.h('div.jv-panel');
    panel.appendChild(D.h('h3.jv-panel__title', { text: 'Voice' }));

    if (JV.VOICE.canSpeak()) {
      var speakBox = D.h('input', { type: 'checkbox', checked: !!prefs.speak });
      speakBox.addEventListener('change', function () {
        setVoicePref({ speak: speakBox.checked });
        if (!speakBox.checked) JV.VOICE.cancel();
        renderAll();
      });
      panel.appendChild(D.h('label.jv-switch', [
        speakBox, D.h('span', { text: 'Read replies aloud' })
      ]));

      var list = JV.VOICE.voices();
      if (list.length) {
        var select = D.h('select.jv-form__input', { 'aria-label': 'Voice' });
        select.appendChild(D.h('option', { value: '', text: 'Automatic' }));
        list.forEach(function (v) {
          var opt = D.h('option', { value: v.name, text: v.name + ' · ' + v.lang });
          if (JV.VOICE.getVoice() === v.name) opt.selected = true;
          select.appendChild(opt);
        });
        select.addEventListener('change', function () {
          JV.VOICE.setVoice(select.value);
          setVoicePref({ voice: select.value });
          if (select.value) JV.VOICE.speak('This is how I sound.');
        });
        panel.appendChild(D.h('div.jv-form', [
          D.h('label.jv-form__row', [D.h('span.jv-form__label', { text: 'Voice' }), select])
        ]));
      }
      panel.appendChild(D.h('p.jv-panel__note', {
        text: 'Speaking runs on your device using the voices your system already has. Nothing is sent anywhere.'
      }));
    } else {
      panel.appendChild(D.h('p.jv-panel__note', { text: 'This browser cannot synthesise speech.' }));
    }

    if (JV.VOICE.canListen()) {
      panel.appendChild(D.h('p.jv-panel__note', {
        text: 'The microphone button is in the composer. Note that speech recognition is not local: ' +
          'your browser streams the audio to its speech service (Google\'s, in Chrome and Edge) and sends text back. ' +
          'Everything else in Cadence stays in this browser.'
      }));
    } else {
      panel.appendChild(D.h('p.jv-panel__note', { text: JV.VOICE.listenUnavailableReason() }));
    }

    return panel;
  }

  function controlsPanel() {
    var a = assistant();
    var panel = D.h('div.jv-panel');
    panel.appendChild(D.h('h3.jv-panel__title', { text: 'Behaviour' }));

    var auto = D.h('input', { type: 'checkbox', checked: a.autoApply });
    auto.addEventListener('change', function () {
      a.autoApply = auto.checked;
      a.persist();
      renderAll();
    });

    panel.appendChild(D.h('label.jv-switch', [
      auto,
      D.h('span', {
        text: 'Apply changes without asking. Off by default — everything stays undoable either way.'
      })
    ]));

    panel.appendChild(D.h('div', { style: { marginTop: 'var(--sp-4)', display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' } }, [
      D.h('button.btn.btn--ghost.btn--sm', {
        type: 'button',
        onclick: function () {
          UI.confirm({
            title: 'Clear this conversation?',
            message: 'The thread goes away. What JARVIS has learned about how you work stays.',
            confirmLabel: 'Clear'
          }).then(function (ok) {
            if (!ok) return;
            a.clearConversation();
            state.traceOpen = {};
            renderAll();
          });
        }
      }, 'Clear thread'),
      D.h('button.btn.btn--ghost.btn--sm', {
        type: 'button',
        onclick: function () {
          UI.confirm({
            title: 'Forget everything learned?',
            message: 'Removes every fact, episode and lesson JARVIS has stored about how you work. Your calendar and tasks are untouched.',
            confirmLabel: 'Forget',
            tone: 'danger'
          }).then(function (ok) {
            if (!ok) return;
            a.forgetAll();
            UI.toast('JARVIS memory cleared');
            renderAll();
          });
        }
      }, 'Forget everything')
    ]));

    return panel;
  }

  /* --------------------------------------------------------- the surfaces */

  function buildConsole(opts) {
    opts = opts || {};
    var root = D.h('div.jv');

    var head = D.h('div.jv__head', [
      D.h('span.jv__mark', { 'aria-hidden': 'true' }, D.icon('sparkle', 14)),
      D.h('div.jv__headings', [
        D.h('h2.jv__title', { text: 'JARVIS' }),
        stateChip()
      ])
    ]);

    var actions = D.h('div.jv__head-actions');

    if (JV.VOICE.canSpeak()) {
      actions.appendChild(D.iconButton(
        speakingOn() ? 'speaker' : 'speakerOff',
        speakingOn() ? 'Stop reading replies aloud' : 'Read replies aloud',
        function () {
          var on = !speakingOn();
          setVoicePref({ speak: on });
          if (!on) JV.VOICE.cancel();
          else JV.VOICE.speak('Voice on.');
          renderAll();
        },
        { class: speakingOn() ? 'is-on' : '' }
      ));
    }

    if (opts.expandable) {
      actions.appendChild(D.iconButton('arrowUpRight', 'Open the full console', function () {
        UI.toggleJarvisDock(false);
        UI.go('jarvis');
      }));
    }
    if (opts.closable) {
      actions.appendChild(D.iconButton('x', 'Close JARVIS', function () {
        UI.toggleJarvisDock(false);
      }));
    }
    head.appendChild(actions);

    var thread = D.h('div.jv__thread', { 'aria-live': 'polite', 'aria-label': 'Conversation with JARVIS' });
    var composer = buildComposer();

    root.appendChild(head);
    root.appendChild(thread);
    root.appendChild(composer.node);

    var surface = { root: root, thread: thread, input: composer.input, head: head };
    surfaces.push(surface);
    renderThread(thread);
    return surface;
  }

  /* Re-render every mounted surface from state. */
  function renderAll() {
    surfaces = surfaces.filter(function (s) { return document.body.contains(s.root); });
    surfaces.forEach(function (s) {
      renderThread(s.thread);

      // The status chip is live state, so it is replaced on every render.
      var oldChip = s.head && s.head.querySelector('.jv-state');
      if (oldChip) oldChip.parentNode.replaceChild(stateChip(), oldChip);

      // The composer's live bits (send enabled, auto-apply note) are cheap to
      // rebuild and keeping them in sync avoids two sources of truth.
      var oldComposer = s.root.querySelector('.jv__composer');
      if (oldComposer) {
        var next = buildComposer();
        s.root.replaceChild(next.node, oldComposer);
        s.input = next.input;
      }
    });

    // Memory counts and agent health change on every run, so the side panels
    // are part of the live state, not decoration painted once at mount.
    panelHosts = panelHosts.filter(function (n) { return document.body.contains(n); });
    panelHosts.forEach(fillPanels);
  }

  var panelHosts = [];

  function fillPanels(host) {
    D.clear(host);
    D.append(host, [insightsPanel(), statusPanel(), voicePanel(), memoryPanel(),
      modelPanel(), toolsPanel(), controlsPanel()]);
  }

  /* ---------------------------------------------------------------- dock */

  var dockNode = null;

  function ensureDock() {
    if (dockNode && document.body.contains(dockNode)) return dockNode;
    dockNode = D.h('aside.jv-dock', { 'aria-label': 'JARVIS assistant', hidden: true });
    (D.qs('.app') || document.body).appendChild(dockNode);
    return dockNode;
  }

  /* Escape closes the console, including from inside the composer — where the
     app's own handler deliberately ignores keys so typing is never hijacked. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !dockOpen()) return;
    if (UI.anyOpen && UI.anyOpen()) return;   // a modal on top closes first
    e.preventDefault();
    toggleDock(false);
  });

  function toggleDock(force) {
    var node = ensureDock();
    var show = force === undefined ? node.hidden : !!force;
    if (show) {
      D.clear(node);
      node.appendChild(buildConsole({ expandable: true, closable: true }).root);
      node.hidden = false;
      setTimeout(focusInput, 30);
    } else {
      node.hidden = true;
      D.clear(node);
      surfaces = surfaces.filter(function (s) { return document.body.contains(s.root); });
    }
    // The grid column only exists while the console is open.
    document.documentElement.classList.toggle('has-jv-dock', !node.hidden);
    try { S.setPref('jarvisDockOpen', !node.hidden); } catch (err) { /* pref is optional */ }
    return !node.hidden;
  }

  function dockOpen() { return !!(dockNode && !dockNode.hidden); }

  /* ---------------------------------------------------------------- view */

  function renderView(root) {
    var wrap = D.h('div.jv-view');
    var main = D.h('div.jv-view__main');
    main.appendChild(buildConsole({ expandable: false, closable: false }).root);

    var side = D.h('div.jv-view__side');
    fillPanels(side);
    panelHosts.push(side);

    wrap.appendChild(main);
    wrap.appendChild(side);
    root.appendChild(wrap);
    setTimeout(focusInput, 30);
  }

  Views.jarvis = {
    render: function (root) { renderView(root); },
    rerender: function (root) { D.clear(root); renderView(root); }
  };

  // Voice lists populate asynchronously, so restore the preference on the next
  // tick as well as immediately.
  restoreVoice();
  setTimeout(restoreVoice, 600);

  Object.assign(UI, {
    jarvis: function (text) {
      // Open the console and optionally run something immediately.
      if (!dockOpen() && UI.currentRoute().route !== 'jarvis') toggleDock(true);
      if (text) submit(text);
      else setTimeout(focusInput, 40);
    },
    toggleJarvisDock: toggleDock,
    jarvisDockOpen: dockOpen,
    jarvisAsk: submit,
    renderJarvis: renderAll
  });
})(window);
