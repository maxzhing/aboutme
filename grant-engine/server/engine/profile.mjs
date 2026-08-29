/**
 * Applicant profile: the structured criteria every eligibility decision is made
 * against.
 *
 * A field is either a concrete answer or `null`. `null` means "we do not know",
 * and the eligibility engine treats unknowns as *uncertain*, never as passes.
 * Nothing in this module invents a value the user did not supply.
 */

export const APPLICANT_TYPES = Object.freeze([
  'individual',
  'student',
  'nonprofit',
  'school',
  'small_business',
  'startup',
  'researcher',
  'artist',
  'community_organization',
  'other',
]);

export const ORGANIZATION_STATUSES = Object.freeze([
  'none',                 // applying as a person
  'unincorporated_group', // a real group with no legal entity
  'fiscal_sponsor',       // operating under someone else's 501(c)(3)
  'nonprofit_501c3',
  'nonprofit_other',      // incorporated nonprofit without IRS determination
  'for_profit',
  'school_k12',
  'university',
  'government',
  'tribal',
]);

export const FUNDING_PURPOSES = Object.freeze([
  'program_delivery',
  'equipment',
  'operating_support',
  'capital_project',
  'research',
  'scholarship_tuition',
  'travel_conference',
  'startup_capital',
  'staff_salaries',
  'materials_supplies',
  'events',
  'training',
  'other',
]);

export const DEADLINE_PREFERENCES = Object.freeze(['asap', 'within_3_months', 'within_year', 'any']);

/** Canonical empty profile. Every key present, every value honestly unknown. */
export function emptyProfile() {
  return {
    applicantType: null,
    age: null,
    citizenship: null,          // e.g. 'US citizen', 'permanent resident', 'international'
    country: null,
    state: null,                // two-letter US code when in the US
    city: null,
    locationServed: [],
    educationLevel: null,
    fieldIndustry: [],
    projectTitle: null,
    projectDescription: null,
    fundingPurpose: [],
    fundingNeeded: null,        // number, USD
    fundingRangeMin: null,
    fundingRangeMax: null,
    organizationStatus: null,
    organizationName: null,
    organizationAgeYears: null,
    hasEin: null,
    is501c3: null,
    businessRevenue: null,
    businessEmployees: null,
    deadlinePreference: 'any',
    previousAwards: [],
    specialQualifications: [],
    demographics: {},           // only consulted for funders that legally use them
    keywords: [],
    rawDescription: null,
    /** Follow-up answers the user has given, keyed by question id. */
    answeredQuestions: {},
  };
}

export const US_STATES = Object.freeze({
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky',
  LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', PR: 'Puerto Rico', RI: 'Rhode Island',
  SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
});

const STATE_BY_NAME = new Map(Object.entries(US_STATES).map(([code, name]) => [name.toLowerCase(), code]));

export function normalizeState(input) {
  if (!input) return null;
  const text = String(input).trim();
  if (/^[A-Za-z]{2}$/.test(text) && US_STATES[text.toUpperCase()]) return text.toUpperCase();
  return STATE_BY_NAME.get(text.toLowerCase()) || null;
}

export function stateName(code) {
  return US_STATES[code] || null;
}

/** Parse "$5,000", "5k", "$1.2 million", "5000 dollars" into a number. */
export function parseMoney(text) {
  if (typeof text === 'number' && Number.isFinite(text)) return text;
  if (!text) return null;
  const match = /\$?\s*([\d,]+(?:\.\d+)?)\s*(k\b|thousand|m\b|mm\b|million|billion)?/i.exec(String(text));
  if (!match) return null;
  const base = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(base)) return null;
  const unit = (match[2] || '').toLowerCase();
  if (unit.startsWith('k') || unit === 'thousand') return base * 1_000;
  if (unit.startsWith('m')) return base * 1_000_000;
  if (unit === 'billion') return base * 1_000_000_000;
  return base;
}

