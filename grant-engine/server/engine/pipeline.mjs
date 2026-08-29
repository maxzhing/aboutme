/**
 * The research pipeline.
 *
 * Runs the whole analysis and emits progress events so the interface can show
 * what is actually happening rather than a spinner. Each stage reports real
 * counts -- "Searching foundations (7 of 10 strategies)" -- because the stages
 * correspond to work that is genuinely being done.
 *
 * Order matters: discovery, then verification, then elimination, then scoring.
 * Nothing is scored before it is verified, and nothing is shown before it is
 * filtered.
 */

import { config, hasLlm, hasWebSearch, capabilityReport, degradedReasons } from '../lib/config.mjs';
import { mapLimit } from '../lib/http.mjs';
import { groundFields, citationsOf, valueOf } from '../lib/evidence.mjs';
import { normalizeProfile, missingProfileFields } from './profile.mjs';
import { interpretDescription } from '../ai/interpret.mjs';
import { buildSearchStrategies, buildFederalKeywords } from './queries.mjs';
import { searchGrantsGov, fetchOpportunity, toGrantRecord, applicantTypeDescriptions } from '../sources/grantsgov.mjs';
import { webSearchMany } from '../sources/websearch.mjs';
import { fetchPage, findApplicationPageLink, PageFetchError } from '../sources/page.mjs';
import { classifySource, TIER } from '../sources/registry.mjs';
import { extractGrant } from '../ai/extract.mjs';
import { inferRequirements } from './requirements.mjs';
import { assessEligibility, STATUS } from './eligibility.mjs';
import { scoreMatch } from './score.mjs';
import { assessQuality } from './quality.mjs';
import { assessConfidence } from './confidence.mjs';
import { assessDifficulty, assessCompetition } from './assessment.mjs';
import { deadlineInfo, sortResults } from './deadline.mjs';
import { dedupeLeads, dedupeRecords } from './dedupe.mjs';
import { buildStrategy } from './strategy.mjs';
import { collectFollowUpQuestions } from './followups.mjs';

export const STAGES = [
  { key: 'profile', label: 'Understanding your profile' },
  { key: 'strategies', label: 'Generating search strategies' },
  { key: 'government', label: 'Searching government funding' },
  { key: 'foundations', label: 'Searching foundations and private funders' },
  { key: 'reading', label: 'Reading funder pages' },
  { key: 'eligibility', label: 'Checking eligibility' },
  { key: 'deadlines', label: 'Verifying deadlines' },
  { key: 'expired', label: 'Eliminating expired and unverifiable opportunities' },
  { key: 'crosscheck', label: 'Cross-checking sources' },
  { key: 'scoring', label: 'Calculating match scores' },
  { key: 'finalize', label: 'Finalizing recommendations' },
];

