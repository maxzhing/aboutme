import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { ALL_RAW } from '../src/data/questions/all';

const FILE = `file://${resolve(__dirname, '../dist/stellify.html')}`;
const KEY = Object.fromEntries(ALL_RAW.map((q) => [q.id, q]));
const go = (page: Page, route: string) => page.goto(`${FILE}#${route}`);
/** A College Board Question Bank export used to test the importer; not part of the repository. */
const PDF = process.env.CB_PDF ?? '/root/.claude/uploads/1f98cbb6-1f2d-5424-8d97-5669c564791c/3c77d1b8-MyPracticeForLaude.pdf';

// the directions dialog opens at the start of each test section, as on test day; close it whenever it appears
test.beforeEach(async ({ page }) => { await page.addLocatorHandler(page.getByTestId('close-directions'), async () => { await page.getByTestId('close-directions').click(); }); });

function watch(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}
async function boot(page: Page) {
  await go(page, '/onboarding');
  await page.getByRole('button', { name: 'Skip setup' }).click();
  await expect(page.getByTestId('greeting')).toBeVisible();
}
/** Answers the question currently on screen, correctly or not, and returns its id. */
async function answerCurrent(page: Page, correct: boolean, card = 'question-card') {
  const qid = (await page.getByTestId(card).getAttribute('data-qid'))!;
  const q = KEY[qid];
  if (q.choices) {
    const i = correct ? (q.answer as number) : ((q.answer as number) + 1) % 4;
    await page.locator(`[data-testid="${card}"] [data-choice="${'ABCD'[i]}"]`).click();
  } else await page.locator(`#spr-${qid}`).fill(correct ? (q.answer as string[])[0] : '99999');
  return qid;
}
/** `thinkMs` simulates real thinking time: answers given in under five seconds are treated as guesses and earn almost no XP. */
async function solve(page: Page, correct: boolean, thinkMs = 0) { const id = await answerCurrent(page, correct); if (thinkMs) await page.clock.fastForward(thinkMs); await page.getByTestId('check').click(); await expect(page.getByTestId('explanation')).toBeVisible(); return id; }

test('onboarding collects goals and leads to the dashboard', async ({ page }) => {
  const errors = watch(page);
  await go(page, '/');
  await expect(page.getByRole('heading', { name: /Meet Lumi/ })).toBeVisible(); // first visit is redirected to onboarding
  await page.getByLabel(/What should Lumi call you/).fill('Sam');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel(/Current SAT/).fill('1200');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: '30 min' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page.getByTestId('greeting')).toContainText('Sam');
  await expect(page.getByTestId('mission')).toContainText('Diagnostic');
  await expect(page.getByTestId('pet-card')).toBeVisible();
  expect(errors).toEqual([]);
});

test('wrong answer: full explanation, saved mistake, persistence across reload, then resolution', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, '/practice/session?mode=single&ids=m-nleq-12');
  await page.getByRole('button', { name: /Hint 1 of 3/ }).click();
  await expect(page.getByText('Hint 1 · Concept')).toBeVisible();
  await solve(page, false);
  await expect(page.getByTestId('verdict')).toHaveText('Incorrect');
  await expect(page.getByTestId('correct-answer')).toHaveText('13');
  await expect(page.getByTestId('your-answer')).toHaveText('99999');
  for (const h of ['Step-by-step solution', 'Why the correct answer works', 'Common wrong answers and why they fail', 'The underlying concept', 'Fastest reliable method', 'Common trap', 'What to remember', 'Recommended next']) await expect(page.getByRole('heading', { name: h })).toBeVisible();

  await page.reload(); // progress must survive a reload
  await go(page, '/mistakes');
  await expect(page.getByTestId('unresolved-count')).toHaveText('1');
  await expect(page.getByTestId('mistake-row')).toContainText('Redo correct');
  await expect(page.getByTestId('resolve')).toHaveCount(0); // cannot be marked resolved yet

  await page.getByTestId('fix-it').click();
  for (let i = 0; i < 3; i++) { await solve(page, true); await page.getByTestId('next').click(); }
  await expect(page.getByTestId('session-summary')).toContainText('3/3 correct');
  await go(page, '/mistakes');
  await page.getByTestId('resolve').click();
  await expect(page.getByTestId('unresolved-count')).toHaveText('0');
  await go(page, '/achievements');
  await expect(page.getByTestId('ach-fix-1')).toHaveAttribute('data-unlocked', 'true');
  // with only a few answers there is no score estimate yet: it says exactly how much more data it needs
  await go(page, '/analytics');
  await expect(page.getByTestId('estimate-insufficient')).toContainText(/Not enough data yet: \d+ more first-try Reading & Writing answers and \d+ more first-try Math answers needed/);
  await expect(page.getByTestId('estimate-panel')).toContainText('Unofficial · not an SAT score');
  // every SAT skill has a heatmap tile; with so few answers nothing is trusted yet and no trend is claimed
  await expect(page.locator('[data-testid^="heat-"]')).toHaveCount(30);
  expect(await page.locator('[data-testid^="heat-"][data-confidence="high"]').count()).toBe(0);
  await expect(page.getByTestId('forecast')).toContainText('Too early to tell');
  expect(errors).toEqual([]);
});

