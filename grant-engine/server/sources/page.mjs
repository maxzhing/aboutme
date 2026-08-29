/**
 * Page acquisition: fetch a funder page and reduce it to the readable text that
 * every quote will later be checked against.
 *
 * The extracted text is the single source of truth for grounding, so extraction
 * must be lossless about *content*: dropping a sentence here would later look
 * like the extractor fabricated it. We therefore strip only non-content elements
 * (script/style/nav chrome) and keep all body prose, list items and table cells.
 */

import { config } from '../lib/config.mjs';
import { request, readCapped, robotsAllows } from '../lib/http.mjs';
import { classifySource } from './registry.mjs';

const NON_CONTENT_TAGS = ['script', 'style', 'noscript', 'template', 'svg', 'canvas', 'iframe', 'form'];

/** Named entities common in funder pages; numeric entities are handled generically. */
const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', bull: '•',
  middot: '·', copy: '©', reg: '®', trade: '™', deg: '°', euro: '€',
  pound: '£', times: '×', frac12: '½', eacute: 'é', shy: '',
};

export function decodeEntities(text) {
  return String(text).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, entity) => {
    if (entity[0] === '#') {
      const code = entity[1] === 'x' || entity[1] === 'X' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    const key = entity.toLowerCase();
    return key in ENTITIES ? ENTITIES[key] : match;
  });
}

export function extractTitle(html) {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match) return null;
  return decodeEntities(match[1]).replace(/\s+/g, ' ').trim() || null;
}

/** Absolute URLs of links on the page, with their anchor text. */
export function extractLinks(html, baseUrl) {
  const links = [];
  const pattern = /<a\b[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const href = match[1] ?? match[2] ?? match[3] ?? '';
    if (!href || /^(?:#|javascript:|mailto:|tel:)/i.test(href)) continue;
    let absolute;
    try {
      absolute = new URL(decodeEntities(href), baseUrl).toString();
    } catch {
      continue;
    }
    const text = htmlToText(match[4]).replace(/\s+/g, ' ').trim();
    links.push({ url: absolute, text });
  }
  return links;
}

/**
 * Convert HTML to plain text preserving block structure.
 * Block boundaries become newlines so "Deadline: March 1" does not merge with
 * the next unrelated cell and produce a misleading quote.
 */
export function htmlToText(html) {
  if (!html) return '';
  let text = String(html);

  for (const tag of NON_CONTENT_TAGS) {
    text = text.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), ' ');
    text = text.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), ' ');
  }
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');
  // <head> metadata is not page content; leaving it in would let a quote
  // "verify" against a meta description the reader never actually shows.
  text = text.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, ' ');
  text = text.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, ' ');

  // Table cells become tab-separated, rows and blocks become newlines.
  text = text
    .replace(/<\/(?:td|th)>/gi, '\t')
    .replace(/<\/(?:tr|li|p|div|section|article|header|footer|h[1-6]|dt|dd|blockquote|figcaption|option|label)>/gi, '\n')
    .replace(/<(?:br|hr)\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<h[1-6]\b[^>]*>/gi, '\n\n')
    .replace(/<\/?[a-zA-Z][^>]*>/g, ' ');

  text = decodeEntities(text);

  return text
    .replace(/\r/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export class PageFetchError extends Error {
  constructor(message, { url, kind }) {
    super(message);
    this.name = 'PageFetchError';
    this.url = url;
    this.kind = kind;
  }
}

/**
 * Fetch and extract a page, using the store's cache when the copy is fresh
 * enough. Returns `{url, finalUrl, text, title, links, fetchedAt, fromCache}`.
 * Throws PageFetchError -- callers surface the failure rather than substituting
 * knowledge for the page they could not read.
 */
export async function fetchPage(url, { store, maxAgeMs = 6 * 3600_000, keepHtml = false } = {}) {
  const cached = store?.cachedPage(url, maxAgeMs);
  if (cached && cached.text) {
    return {
      url,
      finalUrl: cached.finalUrl || url,
      text: cached.text,
      title: cached.title || null,
      links: cached.html ? extractLinks(cached.html, url) : [],
      fetchedAt: cached.fetchedAt,
      fromCache: true,
      source: classifySource(url),
    };
  }

  if (!(await robotsAllows(url))) {
    throw new PageFetchError(`robots.txt on this site disallows automated access to ${url}`, { url, kind: 'robots_disallowed' });
  }

  let response;
  try {
    response = await request(url, { headers: { accept: 'text/html,application/xhtml+xml' } });
  } catch (error) {
    throw new PageFetchError(`Could not reach ${url}: ${error.message}`, { url, kind: 'unreachable' });
  }

  if (!response.ok) {
    throw new PageFetchError(`${url} returned HTTP ${response.status}`, { url, kind: `http_${response.status}` });
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType && !/text\/html|application\/xhtml|text\/plain|application\/json/i.test(contentType)) {
    throw new PageFetchError(`${url} is ${contentType.split(';')[0]}, which this reader cannot verify`, {
      url,
      kind: 'unsupported_content_type',
    });
  }

  const html = await readCapped(response);
  const text = /html|xml/i.test(contentType) ? htmlToText(html) : html;
  const fetchedAt = new Date().toISOString();
  const title = extractTitle(html);

  if (store) {
    store.cachePage(url, { text, html: keepHtml ? html : null, status: response.status, title, fetchedAt });
    if (response.url && response.url !== url) {
      store.cachePage(response.url, { text, html: keepHtml ? html : null, status: response.status, title, fetchedAt });
    }
  }

  return {
    url,
    finalUrl: response.url || url,
    text,
    title,
    links: extractLinks(html, response.url || url),
    fetchedAt,
    fromCache: false,
    source: classifySource(url),
  };
}

/**
 * Follow a page's own links to the page most likely to state application terms.
 * Funder landing pages frequently say nothing verifiable; the guidelines page does.
 */
export function findApplicationPageLink(page) {
  if (!page?.links?.length) return null;
  const scored = page.links
    .map((link) => {
      const haystack = `${link.text} ${link.url}`.toLowerCase();
      let score = 0;
      if (/\b(?:eligibilit|who can apply|guidelines)\b/.test(haystack)) score += 5;
      if (/\bapply|application\b/.test(haystack)) score += 4;
      if (/\bgrant|funding|award|scholarship|fellowship\b/.test(haystack)) score += 2;
      if (/\bdeadline|dates\b/.test(haystack)) score += 2;
      if (/\bfaq|how to\b/.test(haystack)) score += 1;
      if (/\b(?:news|blog|press|about us|donate|contact|privacy|careers|login)\b/.test(haystack)) score -= 4;
      try {
        if (new URL(link.url).hostname !== new URL(page.finalUrl || page.url).hostname) score -= 3;
      } catch {
        return null;
      }
      return { ...link, score };
    })
    .filter((link) => link && link.score >= 5)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.url || null;
}

export { config };
