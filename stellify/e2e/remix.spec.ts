import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { ALL_RAW } from '../src/data/questions/all';

const FILE = `file://${resolve(__dirname, '../dist/stellify.html')}`;
const go = (page: Page, route: string) => page.goto(`${FILE}#${route}`);
const LIN = ALL_RAW.find((q) => q.skill === 'lin1' && q.choices)!;
const CID = ALL_RAW.find((q) => q.skill === 'cid' && q.choices)!;

test.beforeEach(async ({ page }) => { await page.addLocatorHandler(page.getByTestId('close-directions'), async () => { await page.getByTestId('close-directions').click(); }); });
function watch(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/desmos/i.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}
async function boot(page: Page) {
  await go(page, '/onboarding');
  await page.getByRole('button', { name: 'Skip setup' }).click();
  await expect(page.getByTestId('greeting')).toBeVisible();
}
/** the saved state, read straight from IndexedDB */
const state = (page: Page) => page.evaluate(() => new Promise<string>((done) => {
  const open = indexedDB.open('keyval-store');
  open.onerror = () => done('{}');
  open.onsuccess = () => { const get = open.result.transaction('keyval', 'readonly').objectStore('keyval').get('stellify-state-v1'); get.onsuccess = () => done(String(get.result ?? '{}')); get.onerror = () => done('{}'); };
}));
/** answers the remix on screen (its key is read from the saved state, as a student cannot see it) */
async function answerRemix(page: Page, correct: boolean) {
  const card = page.getByTestId('question-card');
  const qid = (await card.getAttribute('data-qid'))!;
  expect(qid.startsWith('gx-')).toBe(true);
  let q: { answer: number | string[]; choices?: string[] } | undefined;
  await expect.poll(async () => { q = JSON.parse(await state(page)).state?.remix?.items?.[qid]; return !!q; }).toBe(true);
  if (q!.choices) await card.locator(`[data-choice="${'ABCD'[correct ? (q!.answer as number) : ((q!.answer as number) + 1) % 4]}"]`).click();
  else await page.locator(`#spr-${qid}`).fill(correct ? (q!.answer as string[])[0] : '99999');
  await page.getByTestId('check').click();
  await expect(page.getByTestId('explanation')).toBeVisible();
  return qid;
}

test('remix from a missed question: Smart Remix explains itself, chains grow, progress persists and flows into the Mistake Bucket', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, `/practice/session?mode=single&ids=${LIN.id}`);
  await page.locator(`[data-testid="question-card"] [data-choice="${'ABCD'[((LIN.answer as number) + 1) % 4]}"]`).click();
  await page.getByTestId('check').click();
  await page.getByTestId('remix-this').click();
  await expect(page.getByTestId('remix-smart')).toBeVisible();
  await expect(page.getByText(/You missed this one/)).toBeVisible(); // Smart Remix says why before generating
  await page.getByTestId('remix-smart').click();
  await expect(page.getByTestId('remix-info')).toContainText('Automatically validated');
  await expect(page.getByTestId('remix-info')).toContainText('Why Smart Remix chose this');
  await expect(page.getByTestId('question-card')).toBeVisible();
  // hints are specific to the generated question
  await page.getByRole('button', { name: /Hint 1 of 3/ }).click();
  await expect(page.getByText('Hint 1 · Concept')).toBeVisible();
  const missed = await answerRemix(page, false);
  await expect(page.getByTestId('remix-actions')).toBeVisible();
  await page.getByTestId('remix-again').click();
  await expect(page.getByTestId('remix-chain-nav').getByRole('link', { name: /^2\./ })).toBeVisible();
  await answerRemix(page, true);
  await page.getByTestId('remix-harder').click();
  await expect(page.getByTestId('remix-chain-nav').getByRole('link', { name: /^3\./ })).toBeVisible();
  await page.getByTestId('remix-save-chain').click();
  await expect(page.getByTestId('remix-save-chain')).toContainText('Chain saved');
  // everything survives a reload
  await expect.poll(async () => Object.keys(JSON.parse(await state(page)).state?.remix?.items ?? {}).length).toBe(3);
  await page.reload();
  await expect(page.getByTestId('remix-chain-nav').getByRole('link', { name: /^3\./ })).toBeVisible();
  // the missed remix is in the Mistake Bucket, and remixing it goes back to the original
  await go(page, '/mistakes');
  await expect(page.locator(`text=${missed}`).or(page.getByTestId('remix-mistake').first())).toBeVisible();
  await go(page, '/remix');
  await expect(page.getByTestId('remix-chain').first()).toContainText('3 of 8 steps');
  await expect(page.getByTestId('remix-chain').first()).toContainText('Saved');
  // analytics report remixes separately from the bank
  await go(page, '/analytics');
  await expect(page.getByTestId('remix-card')).toContainText('2 generated questions');
  expect(errors).toEqual([]);
});

