/**
 * The in-browser engine and its demonstration corpus.
 *
 * The single-file build must run the same analysis as the server and must be
 * unmistakably honest that its opportunities are fictional.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { runLocalSearch, browserCapabilities, STAGES } from '../browser/engine.mjs';
import { CORPUS, CORPUS_NOTICE } from '../browser/corpus.mjs';
import { STATUS } from '../server/engine/eligibility.mjs';

const NOW = new Date('2026-08-29T00:00:00Z');
const run = (description, extra = {}) =>
  runLocalSearch({ profile: { rawDescription: description, ...extra } }, { now: NOW, pace: 0 });

test('every bundled funder is on a domain that can never resolve', () => {
  for (const entry of CORPUS) {
    const host = new URL(entry.url).hostname;
    assert.ok(host.endsWith('.demo.invalid'), `${host} could be mistaken for a real funder`);
  }
});

test('the corpus notice states plainly that the funders are invented', () => {
  assert.match(CORPUS_NOTICE, /fictional/i);
  assert.match(CORPUS_NOTICE, /not from a live search/i);
});

test('the capability report does not claim a live search it cannot do', () => {
  const capabilities = browserCapabilities();
  assert.equal(capabilities.liveSearch.available, false);
  assert.match(capabilities.liveSearch.note, /cannot reach the internet/i);
  assert.equal(capabilities.analysisEngine.available, true);
  assert.equal(capabilities.languageModel.available, false);
});

test('the specification example returns eligible matches and marks itself a demo', async () => {
  const result = await run("I'm a high school student interested in robotics. I want funding to start a "
    + 'STEM outreach program for younger students in Maryland and need about $5,000.');

  assert.equal(result.demo, true);
  assert.ok(result.results.length >= 2);
  assert.ok(result.notes.some((note) => /fictional/i.test(note)));
  assert.ok(result.degraded.some((entry) => /cannot call search APIs|bundled/i.test(entry)));
  assert.equal(result.strategies.length, 10, 'the real strategy generator still runs');
});

test('a student is excluded from opportunities that require an organization or a school', async () => {
  const result = await run("I'm a high school student in Maryland starting a STEM robotics outreach "
    + 'program for younger students. I need $5,000.');
  const names = result.excluded.map((entry) => entry.grantName);
  assert.ok(names.some((name) => /Capacity Building/.test(name)), 'the 501(c)(3)-only grant must be excluded');
  assert.ok(names.some((name) => /Classroom Technology/.test(name)), 'the schools-only grant must be excluded');
  for (const entry of result.excluded) assert.ok(entry.reasons.length >= 1);
});

test('expired, loan and fee-charging entries never reach the results', async () => {
  const result = await run('STEM robotics education funding for youth programs and business growth');
  const returned = result.results.map((entry) => entry.record.grantName.value || '');
  assert.ok(!returned.some((name) => /Mini-Grant/.test(name)), 'an expired grant was returned');
  assert.ok(!returned.some((name) => /Business Growth/.test(name)), 'a loan was returned');
  assert.ok(!returned.some((name) => /Guaranteed/.test(name)), 'a fee-charging page was returned');
});

test('nothing returned carries an unsupported claim', async () => {
  const result = await run('community food security and hunger relief for rural families');
  for (const entry of result.results) {
    assert.equal(entry.groundingReport.rejected, 0, `${entry.id} carried a quote that is not on its page`);
  }
});

test('answering a follow-up promotes an uncertain grant to eligible', async () => {
  const first = await run("I'm a high school student in Maryland starting a STEM robotics outreach program, $5,000 needed.");
  const target = 'Youth STEM Innovation Grant Program';
  const before = first.results.find((entry) => entry.record.grantName.value === target);
  assert.ok(before, 'the Openfield grant should be found');
  assert.equal(before.eligibility.status, STATUS.UNCERTAIN, 'age is unknown, so it starts uncertain');

  const second = await runLocalSearch({ profile: { ...first.profile, age: 16 } }, { now: NOW, pace: 0 });
  const after = second.results.find((entry) => entry.record.grantName.value === target);
  assert.equal(after.eligibility.status, STATUS.ELIGIBLE);
  assert.ok(after.score.overall > before.score.overall);
});

test('a topically unrelated opportunity is not returned just because the applicant is eligible for it', async () => {
  const painter = await run("I'm a painter in New Mexico looking for a fellowship to fund six months of studio work.");
  const names = painter.results.map((entry) => entry.record.grantName.value || '');
  assert.ok(!names.some((name) => /Robotics/.test(name)), 'a robotics fund is not a match for a painter');
  assert.ok(names.some((name) => /Artist/.test(name)), 'the artist fellowship should be found');
});

test('the stage list matches what the engine actually reports', async () => {
  const seen = [];
  await runLocalSearch(
    { profile: { rawDescription: 'youth robotics STEM education Maryland' } },
    { now: NOW, pace: 0, onStage: (event) => seen.push(event.key) },
  );
  for (const stage of STAGES) assert.ok(seen.includes(stage.key), `stage ${stage.key} was never reported`);
});
