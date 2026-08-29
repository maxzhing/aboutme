/**
 * Grants.gov adapter -- the system's authoritative, key-free federal source.
 *
 * POST https://api.grants.gov/v1/api/search2      (keyword search, no auth)
 * POST https://api.grants.gov/v1/api/fetchOpportunity  (full synopsis by id)
 *
 * Everything here is `apiField` provenance: the values are read straight out of
 * the government's own JSON, so no quote-grounding is needed and no model is
 * involved. Field names are read defensively (the API returns several spellings
 * across endpoints) and anything absent stays absent.
 */

import { config } from '../lib/config.mjs';
import { requestJson } from '../lib/http.mjs';
import { apiField, absentField, unknownField } from '../lib/evidence.mjs';

export const GRANTS_GOV_VIEW_URL = 'https://www.grants.gov/search-results-detail/';

/** Opportunity statuses we will surface. "closed"/"archived" are never requested. */
const OPEN_STATUSES = 'posted|forecasted';

export async function searchGrantsGov(keyword, { rows, statuses = OPEN_STATUSES, eligibilities, agencies } = {}) {
  if (!config.grantsGov.enabled) {
    return { ok: false, reason: 'grants.gov source disabled by configuration', hits: [], keyword };
  }
  const body = {
    keyword: String(keyword || '').slice(0, 300),
    oppStatuses: statuses,
    rows: rows ?? config.grantsGov.rowsPerQuery,
    startRecordNum: 0,
  };
  if (eligibilities) body.eligibilities = eligibilities;
  if (agencies) body.agencies = agencies;

  try {
    const payload = await requestJson(config.grantsGov.searchUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      timeoutMs: config.grantsGov.timeoutMs,
      retries: 2,
    });
    const data = payload?.data || {};
    const hits = Array.isArray(data.oppHits) ? data.oppHits : [];
    return {
      ok: true,
      keyword,
      hitCount: Number(data.hitCount) || hits.length,
      hits,
      fetchedAt: new Date().toISOString(),
      sourceUrl: config.grantsGov.searchUrl,
    };
  } catch (error) {
    return { ok: false, keyword, reason: error.message, hits: [] };
  }
}

export async function fetchOpportunity(opportunityId) {
  try {
    const payload = await requestJson(config.grantsGov.fetchUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ opportunityId: Number(opportunityId) || opportunityId }),
      timeoutMs: config.grantsGov.timeoutMs,
      retries: 2,
    });
    if (payload?.errorcode && payload.errorcode !== 0) {
      return { ok: false, reason: payload.msg || `grants.gov error ${payload.errorcode}` };
    }
    return { ok: true, data: payload?.data || payload, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
}

const pick = (object, ...keys) => {
  for (const key of keys) {
    const value = object?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
};

/** grants.gov uses MMDDYYYY in the search endpoint and ISO in the detail endpoint. */
export function parseGrantsGovDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  let match = /^(\d{2})(\d{2})(\d{4})$/.exec(text);
  if (match) return `${match[3]}-${match[1]}-${match[2]}`;
  match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (match) return `${match[3]}-${String(match[1]).padStart(2, '0')}-${String(match[2]).padStart(2, '0')}`;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(/[$,]/g, ''));
  return Number.isFinite(number) ? number : null;
}

/**
 * The API returns applicant eligibility as objects carrying the government's own
 * description text. We keep that text verbatim rather than mapping numeric codes
 * to meanings we would be guessing at.
 */
