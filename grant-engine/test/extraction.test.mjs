/**
 * Page reading: HTML extraction, the deterministic grant extractor, deadline
 * intelligence, deduplication and robots handling.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { htmlToText, extractTitle, extractHeading, extractLinks, decodeEntities, findApplicationPageLink, groundingTextOf } from '../server/sources/page.mjs';
import { patternExtract, parseHumanDate, parseAmount } from '../server/ai/extract.mjs';
import { groundFields } from '../server/lib/evidence.mjs';
import { deadlineInfo, buildTimeline, sortResults, URGENCY, applyDeadlineFilter } from '../server/engine/deadline.mjs';
import { canonicalUrl, dedupeLeads, dedupeRecords, titleKey, mergeRecords } from '../server/engine/dedupe.mjs';
import { parseRobots, isPathAllowed } from '../server/lib/http.mjs';
import { apiField, quoteField, unknownField } from '../server/lib/evidence.mjs';
import { parseGrantsGovDate, toGrantRecord, applicantTypeDescriptions } from '../server/sources/grantsgov.mjs';
import { assessDifficulty, assessCompetition, COMPETITION, DIFFICULTY } from '../server/engine/assessment.mjs';

const NOW = new Date('2026-08-29T00:00:00Z');

/* --------------------------------------------------------------- HTML */

test('scripts, styles and head metadata are stripped but all body prose survives', () => {
  const html = '<html><head><title>T</title><meta name="d" content="hidden"></head><body>'
    + '<script>evil()</script><style>.a{}</style><p>Deadline: March 1, 2027</p><p>Awards up to $5,000</p></body></html>';
  const text = htmlToText(html);
  assert.ok(!text.includes('evil'));
  assert.ok(!text.includes('hidden'), 'meta description must not become quotable "page text"');
  assert.ok(text.includes('Deadline: March 1, 2027'));
  assert.ok(text.includes('Awards up to $5,000'));
});

test('block boundaries become newlines so unrelated cells cannot merge into one quote', () => {
  const text = htmlToText('<table><tr><td>Deadline</td><td>March 1</td></tr><tr><td>Award</td><td>$5,000</td></tr></table>');
  assert.ok(!/March 1 Award/.test(text), 'adjacent rows must not run together');
});

test('entities decode, including numeric ones', () => {
  assert.equal(decodeEntities('Apply &amp; win &#8212; &quot;now&quot; &#x2014;'), 'Apply & win — "now" —');
});

test('links resolve to absolute URLs and the guidelines page is preferred', () => {
  const html = '<a href="/news">Latest news</a><a href="/guidelines">Eligibility &amp; Guidelines</a><a href="/donate">Donate</a>';
  const links = extractLinks(html, 'https://f.example/grants');
  assert.deepEqual(links.map((link) => link.url), ['https://f.example/news', 'https://f.example/guidelines', 'https://f.example/donate']);
  assert.equal(findApplicationPageLink({ url: 'https://f.example/grants', finalUrl: 'https://f.example/grants', links }), 'https://f.example/guidelines');
});

test('the page title is read separately from body text', () => {
  assert.equal(extractTitle('<html><head><title>Apply &amp; Win</title></head><body>x</body></html>'), 'Apply & Win');
});

/* ---------------------------------------------------- pattern extraction */

const PAGE = {
  url: 'https://f.example/g',
  finalUrl: 'https://f.example/g',
  fetchedAt: NOW.toISOString(),
  title: 'Youth STEM Grant',
  text: 'Youth STEM Innovation Grant Program\n'
    + 'The Openfield Family Foundation supports hands-on science learning for students across the region.\n'
    + 'Eligibility: Applicants must be a registered 501(c)(3) organization.\n'
    + 'Awards range from $2,500 to $15,000.\n'
    + 'Deadline: applications are due November 14, 2026.\n'
    + 'Required documents: a project narrative, a line-item budget, and your IRS determination letter.',
};

test('the deterministic extractor produces facts that all ground against the page', () => {
  const { record, rejected } = groundFields(patternExtract(PAGE, { now: NOW }), new Map([[PAGE.url, PAGE.text]]));
  assert.equal(rejected.length, 0, 'the pattern extractor must never claim a quote it did not find');
  assert.equal(record.grantName.value, 'Youth STEM Innovation Grant Program');
  assert.equal(record.funder.value, 'The Openfield Family Foundation');
  assert.equal(record.deadline.value, '2026-11-14');
  assert.equal(record.awardMinimum.value, 2500);
  assert.equal(record.awardMaximum.value, 15000);
  assert.deepEqual(record.requiredDocuments.value, ['a project narrative', 'a line-item budget', 'your IRS determination letter']);
});

