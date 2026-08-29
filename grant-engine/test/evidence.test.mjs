/**
 * The anti-hallucination core. If these tests pass, no fact can reach a user
 * unless the words supporting it are literally present on the page we fetched.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  quoteField, apiField, derivedField, absentField, unknownField,
  groundField, groundFields, isVerified, valueOf, normalizeForMatch,
  citationsOf, GROUND_FAILURE, PROVENANCE,
} from '../server/lib/evidence.mjs';

const URL_A = 'https://funder.example/guidelines';
const PAGE = 'Eligibility. Applicants must be a registered 501(c)(3) organization. '
  + 'Awards range from $2,500 to $15,000. Deadline: applications are due November 14, 2026.';
const texts = new Map([[URL_A, PAGE]]);

test('a quote found verbatim in the source verifies the fact', () => {
  const field = quoteField('2026-11-14', {
    sourceUrl: URL_A,
    quote: 'Deadline: applications are due November 14, 2026.',
    fetchedAt: 'now',
  });
  const grounded = groundField(field, texts);
  assert.equal(grounded.verified, true);
  assert.equal(grounded.value, '2026-11-14');
  assert.equal(grounded.groundFailure, null);
});

test('a fabricated quote destroys the fact and strips the value', () => {
  const field = quoteField('2027-03-01', {
    sourceUrl: URL_A,
    quote: 'Deadline: applications are due March 1, 2027.',
    fetchedAt: 'now',
  });
  const grounded = groundField(field, texts);
  assert.equal(grounded.verified, false);
  assert.equal(grounded.value, null, 'the value must be unreadable, not merely flagged');
  assert.equal(grounded.groundFailure, GROUND_FAILURE.NOT_FOUND);
  assert.equal(grounded.unverifiedClaim, '2027-03-01', 'the discarded claim is retained for the audit trail');
});

test('a paraphrase is treated as fabrication', () => {
  const field = quoteField(15000, {
    sourceUrl: URL_A,
    quote: 'Awards are between $2,500 and $15,000.',
    fetchedAt: 'now',
  });
  assert.equal(groundField(field, texts).verified, false);
});

test('formatting differences do not count as fabrication', () => {
  const field = quoteField(15000, {
    sourceUrl: URL_A,
    quote: 'Awards   range from $2,500 to  $15,000.',
    fetchedAt: 'now',
  });
  assert.equal(groundField(field, texts).verified, true);
});

test('curly quotes, non-breaking spaces and unicode dashes normalize to the same text', () => {
  assert.equal(normalizeForMatch('“Don’t stop—now”'), normalizeForMatch('"Don\'t stop-now"'));
});

test('a fact with no quote, or too short a quote, cannot verify', () => {
  assert.equal(groundField(quoteField('x', { sourceUrl: URL_A, quote: null }), texts).groundFailure, GROUND_FAILURE.NO_QUOTE);
  assert.equal(groundField(quoteField('x', { sourceUrl: URL_A, quote: 'due soon' }), texts).groundFailure, GROUND_FAILURE.TOO_SHORT);
});

test('a quote attributed to a page we never downloaded cannot verify', () => {
  const field = quoteField('x', { sourceUrl: 'https://other.example/x', quote: 'Applicants must be a registered 501(c)(3) organization.' });
  assert.equal(groundField(field, texts).groundFailure, GROUND_FAILURE.NO_SOURCE_TEXT);
});

test('API-provenance facts bypass quote checking because no model produced them', () => {
  const field = apiField(5000, { sourceUrl: 'https://api.example/x', fetchedAt: 'now', apiPath: 'awardFloor' });
  assert.equal(isVerified(field), true);
  assert.equal(groundField(field, new Map()).verified, true, 'grounding must not strip structured API values');
});

test('absent and unknown fields never carry a value', () => {
  assert.equal(valueOf(absentField({ sourceUrl: URL_A })), null);
  assert.equal(valueOf(unknownField('not checked')), null);
  assert.equal(isVerified(derivedField(3, { from: ['deadline'] })), true);
});

test('valueOf refuses to return an unverified value', () => {
  const unverified = quoteField('never confirmed', { sourceUrl: URL_A, quote: 'not on the page at all, truly' });
  assert.equal(valueOf(unverified), null, 'an ungrounded field must read as unknown, not as its claim');
});

test('groundFields walks nested records and reports the fabrication rate', () => {
  const record = {
    grantName: quoteField('Real Grant', { sourceUrl: URL_A, quote: 'Applicants must be a registered 501(c)(3) organization.' }),
    nested: {
      deadline: quoteField('2099-01-01', { sourceUrl: URL_A, quote: 'Deadline: applications are due January 1, 2099.' }),
    },
    list: [quoteField(15000, { sourceUrl: URL_A, quote: 'Awards range from $2,500 to $15,000.' })],
    untouched: 'plain string',
  };
  const { record: grounded, rejected, checked, fabricationRate } = groundFields(record, texts);
  assert.equal(checked, 3);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].path, 'nested.deadline');
  assert.equal(grounded.nested.deadline.value, null);
  assert.equal(grounded.list[0].verified, true);
  assert.equal(grounded.untouched, 'plain string');
  assert.ok(Math.abs(fabricationRate - 1 / 3) < 1e-9);
});

test('citations list only verified sources and their quotes', () => {
  const { record } = groundFields({
    good: quoteField('a', { sourceUrl: URL_A, quote: 'Awards range from $2,500 to $15,000.', fetchedAt: '2026-08-01' }),
    bad: quoteField('b', { sourceUrl: URL_A, quote: 'A sentence that is nowhere on this page.' }),
  }, texts);
  const citations = citationsOf(record);
  assert.equal(citations.length, 1);
  assert.equal(citations[0].quotes.length, 1);
  assert.equal(citations[0].quotes[0], 'Awards range from $2,500 to $15,000.');
});

test('provenance vocabulary is stable', () => {
  assert.deepEqual(Object.values(PROVENANCE).sort(), ['absent', 'api', 'derived', 'quote']);
});