test('multiple-choice question: every distractor is explained; XP, coins, shop and pet respond', async ({ page }) => {
  const errors = watch(page);
  await page.clock.install();
  await boot(page);
  await go(page, '/practice/session?mode=single&ids=r-bnd-06');
  await solve(page, false);
  await expect(page.getByRole('heading', { name: 'Why B is correct' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Why each other choice fails' })).toBeVisible();
  await expect(page.getByText('(your choice)')).toBeVisible();
  // answered in under a second with no history on this skill: most likely a guess, so a gap rather than a slip;
  // the diagnosis shows its evidence and the student can relabel it
  await expect(page.getByTestId('diagnosis')).toContainText('Likely cause: Conceptual gap');
  await expect(page.getByTestId('diagnosis')).toContainText(/You answered in \d+ s \(typical: \d+ s\)/);
  await expect(page.getByRole('button', { name: 'Conceptual misunderstanding' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Grammar confusion' }).click();
  await expect(page.getByRole('button', { name: 'Grammar confusion' })).toHaveAttribute('aria-pressed', 'true');

  await go(page, '/practice/session?mode=hard&section=math&n=8');
  for (let i = 0; i < 8; i++) { await solve(page, true, 45_000); await page.getByTestId('next').click(); }
  await expect(page.getByTestId('session-summary')).toContainText('8/8 correct');
  await go(page, '/rewards');
  const coins = Number(await page.getByTestId('coins').innerText());
  expect(coins).toBeGreaterThanOrEqual(60);
  await page.getByTestId('buy-hat-cap').click();
  await expect(page.getByTestId('item-hat-cap')).toContainText('Owned');
  expect(Number(await page.getByTestId('coins').innerText())).toBe(coins - 60);
  await go(page, '/pet');
  await expect(page.getByText(/Level [2-9]/).first()).toBeVisible(); // the pet levelled up from real work
  await page.getByTestId('pet-pet').click();
  await expect(page.getByText(/loves that/)).toBeVisible();
  await go(page, '/achievements');
  await expect(page.getByTestId('ach-first-10')).toHaveAttribute('data-unlocked', 'false'); // 9 answered so far
  await go(page, '/analytics');
  await expect(page.getByText('Accuracy by domain')).toBeVisible();
  await go(page, '/');
  await expect(page.getByTestId('stat-questions')).toHaveText('9');
  expect(errors).toEqual([]);
});

test('mock exam: timer, module routing, results report', async ({ page }) => {
  const errors = watch(page);
  page.on('dialog', (d) => d.accept());
  await boot(page);
  await go(page, '/mocks');
  await page.getByRole('button', { name: /Math · 70 min/ }).first().click();
  // the lock-in gate comes first; the clock has not started, and the rest of the app is covered
  await expect(page.getByTestId('lock-gate')).toContainText('Lock in for this test?');
  await expect(page.getByTestId('mock-question')).toHaveCount(0);
  await page.getByTestId('lock-go').click(); // asks the browser for full screen; falls back to focus view if refused
  await expect(page.getByTestId('lock-status')).toBeVisible();
  await expect(page.getByText('Math · Module 1 of 2')).toBeVisible();
  await expect(page.getByLabel(/Time remaining/)).toContainText(/3[45]:\d\d/);
  for (let i = 0; i < 22; i++) {
    await answerCurrent(page, true, 'mock-question');
    await page.getByTestId(i < 21 ? 'mock-next' : 'mock-review').click();
  }
  await expect(page.getByText('0 unanswered')).toBeVisible();
  await page.getByTestId('submit-module').click();
  await expect(page.getByText('Math · Module 2 of 2')).toBeVisible();
  await page.waitForTimeout(600); // let the save to browser storage finish
  await page.reload(); // an exam in progress survives a reload, and asks again before resuming
  await page.getByTestId('lock-skip').click();
  await expect(page.getByTestId('lock-status')).toContainText('Focus view');
  await expect(page.getByText('Math · Module 2 of 2')).toBeVisible();
  await page.getByTestId('q-nav-toggle').click(); await page.getByRole('button', { name: 'Go to the review page' }).click();
  await page.getByTestId('submit-module').click(); // leaves module 2 blank (confirm dialog accepted)
  await expect(page.getByTestId('mock-results')).toBeVisible();
  await expect(page.getByTestId('mock-results')).toContainText('Module 2: harder set'); // 22/22 in module 1 routes upward
  await expect(page.getByTestId('mock-results')).toContainText('22/44 correct');
  await expect(page.getByTestId('lock-report')).toContainText(/Taken (locked in|without full screen)/);
  await expect(page.getByTestId('test-shell')).toHaveCount(0); // the shell is gone once the test ends
  await expect(page.getByText('Domain performance')).toBeVisible();
  await expect(page.getByText('Answer key and explanations')).toBeVisible();
  await go(page, '/mocks');
  await expect(page.getByTestId('official-card')).toHaveCount(0); // the public build carries no official questions
  await go(page, '/mistakes');
  await expect(page.getByTestId('unresolved-count')).toHaveText('22');
  expect(errors).toEqual([]);
});

test('study plan, lessons, tutor fallback, vocabulary, notes, search, theme and export', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, '/calendar');
  await page.getByTestId('make-plan').click();
  await expect(page.getByText(/Your 30-day plan/)).toBeVisible();
  await expect(page.getByText('Week 4')).toBeVisible();

  await go(page, '/learn/bnd?view=notes');
  for (const h of ['Start here', 'The full explanation', 'Important rules', 'Worked examples', 'Common mistakes', 'SAT shortcuts', 'Practice by difficulty', 'Mastery']) await expect(page.getByRole('heading', { name: h })).toBeVisible();
  await page.getByTestId('complete-lesson').click();
  await expect(page.getByTestId('complete-lesson')).toContainText('Completed');
  await page.getByTestId('lesson-practice-very-hard').click();
  await expect(page.getByTestId('question-card')).toContainText('Very Hard');

  await go(page, '/practice/session?mode=single&ids=r-bnd-02'); // concept card on demand
  await page.getByTestId('show-hack').click();
  await expect(page.getByTestId('hack-card')).toContainText('Non-Essential Information');
  await go(page, '/hacks');
  await page.getByLabel('Search hacks').fill('discriminant');
  await expect(page.getByTestId('hack-card')).toHaveCount(1);
  await go(page, '/practice/hard');
  await page.getByTestId('elite-math').click();
  await expect(page.getByTestId('question-card')).toContainText('Beyond SAT');

  await go(page, '/tutor'); // no AI key: the built-in tutor answers
  await expect(page.getByText('Offline tutor')).toBeVisible();
  await page.getByRole('button', { name: 'When do I use a semicolon?' }).click();
  await expect(page.getByRole('log')).toContainText('A semicolon joins two independent clauses');

  await go(page, '/vocabulary');
  await page.getByTestId('flip').click();
  await page.getByTestId('knew-it').click();
  await expect(page.getByTestId('flashcard')).toContainText('Card 2 of');

  await go(page, '/notes');
  await page.getByTestId('note-title').fill('Colon rule');
  await page.getByTestId('note-body').fill('Needs a complete sentence before it.');
  await page.getByTestId('save-note').click();
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: 'Search', exact: true }).fill('colon rule');
  await expect(page.getByRole('list', { name: 'Search results' })).toContainText('Note');

  await page.keyboard.press('Escape');
  await go(page, '/desmos');
  await expect(page.getByText('(6, 25)').first()).toBeVisible(); // the grapher found the intersection

  await go(page, '/settings');
  await page.getByTestId('theme-light').click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export').click()]);
  expect(download.suggestedFilename()).toMatch(/^stellify-backup-.*\.json$/);
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/dark/); // theme persisted
  await go(page, '/notes');
  await expect(page.getByText('Colon rule').first()).toBeVisible(); // note persisted
  expect(errors).toEqual([]);
});

test('every navigation item opens a working page with no console errors', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  const links = await page.locator('aside nav a').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!));
  expect(links.length).toBe(34);
  for (const href of links) {
    await page.goto(`${FILE}${href}`);
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.getByText('Page not found')).toHaveCount(0);
  }
  await go(page, '/resources');
  const urls = await page.getByTestId('resource').locator('a[target=_blank]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
  expect(urls.length).toBeGreaterThanOrEqual(15);
  for (const u of urls) expect(u).toMatch(/^https:\/\/([a-z]+\.)*(collegeboard\.org|khanacademy\.org|desmos\.com)\//);
  // every link carries the result of its check, and every source is categorized
  await expect(page.getByTestId('resource-check')).toHaveCount(urls.length);
  await expect(page.getByTestId('resource-status')).toContainText('Every link was opened on');
  expect(await page.locator('[data-testid="resource"][data-kind="bluebook"]').count()).toBe(1);
  expect(await page.locator('[data-testid="resource"][data-kind="third-party"]').count()).toBe(3);
  await expect(page.locator('[data-testid="resource"][data-check="partial"]').first()).toContainText('Partly verified');
  expect(errors).toEqual([]);
});

