import { h, clear, fmtDate } from '../dom.js';
import { icon } from '../icons.js';
import { prose } from '../markdown.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { state } from '../state.js';
import { toast, statusLine, emptyState, skeleton } from '../ui.js';
import { startGeneration } from './studio.js';
import { resourceLabel } from '../render/resource.js';

export function sourcesView() {
  const list = h('div.stack', { style: { gap: '8px' } });
  const analysisHost = h('div');

  const fileInput = h('input', {
    type: 'file',
    multiple: true,
    accept: '.pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.csv,.json,.tex',
    style: { display: 'none' },
    onChange: (event) => handleFiles([...event.target.files]),
  });

  const dropzone = h(
    'div.dropzone',
    {
      onClick: () => fileInput.click(),
      onDragover: (event) => {
        event.preventDefault();
        dropzone.classList.add('over');
      },
      onDragleave: () => dropzone.classList.remove('over'),
      onDrop: (event) => {
        event.preventDefault();
        dropzone.classList.remove('over');
        handleFiles([...event.dataTransfer.files]);
      },
    },
    icon('upload', { size: 22 }),
    h('p', { style: { marginTop: '8px', fontSize: '14px' } }, 'Drop notes, a worksheet, a chapter or a syllabus here'),
    h('p.tiny.dim', {}, 'PDF, images, or text. Axiom will teach from it rather than around it.'),
  );

  const root = h(
    'div.page.stack',
    { style: { gap: '18px' } },
    h(
      'div',
      {},
      h('h1.serif', { style: { fontSize: '30px', letterSpacing: '-0.02em' } }, 'Your material'),
      h('p.tiny.muted', {}, 'Upload what you are actually being taught from, and everything gets built out of it.'),
    ),
    dropzone,
    fileInput,
    analysisHost,
    list,
  );

  async function handleFiles(files) {
    if (!files.length) return;
    clear(analysisHost).appendChild(statusLine(`Uploading ${files.length} file(s)…`));
    try {
      const { sources, warning } = await api.upload(files);
      if (warning) toast(warning, 'error');
      clear(analysisHost);
      load();
      if (sources[0]) analyse(sources[0].id);
    } catch (err) {
      clear(analysisHost);
      toast(err.message || 'Upload failed.', 'error');
    }
  }

  async function analyse(sourceId) {
    clear(analysisHost).appendChild(statusLine('Reading the document…'));
    try {
      const { analysis, source } = await api.analyzeSource(sourceId);
      clear(analysisHost).appendChild(
        h(
          'section.card.stack',
          {},
          h('div.card-head', {}, icon('file', { size: 15 }), h('h2', {}, analysis.title || source.name), h('span.chip', {}, analysis.level)),
          prose(analysis.summary),
          analysis.concepts?.length
            ? h(
                'div',
                {},
                h('p.tiny.dim', { style: { marginBottom: '6px' } }, 'What is in it:'),
                h('div.row.wrap', {}, ...analysis.concepts.map((c) => h('span.chip', { title: c.summary }, c.name))),
              )
            : null,
          h(
            'div.row.wrap',
            { style: { marginTop: '4px' } },
            ...(analysis.suggested || []).map((suggestion) =>
              h(
                'button.btn.sm',
                {
                  type: 'button',
                  title: suggestion.why,
                  onClick: () =>
                    startGeneration({
                      kind: suggestion.kind,
                      topic: suggestion.title,
                      subject: analysis.subject,
                      sourceIds: [source.id],
                    }),
                },
                icon('wand', { size: 13 }),
                `${resourceLabel(suggestion.kind)}: ${suggestion.title}`,
              ),
            ),
            h(
              'button.btn.sm.primary',
              {
                type: 'button',
                onClick: () => {
                  state.pendingStart = { request: `Teach me everything in ${source.name}.`, sourceIds: [source.id] };
                  navigate('/session/new');
                },
              },
              icon('spark', { size: 13 }),
              'Teach me this',
            ),
          ),
        ),
      );
    } catch (err) {
      clear(analysisHost);
      toast(err.message || 'Could not read that document.', 'error');
    }
  }

  function load() {
    clear(list).appendChild(skeleton(2, 52));
    api
      .sources()
      .then(({ sources }) => {
        clear(list);
        if (!sources.length) {
          list.appendChild(emptyState('No material uploaded', 'Anything you upload can be turned into lessons, study guides or tests.'));
          return;
        }
        for (const source of sources) {
          list.appendChild(
            h(
              'div.list-item',
              {},
              h(
                'div',
                {},
                h('b', {}, source.name),
                h('span', {}, `${source.kind.toUpperCase()} · ${(source.bytes / 1024).toFixed(0)} KB · ${fmtDate(source.created_at)}`),
                source.summary ? h('span', { style: { display: 'block', marginTop: '3px' } }, source.summary.slice(0, 140)) : null,
              ),
              h(
                'div.row',
                { style: { gap: '6px' } },
                h('button.btn.sm.ghost', { type: 'button', onClick: () => analyse(source.id) }, icon('eye', { size: 13 }), 'Analyse'),
                h(
                  'button.btn.sm',
                  {
                    type: 'button',
                    onClick: () => startGeneration({ kind: 'study_guide', topic: source.name, sourceIds: [source.id] }),
                  },
                  icon('book', { size: 13 }),
                  'Study guide',
                ),
              ),
            ),
          );
        }
      })
      .catch((err) => clear(list).appendChild(h('p', { style: { color: 'var(--rose)' } }, err.message)));
  }

  load();
  return root;
}