const APPLICANT_TYPE_CUES = [
  ['student', /\b(?:high school|middle school|elementary|college|undergrad(?:uate)?|grad(?:uate)? student|phd student|k-?12 student|student|senior in high school|freshman|sophomore|junior)\b/i],
  ['researcher', /\b(?:researcher|research scientist|principal investigator|\bPI\b|postdoc|faculty|professor|lab)\b/i],
  ['artist', /\b(?:artist|musician|filmmaker|painter|sculptor|writer|poet|dancer|composer|photographer|creative practice)\b/i],
  ['nonprofit', /\b(?:nonprofit|non-profit|501\(?c\)?\(?3\)?|charity|charitable organization|ngo)\b/i],
  ['school', /\b(?:school district|public school|charter school|our school|high school teacher|classroom|pta|elementary school)\b/i],
  ['startup', /\b(?:startup|start-up|pre-seed|seed stage|founder of a|early-stage company)\b/i],
  ['small_business', /\b(?:small business|my business|llc|s-corp|sole proprietor|shop|restaurant|store|company i own)\b/i],
  ['community_organization', /\b(?:community (?:group|organization|coalition)|neighborhood association|grassroots|mutual aid|volunteer group|club)\b/i],
  ['individual', /\b(?:i am an individual|as an individual|myself|independent)\b/i],
];

