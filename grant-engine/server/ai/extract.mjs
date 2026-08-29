/**
 * Turn a fetched funder page into a grant record.
 *
 * Two paths, same output contract:
 *   patternExtract() - deterministic regex reading. Every value it produces is
 *                      taken from a sentence it located itself, so its quotes
 *                      are grounded by construction. Always runs.
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
import { toSentences } from '../engine/requirements.mjs';
import { hostOf } from '../sources/registry.mjs';

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** Parse a date written the way funders write them. Returns YYYY-MM-DD or null. */
export function parseHumanDate(text, { now = new Date() } = {}) {
  if (!text) return null;
  const source = String(text);

  let match = /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/.exec(source);
  if (match && MONTHS[match[1].toLowerCase()]) {
    return iso(Number(match[3]), MONTHS[match[1].toLowerCase()], Number(match[2]));
  }
  match = /\b(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/.exec(source);
  if (match && MONTHS[match[2].toLowerCase()]) {
    return iso(Number(match[3]), MONTHS[match[2].toLowerCase()], Number(match[1]));
  }
  match = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(source);
  if (match) return iso(Number(match[1]), Number(match[2]), Number(match[3]));
  match = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/.exec(source);
  if (match) {
    const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
    return iso(year, Number(match[1]), Number(match[2]));
  }
  // "March 1" with no year: only resolvable relative to today, and ambiguous, so
  // we decline rather than guess a year.
  return null;
}

function iso(year, month, day) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1990 || year > 2100) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseAmount(text) {
  // The decimal part must accept any number of digits: restricting it to cents
  // makes "$1.5 million" parse as $1.
  const match = /\$\s?([\d,]+(?:\.\d+)?)\s*(k\b|thousand|m\b|million)?/i.exec(String(text || ''));
  if (!match) return null;
  let value = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;
  const unit = (match[2] || '').toLowerCase();
  if (unit.startsWith('k') || unit === 'thousand') value *= 1_000;
  if (unit.startsWith('m')) value *= 1_000_000;
  return value;
}

const DEADLINE_CUES = /\b(?:deadline|due(?: by| date| on)?|closes?(?: on)?|closing date|applications? (?:are )?(?:due|accepted until|close)|submit(?:ted)? by|postmarked by|must be received by)\b/i;
const ROLLING_CUES = /\b(?:rolling basis|accepted year-?round|no deadline|applications are accepted (?:at any time|continuously)|open (?:continuously|year-?round))\b/i;
const AWARD_CUES = /\b(?:award(?:s)?|grant(?:s)?|funding)\b[^.]{0,60}\$|\bup to \$|\brange (?:from|of) \$|\btypically (?:award|range)/i;

/**
 * Deterministic extraction. Finds the sentence stating each fact and returns the
 * value together with that exact sentence as its quote.
 */
