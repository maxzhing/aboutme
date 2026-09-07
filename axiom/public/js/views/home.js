import { h, autosize } from '../dom.js';
import { icon } from '../icons.js';
import { navigate } from '../router.js';
import { api } from '../api.js';
import { toast } from '../ui.js';
import { state } from '../state.js';

const EXAMPLES = [
  'Teach me AP Physics 1 momentum',
  "I don't understand derivatives",
  'Help me master Spanish irregular verbs',
  'I have a biology test Friday',
  'Make me a 20-question worksheet on cellular respiration',
  'I keep getting APUSH SAQs wrong',
  'I have 30 minutes — teach me something useful',
  'Teach me Java inheritance',
];

export function homeView() {
  const attachments = [];
  const attachmentHost = h('div.attachments');

  const textarea = h('textarea', {
    placeholder: 'Tell me what you want to learn…',
    rows: 3,
    spellcheck: 'true',
    onKeydown: (event) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey || !event.shiftKey)) {
        event.preventDefault();
        submit();
      }
    },
  });

  const fileInput = h('input', {
    type: 'file',
    multiple: true,
    accept: '.pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.csv,.json,.tex',
    style: { display: 'none' },
    onChange: async (event) => {
      const chosen = [...event.target.files];
      if (!chosen.length) return;
      event.target.value = '';
      try {
        const { sources, warning } = await api.upload(chosen);
        if (warning) toast(warning, 'error');
        attachments.push(...sources);
        drawAttachments();
      } catch (err) {
        toast(err.message || 'Upload failed.', 'error');
      }
    },
  });

  function drawAttachments() {
    attachmentHost.replaceChildren(
      ...attachments.map((source, i) =>
        h(
          'span.attachment',
          {},
          icon('file', { size: 12 }),
          source.name,
          h(
            'button',
            {
              type: 'button',
              'aria-label': `Remove ${source.name}`,
              onClick: () => {
                attachments.splice(i, 1);
                drawAttachments();
              },
            },
            icon('x', { size: 12 }),
          ),
        ),
      ),
    );
  }

  const submitButton = h(
    'button.btn.primary.lg',
    { type: 'button', onClick: () => submit() },
    icon('sparkles', { size: 15 }),
    'Start learning',
  );

  async function submit() {
    const request = textarea.value.trim();
    if (!request) {
      textarea.focus();
      return;
    }
    submitButton.disabled = true;
    submitButton.replaceChildren(h('span.spinner'), document.createTextNode('Thinking…'));
    state.pendingStart = { request, sourceIds: attachments.map((a) => a.id) };
    navigate('/session/new');
  }

  const ready = state.health?.llmReady !== false;

  return h(
    'div.home',
    {},
    h(
      'header.home-top',
      {},
      h(
        'div.brand',
        { style: { padding: '0', width: 'auto' } },
        h('div.brand-mark', {}, icon('sparkles', { size: 17 })),
        h('span.brand-name', {}, 'Axiom'),
      ),
      h(
        'div.row',
        {},
        h('button.btn.sm.ghost', { type: 'button', onClick: () => navigate('/library') }, icon('library', { size: 14 }), 'Library'),
        h('button.btn.sm', { type: 'button', onClick: () => navigate('/dashboard') }, icon('chart', { size: 14 }), 'Dashboard'),
      ),
    ),
    h(
      'div.home-body',
      {},
      h(
        'div.hero.fade-up',
        {},
        h(
          'span.hero-eyebrow',
          {},
          h('span', { class: `hero-dot${ready ? '' : ' off'}` }),
          ready
            ? `Generating live with ${state.health?.model || 'Claude'}`
            : 'No API key configured — add one to axiom/.env',
        ),
        h('h1', {}, 'Tell me what you want to learn.', h('br'), h('em', {}, "I'll work out how you should learn it.")),
        h(
          'p.lede',
          {},
          'Axiom diagnoses what you already know, teaches only the gap, makes you prove it, and keeps adapting until you have actually learned it.',
        ),
        h(
          'div.ask',
          {},
          textarea,
          attachmentHost,
          h(
            'div.ask-bar',
            {},
            h(
              'button.btn.sm.ghost',
              { type: 'button', onClick: () => fileInput.click(), title: 'Attach notes, a worksheet, a chapter…' },
              icon('upload', { size: 13 }),
              'Attach material',
            ),
            h('span.hint', {}, 'Enter to send'),
            submitButton,
          ),
          fileInput,
        ),
        h(
          'div.row',
          { style: { justifyContent: 'center', marginTop: '18px' } },
          h(
            'button.btn',
            { type: 'button', onClick: () => navigate('/courses') },
            icon('route', { size: 14 }),
            'Or prepare for a whole exam',
          ),
        ),
        h(
          'div.examples',
          {},
          ...EXAMPLES.map((example) =>
            h(
              'button.example',
              {
                type: 'button',
                onClick: () => {
                  textarea.value = example;
                  textarea.focus();
                  textarea.dispatchEvent(new Event('input'));
                },
              },
              example,
            ),
          ),
        ),
        h(
          'div.home-strip.stagger',
          {},
          ...[
            ['target', 'Diagnoses first', 'Finds what you already have, then teaches only the gap.'],
            ['brain', 'Remembers your mistakes', 'Names the specific misconception and fixes that, not the topic.'],
            ['repeat', 'Returns before you forget', 'Every concept comes back on its own schedule.'],
            ['trophy', 'Mastery is earned', 'Level 5 needs transfer and retention — reading never counts.'],
          ].map(([name, title, detail]) =>
            h('div.home-feature', {}, icon(name, { size: 16 }), h('b', {}, title), h('span', {}, detail)),
          ),
        ),
      ),
    ),
    (() => {
      autosize(textarea);
      queueMicrotask(() => textarea.focus());
      return null;
    })(),
  );
}
