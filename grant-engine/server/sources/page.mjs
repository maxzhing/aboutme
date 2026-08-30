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
import { htmlToText, extractTitle, extractHeading, extractLinks, groundingTextOf, findApplicationPageLink } from './html.mjs';

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
      heading: cached.heading || null,
      groundingText: groundingTextOf({ title: cached.title, heading: cached.heading, text: cached.text }),
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
  const heading = extractHeading(html);

  if (store) {
    store.cachePage(url, { text, html: keepHtml ? html : null, status: response.status, title, heading, fetchedAt });
    if (response.url && response.url !== url) {
      store.cachePage(response.url, { text, html: keepHtml ? html : null, status: response.status, title, heading, fetchedAt });
    }
  }

  return {
    url,
    finalUrl: response.url || url,
    text,
    title,
    heading,
    groundingText: groundingTextOf({ title, heading, text }),
    links: extractLinks(html, response.url || url),
    fetchedAt,
    fromCache: false,
    source: classifySource(url),
  };
}


export {
  htmlToText, extractTitle, extractHeading, extractLinks, decodeEntities,
  groundingTextOf, findApplicationPageLink,
} from './html.mjs';