test('works on a phone-sized screen', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = watch(page);
  await boot(page);
  for (const r of ['/', '/practice/session?mode=single&ids=r-coeq-02', '/learn', '/mistakes', '/mocks', '/pet', '/analytics', '/settings']) {
    await go(page, r);
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow on ${r}`).toBeLessThanOrEqual(1);
  }
  await go(page, '/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('dialog', { name: 'Navigation menu' }).getByRole('link', { name: 'Question Bank' }).click();
  await expect(page.getByRole('heading', { name: 'Question Bank' })).toBeVisible();
  await go(page, '/practice/session?mode=single&ids=m-lin1-01');
  await solve(page, true);
  await expect(page.getByTestId('verdict')).toHaveText('Correct');
  expect(errors).toEqual([]);
  await ctx.close();
});

test('interactive lesson: pictures, quick checks, boss question, stars; quests and the skill map', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, '/learn');
  await expect(page.getByTestId('next-lesson')).toContainText('Linear equations');
  await page.getByTestId('skill-bnd').click();
  await expect(page.getByTestId('course')).toContainText('Boundaries');
  await page.getByTestId('quick-lesson').click();
  await expect(page.getByTestId('lesson-player')).toContainText('Boundaries');
  await page.getByTestId('lesson-next').click(); // intro → idea 1
  await expect(page.getByTestId('lesson-player')).toContainText('Extra information gets a matching pair');
  await page.getByRole('button', { name: 'Lift it out' }).click();
  await expect(page.getByText('What is left still works as a sentence.')).toBeVisible();
  await page.getByTestId('lesson-next').click(); // → quick check 1
  await expect(page.getByTestId('lesson-next')).toBeDisabled(); // must answer first
  await page.getByTestId('check-option-0').click(); // "a comma" is right
  await expect(page.getByTestId('check-feedback')).toContainText('Yes!');
  await page.getByTestId('lesson-next').click(); // → idea 2
  await page.getByTestId('lesson-next').click(); // → quick check 2
  await page.getByTestId('check-option-0').click(); // "a period" is wrong
  await expect(page.getByTestId('check-feedback')).toContainText('Not quite.');
  for (let i = 0; i < 12 && !(await page.getByTestId('boss-submit').count()); i++) { await page.getByTestId('lesson-next').click(); await page.waitForTimeout(450); } // let each slide settle
  const qid = await page.locator('[id^="stem-"]').first().getAttribute('id');
  const boss = KEY[qid!.replace('stem-', '')];
  expect(boss.skill).toBe('bnd');
  await page.locator(`[data-choice="${'ABCD'[boss.answer as number]}"]`).click();
  await page.getByTestId('boss-submit').click();
  await expect(page.getByTestId('boss-feedback')).toContainText('Boss defeated!');
  await page.getByTestId('lesson-next').click();
  await expect(page.getByTestId('lesson-done')).toBeVisible();
  await expect(page.getByTestId('lesson-stars')).toHaveAttribute('data-stars', '2'); // one check + the boss

  // a graph lesson renders and responds to its slider
  await go(page, '/learn/linf?view=quick');
  await page.getByTestId('lesson-next').click();
  await expect(page.getByRole('img', { name: 'Interactive graph: line' })).toBeVisible();
  const slope = page.getByLabel('slope m =');
  await slope.focus(); await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('lesson-player')).toContainText('changes by 1 for every +1');

  // home: the lesson quest is done and pays out once; stars show on the map
  await go(page, '/');
  await expect(page.getByTestId('lumi-says')).toBeVisible();
  await expect(page.getByTestId('quests').locator('li')).toHaveCount(3);
  const lessonQuest = page.getByTestId('quest-lesson1');
  if (await lessonQuest.count()) {
    await lessonQuest.getByRole('button', { name: /XP/ }).click();
    await expect(lessonQuest.getByLabel('Claimed')).toBeVisible();
  }
  await go(page, '/learn/rw');
  await expect(page.getByTestId('skill-bnd')).toHaveAttribute('aria-label', /2 of 3 stars/);

  // the hardest-pattern set (Stellify originals) opens a session of its own questions
  await go(page, '/practice/hard');
  await expect(page.getByTestId('pattern-set')).toContainText('40 original questions');
  await page.getByTestId('pattern-set').getByRole('link', { name: 'Punctuation (15)' }).click();
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-qid', /^r-cb-bnd-/);
  expect(errors).toEqual([]);
});

test('full course: chapter player teaches step by step, works a hard problem, tracks traps', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, '/learn/bnd');
  await expect(page.getByTestId('course-progress')).toContainText('0 of 6 chapters passed');
  await page.getByTestId('course-continue').click();
  await expect(page.getByTestId('chapter-player')).toContainText('Chapter 1 of 6');
  await page.getByTestId('chapter-next').click(); // → first picture lesson
  const next = async () => { await page.getByTestId('chapter-next').click(); await page.waitForTimeout(350); }; // let each slide settle
  while (!(await page.getByTestId('method').count())) await next();
  await expect(page.getByTestId('chapter-next')).toBeDisabled(); // reveal every step first
  while (await page.getByTestId('method-next').count()) await page.getByTestId('method-next').click();
  await next(); // → cheat sheet
  await expect(page.getByTestId('cheat-sheet')).toContainText('Everything to know');
  await next(); // → worked example(s): each one must be revealed step by step before moving on
  await expect(page.getByTestId('chapter-next')).toBeDisabled();
  while (!(await page.getByTestId('traps').count())) {
    while (await page.getByTestId('walk-next').count()) await page.getByTestId('walk-next').click();
    await expect(page.getByTestId('walk-steps').locator('li').last()).toBeVisible();
    await next();
  }
  await expect(page.getByTestId('traps')).toContainText('Comma splice');
  await next();
  // three hard questions: two right, one wrong (and name the trap)
  for (let i = 0; i < 3; i++) {
    const qid = (await page.getByTestId('chapter-practice').getAttribute('data-qid'))!;
    const q = KEY[qid]; const pick = i < 2 ? (q.answer as number) : ((q.answer as number) + 1) % 4;
    await page.locator(`[data-testid="chapter-practice"] [data-choice="${'ABCD'[pick]}"]`).first().click();
    await page.getByTestId('chapter-check').click();
    await expect(page.getByTestId('explanation')).toBeVisible();
    if (i === 2) { await page.getByTestId('trap-check').locator('button').first().click(); await expect(page.getByTestId('trap-check')).toContainText('Fix:'); }
    await next();
  }
  await expect(page.getByTestId('chapter-score')).toContainText('2 of 3');
  await expect(page.getByTestId('chapter-stars')).toHaveAttribute('data-stars', '2');
  await page.getByTestId('next-chapter').click();
  await expect(page.getByTestId('chapter-player')).toContainText('Chapter 2 of 6');
  await go(page, '/learn/bnd');
  await expect(page.getByTestId('course-progress')).toContainText('1 of 6 chapters passed');
  await expect(page.getByTestId('course-traps')).toContainText('×1');
  await go(page, '/mistakes');
  await expect(page.getByTestId('trap-list')).toBeVisible();
  expect(errors).toEqual([]);
});

test('official questions: import a College Board Question Bank PDF in the app, practice it, take a timed test', async ({ page }) => {
  test.skip(!require('node:fs').existsSync(PDF), 'needs a Question Bank PDF');
  const errors = watch(page);
  page.on('dialog', (d) => d.accept());
  await boot(page);
  await go(page, '/official');
  await page.getByTestId('import-input').setInputFiles(PDF);
  await expect(page.getByTestId('import-result')).toContainText('Found 80 questions: 80 new', { timeout: 60_000 });
  await expect(page.getByTestId('official-rw')).toContainText('80 official');
  await page.reload(); // saved on this device
  await expect(page.getByTestId('official-rw')).toContainText('80 official');
  // an exact-image question (table) and a text question both work
  await go(page, '/practice/session?mode=single&ids=cb-d54126ab');
  await expect(page.getByRole('img', { name: /Official College Board question/ })).toBeVisible();
  await page.locator('[data-choice="B"]').click();
  await page.getByTestId('check').click();
  await expect(page.getByTestId('verdict')).toHaveText(/Correct/);
  await go(page, '/practice/session?mode=single&ids=cb-e3b5bb66');
  await expect(page.getByTestId('question-card')).toContainText('Sleep No More');
  // official questions lead the matching course chapter
  await go(page, '/learn/bnd/bnd-1');
  await expect(page.getByTestId('chapter-player')).toBeVisible();
  // timed test made only of official questions
  await go(page, '/official');
  await page.getByTestId('official-test-rw').click();
  await page.getByTestId('lock-skip').click();
  await expect(page.getByTestId('mock-question')).toHaveAttribute('data-qid', /^cb-/);
  await go(page, '/official');
  await page.getByTestId('clear-imported').click();
  await expect(page.getByTestId('import-result')).toContainText('removed');
  expect(errors).toEqual([]);
});

test('AP Calculus BC: study plan, a full lesson with examples and checked practice, unit review', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, '/calc');
  await expect(page.getByTestId('calc-home')).toContainText('AP Calculus BC');
  for (let u = 0; u <= 10; u++) await expect(page.getByTestId(`calc-unit-${u}`)).toBeVisible();
  await page.getByTestId('calc-exam').fill('2027-05-10');
  await expect(page.getByTestId('calc-pace')).toContainText('weeks until your exam');
  // a beginner starts with the Math Toolkit
  await page.getByTestId('calc-continue').click();
  await expect(page.getByTestId('calc-lesson')).toContainText('Negative numbers, fractions and the order of operations');
  await go(page, '/calc/c1-1');
  await expect(page.getByTestId('calc-lesson')).toContainText('What a limit really is');
  // the tutor layer: plain-words big idea, vocabulary, tools, a reason for every step
  await expect(page.getByTestId('calc-bigidea')).toContainText('The big idea, in plain words');
  await expect(page.getByTestId('calc-words')).toContainText('Indeterminate form');
  await expect(page.getByTestId('calc-tools')).toContainText('Review 0.6');
  await page.getByTestId('calc-example-0').getByTestId('calc-step').click();
  await expect(page.getByTestId('calc-example-0')).toContainText('Step 1');
  await expect(page.getByTestId('calc-example-0').getByTestId('calc-why')).toContainText('Why:');
  // answer every practice problem correctly
  const { CALC_LESSON } = await import('../src/data/calc');
  for (const p of CALC_LESSON['c1-1'].practice) {
    const box = page.getByTestId(`calc-problem-${p.id}`);
    if (typeof p.answer === 'number') await box.locator(`[data-choice="${'ABCDE'[p.answer]}"]`).click();
    else await box.getByTestId('calc-input').fill(p.answer[0] === 'e' ? '2.718' : p.answer[0]);
    await box.getByTestId('calc-check').click();
    await expect(box.getByTestId('calc-solution')).toContainText('Correct!');
  }
  await expect(page.getByTestId('calc-result')).toContainText('Lesson mastered!');
  // every solution is a slow walk-through
  await expect(page.getByTestId('calc-problem-c1-1-1').getByTestId('calc-walk')).toContainText('a hair above 1');
  // teach it back: questions, a saved explanation and the key-point self-check
  await page.getByTestId('calc-teach-q').first().locator('summary').click();
  await expect(page.getByTestId('calc-teach-q').first()).toContainText('For nice functions');
  await page.getByTestId('calc-teach-text').fill('A limit is where the function is heading, not where it is.');
  await page.getByTestId('calc-teach-text').blur();
  for (const box of await page.getByTestId('calc-teach-point').all()) await box.check();
  await expect(page.getByTestId('calc-teach-done')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('calc-teach-text')).toHaveValue('A limit is where the function is heading, not where it is.');
  await go(page, '/calc');
  await expect(page.getByTestId('calc-unit-1')).toContainText('1/9 lessons mastered');
  // a wrong answer shows the solution and the right answer
  await go(page, '/calc/c1-6');
  const box = page.getByTestId('calc-problem-c1-6-3');
  await box.getByRole('button', { name: '∞', exact: true }).click();
  await box.getByTestId('calc-check').click();
  await expect(box.getByTestId('calc-solution')).toContainText('The answer is −∞');
  await go(page, '/calc/review/1');
  await expect(page.getByTestId('calc-review')).toContainText('18 mixed problems');
  // the last unit is written in full too: master its final lesson
  await go(page, '/calc/c10-7');
  await expect(page.getByTestId('calc-lesson')).toContainText('Maclaurin series and building new series');
  for (const p of CALC_LESSON['c10-7'].practice) {
    const box = page.getByTestId(`calc-problem-${p.id}`);
    if (typeof p.answer === 'number') await box.locator(`[data-choice="${'ABCDE'[p.answer]}"]`).click();
    else await box.getByTestId('calc-input').fill(p.answer[0]);
    await box.getByTestId('calc-check').click();
    await expect(box.getByTestId('calc-solution')).toContainText('Correct!');
  }
  await expect(page.getByTestId('calc-result')).toContainText('Lesson mastered!');
  await go(page, '/calc');
  await expect(page.getByTestId('calc-unit-10')).toContainText('1/7 lessons mastered');
  await go(page, '/calc/review/10');
  await expect(page.getByTestId('calc-review')).toContainText('14 mixed problems');
  expect(errors).toEqual([]);
});

test('AP CSA, Microeconomics, Macroeconomics and Statistics: every unit, first and last lesson mastered, tutor layer, review', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  const { COURSES } = await import('../src/data/apCourses');
  for (const id of ['csa', 'micro', 'macro', 'stats']) {
    const c = COURSES[id];
    await go(page, `/${id}`);
    await expect(page.getByTestId('calc-home')).toContainText(c.name);
    for (const u of c.units) await expect(page.getByTestId(`calc-unit-${u.n}`)).toContainText(u.title);
    for (const l of [c.lessons[0], c.lessons[c.lessons.length - 1]]) {
      await go(page, `/${id}/${l.id}`);
      await expect(page.getByTestId('calc-lesson')).toContainText(l.title);
      await expect(page.getByTestId('calc-bigidea')).toBeVisible();
      await expect(page.getByTestId('calc-words')).toContainText(c.tutor[l.id].words[0].term);
      for (const p of l.practice) {
        const box = page.getByTestId(`calc-problem-${p.id}`);
        if (typeof p.answer === 'number') await box.locator(`[data-choice="${'ABCDE'[p.answer]}"]`).click();
        else await box.getByTestId('calc-input').fill(p.answer[0]);
        await box.getByTestId('calc-check').click();
        await expect(box.getByTestId('calc-solution')).toContainText('Correct!');
        await expect(box.getByTestId('calc-walk').locator('li')).toHaveCount(c.tutor[l.id].walk[p.id].length);
      }
      await expect(page.getByTestId('calc-result')).toContainText('Lesson mastered!');
      await expect(page.getByTestId('calc-teach')).toBeVisible();
    }
    await go(page, `/${id}`);
    await expect(page.getByTestId('calc-unit-1')).toContainText(`1/${c.lessonsOfUnit(1).length} lessons mastered`);
    await go(page, `/${id}/review/1`);
    await expect(page.getByTestId('calc-review')).toContainText('mixed problems');
  }
  // CSA grades program output exactly: 3 is not 3.0
  const intDiv = COURSES.csa.lessons.flatMap((l) => l.practice).find((p) => Array.isArray(p.answer) && /^\d+\.0$/.test(p.answer[0]))!;
  const lessonId = COURSES.csa.lessons.find((l) => l.practice.includes(intDiv))!.id;
  await go(page, `/csa/${lessonId}`);
  const box = page.getByTestId(`calc-problem-${intDiv.id}`);
  await box.getByTestId('calc-input').fill((intDiv.answer as string[])[0].replace('.0', ''));
  await box.getByTestId('calc-check').click();
  await expect(box.getByTestId('calc-solution')).toContainText(`The answer is ${(intDiv.answer as string[])[0]}`);
  // Statistics accepts a sensible rounding (0.1056 for 0.106) and a typed % sign, and still rejects a wrong value
  await go(page, '/stats/st1-3');
  for (const [pid, typed, ok] of [['st1-3-3', '0.1056', true], ['st1-3-2', '68%', true], ['st1-3-6', '0.75', false]] as const) {
    const b = page.getByTestId(`calc-problem-${pid}`);
    await b.getByTestId('calc-input').fill(typed);
    await b.getByTestId('calc-check').click();
    if (ok) await expect(b.getByTestId('calc-solution')).toContainText('Correct!');
    else await expect(b.getByTestId('calc-solution')).not.toContainText('Correct!');
  }
  expect(errors).toEqual([]);
});

test('soft feel: night-sky backdrop, press ripples, sparkles for a right answer, and calm when motion is reduced', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  const sky = page.getByTestId('backdrop');
  await expect(sky.locator('.aurora')).toHaveCount(3);
  await expect(sky.locator('.star')).toHaveCount(64);
  // count ripples as they are added (each one removes itself when its animation ends)
  const watchRipples = () => page.evaluate(() => {
    const w = window as unknown as { ripples: number };
    w.ripples = 0;
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if ((n as Element).classList?.contains('ripple')) w.ripples++; }))).observe(document.body, { childList: true, subtree: true });
  });
  const ripples = () => page.evaluate(() => (window as unknown as { ripples: number }).ripples);
  await go(page, '/practice/session?mode=single&ids=r-bnd-06');
  await watchRipples();
  await solve(page, true);
  expect(await ripples()).toBeGreaterThanOrEqual(2); // the choice and the Check button both rippled
  await expect(page.getByTestId('verdict')).toHaveClass(/pop-in/);
  await expect(page.getByTestId('verdict').locator('.sparkles > span')).toHaveCount(10);
  await go(page, '/practice/session?mode=single&ids=r-bnd-05');
  await solve(page, false);
  await expect(page.getByTestId('verdict')).toHaveClass(/shake/);
  await expect(page.getByTestId('verdict').locator('.sparkles')).toHaveCount(0);
  // with "Reduce motion" on: no ripples, and the sky holds still
  await go(page, '/settings');
  await page.getByLabel(/Reduce motion/).check();
  await expect(sky).toHaveClass(/backdrop-still/);
  await go(page, '/practice/session?mode=single&ids=r-bnd-06');
  await watchRipples();
  await solve(page, true);
  expect(await ripples()).toBe(0);
  expect(errors).toEqual([]);
});

test('official full practice test: import the three College Board PDFs, take it, official score, study plan, adaptive SAT-style test', async ({ page }) => {
  const dir = require('node:path').join(__dirname, '..', 'private', 'cb', 't4');
  test.skip(!require('node:fs').existsSync(dir), 'needs a local copy of Practice Test 4');
  const errors = watch(page);
  page.on('dialog', (d) => d.accept());
  await boot(page);
  await go(page, '/official');
  await page.getByTestId('fulltest-input').setInputFiles(['sat-practice-test-4-digital.pdf', 'scoring-sat-practice-test-4-digital.pdf', 'sat-practice-test-4-answers-digital.pdf'].map((f) => `${dir}/${f}`));
  await expect(page.getByTestId('fulltest-result')).toContainText('Imported SAT Practice Test 4: 66 Reading & Writing and 54 Math questions, with the College Board score conversion table', { timeout: 120_000 });
  await page.reload(); // saved on this device
  await go(page, '/mocks');
  await page.getByTestId('start-fulltest-pt4').click();
  await page.getByTestId('lock-skip').click();
  await expect(page.getByTestId('mock-question')).toHaveAttribute('data-qid', 'pt4-rw1-01');
  // submit every module blank: the official table turns raw 0 into 200 + 200
  for (let i = 0; i < 4; i++) {
    if (i === 2) await page.getByTestId('end-break').click();
    await page.getByTestId('q-nav-toggle').click(); await page.getByRole('button', { name: 'Go to the review page' }).click();
    await page.getByTestId('submit-module').click();
  }
  await expect(page.getByTestId('mock-total')).toHaveText('400');
  await expect(page.getByTestId('score-note')).toContainText('official raw-score conversion table');
  await expect(page.getByTestId('plan-focus').first()).toBeVisible();
  await page.getByTestId('adopt-plan').click();
  await expect(page.getByTestId('plan-adopted')).toBeVisible();
  await go(page, '/mocks');
  await expect(page.getByTestId('realsat-cover-math')).toContainText('% official');
  await page.getByTestId('start-realsat').click();
  await page.getByTestId('lock-skip').click();
  await expect(page.getByTestId('mock-question')).toBeVisible();
  expect(errors).toEqual([]);
});

test('personal copy: all seven official practice tests, original remix tests and the blend are built in', async ({ page }) => {
  const personal = resolve(__dirname, '../private/stellify-personal.html');
  test.skip(!require('node:fs').existsSync(personal) || !require('node:fs').existsSync(resolve(__dirname, '../private/cb')), 'needs the private personal build');
  const errors = watch(page);
  page.on('dialog', (d) => d.accept());
  const P = `file://${personal}`;
  await page.goto(`${P}#/onboarding`);
  await page.getByRole('button', { name: 'Skip setup' }).click();
  await page.goto(`${P}#/mocks`);
  for (const n of [4, 5, 6, 7, 8, 9, 10]) await expect(page.getByTestId(`fulltest-pt${n}`)).toContainText(`SAT Practice Test ${n}`);
  await expect(page.getByTestId('remix-card')).toContainText('Original Remix Test 1');
  expect(await page.getByTestId('remix-card').locator('li').count()).toBeGreaterThanOrEqual(4);
  await page.getByTestId('start-remix-1').click();
  await page.getByTestId('lock-skip').click();
  await expect(page.getByTestId('mock-question')).toBeVisible();
  await expect(page.getByText('Reading & Writing · Module 1 of 2')).toBeVisible();
  await page.goto(`${P}#/mocks`);
  await page.getByTestId('start-blend').click();
  await page.getByTestId('lock-skip').click();
  await expect(page.getByTestId('mock-question')).toBeVisible();
  await page.goto(`${P}#/mocks`);
  await page.getByTestId('start-fulltest-pt10').click();
  await page.getByTestId('lock-skip').click();
  await expect(page.getByTestId('mock-question')).toHaveAttribute('data-qid', 'pt10-rw1-01');
  // explanations: "In simple words" first, then the College Board's own explanation
  await page.goto(`${P}#/practice/session?mode=single&ids=pt4-rw1-22`);
  await page.locator('[data-choice="A"]').click();
  await page.getByTestId('check').click();
  await expect(page.getByTestId('simple-explanation')).toContainText('The answer is D.');
  await expect(page.getByTestId('simple-explanation')).toContainText('The subject “the triangle” is one thing');
  await expect(page.getByTestId('simple-explanation')).toContainText('How to do this kind of question');
  await expect(page.getByText('College Board explanation').first()).toBeVisible();
  await page.goto(`${P}#/practice/session?mode=single&ids=pt4-math1-01`);
  await page.locator('[data-choice="B"]').click();
  await page.getByTestId('check').click();
  await expect(page.getByTestId('verdict')).toHaveText(/Correct/);
  await expect(page.getByTestId('simple-explanation')).toContainText('The answer is B.');
  await expect(page.getByTestId('official-rationale')).toBeVisible();
  expect(errors).toEqual([]);
});

