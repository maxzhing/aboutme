/**
 * In-browser engine.
 *
 * Runs the genuine analysis pipeline — the same modules the server uses — over
 * the bundled corpus. Only *discovery* differs: instead of searching the live
 * internet, candidate pages come from the bundle. Everything after that
 * (extraction, quote-grounding, requirement inference, quality filtering,
 * eligibility, scoring, confidence) is the real implementation.
 *
 * The relevance filter here stands in for a search engine. It is deliberately
 * generous: the engine's job is to reject unsuitable opportunities with stated
 * reasons, not to have them quietly filtered out before analysis.
 */

import { htmlToText, extractTitle, extractHeading, extractLinks, findApplicationPageLink, groundingTextOf } from '../server/sources/html.mjs';
import { patternExtract } from '../server/ai/patterns.mjs';
import { evaluateAll } from '../server/engine/evaluate.mjs';
import { normalizeProfile, missingProfileFields } from '../server/engine/profile.mjs';
import { buildSearchStrategies } from '../server/engine/queries.mjs';
import { dedupeRecords } from '../server/engine/dedupe.mjs';
import { sortResults } from '../server/engine/deadline.mjs';
import { buildStrategy } from '../server/engine/strategy.mjs';
import { collectFollowUpQuestions } from '../server/engine/followups.mjs';
import { buildApplicationPacket } from '../server/engine/assistant.mjs';
import { tokenize } from '../server/engine/score.mjs';
import { expandConcepts } from '../server/engine/concepts.mjs';
import { valueOf } from '../server/lib/evidence.mjs';
import { STATUS } from '../server/engine/eligibility.mjs';
import { CORPUS, CORPUS_NOTICE } from './corpus.mjs';

export const STAGES = [
  { key: 'profile', label: 'Understanding your profile' },
  { key: 'strategies', label: 'Generating search strategies' },
  { key: 'government', label: 'Searching the bundled corpus' },
  { key: 'foundations', label: 'Matching foundations and private funders' },
  { key: 'reading', label: 'Reading funder pages' },
  { key: 'eligibility', label: 'Checking eligibility' },
  { key: 'deadlines', label: 'Verifying deadlines' },
  { key: 'expired', label: 'Eliminating expired and unverifiable opportunities' },
  { key: 'crosscheck', label: 'Cross-checking sources' },
  { key: 'scoring', label: 'Calculating match scores' },
  { key: 'finalize', label: 'Finalizing recommendations' },
];

/** Convert a bundled page into the shape `fetchPage` would have produced. */
function toPage(entry, fetchedAt) {
  const text = htmlToText(entry.html);
  const title = extractTitle(entry.html) || entry.title;
  const heading = extractHeading(entry.html);
  return {
    url: entry.url,
    finalUrl: entry.url,
    text,
    title,
    heading,
    groundingText: groundingTextOf({ title, heading, text }),
    links: extractLinks(entry.html, entry.url),
    fetchedAt,
    fromCache: false,
  };
}

/**
 * Stand-in for a search engine: score each bundled page against the applicant's
 * vocabulary. Anything with any overlap is passed through to be analysed.
 */
