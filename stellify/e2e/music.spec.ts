import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';

const FILE = `file://${resolve(__dirname, '../dist/stellify.html')}`;
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
/** press a key n times */
const press = async (page: Page, key: string, n = 1) => { for (let i = 0; i < n; i++) await page.keyboard.press(key); };

test('AP Music Theory: course home, writing a chord on the staff (keyboard only), multiple choice, listening', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, '/music');
  await expect(page.getByRole('heading', { name: 'AP Music Theory', level: 1 })).toBeVisible();
  for (let u = 1; u <= 8; u++) await expect(page.getByTestId(`calc-unit-${u}`)).toBeVisible();
  await expect(page.getByTestId('open-studio')).toBeVisible();

  await go(page, '/music/mt3-1');
  await expect(page.getByTestId('score').first()).toBeVisible();
  // problem 1: build a D major triad by keyboard (the cursor starts on B4)
  const p1 = page.getByTestId('calc-problem-mt3-1-1');
  await p1.getByTestId('staff-pad').focus();
  await press(page, 'ArrowDown', 5); await press(page, 'Enter');                 // D4
  await press(page, 's'); await press(page, 'ArrowUp', 2); await press(page, 'Enter'); // F#4
  await press(page, 'n'); await press(page, 'ArrowUp', 2); await press(page, 'Enter'); // A4
  await expect(p1.getByTestId('staff-readout')).toHaveText('Your notes: D4, F♯4, A4');
  await p1.getByTestId('task-check').click();
  await expect(p1.getByTestId('calc-solution')).toContainText('Correct! The engine checked every note.');

  // a wrong chord gets specific feedback and the first try counts
  const p6 = page.getByTestId('calc-problem-mt3-1-6');
  await p6.getByTestId('staff-pad').focus();
  await press(page, 'f'); await press(page, 'ArrowDown', 1); await press(page, 'Enter'); // Ab4
  await press(page, 'n'); await press(page, 'ArrowUp', 2); await press(page, 'Enter');  // C5
  await press(page, 'f'); await press(page, 'ArrowUp', 2); await press(page, 'Enter');  // Eb5
  await p6.getByTestId('task-check').click();
  await expect(p6.getByTestId('task-result')).toContainText('first inversion, put C at the bottom');
  await expect(p6.getByTestId('calc-solution')).toBeVisible();

  // multiple choice with notation
  const p2 = page.getByTestId('calc-problem-mt3-1-2');
  await p2.locator('[data-choice="B"]').click();
  await p2.getByTestId('calc-check').click();
  await expect(p2.getByTestId('calc-solution')).toContainText('Correct!');
  // listening problems have a play button
  await expect(page.getByTestId('calc-problem-mt3-1-8').getByTestId('listen')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Music Studio: live analysis, ear training and a part-writing exercise checked by the engine', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await go(page, '/music/studio');
  await expect(page.getByTestId('studio-analysis')).toContainText('C major triad, root position');
  await expect(page.getByTestId('studio-analysis')).toContainText('In C major: I');

  await page.getByRole('tab', { name: 'Ear training' }).click();
  await page.getByTestId('ear-choice').first().click();
  await expect(page.getByTestId('ear-result')).toBeVisible();
  await expect(page.getByTestId('ear-score')).toHaveText(/^[01]\/1$/);
  await page.getByTestId('ear-next').click();
  await expect(page.getByTestId('ear-result')).toHaveCount(0);

  await page.getByRole('tab', { name: 'Part writing' }).click();
  await page.getByTestId('pw-2').click(); // V7 – I in C major, bass given
  const pad = page.getByTestId('satb-pad');
  await pad.focus();
  // soprano (key 1, cursor E5): F5 then E5
  await press(page, '1'); await press(page, 'ArrowUp'); await press(page, 'Enter'); await press(page, 'ArrowRight'); await press(page, 'ArrowDown'); await press(page, 'Enter');
  // alto (key 2, cursor G4): C5 in chord 2, B4 in chord 1
  await press(page, '2'); await press(page, 'ArrowUp', 3); await press(page, 'Enter'); await press(page, 'ArrowLeft'); await press(page, 'ArrowDown'); await press(page, 'Enter');
  // tenor (key 3, cursor C4): D4 in chord 1, C4 in chord 2
  await press(page, '3'); await press(page, 'ArrowUp'); await press(page, 'Enter'); await press(page, 'ArrowRight'); await press(page, 'ArrowDown'); await press(page, 'Enter');
  await expect(page.getByTestId('satb-readout')).toContainText('1. V7: S F5, A B4, T D4, B G2');
  await page.getByTestId('task-check').click();
  await expect(page.getByTestId('task-result')).toContainText('Correct!');

  // a parallel-fifths mistake is caught and explained: I – IV – V with the soprano C5 – C5 – D5 over the bass C3 – F2 – G2
  await page.getByTestId('pw-1').click();
  await page.getByTestId('satb-pad').focus();
  await press(page, '1'); await press(page, 'ArrowDown', 2); await press(page, 'Enter');        // S C5
  await press(page, 'ArrowRight'); await press(page, 'Enter');                                    // S C5
  await press(page, 'ArrowRight'); await press(page, 'ArrowUp'); await press(page, 'Enter');     // S D5
  await press(page, '2'); await press(page, 'ArrowUp', 2); await press(page, 'Enter');           // A B4 (chord 3)
  await press(page, 'ArrowLeft'); await press(page, 'ArrowDown'); await press(page, 'Enter');    // A A4 (chord 2)
  await press(page, 'ArrowLeft'); await press(page, 'ArrowDown'); await press(page, 'Enter');    // A G4 (chord 1)
  await press(page, '3'); await press(page, 'ArrowUp', 2); await press(page, 'Enter');           // T E4 (chord 1)
  await press(page, 'ArrowRight'); await press(page, 'ArrowUp'); await press(page, 'Enter');     // T F4 (chord 2)
  await press(page, 'ArrowRight'); await press(page, 'ArrowUp'); await press(page, 'Enter');     // T G4 (chord 3)
  await expect(page.getByTestId('satb-readout')).toContainText('3. V: S D5, A B4, T G4, B G2');
  await page.getByTestId('task-check').click();
  const result = page.getByTestId('task-result');
  await expect(result).toContainText('Chords 2–3: parallel fifths between the soprano and bass');
  await expect(result).toContainText('Chords 2–3: parallel octaves between the tenor and bass');
  expect(errors).toEqual([]);
});