export async function runSearch(input, { store, onStage = () => {}, now = new Date(), signal } = {}) {
  const started = Date.now();
  const notes = [];
  const stage = (key, detail, data) => {
    const entry = STAGES.find((s) => s.key === key);
    onStage({ key, label: entry?.label || key, detail: detail || null, ...data });
  };
  const aborted = () => signal?.aborted === true;

  // ---------------------------------------------------------------- profile
  stage('profile', 'Reading what you told us');
  let profile = normalizeProfile(input.profile || input);
  if (hasLlm() && (profile.rawDescription || profile.projectDescription)) {
    try {
      const interpreted = await interpretDescription(profile.rawDescription || profile.projectDescription, profile);
      profile = interpreted.profile;
      if (interpreted.filled.length) {
        stage('profile', `Interpreted ${interpreted.filled.length} additional detail${interpreted.filled.length === 1 ? '' : 's'} from your description`);
      }
    } catch (error) {
      notes.push(`Model interpretation of your description was unavailable (${error.message}); rule-based parsing was used instead.`);
    }
  }

  // ------------------------------------------------------------- strategies
  const strategies = buildSearchStrategies(profile, { limit: config.search.maxQueries });
  const federalKeywords = buildFederalKeywords(profile);
  stage('strategies', `${strategies.length} search strategies from your profile`, { strategies });

  // ------------------------------------------------------------- government
  stage('government', `Querying the official federal opportunity API with ${federalKeywords.length} keyword sets`);
  const federalRecords = [];
  const searchDiagnostics = { federal: [], web: [] };

  if (config.grantsGov.enabled && !aborted()) {
    const searches = await mapLimit(federalKeywords, 2, (keyword) => searchGrantsGov(keyword));
    const hits = new Map();
    for (const outcome of searches) {
      const result = outcome.ok ? outcome.value : { ok: false, reason: String(outcome.error?.message || outcome.error) };
      searchDiagnostics.federal.push({ keyword: result.keyword ?? null, ok: result.ok, count: result.hits?.length ?? 0, reason: result.reason ?? null });
      for (const hit of result.hits || []) {
        const id = hit.id ?? hit.opportunityId;
        if (id !== undefined && !hits.has(id)) hits.set(id, hit);
      }
    }
    const reachable = searchDiagnostics.federal.some((d) => d.ok);
    if (!reachable) {
      notes.push('The federal opportunity API could not be reached, so no federal grants are included in these results. This is a gap in coverage, not evidence that none exist.');
    }

    const selected = [...hits.values()].slice(0, config.pipeline.maxCandidatesToVerify);
    stage('government', `${selected.length} federal opportunit${selected.length === 1 ? 'y' : 'ies'} found; retrieving full records`);

    const details = await mapLimit(selected, 3, async (hit) => {
      const id = hit.id ?? hit.opportunityId;
      const detail = await fetchOpportunity(id);
      return { hit, detail: detail.ok ? detail.data : null, detailError: detail.ok ? null : detail.reason };
    });

    for (const outcome of details) {
      if (!outcome.ok) continue;
      const { hit, detail, detailError } = outcome.value;
      const record = toGrantRecord(hit, detail, { fetchedAt: new Date().toISOString() });
      record.detailAvailable = Boolean(detail);
      if (detailError) record.detailError = detailError;
      federalRecords.push(record);
    }
  } else if (!config.grantsGov.enabled) {
    notes.push('The federal source is disabled in this deployment\'s configuration.');
  }

  // ------------------------------------------------------------ foundations
  const webRecords = [];
  let leads = [];
  if (hasWebSearch() && !aborted()) {
    stage('foundations', `Running ${strategies.length} distinct searches across foundations, state, local and corporate funders`);
    const searches = await webSearchMany(strategies.map((s) => s.query), { concurrency: 3 });
    const collected = [];
    for (const result of searches) {
      searchDiagnostics.web.push({ query: result.query, ok: result.ok, count: result.leads.length, reason: result.reason ?? null });
      collected.push(...result.leads);
    }
    leads = dedupeLeads(collected);

    const before = leads.length;
    // Aggregators are dropped as *sources*; they cannot verify anything.
    const primaryLeads = leads.filter((lead) => classifySource(lead.url).tier <= TIER.INSTITUTIONAL);
    stage('foundations', `${before} results across all searches, ${primaryLeads.length} from funders' own or institutional sites after removing listing sites`);

    // ------------------------------------------------------------- reading
    const toRead = primaryLeads
      .sort((a, b) => (a.source.tier - b.source.tier) || (b.foundByQueries.length - a.foundByQueries.length))
      .slice(0, config.pipeline.maxCandidatesToVerify);

    let read = 0;
    const pages = await mapLimit(toRead, config.fetcher.concurrency, async (lead) => {
      if (aborted()) return null;
      const page = await fetchPage(lead.url, { store });
      read += 1;
      if (read % 5 === 0) stage('reading', `Read ${read} of ${toRead.length} funder pages`);
      return { lead, page };
    });

    for (const outcome of pages) {
      if (!outcome.ok || !outcome.value) {
        if (outcome.error instanceof PageFetchError) {
          notes.push(`Could not read ${outcome.error.url}: ${outcome.error.message}`);
        }
        continue;
      }
      const { lead, page } = outcome.value;
      let extracted = await extractGrant(page, { now });
      if (extracted.isGrantOpportunity === false) continue;

      // A funder's landing page often states nothing checkable; the guidelines
      // page it links to states everything. Follow exactly one hop when the
      // page we read yields neither a deadline nor eligibility rules.
      // Grounding has not run yet, so `verified` is still false on every quoted
      // field. What matters here is only whether the extractor found anything.
      const found = (field) => field?.value !== null && field?.value !== undefined && field?.value !== '';
      let sourcePage = page;
      if (!found(extracted.deadline) && !found(extracted.eligibilityText)) {
        const guidelinesUrl = findApplicationPageLink(page);
        if (guidelinesUrl && guidelinesUrl !== (page.finalUrl || page.url)) {
          try {
            const guidelines = await fetchPage(guidelinesUrl, { store });
            const deeper = await extractGrant(guidelines, { now });
            if (deeper.isGrantOpportunity !== false && (found(deeper.deadline) || found(deeper.eligibilityText))) {
              extracted = deeper;
              sourcePage = guidelines;
              stage('reading', `Followed ${new URL(guidelinesUrl).hostname} to its guidelines page for verifiable terms`);
            }
          } catch (error) {
            notes.push(`Could not read the guidelines page at ${guidelinesUrl}: ${error.message}`);
          }
        }
      }

      extracted.id = `web:${lead.url}`;
      extracted.foundByQueries = lead.foundByQueries;
      extracted.pageText = sourcePage.text;
      extracted.sourceUrls = [...new Set([...(extracted.sourceUrls || []), sourcePage.finalUrl || sourcePage.url])];
      extracted.funderType = extracted.funderType || null;
      webRecords.push(extracted);
    }
    stage('reading', `Read ${webRecords.length} funder page${webRecords.length === 1 ? '' : 's'} that describe a specific opportunity`);
  } else {
    stage('foundations', 'Skipped: no web search provider is configured');
    notes.push(capabilityReport().webSearch.note);
  }

  // -------------------------------------------------------------- assemble
  const allRecords = dedupeRecords([...federalRecords, ...webRecords]);
  stage('crosscheck', `${allRecords.length} distinct opportunities after merging duplicates across sources`);

  // ------------------------------------------- verification and elimination
  stage('eligibility', 'Reading each funder\'s stated requirements');
  const evaluated = [];
  const excluded = [];

  for (const record of allRecords) {
    if (aborted()) break;

    const sourceTexts = new Map();
    if (record.pageText) sourceTexts.set(record.sourceUrls?.[0], record.pageText);

    // Grounding: every quoted claim is re-checked against the text we hold.
    const grounding = groundFields(stripInternal(record), sourceTexts);
    const grounded = grounding.record;
    grounded.id = record.id;
    grounded.foundByQueries = record.foundByQueries || [];
    grounded.sourceUrls = record.sourceUrls || [];
    grounded.lastVerified = record.lastVerified;
    grounded.rawSource = record.rawSource;
    grounded.extractionMethod = record.extractionMethod;

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
    // already extracted from it). Concatenate rather than overwrite: a quote
    // must be checkable against everything we hold for that URL, or valid
    // evidence gets thrown away as unsupported.
    const requirementTexts = new Map();
    for (const document of documents) {
      if (!document.sourceUrl || !document.text) continue;
      const existing = requirementTexts.get(document.sourceUrl);
      requirementTexts.set(document.sourceUrl, existing ? `${existing}\n${document.text}` : document.text);
    }
    const groundedRequirements = groundFields(requirements, requirementTexts).record;

    const quality = assessQuality(grounded, { sourceTexts: requirementTexts, grounding, now });
    const deadline = deadlineInfo(grounded, { now });

    if (!quality.accepted) {
      excluded.push({
        id: grounded.id,
        grantName: valueOf(grounded.grantName) || grounded.rawSource,
        funder: valueOf(grounded.funder),
        url: valueOf(grounded.applicationUrl) || grounded.sourceUrls?.[0] || null,
        reasons: quality.rejections,
        stage: 'quality',
      });
      continue;
    }

    const eligibility = assessEligibility(groundedRequirements, profile, {
      deadline: valueOf(grounded.deadline),
      status: valueOf(grounded.status),
    });

    const score = scoreMatch(grounded, profile, eligibility, { now });
    const confidence = assessConfidence(grounded, { grounding, staleAfterHours: config.pipeline.staleAfterHours, now });
    const difficulty = assessDifficulty(grounded, eligibility);
    const competition = assessCompetition(grounded);

    const result = {
      id: grounded.id,
      record: grounded,
      requirements: groundedRequirements,
      eligibility,
      score,
      confidence,
      difficulty,
      competition,
      deadlineInfo: deadline,
      quality,
      citations: citationsOf(grounded),
      groundingReport: {
        checked: grounding.checked,
        rejected: grounding.rejected.length,
        fabricationRate: grounding.fabricationRate,
        discarded: grounding.rejected.map((r) => ({ field: r.path, reason: r.reason, claimed: r.claimedValue })),
      },
    };

    if (eligibility.status === STATUS.INELIGIBLE) {
      excluded.push({
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
      });
      continue;
    }

    evaluated.push(result);
  }

  stage('deadlines', `${evaluated.filter((r) => r.deadlineInfo.deadline).length} of ${evaluated.length} remaining opportunities have a verified deadline`);
  stage('expired', `${excluded.length} opportunit${excluded.length === 1 ? 'y' : 'ies'} eliminated, each with a stated reason`);
  stage('scoring', `Scoring ${evaluated.length} opportunities across eight weighted factors`);

  const ranked = sortResults(evaluated, input.sort || 'balanced').slice(0, config.pipeline.maxResults);
  const strongMatches = ranked.filter((r) => r.eligibility.status === STATUS.ELIGIBLE);
  const possibleMatches = ranked.filter((r) => r.eligibility.status === STATUS.UNCERTAIN);
  const followUps = collectFollowUpQuestions(ranked, profile);
  const strategy = buildStrategy(ranked, { excludedCount: excluded.length });

  stage('finalize', `${strongMatches.length} verified strong match${strongMatches.length === 1 ? '' : 'es'}, ${possibleMatches.length} needing confirmation`);

  // Persist verified records so alerts and re-runs can diff against them.
  if (store) {
    for (const result of ranked) {
      store.grants.put({
        id: result.id,
        record: result.record,
        lastVerified: result.record.lastVerified,
        sourceConfidence: result.confidence.level,
        funder: valueOf(result.record.funder),
        grantName: valueOf(result.record.grantName),
        deadline: valueOf(result.record.deadline),
      });
    }
  }

  const run = {
    id: `run:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    profile,
    strategies,
    federalKeywords,
    bestMatch: ranked[0] ? summarizeBest(ranked[0]) : null,
    results: ranked,
    strongMatches: strongMatches.map((r) => r.id),
    possibleMatches: possibleMatches.map((r) => r.id),
    excluded,
    followUps,
    strategy,
    notes,
    searchDiagnostics,
    capabilities: capabilityReport(),
    degraded: degradedReasons(),
    missingProfileFields: missingProfileFields(profile),
    counts: {
      leadsFound: leads.length,
      recordsBuilt: allRecords.length,
      evaluated: evaluated.length,
      returned: ranked.length,
      excluded: excluded.length,
      strong: strongMatches.length,
      possible: possibleMatches.length,
    },
    elapsedMs: Date.now() - started,
  };

  if (store) store.runs.put({ id: run.id, ...run });
  return run;
}

/** Remove non-field scratch data before grounding walks the record. */
function stripInternal(record) {
  const copy = { ...record };
  delete copy.pageText;
  delete copy.foundByQueries;
  delete copy.sourceUrls;
  delete copy.extractionMethod;
  delete copy.rawSource;
  delete copy.modelError;
  delete copy.isGrantOpportunity;
  delete copy.detailAvailable;
  delete copy.detailError;
  return copy;
}

function summarizeBest(result) {
  return {
    id: result.id,
    grantName: valueOf(result.record.grantName),
    funder: valueOf(result.record.funder),
    score: result.score.overall,
    eligibility: result.eligibility.status,
    confidence: result.confidence.level,
    deadline: result.deadlineInfo.display,
    applicationUrl: valueOf(result.record.applicationUrl) || valueOf(result.record.officialUrl),
    whyItMatches: result.score.components.missionAlignment.rationale,
    whyYouQualify: result.eligibility.summary,
    risks: [
      ...result.eligibility.risks.map((risk) => risk.reason),
      ...(result.confidence.level !== 'HIGH' ? [`Source confidence is ${result.confidence.label}: ${result.confidence.reasons[0]}`] : []),
    ],
    lastVerified: result.record.lastVerified,
  };
}

