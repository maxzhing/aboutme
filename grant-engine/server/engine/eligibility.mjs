/**
 * Eligibility engine.
 *
 * Reads the funder's stated requirements against the applicant's profile and
 * returns one of three honest verdicts:
 *
 *   ELIGIBLE   - a requirement was stated, we hold the applicant's answer, and
 *                the answer satisfies it. Never awarded on similarity.
 *   UNCERTAIN  - a requirement exists but the applicant's answer is unknown, or
 *                the funder's rules could not be read at all.
 *   INELIGIBLE - a mandatory requirement is definitively failed.
 *
 * The engine is pure and deterministic: same profile plus same requirements
 * always yields the same verdict, and every verdict names the sentence behind it.
 */

import { isVerified, valueOf } from '../lib/evidence.mjs';
import { stateName } from './profile.mjs';

export const STATUS = Object.freeze({
  ELIGIBLE: 'ELIGIBLE',
  UNCERTAIN: 'UNCERTAIN',
  INELIGIBLE: 'INELIGIBLE',
});

export const STATUS_LABEL = Object.freeze({
  ELIGIBLE: '🟢 ELIGIBLE',
  UNCERTAIN: '🟡 ELIGIBILITY UNCERTAIN',
  INELIGIBLE: '❌ NOT ELIGIBLE',
});

export const RESULT = Object.freeze({
  PASS: 'pass',
  FAIL: 'fail',
  UNKNOWN_APPLICANT: 'unknown_applicant', // funder states a rule; we lack the applicant's answer
  NOT_STATED: 'not_stated',               // funder never states this rule
  NOT_APPLICABLE: 'not_applicable',
});

/** Person-shaped applicant types: a funder that excludes individuals excludes these. */
const PERSON_TYPES = new Set(['individual', 'student', 'artist', 'researcher']);

/** Organization-shaped applicant types. */
const ORG_TYPES = new Set(['nonprofit', 'school', 'small_business', 'startup', 'community_organization']);

/**
 * Evidence is only ever shown for a field that survived verification. Quoting a
 * passage next to a conclusion we did not draw from it would be exactly the kind
 * of false authority this system exists to avoid.
 */
const evidenceOf = (field) => {
  if (!isVerified(field)) return null;
  if (field.quote) return { quote: field.quote, sourceUrl: field.sourceUrl, fetchedAt: field.fetchedAt };
  if (field.sourceUrl) return { quote: null, sourceUrl: field.sourceUrl, fetchedAt: field.fetchedAt };
  return null;
};

function check(id, label, result, reason, { field = null, blocking = false, question = null } = {}) {
  return { id, label, result, reason, blocking, evidence: evidenceOf(field), question };
}

/**
 * @param {object} requirements - output of inferRequirements(), grounded.
 * @param {object} profile      - normalized applicant profile.
 * @param {object} context      - {deadline, status, isLoan, isContest} verified fields from the record.
 */
