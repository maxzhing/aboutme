import { h, clear } from '../dom.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { state, update } from '../state.js';
import { toast, toggleTheme } from '../ui.js';

/**
 * Settings.
 *
 * Most of this page is the same in both builds. The API key section only
 * appears in the single-file build, which exposes `window.axiomLocal` because
 * it is the build where the key belongs to the person using it. On the hosted
 * build the key lives in the server's environment and the browser is never
 * told what it is, so there is nothing here to show.
 */

const local = () => (typeof window !== 'undefined' ? window.axiomLocal : undefined);

const field = (label, hint, control) =>
  h(
    'div.field',
    {},
    h('label', {}, label),
    control,
    hint ? h('p.tiny.dim', { style: { margin: '6px 0 0' } }, hint) : null,
  );

export function settingsView() {
  const root = h(
    'div.page.stack',
    { style: { gap: '18px', maxWidth: '760px' } },
    h(
      'div',
      {},
      h('h1.page-title', {}, 'Settings'),
      h('p.page-sub', {}, 'How Axiom runs, and where your learning lives.'),
    ),
  );

  root.appendChild(runtimeCard());
  if (local()) {
    root.appendChild(keyCard());
    root.appendChild(dataCard());
  }
  root.appendChild(appearanceCard());
  return root;
}

/* ------------------------------------------------------------------ runtime */

function runtimeCard() {
  const body = h('div.stack', { style: { gap: '10px' } });
  const heading = h('span.tiny.dim', {});
  const card = h('section.card', {}, h('div.card-head', {}, h('h2', {}, 'Engine'), heading), body);

  /**
   * Everything on this card describes one provider, and all of it moves when
   * the provider or the key does. Redrawing the whole card from one freshly
   * fetched health payload is what stops it reading "No API key" a moment after
   * a key was verified, or naming Anthropic while pointed at OpenAI.
   */
  const draw = (health) => {
    clear(body);
    heading.textContent = health?.model || '';
    const ready = health?.llmReady;
    const kit = local()?.providers?.find((p) => p.id === health?.provider);

    body.appendChild(
      h(
        'div.row',
        { style: { gap: '8px', flexWrap: 'wrap' } },
        h(`span.chip${ready ? '.good' : '.warning'}`, {}, ready ? 'Connected' : 'No API key'),
        h('span.chip', {}, health?.model || 'model'),
        h('span.chip', {}, health?.runtime === 'browser' ? 'Runs in this browser' : 'Runs on a server'),
        h('span.chip', {}, `Quality control ${health?.qualityControl ? 'on' : 'off'}`),
      ),
    );
    body.appendChild(
      h(
        'p.tiny.dim',
        { style: { margin: 0 } },
        health?.runtime === 'browser'
          ? `Everything — the learner model, your work, the courses — is computed and stored in this browser. Requests go straight to ${kit?.host || 'the provider'}; nothing passes through anyone else.`
          : 'Generation runs on the server. Your browser never sees the API key.',
      ),
    );
    if (local()?.providers) body.appendChild(providerPicker());
    if (local()?.models) body.appendChild(modelPicker());
  };

  /** Re-read health, then redraw everything that depends on it. */
  const refresh = () =>
    api
      .health()
      .then((health) => {
        update({ health });
        draw(health);
      })
      .catch(() => {});

  draw(state.health);
  refresh();

  // The key and model controls are rebuilt by this card, so they signal a
  // change rather than trying to patch it from underneath.
  document.addEventListener('axiom:engine-changed', refresh);
  return card;
}

/**
 * Which company's model does the teaching.
 *
 * Keys are held per provider, so switching back does not mean pasting again.
 * Changing this re-renders the whole page, because the key card, the model list
 * and the endpoint field all belong to the provider that is selected.
 */
function providerPicker() {
  const api_ = local();
  const tabs = h('div.provider-tabs', { style: { maxWidth: '320px' } });
  for (const provider of api_.providers) {
    tabs.appendChild(
      h(
        'button',
        {
          type: 'button',
          class: provider.id === api_.getProvider() ? 'on' : '',
          onClick: () => {
            api_.setProvider(provider.id);
            document.dispatchEvent(new CustomEvent('axiom:rerender'));
          },
        },
        provider.label,
      ),
    );
  }
  return h('div', { style: { marginTop: '14px' } }, field('Provider', 'Each provider bills you separately, and each needs its own key.', tabs));
}

/**
 * Model choice, with what each one costs.
 *
 * Only shown in the build where the learner is paying Anthropic directly. On
 * the server build the model is an operator's decision, not a reader's.
 */
function modelPicker() {
  const api_ = local();
  const provider = api_.getProvider();
  const models = api_.modelsFor(provider);
  const current = api_.getModel();
  const note = h('p.tiny.dim', { style: { margin: '6px 0 0' } });

  const apply = (id) => {
    if (!api_.setModel(id)) return;
    note.textContent = models.find((m) => m.id === id)?.note || `Using ${id}.`;
    toast('Model changed. It applies to the next thing you generate.', 'success');
    document.dispatchEvent(new CustomEvent('axiom:engine-changed'));
  };

  const CUSTOM = '__custom__';
  const custom = h('input.input', {
    placeholder: 'exact model id',
    value: models.some((m) => m.id === current) ? '' : current,
    style: { marginTop: '6px', display: models.some((m) => m.id === current) ? 'none' : 'block' },
    onChange: (event) => apply(event.target.value.trim()),
  });

  const select = h(
    'select.select',
    {
      onChange: (event) => {
        if (event.target.value === CUSTOM) {
          custom.style.display = 'block';
          custom.focus();
          return;
        }
        custom.style.display = 'none';
        apply(event.target.value);
      },
    },
    ...models.map((model) =>
      h('option', { value: model.id, selected: model.id === current }, `${model.name} — ${model.cost}`),
    ),
    // Provider line-ups move faster than a file baked in 2026 can follow.
    h('option', { value: CUSTOM, selected: !models.some((m) => m.id === current) }, 'Something else…'),
  );

  note.textContent = models.find((m) => m.id === current)?.note || `Using ${current}.`;

  const rows = [
    field(
      'Model',
      'You pay per token, so this is the main lever on what Axiom costs to run. A typical lesson turn is a few cents at the top tier.',
      h('div', {}, select, custom),
    ),
    note,
  ];

  if (provider === 'openai') {
    rows.push(
      field(
        'Endpoint',
        'Anything that speaks the chat-completions API works here — Azure, a gateway, a local server.',
        h('input.input', {
          value: api_.getBaseUrl(),
          spellcheck: false,
          onChange: (event) => {
            api_.setBaseUrl(event.target.value);
            toast('Endpoint saved.', 'success');
          },
        }),
      ),
    );
  }

  return h('div', { style: { marginTop: '14px' } }, ...rows);
}