test('the page heading names the opportunity, and grounds against the page', () => {
  const html = '<html><head><title>Youth Innovation Prize — Summit Council</title></head><body>'
    + '<h1>Youth Innovation Prize</h1><p>The Summit Education Council runs an annual competition.</p></body></html>';
  const heading = extractHeading(html);
  assert.equal(heading, 'Youth Innovation Prize');

  const text = htmlToText(html);
  const title = extractTitle(html);
  const page = { url: 'https://s.example/p', finalUrl: 'https://s.example/p', fetchedAt: NOW.toISOString(), title, heading, text };
  const grounding = groundFields(patternExtract(page, { now: NOW }), new Map([[page.url, groundingTextOf({ title, heading, text })]]));

  assert.equal(grounding.record.grantName.value, 'Youth Innovation Prize');
  assert.equal(grounding.rejected.length, 0, 'the title and heading are part of the page and must be verifiable');
});

test('the grounding corpus includes the title and heading, which the body text excludes', () => {
  const combined = groundingTextOf({ title: 'A Title', heading: 'A Heading', text: 'Body prose.' });
  assert.match(combined, /A Title/);
  assert.match(combined, /A Heading/);
  assert.match(combined, /Body prose/);
});

test('the application URL is provenanced to the fetch, not to a quote', () => {
  const record = patternExtract(PAGE, { now: NOW });
  assert.equal(record.applicationUrl.provenance, 'api');
  assert.equal(record.applicationUrl.verified, true);
  assert.equal(record.applicationUrl.quote, null, 'a heading does not state a URL');
  assert.match(record.applicationUrl.apiPath, /fetched from/);
});

test('a grant is not attributed to itself as its own funder', () => {
  const guidelines = {
    ...PAGE,
    text: 'Robotics Access Fund Guidelines\n'
      + 'The Brightline Foundation supports youth robotics and STEM education projects.\n'
      + 'Individuals may apply. Applicants must be located in Maryland.',
  };
  const record = patternExtract(guidelines, { now: NOW });
  assert.equal(record.grantName.value, 'Robotics Access Fund', 'a "Guidelines" suffix names the page, not the grant');
  assert.equal(record.funder.value, 'The Brightline Foundation');
});

test('no funder is asserted when the page never names one', () => {
  const anonymous = { ...PAGE, text: 'Community Arts Grant Program\nWe are a small collective with no formal name here.' };
  const record = patternExtract(anonymous, { now: NOW });
  assert.equal(record.funder.value, null);
  assert.equal(record.funder.verified, false);
  assert.match(record.funder.note, /No funder name was stated/);
});

test('the extractor leaves fields absent rather than inventing them', () => {
  const sparse = { ...PAGE, text: 'We are a foundation. We care about many things in the world today.' };
  const record = patternExtract(sparse, { now: NOW });
  assert.equal(record.deadline.value, null);
  assert.equal(record.deadline.provenance, 'absent');
  assert.match(record.deadline.note, /No deadline sentence/);
  assert.equal(record.awardMaximum.value, null);
});

test('a rolling deadline is recorded as rolling, not as a missing deadline', () => {
  const rolling = { ...PAGE, text: 'Grant Program\nApplications are accepted on a rolling basis throughout the year.' };
  const record = patternExtract(rolling, { now: NOW });
  assert.equal(record.isRolling.value, true);
  assert.equal(record.deadline.value, null);
});

test('"up to" and "at least" are read as one-sided bounds', () => {
  const capped = patternExtract({ ...PAGE, text: 'Grant Program\nAwards of up to $10,000 are available to schools.' }, { now: NOW });
  assert.equal(capped.awardMaximum.value, 10000);
  assert.equal(capped.awardMinimum.value, null);
});

test('a date without a year is refused rather than guessed', () => {
  assert.equal(parseHumanDate('Applications are due March 1.'), null);
  assert.equal(parseHumanDate('due November 14, 2026'), '2026-11-14');
  assert.equal(parseHumanDate('14 November 2026'), '2026-11-14');
  assert.equal(parseHumanDate('2026-11-14'), '2026-11-14');
  assert.equal(parseHumanDate('11/14/2026'), '2026-11-14');
  assert.equal(parseHumanDate('the thirtieth of never'), null);
});

test('amounts parse with magnitude suffixes', () => {
  assert.equal(parseAmount('$2,500'), 2500);
  assert.equal(parseAmount('$1.5 million'), 1_500_000);
  assert.equal(parseAmount('$10k'), 10_000);
  assert.equal(parseAmount('no money here'), null);
});

/* ----------------------------------------------------------- grants.gov */

test('grants.gov dates parse from both endpoint formats', () => {
  assert.equal(parseGrantsGovDate('11202026'), '2026-11-20');
  assert.equal(parseGrantsGovDate('2026-11-20'), '2026-11-20');
  assert.equal(parseGrantsGovDate('11/20/2026'), '2026-11-20');
  assert.equal(parseGrantsGovDate(''), null);
});