/** Drags the mouse across a phrase inside a highlightable block, the way a student selects words. */
async function selectWords(page: Page, block: string, phrase: string) {
  const box = await page.evaluate(([sel, ph]) => {
    const host = document.querySelector(sel)!;
    const w = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const i = n.textContent!.indexOf(ph);
      if (i < 0) continue;
      const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + ph.length);
      const rs = [...r.getClientRects()];
      return { a: [rs[0].left + 1, rs[0].top + rs[0].height / 2], b: [rs[rs.length - 1].right - 1, rs[rs.length - 1].top + rs[rs.length - 1].height / 2] };
    }
    return null;
  }, [block, phrase] as const);
  expect(box, phrase).not.toBeNull();
  await page.mouse.move(box!.a[0], box!.a[1]);
  await page.mouse.down();
  await page.mouse.move(box!.b[0], box!.b[1], { steps: 8 });
  await page.mouse.up();
  return box!;
}
/** waits until the app's saved data (IndexedDB) contains this text, so a reload cannot race the write */
const stored = (page: Page, text: string) => expect.poll(() => page.evaluate(() => new Promise<string>((done) => {
  const open = indexedDB.open('keyval-store');
  open.onerror = () => done('');
  open.onsuccess = () => { const get = open.result.transaction('keyval', 'readonly').objectStore('keyval').get('stellify-state-v1'); get.onsuccess = () => done(String(get.result ?? '')); get.onerror = () => done(''); };
}))).toContain(text);
const painted = (page: Page) => page.evaluate(() => Object.fromEntries(['yellow', 'blue', 'pink', 'underline', 'note'].map((c) => [c, [...(CSS.highlights.get(`hl-${c}`) ?? [])].map((r) => (r as Range).toString())])));

