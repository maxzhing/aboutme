import { h, clear, fmtDate } from '../dom.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { skeleton, emptyState } from '../ui.js';
import { renderResource, resourceLabel } from '../render/resource.js';
import { startGeneration } from './studio.js';

export function libraryView() {
  const list = h('div.stack', { style: { gap: '8px' } });
  const root = h(
    'div.page.stack',
    { style: { gap: '18px' } },
    h(
      'div.spread',
      {},
      h(
        'div',
        {},
        h('h1.serif', { style: { fontSize: '30px', letterSpacing: '-0.02em' } }, 'Library'),
        h('p.tiny.muted', {}, 'Everything Axiom has made for you.'),
      ),
      h('button.btn.primary', { type: 'button', onClick: () => navigate('/studio') }, icon('wand', { size: 14 }), 'Make something'),
    ),
    list,
  );

  list.appendChild(skeleton(4, 56));
  api
    .resources()
    .then(({ resources }) => {
      clear(list);
      if (!resources.length) {
        list.appendChild(
          emptyState(
            'Nothing here yet',
            'Lessons, worksheets, quizzes, flashcards and plans all land here once you make them.',
            h('button.btn.primary', { type: 'button', onClick: () => navigate('/studio') }, 'Open the studio'),
          ),
        );
        return;
      }
      for (const resource of resources) {
        list.appendChild(
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
                `${resourceLabel(resource.kind)} · ${resource.topic || ''} · ${fmtDate(resource.created_at)}`,
              ),
            ),
            h(
              'div.row',
              { style: { gap: '8px' } },
              resource.score != null ? h('span.chip.mint', {}, `${resource.score}/${resource.max_score}`) : null,
              h('span.chip', {}, `D${Number(resource.difficulty).toFixed(1).replace(/\.0$/, '')}`),
              icon('arrowRight', { size: 14 }),
            ),
          ),
        );
      }
    })
    .catch((err) => {
      clear(list).appendChild(h('p', { style: { color: 'var(--rose)' } }, err.message));
    });

  return root;
}

export function resourceView({ params }) {
  const host = h('div.page.stack');
  host.appendChild(skeleton(3, 90));

  api
    .resource(params.id)
    .then(({ resource }) => {
      clear(host);
      document.dispatchEvent(
        new CustomEvent('axiom:title', { detail: { title: resource.title, sub: resourceLabel(resource.kind) } }),
      );
      host.appendChild(
        h(
          'div.row',
          { style: { marginBottom: '10px' } },
          h('button.btn.sm.ghost', { type: 'button', onClick: () => history.back() }, icon('arrowLeft', { size: 13 }), 'Back'),
          resource.session_id
            ? h(
                'button.btn.sm.ghost',
                { type: 'button', onClick: () => navigate(`/session/${resource.session_id}`) },
                icon('spark', { size: 13 }),
                'Back to the session',
              )
            : null,
        ),
      );
      host.appendChild(
        renderResource(resource, {
          onGenerateMore: (kind, topic, extra) => startGeneration({ kind, topic, subject: resource.subject, ...extra }),
          onGenerated: (made) => navigate(`/resource/${made.id}`),
          onNextStep: (step) => startGeneration({ kind: 'practice_set', topic: `${resource.topic}: ${step}` }),
        }),
      );
    })
    .catch((err) => {
      clear(host).appendChild(h('p', { style: { color: 'var(--rose)' } }, err.message));
    });

  return host;
}