/* ---------------------------------------------------------------- API key */

function keyCard() {
  const api_ = local();
  const kit = api_.providers.find((p) => p.id === api_.getProvider());
  const input = h('input.input', {
    type: 'password',
    placeholder: `${kit.keyPrefix}...`,
    autocomplete: 'off',
    spellcheck: false,
    value: api_.getKey() || '',
  });
  const status = h('p.tiny.dim', { style: { margin: 0 } });

  const save = async (verify) => {
    const key = input.value.trim();
    if (!key) {
      api_.setKey('');
      status.textContent = 'Key removed.';
      document.dispatchEvent(new CustomEvent('axiom:engine-changed'));
      return;
    }
    api_.setKey(key);
    if (!verify) return;
    status.textContent = 'Checking…';
    const result = await api_.verifyKey(key);
    status.textContent = result.ok ? 'Key works.' : result.error;
    if (result.ok) toast('API key saved and verified.', 'success');
    else toast(result.error, 'error', 9000);
    document.dispatchEvent(new CustomEvent('axiom:engine-changed'));
  };

  return h(
    'section.card',
    {},
    h('div.card-head', {}, h('h2', {}, kit.keyName)),
    h(
      'div.stack',
      { style: { gap: '12px' } },
      h(
        'p.tiny.dim',
        { style: { margin: 0 } },
        `Stored in this browser only, and sent only to ${kit.host}. Anyone with access to this browser profile can read it, and you should never publish a copy of this file with a key saved in it. Each provider keeps its own key, so switching back does not mean pasting again.`,
      ),
      field(
        'Key',
        `Create one at ${new URL(kit.console).host}.`,
        h('div.row', { style: { gap: '8px' } }, input, h('button.btn.primary', { type: 'button', onClick: () => save(true) }, 'Save and test')),
      ),
      status,
      h(
        'div.row',
        { style: { gap: '8px' } },
        h(
          'button.btn.sm',
          {
            type: 'button',
            onClick: () => {
              input.type = input.type === 'password' ? 'text' : 'password';
            },
          },
          'Show / hide',
        ),
        h(
          'button.btn.sm.danger',
          {
            type: 'button',
            onClick: () => {
              input.value = '';
              save(false);
            },
          },
          'Remove key',
        ),
      ),
    ),
  );
}

/* -------------------------------------------------------------------- data */

function dataCard() {
  const api_ = local();
  const meter = h('p.tiny.dim', { style: { margin: 0 } }, api_.storageSummary());

  const importer = h('input', {
    type: 'file',
    accept: 'application/json',
    style: { display: 'none' },
    onChange: async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        api_.importData(JSON.parse(await file.text()));
        toast('Learning data restored. Reloading…', 'success');
        setTimeout(() => location.reload(), 800);
      } catch (err) {
        toast(`That file could not be read: ${err.message}`, 'error');
      }
    },
  });

  return h(
    'section.card',
    {},
    h('div.card-head', {}, h('h2', {}, 'Your data')),
    h(
      'div.stack',
      { style: { gap: '12px' } },
      h(
        'p.tiny.dim',
        { style: { margin: 0 } },
        'Everything lives in this browser. Clearing site data, or opening the file in a different browser, starts you over — so export a backup before you do either.',
      ),
      meter,
      h(
        'div.row',
        { style: { gap: '8px', flexWrap: 'wrap' } },
        h('button.btn', { type: 'button', onClick: () => api_.exportData() }, icon('download', { size: 14 }), 'Export a backup'),
        h('button.btn', { type: 'button', onClick: () => importer.click() }, icon('upload', { size: 14 }), 'Restore a backup'),
        h(
          'button.btn.danger',
          {
            type: 'button',
            onClick: () => {
              if (!confirm('Erase every session, course and mastery record in this browser? This cannot be undone.')) return;
              api_.reset();
              location.reload();
            },
          },
          'Erase everything',
        ),
        importer,
      ),
    ),
  );
}

/* -------------------------------------------------------------- appearance */

function appearanceCard() {
  return h(
    'section.card',
    {},
    h('div.card-head', {}, h('h2', {}, 'Appearance')),
    h(
      'div.row',
      { style: { gap: '8px' } },
      h(
        'button.btn',
        {
          type: 'button',
          onClick: (event) => {
            const next = toggleTheme();
            event.currentTarget.lastChild.textContent = next === 'dark' ? 'Switch to light' : 'Switch to dark';
          },
        },
        icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon', { size: 14 }),
        h('span', {}, document.documentElement.dataset.theme === 'dark' ? 'Switch to light' : 'Switch to dark'),
      ),
    ),
  );
}
