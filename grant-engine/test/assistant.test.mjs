/**
 * Strategy picks, follow-up questions, the application packet and the persistence
 * layer. The recurring theme: verified requirements and general advice must stay
 * visibly separate, and nothing about the applicant may be invented.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildStrategy } from '../server/engine/strategy.mjs';
import { collectFollowUpQuestions, applyAnswer } from '../server/engine/followups.mjs';
import { buildApplicationPacket } from '../server/engine/assistant.mjs';
import { assessEligibility, STATUS } from '../server/engine/eligibility.mjs';
import { inferRequirements } from '../server/engine/requirements.mjs';
import { scoreMatch } from '../server/engine/score.mjs';
import { deadlineInfo } from '../server/engine/deadline.mjs';
import { assessDifficulty, assessCompetition, DIFFICULTY } from '../server/engine/assessment.mjs';
import { assessConfidence } from '../server/engine/confidence.mjs';
import { groundFields, apiField } from '../server/lib/evidence.mjs';
import { normalizeProfile } from '../server/engine/profile.mjs';
import { Store } from '../server/lib/store.mjs';

const NOW = new Date('2026-08-29T00:00:00Z');
const SOURCE = 'https://funder.example/g';
const f = (value) => apiField(value, { sourceUrl: SOURCE, fetchedAt: NOW.toISOString() });

function buildResult({ id, text, profileInput, deadline = '2026-11-20', awardMax = 10000 }) {
  const requirements = groundFields(
    inferRequirements([{ text, sourceUrl: SOURCE, fetchedAt: NOW.toISOString() }]),
    new Map([[SOURCE, text]]),
  ).record;
  const profile = normalizeProfile(profileInput);
  const record = {
    grantName: f(`Grant ${id}`),
    funder: f('Openfield Foundation'),
    description: f(text),
    eligibilityText: f(text),
    applicationUrl: f('https://funder.example/apply'),
    officialUrl: f(SOURCE),
    awardMinimum: f(1000),
    awardMaximum: f(awardMax),
    deadline: f(deadline),
    funderType: f('foundation'),
    lastVerified: NOW.toISOString(),
    sourceUrls: [SOURCE],
  };
  const eligibility = assessEligibility(requirements, profile, { deadline });
  const score = scoreMatch(record, profile, eligibility, { now: NOW });
  return {
    id,
    record,
    eligibility,
    score,
    confidence: assessConfidence(record, { now: NOW }),
    difficulty: assessDifficulty(record, eligibility),
    competition: assessCompetition(record),
    deadlineInfo: deadlineInfo(record, { now: NOW }),
    citations: [{ sourceUrl: SOURCE, fetchedAt: NOW.toISOString(), quotes: ['Individuals may apply.'] }],
    profile,
  };
}

const OPEN = 'Individuals may apply. This program supports STEM education and robotics outreach.';
const PROFILE = { applicantType: 'individual', state: 'MD', fundingNeeded: 5000, fundingPurpose: ['program_delivery'], projectDescription: 'STEM robotics outreach for younger students' };

/* ------------------------------------------------------------- strategy */

test('each strategy role gets a distinct grant', () => {
  const results = [
    buildResult({ id: 'a', text: OPEN, profileInput: PROFILE, deadline: '2026-10-01', awardMax: 8000 }),
    buildResult({ id: 'b', text: OPEN, profileInput: PROFILE, deadline: '2027-06-01', awardMax: 500000 }),
    buildResult({ id: 'c', text: OPEN, profileInput: PROFILE, deadline: '2026-12-01', awardMax: 4000 }),
  ];
  const strategy = buildStrategy(results, { excludedCount: 2 });
  const picked = strategy.picks.filter((pick) => pick.grantId).map((pick) => pick.grantId);
  assert.equal(new Set(picked).size, picked.length);
  assert.equal(strategy.picks.find((pick) => pick.key === 'high_value').grantId, 'b');
});

test('an unfillable role is reported as a real gap, not padded with a bad fit', () => {
  const strategy = buildStrategy([], { excludedCount: 4 });
  for (const pick of strategy.picks) {
    assert.equal(pick.grantId, null);
    assert.match(pick.note, /real gap/i);
  }
  assert.match(strategy.summary, /No opportunity in this search survived/);
  assert.match(strategy.summary, /4 were excluded/);
});

test('ineligible results are never offered as strategy picks or backups', () => {
  const ineligible = buildResult({
    id: 'x',
    text: 'Applicants must be a registered 501(c)(3) organization. Individuals are not eligible to apply.',
    profileInput: PROFILE,
  });
  assert.equal(ineligible.eligibility.status, STATUS.INELIGIBLE);
  const strategy = buildStrategy([ineligible], { excludedCount: 0 });
  assert.ok(strategy.picks.every((pick) => pick.grantId === null));
  assert.equal(strategy.backups.length, 0);
});

/* ------------------------------------------------------------ follow-ups */

test('follow-up questions are deduplicated and ranked by how many grants they unlock', () => {
  const profile = normalizeProfile({ applicantType: 'nonprofit', state: 'MD' });
  const makeUncertain = (id) => buildResult({
    id,
    text: 'Applicants must be a registered 501(c)(3) organization.',
    profileInput: { applicantType: 'nonprofit', state: 'MD' },
  });
  const questions = collectFollowUpQuestions([makeUncertain('a'), makeUncertain('b')], profile);
  const nonprofit = questions.find((question) => question.id === 'is501c3');
  assert.ok(nonprofit);
  assert.equal(nonprofit.unlocks.length, 2, 'one question, both grants');
  assert.match(nonprofit.prompt, /2 opportunities/);
});