export function applicantTypeDescriptions(detail) {
  const raw = detail?.synopsis?.applicantTypes ?? detail?.applicantTypes ?? [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .map((entry) => (typeof entry === 'string' ? entry : pick(entry, 'description', 'name', 'label', 'value')))
    .filter((entry) => typeof entry === 'string' && entry.trim())
    .map((entry) => entry.trim());
}

/**
 * Build a normalized, fully-attributed grant record from a grants.gov detail
 * response. `hit` is the search result; `detail` is the fetchOpportunity payload
 * (may be null if the detail call failed -- fields simply stay unknown).
 */
export function toGrantRecord(hit, detail, { fetchedAt = new Date().toISOString() } = {}) {
  const opportunityId = pick(hit, 'id', 'opportunityId') ?? detail?.id ?? detail?.opportunityId;
  const synopsis = detail?.synopsis || {};
  const sourceUrl = `${GRANTS_GOV_VIEW_URL}${opportunityId}`;
  const apiUrl = config.grantsGov.fetchUrl;
  const field = (value, apiPath) => (value === null || value === undefined || value === ''
    ? absentField({ sourceUrl, fetchedAt, note: `Not present in the grants.gov record (${apiPath})` })
    : apiField(value, { sourceUrl, fetchedAt, apiPath }));

  const title = pick(hit, 'title', 'opportunityTitle') ?? pick(detail, 'opportunityTitle', 'title');
  const agency = pick(hit, 'agencyName', 'agency') ?? pick(synopsis, 'agencyName') ?? pick(detail, 'agencyName', 'agencyCode');
  const closeDate = parseGrantsGovDate(pick(hit, 'closeDate') ?? pick(synopsis, 'responseDate', 'closeDate'));
  const openDate = parseGrantsGovDate(pick(hit, 'openDate') ?? pick(synopsis, 'postingDate', 'openDate'));
  const awardCeiling = toNumber(pick(synopsis, 'awardCeiling') ?? pick(hit, 'awardCeiling'));
  const awardFloor = toNumber(pick(synopsis, 'awardFloor') ?? pick(hit, 'awardFloor'));
  const applicantTypes = applicantTypeDescriptions(detail);
  const eligibilityText = pick(synopsis, 'applicantEligibilityDesc', 'additionalEligibilityDesc', 'eligibilityDesc');
  const description = pick(synopsis, 'synopsisDesc', 'description') ?? pick(detail, 'description');
  const costSharing = pick(synopsis, 'costSharing');
  const applicationUrl = pick(synopsis, 'additionalInformationUrl', 'agencyContactUrl') || sourceUrl;
  const oppNumber = pick(hit, 'number', 'opportunityNumber') ?? pick(detail, 'opportunityNumber');
  const status = String(pick(hit, 'oppStatus', 'status') ?? pick(detail, 'oppStatus') ?? '').toLowerCase() || null;

  return {
    id: `grantsgov:${opportunityId}`,
    grantName: field(title, 'opportunityTitle'),
    funder: field(agency, 'agencyName'),
    funderType: apiField('federal_government', { sourceUrl, fetchedAt, apiPath: 'source' }),
    officialUrl: apiField(sourceUrl, { sourceUrl, fetchedAt, apiPath: 'derived from opportunityId' }),
    applicationUrl: field(applicationUrl, 'synopsis.additionalInformationUrl'),
    opportunityNumber: field(oppNumber, 'opportunityNumber'),
    description: field(description ? stripHtml(description) : null, 'synopsis.synopsisDesc'),
    eligibilityText: field(eligibilityText ? stripHtml(eligibilityText) : null, 'synopsis.applicantEligibilityDesc'),
    applicantTypes: applicantTypes.length
      ? apiField(applicantTypes, { sourceUrl, fetchedAt, apiPath: 'synopsis.applicantTypes[].description' })
      : absentField({ sourceUrl, fetchedAt, note: 'grants.gov record lists no applicant types' }),
    geography: unknownField('Grants.gov records do not carry a structured geographic restriction; any limit appears in the eligibility text'),
    ageRequirement: unknownField('Grants.gov records do not carry a structured age requirement'),
    citizenshipRequirement: unknownField('Grants.gov records do not carry a structured citizenship requirement'),
    awardMinimum: field(awardFloor, 'synopsis.awardFloor'),
    awardMaximum: field(awardCeiling, 'synopsis.awardCeiling'),
    totalProgramFunding: field(toNumber(pick(synopsis, 'estimatedFunding')), 'synopsis.estimatedFunding'),
    expectedAwards: field(toNumber(pick(synopsis, 'numberOfAwards')), 'synopsis.numberOfAwards'),
    matchingRequired: costSharing === null || costSharing === undefined
      ? unknownField('Cost-sharing flag absent from this record')
      : apiField(Boolean(costSharing === true || String(costSharing).toLowerCase() === 'yes'), {
        sourceUrl, fetchedAt, apiPath: 'synopsis.costSharing',
      }),
    deadline: field(closeDate, 'closeDate'),
    openDate: field(openDate, 'openDate'),
    status: field(status, 'oppStatus'),
    fundingPurpose: field(categoryDescriptions(detail), 'fundingActivityCategories'),
    opportunityCategory: field(pick(detail, 'opportunityCategory')?.description ?? pick(detail, 'opportunityCategory'), 'opportunityCategory'),
    isRecurring: unknownField('Recurrence is not stated in the grants.gov record'),
    sourceUrls: [sourceUrl, apiUrl],
    provenanceNote: 'Read directly from the official Grants.gov API. No model interpretation was applied to these values.',
    lastVerified: fetchedAt,
    rawSource: 'grants.gov',
  };
}

/** Funding activity categories, returned as objects or bare strings depending on endpoint. */
function categoryDescriptions(detail) {
  const raw = detail?.fundingActivityCategories ?? detail?.synopsis?.fundingActivityCategories ?? [];
  const list = Array.isArray(raw) ? raw : [raw];
  const values = list
    .map((entry) => (typeof entry === 'string' ? entry : pick(entry, 'description', 'category', 'name')))
    .filter((entry) => typeof entry === 'string' && entry.trim());
  return values.length ? values : null;
}

function stripHtml(text) {
  return String(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
