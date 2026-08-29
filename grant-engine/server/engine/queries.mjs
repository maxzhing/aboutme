/**
 * Search strategy generation.
 *
 * A single query finds a single slice of the funding landscape. The engine runs
 * ten *different* strategies -- literal, synonymous, sectoral, geographic,
 * applicant-shaped, philanthropic, governmental, corporate, size-matched and
 * jargon-matched -- because a funder who would fund this project may describe it
 * in none of the applicant's own words.
 */

import { expandConcepts } from './concepts.mjs';
import { stateName } from './profile.mjs';

const APPLICANT_PHRASES = {
  individual: ['grants for individuals', 'individual applicants eligible'],
  student: ['grants for students', 'student grant program', 'youth grant'],
  nonprofit: ['grants for nonprofit organizations', '501(c)(3) grant program'],
  school: ['grants for schools', 'K-12 school grant', 'classroom grant'],
  small_business: ['small business grant program', 'grants for small businesses'],
  startup: ['startup grant program', 'non-dilutive funding for startups'],
  researcher: ['research grant program', 'principal investigator funding'],
  artist: ['grants for individual artists', 'artist fellowship'],
  community_organization: ['community grant program', 'grassroots organization funding'],
  other: ['grant program'],
};

const PURPOSE_PHRASES = {
  program_delivery: 'program funding',
  equipment: 'equipment grant',
  operating_support: 'general operating support grant',
  capital_project: 'capital project grant',
  research: 'research grant',
  scholarship_tuition: 'scholarship',
  travel_conference: 'travel grant',
  startup_capital: 'startup funding grant',
  staff_salaries: 'staffing grant',
  materials_supplies: 'supplies grant',
  events: 'event sponsorship grant',
  training: 'training grant',
  other: 'grant',
};

const clean = (text) => String(text || '').replace(/\s+/g, ' ').trim();

/**
 * First-person framing ("I'm a high school student who wants...") is noise to a
 * search engine. Strip it so the query carries the project, not the narration.
 */
