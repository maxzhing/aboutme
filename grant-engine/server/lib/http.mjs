/**
 * Outbound HTTP: timeouts, bounded retries, per-host politeness, byte caps and
 * robots.txt compliance. Every failure is returned as data (never swallowed),
 * because "we could not reach the source" is information the user must see.
 */

import { config } from './config.mjs';

const hostLastRequest = new Map();
const robotsCache = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function throttle(host, delayMs) {
  const last = hostLastRequest.get(host) || 0;
  const wait = last + delayMs - Date.now();
  if (wait > 0) await sleep(wait);
  hostLastRequest.set(host, Date.now());
}

export class HttpError extends Error {
  constructor(message, { status = 0, url = '', retryable = false } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
    this.retryable = retryable;
  }
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * Fetch with timeout + exponential backoff. Returns the Response; the caller
 * decides how to read the body (so byte caps can be enforced by streaming).
 */
export async function request(url, { method = 'GET', headers = {}, body, timeoutMs, retries = 2, throttleHost = true } = {}) {
  const target = new URL(url);
  const limit = timeoutMs ?? config.fetcher.timeoutMs;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) await sleep(Math.min(8000, 500 * 2 ** (attempt - 1)));
    if (throttleHost) await throttle(target.host, config.fetcher.perHostDelayMs);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), limit);
    try {
      const response = await fetch(target, {
        method,
        headers: { 'user-agent': config.fetcher.userAgent, ...headers },
        body,
        redirect: 'follow',
        signal: controller.signal,
      });
      if (!response.ok && RETRYABLE_STATUS.has(response.status)) {
        lastError = new HttpError(`HTTP ${response.status} from ${target.host}`, {
          status: response.status,
          url,
          retryable: true,
        });
        // Drain so the socket can be reused.
        await response.arrayBuffer().catch(() => {});
        continue;
      }
      return response;
    } catch (error) {
      const aborted = error?.name === 'AbortError';
      lastError = new HttpError(aborted ? `Timed out after ${limit}ms` : String(error?.message || error), {
        url,
        retryable: true,
      });
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new HttpError('Request failed', { url });
}

/** JSON request helper. Throws HttpError on non-2xx or unparseable payloads. */
export async function requestJson(url, options = {}) {
  const response = await request(url, {
    ...options,
    headers: { accept: 'application/json', ...(options.headers || {}) },
  });
  const text = await readCapped(response, 8_000_000);
  if (!response.ok) {
    throw new HttpError(`HTTP ${response.status} from ${new URL(url).host}: ${text.slice(0, 300)}`, {
      status: response.status,
      url,
    });
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(`Response from ${new URL(url).host} was not valid JSON`, { url });
  }
}

/** Read a response body, stopping at `maxBytes` so a huge page cannot exhaust memory. */
export async function readCapped(response, maxBytes = config.fetcher.maxBytes) {
  if (!response.body) return await response.text();
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      chunks.push(value);
      if (total >= maxBytes) {
        await reader.cancel().catch(() => {});
        break;
      }
    }
  } catch {
    // Partial content is still usable; the caller sees a shorter document.
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

/**
 * robots.txt check. Conservative: a fetch failure is treated as "allowed"
 * (matching common crawler convention for 4xx) but a 5xx or explicit
 * Disallow blocks the fetch.
 */
export async function robotsAllows(url) {
  if (!config.fetcher.respectRobots) return true;
  const target = new URL(url);
  const origin = target.origin;
  let rules = robotsCache.get(origin);
  if (rules === undefined) {
    rules = await loadRobots(origin);
    robotsCache.set(origin, rules);
  }
  if (rules === null) return true;
  return isPathAllowed(rules, target.pathname + target.search);
}

async function loadRobots(origin) {
  try {
    const response = await request(`${origin}/robots.txt`, { timeoutMs: 8000, retries: 0 });
    if (response.status >= 500) return { disallow: ['/'], allow: [] };
    if (!response.ok) return null;
    return parseRobots(await readCapped(response, 200_000));
  } catch {
    return null;
  }
}

/** Parse the `*` user-agent group of a robots.txt file. */
export function parseRobots(text) {
  const rules = { allow: [], disallow: [] };
  let inStarGroup = false;
  let groupHadDirective = false;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const match = /^([a-zA-Z-]+)\s*:\s*(.*)$/.exec(line);
    if (!match) continue;
    const field = match[1].toLowerCase();
    const value = match[2].trim();
    if (field === 'user-agent') {
      // A new user-agent line after directives starts a fresh group.
      if (groupHadDirective) {
        inStarGroup = false;
        groupHadDirective = false;
      }
      if (value === '*') inStarGroup = true;
      continue;
    }
    if (!inStarGroup) continue;
    if (field === 'disallow' || field === 'allow') {
      groupHadDirective = true;
      if (value) rules[field].push(value);
      else if (field === 'disallow') rules.allow.push('/'); // empty Disallow means allow all
    }
  }
  return rules;
}

/** Longest-match wins, with Allow beating Disallow on ties (Google's rule). */
export function isPathAllowed(rules, pathname) {
  const match = (patterns) =>
    patterns.reduce((best, pattern) => {
      if (!matchesRobotsPattern(pattern, pathname)) return best;
      return Math.max(best, pattern.replace(/\*/g, '').length);
    }, -1);
  const allow = match(rules.allow);
  const disallow = match(rules.disallow);
  if (disallow === -1) return true;
  return allow >= disallow;
}

function matchesRobotsPattern(pattern, pathname) {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const regex = new RegExp(
    `^${body.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}${anchored ? '$' : ''}`,
  );
  return regex.test(pathname);
}

/** Run async tasks with bounded concurrency, preserving input order. */
export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      try {
        results[index] = { ok: true, value: await worker(items[index], index) };
      } catch (error) {
        results[index] = { ok: false, error };
      }
    }
  });
  await Promise.all(runners);
  return results;
}
