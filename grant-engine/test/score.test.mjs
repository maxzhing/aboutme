/**
 * Scoring. The critical property is the gate: a failed hard requirement must
 * drive the overall score to zero regardless of how well the project aligns.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreMatch, WEIGHTS, topicalOverlap, tokenize } from '../server/engine/score.mjs';
import { assessEligibility, STATUS } from '../server/engine/eligibility.mjs';
import { inferRequirements } from '../server/engine/requirements.mjs';
import { groundFields, apiField } from '../server/lib/evidence.mjs';
import { parseDescription, normalizeProfile } from '../server/engine/profile.mjs';

const NOW = new Date('2026-08-29T00:00:00Z');
const SOURCE = 'https://funder.example/g';

const field = (value) => apiField(value, { sourceUrl: SOURCE, fetchedAt: NOW.toISOString() });

function build(text, profileInput) {
  const requirements = groundFields(
    inferRequirements([{ text, sourceUrl: SOURCE, fetchedAt: NOW.toISOString() }]),
    new Map([[SOURCE, text]]),
  ).record;
  const profile = typeof profileInput === 'string' ? parseDescription(profileInput) : normalizeProfile(profileInput);
  const record = {
    grantName: field('Youth STEM Robotics Outreach Grant'),
    description: field(text),
    eligibilityText: field(text),
    awardMinimum: field(2000),
    awardMaximum: field(10000),
    deadline: field('2026-11-20'),
    funderType: field('foundation'),
  };
  const eligibility = assessEligibility(requirements, profile, { deadline: '2026-11-20' });
  return { score: scoreMatch(record, profile, eligibility, { now: NOW }), eligibility };
}

test('the component weights sum to exactly 1', () => {
  const total = Object.values(WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `weights sum to ${total}`);
});

test('the weights match the published specification', () => {
  assert.deepEqual(WEIGHTS, {
    eligibilityCertainty: 0.30,
    missionAlignment: 0.25,
    geographicAlignment: 0.10,
    applicantTypeAlignment: 0.10,
    fundingPurposeAlignment: 0.10,
    awardSizeSuitability: 0.05,
    deadlineFeasibility: 0.05,
    historicalFundingAlignment: 0.05,
  });
});

test('a strong mission match with a failed hard requirement scores 0 overall', () => {
  const text = 'This program supports STEM education, robotics and youth outreach programs in Maryland. '
    + 'Applicants must be a registered 501(c)(3) organization. Individuals are not eligible to apply.';
  const { score, eligibility } = build(
    text,
    "I'm a high school student in Maryland starting a STEM robotics outreach program for younger students, need $5,000.",
  );
  assert.equal(eligibility.status, STATUS.INELIGIBLE);
  assert.equal(score.overall, 0, 'similarity must never override a failed requirement');
  assert.ok(score.components.missionAlignment.percent >= 60, 'the mission subscore stays visibly high');
  assert.equal(score.gated, true);
  assert.ok(score.rawScore > 0, 'the ungated score is retained so the contradiction is auditable');
  assert.match(score.gateReason, /mandatory requirement/i);
});

test('an eligible applicant with the same project scores well', () => {
  const text = 'This program supports STEM education, robotics and youth outreach programs. '
    + 'Individuals may apply. Applicants must be located in Maryland.';
  const { score, eligibility } = build(
    text,
    "I'm a high school student in Maryland starting a STEM robotics outreach program for younger students, need $5,000.",
  );
  assert.equal(eligibility.status, STATUS.ELIGIBLE);
  assert.ok(score.overall >= 60, `expected a strong score, got ${score.overall}`);
  assert.equal(score.gated, false);
});

test('unknown components are scored neutrally and named as unassessed', () => {
  const { score } = build('Individuals may apply. Applicants must be located in Maryland.', { applicantType: 'individual', state: 'MD' });
  assert.ok(score.unassessedComponents.includes('Historical funding alignment'));
  assert.equal(score.components.historicalFundingAlignment.known, false);
  assert.equal(score.components.historicalFundingAlignment.score, 0.5);
  assert.match(score.components.historicalFundingAlignment.rationale, /unassessed|no verified record/i);
});

test('every component carries a human explanation and its weight', () => {
  const { score } = build('Individuals may apply.', { applicantType: 'individual' });
  for (const [key, component] of Object.entries(score.components)) {
    assert.ok(component.rationale && component.rationale.length > 10, `${key} lacks a rationale`);
    assert.equal(component.weight, WEIGHTS[key]);
    assert.ok(component.percent >= 0 && component.percent <= 100);
  }
});

test('award-size suitability rewards a request inside the range and penalises one outside it', () => {
  const inside = build('Individuals may apply.', { applicantType: 'individual', fundingNeeded: 5000 });
  const outside = build('Individuals may apply.', { applicantType: 'individual', fundingNeeded: 400000 });
  assert.equal(inside.score.components.awardSizeSuitability.percent, 100);
  assert.ok(outside.score.components.awardSizeSuitability.percent < 20);
  assert.match(outside.score.components.awardSizeSuitability.rationale, /less than/i);
});

test('topical overlap is recall-oriented and reports what matched', () => {
  const { score, matched } = topicalOverlap(['stem education', 'robotics'], 'Our STEM education fund supports robotics clubs.');
  assert.equal(score, 1);
  assert.deepEqual(matched.sort(), ['robotics', 'stem education']);
  assert.equal(topicalOverlap(['aquaculture'], 'Our STEM education fund.').score, 0);
});

test('tokenizing drops grant-domain filler that would match everything', () => {
  const tokens = tokenize('The grant program supports robotics education');
  assert.ok(!tokens.includes('grant'));
  assert.ok(!tokens.includes('program'));
  assert.ok(tokens.includes('robotics'));
});
