import { h, clear } from '../public/js/dom.js';
import { icon } from '../public/js/icons.js';
import { installTransport } from './net.js';
import { config, setApiKey, setPrefs, hasLLM } from './config.js';
import { snapshotDb, replaceDb, resetDb, storageBlocked } from './store.js';
import { initTheme } from '../public/js/ui.js';

/**
 * Entry point for the single-file build.
 *
 * Two jobs: put the in-page transport in front of fetch so the app's API calls
 * are answered locally, and make sure there is a key before the app starts —
 * an interface that loads and then fails on every action is worse than one that
 * says what it needs first.
 */

installTransport();

/* --------------------------------------------------- what settings can call */

const bytesOf = (value) => new Blob([value]).size;
const pretty = (bytes) =>
  bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * The models worth offering, cheapest last.
 *
 * This is a per-token bill the learner pays directly, so the choice belongs to
 * them and the prices belong on the page. Opus is the default because teaching
 * well is the whole product; the cheaper two are here because a long revision
 * session on Opus is a real amount of money and nobody should have to discover
 * that from an invoice.
 */
const MODELS = [
  { id: 'claude-opus-5', name: 'Claude Opus 5', cost: '$5 / $25 per million tokens', note: 'Default. The strongest teaching, the strongest grading, the most expensive.' },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', cost: '$2 / $10 per million tokens', note: 'About a third of the price. Noticeably cheaper for long drilling sessions.' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', cost: '$1 / $5 per million tokens', note: 'Cheapest. Fine for flashcards and recall drills; weaker at marking free response.' },
];

window.axiomLocal = {
  models: MODELS,
  getModel: () => config.model,
  setModel: (id) => {
    if (!MODELS.some((m) => m.id === id)) return false;
    setPrefs({ model: id });
    return true;
  },
  getKey: () => config.apiKey,
  setKey: (key) => setApiKey(key),

  /** Prove a key works before letting someone walk into a wall of 401s. */
  async verifyKey(key) {
    try {
      const res = await fetch(`${config.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });
      if (res.ok) return { ok: true };
      if (res.status === 401) return { ok: false, error: 'That key was rejected. Check you copied all of it.' };
      if (res.status === 403) return { ok: false, error: 'That key is not allowed to use this model.' };
      if (res.status === 400) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, error: body?.error?.message || 'The API rejected the request.' };
      }
      if (res.status === 429) return { ok: true, warning: 'The key works but is rate limited right now.' };
      return { ok: false, error: `The API answered ${res.status}.` };
    } catch {
      return { ok: false, error: 'Could not reach api.anthropic.com. Check your connection.' };
    }
  },

  exportData() {
    const payload = JSON.stringify({ version: 1, exported_at: new Date().toISOString(), db: snapshotDb() }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const link = h('a', { href: url, download: `axiom-backup-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  },

  importData(payload) {
    const db = payload?.db ?? payload;
    if (!db || typeof db !== 'object' || !Array.isArray(db.concepts)) {
      throw new Error('that is not an Axiom backup');
    }
    replaceDb(db);
  },

  reset() {
    resetDb();
  },

  storageSummary() {
    const size = bytesOf(JSON.stringify(snapshotDb()));
    const db = snapshotDb();
    const parts = [
      `${db.courses.length} course${db.courses.length === 1 ? '' : 's'}`,
      `${db.concepts.length} concepts`,
      `${db.attempts.length} answers`,
      `${db.resources.length} resources`,
    ];
    return `${parts.join(' · ')} — about ${pretty(size)} used${storageBlocked() ? '. This browser is refusing to save, so work will be lost when the tab closes.' : '.'}`;
  },
};

/* ---------------------------------------------------------------- the gate */

const link = (href, text) =>
  h('a', { href, target: '_blank', rel: 'noreferrer noopener', style: { color: 'var(--brand-2)' } }, text);

function gate(root, onReady) {
  const input = h('input.input', {
    type: 'password',
    placeholder: 'sk-ant-...',
    autocomplete: 'off',
    spellcheck: false,
    style: { fontFamily: 'var(--mono, monospace)' },
  });
  const status = h('p.tiny', { style: { margin: '10px 0 0', minHeight: '18px', color: 'var(--ink-3)' } });
  const button = h('button.btn.primary.lg', { type: 'button' }, 'Start learning');

  const submit = async () => {
    const key = input.value.trim();
    if (!key) {
      status.textContent = 'Paste a key first.';
      return;
    }
    button.disabled = true;
    status.textContent = 'Checking the key…';
    const result = await window.axiomLocal.verifyKey(key);
    if (!result.ok) {
      button.disabled = false;
      status.textContent = result.error;
      status.style.color = 'var(--critical)';
      return;
    }
    const stored = setApiKey(key);
    status.style.color = 'var(--good)';
    status.textContent = stored
      ? 'Key accepted. Loading Axiom…'
      : 'Key accepted. This browser will not let it be saved, so it lasts for this tab only.';
    setTimeout(onReady, 350);
  };

  button.addEventListener('click', submit);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submit();
  });

  clear(root).appendChild(
    h(
      'div.gate',
      {},
      h(
        'div.gate-panel',
        {},
        h('div.brand-mark.lg', {}, icon('spark', { size: 24 })),
        h('h1', {}, 'Axiom'),
        h(
          'p.gate-lede',
          {},
          'An AI that works out what you already know, teaches the gap, and keeps testing until you have actually learned it. It runs entirely in this browser.',
        ),
        h(
          'div.gate-form',
          {},
          h('label', { for: 'axiom-key' }, 'Your Anthropic API key'),
          input,
          button,
          status,
        ),
        h(
          'div.gate-notes',
          {},
          h(
            'p',
            {},
            h('b', {}, 'Where to get one. '),
            'Sign in at ',
            link('https://console.anthropic.com/settings/keys', 'console.anthropic.com'),
            ' and create a key. New accounts start with free credit; after that you pay Anthropic per use. Axiom cannot supply a key — a key is billed to whoever owns it.',
          ),
          h(
            'p',
            {},
            h('b', {}, 'Where it goes. '),
            'Into this browser’s local storage, and out to api.anthropic.com when you ask Axiom to do something. There is no Axiom server: nothing else ever sees it. Anyone who can use this browser profile can read the key, and you should not send anyone a copy of this file after saving one in it.',
          ),
          h(
            'p',
            {},
            h('b', {}, 'Where your work goes. '),
            'Also this browser. Clearing site data erases it, so export a backup from Settings if it matters.',
          ),
        ),
      ),
    ),
  );
  input.focus();
}

/* -------------------------------------------------------------------- boot */

const root = document.getElementById('app');
initTheme();

async function startApp() {
  clear(root).appendChild(
    h('div.boot', {}, h('div.boot-mark'), h('p', {}, 'Starting Axiom…')),
  );
  await import('../public/app.js');
}

if (hasLLM()) startApp();
else gate(root, startApp);
