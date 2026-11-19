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
async function answer(page: Page, correct: boolean) {
  const qid = (await page.getByTestId('question-card').getAttribute('data-qid'))!;
  const q = KEY[qid];
  if (q.choices) await page.locator(`[data-testid="question-card"] [data-choice="${'ABCD'[correct ? (q.answer as number) : ((q.answer as number) + 1) % 4]}"]`).click();
  else await page.locator(`#spr-${qid}`).fill(correct ? (q.answer as string[])[0] : '99999');
  await page.getByTestId('check').click();
  await expect(page.getByTestId('explanation')).toBeVisible();
}

test('Path: a ladder of 3D hexagon steps in lesson order, climbed with the arrow keys, with a skill panel and a list view', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, '/path');
  await expect(page.getByTestId('today')).toBeVisible();
  const ladder = page.getByTestId('lesson-path');
  await expect(ladder.locator('[data-testid^="node-"]')).toHaveCount(19);
  // units in the SAT's domain order, with step 1 at the bottom of the ladder
  await expect(page.getByTestId('unit-alg')).toContainText('Unit 1');
  const y = async (id: string) => (await page.getByTestId(id).boundingBox())!.y;
  expect(await y('node-lin2')).toBeLessThan(await y('node-lin1'));
  expect(await y('unit-adv')).toBeLessThan(await y('unit-alg'));
  // exactly one recommended step, the only one with a "Start here" tag, and it stands taller
  const rec = page.locator('[data-recommended="true"]');
  await expect(rec).toHaveCount(1);
  await expect(rec).toHaveAttribute('aria-label', /Step 1 of 19: Linear equations.*recommended next/);
  await expect(page.getByTestId('start-bubble')).toHaveCount(1);
  await expect(rec.locator('.node-riser')).toHaveCount(1);
  // roving tabindex: one step is in the tab order; up climbs, down steps back
  await expect(ladder.locator('[data-testid^="node-"][tabindex="0"]')).toHaveCount(1);
  await page.getByTestId('node-lin1').focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('node-lin2')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('node-sys')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('skill-panel')).toContainText('★1 Learned');
  await expect(page.getByTestId('skill-panel')).toContainText('Linear systems');
  // list view: the same skills as plain rows; the choice is remembered
  await page.getByTestId('view-list').click();
  await expect(page.getByTestId('path-list').getByRole('button')).toHaveCount(19);
  await page.waitForTimeout(400); // let saves to browser storage finish
  await page.reload();
  await expect(page.getByTestId('path-list')).toBeVisible();
  await go(page, '/path/rw');
  await expect(page.getByTestId('path-list').getByRole('button')).toHaveCount(11);
  expect(errors).toEqual([]);
});

test('Path: a practice set passed on the first try earns stars, and the result is reported', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, '/path/set?kind=check&skill=lin1');
  for (let i = 0; i < 5; i++) {
    await answer(page, true);
    await page.getByTestId('next').click();
  }
  await expect(page.getByTestId('session-summary')).toBeVisible();
  await page.getByRole('link', { name: 'Back to the Path' }).first().click();
  await expect(page.getByTestId('set-result')).toContainText('Skip check: Linear equations');
  await expect(page.getByTestId('set-result')).toContainText('passed');
  await page.getByTestId('view-map').click();
  await expect(page.getByTestId('node-lin1')).toHaveAttribute('aria-label', /Linear equations, 2 of 3 stars/);
  // stars are kept after a reload
  await page.waitForTimeout(600); // let the save to browser storage finish
  await page.reload();
  await expect(page.getByTestId('node-lin1')).toHaveAttribute('aria-label', /2 of 3 stars/);
  expect(errors).toEqual([]);
});

test('Path on a phone: the same ladder fits, steps are big enough to tap, a skill opens as a dialog, and the next step is always one tap away', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  const errors = watch(page);
  await boot(page);
  await go(page, '/path');
  await expect(page.getByTestId('lesson-path')).toBeVisible();
  await expect(page.getByTestId('sticky-next')).toBeVisible();
  const box = await page.getByTestId('node-lin1').boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await page.getByTestId('node-lin1').click();
  await expect(page.getByRole('dialog')).toContainText('★1 Learned');
  expect(errors).toEqual([]);
});

test('dashboard leads with Today, and the shortcut sheet opens with "?"', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await expect(page.getByTestId('today')).toBeVisible();
  await expect(page.getByTestId('today-item').first()).toBeVisible();
  await expect(page.getByTestId('week-rhythm')).toContainText('/');
  await page.keyboard.press('?');
  await expect(page.getByTestId('shortcut-sheet')).toContainText('next question');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('shortcut-sheet')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('item statistics: export anonymous item data and review it on the maintainer page, with no decisions under 100 responses', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await page.clock.install();
  await go(page, '/practice/session?mode=single&ids=r-bnd-06');
  await page.clock.fastForward(20_000); // a considered answer, not a rapid guess
  await answer(page, true);
  await go(page, '/settings');
  const download = page.waitForEvent('download');
  await page.getByTestId('export-items').click();
  const file = await (await download).path();
  const data = JSON.parse(require('node:fs').readFileSync(file!, 'utf8'));
  expect(data.app).toBe('stellify-items');
  expect(JSON.stringify(data)).not.toContain('profile');
  expect(data.events[0]).toMatchObject({ item_id: 'r-bnd-06', correct: true, context: 'practice' });
  await go(page, '/maintainer');
  await page.getByTestId('maintainer-files').setInputFiles(file!);
  await expect(page.getByTestId('maintainer-summary')).toContainText('1 file · 1 people · 1 cleaned first attempts');
  await expect(page.getByTestId('no-flags')).toContainText('No item has 100 responses yet');
  expect(errors).toEqual([]);
});

test('test-day hub: a dated checklist that is saved, sources marked "needs verification", and a school list', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, '/test-day');
  await page.getByTestId('td-date').fill('2026-12-05');
  await expect(page.getByTestId('phase-one-week')).toContainText('Nov 28');
  await page.getByTestId('tick-id').click();
  await expect(page.getByTestId('tick-id')).toHaveAttribute('aria-checked', 'true');
  await page.waitForTimeout(600); // let the save to browser storage finish
  await page.reload();
  await expect(page.getByTestId('tick-id')).toHaveAttribute('aria-checked', 'true');
  expect(await page.getByTestId('needs-verification').count()).toBeGreaterThan(5);
  await expect(page.getByTestId('no-snapshot')).toBeVisible();
  await page.getByLabel('School', { exact: true }).fill('Example State University');
  await page.getByLabel('Policy you found there').selectOption('optional');
  await page.getByTestId('add-school').click();
  await expect(page.getByTestId('school-row')).toContainText('Test-optional');
  expect(errors).toEqual([]);
});
