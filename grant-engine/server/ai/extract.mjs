/**
 * Turn a fetched funder page into a grant record.
 *
 * Two readers, one output contract:
 *   patternExtract() - deterministic, in ai/patterns.mjs. Always runs. Its
 *                      quotes are grounded by construction.
 *   modelExtract()   - a language model reads the page and points at the spans
 *                      supporting each fact. Runs only when a key is configured,
 *                      and only fills fields the pattern reader could not.
 *
 * Both are re-checked by groundFields() afterwards. The model has no privileged
 * position: a fact it cites to a quote that is not on the page is destroyed
 * exactly like any other unsupported claim.
 */

import { quoteField, unknownField, absentField } from '../lib/evidence.mjs';
import { jsonCall, hasLlm, LlmUnavailableError } from './llm.mjs';
import { hostOf } from '../sources/registry.mjs';
import { patternExtract } from './patterns.mjs';

const EXTRACTION_SCHEMA = `{
  "grantName":        {"value": string|null, "quote": string|null},
  "funder":           {"value": string|null, "quote": string|null},
  "applicationUrl":   {"value": string|null, "quote": string|null},
  "deadline":         {"value": "YYYY-MM-DD"|null, "quote": string|null},
  "isRolling":        {"value": boolean|null, "quote": string|null},
  "awardMinimum":     {"value": number|null, "quote": string|null},
  "awardMaximum":     {"value": number|null, "quote": string|null},
  "eligibilityText":  {"value": string|null, "quote": string|null},
  "description":      {"value": string|null, "quote": string|null},
  "requiredDocuments":{"value": string[]|null, "quote": string|null},
  "applicationQuestions": {"value": string[]|null, "quote": string|null},
  "isLoan":           {"value": boolean|null, "quote": string|null},
  "isContest":        {"value": boolean|null, "quote": string|null},
  "isGrantOpportunity": {"value": boolean, "quote": string|null}
}`;

/** Fields the model may fill. Everything else on a record is computed, not read. */
const MODEL_FIELDS = [
  'grantName', 'funder', 'applicationUrl', 'deadline', 'isRolling', 'awardMinimum', 'awardMaximum',
  'eligibilityText', 'description', 'requiredDocuments', 'applicationQuestions', 'isLoan', 'isContest',
];

/**
 * Model-assisted extraction. Returns a partial record of quote-provenance fields.
 * Throws LlmUnavailableError when no key is configured -- callers fall back to
 * the pattern extractor rather than proceeding with nothing.
 */
export async function modelExtract(page, { maxChars = 60_000 } = {}) {
  if (!hasLlm()) throw new LlmUnavailableError();

  const text = String(page.text || '').slice(0, maxChars);
  const context = { sourceUrl: page.finalUrl || page.url, fetchedAt: page.fetchedAt };

  const prompt = `Below is the text of a web page, fetched from ${page.finalUrl || page.url}.

Decide whether this page describes a specific funding opportunity that someone could apply for, and extract only what the page itself states.

Return JSON matching exactly this shape:
${EXTRACTION_SCHEMA}

Rules for every field:
- "value" is what the page states, or null if the page does not state it.
- "quote" is a contiguous span copied character-for-character from the page text below, containing the words that state the value. If you cannot copy such a span, set BOTH "value" and "quote" to null.
- Never convert, infer or complete a date. If the page says "March 1" with no year, the deadline is null.
- "isGrantOpportunity" must be false for a page that is a list of many grants, a news article, an application portal login, or a general "about us" page.

PAGE TEXT:
${text}`;

  const parsed = await jsonCall({ prompt, maxTokens: 3000 });
  const record = {};

  for (const key of MODEL_FIELDS) {
    const entry = parsed[key];
    if (!entry || typeof entry !== 'object') {
      record[key] = unknownField('The reader did not report this field');
      continue;
    }
    if (entry.value === null || entry.value === undefined || entry.quote === null || entry.quote === undefined) {
      record[key] = absentField({ ...context, note: 'The reader found no statement of this on the page' });
      continue;
    }
    record[key] = quoteField(entry.value, { ...context, quote: String(entry.quote) });
  }

  record.isGrantOpportunity = parsed.isGrantOpportunity?.value !== false;
  record.sourceUrls = [page.finalUrl || page.url];
  record.lastVerified = page.fetchedAt;
  record.rawSource = hostOf(page.url);
  record.extractionMethod = 'model';
  return record;
}

/**
 * Extract using both readers. The pattern reader's results are authoritative
 * where they exist (they cannot hallucinate); the model fills the gaps.
 */
export async function extractGrant(page, options = {}) {
  const pattern = patternExtract(page, options);
  if (!hasLlm()) return { ...pattern, extractionMethod: 'pattern', modelError: null };

  try {
    const model = await modelExtract(page, options);
    const merged = { ...model, ...pattern };
    // Keep model values for fields the pattern reader could not resolve.
    for (const key of MODEL_FIELDS) {
      const patternField = pattern[key];
      const hasPatternValue = patternField && patternField.value !== null && patternField.value !== undefined;
      if (!hasPatternValue && model[key]) merged[key] = model[key];
    }
    merged.isGrantOpportunity = model.isGrantOpportunity;
    merged.sourceUrls = [...new Set([...(pattern.sourceUrls || []), ...(model.sourceUrls || [])])];
    merged.extractionMethod = 'pattern+model';
    merged.modelError = null;
    return merged;
  } catch (error) {
    return { ...pattern, extractionMethod: 'pattern', modelError: error.message };
  }
}

export { patternExtract, parseHumanDate, parseAmount } from './patterns.mjs';
