/**
 * Evidence-grounded field model. This is the anti-hallucination backbone.
 *
 * A grant record never holds a bare value. Every fact is a Field carrying the
 * provenance that justifies it:
 *
 *   api      - read directly out of an official funder/government API response.
 *              Trusted without a quote because no model touched it.
 *   quote    - a verbatim span the extractor claims appears on a fetched page.
 *              MUST survive `groundFields()`, which re-checks the quote against
 *              the page text we actually downloaded. A quote that is not found
 *              is treated as fabricated and the fact is destroyed.
 *   derived  - computed by deterministic code from other verified fields
 *              (e.g. days remaining from a verified deadline). Records inputs.
 *   absent   - the source was read and does not state this. An honest "unknown",
 *              never a guess.
 *
 * `unknown()` and `absent()` fields carry no value. Downstream code must treat a
 * missing value as missing -- there is no default-filling anywhere in this system.
 */

export const PROVENANCE = Object.freeze({
  API: 'api',
  QUOTE: 'quote',
  DERIVED: 'derived',
  ABSENT: 'absent',
});

/** A fact read from an official API response. */
export function apiField(value, { sourceUrl, fetchedAt, apiPath }) {
  return {
    value,
    provenance: PROVENANCE.API,
    verified: value !== undefined && value !== null && value !== '',
    sourceUrl,
    fetchedAt,
    apiPath: apiPath || null,
    quote: null,
  };
}

/** A fact claimed to be supported by a verbatim quote from a fetched page. */
export function quoteField(value, { sourceUrl, quote, fetchedAt }) {
  return {
    value,
    provenance: PROVENANCE.QUOTE,
    verified: false, // becomes true only after groundFields() locates the quote
    sourceUrl,
    fetchedAt,
    apiPath: null,
    quote: typeof quote === 'string' ? quote : null,
    grounded: null,
  };
}

/** A fact computed by our own code from other verified facts. */
export function derivedField(value, { from = [], rule = '' } = {}) {
  return {
    value,
    provenance: PROVENANCE.DERIVED,
    verified: true,
    sourceUrl: null,
    fetchedAt: new Date().toISOString(),
    apiPath: null,
    quote: null,
    derivedFrom: from,
    rule,
  };
}

/** The source was read and genuinely does not state this. */
export function absentField({ sourceUrl, fetchedAt, note = '' } = {}) {
  return {
    value: null,
    provenance: PROVENANCE.ABSENT,
    verified: false,
    sourceUrl: sourceUrl || null,
    fetchedAt: fetchedAt || null,
    apiPath: null,
    quote: null,
    note,
  };
}

/** Nothing is known about this field at all -- not even that a source was checked. */
export function unknownField(note = '') {
  return {
    value: null,
    provenance: null,
    verified: false,
    sourceUrl: null,
    fetchedAt: null,
    apiPath: null,
    quote: null,
    note,
  };
}

export function isField(candidate) {
  return Boolean(candidate) && typeof candidate === 'object' && 'value' in candidate && 'verified' in candidate;
}

export function isVerified(field) {
  return isField(field) && field.verified === true && field.value !== null && field.value !== undefined && field.value !== '';
}

/** The value if and only if it is verified; otherwise null. Use this everywhere. */
export function valueOf(field) {
  return isVerified(field) ? field.value : null;
}

/** The value even if unverified -- for display behind an "unverified" badge only. */
export function rawValueOf(field) {
  return isField(field) ? field.value : null;
}

/**
 * Normalize text for quote matching. Extraction models reliably reproduce the
 * words of a quote but not its exact whitespace, curly quotes, or entities, so
 * matching on raw text produces false fabrication reports. Normalizing both
 * sides identically keeps the check strict about *content* while tolerant of
 * *formatting*.
 */
