import { h, clear, fmtDate, titleCase } from '../dom.js';
import { icon } from '../icons.js';
import { prose } from '../markdown.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { state, update } from '../state.js';
import { toast, skeleton, emptyState, modal } from '../ui.js';
import {
  statTile,
  masteryPips,
  masteryMeter,
  masteryDistribution,
  conceptField,
  barChart,
  masteryColour,
  MASTERY_LABELS,
} from '../render/charts.js';
import { resourceLabel } from '../render/resource.js';
import { startGeneration } from './studio.js';

const SIGNAL_ICON = { review: 'repeat', weakness: 'target', misconception: 'alert', ready: 'trophy' };

export function dashboardView() {
  const root = h('div.page.wide.stack', { style: { gap: '22px' } });
  const statsHost = h('div');
  const signalHost = h('div');
  const chartHost = h('div.grid.two');
  const insightHost = h('div');
  const gridHost = h('div.grid.two');

  root.appendChild(
    h(
      'div.spread',
      {},
      h(
        'div',
        {},
        h('h1.page-title', {}, 'Your learning'),
        h(
          'p.page-sub',
          {},
          'Mastery is earned by demonstration, never by activity. A concept only reaches level 5 once you have solved, explained, applied and transferred it — and still had it a day later.',
        ),
      ),
      h('button.btn.primary', { type: 'button', onClick: () => navigate('/') }, icon('sparkles', { size: 14 }), 'Learn something new'),
    ),
  );
  root.appendChild(statsHost);
  root.appendChild(signalHost);
  root.appendChild(chartHost);
  root.appendChild(insightHost);
  root.appendChild(gridHost);

  statsHost.appendChild(skeleton(1, 92));
  chartHost.appendChild(skeleton(2, 220));

  load();

  async function load() {
    let data;
    try {
      data = await api.dashboard();
    } catch (err) {
      clear(statsHost);
      clear(chartHost);
      clear(gridHost);
      root.appendChild(h('p', { style: { color: 'var(--critical)' } }, err.message));
      return;
    }
    update({ dashboard: data });
    drawStats(data);
    drawSignals(data);
    drawCharts(data);
    drawGrid(data);
    loadInsights();
  }

  /* ------------------------------------------------------------- stat row */

  function drawStats(data) {
    const concepts = data.subjects.flatMap((s) => s.concepts);
    const mastered = concepts.filter((c) => c.mastery_level >= 5).length;
    const accuracy = data.stats.accuracy;

    clear(statsHost).appendChild(
      h(
        'div.stat-grid.stagger',
        {},
        statTile({
          label: 'Concepts mastered',
          value: `${mastered}`,
          delta: concepts.length ? `of ${concepts.length} tracked` : 'nothing tracked yet',
          wide: true,
        }),
        statTile({
          label: 'Recent accuracy',
          value: accuracy == null ? '—' : `${Math.round(accuracy * 100)}%`,
          delta: `across ${data.stats.attempts} graded attempts`,
          status:
            accuracy == null
              ? null
              : accuracy >= 0.7
                ? { kind: 'good', text: 'holding up' }
                : { kind: 'warning', text: 'below where it should be' },
        }),
        statTile({
          label: 'Due for review',
          value: String(data.dueNow),
          delta: data.dueNow ? 'retrieval beats re-reading' : 'nothing due today',
        }),
        statTile({
          label: 'Open misconceptions',
          value: String(data.misconceptions.length),
          delta: 'specific broken ideas, not topics',
          status: data.misconceptions.length
            ? { kind: 'critical', text: 'these need re-teaching' }
            : { kind: 'good', text: 'none outstanding' },
        }),
      ),
    );
  }

  /* -------------------------------------------------------------- signals */

  function drawSignals(data) {
    clear(signalHost);
    if (!data.signals?.length) return;
    signalHost.appendChild(
      h(
        'div.stack.stagger',
        { style: { gap: '8px' } },
        ...data.signals.map((signal) =>
          h(
            'div.signal',
            {},
            h(`div.signal-icon.${signal.kind}`, {}, icon(SIGNAL_ICON[signal.kind] || 'info', { size: 16 })),
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

  /* --------------------------------------------------------------- charts */

  function drawCharts(data) {
    clear(chartHost);
    const concepts = data.subjects.flatMap((s) => s.concepts);
    if (!concepts.length) {
      chartHost.appendChild(
        card(
          'Your mastery map',
          'chart',
          emptyState('Nothing tracked yet', 'The moment you answer a question, this fills in.', null, 'grid'),
        ),
      );
      return;
    }

    const counts = [0, 0, 0, 0, 0, 0];
    for (const concept of concepts) counts[Math.max(0, Math.min(5, concept.mastery_level || 0))]++;
    chartHost.appendChild(card('Mastery distribution', 'chart', masteryDistribution(counts)));

    const field = conceptField(
      concepts.map((c) => ({ ...c, correct: Math.round((c.accuracy || 0) * (c.attempts || 0)) })),
      { onSelect: (concept) => startGeneration({ kind: 'practice_set', topic: concept.name }) },
    );
    if (field) chartHost.appendChild(card('Concepts in play', 'target', field));
  }

  /* -------------------------------------------------------------- insights */

  async function loadInsights() {
    clear(insightHost).appendChild(
      h('section.card', {}, h('div.card-head', {}, icon('trend', { size: 15 }), h('h2', {}, 'What your history shows')), skeleton(1, 46)),
    );
    try {
      const insights = await api.insights();
      clear(insightHost);
      if (!insights.headline && !insights.patterns?.length) return;
      insightHost.appendChild(
        h(
          'section.card',
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
          insights.headline
            ? h('p', { style: { fontSize: '15.5px', marginBottom: '14px', letterSpacing: '-0.012em' } }, insights.headline)
            : null,
          insights.patterns?.length
            ? h(
                'div.stack.stagger',
                { style: { gap: '10px' } },
                ...insights.patterns.map((pattern) =>
                  h(
                    'div.block.concept',
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
                { style: { marginTop: '14px' } },
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

  /* ----------------------------------------------------------------- grid */

  function drawGrid(data) {
    clear(gridHost);

    gridHost.appendChild(
      card(
        'Continue learning',
        'clock',
        data.continueLearning.length
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
          : emptyState('Nothing in progress', 'Start a session and it waits for you here.'),
      ),
    );

    gridHost.appendChild(
      card(
        'Weak areas',
        'target',
        data.weakAreas.length
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
                    h(
                      'div.concept-sub',
                      {},
                      `${concept.subject} · ${Math.round((concept.accuracy || 0) * 100)}% of ${concept.attempts} · ${concept.gap}`,
                    ),
                  ),
                  h(
                    'div.row',
                    { style: { gap: '10px' } },
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
          : emptyState('No weak areas yet', 'Answer some questions and the gaps show up here.'),
      ),
    );

    gridHost.appendChild(
      card(
        'Upcoming reviews',
        'repeat',
        data.upcomingReviews.length
          ? h(
              'div.stack',
              { style: { gap: '4px' } },
              ...data.upcomingReviews.map((concept) =>
                h(
                  'div.concept-row',
                  {},
                  h('div', {}, h('div.concept-name', {}, concept.name), h('div.concept-sub', {}, concept.subject)),
                  h(
                    'div.row',
                    { style: { gap: '10px' } },
                    h(
                      'span',
                      { class: `chip${concept.overdue ? ' warning' : ''}` },
                      concept.overdue ? icon('alert', { size: 11 }) : null,
                      concept.due,
                    ),
                    h(
                      'button.btn.sm.ghost',
                      { type: 'button', onClick: () => startGeneration({ kind: 'review', topic: concept.name, subject: concept.subject }) },
                      'Review',
                    ),
                  ),
                ),
              ),
            )
          : emptyState('No reviews scheduled', 'Learn something and reviews schedule themselves.'),
      ),
    );

    gridHost.appendChild(
      card(
        'Progress by subject',
        'layers',
        data.subjects.length
          ? h(
              'div.stack',
              { style: { gap: '20px' } },
              ...data.subjects.map((subject) =>
                h(
                  'div.stack',
                  { style: { gap: '10px' } },
                  h(
                    'div.spread',
                    {},
                    h('b', { style: { fontSize: '13.5px' } }, subject.subject),
                    h('span.tiny.dim', {}, `${subject.mastered}/${subject.total} mastered`),
                  ),
                  ...subject.concepts
                    .slice(0, 5)
                    .map((concept) => masteryMeter(concept.mastery_level, concept.name)),
                  subject.concepts.length > 5
                    ? h('button.btn.sm.ghost', { type: 'button', onClick: () => navigate('/progress') }, `+${subject.concepts.length - 5} more`)
                    : null,
                ),
              ),
            )
          : emptyState('No progress yet', 'Your mastery map builds itself as you work.'),
      ),
    );

    gridHost.appendChild(card('Learning goals', 'flag', goalsCard(data)));

    gridHost.appendChild(
      card(
        'Recent work',
        'library',
        data.recentWork.length
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
                    h('span', {}, `${resourceLabel(resource.kind)} · ${fmtDate(resource.created_at)}`),
                  ),
                  resource.score != null
                    ? h('span.chip.good', {}, icon('check', { size: 11 }), `${resource.score}/${resource.max_score}`)
                    : icon('arrowRight', { size: 14 }),
                ),
              ),
            )
          : emptyState('Nothing made yet', 'Lessons, worksheets and quizzes land here once you generate them.'),
      ),
    );

    gridHost.appendChild(
      card(
        'Open misconceptions',
        'alert',
        data.misconceptions.length
          ? h(
              'div.stack',
              { style: { gap: '10px' } },
              barChart(
                data.misconceptions.slice(0, 6).map((m) => ({
                  label: m.label,
                  value: m.count,
                  colour: 'var(--serious)',
                })),
                {
                  title: 'How often each has resurfaced',
                  width: 470,
                  labelWidth: 150,
                  format: (v) => `${v}×`,
                  tip: (row) => `<b>${row.label}</b><span>Seen ${row.value} time${row.value === 1 ? '' : 's'}</span>`,
                },
              ),
              h(
                'div.stack',
                { style: { gap: '6px' } },
                ...data.misconceptions.slice(0, 4).map((m) =>
                  h(
                    'div.list-item',
                    {},
                    h('div', {}, h('b', {}, m.label), h('span', {}, titleCase(m.error_type || 'unclassified'))),
                    h(
                      'button.btn.sm.ghost',
                      {
                        type: 'button',
                        onClick: () =>
                          startGeneration({
                            kind: 'practice_set',
                            topic: m.label,
                            instructions: `Target this misconception directly: "${m.label}".`,
                          }),
                      },
                      'Drill it',
                    ),
                  ),
                ),
              ),
            )
          : emptyState('None open', 'Mistakes get logged here until you clear them.'),
      ),
    );
  }

  /* ---------------------------------------------------------------- goals */

  function goalsCard(data) {
    const host = h('div.stack', { style: { gap: '14px' } });

    if (!data.goals.length) {
      host.appendChild(emptyState('No goals set', 'A goal gives Axiom a target to sequence everything else against.'));
    } else {
      for (const goal of data.goals) {
        const pct = Math.round((goal.progress || 0) * 100);
        host.appendChild(
          h(
            'div.stack',
            { style: { gap: '7px' } },
            h(
              'div.spread',
              {},
              h('b', { style: { fontSize: '13.5px' } }, goal.title),
              h('span.tiny.dim', {}, goal.target_date ? `by ${goal.target_date}` : `${goal.tracked} concepts`),
            ),
            h(
              'div.meter-track',
              {},
              h('div.meter-fill', { style: { width: `${pct}%`, background: masteryColour(Math.round((goal.progress || 0) * 5)) } }),
            ),
            h(
              'div.spread.tiny.dim',
              {},
              h('span', {}, `${goal.mastered}/${goal.tracked || 0} mastered · ${pct}%`),
              goal.roadmap?.resourceId
                ? h('button.btn.sm.ghost', { type: 'button', onClick: () => navigate(`/resource/${goal.roadmap.resourceId}`) }, 'Open roadmap')
                : h('button.btn.sm.ghost', { type: 'button', onClick: (event) => buildRoadmap(goal, event.currentTarget) }, 'Build a roadmap'),
            ),
          ),
        );
      }
    }

    host.appendChild(
      h('button.btn.sm', { type: 'button', style: { justifySelf: 'start' }, onClick: newGoal }, icon('plus', { size: 13 }), 'Add a goal'),
    );
    return host;
  }

  function newGoal() {
    modal((panel, close) => {
      const title = h('input.input', { placeholder: 'e.g. Master single-variable calculus' });
      const subject = h('input.input', { placeholder: 'Subject (Maths, Biology…)' });
      const date = h('input.input', { type: 'date' });
      panel.appendChild(h('h3', {}, 'What are you working towards?'));
      panel.appendChild(h('p.tiny.muted', {}, 'Axiom sequences lessons, practice and review against this.'));
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

export { MASTERY_LABELS };
