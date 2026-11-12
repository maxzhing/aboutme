import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { ALL_RAW } from '../src/data/questions/all';

const FILE = `file://${resolve(__dirname, '../dist/stellify.html')}`;
const KEY = Object.fromEntries(ALL_RAW.map((q) => [q.id, q]));
const go = (page: Page, route: string) => page.goto(`${FILE}#${route}`);

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
  // answered in under a second, so the engine suggests "careless"; the student can relabel it
  await expect(page.getByRole('button', { name: 'Careless mistake' })).toHaveAttribute('aria-pressed', 'true');
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
  await expect(page.getByText('Math · Module 1 of 2')).toBeVisible();
  await expect(page.getByLabel(/Time remaining/)).toContainText(/3[45]:\d\d/);
  for (let i = 0; i < 22; i++) {
    await answerCurrent(page, true, 'mock-question');
    await page.getByTestId(i < 21 ? 'mock-next' : 'mock-review').click();
  }
  await expect(page.getByText('0 unanswered')).toBeVisible();
  await page.getByTestId('submit-module').click();
  await expect(page.getByText('Math · Module 2 of 2')).toBeVisible();
  await page.reload(); // an exam in progress survives a reload
  await expect(page.getByText('Math · Module 2 of 2')).toBeVisible();
  await page.getByRole('button', { name: 'All questions' }).click();
  await page.getByTestId('submit-module').click(); // leaves module 2 blank (confirm dialog accepted)
  await expect(page.getByTestId('mock-results')).toBeVisible();
  await expect(page.getByTestId('mock-results')).toContainText('Module 2: harder set'); // 22/22 in module 1 routes upward
  await expect(page.getByTestId('mock-results')).toContainText('22/44 correct');
  await expect(page.getByText('Domain performance')).toBeVisible();
  await expect(page.getByText('Answer key and explanations')).toBeVisible();
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

  await go(page, '/learn/bnd');
  for (const h of ['Start here', 'The full explanation', 'Important rules', 'Worked examples', 'Common mistakes', 'SAT shortcuts', 'Practice by difficulty', 'Mastery']) await expect(page.getByRole('heading', { name: h })).toBeVisible();
  await page.getByTestId('complete-lesson').click();
  await expect(page.getByTestId('complete-lesson')).toContainText('Completed');
  await page.getByTestId('lesson-practice-very-hard').click();
  await expect(page.getByTestId('question-card')).toContainText('Very Hard');

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
  expect(links.length).toBe(27);
  for (const href of links) {
    await page.goto(`${FILE}${href}`);
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.getByText('Page not found')).toHaveCount(0);
  }
  await go(page, '/resources');
  const urls = await page.getByTestId('resource').locator('a[target=_blank]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
  expect(urls.length).toBeGreaterThanOrEqual(15);
  for (const u of urls) expect(u).toMatch(/^https:\/\/([a-z]+\.)*(collegeboard\.org|khanacademy\.org|desmos\.com)\//);
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