export function normalizeForMatch(text) {
  if (typeof text !== 'string') return '';
  return text
    .normalize('NFKC')
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Minimum quote length worth trusting; shorter spans match by accident. */
const MIN_QUOTE_CHARS = 12;

export const GROUND_FAILURE = Object.freeze({
  NO_QUOTE: 'no_quote_supplied',
  TOO_SHORT: 'quote_too_short_to_verify',
  NO_SOURCE_TEXT: 'source_text_unavailable',
  NOT_FOUND: 'quote_not_found_in_source',
});

/**
 * Verify one quote-provenance field against the text actually downloaded.
 *
 * `sourceTexts` maps URL -> raw page text. Returns a new field; on failure the
 * value is stripped so no caller can accidentally read a fabricated fact.
 */
export function groundField(field, sourceTexts) {
  if (!isField(field)) return field;
  if (field.provenance !== PROVENANCE.QUOTE) return field;

  const fail = (reason) => ({
    ...field,
    value: null,
    verified: false,
    grounded: false,
    groundFailure: reason,
    unverifiedClaim: field.value ?? null,
  });

  if (!field.quote || !field.quote.trim()) return fail(GROUND_FAILURE.NO_QUOTE);

  const needle = normalizeForMatch(field.quote);
  if (needle.length < MIN_QUOTE_CHARS) return fail(GROUND_FAILURE.TOO_SHORT);

  const haystackRaw = sourceTexts instanceof Map ? sourceTexts.get(field.sourceUrl) : sourceTexts?.[field.sourceUrl];
  if (typeof haystackRaw !== 'string' || !haystackRaw) return fail(GROUND_FAILURE.NO_SOURCE_TEXT);

  if (!normalizeForMatch(haystackRaw).includes(needle)) return fail(GROUND_FAILURE.NOT_FOUND);

  return { ...field, verified: true, grounded: true, groundFailure: null };
}

/**
 * Ground every field on a record (recursively through plain objects and arrays)
 * and report what was rejected. The report is surfaced to the user: a funder
 * page that produced fabricated quotes should visibly lower our confidence in
 * everything else it produced.
 */
export function groundFields(record, sourceTexts) {
  const rejected = [];
  let checked = 0;

  const walk = (node, path) => {
    if (Array.isArray(node)) return node.map((item, index) => walk(item, `${path}[${index}]`));
    if (isField(node)) {
      if (node.provenance !== PROVENANCE.QUOTE) return node;
      checked += 1;
      const grounded = groundField(node, sourceTexts);
      if (!grounded.verified) {
        rejected.push({
          path,
          reason: grounded.groundFailure,
          claimedValue: grounded.unverifiedClaim,
          claimedQuote: node.quote,
          sourceUrl: node.sourceUrl,
        });
      }
      return grounded;
    }
    if (node && typeof node === 'object') {
      const output = {};
      for (const [key, value] of Object.entries(node)) output[key] = walk(value, path ? `${path}.${key}` : key);
      return output;
    }
    return node;
  };

  const grounded = walk(record, '');
  const fabricationRate = checked === 0 ? 0 : rejected.filter((r) => r.reason === GROUND_FAILURE.NOT_FOUND).length / checked;
  return { record: grounded, rejected, checked, fabricationRate };
}

/** Compact provenance trail for the UI's "show me why" panel. */
export function citationsOf(record) {
  const citations = new Map();
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (isField(node)) {
      if (!node.sourceUrl || !node.verified) return;
      const entry = citations.get(node.sourceUrl) || { sourceUrl: node.sourceUrl, fetchedAt: node.fetchedAt, quotes: [] };
      if (node.quote && !entry.quotes.includes(node.quote)) entry.quotes.push(node.quote);
      if (node.fetchedAt && (!entry.fetchedAt || node.fetchedAt > entry.fetchedAt)) entry.fetchedAt = node.fetchedAt;
      citations.set(node.sourceUrl, entry);
      return;
    }
    if (node && typeof node === 'object') Object.values(node).forEach(walk);
  };
  walk(record);
  return [...citations.values()];
}
