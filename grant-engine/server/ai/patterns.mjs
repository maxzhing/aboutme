/**
 * Deterministic extraction: read a funder page with patterns alone.
 *
 * Pure by design — no model, no network, no configuration — so the same code
 * runs on the server and in the browser, and so its output can never be a
 * hallucination: every value it produces comes from a sentence it located
 * itself, and it supplies that sentence as the quote.
 */

import { quoteField, unknownField, absentField, apiField } from '../lib/evidence.mjs';
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
  const heading = pageHeading(page);
  record.grantName = heading
    ? quoteField(heading, { ...context, quote: heading })
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

  // The address is not a claim extracted from the page's words — it is where we
  // fetched the page from. Attributing it to a quote would be false reasoning.
  record.applicationUrl = apiField(page.finalUrl || page.url, {
    sourceUrl: context.sourceUrl,
    fetchedAt: context.fetchedAt,
    apiPath: 'the URL this page was fetched from',
  });
  record.officialUrl = { ...record.applicationUrl };

  record.sourceUrls = [page.finalUrl || page.url];
  record.lastVerified = page.fetchedAt;
  record.rawSource = hostOf(page.url);
  record.extractionMethod = 'pattern';

  return record;
}

/**
 * The opportunity's name. The page's own <h1> is the most reliable source; a
 * grant-ish line in the body is the fallback; the <title> is the last resort.
 * All three are inside the grounding corpus, so any of them can verify.
 */
function pageHeading(page) {
  const trim = (value) => String(value || '')
    // "Robotics Access Fund Guidelines" names the page, not the grant.
    .replace(/\s+(?:guidelines|eligibility(?: (?:and|&) guidelines)?|overview|details|information)$/i, '')
    .trim();

  const h1 = trim(page.heading);
  if (h1.length >= 8) return h1;

  const lines = String(page.text || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const line = lines.find((candidate) => candidate.length >= 12 && candidate.length <= 140
    && /grant|fund|award|scholarship|fellowship|program|prize|fellowship/i.test(candidate));
  if (line) return trim(line);

  const title = trim(page.title);
  return title.length >= 8 ? title : null;
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
