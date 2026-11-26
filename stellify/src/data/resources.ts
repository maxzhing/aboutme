/**
 * Official and third-party SAT resources Stellify links to. Stellify does not copy, host or reproduce
 * College Board questions on the public site; each entry links out and says exactly what it opens.
 *
 * VERIFICATION (2026-11-18): every link was opened in a real browser (Chromium) and by a plain HTTP
 * request. `seen` is the page title (or, for app pages, the visible heading) actually shown; `check` is
 * 'full' when that confirmed the intended page, 'partial' when the page responded but its content could
 * not be confirmed (it sits behind a sign-in, or loads from servers the check could not reach). Two
 * addresses had moved and were updated to where they now lead. `npm run check:links` repeats the check
 * (status and title) on any machine with internet access.
 */
export type ResourceKind = 'bluebook' | 'official' | 'third-party';
export const KIND_NAME: Record<ResourceKind, string> = {
  bluebook: 'Official Bluebook practice tests',
  official: 'Official College Board resources',
  'third-party': 'Third-party resources',
};
export interface OfficialResource {
  id: string; name: string; url: string; provider: string; kind: ResourceKind;
  section: 'Math' | 'Reading & Writing' | 'Both';
  domain?: string; skill?: string; difficulty?: string;
  opens: string; access: string;
  verifiedOn: string | null;
  check: 'full' | 'partial';
  /** what the check actually saw */
  seen: string;
  /** a word or phrase the page title must contain (used by `npm run check:links`) */
  expect: string;
  note?: string;
}

