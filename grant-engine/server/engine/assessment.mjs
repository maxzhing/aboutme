/**
 * Application difficulty and competition level.
 *
 * Difficulty is inferred from requirements we actually verified -- a match
 * requirement, a partner requirement, federal reporting, a large award. It is a
 * genuine estimate and is labelled as one.
 *
 * Competition is only reported when the funder published numbers we can divide
 * (awards available against program funding, or an explicitly stated applicant
 * count). Otherwise it is "Unknown". Guessing a funder's acceptance rate would
 * be inventing a statistic, which this system does not do.
 */

import { valueOf } from '../lib/evidence.mjs';

export const DIFFICULTY = Object.freeze({ EASY: 'Easy', MODERATE: 'Moderate', DIFFICULT: 'Difficult' });
export const COMPETITION = Object.freeze({ LOW: 'Low', MODERATE: 'Moderate', HIGH: 'High', UNKNOWN: 'Unknown' });

export function assessDifficulty(record, eligibility) {
  const factors = [];
  let points = 0;

  const add = (weight, note) => {
    points += weight;
    factors.push(note);
  };

  if (valueOf(record.funderType) === 'federal_government') {
    add(3, 'Federal applications require SAM.gov registration and a Unique Entity ID, which alone can take weeks.');
  }
  if (valueOf(record.matchingRequired) === true || eligibility.checks.some((c) => c.id === 'matching_funds' && c.result !== 'not_stated')) {
    add(2, 'Matching funds must be documented before you can submit.');
  }
  if (eligibility.checks.some((c) => c.id === 'partnership' && c.result !== 'not_stated')) {
    add(2, 'A partner organization must be secured and formally committed.');
  }
  if (eligibility.checks.some((c) => c.id === 'previous_experience' && c.result !== 'not_stated')) {
    add(1, 'The funder expects a demonstrated track record.');
  }

  const max = valueOf(record.awardMaximum);
  if (max !== null) {
    if (max >= 250_000) add(3, 'Large awards carry heavy narrative, budget and reporting requirements.');
    else if (max >= 50_000) add(1, 'Mid-size awards usually need a full narrative and detailed budget.');
    else if (max <= 5_000) add(-1, 'Small awards typically use a short application form.');
  }

  const documents = valueOf(record.requiredDocuments);
  if (Array.isArray(documents)) {
    if (documents.length >= 6) add(2, `The funder lists ${documents.length} required documents.`);
    else if (documents.length <= 2 && documents.length > 0) add(-1, `Only ${documents.length} document${documents.length === 1 ? '' : 's'} are required.`);
  }

  const level = points >= 5 ? DIFFICULTY.DIFFICULT : points >= 2 ? DIFFICULTY.MODERATE : DIFFICULTY.EASY;
  return {
    level,
    points,
    factors: factors.length ? factors : ['No unusual application burdens were found in the verified requirements.'],
    basis: 'Estimated from the requirements we could verify. It is not a statement from the funder.',
  };
}

export function assessCompetition(record) {
  const awards = valueOf(record.expectedAwards);
  const total = valueOf(record.totalProgramFunding);
  const max = valueOf(record.awardMaximum);
  const applicantsStated = valueOf(record.priorApplicantCount);

  if (applicantsStated !== null && awards !== null && awards > 0) {
    const rate = awards / applicantsStated;
    const level = rate >= 0.4 ? COMPETITION.LOW : rate >= 0.15 ? COMPETITION.MODERATE : COMPETITION.HIGH;
    return {
      level,
      basis: `The funder published ${applicantsStated} applicants for ${awards} awards (${Math.round(rate * 100)}% funded).`,
      verified: true,
    };
  }

  if (awards !== null && awards > 0) {
    // Award count alone bounds the field but does not reveal the applicant pool.
    const level = awards >= 50 ? COMPETITION.MODERATE : COMPETITION.HIGH;
    return {
      level,
      basis: `The funder expects to make about ${awards} award${awards === 1 ? '' : 's'}. The number of applicants is not published, so this is a lower bound on competitiveness, not a measured acceptance rate.`,
      verified: false,
    };
  }

  if (total !== null && max !== null && max > 0) {
    const implied = Math.floor(total / max);
    if (implied > 0) {
      return {
        level: implied >= 50 ? COMPETITION.MODERATE : COMPETITION.HIGH,
        basis: `Program funding of ${format(total)} at up to ${format(max)} per award implies roughly ${implied} award${implied === 1 ? '' : 's'}. Applicant numbers are not published.`,
        verified: false,
      };
    }
  }

  return {
    level: COMPETITION.UNKNOWN,
    basis: 'This funder does not publish the number of applicants or awards, and we will not estimate an acceptance rate without data.',
    verified: false,
  };
}

function format(amount) {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}