const FILLER_PATTERNS = [
  /\b(?:i'?m|i am|we'?re|we are|my name is)\b[^,.]*?\b(?:interested in|looking for|who|that|and)\b/gi,
  /\b(?:i|we)\s+(?:want|need|would like|am hoping|are hoping|am trying|are trying)\s+(?:funding\s+)?(?:to|for)\b/gi,
  /\b(?:i|we)\s+(?:need|want)\s+(?:about|around|approximately|roughly)?\s*\$[\d,.]+\s*(?:k|thousand|million)?/gi,
  /\band need (?:about|around|approximately)?\s*\$[\d,.]+\s*(?:k|thousand|million)?/gi,
  /\b(?:please|help me|can you|looking for grants?|i'?d like)\b/gi,
];

export function condenseDescription(text, maxChars = 120) {
  let output = String(text || '');
  for (const pattern of FILLER_PATTERNS) output = output.replace(pattern, ' ');
  output = clean(output.replace(/\$[\d,.]+\s*(?:k|thousand|million)?/gi, ' '));
  if (output.length <= maxChars) return output;
  // Trim on a word boundary so the query never ends mid-term.
  return output.slice(0, maxChars).replace(/\s+\S*$/, '');
}

function topic(profile) {
  if (profile.projectTitle) return clean(profile.projectTitle);
  const condensed = condenseDescription(profile.projectDescription || profile.rawDescription || '');
  if (condensed.length >= 12) return condensed;
  const keywords = (profile.keywords || []).filter((k) => k.includes(' ')).slice(0, 2);
  return keywords.join(' ');
}

function place(profile) {
  if (profile.state) return stateName(profile.state) || profile.state;
  if (profile.country && profile.country !== 'US') return profile.country;
  return null;
}

/**
 * Build the strategy set. Each entry explains itself so the UI can show the user
 * exactly how their project was searched for.
 */
export function buildSearchStrategies(profile, { limit = 10 } = {}) {
  const description = clean(profile.projectDescription || profile.rawDescription || '');
  const concepts = expandConcepts(description);
  const subject = topic(profile);
  const region = place(profile);
  const applicantPhrases = APPLICANT_PHRASES[profile.applicantType] || APPLICANT_PHRASES.other;
  const purpose = (profile.fundingPurpose || []).map((p) => PURPOSE_PHRASES[p]).filter(Boolean)[0] || 'grant';
  const industry = (profile.fieldIndustry || [])[0]?.replace(/_/g, ' ') || concepts[0] || subject;
  const amount = profile.fundingNeeded;

  const strategies = [
    {
      id: 'literal',
      label: 'Exact project description',
      rationale: 'Finds funders who describe this work the same way you do.',
      query: clean(`${subject} grant`).slice(0, 200),
    },
    {
      id: 'synonyms',
      label: 'Funder terminology for the same work',
      rationale: 'Funders often name this field differently than applicants do.',
      query: concepts.length ? `${concepts[0]} grant program` : `${subject} funding program`,
    },
    {
      id: 'industry',
      label: 'Field or industry funding',
      rationale: 'Sector-wide funders that support this whole category of work.',
      query: `${industry} grant funding opportunity`,
    },
    {
      id: 'geography',
      label: 'Location-specific funding',
      rationale: 'Many funders only give money inside one state, county or city.',
      query: region ? `${region} ${concepts[0] || subject} grant` : `${subject} local grant program`,
    },
    {
      id: 'applicant_type',
      label: 'Funding open to your applicant type',
      rationale: 'Filters toward funders that accept applicants shaped like you.',
      query: `${applicantPhrases[0]} ${concepts[0] || subject}`,
    },
    {
      id: 'foundation',
      label: 'Private and community foundations',
      rationale: 'Foundation money is rarely listed on government portals.',
      query: `foundation grant ${concepts[1] || concepts[0] || subject}${region ? ` ${region}` : ''}`,
    },
    {
      id: 'government',
      label: 'Government funding',
      rationale: 'Federal, state and local agency programs.',
      query: `${region ? `${region} ` : ''}government grant ${concepts[0] || subject} ${purpose}`,
    },
    {
      id: 'corporate',
      label: 'Corporate philanthropy',
      rationale: 'Company giving programs and corporate foundations.',
      query: `corporate giving program ${concepts[0] || industry} community grants`,
    },
    {
      id: 'award_size',
      label: 'Award size that fits your need',
      rationale: 'Targets programs whose typical award matches what you asked for.',
      query: amount
        ? `${concepts[0] || subject} grant ${formatAmountBand(amount)}`
        : `${concepts[0] || subject} small grant program`,
    },
    {
      id: 'jargon',
      label: 'Related funder vocabulary',
      rationale: 'Surfaces opportunities that are not obvious keyword matches.',
      query: concepts.slice(2, 5).join(' OR ') || `${subject} initiative funding`,
    },
  ];

  return strategies
    .map((strategy) => ({ ...strategy, query: clean(strategy.query) }))
    .filter((strategy) => strategy.query.length > 3)
    .slice(0, limit);
}

/** Turn a dollar need into the phrasing funders use for award sizes. */
export function formatAmountBand(amount) {
  if (!Number.isFinite(amount)) return '';
  if (amount <= 1_000) return 'micro grant under $1,000';
  if (amount <= 5_000) return 'mini grant $1,000 to $5,000';
  if (amount <= 25_000) return 'grant $5,000 to $25,000';
  if (amount <= 100_000) return 'grant $25,000 to $100,000';
  if (amount <= 500_000) return 'grant $100,000 to $500,000';
  return 'major grant over $500,000';
}

/**
 * Keyword sets for the Grants.gov API, which does its own full-text matching and
 * performs badly on long natural-language strings.
 */
export function buildFederalKeywords(profile, { limit = 6 } = {}) {
  const description = clean(profile.projectDescription || profile.rawDescription || '');
  const concepts = expandConcepts(description, { limit: 6 });
  const keywords = [];
  const push = (value) => {
    const term = clean(value);
    if (term && term.length >= 3 && !keywords.some((k) => k.toLowerCase() === term.toLowerCase())) keywords.push(term);
  };

  for (const concept of concepts.slice(0, 3)) push(concept);
  for (const industry of (profile.fieldIndustry || []).slice(0, 2)) push(industry.replace(/_/g, ' '));
  for (const keyword of (profile.keywords || []).filter((k) => k.includes(' ')).slice(0, 2)) push(keyword);
  if (keywords.length === 0) push(topic(profile));

  return keywords.slice(0, limit);
}