test('applicant types keep the government\'s own wording rather than a guessed code map', () => {
  const detail = { synopsis: { applicantTypes: [{ id: '12', description: 'Nonprofits having a 501(c)(3) status with the IRS' }] } };
  assert.deepEqual(applicantTypeDescriptions(detail), ['Nonprofits having a 501(c)(3) status with the IRS']);
});

test('a grants.gov record marks structured values as API provenance and unknowns as unknown', () => {
  const record = toGrantRecord(
    { id: 1, title: 'A Grant', agencyName: 'Agency', closeDate: '11202026', oppStatus: 'posted' },
    { synopsis: { awardCeiling: '50000', responseDate: '2026-11-20' } },
    { fetchedAt: NOW.toISOString() },
  );
  assert.equal(record.grantName.provenance, 'api');
  assert.equal(record.grantName.verified, true);
  assert.equal(record.awardMaximum.value, 50000);
  assert.equal(record.ageRequirement.value, null);
  assert.equal(record.ageRequirement.verified, false);
});

/* ------------------------------------------------------------- deadlines */

test('countdowns band correctly and never appear for an unverified deadline', () => {
  const at = (value) => deadlineInfo({ deadline: apiField(value, { sourceUrl: 'x', fetchedAt: 'x' }) }, { now: NOW });
  assert.equal(at('2026-09-01').urgency, URGENCY.CRITICAL);
  assert.match(at('2026-09-01').display, /DAYS LEFT/);
  assert.equal(at('2026-09-20').urgency, URGENCY.SOON);
  assert.equal(at('2026-12-01').urgency, URGENCY.COMFORTABLE);
  assert.equal(at('2028-12-01').urgency, URGENCY.FUTURE);
  assert.equal(at('2026-01-01').urgency, URGENCY.PASSED);

  const unverified = deadlineInfo({ deadline: quoteField('2026-09-01', { sourceUrl: 'x', quote: 'nope' }) }, { now: NOW });
  assert.equal(unverified.urgency, URGENCY.UNKNOWN);
  assert.equal(unverified.daysRemaining, null);
});

test('the timeline works backward from the deadline and compresses when time is short', () => {
  const roomy = buildTimeline('2026-12-12', { now: NOW });
  assert.ok(roomy.length >= 5);
  assert.ok(roomy.every((entry) => entry.date < '2026-12-12'));
  assert.ok(roomy[0].date < roomy[roomy.length - 1].date, 'tasks run earliest to latest');

  const tight = buildTimeline('2026-09-05', { now: NOW });
  assert.ok(tight.length >= 1);
  assert.equal(buildTimeline('2026-01-01', { now: NOW }).length, 0, 'a past deadline yields no timeline');
});

test('sorting balances match quality against urgency, and filters narrow correctly', () => {
  const make = (id, score, days) => ({
    id,
    score: { overall: score },
    deadlineInfo: { daysRemaining: days, urgency: days === null ? URGENCY.ROLLING : days <= 7 ? URGENCY.CRITICAL : URGENCY.COMFORTABLE },
  });
  const results = [make('a', 80, 200), make('b', 76, 3), make('c', 90, 400)];

  assert.deepEqual(sortResults(results, 'match').map((r) => r.id), ['c', 'a', 'b']);
  assert.deepEqual(sortResults(results, 'deadline').map((r) => r.id), ['b', 'a', 'c']);
  assert.equal(sortResults(results, 'balanced')[0].id, 'c');

  assert.deepEqual(applyDeadlineFilter(results, 'closing_this_week').map((r) => r.id), ['b']);
  assert.deepEqual(applyDeadlineFilter(results, 'future').map((r) => r.id), ['a', 'c']);
});

/* ------------------------------------------------------------ dedupe */

test('canonicalization ignores tracking parameters, case and trailing slashes', () => {
  assert.equal(
    canonicalUrl('http://WWW.Example.org/grants/?utm_source=x&b=2&a=1#frag'),
    canonicalUrl('https://example.org/grants?a=1&b=2'),
  );
});

test('a lead keeps the URL it was discovered at, not its canonical key', () => {
  const [lead] = dedupeLeads([{ url: 'http://localhost:8899/a', query: 'q1' }, { url: 'http://localhost:8899/a/', query: 'q2' }]);
  assert.equal(lead.url, 'http://localhost:8899/a', 'fetching the canonical form could hit a different resource');
  assert.equal(lead.canonical, 'https://localhost:8899/a');
  assert.deepEqual(lead.foundByQueries, ['q1', 'q2']);
});

