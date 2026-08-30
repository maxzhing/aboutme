/**
 * HTML → text, and the small extractions that go with it.
 *
 * Deliberately free of configuration, network and filesystem imports: the
 * extracted text is what every quote is later checked against, so this code runs
 * unchanged in the server and in the browser. Keeping it pure is what lets the
 * single-file build reuse the real implementation rather than a copy.
 */

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

/** The page's first <h1>, which is the most reliable name for the opportunity. */
export function extractHeading(html) {
  const match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (!match) return null;
  const text = htmlToText(match[1]).replace(/\s+/g, ' ').trim();
  return text && text.length <= 200 ? text : null;
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

/**
 * The text a quote is checked against.
 *
 * Body prose alone is not the whole page: the <title> and the <h1> are also
 * things the page says. They are excluded from `text` so page chrome cannot be
 * quoted as content, but a fact legitimately drawn from them must still be able
 * to verify, so grounding runs against title + heading + body.
 */
export function groundingTextOf({ title, heading, text }) {
  return [title, heading, text].filter(Boolean).join('\n');
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
