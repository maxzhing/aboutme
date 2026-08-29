/**
 * Full-pipeline integration test.
 *
 * Runs the real pipeline against a fixture "internet" — a Grants.gov-shaped API,
 * a search engine, and a set of funder pages covering a clean match, a
 * 501(c)(3)-only grant, an expired grant, a loan, a scam, and an aggregator.
 * No network access and no API keys are required.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startFixtureServer } from './fixtures/server.mjs';

const fixture = await startFixtureServer();
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gme-test-'));

// Configuration is read at import time, so it must be set before the pipeline loads.
process.env.DATA_DIR = dataDir;
process.env.GRANTS_GOV_SEARCH_URL = `${fixture.origin}/api/search2`;
process.env.GRANTS_GOV_FETCH_URL = `${fixture.origin}/api/fetchOpportunity`;
process.env.SEARXNG_URL = fixture.origin;
process.env.FETCH_PER_HOST_DELAY_MS = '0';
process.env.NO_PROXY = '*';
process.env.no_proxy = '*';
delete process.env.ANTHROPIC_API_KEY;

const { runSearch } = await import('../server/engine/pipeline.mjs');
const { Store } = await import('../server/lib/store.mjs');
const { applyAnswer } = await import('../server/engine/followups.mjs');
const { STATUS } = await import('../server/engine/eligibility.mjs');

const store = new Store(dataDir);
const NOW = new Date('2026-08-29T00:00:00Z');
const DESCRIPTION = "I'm a high school student interested in robotics. I want funding to start a "
  + 'STEM outreach program for younger students in Maryland and need about $5,000.';

const stages = [];
const run = await runSearch(
  { profile: { rawDescription: DESCRIPTION } },
  { store, now: NOW, onStage: (event) => stages.push(event.key) },
);

test.after(async () => {
  await fixture.close();
  await store.flushAll();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

const byName = (name) => run.results.find((result) => result.record.grantName.value === name);
const excludedByName = (name) => run.excluded.find((entry) => entry.grantName === name);

test('the pipeline reports progress through its real stages', () => {
  for (const key of ['profile', 'strategies', 'government', 'foundations', 'eligibility', 'scoring', 'finalize']) {
    assert.ok(stages.includes(key), `stage ${key} was never reported`);
  }
});

test('both federal and non-federal sources contribute opportunities', () => {
  assert.ok(run.counts.recordsBuilt >= 6, `only built ${run.counts.recordsBuilt} records`);
  const sources = new Set(run.results.concat(run.excluded.map((entry) => ({ id: entry.id }))).map((entry) => entry.id.split(':')[0]));
  assert.ok(sources.has('grantsgov'));
  assert.ok(sources.has('web'));
});

test('a genuinely matching opportunity is returned', () => {
  const match = byName('Youth STEM Innovation Grant Program');
  assert.ok(match, 'the eligible fixture grant should be returned');
  assert.ok(match.score.overall >= 50, `score was ${match.score.overall}`);
  assert.equal(match.record.deadline.value, '2026-12-12');
  assert.equal(match.record.awardMinimum.value, 1000);
  assert.equal(match.record.awardMaximum.value, 8000);
});

test('every fact on a returned record is grounded in text we downloaded', () => {
  for (const result of run.results) {
    assert.equal(result.groundingReport.rejected, 0, `${result.id} carried unsupported claims`);
    for (const citation of result.citations) {
      assert.ok(citation.sourceUrl.startsWith('http'), 'a citation must name a real URL');
    }
  }
});

test('a 501(c)(3)-only grant excludes an individual student and says exactly why', () => {
  const excluded = excludedByName('STEM Capacity Building Grant');
  assert.ok(excluded, 'the nonprofit-only fixture grant must be excluded');
  assert.ok(excluded.reasons.some((reason) => /individual/i.test(reason.reason)));
  assert.ok(excluded.reasons.some((reason) => reason.evidence?.quote), 'the exclusion must quote the funder');
  assert.ok(excluded.missionAlignment > 0, 'the topical match is still reported, so the user can audit the call');
});

test('an expired opportunity is never presented as available', () => {
  const excluded = excludedByName('Robotics Mini-Grant Program');
  assert.ok(excluded);
  assert.ok(excluded.reasons.some((reason) => reason.code === 'expired'));
  assert.equal(byName('Robotics Mini-Grant Program'), undefined);
});

test('a loan is not surfaced as a grant', () => {
  const excluded = run.excluded.find((entry) => /Business Growth/.test(entry.grantName || ''));
  assert.ok(excluded);
  assert.ok(excluded.reasons.some((reason) => reason.code === 'is_loan'));
});

test('a fee-charging, guarantee-making page is rejected as a scam', () => {
  const excluded = run.excluded.find((entry) => /Guaranteed/.test(entry.grantName || ''));
  assert.ok(excluded);
  assert.ok(excluded.reasons.some((reason) => reason.code === 'payment_required'));
});

test('third-party listing sites are never read as sources', () => {
  const everyUrl = [...run.results, ...run.excluded].flatMap((entry) => entry.citations
    ? entry.citations.map((citation) => citation.sourceUrl)
    : [entry.url].filter(Boolean));
  assert.ok(!everyUrl.some((url) => /grantwatch\.com/.test(url)), 'an aggregator reached the results');
});

test('a federal record is read from the API, not interpreted by a model', () => {
  const federal = [...run.results, ...run.excluded].find((entry) => entry.id.startsWith('grantsgov:'));
  assert.ok(federal);
  const stored = store.grants.get(federal.id) || run.results.find((result) => result.id === federal.id);
  if (stored?.record) {
    assert.equal(stored.record.funderType.value, 'federal_government');
    assert.equal(stored.record.grantName.provenance, 'api');
  }
});

test('a landing page with nothing verifiable is followed to its guidelines page', () => {
  const result = run.results.find((entry) => /Robotics Access Fund/i.test(entry.record.grantName.value || ''));
  assert.ok(result, 'the Brightline fund should be discovered and survive once its real terms are read');
  assert.equal(
    run.results.filter((entry) => /Robotics Access Fund/i.test(entry.record.grantName.value || '')).length,
    1,
    'the landing page and the guidelines page describe one grant and must merge into one record',
  );
  assert.equal(result.record.deadline.value, '2026-10-09', 'the deadline only exists on the guidelines page');
  assert.equal(result.record.awardMaximum.value, 3000);
  assert.ok(
    result.citations.some((citation) => /guidelines/.test(citation.sourceUrl)),
    'the guidelines page must be cited as the source',
  );
});

test('unresolved eligibility produces the minimum question that would resolve it', () => {
  assert.ok(run.followUps.length >= 1);
  const question = run.followUps[0];
  assert.ok(question.text.endsWith('?'));
  assert.ok(question.unlocks.length >= 1);
  assert.ok(question.prompt.length > 20);
});

test('answering a follow-up moves an uncertain grant to eligible', async () => {
  const before = byName('Youth STEM Innovation Grant Program');
  assert.equal(before.eligibility.status, STATUS.UNCERTAIN, 'age is unknown, so this starts uncertain');

  const profile = applyAnswer(run.profile, 'age', 'age', 16);
  const second = await runSearch({ profile }, { store, now: NOW });
  const after = second.results.find((result) => result.record.grantName.value === 'Youth STEM Innovation Grant Program');

  assert.equal(after.eligibility.status, STATUS.ELIGIBLE);
  assert.ok(after.score.overall > before.score.overall, 'resolving a requirement should raise the score');
  assert.ok(after.eligibility.checks.some((check) => check.id === 'age_min' && check.result === 'pass'));
});

test('the strategy names distinct opportunities for distinct roles', () => {
  const picked = run.strategy.picks.filter((pick) => pick.grantId).map((pick) => pick.grantId);
  assert.equal(new Set(picked).size, picked.length, 'one grant must not fill two strategy roles');
  for (const pick of run.strategy.picks) {
    assert.ok(pick.why.length > 20);
    if (!pick.grantId) assert.match(pick.note, /real gap/i);
  }
});

test('the run reports honestly on what it could and could not search', () => {
  assert.ok(Array.isArray(run.degraded));
  assert.ok(run.capabilities.languageModel.available === false);
  assert.match(run.capabilities.languageModel.note, /Nothing is guessed/);
  assert.ok(run.searchDiagnostics.web.length >= 10, 'every query attempted must be reported');
  assert.ok(run.searchDiagnostics.federal.length >= 1);
});

test('the exclusion count in the summary matches the excluded list', () => {
  assert.match(run.strategy.summary, new RegExp(`${run.excluded.length} were excluded`));
});

test('verified records are persisted so alerts can diff against them', () => {
  assert.ok(store.grants.count() >= run.results.length);
  const stored = store.grants.get(run.results[0].id);
  assert.ok(stored);
  assert.equal(stored.grantName, run.results[0].record.grantName.value);
});

test('results are capped and ordered by the balanced ranking', () => {
  assert.ok(run.results.length <= 20);
  for (let i = 1; i < run.results.length; i += 1) {
    const previous = run.results[i - 1];
    const current = run.results[i];
    // Balanced ranking allows an urgent grant to outrank a slightly better one,
    // but never by more than the urgency bonus.
    assert.ok(previous.score.overall + 6 >= current.score.overall);
  }
});
