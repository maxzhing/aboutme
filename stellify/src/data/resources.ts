/**
 * COLLECTION A — Official practice resources.
 * Stellify does not copy, host or reproduce College Board questions. Each entry links to the
 * official experience and says exactly what the link opens.
 *
 * VERIFICATION: these URLs were compiled from College Board's published site structure, but the
 * build environment that produced this file had no access to those hosts, so they could not be
 * opened and checked. `verifiedOn` is therefore null. Run `npm run check:links` on a machine with
 * normal internet access to verify every link and stamp the date.
 */
export interface OfficialResource {
  id: string; name: string; url: string; provider: string;
  section: 'Math' | 'Reading & Writing' | 'Both';
  domain?: string; skill?: string; difficulty?: string;
  opens: string; access: string; verifiedOn: string | null;
}

const SQB = 'https://satsuitequestionbank.collegeboard.org/';
const sqb = (id: string, section: 'Math' | 'Reading & Writing', domain: string): OfficialResource => ({
  id, name: `Student Question Bank: ${domain}`, url: SQB, provider: 'College Board', section, domain,
  difficulty: 'Filter by Easy, Medium or Hard inside the tool',
  opens: 'The question bank\'s search page (not a specific question).',
  access: `Free, no account needed. Choose Assessment: SAT → Test: ${section === 'Math' ? 'Math' : 'Reading and Writing'} → Domain: ${domain}, then pick a difficulty and select "Search".`,
  verifiedOn: null,
});

export const RESOURCES: OfficialResource[] = [
  { id: 'bluebook', name: 'Bluebook: official full-length adaptive practice tests', url: 'https://bluebook.collegeboard.org/students/practice', provider: 'College Board', section: 'Both', opens: 'Information page for practicing in the Bluebook app.', access: 'Free. Download the Bluebook app, sign in with a College Board account, and choose a full-length practice test. This is the closest experience to test day and gives a real scaled score.', verifiedOn: null },
  { id: 'sat-practice', name: 'SAT Practice and Preparation hub', url: 'https://satsuite.collegeboard.org/practice', provider: 'College Board', section: 'Both', opens: 'The official overview of all free practice options.', access: 'Free, no account needed to browse.', verifiedOn: null },
  { id: 'sqb', name: 'SAT Suite Student Question Bank', url: 'https://satsuite.collegeboard.org/practice/student-question-bank', provider: 'College Board', section: 'Both', opens: 'The landing page describing the question bank, with a link into the tool.', access: 'Free. Thousands of official questions filterable by test, domain, skill and difficulty.', verifiedOn: null },
  sqb('sqb-ii', 'Reading & Writing', 'Information and Ideas'),
  sqb('sqb-cs', 'Reading & Writing', 'Craft and Structure'),
  sqb('sqb-eoi', 'Reading & Writing', 'Expression of Ideas'),
  sqb('sqb-sec', 'Reading & Writing', 'Standard English Conventions'),
  sqb('sqb-alg', 'Math', 'Algebra'),
  sqb('sqb-adv', 'Math', 'Advanced Math'),
  sqb('sqb-psda', 'Math', 'Problem-Solving and Data Analysis'),
  sqb('sqb-geo', 'Math', 'Geometry and Trigonometry'),
  { id: 'whats-on', name: "What's on the SAT (official specifications)", url: 'https://satsuite.collegeboard.org/sat/whats-on-the-test', provider: 'College Board', section: 'Both', opens: 'The official description of the test structure, domains and skills.', access: 'Free, no account needed.', verifiedOn: null },
  { id: 'paper-tests', name: 'Full-length linear (nonadaptive) practice tests', url: 'https://satsuite.collegeboard.org/practice/practice-tests/paper', provider: 'College Board', section: 'Both', opens: 'Downloadable PDF practice tests with answer explanations and scoring guides.', access: 'Free PDFs. Intended mainly for students who test on paper; still useful as extra official questions.', verifiedOn: null },
  { id: 'khan-math', name: 'Official Digital SAT Prep: Math', url: 'https://www.khanacademy.org/test-prep/v2-sat-math', provider: 'Khan Academy (in partnership with College Board)', section: 'Math', opens: 'The Khan Academy Digital SAT Math course.', access: 'Free with a Khan Academy account. Lessons and practice organized by skill and level.', verifiedOn: null },
  { id: 'khan-rw', name: 'Official Digital SAT Prep: Reading and Writing', url: 'https://www.khanacademy.org/test-prep/sat-reading-and-writing', provider: 'Khan Academy (in partnership with College Board)', section: 'Reading & Writing', opens: 'The Khan Academy Digital SAT Reading and Writing course.', access: 'Free with a Khan Academy account.', verifiedOn: null },
  { id: 'desmos', name: 'Desmos graphing calculator (digital SAT version)', url: 'https://www.desmos.com/testing/cb-digital-sat/graphing', provider: 'Desmos', section: 'Math', opens: 'The practice version of the graphing calculator built into Bluebook.', access: 'Free, no account needed. Practice here so the test-day calculator feels familiar.', verifiedOn: null },
  { id: 'dates', name: 'SAT dates and deadlines', url: 'https://satsuite.collegeboard.org/sat/dates-deadlines', provider: 'College Board', section: 'Both', opens: 'Official test dates and registration deadlines.', access: 'Free, no account needed.', verifiedOn: null },
  { id: 'scores', name: 'Understanding SAT scores', url: 'https://satsuite.collegeboard.org/sat/scores/understanding-scores', provider: 'College Board', section: 'Both', opens: 'How official scores, percentiles and benchmarks work.', access: 'Free, no account needed.', verifiedOn: null },
  { id: 'fee-waivers', name: 'SAT fee waivers', url: 'https://satsuite.collegeboard.org/sat/registration/fee-waivers', provider: 'College Board', section: 'Both', opens: 'Eligibility and benefits for testing free of charge.', access: 'Free. Ask your school counselor about eligibility.', verifiedOn: null },
  { id: 'accommodations', name: 'Testing accommodations', url: 'https://accommodations.collegeboard.org/', provider: 'College Board', section: 'Both', opens: 'How to request accommodations such as extended time.', access: 'Requests usually go through your school and take several weeks.', verifiedOn: null },
];