test('Nova: one mascot from the first visit, no egg, and a name that sticks', async ({ page }) => {
  const errors = watch(page);
  await boot(page);
  await expect(page.getByTestId('pet-card')).toBeVisible();
  await expect(page.getByTestId('dash-egg')).toHaveCount(0);
  await go(page, '/pet');
  await expect(page.getByRole('heading', { level: 1, name: 'Nova' })).toBeVisible();
  await expect(page.getByText(/egg/i)).toHaveCount(0);
  await page.getByRole('textbox').last().fill('Sparky');
  await page.getByRole('button', { name: 'Rename' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sparky' })).toBeVisible();
  await page.getByTestId('pet-pet').click();
  await expect(page.getByText(/Sparky loves that/)).toBeVisible();
  await page.reload();
  await go(page, '/pet');
  await expect(page.getByRole('heading', { level: 1, name: 'Sparky' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('flat design: no gradients anywhere (CSS backgrounds, pseudo-elements, text or SVG)', async ({ page }) => {
  await boot(page);
  const routes = ['/', '/learn', '/learn/math', '/practice', '/practice/session?mode=single&ids=r-bnd-06', '/music', '/music/mt4-4', '/music/studio', '/pet', '/rewards', '/achievements', '/analytics', '/mocks', '/calc', '/calc/c1-1', '/stats', '/remix', '/official', '/settings', '/arena', '/speed', '/daily'];
  const found: string[] = [];
  for (const theme of ['dark', 'light']) {
    if (theme === 'light') { await go(page, '/settings'); await page.getByTestId('theme-light').click(); }
    for (const r of routes) {
      await go(page, r);
      await page.waitForTimeout(250);
      const hits = await page.evaluate(() => {
        const out: string[] = [];
        const els = Array.from(document.querySelectorAll('*'));
        for (const el of els) for (const pseudo of [null, '::before', '::after']) {
          const st = getComputedStyle(el, pseudo);
          for (const v of [st.backgroundImage, st.maskImage, st.borderImageSource, (st as unknown as { webkitMaskImage?: string }).webkitMaskImage ?? '']) if (v && v.includes('gradient')) out.push(`${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).slice(0, 40)}${pseudo ?? ''}`);
        }
        out.push(...Array.from(document.querySelectorAll('linearGradient, radialGradient')).map(() => 'svg gradient'));
        return out;
      });
      for (const h of new Set(hits)) found.push(`${theme} ${r}: ${h}`);
    }
  }
  expect(found).toEqual([]);
});
