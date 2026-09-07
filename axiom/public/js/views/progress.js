import { h, clear, fmtDate, titleCase } from '../dom.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { masteryPips, skeleton, emptyState, barRow } from '../ui.js';
import { startGeneration } from './studio.js';

const LEVEL_LABEL = ['Not introduced', 'Introduced', 'Developing', 'Competent', 'Strong', 'Mastered'];

export function progressView() {
  const body = h('div.stack', { style: { gap: '18px' } });
  const root = h(
    'div.page.wide.stack',
    { style: { gap: '18px' } },
    h(
      'div',
      {},
      h('h1.serif', { style: { fontSize: '30px', letterSpacing: '-0.02em' } }, 'Mastery map'),
      h(
        'p.tiny.muted',
        {},
        'Level 5 requires solving, explaining, applying and transferring a concept — and still having it a day later.',
      ),
    ),
    body,
  );

  body.appendChild(skeleton(3, 120));

  Promise.all([api.concepts(), api.history()])
    .then(([{ concepts }, { attempts }]) => {
      clear(body);
      if (!concepts.length) {
        body.appendChild(emptyState('Nothing tracked yet', 'Concepts appear here the moment you start working on them.'));
        return;
      }

      const distribution = [0, 0, 0, 0, 0, 0];
      for (const concept of concepts) distribution[concept.mastery_level]++;

      body.appendChild(
        h(
          'section.card',
          {},
          h('div.card-head', {}, icon('chart', { size: 15 }), h('h2', {}, 'Where your concepts sit')),
          h(
            'div.bars',
            {},
            ...distribution.map((count, level) =>
              barRow(
                `${level} · ${LEVEL_LABEL[level]}`,
                count,
                concepts.length,
                level >= 5 ? 'var(--mint)' : level >= 3 ? 'var(--accent)' : level >= 1 ? 'var(--amber)' : 'var(--ink-500)',
              ),
            ),
          ),
        ),
      );

      const bySubject = new Map();
      for (const concept of concepts) {
        if (!bySubject.has(concept.subject)) bySubject.set(concept.subject, []);
        bySubject.get(concept.subject).push(concept);
      }

      for (const [subject, list] of bySubject) {
        body.appendChild(
          h(
            'section.card',
            {},
            h('div.card-head', {}, icon('layers', { size: 15 }), h('h2', {}, subject), h('span.tiny.dim', {}, `${list.length} concepts`)),
            h(
              'div.stack',
              { style: { gap: '2px' } },
              ...list
                .sort((a, b) => b.mastery_level - a.mastery_level || b.attempts - a.attempts)
                .map((concept) =>
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
                        `${LEVEL_LABEL[concept.mastery_level]} · ability ${concept.ability.toFixed(1)} · ` +
                          (concept.attempts ? `${Math.round((concept.accuracy || 0) * 100)}% of ${concept.attempts}` : 'untested') +
                          (concept.due ? ` · ${concept.due}` : ''),
                      ),
                      h('div.concept-sub', { style: { color: 'var(--text-dim)' } }, concept.gap),
                    ),
                    h(
                      'div.row',
                      { style: { gap: '10px' } },
                      masteryPips(concept.mastery_level),
                      h(
                        'button.btn.sm.ghost',
                        {
                          type: 'button',
                          onClick: () =>
                            startGeneration({
                              kind: concept.mastery_level >= 4 ? 'mastery_check' : concept.mastery_level <= 1 ? 'lesson' : 'practice_set',
                              topic: concept.name,
                              subject: concept.subject,
                            }),
                        },
                        concept.mastery_level >= 4 ? 'Mastery check' : concept.mastery_level <= 1 ? 'Learn it' : 'Practise',
                      ),
                    ),
                  ),
                ),
            ),
          ),
        );
      }

      if (attempts.length) {
        body.appendChild(
          h(
            'section.card',
            {},
            h('div.card-head', {}, icon('clock', { size: 15 }), h('h2', {}, 'Attempt history')),
            h(
              'div.stack',
              { style: { gap: '2px' } },
              ...attempts.slice(0, 30).map((attempt) =>
                h(
                  'div.concept-row',
                  {},
                  h(
                    'div',
                    {},
                    h('div.concept-name', {}, attempt.concept_name || 'Unknown concept'),
                    h(
                      'div.concept-sub',
                      {},
                      `${fmtDate(attempt.created_at)} · difficulty ${attempt.difficulty}` +
                        (attempt.misconception ? ` · ${attempt.misconception}` : ''),
                    ),
                  ),
                  h(
                    'div.row',
                    { style: { gap: '6px' } },
                    attempt.error_type && attempt.error_type !== 'none'
                      ? h('span.chip', {}, titleCase(attempt.error_type))
                      : null,
                    h(
                      'span',
                      { class: `chip ${attempt.verdict === 'correct' ? 'mint' : attempt.verdict === 'partial' ? 'amber' : 'rose'}` },
                      `${attempt.score}/${attempt.max_score}`,
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      }
    })
    .catch((err) => {
      clear(body).appendChild(h('p', { style: { color: 'var(--rose)' } }, err.message));
    });

  return root;
}
