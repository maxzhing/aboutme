import { h, clear } from '../public/js/dom.js';
import { icon } from '../public/js/icons.js';
import { installTransport } from './net.js';
import { config, setApiKey, setPrefs, setProvider, hasLLM, currentKey, PROVIDERS } from './config.js';
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
 * What each provider is, and what it costs.
 *
 * This is a per-token bill the learner pays directly, so the choice belongs to
 * them and the prices belong on the page. A long revision session is a real
 * amount of money and nobody should have to discover that from an invoice.
 *
 * OpenAI's model list moves faster than any list baked into a file can, so the
 * picker also accepts a typed model id: better a stale suggestion you can
 * override than a hard-coded name that stops working.
 */
const CATALOGUE = {
  anthropic: {
    label: 'Claude',
    keyName: 'Anthropic API key',
    keyPrefix: 'sk-ant-',
    console: 'https://console.anthropic.com/settings/keys',
    host: 'api.anthropic.com',
    models: [
      { id: 'claude-opus-5', name: 'Claude Opus 5', cost: '$5 / $25 per million tokens', note: 'Default. The strongest teaching, the strongest grading, the most expensive.' },
      { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', cost: '$2 / $10 per million tokens', note: 'About a third of the price. Noticeably cheaper for long drilling sessions.' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', cost: '$1 / $5 per million tokens', note: 'Cheapest. Fine for flashcards and recall drills; weaker at marking free response.' },
    ],
  },
  openai: {
    label: 'OpenAI',
    keyName: 'OpenAI API key',
    keyPrefix: 'sk-',
    console: 'https://platform.openai.com/api-keys',
    host: 'api.openai.com',
    models: [
      { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', cost: 'about $5 / $30 per million tokens', note: 'Flagship tier. Strongest reasoning, priciest.' },
      { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra', cost: 'about $2 / $12 per million tokens', note: 'Default. The balanced middle, and the closest match to how Axiom is tuned.' },
      { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', cost: 'about $0.20 / $1.20 per million tokens', note: 'Budget tier. Cheap enough to drill on; weaker at marking free response.' },
    ],
  },
};

const activeCatalogue = () => CATALOGUE[config.provider] || CATALOGUE.anthropic;

/**
 * Turn a failed fetch into something actionable.
 *
 * A blocked cross-origin request and an unplugged network cable are the same
 * TypeError to a browser — the useful detail is stripped before JavaScript sees
 * it. So name both possibilities and say what to do about the one this app
 * cannot fix.
 */
const unreachable = (host) => ({
  ok: false,
  error:
    `Could not reach ${host}. Either this machine is offline, or the browser blocked the ` +
    'request because that API does not allow calls from a page. If you are online, this ' +
    'provider cannot be used from the single-file build — run the server build instead, ' +
    'where the request comes from the server rather than your browser.',
});

window.axiomLocal = {
  providers: PROVIDERS.map((id) => ({ id, ...CATALOGUE[id] })),
  getProvider: () => config.provider,
  setProvider: (id) => setProvider(id),

  models: CATALOGUE.anthropic.models,
  modelsFor: (provider = config.provider) => (CATALOGUE[provider] || CATALOGUE.anthropic).models,
  getModel: () => (config.provider === 'openai' ? config.openaiModel : config.model),
  setModel: (id) => {
    const value = String(id || '').trim();
    if (!value) return false;
    setPrefs(config.provider === 'openai' ? { openaiModel: value } : { model: value });
    return true;
  },

  getBaseUrl: () => config.openaiBaseURL,
  setBaseUrl: (url) => setPrefs({ openaiBaseURL: String(url || '').trim() }),

  getKey: (provider = config.provider) => (provider === 'openai' ? config.openaiKey : config.apiKey),
  setKey: (key, provider = config.provider) => setApiKey(key, provider),

  /** Prove a key works before letting someone walk into a wall of 401s. */
  async verifyKey(key, provider = config.provider) {
    return provider === 'openai' ? verifyOpenAI(key) : verifyAnthropic(key);
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

/**
 * Anthropic: one token, which costs a fraction of a cent and proves the key,
 * the model permission and the browser-access header all at once.
 */
async function verifyAnthropic(key) {
  try {
    const res = await fetch(`${config.baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: config.model, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
    });
    return interpret(res, 'api.anthropic.com');
  } catch {
    return unreachable('api.anthropic.com');
  }
}

/**
 * OpenAI: listing models costs nothing at all, and answers the same three
 * questions — is the key real, does the endpoint answer, and will the browser
 * be allowed to talk to it.
 */
async function verifyOpenAI(key) {
  const host = new URL(config.openaiBaseURL).host;
  try {
    const res = await fetch(`${config.openaiBaseURL.replace(/\/+$/, '')}/models`, {
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    });
    return interpret(res, host);
  } catch {
    return unreachable(host);
  }
}

async function interpret(res, host) {
  if (res.ok) return { ok: true };
  if (res.status === 401) return { ok: false, error: 'That key was rejected. Check you copied all of it.' };
  if (res.status === 403) return { ok: false, error: 'That key is not allowed to use this model.' };
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    const message = body?.error?.message || '';
    return /quota|billing|credit/i.test(message)
      ? { ok: false, error: 'The key is valid but the account has no credit left. Top it up and try again.' }
      : { ok: true, warning: 'The key works but is rate limited right now.' };
  }
  if (res.status === 400) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body?.error?.message || 'The API rejected the request.' };
  }
  return { ok: false, error: `${host} answered ${res.status}.` };
}

/* ---------------------------------------------------------------- the gate */

const link = (href, text) =>
  h('a', { href, target: '_blank', rel: 'noreferrer noopener', style: { color: 'var(--brand-2)' } }, text);

function gate(root, onReady) {
  const input = h('input.input', {
    type: 'password',
    autocomplete: 'off',
    spellcheck: false,
    style: { fontFamily: 'var(--mono, monospace)' },
  });
  const label = h('label', { for: 'axiom-key' });
  const status = h('p.tiny', { style: { margin: '10px 0 0', minHeight: '18px', color: 'var(--ink-3)' } });
  const button = h('button.btn.primary.lg', { type: 'button' }, 'Start learning');
  const where = h('p', {});
  const goes = h('p', {});
  const tabs = h('div.provider-tabs');

  /** Redraw everything that names a provider. */
  function reflect() {
    const kit = activeCatalogue();
    input.placeholder = `${kit.keyPrefix}...`;
    input.value = window.axiomLocal.getKey() || '';
    label.textContent = `Your ${kit.keyName}`;
    status.textContent = '';
    for (const tab of tabs.children) {
      tab.classList.toggle('on', tab.dataset.provider === config.provider);
    }
    clear(where).appendChild(
      h(
        'span',
        {},
        h('b', {}, 'Where to get one. '),
        'Create a key at ',
        link(kit.console, new URL(kit.console).host),
        '. Axiom cannot supply one — an API key is billed to whoever owns it.',
        config.provider === 'anthropic' ? ' New Anthropic accounts start with a small free credit.' : '',
      ),
    );
    clear(goes).appendChild(
      h(
        'span',
        {},
        h('b', {}, 'Where it goes. '),
        `Into this browser’s local storage, and out to ${kit.host} when you ask Axiom to do something. `,
        'There is no Axiom server: nothing else ever sees it. Anyone who can use this browser profile can read the key, and you should not send anyone a copy of this file after saving one in it.',
      ),
    );
  }

  for (const provider of window.axiomLocal.providers) {
    tabs.appendChild(
      h(
        'button',
        {
          type: 'button',
          dataset: { provider: provider.id },
          onClick: () => {
            setProvider(provider.id);
            reflect();
            input.focus();
          },
        },
        provider.label,
      ),
    );
  }

  const submit = async () => {
    const key = input.value.trim();
    if (!key) {
      status.textContent = 'Paste a key first.';
      return;
    }
    button.disabled = true;
    status.style.color = 'var(--ink-3)';
    status.textContent = 'Checking the key…';
    const result = await window.axiomLocal.verifyKey(key);
    if (!result.ok) {
      button.disabled = false;
      status.style.color = 'var(--critical)';
      status.textContent = result.error;
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
        h('div.gate-form', {}, h('label', {}, 'Whose model should teach you'), tabs, label, input, button, status),
        h(
          'div.gate-notes',
          {},
          where,
          goes,
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

  reflect();
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
