import { h, clear, fmtDate, titleCase } from '../dom.js';
import { icon } from '../icons.js';
import { prose } from '../markdown.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { state, update } from '../state.js';
import { toast, masteryPips, skeleton, emptyState, barRow, modal } from '../ui.js';
import { resourceLabel } from '../render/resource.js';
import { startGeneration } from './studio.js';

const SIGNAL_ICON = { review: 'repeat', weakness: 'target', misconception: 'alert', ready: 'trophy' };

export function dashboardView() {
  const root = h('div.page.wide.stack', { style: { gap: '20px' } });
  const statsHost = h('div');
  const signalHost = h('div');
  const gridHost = h('div.grid.two');
  const insightHost = h('div');

  root.appendChild(
    h(
      'div.spread',
      {},
      h(
        'div',
        {},
        h('h1.serif', { style: { fontSize: '30px', letterSpacing: '-0.02em' } }, 'Your learning'),
        h('p.tiny.muted', {}, 'Mastery is earned by demonstration — reading a lesson never moves these numbers.'),
      ),
      h('button.btn.primary', { type: 'button', onClick: () => navigate('/') }, icon('spark', { size: 14 }), 'Learn something new'),
    ),
  );
  root.appendChild(statsHost);
  root.appendChild(signalHost);
  root.appendChild(insightHost);
  root.appendChild(gridHost);

  statsHost.appendChild(skeleton(1, 78));
  gridHost.appendChild(skeleton(2, 200));

  load();

  async function load() {
    let data;
    try {
      data = await api.dashboard();
    } catch (err) {
      clear(statsHost);
      clear(gridHost);
      root.appendChild(h('p', { style: { color: 'var(--rose)' } }, err.message));
      return;
    }
    update({ dashboard: data });
    drawStats(data);
    drawSignals(data);
    drawGrid(data);
    loadInsights();
  }

  function drawStats(data) {
    const mastered = data.subjects.reduce((sum, s) => sum + s.mastered, 0);
    const tracked = data.subjects.reduce((sum, s) => sum + s.total, 0);
    clear(statsHost).appendChild(
      h(
        'div.stat-grid',
        {},
        stat(String(tracked), 'concepts tracked', `${data.subjects.length} subject${data.subjects.length === 1 ? '' : 's'}`),
        stat(String(mastered), 'mastered', tracked ? `${Math.round((mastered / tracked) * 100)}% of tracked` : 'nothing yet'),
        stat(
          data.stats.accuracy == null ? '—' : `${Math.round(data.stats.accuracy * 100)}%`,
          'recent accuracy',
          `${data.stats.attempts} recent attempts`,
        ),
        stat(String(data.dueNow), 'due for review', data.dueNow ? 'retrieval beats re-reading' : 'nothing due'),
        stat(String(data.weakAreas.length), 'weak areas', data.misconceptions.length ? `${data.misconceptions.length} open misconceptions` : 'no open misconceptions'),
      ),
    );
  }

  function stat(value, label, trend) {
    return h('div.stat', {}, h('b', {}, value), h('span', {}, label), trend ? h('span.trend', {}, trend) : null);
  }

  function drawSignals(data) {
    clear(signalHost);
    if (!data.signals?.length) return;
    signalHost.appendChild(
      h(
        'div.stack',
        { style: { gap: '8px' } },
        ...data.signals.map((signal) =>
          h(
            'div.signal',
            {},
            h('div.signal-icon', {}, icon(SIGNAL_ICON[signal.kind] || 'info', { size: 15 })),
            h('div', {}, h('b', {}, signal.title), h('p', {}, signal.detail)),
            signal.action
              ? h(
                  'button.btn.sm',
                  { type: 'button', onClick: () => startGeneration({ kind: signal.action.kind, topic: signal.action.topic }) },
                  signal.action.label,
                )
              : null,
          ),
        ),
      ),
    );
  }

  async function loadInsights() {
    clear(insightHost).appendChild(
      h('div.card', {}, h('div.card-head', {}, h('h2', {}, 'What your history shows')), skeleton(1, 46)),
    );
    try {
      const insights = await api.insights();
      clear(insightHost);
      if (!insights.headline && !insights.patterns?.length) return;
      insightHost.appendChild(
        h(
          'div.card',
          {},
          h(
            'div.card-head',
            {},
            icon('trend', { size: 15 }),
            h('h2', {}, 'What your history shows'),
            h(
              'button.btn.sm.ghost',
              {
                type: 'button',
                onClick: async (event) => {
                  event.currentTarget.disabled = true;
                  await api.insights(true);
                  loadInsights();
                },
              },
              icon('refresh', { size: 13 }),
              'Refresh',
            ),
          ),
          insights.headline ? h('p', { style: { fontSize: '15px', marginBottom: '12px' } }, insights.headline) : null,
          insights.patterns?.length
            ? h(
                'div.stack',
                { style: { gap: '10px' } },
                ...insights.patterns.map((pattern) =>
                  h(
                    'div.block',
                    {},
                    h('h4', {}, pattern.observation),
                    pattern.evidence ? h('p.tiny.dim', {}, pattern.evidence) : null,
                    pattern.action ? prose(`**Do this:** ${pattern.action}`) : null,
                  ),
                ),
              )
            : null,
          insights.recommended?.length
            ? h(
                'div.row.wrap',
                { style: { marginTop: '12px' } },
                ...insights.recommended.map((rec) =>
                  h(
                    'button.btn.sm',
                    {
                      type: 'button',
                      title: rec.why,
                      onClick: () => startGeneration({ kind: rec.kind, topic: rec.topic, minutes: rec.minutes }),
                    },
                    icon('wand', { size: 13 }),
                    rec.title,
                  ),
                ),
              )
            : null,
        ),
      );
    } catch {
      clear(insightHost);
    }
  }

  function drawGrid(data) {
    clear(gridHost);

    gridHost.appendChild(
      card('Continue learning', 'clock', data.continueLearning.length
        ? h(
            'div.stack',
            { style: { gap: '6px' } },
            ...data.continueLearning.map((session) =>
              h(
                'button.list-item',
                { type: 'button', onClick: () => navigate(`/session/${session.id}`) },
                h(
                  'div',
                  {},
                  h('b', {}, session.title),
                  h('span', {}, `${titleCase(session.mode)} · ${session.focus || session.topic || ''} · ${fmtDate(session.updated_at)}`),
                ),
                icon('arrowRight', { size: 14 }),
              ),
            ),
          )
        : emptyState('Nothing in progress', 'Start a session and it will wait for you here.')),
    );

    gridHost.appendChild(
      card('Weak areas', 'target', data.weakAreas.length
        ? h(
            'div.stack',
            { style: { gap: '4px' } },
            ...data.weakAreas.map((concept) =>
              h(
                'div.concept-row',
                {},
                h(
                  'div',
                  {},
                  h('div.concept-name', {}, concept.name),
                  h('div.concept-sub', {}, `${concept.subject} · ${Math.round((concept.accuracy || 0) * 100)}% of ${concept.attempts} · ${concept.gap}`),
                ),
                h(
                  'div.row',
                  { style: { gap: '8px' } },
                  masteryPips(concept.mastery_level),
                  h(
                    'button.btn.sm.ghost',
                    { type: 'button', onClick: () => startGeneration({ kind: 'lesson', topic: concept.name, subject: concept.subject }) },
                    'Fix',
                  ),
                ),
              ),
            ),
          )
        : emptyState('No weak areas yet', 'Answer some questions and the gaps will show up here.')),
    );

    gridHost.appendChild(
      card('Upcoming reviews', 'repeat', data.upcomingReviews.length
        ? h(
            'div.stack',
            { style: { gap: '4px' } },
            ...data.upcomingReviews.map((concept) =>
              h(
                'div.concept-row',
                {},
                h('div', {}, h('div.concept-name', {}, concept.name), h('div.concept-sub', {}, `${concept.subject} · ${concept.due}`)),
                h(
                  'div.row',
                  { style: { gap: '8px' } },
                  h('span', { class: `chip${concept.overdue ? ' amber' : ''}` }, concept.due),
                  h(
                    'button.btn.sm.ghost',
                    { type: 'button', onClick: () => startGeneration({ kind: 'review', topic: concept.name, subject: concept.subject }) },
                    'Review',
                  ),
                ),
              ),
            ),
          )
        : emptyState('No reviews scheduled', 'Learn something and reviews get scheduled automatically.')),
    );

    gridHost.appendChild(
      card('Progress by subject', 'chart', data.subjects.length
        ? h(
            'div.stack',
            { style: { gap: '16px' } },
            ...data.subjects.map((subject) =>
              h(
                'div.stack',
                { style: { gap: '8px' } },
                h(
                  'div.spread',
                  {},
                  h('b', { style: { fontSize: '13.5px' } }, subject.subject),
                  h('span.tiny.dim', {}, `${subject.mastered}/${subject.total} mastered · avg ${subject.average.toFixed(1)}/5`),
                ),
                h(
                  'div.bars',
                  {},
                  ...subject.concepts.slice(0, 6).map((concept) =>
                    barRow(
                      concept.name,
                      concept.mastery_level,
                      5,
                      concept.mastery_level >= 4 ? 'var(--mint)' : concept.mastery_level >= 3 ? 'var(--accent)' : 'var(--amber)',
                    ),
                  ),
                ),
                subject.concepts.length > 6
                  ? h('button.btn.sm.ghost', { type: 'button', onClick: () => navigate('/progress') }, `+${subject.concepts.length - 6} more`)
                  : null,
              ),
            ),
          )
        : emptyState('No progress yet', 'Your mastery map builds itself as you work.')),
    );

    gridHost.appendChild(
      card('Recent work', 'library', data.recentWork.length
        ? h(
            'div.stack',
            { style: { gap: '6px' } },
            ...data.recentWork.map((resource) =>
              h(
                'button.list-item',
                { type: 'button', onClick: () => navigate(`/resource/${resource.id}`) },
                h(
                  'div',
                  {},
                  h('b', {}, resource.title),
                  h(
                    'span',
                    {},
                    `${resourceLabel(resource.kind)} · ${fmtDate(resource.created_at)}${resource.score != null ? ` · ${resource.score}/${resource.max_score}` : ''}`,
                  ),
                ),
                resource.status === 'graded' ? h('span.chip.mint', {}, 'Graded') : icon('arrowRight', { size: 14 }),
              ),
            ),
          )
        : emptyState('Nothing made yet', 'Lessons, worksheets and quizzes you generate land here.')),
    );

    gridHost.appendChild(card('Learning goals', 'flag', goalsCard(data)));

    gridHost.appendChild(
      card('Open misconceptions', 'alert', data.misconceptions.length
        ? h(
            'div.stack',
            { style: { gap: '6px' } },
            ...data.misconceptions.map((m) =>
              h(
                'div.list-item',
                {},
                h('div', {}, h('b', {}, m.label), h('span', {}, `seen ${m.count}× · ${titleCase(m.error_type || 'unclassified')}`)),
                h(
                  'button.btn.sm.ghost',
                  { type: 'button', onClick: () => startGeneration({ kind: 'practice_set', topic: m.label, instructions: `Target this misconception directly: "${m.label}".` }) },
                  'Drill it',
                ),
              ),
            ),
          )
        : emptyState('None open', 'Mistakes get logged here until you clear them.')),
    );
  }

  function goalsCard(data) {
    const host = h('div.stack', { style: { gap: '8px' } });

    if (!data.goals.length) {
      host.appendChild(
        emptyState('No goals set', 'A goal gives Axiom a target to sequence everything else against.'),
      );
    } else {
      for (const goal of data.goals) {
        const pct = Math.round((goal.progress || 0) * 100);
        host.appendChild(
          h(
            'div.stack',
            { style: { gap: '6px' } },
            h(
              'div.spread',
              {},
              h('b', { style: { fontSize: '13.5px' } }, goal.title),
              h(
                'span.tiny.dim',
                {},
                goal.target_date ? `by ${goal.target_date}` : `${goal.tracked} concepts`,
              ),
            ),
            h('div.mastery-bar', {}, h('div.mastery-fill', { style: { width: `${pct}%` } })),
            h(
              'div.spread.tiny.dim',
              {},
              h('span', {}, `${goal.mastered}/${goal.tracked || 0} concepts mastered · ${pct}%`),
              goal.roadmap?.resourceId
                ? h(
                    'button.btn.sm.ghost',
                    { type: 'button', onClick: () => navigate(`/resource/${goal.roadmap.resourceId}`) },
                    'Open roadmap',
                  )
                : h(
                    'button.btn.sm.ghost',
                    { type: 'button', onClick: (event) => buildRoadmap(goal, event.currentTarget) },
                    'Build a roadmap',
                  ),
            ),
          ),
        );
      }
    }

    host.appendChild(
      h(
        'button.btn.sm',
        { type: 'button', style: { justifySelf: 'start' }, onClick: newGoal },
        icon('plus', { size: 13 }),
        'Add a goal',
      ),
    );
    return host;
  }

  function newGoal() {
    modal((panel, close) => {
      const title = h('input.input', { placeholder: 'e.g. Master single-variable calculus' });
      const subject = h('input.input', { placeholder: 'Subject (Maths, Biology…)' });
      const date = h('input.input', { type: 'date' });
      panel.appendChild(h('h3.serif', { style: { fontSize: '20px' } }, 'What are you working towards?'));
      panel.appendChild(h('div.field', {}, h('label', {}, 'Goal'), title));
      panel.appendChild(h('div.field', {}, h('label', {}, 'Subject'), subject));
      panel.appendChild(h('div.field', {}, h('label', {}, 'Target date (optional)'), date));
      panel.appendChild(
        h(
          'div.row',
          { style: { justifyContent: 'flex-end' } },
          h('button.btn', { type: 'button', onClick: close }, 'Cancel'),
          h(
            'button.btn.primary',
            {
              type: 'button',
              onClick: async () => {
                if (!title.value.trim()) return;
                try {
                  await api.createGoal({
                    title: title.value.trim(),
                    subject: subject.value.trim() || 'General',
                    targetDate: date.value || null,
                  });
                  close();
                  load();
                } catch (err) {
                  toast(err.message, 'error');
                }
              },
            },
            'Add goal',
          ),
        ),
      );
    });
  }

  /** A roadmap is a real generated plan, stored and linked back to the goal. */
  async function buildRoadmap(goal, button) {
    button.disabled = true;
    button.replaceChildren(h('span.spinner'));
    const days = goal.target_date
      ? Math.max(1, Math.ceil((new Date(goal.target_date) - Date.now()) / 86400000))
      : 14;
    try {
      await api.generate(
        { kind: 'plan', topic: goal.title, subject: goal.subject || 'General', days: Math.min(60, days), minutes: 45, goal: goal.title },
        {
          resource: async ({ resource }) => {
            await api.updateGoal(goal.id, {
              roadmap: {
                resourceId: resource.id,
                concepts: (resource.payload.days || []).flatMap((day) => day.concepts),
              },
            });
            navigate(`/resource/${resource.id}`);
          },
        },
      );
    } catch (err) {
      toast(err.message || 'Could not build the roadmap.', 'error');
      button.disabled = false;
      button.textContent = 'Build a roadmap';
    }
  }

  function card(title, iconName, body) {
    return h('section.card', {}, h('div.card-head', {}, icon(iconName, { size: 15 }), h('h2', {}, title)), body);
  }

  return root;
}
