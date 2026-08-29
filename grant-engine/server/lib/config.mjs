/**
 * Runtime configuration.
 *
 * Every external capability is optional and independently detected. The system
 * NEVER substitutes an internal guess for a capability it does not have -- if a
 * source is unavailable, the pipeline reports the gap to the user instead of
 * filling it in. See `capabilityReport()`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Minimal .env loader (no dependency); real environment variables win. */
function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnv();

const num = (v, fallback) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? fallback : Number(v));
const bool = (v, fallback) => (v === undefined || v === '' ? fallback : /^(1|true|yes|on)$/i.test(v));

export const config = {
  port: num(process.env.PORT, 8787),
  host: process.env.HOST || '0.0.0.0',
  dataDir: process.env.DATA_DIR || path.join(ROOT, 'data'),

  /** Language model, used ONLY for interpretation and quote-grounded extraction. */
  llm: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
    model: process.env.LLM_MODEL || 'claude-sonnet-5',
    maxTokens: num(process.env.LLM_MAX_TOKENS, 4096),
    timeoutMs: num(process.env.LLM_TIMEOUT_MS, 90_000),
  },

  /** Web search providers. The first configured one is used; others are fallbacks. */
  search: {
    brave: process.env.BRAVE_SEARCH_API_KEY || '',
    serper: process.env.SERPER_API_KEY || '',
    tavily: process.env.TAVILY_API_KEY || '',
    googleCseKey: process.env.GOOGLE_CSE_KEY || '',
    googleCseCx: process.env.GOOGLE_CSE_CX || '',
    /** Self-hosted SearXNG instance, e.g. http://localhost:8080 */
    searxngUrl: process.env.SEARXNG_URL || '',
    resultsPerQuery: num(process.env.SEARCH_RESULTS_PER_QUERY, 10),
    maxQueries: num(process.env.SEARCH_MAX_QUERIES, 10),
    timeoutMs: num(process.env.SEARCH_TIMEOUT_MS, 20_000),
  },

  /** Key-free authoritative federal source. */
  grantsGov: {
    enabled: bool(process.env.GRANTS_GOV_ENABLED, true),
    searchUrl: process.env.GRANTS_GOV_SEARCH_URL || 'https://api.grants.gov/v1/api/search2',
    fetchUrl: process.env.GRANTS_GOV_FETCH_URL || 'https://api.grants.gov/v1/api/fetchOpportunity',
    rowsPerQuery: num(process.env.GRANTS_GOV_ROWS, 25),
    timeoutMs: num(process.env.GRANTS_GOV_TIMEOUT_MS, 25_000),
  },

  fetcher: {
    userAgent:
      process.env.FETCH_USER_AGENT ||
      'GrantMatchEngine/1.0 (grant eligibility research; contact: set FETCH_USER_AGENT)',
    timeoutMs: num(process.env.FETCH_TIMEOUT_MS, 20_000),
    maxBytes: num(process.env.FETCH_MAX_BYTES, 2_500_000),
    concurrency: num(process.env.FETCH_CONCURRENCY, 4),
    perHostDelayMs: num(process.env.FETCH_PER_HOST_DELAY_MS, 700),
    respectRobots: bool(process.env.FETCH_RESPECT_ROBOTS, true),
  },

  pipeline: {
    /** Verified records older than this are re-verified against their source. */
    staleAfterHours: num(process.env.STALE_AFTER_HOURS, 72),
    maxCandidatesToVerify: num(process.env.MAX_CANDIDATES_TO_VERIFY, 40),
    maxResults: num(process.env.MAX_RESULTS, 20),
  },

  alerts: {
    enabled: bool(process.env.ALERTS_ENABLED, true),
    intervalHours: num(process.env.ALERT_INTERVAL_HOURS, 24),
    strongMatchThreshold: num(process.env.ALERT_MATCH_THRESHOLD, 75),
  },
};

export function hasLlm() {
  return Boolean(config.llm.apiKey);
}

export function searchProvider() {
  if (config.search.brave) return 'brave';
  if (config.search.serper) return 'serper';
  if (config.search.tavily) return 'tavily';
  if (config.search.googleCseKey && config.search.googleCseCx) return 'google_cse';
  if (config.search.searxngUrl) return 'searxng';
  return null;
}

export function hasWebSearch() {
  return searchProvider() !== null;
}

/**
 * An honest, user-facing statement of what this deployment can and cannot do.
 * The UI shows this verbatim so a user never mistakes a degraded run for a full one.
 */
export function capabilityReport() {
  const provider = searchProvider();
  return {
    federalPrimarySource: {
      available: config.grantsGov.enabled,
      name: 'Grants.gov (official federal opportunity API)',
      note: config.grantsGov.enabled
        ? 'Federal opportunities are read from the official government API, including structured eligibility, deadlines and award ranges.'
        : 'Disabled by configuration. No federal opportunities will be returned.',
    },
    webSearch: {
      available: Boolean(provider),
      name: provider ? `Web search (${provider})` : 'Web search',
      note: provider
        ? 'Foundation, state, local and corporate funders are discovered through live web search and then verified against the funder\'s own pages.'
        : 'No web search API key is configured, so non-federal funders (foundations, state/local programs, corporate giving) cannot be discovered. Results will cover federal opportunities only. Set BRAVE_SEARCH_API_KEY, SERPER_API_KEY, TAVILY_API_KEY, GOOGLE_CSE_KEY + GOOGLE_CSE_CX, or SEARXNG_URL for a self-hosted instance.',
    },
    languageModel: {
      available: hasLlm(),
      name: `Language model (${config.llm.model})`,
      note: hasLlm()
        ? 'Used to interpret your description and to read funder pages. Every fact it extracts must be backed by a quote found verbatim on the source page, or it is discarded.'
        : 'No ANTHROPIC_API_KEY is configured. Your description is parsed with rule-based extraction, and funder pages are read with pattern-based extraction only. Fewer facts will be verifiable. Nothing is guessed.',
    },
  };
}

export function degradedReasons() {
  const report = capabilityReport();
  return Object.values(report)
    .filter((c) => !c.available)
    .map((c) => `${c.name}: ${c.note}`);
}
