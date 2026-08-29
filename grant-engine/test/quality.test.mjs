/**
 * The quality filter is the system's fraud and staleness gate. Anything it
 * rejects must be rejected with a stated, auditable reason.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { assessQuality, REJECTION } from '../server/engine/quality.mjs';
import { assessConfidence, CONFIDENCE } from '../server/engine/confidence.mjs';
import { apiField, quoteField, absentField, unknownField, groundFields } from '../server/lib/evidence.mjs';
import { classifySource, TIER, domainMatchesFunder } from '../server/sources/registry.mjs';

const NOW = new Date('2026-08-29T00:00:00Z');
const stamp = NOW.toISOString();
const f = (value, url = 'https://foundation.example/apply') => apiField(value, { sourceUrl: url, fetchedAt: stamp });

const goodRecord = () => ({
  grantName: f('Youth STEM Grant'),
  funder: f('Openfield Family Foundation'),
  applicationUrl: f('https://foundation.example/apply'),
  deadline: f('2026-12-12'),
  awardMaximum: f(8000),
  awardMinimum: f(1000),
  eligibilityText: f('Individuals may apply.'),
  description: f('Supports youth robotics education.'),
  status: f('posted'),
  lastVerified: stamp,
  sourceUrls: ['https://foundation.example/apply'],
});

test('a well-sourced, currently open opportunity is accepted', () => {
  const quality = assessQuality(goodRecord(), { now: NOW });
  assert.equal(quality.accepted, true, JSON.stringify(quality.rejections));
});

test('an expired opportunity is rejected and never presented as available', () => {
  const record = { ...goodRecord(), deadline: f('2026-01-15') };
  const quality = assessQuality(record, { now: NOW });
  assert.equal(quality.accepted, false);
  assert.ok(quality.rejections.some((r) => r.code === REJECTION.EXPIRED));
  assert.match(quality.rejections.find((r) => r.code === REJECTION.EXPIRED).reason, /226 days ago/);
});

test('an opportunity with no identifiable funder is rejected', () => {
  const record = { ...goodRecord(), funder: absentField({ sourceUrl: 'https://x.example' }) };
  const quality = assessQuality(record, { now: NOW });
  assert.ok(quality.rejections.some((r) => r.code === REJECTION.NO_FUNDER));
});

test('a page charging an application fee or guaranteeing funding is rejected as a scam', () => {
  const text = 'You are guaranteed funding once your file is processed. A processing fee of $49 is required to release your grant funds.';
  const record = { ...goodRecord(), description: f(text) };
  const quality = assessQuality(record, { sourceTexts: new Map([['https://foundation.example/apply', text]]), now: NOW });
  assert.ok(quality.rejections.some((r) => r.code === REJECTION.PAYMENT_REQUIRED));
});

test('a repayable instrument is rejected as a loan, not surfaced as a grant', () => {
  const text = 'Funds must be repaid over 36 months at an interest rate of 8.9%.';
  const record = { ...goodRecord(), description: f(text) };
  const quality = assessQuality(record, { sourceTexts: new Map([['https://foundation.example/apply', text]]), now: NOW });
  assert.ok(quality.rejections.some((r) => r.code === REJECTION.IS_LOAN));
});

test('a contest is labelled rather than hidden', () => {
  const text = 'Winners are chosen through a pitch competition. Judges will select the winner in May.';
  const record = { ...goodRecord(), description: f(text) };
  const quality = assessQuality(record, { sourceTexts: new Map([['https://foundation.example/apply', text]]), now: NOW });
  assert.equal(quality.accepted, true);
  assert.ok(quality.labels.some((label) => label.code === 'contest'));
});

test('an opportunity known only from listing sites is rejected for lacking a primary source', () => {
  const url = 'https://grantwatch.com/some-grant';
  const listed = (value) => apiField(value, { sourceUrl: url, fetchedAt: stamp });
  const record = {
    grantName: listed('Listed Grant'),
    funder: listed('Some Foundation'),
    applicationUrl: listed(url),
    deadline: listed('2026-12-01'),
    awardMinimum: listed(500),
    awardMaximum: listed(5000),
    eligibilityText: listed('Open to all.'),
    description: listed('A grant.'),
    status: listed('posted'),
    lastVerified: stamp,
    sourceUrls: [url],
  };
  const quality = assessQuality(record, { now: NOW });
  assert.ok(quality.rejections.some((r) => r.code === REJECTION.NO_PRIMARY_SOURCE));
});

test('a source that produced fabricated quotes is rejected wholesale', () => {
  const grounding = { checked: 6, rejected: [{ reason: 'quote_not_found_in_source' }, { reason: 'quote_not_found_in_source' }, { reason: 'quote_not_found_in_source' }], fabricationRate: 0.5 };
  const quality = assessQuality(goodRecord(), { grounding, now: NOW });
  assert.ok(quality.rejections.some((r) => r.code === REJECTION.FABRICATION_DETECTED));
});

test('a record with nothing verified is rejected as unverifiable', () => {
  const empty = {
    grantName: unknownField(''), funder: unknownField(''), applicationUrl: unknownField(''),
    deadline: unknownField(''), eligibilityText: unknownField(''), description: unknownField(''),
    awardMaximum: unknownField(''), lastVerified: stamp, sourceUrls: ['https://foundation.example/x'],
  };
  const quality = assessQuality(empty, { now: NOW });
  assert.ok(quality.rejections.some((r) => r.code === REJECTION.UNVERIFIABLE));
});

test('a missing deadline is a warning, never a silent assumption that it is open', () => {
  const record = { ...goodRecord(), deadline: absentField({ sourceUrl: 'https://foundation.example/apply' }) };
  const quality = assessQuality(record, { now: NOW });
  assert.equal(quality.accepted, true);
  assert.ok(quality.warnings.some((w) => w.code === 'deadline_unverified'));
});

test('source confidence is computed independently of match quality', () => {
  const government = { ...goodRecord(), sourceUrls: ['https://www.grants.gov/x'] };
  for (const key of ['grantName', 'funder', 'applicationUrl', 'deadline', 'awardMaximum', 'eligibilityText']) {
    government[key] = apiField(government[key].value, { sourceUrl: 'https://www.grants.gov/x', fetchedAt: stamp });
  }
  assert.equal(assessConfidence(government, { now: NOW }).level, CONFIDENCE.HIGH);

  const thin = { ...goodRecord(), deadline: unknownField(''), awardMaximum: unknownField(''), eligibilityText: unknownField('') };
  const confidence = assessConfidence(thin, { now: NOW });
  assert.equal(confidence.level, CONFIDENCE.LOW);
  assert.deepEqual(confidence.unverifiedFields.sort(), ['Deadline', 'Eligibility rules', 'Maximum award']);
});

test('a stale record loses confidence even when it was once fully verified', () => {
  const old = { ...goodRecord(), lastVerified: '2026-08-01T00:00:00Z' };
  const confidence = assessConfidence(old, { staleAfterHours: 72, now: NOW });
  assert.equal(confidence.stale, true);
  assert.notEqual(confidence.level, CONFIDENCE.HIGH);
  assert.ok(confidence.reasons.some((reason) => /freshness window/.test(reason)));
});

test('domains are classified into trust tiers before any content is read', () => {
  assert.equal(classifySource('https://www.grants.gov/x').tier, TIER.OFFICIAL_GOVERNMENT);
  assert.equal(classifySource('https://gatesfoundation.org/x').tier, TIER.FUNDER_PRIMARY);
  assert.equal(classifySource('https://mit.edu/x').tier, TIER.INSTITUTIONAL);
  assert.equal(classifySource('https://grantwatch.com/x').tier, TIER.AGGREGATOR);
  assert.equal(classifySource('https://free-money-grants.biz/x').tier, TIER.UNTRUSTED);
});

test('an application URL that does not belong to the funder is detectable', () => {
  assert.equal(domainMatchesFunder('https://gatesfoundation.org/apply', 'Bill & Melinda Gates Foundation'), true);
  assert.equal(domainMatchesFunder('https://grantwatch.com/apply', 'Bill & Melinda Gates Foundation'), false);
});

test('grounding rejections that fall below the fabrication threshold only warn', () => {
  const grounding = { checked: 10, rejected: [{ reason: 'quote_not_found_in_source' }], fabricationRate: 0.1 };
  const quality = assessQuality(goodRecord(), { grounding, now: NOW });
  assert.equal(quality.accepted, true);
  assert.ok(quality.warnings.some((w) => w.code === 'grounding'));
});
