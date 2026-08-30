/**
 * Record evaluation: everything that happens to one candidate opportunity after
 * it has been discovered and before it is ranked.
 *
 *   ground → infer requirements → quality filter → eligibility → score
 *
 * Discovery differs by environment (live search on the server, a bundled corpus
 * in the browser) but evaluation must not. This module is the single
 * implementation both use, so a verdict never depends on where it was computed.
 *
 * It is pure: no network, no filesystem, no configuration. Everything it needs
 * arrives as arguments.
 */

import { groundFields, citationsOf, valueOf } from '../lib/evidence.mjs';
import { inferRequirements } from './requirements.mjs';
import { assessEligibility, STATUS } from './eligibility.mjs';
import { scoreMatch } from './score.mjs';
import { assessQuality } from './quality.mjs';
import { assessConfidence } from './confidence.mjs';
import { assessDifficulty, assessCompetition } from './assessment.mjs';
import { deadlineInfo } from './deadline.mjs';

/** Scratch data the record carries for the pipeline's own use, not facts. */
const INTERNAL_KEYS = [
  'pageText', 'foundByQueries', 'sourceUrls', 'extractionMethod', 'rawSource',
  'modelError', 'isGrantOpportunity', 'detailAvailable', 'detailError', 'id', 'lastVerified',
];

function stripInternal(record) {
  const copy = { ...record };
  for (const key of INTERNAL_KEYS) delete copy[key];
  return copy;
}

/**
 * Evaluate one record against one profile.
 *
 * @returns {{outcome:'excluded'|'ineligible'|'evaluated', result?:object, exclusion?:object}}
 *   `excluded`   — failed the quality filter (expired, loan, scam, unverifiable…)
 *   `ineligible` — passed quality but fails a mandatory requirement
 *   `evaluated`  — eligible or uncertain, and ranked
 */
export function evaluateRecord(record, profile, { now = new Date(), staleAfterHours = 72 } = {}) {
  // --- Grounding: every quoted claim is re-checked against the text we hold ---
  const sourceTexts = new Map();
  if (record.pageText) sourceTexts.set(record.sourceUrls?.[0], record.pageText);

  const grounding = groundFields(stripInternal(record), sourceTexts);
  const grounded = grounding.record;
  grounded.id = record.id;
  grounded.foundByQueries = record.foundByQueries || [];
  grounded.sourceUrls = record.sourceUrls || [];
  grounded.lastVerified = record.lastVerified;
  grounded.rawSource = record.rawSource;
  grounded.extractionMethod = record.extractionMethod;

  // --- Requirements, inferred from every document we hold for this grant ---
  const documents = [];
  if (record.pageText) {
    documents.push({ text: record.pageText, sourceUrl: record.sourceUrls?.[0], fetchedAt: record.lastVerified });
  }
  const eligibilityProse = valueOf(grounded.eligibilityText);
  const descriptionProse = valueOf(grounded.description);
  if (eligibilityProse || descriptionProse) {
    documents.push({
      text: [eligibilityProse, descriptionProse].filter(Boolean).join('\n'),
      sourceUrl: grounded.eligibilityText?.sourceUrl || grounded.description?.sourceUrl,
      fetchedAt: grounded.lastVerified,
    });
  }

  const requirements = inferRequirements(documents, {
    applicantTypeDescriptions: Array.isArray(valueOf(grounded.applicantTypes)) ? valueOf(grounded.applicantTypes) : [],
    structured: { sourceUrl: grounded.sourceUrls?.[0], fetchedAt: grounded.lastVerified },
  });

  // Several documents can share a source URL (the page itself, plus prose we
  // already extracted from it). Concatenate rather than overwrite: a quote must
  // be checkable against everything we hold for that URL, or valid evidence
  // gets thrown away as unsupported.
  const requirementTexts = new Map();
  for (const document of documents) {
    if (!document.sourceUrl || !document.text) continue;
    const existing = requirementTexts.get(document.sourceUrl);
    requirementTexts.set(document.sourceUrl, existing ? `${existing}\n${document.text}` : document.text);
  }
  const groundedRequirements = groundFields(requirements, requirementTexts).record;

  // --- Quality gate, before anything is scored or shown ---
  const quality = assessQuality(grounded, { sourceTexts: requirementTexts, grounding, now });
  const deadline = deadlineInfo(grounded, { now });

  if (!quality.accepted) {
    return {
      outcome: 'excluded',
      exclusion: {
        id: grounded.id,
        grantName: valueOf(grounded.grantName) || grounded.rawSource,
        funder: valueOf(grounded.funder),
        url: valueOf(grounded.applicationUrl) || grounded.sourceUrls?.[0] || null,
        reasons: quality.rejections,
        stage: 'quality',
      },
    };
  }

  // --- Eligibility, then scoring gated on it ---
  const eligibility = assessEligibility(groundedRequirements, profile, {
    deadline: valueOf(grounded.deadline),
    status: valueOf(grounded.status),
  });

  const score = scoreMatch(grounded, profile, eligibility, { now });

  const result = {
    id: grounded.id,
    record: grounded,
    requirements: groundedRequirements,
    eligibility,
    score,
    confidence: assessConfidence(grounded, { grounding, staleAfterHours, now }),
    difficulty: assessDifficulty(grounded, eligibility),
    competition: assessCompetition(grounded),
    deadlineInfo: deadline,
    quality,
    citations: citationsOf(grounded),
    groundingReport: {
      checked: grounding.checked,
      rejected: grounding.rejected.length,
      fabricationRate: grounding.fabricationRate,
      discarded: grounding.rejected.map((entry) => ({ field: entry.path, reason: entry.reason, claimed: entry.claimedValue })),
    },
  };

  if (eligibility.status === STATUS.INELIGIBLE) {
    return {
      outcome: 'ineligible',
      result,
      exclusion: {
        id: result.id,
        grantName: valueOf(grounded.grantName),
        funder: valueOf(grounded.funder),
        url: valueOf(grounded.applicationUrl),
        reasons: eligibility.hardFailures.map((failure) => ({
          code: failure.id,
          label: failure.label,
          reason: failure.reason,
          evidence: failure.evidence,
        })),
        missionAlignment: score.components.missionAlignment.percent,
        stage: 'eligibility',
      },
    };
  }

  return { outcome: 'evaluated', result };
}

/** Evaluate many records, splitting them into what survived and what did not. */
export function evaluateAll(records, profile, options = {}) {
  const evaluated = [];
  const excluded = [];
  for (const record of records) {
    if (options.signal?.aborted) break;
    const outcome = evaluateRecord(record, profile, options);
    if (outcome.outcome === 'evaluated') evaluated.push(outcome.result);
    else excluded.push(outcome.exclusion);
  }
  return { evaluated, excluded };
}
