import { h, clear } from '../dom.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { skeleton, emptyState, masteryPips } from '../ui.js';
import { startGeneration } from './studio.js';

export function reviewView() {
  const body = h('div.stack', { style: { gap: '16px' } });
  const root = h(
    'div.page.stack',
    { style: { gap: '18px' } },
    h(
      'div',
      {},
      h('h1.serif', { style: { fontSize: '30px', letterSpacing: '-0.02em' } }, 'Review queue'),
      h(
        'p.tiny.muted',
        {},
        'Each concept comes back just before you would forget it. Getting it right pushes the next review further out; getting it wrong pulls it closer.',
      ),
    ),
    body,
  );

  body.appendChild(skeleton(2, 90));

  api
    .reviewQueue()
    .then(({ due, upcoming }) => {
      clear(body);

      body.appendChild(
        h(
          'section.card',
          {},
          h(
            'div.card-head',
            {},
            icon('flame', { size: 15 }),
            h('h2', {}, `Due now (${due.length})`),
            due.length
              ? h(
                  'button.btn.sm.primary',
                  {
                    type: 'button',
                    onClick: () =>
                      startGeneration({
                        kind: 'review',
                        topic: due.map((c) => c.name).slice(0, 4).join(', '),
                        subject: due[0].subject,
                        count: Math.min(10, Math.max(4, due.length * 2)),
                        instructions: 'Mixed retrieval practice across all of these concepts, interleaved rather than blocked.',
                      }),
                  },
                  icon('zap', { size: 13 }),
                  'Review all of them',
                )
              : null,
          ),
          due.length
            ? h(
                'div.stack',
                { style: { gap: '2px' } },
                ...due.map((concept) =>
                  h(
                    'div.concept-row',
                    {},
                    h('div', {}, h('div.concept-name', {}, concept.name), h('div.concept-sub', {}, `${concept.subject} · ${concept.due}`)),
                    h(
                      'div.row',
                      { style: { gap: '10px' } },
                      masteryPips(concept.mastery_level),
                      h(
                        'button.btn.sm.ghost',
                        { type: 'button', onClick: () => startGeneration({ kind: 'review', topic: concept.name, subject: concept.subject, count: 4 }) },
                        'Review',
                      ),
                    ),
                  ),
                ),
              )
            : emptyState('Nothing due', 'You are up to date. Come back when something surfaces.'),
        ),
      );

      if (upcoming.length) {
        body.appendChild(
          h(
            'section.card',
            {},
            h('div.card-head', {}, icon('calendar', { size: 15 }), h('h2', {}, 'Coming up')),
            h(
              'div.stack',
              { style: { gap: '2px' } },
              ...upcoming.map((concept) =>
                h(
                  'div.concept-row',
                  {},
                  h('div', {}, h('div.concept-name', {}, concept.name), h('div.concept-sub', {}, concept.subject)),
                  h('span.chip', {}, concept.due),
                ),
              ),
            ),
          ),
        );
      }
    })
    .catch((err) => clear(body).appendChild(h('p', { style: { color: 'var(--rose)' } }, err.message)));

  return root;
}
