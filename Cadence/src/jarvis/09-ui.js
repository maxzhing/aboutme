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
    traceOpen: {}         // turn index -> bool
  };

  var surfaces = [];      // mounted {root, thread, composer} to keep in sync

  function assistant() { return JV.assistant || JV.boot(); }

  /* ------------------------------------------------------------ helpers */

  function agentByline(text) {
    return D.h('div.jv__byline', [
      D.h('span.jv__byline-mark', { 'aria-hidden': 'true' }, D.icon('sparkle', 10)),
      D.h('span', { text: text || 'JARVIS' })
    ]);
  }

  function confidenceLabel(v) {
    return JV.confidence.label(v) + ' confidence';
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
    var applied = turn.applied && turn.applied[index];

    function head() {
      return D.h('div.jv-propose__head', [
        D.h('span.jv-propose__icon', { 'aria-hidden': 'true' },
          D.icon(applied === 'applied' ? 'check' : 'sparkle', 12)),
        D.h('div', [
          D.h('p.jv-propose__title', { text: proposal.title }),
          proposal.detail ? D.h('p.jv-propose__detail', { text: proposal.detail }) : null
        ])
      ]);
    }

    node.appendChild(head());

    if (proposal.items && proposal.items.length) {
      var list = D.h('ul.jv-propose__items');
      proposal.items.slice(0, 10).forEach(function (item) {
        list.appendChild(D.h('li.jv-propose__item', { text: item }));
      });
      node.appendChild(list);
    }

    if (applied === 'applied') {
      node.classList.add('is-applied');
      node.appendChild(D.h('div.jv-propose__done', [
        D.icon('check', 13), D.h('span', { text: 'Applied. Undo from the top bar or Ctrl+Z.' })
      ]));
      return node;
    }
    if (applied === 'discarded') {
      node.classList.add('is-discarded');
      node.appendChild(D.h('div.jv-propose__done', [
        D.icon('x', 13), D.h('span', { text: 'Discarded — nothing was changed.' })
      ]));
      return node;
    }

    node.appendChild(D.h('div.jv-propose__foot', [
      D.h('button.btn.btn--primary.btn--sm', {
        type: 'button',
        onclick: function () {
          try {
            assistant().apply(proposal);
            turn.applied = turn.applied || {};
            turn.applied[index] = 'applied';
            UI.toast(proposal.title, { tone: 'ok' });
            renderAll();
            UI.refresh();
          } catch (err) {
            UI.toast('That could not be applied: ' + (err && err.message ? err.message : err), { tone: 'warn' });
          }
        }
      }, [D.icon('check', 14), D.h('span', { text: 'Apply' })]),
      D.h('button.btn.btn--ghost.btn--sm', {
        type: 'button',
        onclick: function () {
          turn.applied = turn.applied || {};
          turn.applied[index] = 'discarded';
          renderAll();
        }
      }, 'Discard'),
      D.h('span.jv-propose__detail', { text: 'Nothing changes until you approve.' })
    ]));

    return node;
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
        });

        (run.proposals || []).forEach(function (entry, index) {
          block.appendChild(proposalCard(entry, turn, index));
        });

        var trace = traceBlock(run.trace, 'turn' + i);
        if (trace) block.appendChild(trace);
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
      placeholder: 'Ask JARVIS about your schedule…',
      'aria-label': 'Ask JARVIS'
    });
    input.value = state.draft;

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
    wrap.appendChild(D.h('div.jv__input-row', [input, send]));
    wrap.appendChild(D.h('div.jv__composer-meta', [
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
      }, 'Forget memory')
    ]));

    return panel;
  }

  /* --------------------------------------------------------- the surfaces */

  function buildConsole(opts) {
    opts = opts || {};
    var root = D.h('div.jv');

    var head = D.h('div.jv__head', [
      D.h('span.jv__mark', { 'aria-hidden': 'true' }, D.icon('sparkle', 14)),
      D.h('div', [
        D.h('h2.jv__title', { text: 'JARVIS' }),
        D.h('p.jv__subtitle', { text: 'Plans before it acts' })
      ])
    ]);

    var actions = D.h('div.jv__head-actions');
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

    var surface = { root: root, thread: thread, input: composer.input };
    surfaces.push(surface);
    renderThread(thread);
    return surface;
  }

  /* Re-render every mounted surface from state. */
  function renderAll() {
    surfaces = surfaces.filter(function (s) { return document.body.contains(s.root); });
    surfaces.forEach(function (s) {
      renderThread(s.thread);
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
    D.append(host, [statusPanel(), toolsPanel(), controlsPanel()]);
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
