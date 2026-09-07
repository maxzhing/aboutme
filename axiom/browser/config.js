/**
 * Browser replacement for server/config.js.
 *
 * In the single-file build there is no server, so the key is the learner's own
 * and lives in this browser's localStorage. It is sent to api.anthropic.com and
 * to nowhere else — there is no backend here to send it to. That is a real
 * trade against the hosted build, where the key never leaves the server, and
 * the interface says so plainly before asking for one.
 */

const KEY_STORAGE = 'axiom:anthropic-key';
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

export const config = {
  apiKey: read(KEY_STORAGE),
  baseURL: 'https://api.anthropic.com',
  model: prefs.model || 'claude-opus-5',
  provider: 'anthropic',
  runtime: 'browser',
  maxRetries: 4,
  requestTimeoutMs: 10 * 60 * 1000,
  qualityControl: prefs.qualityControl !== false,
  logLevel: prefs.logLevel || 'info',
  concurrency: 4,
};

export const hasLLM = () => Boolean(config.apiKey);

/** Store the key for this browser only. Returns false if storage is blocked. */
export function setApiKey(key) {
  config.apiKey = String(key || '').trim();
  try {
    if (config.apiKey) localStorage.setItem(KEY_STORAGE, config.apiKey);
    else localStorage.removeItem(KEY_STORAGE);
    return true;
  } catch {
    return false; // private mode, or site data blocked: the key lives for this tab only
  }
}

export function setPrefs(patch) {
  Object.assign(prefs, patch);
  if (patch.model) config.model = patch.model;
  if (patch.qualityControl !== undefined) config.qualityControl = patch.qualityControl !== false;
  try {
    localStorage.setItem(PREF_STORAGE, JSON.stringify(prefs));
  } catch {
    /* not fatal */
  }
}

export const ROOT = '';
