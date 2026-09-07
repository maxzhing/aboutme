import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');

/** Load a .env file into process.env without clobbering real env vars. */
function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadDotEnv();

const int = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

export const config = {
  port: int(process.env.PORT, 8787),
  host: process.env.HOST || '0.0.0.0',

  // --- LLM ---------------------------------------------------------------
  // The API key is read server-side only and is never sent to the browser.
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  baseURL: process.env.AXIOM_ANTHROPIC_BASE_URL || undefined,
  model: process.env.AXIOM_MODEL || 'claude-opus-5',
  // `mock` is a deterministic offline stand-in used ONLY by the automated test
  // suite so the full learning loop can be exercised without network access.
  // It refuses to serve normal traffic unless explicitly switched on.
  provider: process.env.AXIOM_LLM_PROVIDER || 'anthropic',
  maxRetries: int(process.env.AXIOM_MAX_RETRIES, 4),
  requestTimeoutMs: int(process.env.AXIOM_TIMEOUT_MS, 10 * 60 * 1000),

  // --- storage -----------------------------------------------------------
  dbPath: process.env.AXIOM_DB || path.join(ROOT, 'data', 'axiom.db'),
  uploadDir: process.env.AXIOM_UPLOADS || path.join(ROOT, 'uploads'),
  maxUploadBytes: int(process.env.AXIOM_MAX_UPLOAD_BYTES, 24 * 1024 * 1024),

  // --- behaviour ---------------------------------------------------------
  // Which build this is. The single-file browser build swaps this module for
  // one that keeps the key in the learner's own browser; the interface needs to
  // know which of the two it is talking to before it tells anyone what to fix.
  runtime: 'server',
  qualityControl: process.env.AXIOM_QC !== 'off',
  logLevel: process.env.AXIOM_LOG_LEVEL || 'info',
};

export const hasLLM = () => config.provider === 'mock' || Boolean(config.apiKey);
