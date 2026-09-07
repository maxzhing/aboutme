import { h, clear, autosize, titleCase, scrollToEnd } from '../dom.js';
import { icon } from '../icons.js';
import { prose } from '../markdown.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { state } from '../state.js';
import { toast, masteryBar, statusLine, modal } from '../ui.js';
import { renderBlocks } from '../render/blocks.js';
import { questionCard } from '../render/question.js';
import { renderResource, resourceLabel } from '../render/resource.js';
import { refreshSessions } from '../../app.js';

const INTENT_LABEL = {
  diagnose: 'Diagnosing',
  teach: 'Teaching',
  demonstrate: 'Demonstrating',
  probe: 'Probing',
  feedback: 'Feedback',
  reteach: 'Re-teaching',
  assess: 'Assessing',
  advance: 'Advancing',
  plan: 'Planning',
  wrap_up: 'Wrapping up',
};

const STUCK_OPTIONS = [
  ['hint', 'Hint', 'The smallest possible nudge'],
  ['bigger_hint', 'Bigger hint', 'Reveal just the next step'],
  ['explain', 'Explain it', 'Re-teach the idea a different way'],
  ['worked_example', 'Worked example', 'Show a similar problem solved'],
  ['start_over', 'Start over', 'Go back to the prerequisite'],
];

/** §9 teaching modes — the learner can change how the tutor works at any point. */
const MODES = [
  ['learn', 'Learn', 'Teach it to me interactively'],
  ['practice', 'Practice', 'Give me targeted questions'],
  ['quiz', 'Quiz', 'Test me without helping'],
  ['master', 'Master', 'Build a full mastery pathway'],
  ['homework', 'Homework', 'Help me work through my own assignment'],
  ['review', 'Review', 'Find and fix my weak spots'],
  ['exam_prep', 'Exam prep', 'Exam-style preparation'],
  ['crash_course', 'Crash course', 'Maximum useful material, minimum time'],
  ['explore', 'Explore', 'Let me follow my curiosity'],
];

const QUICK_ACTIONS = [
  ['practice_set', 'Practice set', 'target'],
  ['worksheet', 'Worksheet', 'file'],
  ['quiz', 'Quiz', 'help'],
  ['flashcards', 'Flashcards', 'cards'],
  ['study_guide', 'Study guide', 'book'],
  ['mastery_check', 'Mastery check', 'trophy'],
];

