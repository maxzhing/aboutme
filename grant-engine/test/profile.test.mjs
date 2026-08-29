/**
 * Profile parsing. The system's promise is that it never fills in a detail the
 * applicant did not give it, so these tests check both what is extracted and
 * what is deliberately left null.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDescription, normalizeProfile, emptyProfile, parseMoney,
  normalizeState, extractKeywords, missingProfileFields,
} from '../server/engine/profile.mjs';
import { expandConcepts, matchedConceptIds } from '../server/engine/concepts.mjs';
import { buildSearchStrategies, buildFederalKeywords, condenseDescription, formatAmountBand } from '../server/engine/queries.mjs';

const SPEC_EXAMPLE = "I'm a high school student interested in robotics. I want funding to start a "
  + 'STEM outreach program for younger students in Maryland and need about $5,000.';

test('the specification example parses without a language model', () => {
  const profile = parseDescription(SPEC_EXAMPLE);
  assert.equal(profile.applicantType, 'student');
  assert.equal(profile.educationLevel, 'high_school');
  assert.equal(profile.state, 'MD');
  assert.equal(profile.country, 'US');
  assert.equal(profile.fundingNeeded, 5000);
  assert.ok(profile.fundingPurpose.includes('program_delivery'));
  assert.ok(profile.fieldIndustry.includes('stem_education'));
  assert.ok(profile.keywords.length >= 5);
});

test('details the applicant did not give stay null', () => {
  const profile = parseDescription(SPEC_EXAMPLE);
  assert.equal(profile.age, null, 'age must not be inferred from "high school student"');
  assert.equal(profile.citizenship, null);
  assert.equal(profile.is501c3, null);
  assert.equal(profile.organizationStatus, null);
  assert.deepEqual(profile.demographics, {});
});

test('an empty profile has every key present and every value unknown', () => {
  const profile = emptyProfile();
  for (const [key, value] of Object.entries(profile)) {
    if (Array.isArray(value)) assert.equal(value.length, 0, `${key} should start empty`);
    else if (key === 'deadlinePreference') assert.equal(value, 'any');
    else if (key === 'demographics' || key === 'answeredQuestions') assert.deepEqual(value, {});
    else assert.equal(value, null, `${key} should start unknown`);
  }
});

test('501(c)(3) status is read when stated, in either direction', () => {
  assert.equal(parseDescription('We are a registered 501(c)(3) food pantry.').is501c3, true);
  assert.equal(parseDescription('We are not a nonprofit, just a group of neighbors.').is501c3, false);
  assert.equal(parseDescription('We run a food pantry.').is501c3, null);
});

test('money is parsed in the forms people actually write', () => {
  assert.equal(parseMoney('$5,000'), 5000);
  assert.equal(parseMoney('5k'), 5000);
  assert.equal(parseMoney('$1.2 million'), 1_200_000);
  assert.equal(parseMoney('40000'), 40000);
  assert.equal(parseMoney('not a number'), null);
  assert.equal(parseMoney(null), null);
});

test('a stated dollar range is captured as a range', () => {
  const profile = parseDescription('We need somewhere between $10,000 and $25,000 for the program.');
  assert.equal(profile.fundingRangeMin, 10000);
  assert.equal(profile.fundingRangeMax, 25000);
});

test('states are normalized from names and codes, and nothing else', () => {
  assert.equal(normalizeState('Maryland'), 'MD');
  assert.equal(normalizeState('md'), 'MD');
  assert.equal(normalizeState('Freedonia'), null);
  assert.equal(normalizeState(''), null);
});

test('normalizeProfile rejects values outside the controlled vocabulary', () => {
  const profile = normalizeProfile({ applicantType: 'wizard', organizationStatus: 'made up', fundingPurpose: ['equipment', 'nonsense'] });
  assert.equal(profile.applicantType, null);
  assert.equal(profile.organizationStatus, null);
  assert.deepEqual(profile.fundingPurpose, ['equipment']);
});

test('declaring 501(c)(3) organization status implies the flag', () => {
  assert.equal(normalizeProfile({ organizationStatus: 'nonprofit_501c3' }).is501c3, true);
});

test('missing fields are reported so the interface can ask rather than assume', () => {
  const missing = missingProfileFields(parseDescription(SPEC_EXAMPLE)).map((entry) => entry.key);
  assert.ok(missing.includes('age'), 'age matters for a student applicant');
  assert.ok(!missing.includes('state'));
});

test('concept expansion translates applicant words into funder vocabulary', () => {
  const concepts = expandConcepts('Teaching coding to kids after school');
  assert.ok(concepts.includes('computer science education'));
  assert.ok(concepts.includes('digital literacy'));
  assert.ok(concepts.some((term) => /youth/i.test(term)));
  assert.ok(!concepts.includes('teaching coding to kids'), 'expansion must add funder terms, not echo the input');
});

test('concept cues that require co-occurrence do not fire on one word alone', () => {
  assert.ok(!matchedConceptIds('I write code for a living').includes('cs_education'));
  assert.ok(matchedConceptIds('I teach code to children').includes('cs_education'));
});

test('ten distinct search strategies are generated, each with a rationale', () => {
  const strategies = buildSearchStrategies(parseDescription(SPEC_EXAMPLE));
  assert.equal(strategies.length, 10);
  assert.equal(new Set(strategies.map((s) => s.query)).size, 10, 'every strategy must produce a different query');
  assert.equal(new Set(strategies.map((s) => s.id)).size, 10);
  for (const strategy of strategies) {
    assert.ok(strategy.rationale.length > 20, `${strategy.id} needs a user-facing rationale`);
    assert.ok(strategy.query.length > 3);
  }
});

test('the geography strategy names the applicant\'s state and the award strategy their amount band', () => {
  const strategies = buildSearchStrategies(parseDescription(SPEC_EXAMPLE));
  assert.match(strategies.find((s) => s.id === 'geography').query, /Maryland/);
  assert.match(strategies.find((s) => s.id === 'award_size').query, /\$1,000 to \$5,000/);
});

test('first-person framing is stripped from the literal query', () => {
  const condensed = condenseDescription(SPEC_EXAMPLE);
  assert.ok(!/I'm|I want|\$/.test(condensed), `still framed: ${condensed}`);
  assert.match(condensed, /STEM outreach program/);
});

test('amount bands map to the phrasing funders use', () => {
  assert.match(formatAmountBand(500), /micro/);
  assert.match(formatAmountBand(5000), /\$1,000 to \$5,000/);
  assert.match(formatAmountBand(1_000_000), /major/);
});

test('federal keywords are short phrases, not a whole sentence', () => {
  const keywords = buildFederalKeywords(parseDescription(SPEC_EXAMPLE));
  assert.ok(keywords.length >= 3);
  for (const keyword of keywords) assert.ok(keyword.length < 40, `too long for a keyword API: ${keyword}`);
});

test('keyword extraction favours phrases and drops filler', () => {
  const keywords = extractKeywords('I want to start a robotics club for students');
  assert.ok(!keywords.includes('want'));
  assert.ok(keywords.some((keyword) => keyword.includes(' ')));
});
