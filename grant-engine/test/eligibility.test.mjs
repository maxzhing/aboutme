/**
 * The eligibility engine must never guess. These tests pin the three verdicts
 * and, in particular, that an unknown answer produces UNCERTAIN rather than a
 * convenient pass.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { inferRequirements } from '../server/engine/requirements.mjs';
import { assessEligibility, STATUS, RESULT, daysUntil } from '../server/engine/eligibility.mjs';
import { groundFields, unknownField } from '../server/lib/evidence.mjs';
import { normalizeProfile, parseDescription } from '../server/engine/profile.mjs';

const NOW = new Date('2026-08-29T00:00:00Z');
const SOURCE = 'https://funder.example/eligibility';

function requirementsFrom(text) {
  const documents = [{ text, sourceUrl: SOURCE, fetchedAt: NOW.toISOString() }];
  return groundFields(inferRequirements(documents), new Map([[SOURCE, text]])).record;
}

const emptyRequirements = () => Object.fromEntries(
  Object.keys(requirementsFrom('Nothing relevant is stated on this page at all.')).map((key) => [key, unknownField('')]),
);

test('a stated hard requirement the applicant fails yields NOT ELIGIBLE', () => {
  const requirements = requirementsFrom('Applicants must be a registered 501(c)(3) organization. Individuals are not eligible to apply.');
  const profile = normalizeProfile({ applicantType: 'individual', is501c3: false });
  const result = assessEligibility(requirements, profile, { deadline: '2027-01-01' });
  assert.equal(result.status, STATUS.INELIGIBLE);
  assert.ok(result.hardFailures.length >= 1);
  assert.equal(result.certainty, 1, 'we are certain — the answer is simply no');
});

test('a stated requirement with an unknown applicant answer yields UNCERTAIN plus the exact question', () => {
  const requirements = requirementsFrom('Applicants must be a registered 501(c)(3) organization.');
  const profile = normalizeProfile({ applicantType: 'nonprofit' });
  const result = assessEligibility(requirements, profile, { deadline: '2027-01-01' });
  assert.equal(result.status, STATUS.UNCERTAIN);
  const nonprofitQuestion = result.openQuestions.find((question) => question.field === 'is501c3');
  assert.ok(nonprofitQuestion, 'the 501(c)(3) question must be asked');
  assert.match(nonprofitQuestion.text, /501\(c\)\(3\)/);
  // "must be a registered 501(c)(3) organization" states two rules, so the
  // engine legitimately needs the organization's legal status as well.
  assert.ok(result.openQuestions.some((question) => question.field === 'organizationStatus'));
});

test('ELIGIBLE requires positive confirmation, not merely the absence of conflict', () => {
  const requirements = emptyRequirements();
  const profile = normalizeProfile({ applicantType: 'individual', state: 'MD' });
  const result = assessEligibility(requirements, profile, { deadline: null });
  assert.equal(result.status, STATUS.UNCERTAIN);
  assert.match(result.summary, /could be read|does not conflict|positively confirms/i);
});

test('ELIGIBLE is awarded when stated requirements are met', () => {
  const requirements = requirementsFrom(
    'Individuals may apply. Students aged 14 and older are eligible to apply directly. Applicants must be located in Maryland.',
  );
  const profile = normalizeProfile({ applicantType: 'student', state: 'MD', age: 16 });
  const result = assessEligibility(requirements, profile, { deadline: '2026-12-12' });
  assert.equal(result.status, STATUS.ELIGIBLE);
  assert.ok(result.checks.some((c) => c.id === 'age_min' && c.result === RESULT.PASS));
  assert.ok(result.checks.some((c) => c.id === 'geography' && c.result === RESULT.PASS));
});

test('a geographic restriction elsewhere is disqualifying', () => {
  const requirements = requirementsFrom('Individuals may apply. Applicants must be located in Oregon.');
  const profile = normalizeProfile({ applicantType: 'individual', state: 'MD' });
  const result = assessEligibility(requirements, profile, { deadline: '2027-01-01' });
  assert.equal(result.status, STATUS.INELIGIBLE);
  assert.match(result.hardFailures[0].reason, /Oregon/);
});

test('an age floor above the applicant is disqualifying', () => {
  const requirements = requirementsFrom('Individuals may apply. Applicants must be at least 18 years of age.');
  const profile = normalizeProfile({ applicantType: 'individual', age: 16 });
  const result = assessEligibility(requirements, profile, { deadline: '2027-01-01' });
  assert.equal(result.status, STATUS.INELIGIBLE);
  assert.match(result.hardFailures[0].reason, /at least 18/);
});

test('a passed deadline makes an otherwise perfect applicant ineligible', () => {
  const requirements = requirementsFrom('Individuals may apply. Applicants must be located in Maryland.');
  const profile = normalizeProfile({ applicantType: 'individual', state: 'MD' });
  const result = assessEligibility(requirements, profile, { deadline: '2026-01-15' });
  assert.equal(result.status, STATUS.INELIGIBLE);
});

test('matching funds is a risk, not a disqualification', () => {
  const requirements = requirementsFrom('Individuals may apply. Matching funds of 1:1 are required.');
  const profile = normalizeProfile({ applicantType: 'individual' });
  const result = assessEligibility(requirements, profile, { deadline: '2027-01-01' });
  const check = result.checks.find((c) => c.id === 'matching_funds');
  assert.equal(check.blocking, false);
  assert.equal(check.result, RESULT.UNKNOWN_APPLICANT);
  assert.ok(result.risks.some((r) => r.id === 'matching_funds'));
});

test('an open-ended applicant list neither includes nor excludes an unlisted type', () => {
  const requirements = groundFields(
    inferRequirements([], {
      applicantTypeDescriptions: [
        'Public and State controlled institutions of higher education',
        'Others (see text field entitled Additional Information for Eligibility)',
      ],
      structured: { sourceUrl: SOURCE, fetchedAt: NOW.toISOString() },
    }),
    new Map(),
  ).record;
  const profile = normalizeProfile({ applicantType: 'student' });
  const result = assessEligibility(requirements, profile, { deadline: '2027-01-01' });
  assert.equal(result.status, STATUS.UNCERTAIN);
  assert.match(result.checks.find((c) => c.id === 'applicant_type').reason, /open-ended/);
});

test('a closed applicant list excludes an unlisted type outright', () => {
  const requirements = groundFields(
    inferRequirements([], {
      applicantTypeDescriptions: ['Nonprofits having a 501(c)(3) status with the IRS, other than institutions of higher education'],
      structured: { sourceUrl: SOURCE, fetchedAt: NOW.toISOString() },
    }),
    new Map(),
  ).record;
  const result = assessEligibility(requirements, normalizeProfile({ applicantType: 'student' }), { deadline: '2027-01-01' });
  assert.equal(result.status, STATUS.INELIGIBLE);
});

test('an entity-type requirement excludes an applicant of the wrong kind', () => {
  const requirements = requirementsFrom('Applicants must be a public school, charter school or school district.');
  const student = assessEligibility(requirements, normalizeProfile({ applicantType: 'student' }), { deadline: '2027-01-01' });
  assert.equal(student.status, STATUS.INELIGIBLE);
  assert.match(student.hardFailures[0].reason, /limited to school/);

  const school = assessEligibility(requirements, normalizeProfile({ applicantType: 'school' }), { deadline: '2027-01-01' });
  assert.notEqual(school.status, STATUS.INELIGIBLE);
});

test('a university-affiliation requirement excludes a business', () => {
  const requirements = requirementsFrom('Applicants must be affiliated with an accredited institution of higher education.');
  assert.deepEqual(requirements.allowedApplicantTypes.value.sort(), ['researcher', 'school']);
  const business = assessEligibility(requirements, normalizeProfile({ applicantType: 'small_business' }), { deadline: '2027-01-01' });
  assert.equal(business.status, STATUS.INELIGIBLE);
});

test('an age or size requirement is not mistaken for an entity-type requirement', () => {
  assert.equal(requirementsFrom('Applicants must be at least 18 years of age.').allowedApplicantTypes.value, null);
  assert.equal(requirementsFrom('Applicants must be a registered business with fewer than 25 employees.').allowedApplicantTypes.value, null);
});

test('every requirement is traceable to the sentence that states it', () => {
  const text = 'Applicants must be a registered 501(c)(3) organization.';
  const requirements = requirementsFrom(text);
  assert.equal(requirements.requires501c3.quote, text);
  assert.equal(requirements.requires501c3.sourceUrl, SOURCE);
  assert.equal(requirements.requires501c3.verified, true);
});

test('the spec example — a student and a 501(c)(3)-only STEM grant — is excluded despite a perfect topic match', () => {
  const text = 'This program supports STEM education and youth robotics outreach. '
    + 'Applicants must be a registered 501(c)(3) organization. Individuals are not eligible to apply.';
  const profile = parseDescription(
    "I'm a high school student interested in robotics. I want funding to start a STEM outreach program "
    + 'for younger students in Maryland and need about $5,000.',
  );
  const result = assessEligibility(requirementsFrom(text), profile, { deadline: '2027-03-01' });
  assert.equal(result.status, STATUS.INELIGIBLE);
});

test('daysUntil counts whole days and reports past deadlines as negative', () => {
  assert.equal(daysUntil('2026-08-30', NOW), 1);
  assert.equal(daysUntil('2026-08-28', NOW), -1);
  assert.equal(daysUntil(null, NOW), null);
  assert.equal(daysUntil('not a date', NOW), null);
});