export function patternExtract(page, { now = new Date() } = {}) {
  const sentences = toSentences(page.text);
  const context = { sourceUrl: page.finalUrl || page.url, fetchedAt: page.fetchedAt };
  const record = {};

  // --- Grant name ----------------------------------------------------------
  const heading = firstHeadingLike(page);
  record.grantName = heading
    ? quoteField(heading, { ...context, quote: heading })
    : page.title
      ? quoteField(page.title, { ...context, quote: page.title })
      : unknownField('No page heading or title could be read');

  // --- Funder --------------------------------------------------------------
  // Only assert a funder when the page itself names one; otherwise leave it
  // unknown rather than inferring an organization from a domain name.
  const funder = findFunder(sentences, record.grantName.value);
  record.funder = funder
    ? quoteField(funder.name, { ...context, quote: funder.sentence })
    : unknownField(`No funder name was stated in the readable text of ${hostOf(page.url)}`);

  // --- Deadline ------------------------------------------------------------
  const rollingSentence = sentences.find((s) => ROLLING_CUES.test(s));
  const deadlineSentence = sentences.find((s) => DEADLINE_CUES.test(s) && parseHumanDate(s, { now }));
  if (deadlineSentence) {
    record.deadline = quoteField(parseHumanDate(deadlineSentence, { now }), { ...context, quote: deadlineSentence });
    record.isRolling = quoteField(false, { ...context, quote: deadlineSentence });
  } else if (rollingSentence) {
    record.deadline = absentField({ ...context, note: 'The funder states there is no fixed deadline' });
    record.isRolling = quoteField(true, { ...context, quote: rollingSentence });
  } else {
    record.deadline = absentField({ ...context, note: 'No deadline sentence was found on this page' });
    record.isRolling = unknownField('The page does not say whether applications are rolling');
  }

  // --- Award range ---------------------------------------------------------
  const awardSentence = sentences.find((s) => AWARD_CUES.test(s) && /\$/.test(s));
  if (awardSentence) {
    const amounts = [...awardSentence.matchAll(/\$\s?[\d,]+(?:\.\d{2})?\s*(?:k\b|thousand|m\b|million)?/gi)]
      .map((m) => parseAmount(m[0]))
      .filter((value) => value !== null);
    const unique = [...new Set(amounts)].sort((a, b) => a - b);
    if (unique.length >= 2) {
      record.awardMinimum = quoteField(unique[0], { ...context, quote: awardSentence });
      record.awardMaximum = quoteField(unique[unique.length - 1], { ...context, quote: awardSentence });
    } else if (unique.length === 1) {
      if (/\bup to\b|\bmaximum\b|\bno more than\b/i.test(awardSentence)) {
        record.awardMaximum = quoteField(unique[0], { ...context, quote: awardSentence });
        record.awardMinimum = unknownField('Only a maximum award was stated');
      } else if (/\bat least\b|\bminimum\b|\bstarting at\b/i.test(awardSentence)) {
        record.awardMinimum = quoteField(unique[0], { ...context, quote: awardSentence });
        record.awardMaximum = unknownField('Only a minimum award was stated');
      } else {
        record.awardMinimum = quoteField(unique[0], { ...context, quote: awardSentence });
        record.awardMaximum = quoteField(unique[0], { ...context, quote: awardSentence });
      }
    }
  }
  if (!record.awardMinimum) record.awardMinimum = absentField({ ...context, note: 'No award amount was stated on this page' });
  if (!record.awardMaximum) record.awardMaximum = absentField({ ...context, note: 'No award amount was stated on this page' });

  // --- Eligibility prose ---------------------------------------------------
  const eligibilitySentences = sentences.filter((s) =>
    /\b(?:eligib|who (?:can|may) apply|applicants? must|open to|restricted to|not eligible|qualif)\b/i.test(s));
  record.eligibilityText = eligibilitySentences.length
    ? quoteField(eligibilitySentences.slice(0, 8).join(' '), { ...context, quote: eligibilitySentences[0] })
    : absentField({ ...context, note: 'No eligibility statement was found on this page' });

  // --- Description ---------------------------------------------------------
  const descriptive = sentences.filter((s) => s.length > 60 && !DEADLINE_CUES.test(s)).slice(0, 6);
  record.description = descriptive.length
    ? quoteField(descriptive.join(' '), { ...context, quote: descriptive[0] })
    : absentField({ ...context, note: 'The page had no readable descriptive prose' });

  // --- Required documents --------------------------------------------------
  const documentSentences = sentences.filter((s) => /\b(?:required documents?|you (?:will )?(?:must|need to) (?:submit|provide|attach)|attachments? required|please (?:submit|include))\b/i.test(s));
  record.requiredDocuments = documentSentences.length
    ? quoteField(splitList(documentSentences[0]), { ...context, quote: documentSentences[0] })
    : absentField({ ...context, note: 'The page does not publish a required-document list' });

  record.applicationUrl = quoteField(page.finalUrl || page.url, {
    ...context,
    quote: heading || page.title || null,
  });
  record.officialUrl = { ...record.applicationUrl };

  record.sourceUrls = [page.finalUrl || page.url];
  record.lastVerified = page.fetchedAt;
  record.rawSource = hostOf(page.url);
  record.extractionMethod = 'pattern';

  return record;
}

function firstHeadingLike(page) {
  const lines = String(page.text || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const heading = lines.find((line) => line.length >= 12 && line.length <= 140 && /grant|fund|award|scholarship|fellowship|program/i.test(line));
  if (!heading) return null;
  // "Robotics Access Fund Guidelines" names the page, not the grant.
  return heading.replace(/\s+(?:guidelines|eligibility(?: (?:and|&) guidelines)?|overview|details|information)$/i, '').trim() || heading;
}

const FUNDER_NAME = /\b((?:[A-Z][\w&.'-]*\s+){0,4}(?:Foundation|Trust|Fund|Council|Institute|Corporation|Endowment|Charities|Department of [A-Z][\w]+|Office of [A-Z][\w]+))\b/;

/**
 * A page's own grant name usually contains "Fund" or "Foundation" too, so a
 * naive scan attributes the grant to itself. Skip any candidate that overlaps
 * the grant's name, and prefer a sentence where the organization is doing
 * something a funder does.
 */
function findFunder(sentences, grantName) {
  const normalize = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const grantKey = normalize(grantName);
  const acts = /\b(?:supports?|funds?|awards?|offers?|provides?|makes grants|is (?:a|an)|was (?:founded|established)|invests?|seeks?|believes?)\b/i;

  const candidates = [];
  for (const sentence of sentences) {
    const match = FUNDER_NAME.exec(sentence);
    if (!match) continue;
    const name = match[1].trim();
    const key = normalize(name);
    if (!key || key.length < 4) continue;
    if (grantKey && (grantKey.includes(key) || key.includes(grantKey))) continue;
    candidates.push({ name, sentence, acts: acts.test(sentence) });
  }
  return candidates.find((candidate) => candidate.acts) || candidates[0] || null;
}

function splitList(sentence) {
  const after = sentence.replace(/^.*?(?::|include[sd]?|are)\s*/i, '');
  return after
    .split(/[;,]|\band\b/)
    .map((item) => item.replace(/[.\s]+$/, '').trim())
    .filter((item) => item.length > 3 && item.length < 120);
}

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
