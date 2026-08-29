/**
 * Concept expansion: translate how an applicant describes their work into the
 * vocabulary a *funder* uses for the same thing.
 *
 * Funders rarely fund "teaching coding to kids"; they fund "computer science
 * education", "digital literacy" and "STEM outreach". Searching only the user's
 * own words misses most of the money, so every strategy is seeded with expanded
 * concepts as well as the literal description.
 */

/**
 * Each entry: cues that identify the concept, and the funder-facing terms it
 * should expand into. Terms are ordered from most to least specific.
 */
export const CONCEPT_LEXICON = [
  {
    id: 'cs_education',
    cues: [/\b(?:coding|code|programming|software|computer science|cs)\b/i, /\b(?:kids|children|youth|students|teens)\b/i],
    requireAll: true,
    terms: ['computer science education', 'K-12 computing education', 'digital literacy', 'youth technology education', 'coding education', 'computational thinking'],
  },
  {
    id: 'stem_outreach',
    cues: [/\b(?:stem|steam|robotics|engineering|science fair|maker)\b/i],
    terms: ['STEM education', 'STEM outreach', 'informal science education', 'STEM equity', 'hands-on science learning', 'engineering education'],
  },
  {
    id: 'youth_development',
    cues: [/\b(?:youth|teens?|kids|children|after-?school|mentoring|young(?:er)? (?:people|students|learners))\b/i],
    terms: ['youth development', 'out-of-school time programs', 'after-school programming', 'youth mentoring', 'positive youth development'],
  },
  {
    id: 'education_equity',
    cues: [/\b(?:underserved|low-?income|underrepresented|equity|access|title i|rural students|first-?generation)\b/i],
    terms: ['educational equity', 'expanding access to education', 'closing the opportunity gap', 'underrepresented students in STEM'],
  },
  {
    id: 'arts',
    cues: [/\b(?:art|arts|music|theater|theatre|dance|film|poetry|mural|gallery|exhibition|performance)\b/i],
    terms: ['arts and culture funding', 'artist support', 'creative placemaking', 'arts education', 'individual artist grants'],
  },
  {
    id: 'environment',
    cues: [/\b(?:environment|climate|conservation|sustainab|recycling|garden|watershed|clean energy|pollution)\b/i],
    terms: ['environmental stewardship', 'climate resilience', 'conservation funding', 'environmental education', 'community greening'],
  },
  {
    id: 'health',
    cues: [/\b(?:health|mental health|nutrition|wellness|clinic|medical|disease|fitness)\b/i],
    terms: ['community health', 'public health programming', 'health equity', 'behavioral health', 'preventive health services'],
  },
  {
    id: 'food_security',
    cues: [/\b(?:food bank|hunger|food insecur|meals|pantry|nutrition assistance)\b/i],
    terms: ['food security', 'hunger relief', 'nutrition programs', 'emergency food assistance'],
  },
  {
    id: 'housing_community',
    cues: [/\b(?:housing|homeless|neighborhood|revitaliz|blight|community development)\b/i],
    terms: ['community development', 'affordable housing', 'neighborhood revitalization', 'community economic development'],
  },
  {
    id: 'small_business',
    cues: [/\b(?:small business|entrepreneur|startup|storefront|inventory|main street)\b/i],
    terms: ['small business assistance', 'entrepreneurship support', 'microenterprise funding', 'main street revitalization', 'business technical assistance'],
  },
  {
    id: 'research',
    cues: [/\b(?:research|study|experiment|laboratory|clinical|dissertation|thesis)\b/i],
    terms: ['research funding', 'investigator-initiated research', 'early career research award', 'seed research grant'],
  },
  {
    id: 'scholarship',
    cues: [/\b(?:scholarship|tuition|college fund|pay for school|undergraduate study)\b/i],
    terms: ['scholarship', 'undergraduate scholarship', 'merit scholarship', 'need-based scholarship', 'fellowship'],
  },
  {
    id: 'disability',
    cues: [/\b(?:disabilit|accessib|autism|special needs|adaptive)\b/i],
    terms: ['disability inclusion', 'accessibility programs', 'adaptive technology funding', 'special education support'],
  },
  {
    id: 'veterans',
    cues: [/\b(?:veteran|military family|service member)\b/i],
    terms: ['veteran services', 'military family support', 'veteran entrepreneurship'],
  },
  {
    id: 'literacy',
    cues: [/\b(?:literacy|reading|books|writing program|library)\b/i],
    terms: ['literacy programs', 'early literacy', 'library programming', 'adult education'],
  },
  {
    id: 'workforce',
    cues: [/\b(?:job training|workforce|apprentic|career readiness|upskill|certification)\b/i],
    terms: ['workforce development', 'job training programs', 'career and technical education', 'apprenticeship funding'],
  },
];

/**
 * Expand a free-text description into funder-facing concept terms.
 * Purely lexical -- no model, no network, fully deterministic and testable.
 */
export function expandConcepts(text, { limit = 12 } = {}) {
  if (!text) return [];
  const matched = [];
  for (const concept of CONCEPT_LEXICON) {
    const hits = concept.cues.filter((cue) => cue.test(text)).length;
    if (concept.requireAll ? hits === concept.cues.length : hits > 0) {
      matched.push({ id: concept.id, weight: hits + (concept.requireAll ? 1 : 0), terms: concept.terms });
    }
  }
  matched.sort((a, b) => b.weight - a.weight);

  const terms = [];
  // Interleave so a single broad concept cannot crowd out the others.
  for (let depth = 0; depth < 6 && terms.length < limit; depth += 1) {
    for (const concept of matched) {
      const term = concept.terms[depth];
      if (term && !terms.includes(term)) terms.push(term);
      if (terms.length >= limit) break;
    }
  }
  return terms;
}

export function matchedConceptIds(text) {
  if (!text) return [];
  return CONCEPT_LEXICON.filter((concept) => {
    const hits = concept.cues.filter((cue) => cue.test(text)).length;
    return concept.requireAll ? hits === concept.cues.length : hits > 0;
  }).map((concept) => concept.id);
}
