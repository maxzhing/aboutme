/**
 * Match scoring.
 *
 * A transparent 0-100 score built from eight weighted components. Two rules make
 * it trustworthy:
 *
 *   1. Eligibility is a GATE, not a factor. A definitively ineligible applicant
 *      scores 0 overall no matter how perfectly the mission aligns. The
 *      component scores stay visible so the user can see "Mission 98%,
 *      Overall 0" and understand exactly why.
 *   2. Every component reports whether it is `known`. An unknown component is
 *      scored at a neutral 0.5 and labelled as unassessed rather than being
 *      quietly treated as a strength.
 */

import { STATUS } from './eligibility.mjs';
import { valueOf, isVerified } from '../lib/evidence.mjs';
import { expandConcepts } from './concepts.mjs';
import { daysUntil } from './eligibility.mjs';

export const WEIGHTS = Object.freeze({
  eligibilityCertainty: 0.30,
  missionAlignment: 0.25,
  geographicAlignment: 0.10,
  applicantTypeAlignment: 0.10,
  fundingPurposeAlignment: 0.10,
  awardSizeSuitability: 0.05,
  deadlineFeasibility: 0.05,
  historicalFundingAlignment: 0.05,
});

export const COMPONENT_LABELS = Object.freeze({
  eligibilityCertainty: 'Eligibility certainty',
  missionAlignment: 'Project / mission alignment',
  geographicAlignment: 'Geographic alignment',
  applicantTypeAlignment: 'Applicant-type alignment',
  fundingPurposeAlignment: 'Funding-purpose alignment',
  awardSizeSuitability: 'Award-size suitability',
  deadlineFeasibility: 'Deadline feasibility',
  historicalFundingAlignment: 'Historical funding alignment',
});

const STOPWORDS = new Set(
  ('the a an and or of for to in on at by with from is are be will that this these those our your their its it as '
    + 'grant grants funding fund program programs support supports project projects application applications apply '
    + 'applicant applicants award awards organization organizations we they you').split(/\s+/),
);

export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

function bigrams(tokens) {
  const output = [];
  for (let i = 0; i < tokens.length - 1; i += 1) output.push(`${tokens[i]} ${tokens[i + 1]}`);
  return output;
}

/**
 * Recall-oriented overlap: what share of the *applicant's* topic vocabulary the
 * grant text actually covers. Precision is deliberately not penalised -- a broad
 * federal program that happens to cover this project is still a real match.
 */
export function topicalOverlap(profileTerms, grantText) {
  const grantTokens = new Set(tokenize(grantText));
  const grantBigrams = new Set(bigrams(tokenize(grantText)));
  if (grantTokens.size === 0 || profileTerms.length === 0) return { score: 0, matched: [] };

  let weight = 0;
  let total = 0;
  const matched = [];
  for (const term of profileTerms) {
    const isPhrase = term.includes(' ');
    const termWeight = isPhrase ? 2 : 1;
    total += termWeight;
    const hit = isPhrase
      ? grantBigrams.has(term) || tokenize(term).every((token) => grantTokens.has(token))
      : grantTokens.has(term);
    if (hit) {
      weight += termWeight;
      matched.push(term);
    }
  }
  return { score: total === 0 ? 0 : weight / total, matched };
}

const component = (score, known, rationale) => ({
  score: Math.max(0, Math.min(1, score)),
  known,
  rationale,
});

function missionAlignment(record, profile) {
  const grantText = [
    valueOf(record.grantName),
    valueOf(record.description),
    valueOf(record.eligibilityText),
    Array.isArray(valueOf(record.fundingPurpose)) ? valueOf(record.fundingPurpose).join(' ') : '',
  ].filter(Boolean).join(' ');

  if (!grantText.trim()) {
    return component(0.5, false, 'No verified description of this opportunity was available to compare against your project.');
  }

  const description = profile.projectDescription || profile.rawDescription || '';
  const terms = [
    ...new Set([
      ...(profile.keywords || []).slice(0, 10),
      ...expandConcepts(description, { limit: 8 }).map((term) => term.toLowerCase()),
      ...(profile.fieldIndustry || []).map((industry) => industry.replace(/_/g, ' ')),
    ]),
  ].filter(Boolean);

  const { score, matched } = topicalOverlap(terms, grantText);
  // A pure overlap of 0.4 already indicates a strong thematic match in practice,
  // so the curve saturates rather than requiring implausible term-for-term overlap.
  const curved = Math.min(1, score * 2.2);
  return component(
    curved,
    true,
    matched.length
      ? `The opportunity's own text covers ${matched.length} of your project's themes: ${matched.slice(0, 6).join(', ')}.`
      : 'The opportunity\'s text does not use any of your project\'s themes, so topical alignment looks weak.',
  );
}