export function sessionView({ params }) {
  const thread = h('div.thread');
  const composerHost = h('div.composer');
  const sideHost = h('aside.session-side');
  const main = h('div.session-main', {}, thread, composerHost);
  const root = h('div.session', {}, main, sideHost);

  let session = null;
  let sending = false;
  let activeCard = null;

  /* ------------------------------------------------------------- rendering */

  function learnerTurn(text) {
    return h(
      'div.turn.learner',
      {},
      h(
        'div.turn-head',
        {},
        h('div.turn-avatar.learner', {}, icon('brain', { size: 13 })),
        h('span.turn-label', {}, 'You'),
      ),
      h('div.turn-body', {}, h('div.bubble', {}, prose(text))),
    );
  }

  function tutorTurnNode(turn, { streaming = false } = {}) {
    const body = h('div.turn-body.stack');

    if (turn.say) body.appendChild(prose(turn.say, streaming ? 'stream-cursor' : ''));
    if (turn.strategy_note) {
      body.appendChild(
        h('div.strategy-note', {}, icon('compass', { size: 14 }), h('span', {}, turn.strategy_note)),
      );
    }
    const blocks = renderBlocks(turn.blocks || []);
    if (blocks) body.appendChild(blocks);

    if (turn.activity?.question && !streaming) {
      if (turn.activity.instructions) {
        body.appendChild(h('p.tiny.muted', {}, turn.activity.instructions));
      }
      const card = questionCard(turn.activity.question, {
        mode: 'callback',
        submitLabel: 'Submit answer',
        sessionId: session?.id,
        subject: session?.subject,
        onStuck: () => openStuckMenu(),
        onSubmit: async (answer, controls) => {
          controls.lock();
          await send(answer, null, { echo: answer });
        },
      });
      activeCard = card;
      body.appendChild(card.el);
    }

    if (turn.suggestions?.length && !streaming) {
      body.appendChild(
        h(
          'div.row.wrap',
          {},
          ...turn.suggestions.map((s) =>
            h(
              'button.btn.sm',
              { type: 'button', onClick: () => runSuggestion(s.action) },
              icon(iconForAction(s.action), { size: 13 }),
              s.label,
            ),
          ),
        ),
      );
    }

    return h(
      'div.turn.tutor',
      {},
      h(
        'div.turn-head',
        {},
        h('div.turn-avatar', {}, icon('spark', { size: 13 })),
        h('span.turn-label', {}, 'Axiom'),
        turn.intent ? h('span.turn-intent', {}, INTENT_LABEL[turn.intent] || titleCase(turn.intent)) : null,
        turn.focus_concept ? h('span.chip', {}, turn.focus_concept) : null,
      ),
      body,
    );
  }

  function iconForAction(action) {
    return (
      {
        harder: 'flame',
        easier: 'scale',
        practice_set: 'target',
        worksheet: 'file',
        quiz: 'help',
        explain_more: 'lightbulb',
        worked_example: 'zap',
        next_concept: 'arrowRight',
        flashcards: 'cards',
        study_guide: 'book',
        plan: 'calendar',
      }[action] || 'arrowRight'
    );
  }

  function evaluationNode(evaluation) {
    if (!evaluation) return null;
    const { grade, concept, next } = evaluation;
    return h(
      'div.turn.fade-up',
      {},
      h(
        'div.turn-body',
        {},
        h(
          'div.row.wrap',
          { style: { paddingLeft: '0' } },
          h(
            'span',
            { class: `chip ${grade.verdict === 'correct' ? 'mint' : grade.verdict === 'partial' ? 'amber' : 'rose'}` },
            `${grade.verdict === 'correct' ? 'Correct' : grade.verdict === 'partial' ? 'Partly right' : 'Not right'} · ${grade.score}/${grade.max_score}`,
          ),
          grade.error_type && grade.error_type !== 'none' ? h('span.chip', {}, titleCase(grade.error_type)) : null,
          concept ? h('span.chip', {}, `${concept.name} → ${concept.mastery_label}`) : null,
          next ? h('span.chip', {}, `Next difficulty ${next.difficulty}`) : null,
        ),
      ),
    );
  }

  /* -------------------------------------------------------------- side rail */

  function drawSide() {
    clear(sideHost);
    if (!session) return;
    const plan = session.plan || {};
    const sessionState = session.state || {};

    sideHost.appendChild(
      h(
        'div.side-block',
        {},
        h('div.side-title', {}, 'This session'),
        h('div.spread.tiny', {}, h('span.muted', {}, 'Mode'), h('span.chip.accent', {}, titleCase(session.mode))),
        h('div.spread.tiny', {}, h('span.muted', {}, 'Phase'), h('span', {}, titleCase(sessionState.phase || 'teach'))),
        h('div.spread.tiny', {}, h('span.muted', {}, 'Focus'), h('span', {}, sessionState.focusConcept || session.topic || '—')),
        h('div.spread.tiny', {}, h('span.muted', {}, 'Difficulty'), h('span', {}, String(sessionState.difficulty ?? plan.difficulty ?? '—'))),
        plan.time_minutes ? h('div.spread.tiny', {}, h('span.muted', {}, 'Planned'), h('span', {}, `${plan.time_minutes} min`)) : null,
        plan.assumption ? h('p.tiny.dim', {}, `Assumed: ${plan.assumption}`) : null,
      ),
    );

    if (plan.concepts?.length) {
      sideHost.appendChild(
        h(
          'div.side-block',
          {},
          h('div.side-title', {}, 'Concepts in play'),
          ...plan.concepts.map((name) => {
            const concept = (state.dashboard?.subjects || [])
              .flatMap((s) => s.concepts)
              .find((c) => c.name.toLowerCase() === name.toLowerCase());
            return masteryBar(concept?.mastery_level ?? 0, name);
          }),
        ),
      );
    }

    sideHost.appendChild(
      h(
        'div.side-block',
        {},
        h('div.side-title', {}, 'Teaching mode'),
        h(
          'div.toggle-group',
          {},
          ...MODES.map(([value, label, detail]) =>
            h(
              'button',
              {
                type: 'button',
                title: detail,
                class: `toggle${session.mode === value ? ' on' : ''}`,
                onClick: () => switchMode(value, detail),
              },
              label,
            ),
          ),
        ),
      ),
    );

    sideHost.appendChild(
      h(
        'div.side-block',
        {},
        h('div.side-title', {}, "I'm stuck"),
        h(
          'div.stuck-menu',
          {},
          ...STUCK_OPTIONS.map(([directive, title, detail]) =>
            h(
              'button.stuck-option',
              { type: 'button', onClick: () => send('', directive) },
              h('b', {}, title),
              h('span', {}, detail),
            ),
          ),
        ),
      ),
    );

    sideHost.appendChild(
      h(
        'div.side-block',
        {},
        h('div.side-title', {}, 'Adjust'),
        h(
          'div.row.wrap',
          {},
          h('button.btn.sm', { type: 'button', onClick: () => send('', 'harder') }, icon('flame', { size: 13 }), 'Make it harder'),
          h('button.btn.sm', { type: 'button', onClick: () => send('', 'easier') }, icon('scale', { size: 13 }), 'Make it easier'),
          h('button.btn.sm', { type: 'button', onClick: () => send('', 'next_concept') }, icon('arrowRight', { size: 13 }), 'Next concept'),
        ),
      ),
    );

    sideHost.appendChild(
      h(
        'div.side-block',
        {},
        h('div.side-title', {}, 'Build from this session'),
        h(
          'div.row.wrap',
          {},
          ...QUICK_ACTIONS.map(([kind, label, iconName]) =>
            h(
              'button.btn.sm',
              { type: 'button', onClick: () => generate(kind) },
              icon(iconName, { size: 13 }),
              label,
            ),
          ),
        ),
      ),
    );

    const resources = session.resources || [];
    if (resources.length) {
      sideHost.appendChild(
        h(
          'div.side-block',
          {},
          h('div.side-title', {}, 'Made here'),
          ...resources.map((resource) =>
            h(
              'button.list-item',
              { type: 'button', onClick: () => navigate(`/resource/${resource.id}`) },
              h('div', {}, h('b', {}, resource.title), h('span', {}, resourceLabel(resource.kind))),
              icon('arrowRight', { size: 14 }),
            ),
          ),
        ),
      );
    }
  }

  async function switchMode(mode, detail) {
    if (!session || session.mode === mode || sending) return;
    try {
      const { session: updated } = await api.updateSession(session.id, { mode });
      session = { ...updated, resources: session.resources };
      drawSide();
      send('', 'mode_switch', { modeDirective: `${mode}: ${detail}` });
    } catch (err) {
      toast(err.message || 'Could not switch mode.', 'error');
    }
  }

  function openStuckMenu() {
    modal((panel, close) => {
      panel.appendChild(h('h3.serif', { style: { fontSize: '20px' } }, 'What kind of help do you want?'));
      panel.appendChild(h('p.tiny.muted', {}, 'Pick the smallest one that will get you moving — the answer is not on this list.'));
      panel.appendChild(
        h(
          'div.stuck-menu',
          {},
          ...STUCK_OPTIONS.map(([directive, title, detail]) =>
            h(
              'button.stuck-option',
              {
                type: 'button',
                onClick: () => {
                  close();
                  send('', directive);
                },
              },
              h('b', {}, title),
              h('span', {}, detail),
            ),
          ),
        ),
      );
    });
  }

  /* --------------------------------------------------------------- actions */

  async function generate(kind, topicOverride, extra = {}) {
    const topic = topicOverride || session?.state?.focusConcept || session?.topic || session?.title;
    const host = h('div.turn.fade-up', {}, h('div.turn-body', {}, statusLine(`Building a ${resourceLabel(kind).toLowerCase()} on ${topic}…`)));
    thread.appendChild(host);
    scrollToEnd(document.scrollingElement || document.documentElement);

    try {
      await api.generate(
        {
          kind,
          topic,
          subject: session?.subject,
          concepts: extra.concepts || session?.plan?.concepts || [],
          sessionId: session?.id,
          minutes: extra.minutes,
          count: extra.count,
          difficulty: extra.difficulty ?? session?.state?.difficulty,
          instructions: extra.instructions,
          sourceIds: session?.state?.sourceIds || [],
        },
        {
          resource: ({ resource }) => {
            clear(host).appendChild(
              h(
                'div.turn-body',
                {},
                h(
                  'button.list-item',
                  { type: 'button', onClick: () => navigate(`/resource/${resource.id}`) },
                  h('div', {}, h('b', {}, resource.title), h('span', {}, `${resourceLabel(resource.kind)} · open it`)),
                  icon('arrowRight', { size: 14 }),
                ),
              ),
            );
            session.resources = [...(session.resources || []), resource];
            drawSide();
          },
        },
      );
    } catch (err) {
      clear(host).appendChild(h('div.turn-body', {}, h('p.tiny', { style: { color: 'var(--rose)' } }, err.message)));
    }
  }

  function runSuggestion(action) {
    if (['harder', 'easier', 'explain_more', 'worked_example', 'next_concept'].includes(action)) {
      send('', action);
      return;
    }
    generate(action === 'quiz' ? 'quiz' : action);
  }

  async function send(input, directive = null, { echo = null, modeDirective = null } = {}) {
    if (sending || !session) return;
    sending = true;
    activeCard = null;

    const payloadInput = modeDirective
      ? `Switch to ${modeDirective} mode from here. Carry on from where we are, in that mode.`
      : input;

    if (modeDirective) {
      thread.appendChild(
        h('div.turn.learner', {}, h('div.turn-body', {}, h('span.chip.accent', {}, `Mode → ${titleCase(modeDirective.split(':')[0])}`))),
      );
    } else if (echo || input) thread.appendChild(learnerTurn(echo || input));
    else if (directive) {
      thread.appendChild(
        h('div.turn.learner', {}, h('div.turn-body', {}, h('span.chip', {}, titleCase(directive.replace(/_/g, ' '))))),
      );
    }

    const host = h('div.turn.fade-up', {}, h('div.turn-body', {}, statusLine('Thinking…')));
    thread.appendChild(host);
    scrollToEnd(document.scrollingElement || document.documentElement);
    drawComposer();

    try {
      await api.turn(
        session.id,
        { input: payloadInput, directive },
        {
          partial: (partial) => {
            if (!partial?.say) return;
            clear(host).appendChild(tutorTurnNode(partial, { streaming: true }));
          },
          evaluation: (evaluation) => {
            const node = evaluationNode(evaluation);
            if (node) thread.insertBefore(node, host);
          },
          turn: ({ turn, session: updated }) => {
            session = { ...updated, resources: session.resources };
            clear(host).appendChild(tutorTurnNode(turn));
            drawSide();
          },
        },
      );
    } catch (err) {
      clear(host).appendChild(
        h(
          'div.turn-body',
          {},
          h('p.tiny', { style: { color: 'var(--rose)' } }, err.message || 'Something went wrong.'),
          h('button.btn.sm', { type: 'button', onClick: () => send(payloadInput, directive) }, icon('refresh', { size: 13 }), 'Retry'),
        ),
      );
    } finally {
      sending = false;
      drawComposer();
      scrollToEnd(document.scrollingElement || document.documentElement);
    }
  }

  /* -------------------------------------------------------------- composer */

  function drawComposer() {
    clear(composerHost);
    const textarea = h('textarea', {
      placeholder: activeCard ? 'Answer above, or say something here…' : 'Reply, ask a question, or say what is confusing you…',
      rows: 1,
      disabled: sending,
      onKeydown: (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          const value = textarea.value.trim();
          if (value) {
            textarea.value = '';
            send(value);
          }
        }
      },
    });
    autosize(textarea, 220);

    composerHost.appendChild(
      h(
        'div.composer-inner',
        {},
        textarea,
        h(
          'div.composer-bar',
          {},
          h('button.btn.sm.ghost', { type: 'button', disabled: sending, onClick: openStuckMenu }, icon('help', { size: 13 }), "I'm stuck"),
          h('button.btn.sm.ghost', { type: 'button', disabled: sending, onClick: () => send('', 'harder') }, icon('flame', { size: 13 }), 'Harder'),
          h(
            'button.btn.primary.sm.send',
            {
              type: 'button',
              disabled: sending,
              onClick: () => {
                const value = textarea.value.trim();
                if (!value) return;
                textarea.value = '';
                send(value);
              },
            },
            sending ? h('span.spinner') : icon('send', { size: 13 }),
            sending ? 'Working…' : 'Send',
          ),
        ),
      ),
    );
    if (!sending) queueMicrotask(() => textarea.focus());
  }

  /* ------------------------------------------------------------------ boot */

  async function boot() {
    if (params.id === 'new') {
      const pending = state.pendingStart;
      state.pendingStart = null;
      if (!pending) {
        navigate('/');
        return;
      }
      thread.appendChild(learnerTurn(pending.request));
      const host = h('div.turn.fade-up', {}, h('div.turn-body', {}, statusLine('Working out what you need…')));
      thread.appendChild(host);

      try {
        await api.start(pending, {
          status: ({ message }) => clear(host).appendChild(h('div.turn-body', {}, statusLine(message))),
          session: ({ session: created, route }) => {
            session = { ...created, resources: [] };
            history.replaceState(null, '', `#/session/${created.id}`);
            drawSide();
            refreshSessions();
            document.dispatchEvent(new CustomEvent('axiom:title', { detail: { title: created.title, sub: route.understood } }));
            if (route.opening_note) {
              thread.insertBefore(tutorTurnNode({ say: route.opening_note, intent: 'plan', focus_concept: route.topic }), host);
            }
          },
          clarify: ({ question }) => {
            clear(host).appendChild(tutorTurnNode({ say: question, intent: 'diagnose' }));
          },
          partial: (partial) => {
            if (!partial?.say) return;
            clear(host).appendChild(tutorTurnNode(partial, { streaming: true }));
          },
          turn: ({ turn, session: updated }) => {
            session = { ...updated, resources: [] };
            clear(host).appendChild(tutorTurnNode(turn));
            drawSide();
          },
        });
      } catch (err) {
        clear(host).appendChild(
          h('div.turn-body', {}, h('p.tiny', { style: { color: 'var(--rose)' } }, err.message || 'Could not start the session.')),
        );
      }
      drawComposer();
      return;
    }

    try {
      const data = await api.session(params.id);
      session = { ...data.session, resources: data.resources };
      document.dispatchEvent(new CustomEvent('axiom:title', { detail: { title: session.title, sub: session.topic } }));

      for (const message of data.messages) {
        if (message.role === 'user') {
          if (message.body.text) thread.appendChild(learnerTurn(message.body.text));
          else if (message.body.directive) {
            thread.appendChild(
              h('div.turn.learner', {}, h('div.turn-body', {}, h('span.chip', {}, titleCase(String(message.body.directive).replace(/_/g, ' '))))),
            );
          }
        } else {
          thread.appendChild(tutorTurnNode(message.body));
        }
      }
      if (!data.messages.length) {
        thread.appendChild(h('p.muted', {}, 'This session is empty. Say something to get going.'));
      }
      drawSide();
      drawComposer();
      scrollToEnd(document.scrollingElement || document.documentElement, false);
    } catch (err) {
      thread.appendChild(h('p', { style: { color: 'var(--rose)' } }, err.message || 'Session not found.'));
      drawComposer();
    }
  }

  boot();
  return root;
}

export { renderResource };