function selectCandidates(profile) {
  const description = profile.projectDescription || profile.rawDescription || '';
  const terms = new Set([
    ...tokenize(description),
    ...(profile.keywords || []).flatMap((keyword) => tokenize(keyword)),
    ...expandConcepts(description, { limit: 10 }).flatMap((concept) => tokenize(concept)),
    ...(profile.fieldIndustry || []).flatMap((industry) => tokenize(industry.replace(/_/g, ' '))),
    ...(profile.fundingPurpose || []).flatMap((purpose) => tokenize(purpose.replace(/_/g, ' '))),
    ...(profile.applicantType ? tokenize(profile.applicantType.replace(/_/g, ' ')) : []),
  ]);

  const scored = CORPUS
    .map((entry) => {
      const haystack = new Set(tokenize(`${entry.title} ${htmlToText(entry.html)}`));
      let overlap = 0;
      for (const term of terms) if (haystack.has(term)) overlap += 1;
      return { entry, overlap };
    })
    .filter((candidate) => candidate.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap);

  if (scored.length === 0) return [];

  // A search engine does not return every page containing one shared word, and
  // neither should this. Without a relevance cutoff a painter's strongest match
  // would be a robotics fund they happen to be eligible for — technically true,
  // useless in practice, and against the principle that precision beats volume.
  const best = scored[0].overlap;
  const floor = Math.max(2, Math.ceil(best * 0.35));
  return scored.filter((candidate) => candidate.overlap >= floor).slice(0, 12);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run the full analysis. Mirrors the server pipeline's return shape so the same
 * interface code renders both.
 */
export async function runLocalSearch(input, { onStage = () => {}, now = new Date(), pace = 90 } = {}) {
  const started = Date.now();
  const stage = async (key, detail) => {
    const entry = STAGES.find((s) => s.key === key);
    onStage({ key, label: entry?.label || key, detail: detail || null });
    // The work is instant offline; a short pause keeps the stage list readable
    // rather than flashing past. It never fabricates progress that did not happen.
    if (pace) await sleep(pace);
  };

  await stage('profile', 'Reading what you told us');
  const profile = normalizeProfile(input.profile || input);

  const strategies = buildSearchStrategies(profile);
  await stage('strategies', `${strategies.length} search strategies from your profile`);

  await stage('government', `Scanning ${CORPUS.length} bundled funder pages`);
  const candidates = selectCandidates(profile);
  await stage('foundations', `${candidates.length} pages mention your subject area`);

  const fetchedAt = now.toISOString();
  const records = [];
  const notes = [CORPUS_NOTICE];

  for (const { entry } of candidates) {
    const page = toPage(entry, fetchedAt);
    let extracted = patternExtract(page, { now });
    let sourcePage = page;

    // Same one-hop follow the server does when a landing page states nothing checkable.
    const found = (field) => field?.value !== null && field?.value !== undefined && field?.value !== '';
    if (!found(extracted.deadline) && !found(extracted.eligibilityText)) {
      const guidelinesUrl = findApplicationPageLink(page);
      const linked = guidelinesUrl && CORPUS.find((item) => item.url === guidelinesUrl);
      if (linked) {
        const guidelines = toPage(linked, fetchedAt);
        const deeper = patternExtract(guidelines, { now });
        if (found(deeper.deadline) || found(deeper.eligibilityText)) {
          extracted = deeper;
          sourcePage = guidelines;
        }
      }
    }

    extracted.id = `demo:${entry.url}`;
    extracted.pageText = sourcePage.groundingText;
    extracted.sourceUrls = [sourcePage.finalUrl];
    records.push(extracted);
  }
  await stage('reading', `Read ${records.length} funder page${records.length === 1 ? '' : 's'}`);

  const deduped = dedupeRecords(records);
  await stage('crosscheck', `${deduped.length} distinct opportunities after merging duplicates`);

  await stage('eligibility', 'Reading each funder\'s stated requirements');
  const { evaluated, excluded } = evaluateAll(deduped, profile, { now, staleAfterHours: 24 * 365 });

  await stage('deadlines', `${evaluated.filter((r) => r.deadlineInfo.deadline).length} of ${evaluated.length} have a verified deadline`);
  await stage('expired', `${excluded.length} eliminated, each with a stated reason`);
  await stage('scoring', `Scoring ${evaluated.length} opportunities across eight weighted factors`);

  const ranked = sortResults(evaluated, input.sort || 'balanced');
  const strong = ranked.filter((r) => r.eligibility.status === STATUS.ELIGIBLE);
  const possible = ranked.filter((r) => r.eligibility.status === STATUS.UNCERTAIN);
  const followUps = collectFollowUpQuestions(ranked, profile);
  const strategy = buildStrategy(ranked, { excludedCount: excluded.length });

  await stage('finalize', `${strong.length} verified strong match${strong.length === 1 ? '' : 'es'}, ${possible.length} needing confirmation`);

  return {
    id: `run:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    profile,
    strategies,
    federalKeywords: [],
    results: ranked,
    strongMatches: strong.map((r) => r.id),
    possibleMatches: possible.map((r) => r.id),
    excluded,
    followUps,
    strategy,
    notes,
    searchDiagnostics: {
      federal: [],
      web: strategies.map((entry) => ({
        query: entry.query,
        ok: true,
        count: candidates.length,
        reason: 'Matched against the bundled corpus rather than a live search engine.',
      })),
    },
    capabilities: browserCapabilities(),
    degraded: [
      'Live internet search: a page opened from a file cannot call search APIs or fetch funder sites across origins. '
      + 'These results come from a bundled set of fictional funders. Run the full engine (npm start) to search live sources.',
    ],
    missingProfileFields: missingProfileFields(profile),
    counts: {
      leadsFound: candidates.length,
      recordsBuilt: deduped.length,
      evaluated: evaluated.length,
      returned: ranked.length,
      excluded: excluded.length,
      strong: strong.length,
      possible: possible.length,
    },
    elapsedMs: Date.now() - started,
    demo: true,
  };
}

export function browserCapabilities() {
  return {
    liveSearch: {
      available: false,
      name: 'Live internet search',
      note: 'This single-file build cannot reach the internet: a page opened from a file has no API keys '
        + 'and cannot fetch funder sites across origins. Opportunities come from a bundled set of fictional '
        + 'funders instead. Every funder, deadline and award below is invented.',
    },
    analysisEngine: {
      available: true,
      name: 'Eligibility and verification engine',
      note: 'The real engine, running in your browser: quote-grounded extraction, requirement inference, '
        + 'the eligibility gate, the eight-factor score, the quality filter and source confidence are all '
        + 'the same code the server runs.',
    },
    languageModel: {
      available: false,
      name: 'Language model',
      note: 'Not used here. Your description is parsed with rule-based extraction and funder pages are read '
        + 'with pattern-based extraction. Nothing is guessed.',
    },
  };
}

export { buildApplicationPacket, normalizeProfile, missingProfileFields, valueOf, STATUS };
