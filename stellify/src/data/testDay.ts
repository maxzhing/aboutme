/**
 * Test-day hub content (#/test-day). Original, modest advice, plus College Board specifics that each carry a
 * source. A source's `verified` date is set only when a person has read that page and confirmed the specific
 * statement against it. Until then the page shows "Needs verification" next to it (NEEDS-OWNER.md #6).
 * `linkChecked` records only that the link opened (from scripts/check-links.ts), not that the content was checked.
 */
export interface Source { id: string; title: string; url: string; verified: string | null; linkChecked?: string }

export const SOURCES: Record<string, Source> = {
  structure: { id: 'structure', title: 'College Board: What’s on the SAT', url: 'https://satsuite.collegeboard.org/sat/whats-on-the-test', verified: null, linkChecked: '2026-11-18' },
  bring: { id: 'bring', title: 'College Board: What to bring', url: 'https://satsuite.collegeboard.org/sat/what-to-bring-do/what-to-bring', verified: null },
  expect: { id: 'expect', title: 'College Board: What to expect on test day', url: 'https://satsuite.collegeboard.org/sat/what-to-bring-do/what-to-expect', verified: null },
  bluebook: { id: 'bluebook', title: 'Bluebook: practice and setup', url: 'https://bluebook.collegeboard.org/students/practice', verified: null, linkChecked: '2026-11-18' },
  dates: { id: 'dates', title: 'College Board: SAT dates and deadlines', url: 'https://satsuite.collegeboard.org/sat/dates-deadlines', verified: null, linkChecked: '2026-11-18' },
  waivers: { id: 'waivers', title: 'College Board: SAT fee waivers', url: 'https://satsuite.collegeboard.org/sat/registration/fee-waivers', verified: null, linkChecked: '2026-11-18' },
  scores: { id: 'scores', title: 'College Board: What your scores mean', url: 'https://satsuite.collegeboard.org/scores/what-scores-mean', verified: null, linkChecked: '2026-11-18' },
  accommodations: { id: 'accommodations', title: 'College Board: Accommodations', url: 'https://accommodations.collegeboard.org/', verified: null, linkChecked: '2026-11-18' },
};

export type Phase = 'four-weeks' | 'one-week' | 'night' | 'morning' | 'room';
export interface CheckItem { id: string; phase: Phase; text: string; source?: keyof typeof SOURCES }
export const PHASES: { id: Phase; title: string; offsetDays: number | null }[] = [
  { id: 'four-weeks', title: '4 weeks out', offsetDays: -28 },
  { id: 'one-week', title: '1 week out', offsetDays: -7 },
  { id: 'night', title: 'The night before', offsetDays: -1 },
  { id: 'morning', title: 'The morning of', offsetDays: 0 },
  { id: 'room', title: 'In the room', offsetDays: null },
];