test('highlights and notes: select words, pick a color, add a note, keep them, remove them; tests start clean', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, '/practice/session?mode=single&ids=r-bnd-06');
  await expect(page.getByTestId('hl-tip')).toBeVisible();
  await expect(page.getByText('Stellify original', { exact: true })).toBeVisible(); // original questions are labelled as such
  const PASSAGE = '[data-hl$="|passage"]';
  await selectWords(page, PASSAGE, 'Honeybees have brains');
  await page.getByTestId('hl-yellow').click();
  await selectWords(page, PASSAGE, 'trained the bees');
  await page.getByTestId('hl-underline').click();
  await expect.poll(() => painted(page)).toMatchObject({ yellow: ['Honeybees have brains'], underline: ['trained the bees'] });
  await expect(page.getByTestId('hl-tip')).toHaveCount(0);
  // a click on a highlight opens it: recolor it and attach a note
  const at = await selectWords(page, PASSAGE, 'brains');
  await page.mouse.click(at.a[0] + 4, at.a[1]); // a plain click (no drag) on the highlighted word
  await expect(page.getByTestId('hl-yellow')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('hl-pink').click();
  await page.mouse.click(at.a[0] + 4, at.a[1]);
  await page.getByTestId('hl-note').click();
  await page.getByTestId('hl-note-text').fill('Contrast: a tiny brain, yet it learns faces');
  await page.getByTestId('hl-note-save').click();
  await expect(page.getByTestId('hl-notes')).toContainText('Contrast: a tiny brain, yet it learns faces');
  await expect(page.getByTestId('hl-summary')).toContainText('2 highlights · 1 note');
  // saved on this device
  await stored(page, 'Contrast: a tiny brain, yet it learns faces');
  await page.reload();
  await expect.poll(() => painted(page)).toMatchObject({ pink: ['Honeybees have brains'], underline: ['trained the bees'], note: ['Honeybees have brains'] });
  // remove one, clear the rest
  await page.mouse.click(at.a[0] + 4, at.a[1]);
  await page.getByTestId('hl-remove').click();
  await expect.poll(() => painted(page)).toMatchObject({ pink: [], underline: ['trained the bees'] });
  await page.getByTestId('hl-clear').click();
  await expect.poll(() => painted(page)).toMatchObject({ underline: [] });
  // a timed test has its own clean slate, and the header's Highlights & Notes button works like Bluebook's
  await go(page, '/mocks');
  await page.getByRole('button', { name: /R&W · 64 min/ }).first().click();
  await page.getByTestId('lock-skip').click();
  const block = '[data-testid="mock-question"] [data-hl$="|passage"], [data-testid="mock-question"] [data-hl$="|stem"]';
  await page.getByTestId('hl-annotate').click();
  await expect(page.getByTestId('hl-hint')).toContainText('Select words in the question first');
  expect((await painted(page)).yellow).toEqual([]);
  const words = await page.evaluate((sel) => document.querySelector(sel)!.textContent!.trim().split(/\s+/).slice(0, 3).join(' '), block);
  await selectWords(page, block, words);
  await page.getByTestId('hl-annotate').click();
  await page.getByTestId('hl-note-text').fill('main claim');
  await page.getByTestId('hl-note-save').click();
  await expect.poll(() => painted(page)).toMatchObject({ yellow: [words], note: [words] });
  expect(errors).toEqual([]);
});

