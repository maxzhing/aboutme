/**
 * Requirement inference: turn a funder's own prose into structured, citable
 * eligibility rules.
 *
 * Every rule this produces carries the sentence it came from, taken verbatim out
 * of text we downloaded ourselves. That means the rules survive quote-grounding
 * by construction, and the user can always see the exact words behind a
 * "NOT ELIGIBLE".
 *
 * The module is deliberately conservative. A rule is asserted only when the text
 * states it plainly; ambiguity produces no rule, which downstream becomes
 * "uncertain" rather than a pass or a fail.
 */

import { quoteField, unknownField } from '../lib/evidence.mjs';
import { US_STATES, normalizeState } from './profile.mjs';

/** Split into sentences while keeping list bullets as their own units. */
export function toSentences(text) {
  if (!text) return [];
  return String(text)
    .split(/\n+|(?<=[.!?;])\s+(?=[A-Z0-9“"(])/)
    .map((sentence) => sentence.replace(/^[•\-*•\s]+/, '').replace(/\s+/g, ' ').trim())
    .filter((sentence) => sentence.length >= 12 && sentence.length <= 600);
}

/** Find the first sentence matching `pattern`; that sentence becomes the citation. */
function findSentence(sentences, pattern) {
  return sentences.find((sentence) => pattern.test(sentence)) || null;
}

/**
 * A rule definition: `detect` returns the value to assert when `pattern` hits.
 * `negative` patterns, when present, veto the match (e.g. "not required").
 */
const NEGATION = /\b(?:not|no longer|does not|do not|doesn't|don't|never|without|is not|are not|neither)\b/i;

/** Sentences that restrict *what kind of entity* an applicant must be. */
const REQUIRED_ENTITY = /\b(?:applicants?\s+must\s+be(?:\s+(?:an?|a))?\s+(?:affiliated with|employed by|based at|a\s+)?|only\s+(?:open\s+to|available\s+to)|open\s+only\s+to|limited\s+to|restricted\s+to|eligible\s+applicants?\s+(?:are|include))\b/i;

/** Has a requirement already been established from a stronger source? */
const isSet = (field) => field && field.value !== null && field.value !== undefined;

function assertRule(sentences, { pattern, veto, value, sourceUrl, fetchedAt }) {
  const sentence = findSentence(sentences, pattern);
  if (!sentence) return null;
  if (veto && veto.test(sentence)) return null;
  return quoteField(typeof value === 'function' ? value(sentence) : value, {
    sourceUrl,
    quote: sentence,
    fetchedAt,
  });
}

/** Grants.gov applicant-type descriptions mapped to our applicant vocabulary. */
export const APPLICANT_TYPE_SYNONYMS = [
  { types: ['individual', 'student', 'artist', 'researcher'], pattern: /\bindividuals?\b/i, personOnly: true },
  { types: ['nonprofit', 'community_organization'], pattern: /\bnonprofits?\b|\bnon-?profit\b|\b501\s*\(?c\)?\s*\(?3\)?\b|\bcharit(?:y|able|ies)\b/i, requires501c3: /\b501\s*\(?c\)?\s*\(?3\)?\b/i },
  { types: ['school'], pattern: /\b(?:school districts?|local educational agenc|k-?12|elementary and secondary|public schools?)\b/i },
  { types: ['researcher', 'school'], pattern: /\binstitutions? of higher education\b|\buniversit(?:y|ies)\b|\bcolleges?\b/i },
  { types: ['small_business', 'startup'], pattern: /\bsmall business(?:es)?\b|\bfor-?profit\b|\bcommercial (?:organizations|entities)\b/i },
  { types: ['community_organization'], pattern: /\bcommunity-based organizations?\b|\bfaith-based\b|\bgrassroots\b/i },
  { types: [], pattern: /\b(?:state governments?|county governments?|city or township governments?|special district governments?|native american tribal|public housing authorit)\b/i, governmentOnly: true },
];

/**
 * Which of our applicant types are named as eligible by a list of the funder's
 * own applicant-type strings. Returns `{allowed:Set, requires501c3, governmentOnly}`.
 */
export function interpretApplicantTypes(descriptions) {
  const allowed = new Set();
  let requires501c3 = false;
  let sawAny = false;
  let onlyGovernment = descriptions.length > 0;

  for (const description of descriptions) {
    for (const rule of APPLICANT_TYPE_SYNONYMS) {
      if (!rule.pattern.test(description)) continue;
      sawAny = true;
      if (!rule.governmentOnly) onlyGovernment = false;
      for (const type of rule.types) allowed.add(type);
      if (rule.requires501c3 && rule.requires501c3.test(description)) requires501c3 = true;
    }
    // "Others (see text field entitled Additional Information)" means the
    // structured list is incomplete -- we must not treat it as exhaustive.
    if (/\bothers?\b.*additional information|\bunrestricted\b|\bany.*(?:applicant|entity)\b/i.test(description)) {
      sawAny = true;
      onlyGovernment = false;
      return { allowed, requires501c3, exhaustive: false, governmentOnly: false };
    }
  }

  return { allowed, requires501c3, exhaustive: sawAny, governmentOnly: sawAny && onlyGovernment };
}

/** Pull an explicit minimum/maximum age out of a sentence. */
export function parseAgeBounds(sentence) {
  const bounds = { min: null, max: null };
  let match = /\b(?:at least|minimum(?: age)? of|must be|aged?)\s+(\d{1,2})\s*(?:years? old|years? of age|\+)?/i.exec(sentence);
  if (match && /\b(?:at least|minimum|older|or over|\+)\b/i.test(sentence)) bounds.min = Number(match[1]);
  match = /\b(\d{1,2})\s*(?:years? of age or older|years? or older|and older|\+)\b/i.exec(sentence);
  if (match) bounds.min = Math.max(bounds.min ?? 0, Number(match[1]));
  match = /\bages?\s+(\d{1,2})\s*(?:-|–|to|through)\s*(\d{1,2})\b/i.exec(sentence);
  if (match) {
    bounds.min = Number(match[1]);
    bounds.max = Number(match[2]);
  }
  match = /\b(?:under(?: the age of)?|younger than|no older than|up to age|maximum age of)\s+(\d{1,2})\b/i.exec(sentence);
  if (match) bounds.max = Number(match[1]) - (/\bunder\b|\byounger than\b/i.test(sentence) ? 1 : 0);
  if (bounds.min !== null && (bounds.min < 5 || bounds.min > 90)) bounds.min = null;
  if (bounds.max !== null && (bounds.max < 5 || bounds.max > 110)) bounds.max = null;
  return bounds;
}

/** US states named as a restriction in a sentence. */
export function parseStates(sentence) {
  const found = new Set();
  for (const [code, name] of Object.entries(US_STATES)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(sentence)) found.add(code);
  }
  return [...found];
}

const GEO_RESTRICTION = /\b(?:must (?:be located|reside|live)|located in|residents? of|serving|based in|limited to|only (?:available )?(?:to|in)|within the (?:state|city|county) of|applicants? (?:must be )?from)\b/i;

/**
 * Infer the full requirement set from all text we hold for a grant.
 *
 * `documents` = [{text, sourceUrl, fetchedAt}] -- typically the funder's
 * eligibility page plus any structured description we already trust.
 * `applicantTypeDescriptions` = the funder's own applicant-type strings, if any.
 */
export function inferRequirements(documents = [], { applicantTypeDescriptions = [], structured = {} } = {}) {
  const requirements = {
    allowedApplicantTypes: unknownField('The funder does not publish a structured list of eligible applicant types'),
    applicantTypesExhaustive: unknownField(''),
    requires501c3: unknownField('No 501(c)(3) requirement was stated in the text we could read'),
    requiresOrganization: unknownField('The text does not say whether an organization is required'),
    individualsEligible: unknownField('The text does not say whether individuals may apply'),
    minAge: unknownField('No minimum age was stated'),
    maxAge: unknownField('No maximum age was stated'),
    restrictedStates: unknownField('No geographic restriction was stated in the text we could read'),
    citizenshipRequirement: unknownField('No citizenship or residency requirement was stated'),
    educationLevelRequirement: unknownField('No education-level requirement was stated'),
    matchingRequired: unknownField('The text does not say whether matching funds are required'),
    partnershipRequired: unknownField('The text does not say whether a partner organization is required'),
    previousExperienceRequired: unknownField('The text does not say whether prior experience is required'),
    isLoan: unknownField(''),
    isContest: unknownField(''),
  };

  // Structured applicant types (from an official API) are the strongest signal.
  if (applicantTypeDescriptions.length) {
    const interpreted = interpretApplicantTypes(applicantTypeDescriptions);
    const source = structured.sourceUrl || null;
    const stamp = structured.fetchedAt || new Date().toISOString();
    requirements.allowedApplicantTypes = {
      value: [...interpreted.allowed],
      provenance: 'derived',
      verified: true,
      sourceUrl: source,
      fetchedAt: stamp,
      quote: applicantTypeDescriptions.join('; '),
      derivedFrom: ['applicantTypes'],
      rule: 'Mapped the funder\'s own applicant-type labels onto applicant categories',
    };
    requirements.applicantTypesExhaustive = {
      value: interpreted.exhaustive,
      provenance: 'derived',
      verified: true,
      sourceUrl: source,
      fetchedAt: stamp,
      quote: null,
      derivedFrom: ['applicantTypes'],
      rule: interpreted.exhaustive
        ? 'The funder publishes a closed list of eligible applicant types'
        : 'The funder\'s list includes an open "other" category, so it is not exhaustive',
    };
    if (interpreted.requires501c3) {
      requirements.requires501c3 = {
        value: true,
        provenance: 'derived',
        verified: true,
        sourceUrl: source,
        fetchedAt: stamp,
        quote: applicantTypeDescriptions.find((d) => /501/.test(d)) || null,
        derivedFrom: ['applicantTypes'],
        rule: 'The funder\'s eligible-applicant list names 501(c)(3) status',
      };
    }
    if (interpreted.exhaustive) {
      requirements.individualsEligible = {
        value: interpreted.allowed.has('individual'),
        provenance: 'derived',
        verified: true,
        sourceUrl: source,
        fetchedAt: stamp,
        quote: applicantTypeDescriptions.join('; '),
        derivedFrom: ['applicantTypes'],
        rule: 'Individuals are eligible only if the funder\'s closed applicant list names them',
      };
    }
  }

  for (const document of documents) {
    const sentences = toSentences(document.text);
    if (!sentences.length) continue;
    const context = { sourceUrl: document.sourceUrl, fetchedAt: document.fetchedAt };
    const set = (key, field) => {
      if (field && (requirements[key].verified !== true || requirements[key].value === null)) requirements[key] = field;
    };

    set('requires501c3', assertRule(sentences, {
      ...context,
      pattern: /\b501\s*\(?c\)?\s*\(?3\)?\b/i,
      veto: /\b(?:do not need|not required to be|need not be|without 501|fiscal sponsor(?:ship)? (?:is )?(?:accepted|permitted|allowed))\b/i,
      value: true,
    }));

    set('individualsEligible', assertRule(sentences, {
      ...context,
      pattern: /\b(?:individuals?|persons?)\s+(?:are\s+)?(?:not\s+eligible|ineligible)\b|\bdo(?:es)? not (?:fund|make grants to|award grants to|accept applications from) individuals?\b|\bno grants (?:are made )?to individuals?\b|\borganizations? only\b/i,
      value: false,
    }));
    set('individualsEligible', assertRule(sentences, {
      ...context,
      pattern: /\b(?:individuals?|individual applicants?)\s+(?:are|may be)\s+eligible\b|\bopen to individuals?\b|\bindividuals? may apply\b/i,
      veto: NEGATION,
      value: true,
    }));

    // "Applicants must be a public school, charter school or school district" and
    // "must be affiliated with an accredited institution of higher education" are
    // hard applicant-type limits. Without this rule nothing catches them, and an
    // applicant of the wrong kind sails through every other check.
    if (!isSet(requirements.allowedApplicantTypes)) {
      const entitySentence = findSentence(sentences, REQUIRED_ENTITY);
      if (entitySentence) {
        const interpreted = interpretApplicantTypes([entitySentence]);
        if (interpreted.allowed.size > 0) {
          requirements.allowedApplicantTypes = quoteField([...interpreted.allowed], { ...context, quote: entitySentence });
          requirements.applicantTypesExhaustive = quoteField(true, { ...context, quote: entitySentence });
          if (interpreted.requires501c3) {
            set('requires501c3', quoteField(true, { ...context, quote: entitySentence }));
          }
        }
      }
    }

    set('requiresOrganization', assertRule(sentences, {
      ...context,
      pattern: /\b(?:applicants? must be (?:an? )?(?:incorporated|registered|established)|must be a (?:registered|legally recognized|incorporated) (?:organization|entity|nonprofit|business)|only (?:registered|incorporated) (?:organizations|entities) (?:may|can) apply)\b/i,
      value: true,
    }));

    const ageSentence = findSentence(sentences, /\b(?:age|aged|years old|years of age|18\+|under \d{1,2})\b/i);
    if (ageSentence) {
      const bounds = parseAgeBounds(ageSentence);
      if (bounds.min !== null) set('minAge', quoteField(bounds.min, { ...context, quote: ageSentence }));
      if (bounds.max !== null) set('maxAge', quoteField(bounds.max, { ...context, quote: ageSentence }));
    }

    const geoSentence = findSentence(sentences, GEO_RESTRICTION);
    if (geoSentence) {
      const states = parseStates(geoSentence);
      if (states.length) set('restrictedStates', quoteField(states, { ...context, quote: geoSentence }));
    }

    set('citizenshipRequirement', assertRule(sentences, {
      ...context,
      pattern: /\b(?:u\.?s\.?|united states) citizens?\b|\bpermanent residents?\b|\bcitizenship\b|\blegally authorized to work\b/i,
      value: (sentence) => sentence.replace(/\s+/g, ' ').trim(),
    }));

    set('educationLevelRequirement', assertRule(sentences, {
      ...context,
      pattern: /\b(?:must be (?:a |an )?(?:currently )?enrolled|enrolled (?:full-?time|in an accredited)|high school (?:senior|student)s? (?:only|are eligible)|undergraduate students? (?:only|are eligible)|graduate students? (?:only|are eligible))\b/i,
      value: (sentence) => sentence,
    }));

    set('matchingRequired', assertRule(sentences, {
      ...context,
      pattern: /\b(?:matching funds?|cost[- ]shar(?:e|ing)|1:1 match|dollar-for-dollar|match(?:ing)? requirement)\b/i,
      veto: /\bno (?:matching|cost[- ]shar)|not required|is not a requirement|match is not\b/i,
      value: true,
    }));

    set('partnershipRequired', assertRule(sentences, {
      ...context,
      pattern: /\bmust (?:partner|collaborate|apply jointly) with\b|\bin partnership with (?:a|an|at least)\b|\brequires? a (?:partner|collaborating) organization\b/i,
      value: true,
    }));

    set('previousExperienceRequired', assertRule(sentences, {
      ...context,
      pattern: /\bmust have (?:at least )?\d+\s+years? of\b|\bdemonstrated track record\b|\bpreviously received funding\b|\bmust have prior experience\b|\bestablished organizations? (?:only|with)\b/i,
      value: true,
    }));

    set('isLoan', assertRule(sentences, {
      ...context,
      pattern: /\b(?:this is a loan|must be repaid|repayment (?:is required|terms)|interest rate|loan program|forgivable loan)\b/i,
      veto: /\bdoes not (?:have to )?(?:be repaid|require repayment)\b|\bno repayment\b|\bnot a loan\b/i,
      value: true,
    }));

    set('isContest', assertRule(sentences, {
      ...context,
      pattern: /\b(?:contest|competition|sweepstakes|prize (?:will be|is) awarded|pitch competition|judges will select the winner)\b/i,
      value: true,
    }));
  }

  return requirements;
}

export { normalizeState };