test('Reading & Writing: every offered transformation generates a validated question; unsupported ones are disabled, not faked', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, `/remix?q=${CID.id}`);
  for (const mode of ['number', 'context', 'representation', 'reverse', 'reasoning', 'challenge']) {
    await page.getByTestId(`remix-mode-${mode}`).click();
    // wait for THIS remix (its mode name), not the previous one still on screen
    await expect(page.getByTestId('remix-info')).toContainText(`${mode[0].toUpperCase()}${mode.slice(1)} Remix`);
    await expect(page.getByTestId('remix-info')).toContainText('Automatically validated');
    await expect(page.getByTestId('question-card')).toBeVisible();
  }
  await go(page, `/remix?q=${ALL_RAW.find((q) => q.skill === 'tra')!.id}`);
  await expect(page.getByTestId('remix-mode-reverse')).toBeDisabled();
  await expect(page.getByTestId('remix-mode-number')).toBeEnabled();
  // the reviewer section lists what was generated and can approve it
  await go(page, '/qc');
  await expect(page.getByTestId('remix-review-item')).toHaveCount(6);
  await page.getByTestId('remix-review-item').first().getByRole('button').first().click();
  await page.getByTestId('remix-approve').click();
  await expect(page.getByTestId('remix-review-item').first()).toContainText('Approved by a reviewer');
  expect(errors).toEqual([]);
});

test('calculators: Desmos panel in mock exams, offline fallback, built-in scientific calculator', async ({ page, context }) => {
  const errors = watch(page);
  page.on('dialog', (d) => d.accept());
  await boot(page);
  await go(page, '/mocks');
  await page.getByRole('button', { name: /Math · 70 min/ }).first().click();
  await page.getByTestId('lock-skip').click();
  await page.getByTestId('toggle-calc').click();
  await expect(page.getByTestId('calc-tools')).toBeVisible();
  await expect(page.getByTestId('desmos-graphing')).toHaveAttribute('src', 'https://www.desmos.com/testing/collegeboard/graphing');
  await page.getByRole('tab', { name: 'Desmos scientific' }).click();
  await expect(page.getByTestId('desmos-scientific')).toHaveAttribute('src', /collegeboard\/scientific/);
  await page.getByRole('tab', { name: 'Built-in scientific' }).click();
  await page.getByTestId('sci-input').fill('3^2 + sqrt(16)');
  await expect(page.getByTestId('sci-preview')).toContainText('13');
  await page.getByTestId('sci-equals').click();
  await expect(page.getByTestId('sci-calc')).toContainText('= 13');
  await expect(page.getByTestId('mock-question')).toBeVisible();
  // offline, Desmos says so and offers the built-in tools
  await context.setOffline(true);
  await page.getByRole('tab', { name: 'Desmos graphing' }).click();
  await expect(page.getByTestId('desmos-offline')).toBeVisible();
  await page.getByRole('button', { name: 'Use the built-in calculator' }).click();
  await expect(page.getByRole('tab', { name: 'Built-in grapher' })).toHaveAttribute('aria-selected', 'true');
  await context.setOffline(false);
  // the Desmos Masterclass has the same panel and a guided tour
  await go(page, '/desmos');
  await expect(page.getByText('Get to know it: 10 things to try')).toBeVisible();
  await expect(page.getByTestId('calc-tools')).toBeVisible();
  expect(errors).toEqual([]);
});