export const CHECKLIST: CheckItem[] = [
  { id: 'reg', phase: 'four-weeks', text: 'Confirm your registration, test date and test center.', source: 'dates' },
  { id: 'bluebook', phase: 'four-weeks', text: 'Install Bluebook on the device you will test on, and take one full practice test in it.', source: 'bluebook' },
  { id: 'accom', phase: 'four-weeks', text: 'If you use accommodations at school, check whether they are approved for the SAT. Approval can take weeks.', source: 'accommodations' },
  { id: 'mock', phase: 'four-weeks', text: 'Take a full-length timed practice test here (Mock Exams) and read its study plan.' },
  { id: 'sleep4', phase: 'four-weeks', text: 'Pick a bedtime and wake time you can keep through test day.' },
  { id: 'setup', phase: 'one-week', text: 'Complete exam setup in Bluebook when it opens, and save your admission ticket.', source: 'bluebook' },
  { id: 'id', phase: 'one-week', text: 'Check your photo ID: valid, and the name matches your registration exactly.', source: 'bring' },
  { id: 'power', phase: 'one-week', text: 'Make sure your device battery can last the whole test; do not count on an outlet.', source: 'bring' },
  { id: 'route', phase: 'one-week', text: 'Plan how you will get to the test center, and when you need to leave.' },
  { id: 'light', phase: 'one-week', text: 'Switch to light review: due reviews and confident errors only. No brand-new topics in the last two days.' },
  { id: 'pack', phase: 'night', text: 'Pack your device, charger, admission ticket, photo ID, pencils, a snack and water for the break.', source: 'bring' },
  { id: 'charge', phase: 'night', text: 'Charge the device fully. Update Bluebook if it asks.', source: 'bluebook' },
  { id: 'nocram', phase: 'night', text: 'Twenty minutes of easy review at most, then stop. Nothing new tonight.' },
  { id: 'bed', phase: 'night', text: 'Go to bed at your usual time.' },
  { id: 'eat', phase: 'morning', text: 'Eat a normal breakfast. Dress in layers.' },
  { id: 'arrive', phase: 'morning', text: 'Arrive early. Check the arrival time on your admission ticket.', source: 'expect' },
  { id: 'breathe', phase: 'morning', text: 'One minute of box breathing before you go in (below).' },
  { id: 'proctor', phase: 'room', text: 'Follow the proctor’s instructions. Phone off and put away.', source: 'expect' },
  { id: 'tools', phase: 'room', text: 'Use the tools you practised with: the timer, mark-for-review and the built-in Desmos calculator.', source: 'bluebook' },
  { id: 'module', phase: 'room', text: 'Module 1 felt hard? Keep going. Do not try to guess your routing: just answer the next question.' },
  { id: 'break', phase: 'room', text: 'Use the break: eat, drink, stand up, look at something far away.' },
];

export const BLUEBOOK_STEPS: { title: string; text: string; source: keyof typeof SOURCES }[] = [
  { title: 'Install Bluebook', text: 'Bluebook is the College Board’s testing app. Install it on the laptop or tablet you will test on. Check that device against the College Board’s current device requirements.', source: 'bluebook' },
  { title: 'Sign in', text: 'Sign in with the same College Board account you used to register.', source: 'bluebook' },
  { title: 'Practice in Bluebook', text: 'Bluebook has full-length adaptive practice tests. Take at least one so the screens, tools and timing are familiar.', source: 'bluebook' },
  { title: 'Exam setup and admission ticket', text: 'A few days before the test, Bluebook asks you to complete exam setup, then gives you an admission ticket.', source: 'bluebook' },
  { title: 'Check-in', text: 'Bring the ticket and your photo ID. Staff check you in and give you a start code.', source: 'expect' },
];

export const PLAYBOOK: { title: string; text: string; source?: keyof typeof SOURCES }[] = [
  { title: 'You forgot your ID', text: 'Tell the test center staff at once. Without acceptable ID you may not be admitted. Ask about changing your test date, and check the College Board’s current rules.', source: 'bring' },
  { title: 'Your device or Bluebook has a problem', text: 'Raise your hand and tell the proctor. Do not try to fix it alone or restart without asking.', source: 'expect' },
  { title: 'You panic in the middle of a section', text: 'Stop for ten seconds. Breathe out longer than you breathe in. Mark the question for review, answer the next one, and come back.' },
  { title: 'The first module went badly', text: 'You cannot know how it went. Many strong students find Module 1 hard. The score uses both modules: give the next one your full attention.' },
  { title: 'You are running out of time', text: 'There is no penalty for wrong answers on the SAT, so never leave a question blank. Put an answer down, mark it, and move on.', source: 'scores' },
];

/** Admission-testing policies, in plain words. No school's policy is listed here: policies change; check each school's own page. */
export const POLICY_TERMS: { term: string; text: string }[] = [
  { term: 'Test-required', text: 'You must send an SAT or ACT score to apply.' },
  { term: 'Test-optional', text: 'You choose whether to send a score. A score you send is considered; a score you do not send is not held against you. “Optional” does not mean “ignored”.' },
  { term: 'Test-flexible', text: 'The school accepts other evidence, such as AP or IB results, in place of the SAT or ACT.' },
  { term: 'Test-blind', text: 'The school will not look at SAT or ACT scores even if you send them.' },
  { term: 'Score Choice', text: 'A College Board option that lets you choose which test dates’ scores to send. Some schools ask for all of your scores anyway: follow each school’s rule.' },
  { term: 'Superscoring', text: 'A school takes your best Reading and Writing score and your best Math score, even if they came from different test dates.' },
];