export function assessEligibility(requirements, profile, context = {}) {
  const checks = [];

  checks.push(applicantTypeCheck(requirements, profile));
  checks.push(nonprofitCheck(requirements, profile));
  checks.push(individualsCheck(requirements, profile));
  checks.push(organizationCheck(requirements, profile));
  checks.push(...ageChecks(requirements, profile));
  checks.push(geographyCheck(requirements, profile));
  checks.push(citizenshipCheck(requirements, profile));
  checks.push(educationCheck(requirements, profile));
  checks.push(deadlineCheck(context));
  checks.push(matchingCheck(requirements, profile));
  checks.push(partnershipCheck(requirements));
  checks.push(experienceCheck(requirements));

  const present = checks.filter(Boolean);
  const blockingFailures = present.filter((c) => c.blocking && c.result === RESULT.FAIL);
  const blockingUnknowns = present.filter((c) => c.blocking && c.result === RESULT.UNKNOWN_APPLICANT);
  const passes = present.filter((c) => c.result === RESULT.PASS);
  const decisive = present.filter((c) => c.blocking && c.result !== RESULT.NOT_APPLICABLE);
  const stated = decisive.filter((c) => c.result !== RESULT.NOT_STATED);

  let status;
  let summary;

  if (blockingFailures.length > 0) {
    status = STATUS.INELIGIBLE;
    summary = blockingFailures.map((c) => c.reason).join(' ');
  } else if (blockingUnknowns.length > 0) {
    status = STATUS.UNCERTAIN;
    summary = `${blockingUnknowns.length} requirement${blockingUnknowns.length === 1 ? '' : 's'} cannot be checked until you confirm a detail about yourself.`;
  } else if (stated.length === 0) {
    status = STATUS.UNCERTAIN;
    summary = 'No eligibility rules could be read from a source we trust, so eligibility cannot be confirmed either way.';
  } else if (passes.length === 0) {
    status = STATUS.UNCERTAIN;
    summary = 'The funder\'s stated rules do not conflict with your profile, but nothing in them positively confirms you qualify.';
  } else {
    status = STATUS.ELIGIBLE;
    summary = `You satisfy every requirement the funder states (${passes.length} confirmed).`;
  }

  /**
   * Certainty drives 30% of the match score. It reflects how much of the
   * eligibility picture is actually resolved, not how good the fit feels.
   */
  const certainty = computeCertainty(status, decisive, blockingUnknowns);

  return {
    status,
    label: STATUS_LABEL[status],
    summary,
    certainty,
    checks: present,
    hardFailures: blockingFailures,
    openQuestions: blockingUnknowns.filter((c) => c.question).map((c) => c.question),
    unresolved: present.filter((c) => c.result === RESULT.UNKNOWN_APPLICANT || c.result === RESULT.NOT_STATED),
    risks: present.filter((c) => !c.blocking && (c.result === RESULT.FAIL || c.result === RESULT.UNKNOWN_APPLICANT)),
  };
}

function computeCertainty(status, decisive, blockingUnknowns) {
  if (status === STATUS.INELIGIBLE) return 1; // we are certain, and the answer is no
  if (decisive.length === 0) return 0;
  const resolved = decisive.filter((c) => c.result === RESULT.PASS || c.result === RESULT.FAIL).length;
  const notStated = decisive.filter((c) => c.result === RESULT.NOT_STATED).length;
  // Unstated rules are mildly reassuring (the funder imposes no such limit) but
  // are worth less than a rule we positively confirmed the applicant meets.
  const score = (resolved + notStated * 0.5) / decisive.length;
  const penalty = blockingUnknowns.length * 0.15;
  return Math.max(0, Math.min(1, score - penalty));
}

function applicantTypeCheck(requirements, profile) {
  const allowed = requirements.allowedApplicantTypes;
  const label = 'Applicant type';
  if (!isVerified(allowed) || !Array.isArray(allowed.value) || allowed.value.length === 0) {
    return check('applicant_type', label, RESULT.NOT_STATED, 'The funder does not publish a machine-readable list of eligible applicant types.', { field: allowed, blocking: true });
  }
  if (!profile.applicantType) {
    return check('applicant_type', label, RESULT.UNKNOWN_APPLICANT, 'The funder limits who may apply, but you have not told us what kind of applicant you are.', {
      field: allowed,
      blocking: true,
      question: {
        id: 'applicantType',
        text: 'What kind of applicant are you?',
        why: 'This funder restricts eligibility by applicant type.',
        field: 'applicantType',
        kind: 'choice',
      },
    });
  }
  const exhaustive = valueOf(requirements.applicantTypesExhaustive);
  if (allowed.value.includes(profile.applicantType)) {
    return check('applicant_type', label, RESULT.PASS, `The funder lists your applicant type (${humanType(profile.applicantType)}) among those eligible to apply.`, { field: allowed, blocking: true });
  }
  if (exhaustive === false) {
    return check('applicant_type', label, RESULT.UNKNOWN_APPLICANT, `The funder's eligible-applicant list does not name ${humanType(profile.applicantType)}, but the list is open-ended ("other"), so this must be confirmed with the funder.`, {
      field: allowed,
      blocking: true,
      question: {
        id: 'confirm_applicant_type_with_funder',
        text: `Have you confirmed with the funder that a ${humanType(profile.applicantType)} may apply?`,
        why: 'The published applicant list is open-ended, so it neither includes nor excludes you.',
        field: 'answeredQuestions',
        kind: 'boolean',
      },
    });
  }
  return check('applicant_type', label, RESULT.FAIL, `This opportunity is limited to ${allowed.value.map(humanType).join(', ')}, and you are applying as ${humanType(profile.applicantType)}.`, { field: allowed, blocking: true });
}

