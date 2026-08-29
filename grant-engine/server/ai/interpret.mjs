/**
 * Interpret an applicant's own words into structured search criteria.
 *
 * The rule-based parser in engine/profile.mjs always runs first and always wins:
 * anything it read out of explicit text is a fact the user actually typed. The
 * model is only allowed to fill fields that are still empty, and only with
 * values it can point at in the user's own words.
 */

import { jsonCall, hasLlm, LlmUnavailableError } from './llm.mjs';
import { APPLICANT_TYPES, ORGANIZATION_STATUSES, FUNDING_PURPOSES, normalizeState, parseMoney } from '../engine/profile.mjs';

const SCHEMA = `{
  "applicantType": one of ${JSON.stringify(APPLICANT_TYPES)} or null,
  "age": integer or null,
  "citizenship": string or null,
  "country": string or null,
  "state": two-letter US state code or null,
  "city": string or null,
  "locationServed": string[] or null,
  "educationLevel": one of ["elementary","middle_school","high_school","undergraduate","graduate","doctoral","none"] or null,
  "fieldIndustry": string[] or null,
  "projectTitle": string or null,
  "fundingPurpose": subset of ${JSON.stringify(FUNDING_PURPOSES)} or null,
  "fundingNeeded": number or null,
  "organizationStatus": one of ${JSON.stringify(ORGANIZATION_STATUSES)} or null,
  "organizationName": string or null,
  "is501c3": boolean or null,
  "previousAwards": string[] or null,
  "specialQualifications": string[] or null,
  "keywords": string[] (5-12 search terms describing the project)
}`;

/**
 * @param {string} description  the user's own text
 * @param {object} base         the rule-parsed profile (already authoritative)
 * @returns {Promise<{profile:object, filled:string[], error:string|null}>}
 */
export async function interpretDescription(description, base) {
  if (!hasLlm()) throw new LlmUnavailableError();

  const prompt = `A person described their funding need in their own words. Convert it into structured criteria.

Return JSON matching:
${SCHEMA}

Rules:
- Use null for anything the person did not say or clearly imply. Do not infer demographics, citizenship, income, or organization status from names, locations, or the kind of project.
- "keywords" should be the terms a grantmaker would use to categorize this work, drawn from what the person actually described.
- Do not add a state, age or dollar amount that is not in their text.

THEIR DESCRIPTION:
${String(description).slice(0, 8000)}`;

  const parsed = await jsonCall({ prompt, maxTokens: 1200 });
  const profile = { ...base };
  const filled = [];

  const setIfEmpty = (key, value) => {
    const current = profile[key];
    const isEmpty = current === null || current === undefined || current === '' || (Array.isArray(current) && current.length === 0);
    if (!isEmpty || value === null || value === undefined || value === '') return;
    profile[key] = value;
    filled.push(key);
  };

  if (APPLICANT_TYPES.includes(parsed.applicantType)) setIfEmpty('applicantType', parsed.applicantType);
  if (Number.isInteger(parsed.age) && parsed.age > 0 && parsed.age < 120) setIfEmpty('age', parsed.age);
  if (typeof parsed.citizenship === 'string') setIfEmpty('citizenship', parsed.citizenship.trim());
  if (typeof parsed.country === 'string') setIfEmpty('country', parsed.country.trim().toUpperCase());
  const state = normalizeState(parsed.state);
  if (state) setIfEmpty('state', state);
  if (typeof parsed.city === 'string') setIfEmpty('city', parsed.city.trim());
  if (Array.isArray(parsed.locationServed)) setIfEmpty('locationServed', parsed.locationServed.map(String));
  if (typeof parsed.educationLevel === 'string') setIfEmpty('educationLevel', parsed.educationLevel);
  if (Array.isArray(parsed.fieldIndustry)) setIfEmpty('fieldIndustry', parsed.fieldIndustry.map(String));
  if (typeof parsed.projectTitle === 'string') setIfEmpty('projectTitle', parsed.projectTitle.trim());
  if (Array.isArray(parsed.fundingPurpose)) {
    setIfEmpty('fundingPurpose', parsed.fundingPurpose.filter((p) => FUNDING_PURPOSES.includes(p)));
  }
  const amount = parseMoney(parsed.fundingNeeded);
  if (amount !== null) setIfEmpty('fundingNeeded', amount);
  if (ORGANIZATION_STATUSES.includes(parsed.organizationStatus)) setIfEmpty('organizationStatus', parsed.organizationStatus);
  if (typeof parsed.organizationName === 'string') setIfEmpty('organizationName', parsed.organizationName.trim());
  if (typeof parsed.is501c3 === 'boolean') setIfEmpty('is501c3', parsed.is501c3);
  if (Array.isArray(parsed.previousAwards)) setIfEmpty('previousAwards', parsed.previousAwards.map(String));
  if (Array.isArray(parsed.specialQualifications)) setIfEmpty('specialQualifications', parsed.specialQualifications.map(String));
  if (Array.isArray(parsed.keywords) && parsed.keywords.length) {
    const merged = [...new Set([...(profile.keywords || []), ...parsed.keywords.map((k) => String(k).toLowerCase())])];
    profile.keywords = merged.slice(0, 18);
    filled.push('keywords');
  }

  return { profile, filled, error: null };
}