const EDUCATION_CUES = [
  ['high_school', /\b(?:high school|9th|10th|11th|12th grade|sophomore|junior|senior in high school)\b/i],
  ['middle_school', /\b(?:middle school|6th|7th|8th grade|junior high)\b/i],
  ['elementary', /\b(?:elementary school|grade school|primary school)\b/i],
  ['undergraduate', /\b(?:undergrad(?:uate)?|bachelor|college student|university student|freshman in college)\b/i],
  ['graduate', /\b(?:master'?s|mba|graduate student|grad school)\b/i],
  ['doctoral', /\b(?:phd|doctoral|doctorate|post-?doc)\b/i],
];

const PURPOSE_CUES = [
  ['program_delivery', /\b(?:program|outreach|workshop|curriculum|after-?school|camp|classes|tutoring|services)\b/i],
  ['equipment', /\b(?:equipment|hardware|laptops|computers|kits|instruments|tools|robots|3d printer|supplies and equipment)\b/i],
  ['operating_support', /\b(?:operating (?:support|costs)|general operating|overhead|keep the lights on|unrestricted)\b/i],
  ['capital_project', /\b(?:building|renovation|construction|facility|capital)\b/i],
  ['research', /\b(?:research|study|experiment|data collection|clinical trial|investigation)\b/i],
  ['scholarship_tuition', /\b(?:scholarship|tuition|my education|pay for (?:college|school)|fellowship)\b/i],
  ['travel_conference', /\b(?:travel|conference|competition trip|symposium|attend)\b/i],
  ['startup_capital', /\b(?:start(?:up)? capital|launch my business|seed funding|working capital|inventory)\b/i],
  ['staff_salaries', /\b(?:salary|salaries|hire|staff|stipend|instructor pay|personnel)\b/i],
  ['materials_supplies', /\b(?:materials|supplies|books|art supplies)\b/i],
  ['events', /\b(?:event|festival|showcase|exhibition|performance|hackathon|competition we)\b/i],
  ['training', /\b(?:training|professional development|certification|bootcamp)\b/i],
];

const INDUSTRY_CUES = [
  ['stem_education', /\b(?:stem|steam|robotics|coding|computer science|engineering education|science education)\b/i],
  ['education', /\b(?:education|teaching|students|classroom|literacy|school)\b/i],
  ['technology', /\b(?:technology|software|ai|machine learning|app|platform|hardware)\b/i],
  ['health', /\b(?:health|medical|mental health|clinic|patients|wellness|nutrition)\b/i],
  ['arts_culture', /\b(?:arts|culture|music|theater|film|dance|museum|gallery)\b/i],
  ['environment', /\b(?:environment|climate|conservation|sustainability|recycling|garden|clean energy)\b/i],
  ['community_development', /\b(?:community development|housing|neighborhood|revitalization|food (?:bank|security))\b/i],
  ['social_services', /\b(?:homeless|foster|refugee|domestic violence|senior|disabilit)\b/i],
  ['agriculture', /\b(?:farm|agricultur|ranch|crop|livestock)\b/i],
  ['manufacturing', /\b(?:manufactur|fabrication|production line)\b/i],
];

const STOPWORDS = new Set(
  ('a an the and or but for to of in on at by with from is am are be been being i we my our me us it its this that these those want need '
    + 'about into over under out up down more most some any all can could would should will just very really like get got make making start '
    + 'starting help helping about would like interested funding fund grant grants money need needed about approximately around').split(/\s+/),
);

/**
 * Rule-based extraction from a free-text description.
 *
 * This runs on every request, with or without a language model. When a model is
 * available its structured reading is merged on top (see ai/interpret.mjs), but
 * only for fields the rules did not already resolve from explicit text.
 */
export function parseDescription(text, base = emptyProfile()) {
  const profile = { ...base, rawDescription: text || base.rawDescription || null };
  if (!text || typeof text !== 'string') return profile;
  const lower = text.toLowerCase();

  if (!profile.applicantType) {
    for (const [type, pattern] of APPLICANT_TYPE_CUES) {
      if (pattern.test(text)) {
        profile.applicantType = type;
        break;
      }
    }
  }

  if (!profile.educationLevel) {
    for (const [level, pattern] of EDUCATION_CUES) {
      if (pattern.test(text)) {
        profile.educationLevel = level;
        break;
      }
    }
  }

  if (profile.age === null) {
    const ageMatch =
      /\b(?:i(?:'m| am)|aged?)\s+(\d{1,2})\b(?!\s*(?:%|percent|students|kids|children|years? of experience))/i.exec(text) ||
      /\b(\d{1,2})[- ]years?[- ]old\b/i.exec(text);
    if (ageMatch) {
      const age = Number(ageMatch[1]);
      if (age >= 5 && age <= 110) profile.age = age;
    }
  }

  if (!profile.state) {
    for (const [code, name] of Object.entries(US_STATES)) {
      if (new RegExp(`\\b${name}\\b`, 'i').test(text)) {
        profile.state = code;
        break;
      }
    }
    if (!profile.state) {
      const codeMatch = /\bin\s+([A-Z]{2})\b/.exec(text);
      if (codeMatch && US_STATES[codeMatch[1]]) profile.state = codeMatch[1];
    }
  }
  if (profile.state && !profile.country) profile.country = 'US';

  if (profile.fundingNeeded === null) {
    // People write ranges as "$10k-$25k", "$10,000 to $25,000" and
    // "between $10,000 and $25,000"; all three mean the same thing. The
    // second dollar sign is required so "$5,000 and a mentor" is not a range.
    const rangeMatch = /\$\s*([\d,.]+\s*(?:k|thousand|m|million)?)\s*(?:-|\u2013|\u2014|to|and)\s*\$\s*([\d,.]+\s*(?:k|thousand|m|million)?)/i.exec(text);
    if (rangeMatch) {
      profile.fundingRangeMin = parseMoney(rangeMatch[1]);
      profile.fundingRangeMax = parseMoney(rangeMatch[2]);
      profile.fundingNeeded = profile.fundingRangeMax;
    } else {
      const amountMatch = /(\$\s*[\d,.]+\s*(?:k\b|thousand|m\b|million)?)|(\b[\d,.]+\s*(?:k\b|thousand|million)\s*(?:dollars)?)/i.exec(text);
      if (amountMatch) profile.fundingNeeded = parseMoney(amountMatch[0]);
    }
  }

  if (/\b501\(?c\)?\(?3\)?\b/i.test(text)) {
    profile.is501c3 = true;
    if (!profile.organizationStatus) profile.organizationStatus = 'nonprofit_501c3';
  }
  if (/\b(?:not a 501|no nonprofit status|not incorporated|we are not a nonprofit)\b/i.test(lower)) {
    profile.is501c3 = false;
  }
  if (/\bfiscal(?:ly)? sponsor(?:ed|ship)?\b/i.test(text) && !profile.organizationStatus) {
    profile.organizationStatus = 'fiscal_sponsor';
  }

  for (const [purpose, pattern] of PURPOSE_CUES) {
    if (pattern.test(text) && !profile.fundingPurpose.includes(purpose)) profile.fundingPurpose.push(purpose);
  }
  for (const [industry, pattern] of INDUSTRY_CUES) {
    if (pattern.test(text) && !profile.fieldIndustry.includes(industry)) profile.fieldIndustry.push(industry);
  }

  if (/\b(?:urgent|asap|as soon as possible|right away|immediately)\b/i.test(text)) profile.deadlinePreference = 'asap';

  if (!profile.projectDescription) profile.projectDescription = text.trim();
  profile.keywords = mergeUnique(profile.keywords, extractKeywords(text));

  return profile;
}

/** Content-bearing terms, longest first, used to seed search strategies. */
export function extractKeywords(text, limit = 14) {
  if (!text) return [];
  const words = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word) && !/^\d+$/.test(word));

  const counts = new Map();
  for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);

  // Bigrams often carry the real topic ("stem outreach", "youth robotics").
  for (let i = 0; i < words.length - 1; i += 1) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    counts.set(bigram, (counts.get(bigram) || 0) + 1.5);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([term]) => term);
}