function geographicAlignment(record, profile, eligibility) {
  const geoCheck = eligibility.checks.find((c) => c.id === 'geography');
  if (geoCheck?.result === 'pass') {
    return component(1, true, 'The funder restricts giving to your area, which means less competition from outside applicants.');
  }
  if (geoCheck?.result === 'fail') {
    return component(0, true, 'The funder does not give in your area.');
  }
  if (geoCheck?.result === 'unknown_applicant') {
    return component(0.5, false, 'The funder restricts giving geographically, but we do not know your location.');
  }
  const funderType = valueOf(record.funderType);
  if (funderType === 'federal_government') {
    return component(0.75, true, 'A national program: you are eligible geographically, but you compete against the whole country.');
  }
  return component(0.6, false, 'No geographic restriction could be verified, so this is scored neutrally.');
}

function applicantTypeAlignment(eligibility) {
  const typeCheck = eligibility.checks.find((c) => c.id === 'applicant_type');
  if (!typeCheck) return component(0.5, false, 'Applicant-type eligibility was not assessed.');
  if (typeCheck.result === 'pass') return component(1, true, 'The funder explicitly lists your applicant type as eligible.');
  if (typeCheck.result === 'fail') return component(0, true, 'The funder does not accept your applicant type.');
  if (typeCheck.result === 'unknown_applicant') return component(0.4, false, 'The funder limits applicant types and one detail about you is unconfirmed.');
  return component(0.5, false, 'The funder does not publish a structured list of eligible applicant types.');
}

const PURPOSE_PATTERNS = {
  program_delivery: /\bprogram|programming|services|curriculum|outreach|workshops?\b/i,
  equipment: /\bequipment|hardware|instrument|supplies and equipment|technology purchase\b/i,
  operating_support: /\bgeneral operating|operating support|unrestricted|core support\b/i,
  capital_project: /\bcapital|construction|renovation|facilit(?:y|ies)|infrastructure\b/i,
  research: /\bresearch|investigation|study|experiment|scientific\b/i,
  scholarship_tuition: /\bscholarship|tuition|student aid|fellowship\b/i,
  travel_conference: /\btravel|conference|symposium|convening\b/i,
  startup_capital: /\bstart-?up|seed|working capital|business launch|commercializ\b/i,
  staff_salaries: /\bsalar|personnel|staffing|stipend|fellowship support\b/i,
  materials_supplies: /\bmaterials|supplies|books|equipment\b/i,
  events: /\bevent|festival|exhibition|performance|convening\b/i,
  training: /\btraining|professional development|capacity building|workforce\b/i,
};

function fundingPurposeAlignment(record, profile) {
  const purposes = profile.fundingPurpose || [];
  if (purposes.length === 0) {
    return component(0.5, false, 'You have not told us what the money would be spent on, so purpose fit is unscored.');
  }
  const grantText = [
    valueOf(record.grantName),
    valueOf(record.description),
    Array.isArray(valueOf(record.fundingPurpose)) ? valueOf(record.fundingPurpose).join(' ') : '',
  ].filter(Boolean).join(' ');
  if (!grantText.trim()) {
    return component(0.5, false, 'No verified description was available to check what this grant pays for.');
  }
  const hits = purposes.filter((purpose) => PURPOSE_PATTERNS[purpose]?.test(grantText));
  if (hits.length === 0) {
    return component(0.25, true, 'Nothing in the opportunity\'s text indicates it funds the kind of costs you described.');
  }
  return component(
    Math.min(1, 0.6 + 0.4 * (hits.length / purposes.length)),
    true,
    `The opportunity's text indicates it funds ${hits.map((h) => h.replace(/_/g, ' ')).join(', ')}.`,
  );
}

function awardSizeSuitability(record, profile) {
  const need = profile.fundingNeeded;
  const min = valueOf(record.awardMinimum);
  const max = valueOf(record.awardMaximum);
  if (need === null) return component(0.5, false, 'You have not told us how much you need, so award fit is unscored.');
  if (min === null && max === null) return component(0.5, false, 'The award range could not be verified from a primary source.');

  const low = min ?? 0;
  const high = max ?? Infinity;
  if (need >= low && need <= high) {
    return component(1, true, `Your request of ${money(need)} sits inside this program's award range (${money(min)}–${money(max)}).`);
  }
  if (need > high) {
    const ratio = high / need;
    return component(
      Math.max(0.1, ratio),
      true,
      `This program awards up to ${money(max)}, which is less than the ${money(need)} you need. It could still be part of a larger funding stack.`,
    );
  }
  const ratio = need / low;
  return component(
    Math.max(0.15, ratio),
    true,
    `This program's smallest award is ${money(min)}, well above your ${money(need)} request. Funders rarely award less than their floor.`,
  );
}