const ON = '2026-11-18';
export const RESOURCES: OfficialResource[] = [
  { id: 'bluebook', kind: 'bluebook', name: 'Bluebook: official full-length adaptive practice tests', url: 'https://bluebook.collegeboard.org/students/practice', provider: 'College Board', section: 'Both', opens: 'The Bluebook practice page: how to take the official full-length adaptive practice tests in the Bluebook app, the same app used on test day.', access: 'Free. Install Bluebook on a laptop or tablet; the tests run inside the app and are scored on the official scale.', verifiedOn: ON, check: 'full', seen: 'Practice – Bluebook for Students | College Board', expect: 'Bluebook' },

  { id: 'sat-practice', kind: 'official', name: 'SAT Practice and Preparation hub', url: 'https://satsuite.collegeboard.org/practice', provider: 'College Board', section: 'Both', opens: 'The official overview of all free practice options.', access: 'Free, no account needed.', verifiedOn: ON, check: 'full', seen: 'SAT Suite Practice and Preparation – College Board', expect: 'Practice' },
  { id: 'paper-tests', kind: 'official', name: 'Full-length paper practice tests (PDF)', url: 'https://satsuite.collegeboard.org/practice/practice-tests/paper', provider: 'College Board', section: 'Both', opens: 'Downloadable PDF practice tests with answer explanations and scoring guides (nonadaptive versions of the Bluebook tests).', access: 'Free PDFs. Intended mainly for students who will test on paper; everyone else should use Bluebook.', verifiedOn: ON, check: 'full', seen: 'Full-Length SAT and PSAT Paper Practice Tests – SAT Suite | College Board', expect: 'Paper Practice Tests' },
  { id: 'sqb', kind: 'official', name: 'Student Question Bank: how to use it', url: 'https://satsuite.collegeboard.org/practice/student-question-bank', provider: 'College Board', section: 'Both', opens: 'College Board’s guide to the Student Question Bank, with a link into the search tool.', access: 'Free, no account needed for this page.', verifiedOn: ON, check: 'full', seen: 'How to Use the Student Question Bank – SAT Suite | College Board', expect: 'Question Bank' },
  { id: 'sqb-rw', kind: 'official', name: 'Student Question Bank: Reading and Writing questions', url: 'https://satsuite.collegeboard.org/practice/student-question-bank/reading-writing', provider: 'College Board', section: 'Reading & Writing', domain: 'All four domains', opens: 'What each Reading and Writing domain and skill looks like in the question bank, so you can choose what to practice.', access: 'Free, no account needed for this page.', verifiedOn: ON, check: 'full', seen: 'Student Question Bank: Reading and Writing Questions – SAT Suite | College Board', expect: 'Reading and Writing' },
  { id: 'sqb-math', kind: 'official', name: 'Student Question Bank: Math questions', url: 'https://satsuite.collegeboard.org/practice/student-question-bank/math', provider: 'College Board', section: 'Math', domain: 'All four domains', opens: 'What each Math domain and skill looks like in the question bank, so you can choose what to practice.', access: 'Free, no account needed for this page.', verifiedOn: ON, check: 'full', seen: 'Student Question Bank: Math Questions – SAT Suite | College Board', expect: 'Math' },
  { id: 'sqb-search', kind: 'official', name: 'Student Question Bank: search tool', url: 'https://mypractice.collegeboard.org/questionbank/search', provider: 'College Board', section: 'Both', difficulty: 'Filter by Easy, Medium or Hard inside the tool', opens: 'The question bank search: filter thousands of official questions by test, domain, skill and difficulty, then export them as a PDF (which Stellify can import).', access: 'Free, but the search now asks you to sign in with a free College Board account.', verifiedOn: ON, check: 'partial', seen: 'My Practice Sign In – SAT Suite | College Board', expect: 'Practice', note: 'The address the College Board links to now leads to its sign-in page; the search itself (behind the sign-in) was not opened. The old address satsuitequestionbank.collegeboard.org now redirects to the Educator Question Bank instead.' },
  { id: 'whats-on', kind: 'official', name: "What's on the SAT (official specifications)", url: 'https://satsuite.collegeboard.org/sat/whats-on-the-test', provider: 'College Board', section: 'Both', opens: 'The official description of the test structure, domains and skills.', access: 'Free, no account needed.', verifiedOn: ON, check: 'full', seen: "What's on the SAT – SAT Suite | College Board", expect: "What's on the SAT" },
  { id: 'dates', kind: 'official', name: 'SAT dates and deadlines', url: 'https://satsuite.collegeboard.org/sat/dates-deadlines', provider: 'College Board', section: 'Both', opens: 'Official test dates and registration deadlines.', access: 'Free, no account needed.', verifiedOn: ON, check: 'full', seen: 'SAT Suite Test Dates and Deadlines – SAT Suite | College Board', expect: 'Dates' },
  { id: 'scores', kind: 'official', name: 'What SAT scores mean', url: 'https://satsuite.collegeboard.org/scores/what-scores-mean', provider: 'College Board', section: 'Both', opens: 'How official scores, ranges, percentiles and benchmarks work.', access: 'Free, no account needed.', verifiedOn: ON, check: 'full', seen: 'What Do My SAT Suite Scores Mean? – College Board', expect: 'Scores Mean', note: 'Updated: the old address (/sat/scores/understanding-scores) now redirects here.' },
  { id: 'fee-waivers', kind: 'official', name: 'SAT fee waivers', url: 'https://satsuite.collegeboard.org/sat/registration/fee-waivers', provider: 'College Board', section: 'Both', opens: 'Eligibility and benefits for testing free of charge.', access: 'Free. Ask your school counselor about eligibility.', verifiedOn: ON, check: 'full', seen: 'SAT Fee Waivers – SAT Suite | College Board', expect: 'Fee Waivers' },
  { id: 'accommodations', kind: 'official', name: 'Testing accommodations', url: 'https://accommodations.collegeboard.org/', provider: 'College Board', section: 'Both', opens: 'How to request accommodations such as extended time.', access: 'Requests usually go through your school and take several weeks.', verifiedOn: ON, check: 'full', seen: 'Accommodations on College Board Exams | College Board', expect: 'Accommodations' },

  { id: 'khan-math', kind: 'third-party', name: 'Khan Academy: Digital SAT Math course', url: 'https://www.khanacademy.org/test-prep/v2-sat-math', provider: 'Khan Academy (the College Board’s official practice partner)', section: 'Math', opens: 'Khan Academy’s Digital SAT Math course: lessons and practice by skill.', access: 'Free; progress tracking needs a free Khan Academy account.', verifiedOn: ON, check: 'partial', seen: 'Khan Academy (page title)', expect: 'Khan Academy', note: 'The page responds at this address, but its course content loads from servers the check could not reach, so the course itself was not confirmed.' },
  { id: 'khan-rw', kind: 'third-party', name: 'Khan Academy: Digital SAT Reading and Writing course', url: 'https://www.khanacademy.org/test-prep/sat-reading-and-writing', provider: 'Khan Academy (the College Board’s official practice partner)', section: 'Reading & Writing', opens: 'Khan Academy’s Digital SAT Reading and Writing course: lessons and practice by skill.', access: 'Free; progress tracking needs a free Khan Academy account.', verifiedOn: ON, check: 'partial', seen: 'Khan Academy (page title)', expect: 'Khan Academy', note: 'The page responds at this address, but its course content loads from servers the check could not reach, so the course itself was not confirmed.' },
  { id: 'desmos', kind: 'third-party', name: 'Desmos graphing calculator (College Board version)', url: 'https://www.desmos.com/testing/collegeboard/graphing', provider: 'Desmos', section: 'Math', opens: 'The College Board version of the Desmos graphing calculator, the same one built into Bluebook.', access: 'Free, no account needed. Practice with it so the test-day calculator feels familiar.', verifiedOn: ON, check: 'full', seen: '“Graphing Calculator · College Board Version” (Desmos | Testing)', expect: 'Desmos', note: 'Updated: the old address (/testing/cb-digital-sat/graphing) now redirects here.' },
];
