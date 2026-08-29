/**
 * Grant quality filter.
 *
 * Runs before anything reaches the user and answers one question: is this a
 * real, currently-open, grant-shaped funding opportunity from an identifiable
 * funder? Rejections are kept and shown in the "excluded opportunities" section
 * with their reason, so the user can audit every call the engine made.
 */

import { valueOf, isVerified, rawValueOf } from '../lib/evidence.mjs';
import { classifySource, TIER, isAggregator } from '../sources/registry.mjs';
import { daysUntil } from './eligibility.mjs';

export const REJECTION = Object.freeze({
  EXPIRED: 'expired',
  NO_FUNDER: 'no_identifiable_funder',
  NO_PRIMARY_SOURCE: 'no_primary_source',
  UNTRUSTED_DOMAIN: 'untrusted_domain',
  PAYMENT_REQUIRED: 'payment_required',
  IS_LOAN: 'is_loan',
  UNVERIFIABLE: 'unverifiable',
  FABRICATION_DETECTED: 'fabrication_detected',
  NOT_A_GRANT: 'not_a_grant',
  CLOSED: 'closed',
});

const REJECTION_LABEL = Object.freeze({
  expired: 'Deadline has passed',
  no_identifiable_funder: 'No identifiable funder',
  no_primary_source: 'No primary source',
  untrusted_domain: 'Untrusted website',
  payment_required: 'Asks applicants for money',
  is_loan: 'This is a loan, not a grant',
  unverifiable: 'Nothing could be verified',
  fabrication_detected: 'Source produced unsupported claims',
  not_a_grant: 'Not a grant opportunity',
  closed: 'Applications are closed',
});

/** Language that marks an advance-fee scam or a lead-generation funnel. */
const PAYMENT_PATTERNS = [
  /\b(?:application|processing|administrative|registration)\s+fee\s+of\s+\$?\d/i,
  /\bpay\s+(?:a\s+)?\$?\d+(?:\.\d{2})?\s+to\s+(?:apply|submit|receive|claim)/i,
  /\bcredit card (?:required|information) to (?:apply|claim)/i,
  /\bwire (?:transfer|money) to (?:receive|claim|release) (?:your|the) (?:grant|funds)/i,
  /\bguaranteed (?:grant|approval|funding)\b/i,
  /\bno credit check.{0,40}\bgrant\b/i,
];

const LOAN_PATTERNS = [
  /\bmust be repaid\b/i,
  /\brepayment (?:is required|schedule|terms)\b/i,
  /\binterest rate of\b/i,
  /\bloan (?:program|amount|agreement)\b/i,
];

const CONTEST_PATTERNS = [
  /\bpitch competition\b/i,
  /\bcontest\b/i,
  /\bsweepstakes\b/i,
  /\bjudges will (?:select|choose) (?:the )?winners?\b/i,
];

/**
 * @param {object} record   grounded grant record
 * @param {object} options  {sourceTexts, grounding, now}
 * @returns {{accepted:boolean, rejections:Array, warnings:Array, labels:Array}}
 */