function deadlineFeasibility(record, profile, now) {
  const deadline = valueOf(record.deadline);
  if (!deadline) {
    return component(0.5, false, 'No deadline could be verified from a primary source.');
  }
  const days = daysUntil(deadline, now);
  if (days === null) return component(0.5, false, 'The verified deadline could not be interpreted as a date.');
  if (days < 0) return component(0, true, 'The deadline has already passed.');

  let score;
  let note;
  if (days <= 7) {
    score = 0.3;
    note = `Only ${days} day${days === 1 ? '' : 's'} remain — enough time only if you already have materials ready.`;
  } else if (days <= 21) {
    score = 0.65;
    note = `${days} days remain, which is tight but workable for a focused application.`;
  } else if (days <= 120) {
    score = 1;
    note = `${days} days remain — comfortable time to prepare a strong application.`;
  } else if (days <= 365) {
    score = 0.85;
    note = `${days} days remain, so this is a plan-ahead opportunity rather than an immediate one.`;
  } else {
    score = 0.6;
    note = `The deadline is over a year away (${days} days); terms are likely to change before then.`;
  }

  if (profile.deadlinePreference === 'asap' && days > 90) score = Math.min(score, 0.5);
  if (profile.deadlinePreference === 'within_3_months' && days > 120) score = Math.min(score, 0.55);
  return component(score, true, note);
}

/**
 * Historical funding alignment: has this funder demonstrably funded work like
 * this before? We only know that if a source told us. Absent evidence, this is
 * explicitly unassessed rather than assumed.
 */
function historicalFundingAlignment(record, profile) {
  const history = record.fundingHistory;
  if (!isVerified(history) || !Array.isArray(history.value) || history.value.length === 0) {
    return component(0.5, false, 'We found no verified record of this funder\'s past awards, so their track record with projects like yours is unassessed.');
  }
  const terms = [...new Set([...(profile.keywords || []).slice(0, 8), ...(profile.fieldIndustry || [])])];
  const { score, matched } = topicalOverlap(terms, history.value.join(' '));
  return component(
    Math.min(1, 0.4 + score * 1.5),
    true,
    matched.length
      ? `This funder's published award history includes work involving ${matched.slice(0, 4).join(', ')}.`
      : 'This funder\'s published award history does not obviously include projects like yours.',
  );
}

/**
 * Compute the full score breakdown.
 * Returns `{overall, gated, components, weights, explanation}`.
 */
export function scoreMatch(record, profile, eligibility, { now = new Date() } = {}) {
  const components = {
    eligibilityCertainty: component(
      eligibility.status === STATUS.INELIGIBLE ? 0 : eligibility.certainty,
      eligibility.certainty > 0,
      eligibility.summary,
    ),
    missionAlignment: missionAlignment(record, profile),
    geographicAlignment: geographicAlignment(record, profile, eligibility),
    applicantTypeAlignment: applicantTypeAlignment(eligibility),
    fundingPurposeAlignment: fundingPurposeAlignment(record, profile),
    awardSizeSuitability: awardSizeSuitability(record, profile),
    deadlineFeasibility: deadlineFeasibility(record, profile, now),
    historicalFundingAlignment: historicalFundingAlignment(record, profile),
  };

  const weighted = Object.entries(WEIGHTS).reduce(
    (total, [key, weight]) => total + weight * components[key].score,
    0,
  );
  const raw = Math.round(weighted * 100);

  // THE GATE. Similarity never overrides a failed hard requirement.
  const gated = eligibility.status === STATUS.INELIGIBLE;
  const overall = gated ? 0 : raw;

  return {
    overall,
    rawScore: raw,
    gated,
    gateReason: gated
      ? `Overall match is 0 because a mandatory requirement is failed: ${eligibility.hardFailures.map((f) => f.reason).join(' ')}`
      : null,
    components: Object.fromEntries(
      Object.entries(components).map(([key, value]) => [
        key,
        {
          ...value,
          label: COMPONENT_LABELS[key],
          weight: WEIGHTS[key],
          percent: Math.round(value.score * 100),
          contribution: Math.round(WEIGHTS[key] * value.score * 100),
        },
      ]),
    ),
    unassessedComponents: Object.entries(components).filter(([, value]) => !value.known).map(([key]) => COMPONENT_LABELS[key]),
  };
}

function money(amount) {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return 'an unstated amount';
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

export { money };
