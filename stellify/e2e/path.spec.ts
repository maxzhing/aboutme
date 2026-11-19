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

test('Path: the map, keyboard movement between neighbouring hexes, the skill panel and the list view', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, '/path');
  await expect(page.getByTestId('today')).toBeVisible();
  await expect(page.getByTestId('hexmap').locator('[data-testid^="hex-"]')).toHaveCount(19);
  // exactly one recommended hex, and its label says so
  const rec = page.locator('[data-recommended="true"]');
  await expect(rec).toHaveCount(1);
  await expect(rec).toHaveAttribute('aria-label', /recommended next/);
  // roving tabindex: one hex is in the tab order; arrow keys move to neighbours
  await expect(page.locator('#main [data-testid^="hex-"][tabindex="0"]')).toHaveCount(1);
  await page.getByTestId('hex-lin1').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('hex-lin2')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('hex-sys')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('skill-panel')).toContainText('Linear systems');
  await expect(page.getByTestId('skill-panel')).toContainText('★1 Learned');
  // list view: the same skills as plain rows; the choice is remembered
  await page.getByTestId('view-list').click();
  await expect(page.getByTestId('path-list').getByRole('button')).toHaveCount(19);
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
  await expect(page.getByTestId('hex-lin1')).toHaveAttribute('aria-label', /Linear equations, 2 of 3 stars/);
  // stars are kept after a reload
  await page.reload();
  await expect(page.getByTestId('hex-lin1')).toHaveAttribute('aria-label', /2 of 3 stars/);
  expect(errors).toEqual([]);
});

test('Path on a phone: a zigzag of the same hexes and a sticky next step', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  const errors = watch(page);
  await boot(page);
  await go(page, '/path');
  await expect(page.getByTestId('hexzig')).toBeVisible();
  await expect(page.getByTestId('hexmap')).toBeHidden();
  await expect(page.getByTestId('sticky-next')).toBeVisible();
  const box = await page.getByTestId('zig-lin1').boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
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
