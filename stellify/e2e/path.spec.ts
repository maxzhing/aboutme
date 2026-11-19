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

test('Path: grouped 3D hexagon clusters along a path, keyboard movement, a skill panel and a list view', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, '/path');
  await expect(page.getByTestId('today')).toBeVisible();
  const map = page.getByTestId('lesson-path');
  await expect(map.locator('[data-testid^="node-"]')).toHaveCount(19);
  // clusters in the SAT's domain order, going down the page
  const y = async (id: string) => (await page.getByTestId(id).boundingBox())!.y;
  expect(await y('unit-adv')).toBeGreaterThan(await y('unit-alg'));
  expect(await y('unit-geo')).toBeGreaterThan(await y('unit-psda'));
  // exactly one recommended tile; it says "Start here" inside and stands taller
  const rec = page.locator('[data-recommended="true"]');
  await expect(rec).toHaveCount(1);
  await expect(rec).toHaveAttribute('aria-label', /Step 1 of 19: Linear equations.*recommended next/);
  await expect(page.getByTestId('start-bubble')).toHaveCount(1);
  await expect(rec.locator('.node-riser')).toHaveCount(1);
  // roving tabindex; arrow keys move to the next or previous step
  await expect(map.locator('[data-testid^="node-"][tabindex="0"]')).toHaveCount(1);
  await page.getByTestId('node-lin1').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('node-lin2')).toBeFocused();
  for (let k = 0; k < 4; k++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('node-sys')).toBeFocused();
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

test('worked examples: climb a four-rung fading ladder, and finishing it earns the skill’s first Path star', async ({ page }) => {
  const errors = watch(page);
  const { WORKED_BY_SKILL } = await import('../src/data/worked');
  const f = WORKED_BY_SKILL.lin1![0];
  await boot(page);
  await go(page, '/worked/lin1');
  const ladder = page.getByTestId(`ladder-${f.id}`);
  // rung 1: fully worked; every step's reason must be opened (after explaining it to yourself)
  await expect(ladder.getByTestId('rung-next')).toBeDisabled();
  while (await ladder.getByTestId('show-why').count()) await ladder.getByTestId('show-why').first().click();
  await ladder.getByTestId('rung-next').click();
  // rungs 2 and 3: the last one, then the last two steps are blank
  for (const rung of [1, 2]) {
    const steps = f.rungs[rung].steps;
    const blanks = f.fade[rung - 1];
    for (let k = steps.length - blanks; k < steps.length; k++) {
      await ladder.getByTestId('blank-input').first().fill(steps[k].answer[0]);
      await ladder.getByTestId('blank-check').first().click();
    }
    await ladder.getByTestId('rung-next').click();
  }
  // rung 4: on your own; a wrong answer is caught first
  await ladder.getByTestId('blank-input').fill('999');
  await ladder.getByTestId('blank-check').click();
  await expect(ladder).toContainText('Not yet');
  await ladder.getByTestId('blank-input').fill(f.rungs[3].final[0]);
  await ladder.getByTestId('blank-check').click();
  await ladder.getByTestId('rung-next').click();
  await expect(ladder.getByTestId('ladder-finished')).toBeVisible();
  await go(page, '/path');
  await expect(page.getByTestId('node-lin1')).toHaveAttribute('aria-label', /Linear equations, 1 of 3 stars/);
  expect(errors).toEqual([]);
});

test('Predict-First: choices stay hidden until a prediction is written, then the student grades it and sees their pattern', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, '/predict?skill=tra');
  const item = page.getByTestId('predict-item');
  await expect(item.locator('[data-choice]')).toHaveCount(0);
  await expect(page.getByTestId('show-choices')).toBeDisabled();
  await page.getByTestId('prediction').fill('contrast');
  await page.getByTestId('show-choices').click();
  await expect(item.locator('[data-choice]')).toHaveCount(4);
  await item.locator('[data-choice="A"]').click();
  await page.getByTestId('predict-check').click();
  await page.getByTestId('self-matched').click();
  await expect(page.getByTestId('predict-pattern')).toContainText('1 predictions: 1 matched');
  expect(errors).toEqual([]);
});

test('Desmos Lab: what you type is checked against the problem, graphed offline, and the answer read from it is checked', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, '/desmos/lab');
  const lab = page.getByTestId('lab-intersect');
  await lab.getByTestId('lab-expr').nth(0).fill('y = 3(2x - 5) + 4');
  await lab.getByTestId('lab-expr').nth(1).fill('y = 2x + 13 + 1');
  await lab.getByTestId('lab-graph').click();
  await expect(lab).toContainText('do not match');
  await lab.getByTestId('lab-expr').nth(1).fill('y = 2x + 13'); // an equivalent form of 2(x + 7) - 1 is accepted
  await lab.getByTestId('lab-graph').click();
  await expect(lab.getByTestId('lab-graphed')).toBeVisible();
  await lab.getByTestId('lab-answer').fill('6');
  await lab.getByTestId('lab-check').click();
  await expect(lab.getByTestId('lab-result')).toContainText('Correct');
  await page.getByTestId('drill-0').fill('9');
  await page.getByTestId('drill-done').click();
  await expect(page.getByTestId('drill-result')).toContainText('1 of 5 right');
  expect(errors).toEqual([]);
});