export function mergeUnique(existing, additions) {
  const output = [...(existing || [])];
  for (const item of additions || []) if (item && !output.includes(item)) output.push(item);
  return output;
}

/** Coerce arbitrary client input into a valid profile without inventing values. */
export function normalizeProfile(input = {}) {
  const profile = emptyProfile();
  const assign = (key, value) => {
    if (value === undefined || value === null || value === '') return;
    profile[key] = value;
  };

  assign('applicantType', APPLICANT_TYPES.includes(input.applicantType) ? input.applicantType : null);
  const age = Number(input.age);
  if (Number.isFinite(age) && age > 0 && age < 120) profile.age = Math.floor(age);
  assign('citizenship', typeof input.citizenship === 'string' ? input.citizenship.trim() : null);
  assign('country', typeof input.country === 'string' ? input.country.trim().toUpperCase().slice(0, 40) : null);
  profile.state = normalizeState(input.state);
  assign('city', typeof input.city === 'string' ? input.city.trim() : null);
  profile.locationServed = toStringArray(input.locationServed);
  assign('educationLevel', typeof input.educationLevel === 'string' ? input.educationLevel : null);
  profile.fieldIndustry = toStringArray(input.fieldIndustry);
  assign('projectTitle', typeof input.projectTitle === 'string' ? input.projectTitle.trim() : null);
  assign('projectDescription', typeof input.projectDescription === 'string' ? input.projectDescription.trim() : null);
  profile.fundingPurpose = toStringArray(input.fundingPurpose).filter((p) => FUNDING_PURPOSES.includes(p));
  profile.fundingNeeded = parseMoney(input.fundingNeeded);
  profile.fundingRangeMin = parseMoney(input.fundingRangeMin);
  profile.fundingRangeMax = parseMoney(input.fundingRangeMax);
  assign('organizationStatus', ORGANIZATION_STATUSES.includes(input.organizationStatus) ? input.organizationStatus : null);
  assign('organizationName', typeof input.organizationName === 'string' ? input.organizationName.trim() : null);
  const orgAge = Number(input.organizationAgeYears);
  if (Number.isFinite(orgAge) && orgAge >= 0) profile.organizationAgeYears = orgAge;
  if (typeof input.hasEin === 'boolean') profile.hasEin = input.hasEin;
  if (typeof input.is501c3 === 'boolean') profile.is501c3 = input.is501c3;
  if (profile.organizationStatus === 'nonprofit_501c3') profile.is501c3 = true;
  profile.businessRevenue = parseMoney(input.businessRevenue);
  const employees = Number(input.businessEmployees);
  if (Number.isFinite(employees) && employees >= 0) profile.businessEmployees = employees;
  if (DEADLINE_PREFERENCES.includes(input.deadlinePreference)) profile.deadlinePreference = input.deadlinePreference;
  profile.previousAwards = toStringArray(input.previousAwards);
  profile.specialQualifications = toStringArray(input.specialQualifications);
  if (input.demographics && typeof input.demographics === 'object' && !Array.isArray(input.demographics)) {
    profile.demographics = { ...input.demographics };
  }
  profile.keywords = toStringArray(input.keywords);
  if (input.answeredQuestions && typeof input.answeredQuestions === 'object') {
    profile.answeredQuestions = { ...input.answeredQuestions };
  }
  assign('rawDescription', typeof input.rawDescription === 'string' ? input.rawDescription : null);

  const narrative = profile.rawDescription || profile.projectDescription;
  return narrative ? parseDescription(narrative, profile) : profile;
}

function toStringArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.split(/[,;\n]/).map((v) => v.trim()).filter(Boolean);
  return [];
}

/** Which profile fields are still unknown, so the UI can ask for the useful ones. */
export function missingProfileFields(profile) {
  const missing = [];
  const check = (key, label) => {
    const value = profile[key];
    const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty) missing.push({ key, label });
  };
  check('applicantType', 'Applicant type');
  check('state', 'State or region');
  check('projectDescription', 'Project description');
  check('fundingNeeded', 'Amount of funding needed');
  check('fundingPurpose', 'What the funding is for');
  if (['nonprofit', 'community_organization', 'school'].includes(profile.applicantType) && profile.is501c3 === null) {
    missing.push({ key: 'is501c3', label: '501(c)(3) status' });
  }
  if (['student', 'individual'].includes(profile.applicantType) && profile.age === null) {
    missing.push({ key: 'age', label: 'Age' });
  }
  return missing;
}