test('leads found by more strategies rank higher', () => {
  const leads = dedupeLeads([
    { url: 'https://a.example/x', query: 'q1' },
    { url: 'https://b.example/y', query: 'q1' },
    { url: 'https://b.example/y', query: 'q2' },
  ]);
  assert.equal(leads[0].url, 'https://b.example/y');
});

test('duplicate records merge, with the more authoritative source winning', () => {
  const stamp = NOW.toISOString();
  const aggregator = {
    id: 'web:list',
    grantName: apiField('Youth STEM Grant', { sourceUrl: 'https://grantwatch.com/g', fetchedAt: stamp }),
    funder: apiField('Openfield Foundation', { sourceUrl: 'https://grantwatch.com/g', fetchedAt: stamp }),
    deadline: apiField('2026-10-01', { sourceUrl: 'https://grantwatch.com/g', fetchedAt: stamp }),
    awardMaximum: unknownField(''),
    sourceUrls: ['https://grantwatch.com/g'],
  };
  const primary = {
    id: 'web:funder',
    grantName: apiField('Youth STEM Grant', { sourceUrl: 'https://openfield.org/g', fetchedAt: stamp }),
    funder: apiField('Openfield Foundation', { sourceUrl: 'https://openfield.org/g', fetchedAt: stamp }),
    deadline: apiField('2026-12-12', { sourceUrl: 'https://openfield.org/g', fetchedAt: stamp }),
    awardMaximum: unknownField(''),
    sourceUrls: ['https://openfield.org/g'],
  };
  const merged = dedupeRecords([aggregator, primary]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].deadline.value, '2026-12-12', 'the funder\'s own deadline must win over the listing site\'s');
  assert.ok(merged[0].sourceUrls.includes('https://grantwatch.com/g'));
});

test('merging adopts facts the weaker copy uniquely verified', () => {
  const stamp = NOW.toISOString();
  const primary = { id: 'a', awardMaximum: unknownField(''), sourceUrls: ['https://x.org'] };
  const secondary = { id: 'b', awardMaximum: apiField(5000, { sourceUrl: 'https://y.org', fetchedAt: stamp }), sourceUrls: ['https://y.org'] };
  const merged = mergeRecords(primary, secondary);
  assert.equal(merged.awardMaximum.value, 5000);
  assert.deepEqual(merged.mergedFrom, ['b']);
});

test('title keys ignore boilerplate so the same grant matches across sources', () => {
  assert.equal(titleKey('The 2026 STEM Education Grant Program'), titleKey('STEM Education Grant'));
});

/* ------------------------------------------------------------- robots */

test('robots.txt directives for the wildcard agent are honoured', () => {
  const rules = parseRobots('User-agent: *\nDisallow: /private\nAllow: /private/public\n\nUser-agent: badbot\nDisallow: /');
  assert.equal(isPathAllowed(rules, '/grants'), true);
  assert.equal(isPathAllowed(rules, '/private/secret'), false);
  assert.equal(isPathAllowed(rules, '/private/public/page'), true, 'the longer Allow must win');
});

test('an empty Disallow means everything is permitted', () => {
  assert.equal(isPathAllowed(parseRobots('User-agent: *\nDisallow:'), '/anything'), true);
});

/* -------------------------------------------------- difficulty & competition */

test('difficulty reflects verified burdens and says it is an estimate', () => {
  const federal = assessDifficulty(
    { funderType: apiField('federal_government', { sourceUrl: 'x', fetchedAt: 'x' }), awardMaximum: apiField(400000, { sourceUrl: 'x', fetchedAt: 'x' }) },
    { checks: [{ id: 'matching_funds', result: 'unknown_applicant' }] },
  );
  assert.equal(federal.level, DIFFICULTY.DIFFICULT);
  assert.match(federal.basis, /estimated/i);

  const small = assessDifficulty({ awardMaximum: apiField(3000, { sourceUrl: 'x', fetchedAt: 'x' }) }, { checks: [] });
  assert.equal(small.level, DIFFICULTY.EASY);
});

test('competition is Unknown unless the funder published numbers', () => {
  assert.equal(assessCompetition({}).level, COMPETITION.UNKNOWN);
  assert.match(assessCompetition({}).basis, /will not estimate/i);

  const measured = assessCompetition({
    expectedAwards: apiField(10, { sourceUrl: 'x', fetchedAt: 'x' }),
    priorApplicantCount: apiField(20, { sourceUrl: 'x', fetchedAt: 'x' }),
  });
  assert.equal(measured.level, COMPETITION.LOW);
  assert.equal(measured.verified, true);

  const inferred = assessCompetition({ expectedAwards: apiField(10, { sourceUrl: 'x', fetchedAt: 'x' }) });
  assert.equal(inferred.verified, false, 'an award count alone is not a measured acceptance rate');
  assert.match(inferred.basis, /not published/i);
});
