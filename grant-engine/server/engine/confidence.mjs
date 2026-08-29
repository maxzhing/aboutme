/**
 * Source confidence -- deliberately separate from the match score.
 *
 * Match score answers "how well does this fit you?".
 * Source confidence answers "how sure are we that what we told you is true?".
 *
 * A grant can be a 96/100 match with LOW source confidence, and the interface
 * must make that contradiction obvious rather than averaging it away. These two
 * numbers are never combined anywhere in this codebase.
 */

import { isVerified } from '../lib/evidence.mjs';
import { classifySource, TIER } from '../sources/registry.mjs';
import { collectSourceUrls } from './quality.mjs';

export const CONFIDENCE = Object.freeze({ HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' });

export const CONFIDENCE_LABEL = Object.freeze({
  HIGH: '🟢 High',
  MEDIUM: '🟡 Medium',
  LOW: '🔴 Low',
});

export const CONFIDENCE_MEANING = Object.freeze({
  HIGH: 'Verified through the funder\'s own application source.',
  MEDIUM: 'Corroborated, but not fully confirmed from a primary source.',
  LOW: 'Important information could not be independently verified.',
});

/** Facts a user would act on. Their verification status drives confidence. */
const CRITICAL_FIELDS = [
  { key: 'grantName', label: 'Grant name' },
  { key: 'funder', label: 'Funder' },
  { key: 'applicationUrl', label: 'Application URL' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'awardMaximum', label: 'Maximum award' },
  { key: 'eligibilityText', label: 'Eligibility rules' },
];

/**
 * @param {object} record   grounded grant record
 * @param {object} options  {grounding, staleAfterHours, now}
 */
export function assessConfidence(record, { grounding = null, staleAfterHours = 72, now = new Date() } = {}) {
  const fieldStatus = CRITICAL_FIELDS.map(({ key, label }) => ({
    key,
    label,
    verified: isVerified(record[key]),
    provenance: record[key]?.provenance || null,
  }));
  const verifiedCount = fieldStatus.filter((f) => f.verified).length;
  const unverified = fieldStatus.filter((f) => !f.verified);

  const urls = collectSourceUrls(record);
  const tiers = urls.map((url) => classifySource(url).tier);
  const bestTier = tiers.length ? Math.min(...tiers) : TIER.UNTRUSTED;

  const lastVerified = Date.parse(record.lastVerified || '');
  const ageHours = Number.isFinite(lastVerified) ? (now.getTime() - lastVerified) / 3_600_000 : Infinity;
  const stale = ageHours > staleAfterHours;

  const fabricationRate = grounding?.checked ? grounding.fabricationRate : 0;

  const reasons = [];
  let level;

  if (bestTier <= TIER.OFFICIAL_GOVERNMENT && verifiedCount >= 4 && fabricationRate === 0 && !stale) {
    level = CONFIDENCE.HIGH;
    reasons.push('Read directly from an official government source.');
  } else if (bestTier <= TIER.FUNDER_PRIMARY && verifiedCount >= 4 && fabricationRate === 0 && !stale) {
    level = CONFIDENCE.HIGH;
    reasons.push('Confirmed on the funder\'s own website, with every critical fact traced to a quoted passage.');
  } else if (bestTier <= TIER.FUNDER_PRIMARY && verifiedCount >= 4 && fabricationRate < 0.2) {
    level = CONFIDENCE.MEDIUM;
    reasons.push('Confirmed on the funder\'s own site, but some critical facts are still unverified.');
  } else if (bestTier <= TIER.INSTITUTIONAL && verifiedCount >= 4) {
    level = CONFIDENCE.MEDIUM;
    reasons.push('Corroborated by an institutional source rather than the funder\'s own application page.');
  } else {
    // Fewer than four of the six decision-critical facts confirmed. However
    // reputable the domain, a user cannot act on this without checking it
    // themselves, so it is Low regardless of source tier.
    level = CONFIDENCE.LOW;
    reasons.push('Key details could not be confirmed against the funder\'s own pages.');
  }

  if (stale && level !== CONFIDENCE.LOW) {
    level = level === CONFIDENCE.HIGH ? CONFIDENCE.MEDIUM : CONFIDENCE.LOW;
    reasons.push(`Last checked ${Math.round(ageHours)} hours ago, past the ${staleAfterHours}-hour freshness window. Grant terms change without notice.`);
  }
  if (fabricationRate > 0) {
    reasons.push(`${Math.round(fabricationRate * 100)}% of quoted evidence from this source failed verification and was discarded.`);
  }
  if (unverified.length) {
    reasons.push(`Unverified: ${unverified.map((f) => f.label).join(', ')}.`);
  }

  return {
    level,
    label: CONFIDENCE_LABEL[level],
    meaning: CONFIDENCE_MEANING[level],
    reasons,
    verifiedCriticalFields: verifiedCount,
    criticalFieldCount: CRITICAL_FIELDS.length,
    unverifiedFields: unverified.map((f) => f.label),
    bestSourceTier: bestTier,
    lastVerified: record.lastVerified || null,
    stale,
    ageHours: Number.isFinite(ageHours) ? Math.round(ageHours) : null,
  };
}

/** Human phrasing for the "Last verified" line the UI must always show. */
export function formatVerificationStamp(isoString) {
  if (!isoString) return 'Never verified';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Never verified';
  return `Last verified: ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}`;
}