function nonprofitCheck(requirements, profile) {
  const required = requirements.requires501c3;
  const label = '501(c)(3) status';
  if (valueOf(required) !== true) {
    return check('nonprofit_501c3', label, RESULT.NOT_STATED, 'No 501(c)(3) requirement was found in the sources we could read.', { field: required, blocking: true });
  }
  if (profile.is501c3 === true || profile.organizationStatus === 'nonprofit_501c3') {
    return check('nonprofit_501c3', label, RESULT.PASS, 'You have confirmed 501(c)(3) status and the funder requires it.', { field: required, blocking: true });
  }
  if (profile.organizationStatus === 'fiscal_sponsor') {
    return check('nonprofit_501c3', label, RESULT.UNKNOWN_APPLICANT, 'The funder requires 501(c)(3) status. You are fiscally sponsored, which many funders accept and some do not — this must be confirmed with the funder.', {
      field: required,
      blocking: true,
      question: {
        id: 'fiscal_sponsor_accepted',
        text: 'Does this funder accept applications through a fiscal sponsor?',
        why: 'The funder requires 501(c)(3) status and you are applying under a sponsor\'s status.',
        field: 'answeredQuestions',
        kind: 'boolean',
      },
    });
  }
  if (profile.is501c3 === false || ['none', 'unincorporated_group', 'for_profit'].includes(profile.organizationStatus)) {
    return check('nonprofit_501c3', label, RESULT.FAIL, 'The funder requires a registered 501(c)(3), and your profile indicates you do not have that status.', { field: required, blocking: true });
  }
  return check('nonprofit_501c3', label, RESULT.UNKNOWN_APPLICANT, 'The funder requires 501(c)(3) status and we do not know whether you have it.', {
    field: required,
    blocking: true,
    question: {
      id: 'is501c3',
      text: 'Is your organization a registered 501(c)(3)?',
      why: 'This funder only accepts applications from 501(c)(3) organizations.',
      field: 'is501c3',
      kind: 'boolean',
    },
  });
}

function individualsCheck(requirements, profile) {
  const allowed = requirements.individualsEligible;
  const label = 'Individuals may apply';
  const applyingAsPerson = PERSON_TYPES.has(profile.applicantType) ||
    profile.organizationStatus === 'none' ||
    profile.organizationStatus === 'unincorporated_group';
  if (!applyingAsPerson) return check('individuals_allowed', label, RESULT.NOT_APPLICABLE, 'You are applying as an organization, so rules about individual applicants do not apply.', { field: allowed });
  if (valueOf(allowed) === false) {
    return check('individuals_allowed', label, RESULT.FAIL, 'The funder states it does not make grants to individuals, and you are applying as an individual.', { field: allowed, blocking: true });
  }
  if (valueOf(allowed) === true) {
    return check('individuals_allowed', label, RESULT.PASS, 'The funder states individuals may apply.', { field: allowed, blocking: true });
  }
  return check('individuals_allowed', label, RESULT.NOT_STATED, 'The sources we read do not say whether individuals may apply. Most funders that omit this do require an organization, so treat this as a real risk.', { field: allowed, blocking: true });
}

