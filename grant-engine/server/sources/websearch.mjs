/**
 * Web search adapters for discovering non-federal funders (foundations, state
 * and local programs, corporate giving, scholarships).
 *
 * Search results are treated strictly as *leads*. Nothing a search engine says
 * about a grant -- not the snippet, not the title -- is ever used as evidence.
 * The lead's value is a URL; the facts come from fetching that URL.
 */

import { config, searchProvider } from '../lib/config.mjs';
import { requestJson } from '../lib/http.mjs';
import { classifySource } from './registry.mjs';

export class NoSearchProviderError extends Error {
  constructor() {
    super('No web search provider is configured. Non-federal funders cannot be discovered.');
    this.name = 'NoSearchProviderError';
  }
}

/** Normalized lead shape shared by every provider. */
function toLead(url, title, snippet, query) {
  return { url, title: title || null, snippet: snippet || null, query, source: classifySource(url) };
}

async function braveSearch(query, count) {
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(Math.min(count, 20)));
  url.searchParams.set('country', 'us');
  url.searchParams.set('safesearch', 'moderate');
  const payload = await requestJson(url.toString(), {
    headers: { 'x-subscription-token': config.search.brave, accept: 'application/json' },
    timeoutMs: config.search.timeoutMs,
  });
  return (payload?.web?.results || []).map((r) => toLead(r.url, r.title, r.description, query));
}

async function serperSearch(query, count) {
  const payload = await requestJson('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'x-api-key': config.search.serper, 'content-type': 'application/json' },
    body: JSON.stringify({ q: query, num: Math.min(count, 20), gl: 'us' }),
    timeoutMs: config.search.timeoutMs,
  });
  return (payload?.organic || []).map((r) => toLead(r.link, r.title, r.snippet, query));
}

async function tavilySearch(query, count) {
  const payload = await requestJson('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${config.search.tavily}` },
    body: JSON.stringify({ query, max_results: Math.min(count, 20), search_depth: 'advanced' }),
    timeoutMs: config.search.timeoutMs,
  });
  return (payload?.results || []).map((r) => toLead(r.url, r.title, r.content, query));
}

async function googleCseSearch(query, count) {
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', config.search.googleCseKey);
  url.searchParams.set('cx', config.search.googleCseCx);
  url.searchParams.set('q', query);
  url.searchParams.set('num', String(Math.min(count, 10)));
  const payload = await requestJson(url.toString(), { timeoutMs: config.search.timeoutMs });
  return (payload?.items || []).map((r) => toLead(r.link, r.title, r.snippet, query));
}

/**
 * SearXNG: a self-hosted metasearch instance. Supported because it needs no API
 * key and keeps the whole pipeline runnable on a machine the user controls.
 */
async function searxngSearch(query, count) {
  const url = new URL('/search', config.search.searxngUrl);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('language', 'en-US');
  const payload = await requestJson(url.toString(), { timeoutMs: config.search.timeoutMs });
  return (payload?.results || []).slice(0, count).map((r) => toLead(r.url, r.title, r.content, query));
}

const PROVIDERS = {
  brave: braveSearch,
  serper: serperSearch,
  tavily: tavilySearch,
  google_cse: googleCseSearch,
  searxng: searxngSearch,
};

/**
 * Run one query. Returns `{ok, leads, provider, reason}` -- a failed search is
 * reported, never silently replaced with remembered results.
 */
export async function webSearch(query, { count = config.search.resultsPerQuery } = {}) {
  const provider = searchProvider();
  if (!provider) return { ok: false, query, leads: [], provider: null, reason: new NoSearchProviderError().message };
  try {
    const leads = await PROVIDERS[provider](query, count);
    return { ok: true, query, leads, provider, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return { ok: false, query, leads: [], provider, reason: error.message };
  }
}

/** Run many queries with light concurrency and merge their leads. */
export async function webSearchMany(queries, { count, concurrency = 3 } = {}) {
  const results = [];
  const queue = [...queries];
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, queue.length)) }, async () => {
    for (;;) {
      const query = queue.shift();
      if (query === undefined) return;
      results.push(await webSearch(query, { count }));
    }
  });
  await Promise.all(workers);
  return results;
}

export { searchProvider };