export function assessQuality(record, { sourceTexts = new Map(), grounding = null, now = new Date() } = {}) {
  const rejections = [];
  const warnings = [];
  const labels = [];

  const reject = (code, reason) => rejections.push({ code, label: REJECTION_LABEL[code], reason });
  const warn = (code, reason) => warnings.push({ code, label: REJECTION_LABEL[code] || code, reason });

  // --- Funder identity -----------------------------------------------------
  const funder = valueOf(record.funder);
  if (!funder || String(funder).trim().length < 3) {
    reject(REJECTION.NO_FUNDER, 'No funder could be identified from any source we could read. A real grant always names who is giving the money.');
  }

  // --- Source quality ------------------------------------------------------
  const urls = collectSourceUrls(record);
  const classifications = urls.map(classifySource);
  const bestTier = classifications.length ? Math.min(...classifications.map((c) => c.tier)) : TIER.UNTRUSTED;

  if (classifications.some((c) => c.tier === TIER.UNTRUSTED)) {
    const bad = classifications.find((c) => c.tier === TIER.UNTRUSTED);
    reject(REJECTION.UNTRUSTED_DOMAIN, `Information came from ${bad.host}, whose domain matches known grant-scam patterns.`);
  }
  if (urls.length === 0) {
    reject(REJECTION.NO_PRIMARY_SOURCE, 'No source URL is attached to this opportunity, so nothing about it can be checked.');
  } else if (bestTier >= TIER.AGGREGATOR) {
    reject(
      REJECTION.NO_PRIMARY_SOURCE,
      `Everything we know about this comes from third-party listing sites (${classifications.map((c) => c.host).join(', ')}) rather than the funder's own pages. Listing sites routinely carry stale deadlines and rewritten eligibility rules.`,
    );
  } else if (classifications.some(isAggregatorClassification)) {
    warn(REJECTION.NO_PRIMARY_SOURCE, 'Some details came from a third-party listing; only facts confirmed on the funder\'s own pages are marked verified.');
  }

  // --- Fabrication ---------------------------------------------------------
  if (grounding && grounding.checked > 0 && grounding.fabricationRate >= 0.34) {
    reject(
      REJECTION.FABRICATION_DETECTED,
      `${Math.round(grounding.fabricationRate * 100)}% of the quotes cited for this opportunity could not be found on the pages they were attributed to. Nothing from this source can be trusted.`,
    );
  } else if (grounding && grounding.rejected.length > 0) {
    warn('grounding', `${grounding.rejected.length} claimed fact${grounding.rejected.length === 1 ? '' : 's'} could not be confirmed against the source page and ${grounding.rejected.length === 1 ? 'was' : 'were'} discarded.`);
  }

  // --- Deadline / open status ---------------------------------------------
  const deadline = valueOf(record.deadline);
  const status = String(valueOf(record.status) || '').toLowerCase();
  if (status && /closed|archived|cancell?ed|withdrawn/.test(status)) {
    reject(REJECTION.CLOSED, `The funder marks this opportunity as "${status}".`);
  }
  if (deadline) {
    const days = daysUntil(deadline, now);
    if (days !== null && days < 0) {
      reject(REJECTION.EXPIRED, `The application deadline was ${deadline}, ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago.`);
    }
  } else {
    const claimed = rawValueOf(record.deadline);
    warn('deadline_unverified', claimed
      ? `A deadline of "${claimed}" was found but could not be confirmed from a primary source, so it is not being treated as fact.`
      : 'No deadline could be verified. Confirm on the funder\'s page before relying on this being open.');
  }

  // --- Instrument type -----------------------------------------------------
  const allText = [
    valueOf(record.description),
    valueOf(record.eligibilityText),
    ...[...sourceTexts.values()],
  ].filter(Boolean).join('\n');

  if (valueOf(record.isLoan) === true || (allText && LOAN_PATTERNS.some((p) => p.test(allText)) && !/\bdoes not (?:have to )?be repaid|no repayment required|not a loan\b/i.test(allText))) {
    reject(REJECTION.IS_LOAN, 'The terms describe repayment, which makes this a loan rather than a grant.');
  }

  if (valueOf(record.isContest) === true || (allText && CONTEST_PATTERNS.some((p) => p.test(allText)))) {
    labels.push({
      code: 'contest',
      label: '🏁 Competition, not a standard grant',
      note: 'This is awarded through a contest or pitch competition. That is legitimate funding, but the process and odds differ from a normal grant application.',
    });
  }

  if (allText && PAYMENT_PATTERNS.some((p) => p.test(allText))) {
    reject(REJECTION.PAYMENT_REQUIRED, 'The page asks applicants to pay a fee or guarantees funding. Legitimate grantmakers do not charge applicants and never guarantee awards.');
  }

  // --- Is anything verified at all? ---------------------------------------
  const coreFields = ['grantName', 'funder', 'applicationUrl', 'deadline', 'eligibilityText', 'description', 'awardMaximum'];
  const verifiedCount = coreFields.filter((key) => isVerified(record[key])).length;
  if (verifiedCount === 0) {
    reject(REJECTION.UNVERIFIABLE, 'Not one core fact about this opportunity (funder, deadline, award size, eligibility, application link) could be verified from a source we could read.');
  } else if (verifiedCount <= 2) {
    warn(REJECTION.UNVERIFIABLE, `Only ${verifiedCount} of ${coreFields.length} core facts could be verified. Treat the rest as unconfirmed.`);
  }

  return {
    accepted: rejections.length === 0,
    rejections,
    warnings,
    labels,
    bestSourceTier: bestTier,
    verifiedCoreFields: verifiedCount,
    coreFieldCount: coreFields.length,
  };
}

function isAggregatorClassification(classification) {
  return classification.tier >= TIER.AGGREGATOR;
}

export function collectSourceUrls(record) {
  const urls = new Set();
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === 'object') {
      if (typeof node.sourceUrl === 'string' && node.sourceUrl) urls.add(node.sourceUrl);
      return Object.values(node).forEach(walk);
    }
  };
  walk(record);
  for (const url of record.sourceUrls || []) if (typeof url === 'string') urls.add(url);
  return [...urls];
}

export { isAggregator };