function organizationCheck(requirements, profile) {
  const required = requirements.requiresOrganization;
  const label = 'Registered organization required';
  if (valueOf(required) !== true) {
    return check('organization_required', label, RESULT.NOT_STATED, 'No requirement to be a registered organization was found.', { field: required, blocking: false });
  }
  if (ORG_TYPES.has(profile.applicantType) && profile.organizationStatus && !['none', 'unincorporated_group'].includes(profile.organizationStatus)) {
    return check('organization_required', label, RESULT.PASS, 'The funder requires a registered organization and you have one.', { field: required, blocking: true });
  }
  if (PERSON_TYPES.has(profile.applicantType) || ['none', 'unincorporated_group'].includes(profile.organizationStatus)) {
    return check('organization_required', label, RESULT.FAIL, 'The funder requires a legally registered organization, and your profile indicates you are applying without one.', { field: required, blocking: true });
  }
  return check('organization_required', label, RESULT.UNKNOWN_APPLICANT, 'The funder requires a registered organization and we do not know your organization\'s legal status.', {
    field: required,
    blocking: true,
    question: {
      id: 'organizationStatus',
      text: 'What is your organization\'s legal status?',
      why: 'This funder requires applicants to be a legally registered organization.',
      field: 'organizationStatus',
      kind: 'choice',
    },
  });
}

function ageChecks(requirements, profile) {
  const results = [];
  const minAge = requirements.minAge;
  const maxAge = requirements.maxAge;
  const ageQuestion = {
    id: 'age',
    text: 'How old are you?',
    why: 'This funder sets an age requirement.',
    field: 'age',
    kind: 'number',
  };

  if (isVerified(minAge)) {
    if (profile.age === null) {
      results.push(check('age_min', 'Minimum age', RESULT.UNKNOWN_APPLICANT, `The funder requires applicants to be at least ${minAge.value}, and we do not know your age.`, { field: minAge, blocking: true, question: ageQuestion }));
    } else if (profile.age < minAge.value) {
      results.push(check('age_min', 'Minimum age', RESULT.FAIL, `The funder requires applicants to be at least ${minAge.value}; you are ${profile.age}.`, { field: minAge, blocking: true }));
    } else {
      results.push(check('age_min', 'Minimum age', RESULT.PASS, `You are ${profile.age}, meeting the minimum age of ${minAge.value}.`, { field: minAge, blocking: true }));
    }
  }

  if (isVerified(maxAge)) {
    if (profile.age === null) {
      results.push(check('age_max', 'Maximum age', RESULT.UNKNOWN_APPLICANT, `The funder sets a maximum age of ${maxAge.value}, and we do not know your age.`, { field: maxAge, blocking: true, question: ageQuestion }));
    } else if (profile.age > maxAge.value) {
      results.push(check('age_max', 'Maximum age', RESULT.FAIL, `The funder sets a maximum age of ${maxAge.value}; you are ${profile.age}.`, { field: maxAge, blocking: true }));
    } else {
      results.push(check('age_max', 'Maximum age', RESULT.PASS, `You are ${profile.age}, within the maximum age of ${maxAge.value}.`, { field: maxAge, blocking: true }));
    }
  }

  if (results.length === 0) {
    results.push(check('age', 'Age requirement', RESULT.NOT_STATED, 'No age requirement was found in the sources we could read.', { field: minAge, blocking: false }));
  }
  return results;
}

function geographyCheck(requirements, profile) {
  const restricted = requirements.restrictedStates;
  const label = 'Geographic eligibility';
  if (!isVerified(restricted) || !Array.isArray(restricted.value) || restricted.value.length === 0) {
    return check('geography', label, RESULT.NOT_STATED, 'No geographic restriction was found in the sources we could read.', { field: restricted, blocking: true });
  }
  if (!profile.state) {
    return check('geography', label, RESULT.UNKNOWN_APPLICANT, `The funder restricts applicants to ${restricted.value.map(stateName).join(', ')}, and we do not know where you are located.`, {
      field: restricted,
      blocking: true,
      question: {
        id: 'state',
        text: 'Which state are you located in?',
        why: 'This funder only accepts applicants from specific states.',
        field: 'state',
        kind: 'state',
      },
    });
  }
  const servesUser = restricted.value.includes(profile.state) ||
    (profile.locationServed || []).some((location) => restricted.value.includes(location));
  if (servesUser) {
    return check('geography', label, RESULT.PASS, `The funder gives in ${restricted.value.map(stateName).join(', ')}, and you are in ${stateName(profile.state)}.`, { field: restricted, blocking: true });
  }
  return check('geography', label, RESULT.FAIL, `The funder only supports applicants in ${restricted.value.map(stateName).join(', ')}; you are in ${stateName(profile.state) || profile.state}.`, { field: restricted, blocking: true });
}

