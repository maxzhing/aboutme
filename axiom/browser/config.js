/**
 * Browser replacement for server/config.js.
 *
 * In the single-file build there is no server, so the key is the learner's own
 * and lives in this browser's localStorage. It is sent to the provider's API
 * and to nowhere else — there is no backend here to send it to. That is a real
 * trade against the hosted build, where the key never leaves the server, and
 * the interface says so plainly before asking for one.
 *
 * Keys are stored per provider, so switching between Claude and OpenAI does not
 * make you re-paste, and removing one does not remove the other.
 */

const KEY_STORAGE = { anthropic: 'axiom:anthropic-key', openai: 'axiom:openai-key' };
const PREF_STORAGE = 'axiom:llm-prefs';

const read = (key, fallback = '') => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

const prefs = (() => {
  try {
    return JSON.parse(read(PREF_STORAGE, '{}')) || {};
  } catch {
    return {};
  }
})();

/** Keys held only in memory, for browsers that refuse to persist anything. */
const volatileKeys = {};

export const PROVIDERS = ['anthropic', 'openai'];

const DEFAULT_MODEL = { anthropic: 'claude-opus-5', openai: 'gpt-5.6-terra' };

export const config = {
  provider: PROVIDERS.includes(prefs.provider) ? prefs.provider : 'anthropic',
  runtime: 'browser',

  // --- Anthropic ---------------------------------------------------------
  apiKey: read(KEY_STORAGE.anthropic),
  baseURL: 'https://api.anthropic.com',
  model: prefs.model || DEFAULT_MODEL.anthropic,

  // --- OpenAI, or anything speaking its chat-completions API -------------
  openaiKey: read(KEY_STORAGE.openai),
  openaiBaseURL: prefs.openaiBaseURL || 'https://api.openai.com/v1',
  openaiModel: prefs.openaiModel || DEFAULT_MODEL.openai,
  openaiOrg: '',
  openaiEffort: prefs.openaiEffort !== false,

  maxRetries: 4,
  requestTimeoutMs: 10 * 60 * 1000,
  qualityControl: prefs.qualityControl !== false,
  logLevel: prefs.logLevel || 'info',
  concurrency: 4,
};

/** The key for whichever provider is selected. */
export const currentKey = () => (config.provider === 'openai' ? config.openaiKey : config.apiKey);

export const hasLLM = () => Boolean(currentKey());

/** Store a key for one provider, in this browser only. Returns false if storage is blocked. */
export function setApiKey(key, provider = config.provider) {
  const value = String(key || '').trim();
  if (provider === 'openai') config.openaiKey = value;
  else config.apiKey = value;

  try {
    if (value) localStorage.setItem(KEY_STORAGE[provider], value);
    else localStorage.removeItem(KEY_STORAGE[provider]);
    delete volatileKeys[provider];
    return true;
  } catch {
    // Private mode, or site data blocked: the key lives for this tab only.
    volatileKeys[provider] = value;
    return false;
  }
}

export function setProvider(provider) {
  if (!PROVIDERS.includes(provider)) return false;
  config.provider = provider;
  setPrefs({ provider });
  return true;
}

export function setPrefs(patch) {
  Object.assign(prefs, patch);
  if (patch.model) config.model = patch.model;
  if (patch.openaiModel) config.openaiModel = patch.openaiModel;
  if (patch.openaiBaseURL !== undefined) config.openaiBaseURL = patch.openaiBaseURL || 'https://api.openai.com/v1';
  if (patch.qualityControl !== undefined) config.qualityControl = patch.qualityControl !== false;
  try {
    localStorage.setItem(PREF_STORAGE, JSON.stringify(prefs));
  } catch {
    /* not fatal */
  }
}

export const ROOT = '';
