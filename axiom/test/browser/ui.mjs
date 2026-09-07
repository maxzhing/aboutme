/**
 * Drives the real UI in Chromium against a running server.
 * Usage: node test/browser/ui.mjs <baseUrl> [outDir]
 */
import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8799';
const outDir = process.argv[3] || '/tmp/axiom-shots';
fs.mkdirSync(outDir, { recursive: true });

const results = [];
const errors = [];
let failed = 0;

function check(name, condition, detail = '') {
  results.push({ name, ok: Boolean(condition), detail });
  if (!condition) failed++;
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });

page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error' && !/favicon|fonts\.googleapis|cdn\.jsdelivr|net::ERR/.test(msg.text())) {
    errors.push(`console: ${msg.text()}`);
  }
});

const shot = async (name) => page.screenshot({ path: `${outDir}/${name}.png`, fullPage: false });

try {
  /* ------------------------------------------------------------------ home */
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.hero h1', { timeout: 15000 });
  check('home page renders the hero', await page.locator('.hero h1').isVisible());
  check('home page offers example prompts', (await page.locator('.example').count()) >= 6);
  check('the ask box is focused', await page.evaluate(() => document.activeElement?.tagName === 'TEXTAREA'));
  await shot('01-home');

  /* --------------------------------------------------------------- session */
  await page.fill('.ask textarea', 'Teach me quadratic equations');
  await page.click('.ask-bar .btn.primary');

  await page.waitForSelector('.turn.tutor .prose', { timeout: 30000 });
  check('the session opens and the tutor speaks', await page.locator('.turn.tutor').first().isVisible());
  await page.waitForSelector('.question', { timeout: 30000 });
  check('the tutor ends the turn with something to do', await page.locator('.question').first().isVisible());
  check('the session rail shows the plan', await page.locator('.session-side .side-title').first().isVisible());
  check('the "I\'m stuck" ladder is offered', (await page.locator('.stuck-option').count()) >= 4);
  check('the URL became a real session', /#\/session\/ses_/.test(page.url()), page.url());
  await shot('02-session');

  /* ------------------------------------------------------ answering a question */
  const choices = page.locator('.question .choice');
  if (await choices.count()) {
    await choices.nth(1).click();
    check('a choice can be selected', await choices.nth(1).evaluate((el) => el.classList.contains('selected')));
  } else {
    await page.fill('.question input.input, .question textarea', 'CORRECT — because momentum is conserved');
  }
  await page.click('.question .btn.primary');
  await page.waitForSelector('.turn .chip', { timeout: 30000 });
  const turnCount = await page.locator('.turn').count();
  check('answering produces a graded response and a new turn', turnCount >= 3, `${turnCount} turns`);
  await shot('03-answered');

  /* -------------------------------------------------------------- directive */
  await page.locator('.composer-bar .btn', { hasText: 'Harder' }).click();
  await page.waitForFunction((n) => document.querySelectorAll('.turn').length > n, turnCount, { timeout: 30000 });
  check('"make it harder" runs a new turn', (await page.locator('.turn').count()) > turnCount);

  /* ----------------------------------------------------------- mode switch */
  const turnsBeforeMode = await page.locator('.turn').count();
  await page.locator('.session-side .toggle', { hasText: 'Quiz' }).first().click();
  await page.waitForFunction((n) => document.querySelectorAll('.turn').length > n, turnsBeforeMode, { timeout: 30000 });
  check('switching teaching mode runs a turn in the new mode', (await page.locator('.turn').count()) > turnsBeforeMode);
  let activeMode = '';
  try {
    await page.waitForFunction(
      () => document.querySelector('.session-side .toggle.on')?.textContent.trim() === 'Quiz',
      null,
      { timeout: 10000 },
    );
    activeMode = 'Quiz';
  } catch {
    activeMode = (await page.locator('.session-side .toggle.on').first().textContent().catch(() => '(none)')).trim();
  }
  check('the rail reflects the new mode', activeMode === 'Quiz', `active: ${activeMode}`);

  /* --------------------------------------------------------------- studio */
  await page.goto(`${base}/#/studio`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.studio-form .toggle', { timeout: 15000 });
  check('the studio exposes resource kinds', (await page.locator('.studio-form .toggle').count()) >= 10);
  await page.fill('.studio-form input.input', 'Cellular respiration');
  await page.click('.studio-form .btn.primary');
  await page.waitForSelector('.question', { timeout: 60000 });
  const qCount = await page.locator('.question').count();
  check('the studio generates a worksheet with questions', qCount >= 3, `${qCount} questions`);
  check('generated questions show difficulty metadata', (await page.locator('.q-meta .chip').count()) > 0);
  await shot('04-worksheet');

  /* ------------------------------------------------------------ submitting */
  const firstChoices = page.locator('.question').first().locator('.choice');
  if (await firstChoices.count()) {
    for (let i = 0; i < Math.min(qCount, 4); i++) {
      const c = page.locator('.question').nth(i).locator('.choice');
      if (await c.count()) await c.nth(0).click();
    }
  }
  const submit = page.locator('.btn.primary', { hasText: 'Submit for grading' });
  if (await submit.count()) {
    await submit.click();
    await page.waitForSelector('.scoreboard', { timeout: 90000 });
    check('submitting produces a scored, analysed result', await page.locator('.scoreboard').isVisible());
    check('the score ring renders', await page.locator('.score-ring').isVisible());
    await shot('05-graded');
  } else {
    check('worksheet offers whole-paper submission', false, 'no submit button found');
  }

  /* ------------------------------------------------------------- dashboard */
  await page.goto(`${base}/#/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.stat-grid', { timeout: 20000 });
  check('the dashboard shows learner stats', (await page.locator('.stat').count()) >= 4);
  await page.waitForSelector('.card', { timeout: 15000 });
  check('the dashboard shows continue-learning and progress cards', (await page.locator('.card').count()) >= 4);
  await shot('06-dashboard');

  /* ----------------------------------------------------------------- goals */
  await page.locator('.card', { hasText: 'Learning goals' }).locator('.btn', { hasText: 'Add a goal' }).click();
  await page.waitForSelector('.modal', { timeout: 10000 });
  await page.locator('.modal input.input').first().fill('Master single-variable calculus');
  await page.locator('.modal input.input').nth(1).fill('Maths');
  await page.locator('.modal .btn.primary').click();
  await page.waitForSelector('.card:has-text("Learning goals") .mastery-bar', { timeout: 20000 });
  check('a learning goal is created and tracked', await page.locator('.card', { hasText: 'Learning goals' }).locator('.mastery-bar').first().isVisible());

  /* -------------------------------------------------------------- mastery */
  await page.goto(`${base}/#/progress`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.bar-row', { timeout: 20000 });
  check('the mastery map renders concept levels', (await page.locator('.concept-row').count()) >= 1);
  await shot('07-mastery');

  /* --------------------------------------------------------------- library */
  await page.goto(`${base}/#/library`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.list-item', { timeout: 20000 });
  const libraryCount = await page.locator('.list-item').count();
  check('the library lists generated resources', libraryCount >= 1, `${libraryCount} items`);
  check('library rows link to a resource page', await page.locator('.list-item').first().isVisible());

  /* ---------------------------------------------------------------- review */
  await page.goto(`${base}/#/review`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.card', { timeout: 20000 });
  check('the review queue renders', await page.locator('.card').first().isVisible());
  await shot('08-review');

  /* ----------------------------------------------------------- light mode */
  await page.goto(`${base}/#/dashboard`, { waitUntil: 'networkidle' });
  const themeBefore = await page.getAttribute('html', 'data-theme');
  await page.locator('.rail-foot .nav-item').first().click();
  await page.waitForTimeout(400);
  const themeAfter = await page.getAttribute('html', 'data-theme');
  check('the theme toggle switches themes', themeBefore !== themeAfter, `${themeBefore} -> ${themeAfter}`);
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('the theme repaints the page background', Boolean(bodyBg) && bodyBg !== 'rgba(0, 0, 0, 0)', bodyBg);
  await shot(`09-${themeAfter}`);
  if (themeAfter !== 'dark') await page.locator('.rail-foot .nav-item').first().click();

  /* -------------------------------------------------------------- mobile */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/#/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.stat-grid', { timeout: 15000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('no horizontal overflow on mobile', overflow <= 1, `overflow ${overflow}px`);
  await shot('10-mobile');
} catch (err) {
  check(`test run completed without throwing`, false, err.message);
  await shot('99-failure');
} finally {
  check('no uncaught JavaScript errors', errors.length === 0, errors.slice(0, 4).join(' | '));
  await browser.close();
}

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} browser checks passed`);
process.exit(failed ? 1 : 0);