test('a question already answered is not asked again', () => {
  const answered = normalizeProfile({ applicantType: 'nonprofit', is501c3: true, state: 'MD' });
  const result = buildResult({ id: 'a', text: 'Applicants must be a registered 501(c)(3) organization.', profileInput: { applicantType: 'nonprofit', is501c3: true, state: 'MD' } });
  const questions = collectFollowUpQuestions([result], answered);
  assert.ok(!questions.some((question) => question.id === 'is501c3'));
});

test('applying an answer updates the profile and records the answer', () => {
  const profile = normalizeProfile({ applicantType: 'nonprofit' });
  const updated = applyAnswer(profile, 'is501c3', 'is501c3', true);
  assert.equal(updated.is501c3, true);
  assert.equal(updated.organizationStatus, 'nonprofit_501c3', 'a 501(c)(3) answer implies the org status');
  assert.equal(updated.answeredQuestions.is501c3, true);
  assert.equal(profile.is501c3, null, 'the original profile must not be mutated');
});

test('free-form confirmations are stored without corrupting profile fields', () => {
  const updated = applyAnswer(normalizeProfile({}), 'fiscal_sponsor_accepted', 'answeredQuestions', true);
  assert.equal(updated.answeredQuestions.fiscal_sponsor_accepted, true);
  assert.equal(updated.applicantType, null);
});

/* ------------------------------------------------------------- packet */

test('the application packet separates verified requirements from standard practice', () => {
  const result = buildResult({ id: 'a', text: OPEN, profileInput: PROFILE });
  const packet = buildApplicationPacket(result, result.profile, { now: NOW });

  assert.equal(packet.requiredDocuments.verified, false);
  assert.ok(packet.requiredDocuments.standardPractice.length > 0);
  assert.match(packet.requiredDocuments.note, /standard practice|not this funder/i);
  assert.equal(packet.applicationQuestions.verified, false);
  assert.match(packet.disclaimer, /funding decision is always the funder/i);
});

test('the packet contains every section the specification requires', () => {
  const result = buildResult({ id: 'a', text: OPEN, profileInput: PROFILE });
  const packet = buildApplicationPacket(result, result.profile, { now: NOW });
  for (const key of [
    'eligibilityChecklist', 'requiredDocuments', 'applicationQuestions', 'deadline', 'fundingAmount',
    'projectRequirements', 'strategy', 'timeline', 'proposalOutline', 'budgetOutline', 'missingInformation',
  ]) {
    assert.ok(packet[key] !== undefined, `packet is missing ${key}`);
  }
  assert.ok(packet.timeline.length > 0);
  assert.ok(packet.proposalOutline.length >= 6);
});

test('the packet tells the applicant to scope down when the cap is below their need', () => {
  const result = buildResult({ id: 'a', text: OPEN, profileInput: { ...PROFILE, fundingNeeded: 50000 }, awardMax: 8000 });
  const packet = buildApplicationPacket(result, result.profile, { now: NOW });
  assert.ok(packet.strategy.some((point) => /scoped piece/i.test(point.point + point.detail)));
  assert.match(packet.budgetOutline.note, /exceeds/);
});

test('the missing-information checklist distinguishes what to ask yourself from what to ask the funder', () => {
  const result = buildResult({ id: 'a', text: 'Applicants must be a registered 501(c)(3) organization.', profileInput: { applicantType: 'nonprofit', state: 'MD' } });
  const packet = buildApplicationPacket(result, result.profile, { now: NOW });
  assert.ok(packet.missingInformation.some((item) => item.askOf === 'you' && item.blocking));
  assert.ok(packet.missingInformation.some((item) => item.askOf === 'the funder'));
});

test('the eligibility checklist gives an action for every requirement', () => {
  const result = buildResult({ id: 'a', text: OPEN, profileInput: PROFILE });
  const packet = buildApplicationPacket(result, result.profile, { now: NOW });
  for (const item of packet.eligibilityChecklist) {
    assert.ok(item.action && item.action.length > 10, `${item.requirement} has no action`);
  }
});

/* --------------------------------------------------------------- store */

test('the store persists across instances and survives a corrupt file', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gme-store-'));
  try {
    const first = new Store(dir);
    first.saved.put({ id: 'saved:1', grantName: 'A Grant' });
    await first.flushAll();

    const second = new Store(dir);
    assert.equal(second.saved.get('saved:1').grantName, 'A Grant');
    assert.ok(second.saved.get('saved:1').createdAt);

    fs.writeFileSync(path.join(dir, 'tracker.json'), '{not json at all');
    const third = new Store(dir);
    assert.equal(third.tracker.count(), 0, 'a corrupt collection must not take the server down');
    assert.ok(fs.readdirSync(dir).some((name) => name.includes('corrupt')), 'the bad file is quarantined');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('stale records are identified for re-verification', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gme-stale-'));
  try {
    const store = new Store(dir);
    store.grants.put({ id: 'fresh', lastVerified: new Date().toISOString() });
    store.grants.put({ id: 'old', lastVerified: '2020-01-01T00:00:00Z' });
    store.grants.put({ id: 'never', lastVerified: null });
    const stale = store.staleGrants(72).map((grant) => grant.id).sort();
    assert.deepEqual(stale, ['never', 'old']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('difficulty feeds the easy-application pick', () => {
  const easy = buildResult({ id: 'easy', text: OPEN, profileInput: PROFILE, awardMax: 3000 });
  assert.equal(easy.difficulty.level, DIFFICULTY.EASY);
  const strategy = buildStrategy([easy], { excludedCount: 0 });
  assert.ok(strategy.picks.some((pick) => pick.key === 'easy' || pick.grantId === 'easy'));
});