test('personal copy: highlight an official page image by dragging across its printed lines', async ({ page }) => {
  const personal = resolve(__dirname, '../private/stellify-personal.html');
  test.skip(!require('node:fs').existsSync(personal), 'needs the private personal build');
  const errors = watch(page);
  const P = `file://${personal}`;
  await page.goto(`${P}#/onboarding`);
  await page.getByRole('button', { name: 'Skip setup' }).click();
  await page.goto(`${P}#/mocks`);
  await page.getByTestId('start-fulltest-pt4').click();
  await page.getByTestId('lock-skip').click();
  for (let i = 0; i < 12; i++) await page.getByTestId('mock-next').click();
  await expect(page.getByTestId('mock-question')).toHaveAttribute('data-qid', 'pt4-rw1-13'); // a graph question, printed as an image
  const img = page.getByTestId('hl-image');
  await expect.poll(async () => Number(await img.getAttribute('data-lines'))).toBeGreaterThan(15); // printed lines found in the pixels
  await img.scrollIntoViewIfNeeded();
  const b = (await img.boundingBox())!;
  await page.mouse.move(b.x + 0.45 * b.width, b.y + 0.565 * b.height);
  await page.mouse.down();
  await page.mouse.move(b.x + 0.5 * b.width, b.y + 0.61 * b.height, { steps: 8 });
  await page.mouse.up();
  await page.getByTestId('hl-blue').click();
  await expect(img.locator('.hl-box-blue')).toHaveCount(3); // the rest of one line, the next line, and part of the third, like a text selection
  const first = (await img.locator('.hl-box-blue').first().boundingBox())!;
  await page.mouse.click(first.x + first.width / 2, first.y + first.height / 2);
  await expect(page.getByTestId('hl-remove')).toBeVisible();
  await page.getByTestId('hl-note').click();
  await page.getByTestId('hl-note-text').fill('the graph shows 2,600 to 2,800');
  await page.getByTestId('hl-note-save').click();
  await expect(img.locator('.hl-note-dot')).toHaveCount(1);
  await expect(page.getByTestId('hl-notes')).toContainText('the graph shows 2,600 to 2,800');
  expect(errors).toEqual([]);
});