function citizenshipCheck(requirements, profile) {
  const requirement = requirements.citizenshipRequirement;
  const label = 'Citizenship or residency';
  if (!isVerified(requirement)) {
    return check('citizenship', label, RESULT.NOT_STATED, 'No citizenship or residency requirement was found.', { field: requirement, blocking: false });
  }
  if (!profile.citizenship) {
    return check('citizenship', label, RESULT.UNKNOWN_APPLICANT, 'The funder states a citizenship or residency requirement and we do not know your status.', {
      field: requirement,
      blocking: true,
      question: {
        id: 'citizenship',
        text: 'What is your citizenship or residency status?',
        why: 'This funder states a citizenship or residency requirement.',
        field: 'citizenship',
        kind: 'text',
      },
    });
  }
  const text = String(requirement.value).toLowerCase();
  const status = profile.citizenship.toLowerCase();
  const wantsUs = /\b(?:u\.?s\.?|united states)\s+citizens?\b/.test(text);
  const acceptsPr = /permanent resident|green card|lawful permanent/.test(text);
  const isUsCitizen = /citizen/.test(status) && !/non-?citizen/.test(status);
  const isPr = /permanent resident|green card/.test(status);
  if (wantsUs && isUsCitizen) return check('citizenship', label, RESULT.PASS, 'You meet the stated citizenship requirement.', { field: requirement, blocking: true });
  if (wantsUs && isPr && acceptsPr) return check('citizenship', label, RESULT.PASS, 'The funder accepts permanent residents and you are one.', { field: requirement, blocking: true });
  if (wantsUs && !isUsCitizen && !(isPr && acceptsPr)) {
    return check('citizenship', label, RESULT.FAIL, `The funder requires U.S. citizenship${acceptsPr ? ' or permanent residency' : ''}, and your stated status is "${profile.citizenship}".`, { field: requirement, blocking: true });
  }
  return check('citizenship', label, RESULT.UNKNOWN_APPLICANT, 'The funder states a citizenship or residency requirement whose wording we could not match against your status with confidence.', {
    field: requirement,
    blocking: true,
    question: {
      id: 'citizenship_confirm',
      text: `Does your status satisfy this requirement: "${String(requirement.value).slice(0, 160)}"?`,
      why: 'We could not automatically match the funder\'s wording to your status.',
      field: 'answeredQuestions',
      kind: 'boolean',
    },
  });
}

function educationCheck(requirements, profile) {
  const requirement = requirements.educationLevelRequirement;
  const label = 'Enrollment or education level';
  if (!isVerified(requirement)) {
    return check('education_level', label, RESULT.NOT_STATED, 'No enrollment or education-level requirement was found.', { field: requirement, blocking: false });
  }
  if (!profile.educationLevel) {
    return check('education_level', label, RESULT.UNKNOWN_APPLICANT, 'The funder states an enrollment requirement and we do not know your education level.', {
      field: requirement,
      blocking: true,
      question: {
        id: 'educationLevel',
        text: 'What is your current education level or enrollment status?',
        why: 'This funder restricts applicants by enrollment or education level.',
        field: 'educationLevel',
        kind: 'choice',
      },
    });
  }
  const text = String(requirement.value).toLowerCase();
  const level = profile.educationLevel;
  const mentions = {
    high_school: /high school/,
    undergraduate: /undergraduate|bachelor/,
    graduate: /graduate|master/,
    doctoral: /doctoral|phd|postdoc/,
    middle_school: /middle school/,
    elementary: /elementary/,
  };
  const named = Object.entries(mentions).filter(([, pattern]) => pattern.test(text)).map(([key]) => key);
  if (named.length === 0) {
    return check('education_level', label, RESULT.UNKNOWN_APPLICANT, 'The funder states an enrollment requirement we could not map to a specific level.', { field: requirement, blocking: true });
  }
  if (named.includes(level)) return check('education_level', label, RESULT.PASS, `The funder's enrollment requirement names your level (${level.replace(/_/g, ' ')}).`, { field: requirement, blocking: true });
  return check('education_level', label, RESULT.FAIL, `The funder limits applicants to ${named.map((n) => n.replace(/_/g, ' ')).join(' or ')}; your level is ${level.replace(/_/g, ' ')}.`, { field: requirement, blocking: true });
}

