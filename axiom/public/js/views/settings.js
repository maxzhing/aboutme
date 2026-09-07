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
  const card = h(
    'section.card',
    {},
    h('div.card-head', {}, h('h2', {}, 'Engine'), h('span.tiny.dim', {}, state.health?.model || '')),
    body,
  );

  const draw = (health) => {
    clear(body);
    const ready = health?.llmReady;
    body.appendChild(
      h(
        'div.row',
        { style: { gap: '8px', flexWrap: 'wrap' } },
        h(`span.chip${ready ? '.good' : '.warn'}`, {}, ready ? 'Connected' : 'No API key'),
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
          ? 'Everything — the learner model, your work, the courses — is computed and stored in this browser. Requests go straight to Anthropic; nothing passes through anyone else.'
          : 'Generation runs on the server. Your browser never sees the API key.',
      ),
    );
    if (local()?.models) body.appendChild(modelPicker());
  };

  draw(state.health);
  api.health().then((health) => { update({ health }); draw(health); }).catch(() => {});
  return card;
}

/**
 * Model choice, with what each one costs.
 *
 * Only shown in the build where the learner is paying Anthropic directly. On
 * the server build the model is an operator's decision, not a reader's.
 */
function modelPicker() {
  const api_ = local();
  const note = h('p.tiny.dim', { style: { margin: '6px 0 0' } });
  const select = h(
    'select.select',
    {
      onChange: (event) => {
        api_.setModel(event.target.value);
        describe(event.target.value);
        toast('Model changed. It applies to the next thing you generate.', 'success');
        api.health().then((health) => update({ health })).catch(() => {});
      },
    },
    ...api_.models.map((model) =>
      h('option', { value: model.id, selected: model.id === api_.getModel() }, `${model.name} — ${model.cost}`),
    ),
  );

  function describe(id) {
    note.textContent = api_.models.find((m) => m.id === id)?.note || '';
  }
  describe(api_.getModel());

  return h(
    'div',
    { style: { marginTop: '14px' } },
    field(
      'Model',
      'You pay Anthropic per token, so this is the main lever on what Axiom costs to run. A typical lesson turn is a few cents on Opus.',
      select,
    ),
    note,
  );
}

/* ---------------------------------------------------------------- API key */

function keyCard() {
  const api_ = local();
  const input = h('input.input', {
    type: 'password',
    placeholder: 'sk-ant-...',
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
      api.health().then((health) => update({ health })).catch(() => {});
      return;
    }
    api_.setKey(key);
    if (!verify) return;
    status.textContent = 'Checking…';
    const result = await api_.verifyKey(key);
    status.textContent = result.ok ? 'Key works.' : result.error;
    if (result.ok) toast('API key saved and verified.', 'success');
    else toast(result.error, 'error', 9000);
    api.health().then((health) => update({ health })).catch(() => {});
  };

  return h(
    'section.card',
    {},
    h('div.card-head', {}, h('h2', {}, 'Anthropic API key')),
    h(
      'div.stack',
      { style: { gap: '12px' } },
      h(
        'p.tiny.dim',
        { style: { margin: 0 } },
        'Stored in this browser only, and sent only to api.anthropic.com. Anyone with access to this browser profile can read it, and you should never publish a copy of this file with a key saved in it.',
      ),
      field(
        'Key',
        'Create one at console.anthropic.com → Settings → API keys.',
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