test('exam simulator: directions, question navigator, docked calculator, 5-minute alert, module-by-module report', async ({ page }) => {
  await page.removeLocatorHandler(page.getByTestId('close-directions'));
  const errors = watch(page);
  page.on('dialog', (d) => d.accept());
  await page.clock.install();
  await boot(page);
  await go(page, '/mocks');
  await page.getByRole('button', { name: /Math · 70 min/ }).first().click();
  await page.getByTestId('lock-skip').click();
  await expect(page.getByTestId('directions')).toContainText('22 questions · 35 minutes');
  await expect(page.getByTestId('directions')).toContainText('type your own answer');
  await page.getByTestId('close-directions').click();
  // the navigator shows where you are and jumps anywhere in the module
  await page.getByTestId('q-nav-toggle').click();
  await expect(page.getByTestId('q-nav').locator('[aria-current="true"]')).toHaveText('1');
  await page.getByTestId('q-nav').getByRole('button', { name: /^Question 5,/ }).click();
  await expect(page.getByTestId('q-nav-toggle')).toContainText('Question 5 of 22');
  await page.getByRole('button', { name: 'Mark for review' }).click();
  await page.getByTestId('q-nav-toggle').click();
  await expect(page.getByTestId('q-nav').getByRole('button', { name: /^Question 5, unanswered, marked for review, current/ })).toBeVisible();
  await page.getByTestId('q-nav-toggle').click();
  // the calculator docks beside the question instead of covering it
  await page.getByTestId('toggle-calc').click();
  await expect(page.getByTestId('calc-panel')).toBeVisible();
  await expect(page.getByTestId('mock-question')).toBeVisible();
  await page.getByTestId('toggle-calc').click();
  await expect(page.getByTestId('calc-panel')).toHaveCount(0);
  // directions reopen from the top bar
  await page.getByTestId('open-directions').click();
  await page.getByTestId('close-directions').click();
  // with 5 minutes left an alert appears once
  await page.clock.fastForward('30:30');
  await expect(page.getByTestId('five-minutes')).toContainText('5 minutes left in this module');
  // answer one question, then let time run out on both modules; the report shows each module
  await page.clock.fastForward('05:00');
  await expect(page.getByTestId('directions')).toHaveCount(0); // Module 2 starts without the directions
  await page.clock.fastForward('35:00');
  await expect(page.getByTestId('module-report')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('module-report').locator('tbody tr')).toHaveCount(2);
  await expect(page.getByTestId('module-report')).toContainText('Math 1');
  await expect(page.getByTestId('module-report')).toContainText(/Easier set|Harder set/);
  expect(errors).toEqual([]);
});

test('confidence: a sure wrong answer is diagnosed as a likely misconception, with the trap it fell for', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, '/practice/session?mode=single&ids=r-bnd-06');
  await expect(page.getByTestId('confidence')).toHaveCount(0); // asked only once an answer is chosen
  await answerCurrent(page, false);
  await page.getByTestId('conf-sure').click();
  await expect(page.getByTestId('conf-sure')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('check').click();
  await expect(page.getByTestId('diagnosis')).toContainText('You were sure');
  await expect(page.getByTestId('diagnosis')).toContainText('trap');
  expect(errors).toEqual([]);
});