function deadlineCheck(context) {
  const label = 'Applications currently open';
  const deadline = context.deadline ?? null;
  const status = context.status ?? null;
  if (status && /closed|archived|expired/i.test(status)) {
    return check('open_now', label, RESULT.FAIL, `The funder marks this opportunity as ${status}.`, { blocking: true });
  }
  if (!deadline) {
    return check('open_now', label, RESULT.NOT_STATED, 'No application deadline could be verified, so we cannot confirm applications are open.', { blocking: true });
  }
  const days = daysUntil(deadline);
  if (days === null) return check('open_now', label, RESULT.NOT_STATED, 'The deadline we found could not be parsed as a date.', { blocking: true });
  if (days < 0) return check('open_now', label, RESULT.FAIL, `The application deadline (${deadline}) has passed.`, { blocking: true });
  return check('open_now', label, RESULT.PASS, `The application deadline is ${deadline}, which is ${days} day${days === 1 ? '' : 's'} away.`, { blocking: true });
}

function matchingCheck(requirements, profile) {
  const required = requirements.matchingRequired;
  const label = 'Matching funds';
  if (valueOf(required) !== true) {
    return check('matching_funds', label, RESULT.NOT_STATED, 'No matching-funds requirement was found.', { field: required, blocking: false });
  }
  const hasMatch = profile.answeredQuestions?.can_match_funds;
  if (hasMatch === true) return check('matching_funds', label, RESULT.PASS, 'You confirmed you can supply matching funds.', { field: required, blocking: false });
  if (hasMatch === false) return check('matching_funds', label, RESULT.FAIL, 'This grant requires matching funds and you indicated you cannot supply them. This is usually disqualifying — confirm with the funder.', { field: required, blocking: false });
  return check('matching_funds', label, RESULT.UNKNOWN_APPLICANT, 'This grant requires matching funds. You will need to show a matching contribution to apply.', {
    field: required,
    blocking: false,
    question: {
      id: 'can_match_funds',
      text: 'Can you supply matching funds (cash or in-kind) for this project?',
      why: 'This funder requires a match, which is a common reason applications are rejected.',
      field: 'answeredQuestions',
      kind: 'boolean',
    },
  });
}

function partnershipCheck(requirements) {
  const required = requirements.partnershipRequired;
  if (valueOf(required) !== true) {
    return check('partnership', 'Required partner organization', RESULT.NOT_STATED, 'No partnership requirement was found.', { field: required, blocking: false });
  }
  return check('partnership', 'Required partner organization', RESULT.UNKNOWN_APPLICANT, 'This grant requires applying with a partner organization.', { field: required, blocking: false });
}

function experienceCheck(requirements) {
  const required = requirements.previousExperienceRequired;
  if (valueOf(required) !== true) {
    return check('previous_experience', 'Prior experience or track record', RESULT.NOT_STATED, 'No prior-experience requirement was found.', { field: required, blocking: false });
  }
  return check('previous_experience', 'Prior experience or track record', RESULT.UNKNOWN_APPLICANT, 'This funder expects a demonstrated track record, which typically disadvantages first-time applicants.', { field: required, blocking: false });
}

export function daysUntil(dateString, now = new Date()) {
  if (!dateString) return null;
  const target = Date.parse(`${String(dateString).slice(0, 10)}T23:59:59Z`);
  if (!Number.isFinite(target)) return null;
  return Math.floor((target - now.getTime()) / 86_400_000);
}

function humanType(type) {
  return String(type || '').replace(/_/g, ' ');
}
