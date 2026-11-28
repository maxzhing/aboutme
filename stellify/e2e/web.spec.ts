import { expect, test } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

/** The hosted web build (../sat), served over http like GitHub Pages would. Run `npm run build:web` first. */
const ROOT = resolve(__dirname, '../..');
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.mp4': 'video/mp4', '.jpg': 'image/jpeg' };
let server: Server; let base = '';
test.beforeAll(async () => {
  server = createServer((req, res) => {
    const p = join(ROOT, decodeURIComponent((req.url ?? '/').split('?')[0]));
    const f = existsSync(p) && statSync(p).isDirectory() ? join(p, 'index.html') : p;
    if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
    const body = readFileSync(f), type = TYPES[extname(f)] ?? 'application/octet-stream';
    // byte ranges, as GitHub Pages serves them: a video can only be seeked with these
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
    if (range) {
      const start = range[1] ? Number(range[1]) : body.length - Number(range[2]), end = range[1] && range[2] ? Number(range[2]) : body.length - 1;
      res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${body.length}`, 'content-length': end - start + 1 });
      res.end(body.subarray(start, end + 1)); return;
    }
    res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes' }); res.end(body);
  });
  await new Promise<void>((r) => server.listen(0, () => r()));
  base = `http://localhost:${(server.address() as { port: number }).port}/sat/`;
});
test.afterAll(() => server?.close());
test.skip(!existsSync(join(ROOT, 'sat/index.html')), 'run npm run build:web first');

test('web build: the landing page has a real question you can answer, with no app script needed', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Free SAT practice');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.locator('#try-out')).toContainText('Pick an answer first');
  await page.locator('.l-choice').nth(1).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.locator('#try-out .verdict')).toBeVisible();
  await expect(page.locator('footer')).toContainText('SAT® and AP® are trademarks');
  // browser only: nothing to download (owner decision)
  await expect(page.locator('a[download]')).toHaveCount(0);
  expect((await page.request.get(`${base}stellify.html`)).status()).toBe(404);
  expect(errors).toEqual([]);
});

test('web build: the site opens with the fly-over film, then asks: sign in with Google or continue as guest', async ({ browser }) => {
  const page = await browser.newPage();
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base);
  const film = page.locator('#intro-film');
  await expect(film).toBeVisible();
  await expect.poll(() => film.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 10_000 }).toBeGreaterThan(0.5); // it really plays
  await expect(page.getByTestId('landing-guest')).toBeHidden();
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(page.getByTestId('landing-google')).toBeVisible();
  await expect(page.getByTestId('landing-google')).toHaveAttribute('href', 'app.html#/onboarding?choose=google');
  await page.getByTestId('landing-guest').click();
  await page.waitForURL(/app\.html/);
  expect(await page.evaluate(() => localStorage.getItem('stellify-account'))).toBe('guest');
  await expect(page.getByTestId('continue-guest')).toHaveCount(0); // a guest isn't asked again
  // "Sign in with Google" opens the account choice, even for a returning guest
  await page.goto(`${base}app.html#/onboarding?choose=google`);
  await expect(page.getByTestId('continue-guest')).toBeVisible();
  expect(errors).toEqual([]);
  await page.close();
  // the film fills the screen, and a phone gets the tall version
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(base);
  expect(await phone.locator('#intro-film').evaluate((v: HTMLVideoElement) => v.currentSrc || v.src)).toMatch(/flyover-tall\.mp4$/);
  const box = await phone.locator('#intro-film').boundingBox();
  expect(box && Math.round(box.width) === 390 && Math.round(box.height) === 844).toBe(true);
  await phone.close();
  // with reduced motion the film doesn't play: the choice is there straight away
  const still = await browser.newPage({ reducedMotion: 'reduce' });
  await still.goto(base);
  await expect(still.getByTestId('landing-google')).toBeVisible();
  expect(await still.locator('#intro-film').evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await still.close();
});

test('web build: "Have a problem?" is on the landing page and in the app, and reports are emailed to the team', async ({ page }) => {
  await page.goto(base);
  await expect(page.locator('.l-help')).toContainText('Have a problem?');
  await expect(page.locator('.l-help a[href="mailto:stellifyprep@gmail.com"]')).toBeVisible();
  // the app: its footer, and the Help page's report form (the report service is stood in for here)
  const sent: string[] = [];
  await page.addInitScript(() => { (window as unknown as { __STELLIFY_REPORT_URL__: string }).__STELLIFY_REPORT_URL__ = 'https://script.google.com/macros/s/test/exec'; });
  await page.route('https://script.google.com/macros/s/test/exec', (r) => { sent.push(r.request().postData() ?? ''); r.fulfill({ status: 200, body: 'ok' }); });
  await page.locator('.l-help a[href="app.html#/help"]').click();
  await expect(page.getByTestId('help-card')).toContainText('stellifyprep@gmail.com');
  await expect(page.getByTestId('footer-help')).toContainText('stellifyprep@gmail.com');
  const form = page.getByTestId('report-form').last();
  await form.getByLabel('What is it about?').selectOption('Signing in or saving');
  await form.getByLabel('What happened?').fill('The sign-out button did nothing.');
  await form.getByLabel(/Your email/).fill('student@example.com');
  await form.getByTestId('report-send').click();
  await expect(page.getByTestId('report-sent')).toBeVisible();
  expect(JSON.parse(sent[0])).toMatchObject({ kind: 'Signing in or saving', message: 'The sign-out button did nothing.', replyTo: 'student@example.com', page: '/help' });
});

test('web build: before the report service is set up, a report opens the email app with the report written in', async ({ page }) => {
  await page.goto(`${base}app.html#/onboarding`);
  await page.getByTestId('continue-guest').click();
  await page.getByRole('button', { name: 'Skip setup' }).click();
  await page.goto(`${base}app.html#/help`);
  const form = page.getByTestId('report-form').last();
  await form.getByLabel('What happened?').fill('A lesson would not play.');
  await form.getByTestId('report-send').click();
  await expect(page.getByTestId('report-mail')).toBeVisible();
});

test('web build: the landing question is a hard bank question, with the same full explanation the app shows', async ({ page }) => {
  const Q = JSON.parse(execFileSync('npx', ['tsx', 'scripts/landing-question.ts', 'r-inf-06'], { cwd: join(ROOT, 'stellify'), encoding: 'utf8' }));
  await page.goto(base);
  await expect(page.locator('.l-try .eyebrow')).toContainText('Hard');
  await expect(page.locator('#try-explain')).toBeHidden();
  const wrong = Q.answer === 0 ? 1 : 0;
  await page.locator('.l-choice').nth(wrong).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.locator('#try-out .verdict')).toContainText(`Incorrect · Your answer: ${'ABCD'[wrong]} · Correct answer: ${'ABCD'[Q.answer]}`);
  const ex = page.locator('#try-explain');
  await expect(ex).toBeVisible();
  for (const h of ['Step-by-step solution', `Why ${'ABCD'[Q.answer]} is correct`, 'Why each other choice fails', 'The underlying concept', 'Fastest reliable method', 'Common trap', 'What to remember']) await expect(ex).toContainText(h);
  for (const t of [...Q.steps, Q.why[Q.answer], Q.concept, Q.strategy, Q.trap, Q.remember, ...Q.why.filter((_: string, i: number) => i !== Q.answer)]) await expect(ex).toContainText(t);
  await expect(ex.locator(`li[data-i="${wrong}"]`)).toHaveClass(/picked/);
  await page.locator('.l-choice').nth(Q.answer).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.locator('#try-out .verdict')).toContainText('Correct ·');
});

test('web build: the landing page lists the AP courses, and its donation form works with set and custom amounts', async ({ page }) => {
  await page.goto(base);
  await expect(page.locator('.l-ap li')).toHaveCount(7);
  for (const n of ['AP Calculus BC', 'AP Computer Science A', 'AP Microeconomics', 'AP Macroeconomics', 'AP Statistics', 'AP Chemistry', 'AP Music Theory']) await expect(page.locator('.l-ap')).toContainText(n);
  const go = page.locator('#donate-go');
  await expect(go).toHaveText('Donate $5');
  await page.locator('.l-amount', { hasText: '$25' }).click();
  await expect(go).toHaveText('Donate $25');
  await page.locator('.l-amount', { hasText: 'Other' }).click();
  await expect(go).toBeDisabled();
  await page.locator('#donate-other').fill('abc');
  await expect(page.locator('#donate-out')).toContainText('Enter an amount from $1 to $1000');
  await expect(go).toBeDisabled();
  await page.locator('#donate-other').fill('$12.50');
  await expect(go).toHaveText('Donate $12.5');
  await go.click();
  await expect(page.locator('#donate-out')).toContainText('Online donations open soon'); // no payment page set yet
});

test('web build: in the app, Support Stellify takes set and custom amounts and opens the payment page with the amount', async ({ page }) => {
  await page.goto(`${base}app.html#/onboarding`);
  await page.getByTestId('continue-guest').click();
  await page.getByRole('button', { name: 'Skip setup' }).click();
  await page.goto(`${base}app.html#/settings`);
  await expect(page.getByTestId('donate-card')).toBeVisible();
  await page.goto(`${base}app.html#/donate`);
  await page.getByTestId('donate-10').click();
  await expect(page.getByTestId('donate-go')).toHaveText('Donate $10');
  await page.getByTestId('donate-go').click();
  await expect(page.getByTestId('donate-soon')).toBeVisible(); // not set up yet
  // once a payment page is set, the chosen amount goes into its address
  await page.evaluate(() => { const w = window as unknown as { __STELLIFY_DONATE_URL__: string; opened: string[]; open: (u: string) => null }; w.__STELLIFY_DONATE_URL__ = 'https://pay.example/donate?amount={amount}'; w.opened = []; w.open = (u: string) => { w.opened.push(u); return null; }; });
  await page.getByTestId('donate-other').click();
  await page.getByTestId('donate-amount').fill('0');
  await expect(page.getByTestId('donate-go')).toBeDisabled();
  await page.getByTestId('donate-amount').fill('40');
  await page.getByTestId('donate-go').click();
  expect(await page.evaluate(() => (window as unknown as { opened: string[] }).opened)).toEqual(['https://pay.example/donate?amount=40']);
  await expect(page.getByTestId('donate-opened')).toBeVisible();
});

test('web build: the app loads over http, and after one visit it opens offline (service worker)', async ({ page, context }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}app.html#/onboarding`);
  await page.getByTestId('continue-guest').click(); // on the website, the first choice: Google account or guest
  await page.getByRole('button', { name: 'Skip setup' }).click();
  await page.goto(`${base}app.html#/path`);
  await expect(page.getByTestId('path-page')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.goto(`${base}app.html#/learn/math`); // visit a second page so its chunk is cached
  await expect(page.getByRole('heading', { name: 'Math Academy' })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Math Academy' })).toBeVisible();
  await page.goto(`${base}app.html#/path`);
  await expect(page.getByTestId('path-page')).toBeVisible();
  await context.setOffline(false);
  expect(errors).toEqual([]);
});

test('web build: a video lesson plays the real video with a voice, captions and chapters, and stops for the question', async ({ page }) => {
  test.skip(!existsSync(join(ROOT, 'sat/videos/linf.mp4')), 'the rendered videos are not in this build');
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}app.html#/onboarding`);
  await page.getByTestId('continue-guest').click(); // on the website, the first choice: Google account or guest
  await page.getByRole('button', { name: 'Skip setup' }).click();
  await page.goto(`${base}app.html#/videos/linf`);
  const v = page.getByTestId('lesson-video-el');
  await expect(v).toBeVisible();
  await expect.poll(() => v.evaluate((el: HTMLVideoElement) => el.readyState)).toBeGreaterThanOrEqual(1);
  const info = await v.evaluate((el: HTMLVideoElement) => ({ d: el.duration, tracks: el.textTracks.length, w: el.videoWidth }));
  expect(info.d).toBeGreaterThan(60);
  expect(info.tracks).toBe(1);
  expect(info.w).toBe(1280);
  // jump to just before the pause-and-try question: the video stops there by itself
  const quizChapter = page.getByRole('navigation', { name: 'Chapters' }).getByRole('button').filter({ hasText: 'Pause and try' });
  await quizChapter.click();
  await v.evaluate((el: HTMLVideoElement) => { el.muted = true; el.currentTime += 3.2; return el.play(); });
  await expect(page.getByTestId('video-pause-quiz')).toBeVisible({ timeout: 15_000 });
  expect(await v.evaluate((el: HTMLVideoElement) => el.paused)).toBe(true);
  await page.getByTestId('video-choice-1').click();
  await expect(page.getByTestId('video-quiz-why')).toContainText('Right');
  await page.getByTestId('video-continue').click();
  await expect(page.getByTestId('video-pause-quiz')).toBeHidden();
  expect(errors).toEqual([]);
});

test('web build: animated lessons play their narration from the site, stay behind review, and contact no other domain', async ({ page }) => {
  test.skip(!existsSync(join(ROOT, 'sat/videos/lessons/sys-w1.mp3')), 'the lessons are not built');
  const external: string[] = [], errors: string[] = [];
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(base.split('/sat/')[0]) && !/^(data|blob):/.test(u)) external.push(u); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}app.html#/onboarding`);
  await page.getByTestId('continue-guest').click();
  await page.getByRole('button', { name: 'Skip setup' }).click();
  // not yet approved by the review: the lesson is not offered, and the skill video page keeps the previous version
  const approvals = JSON.parse(readFileSync(join(ROOT, 'stellify/content/lessons/approvals.json'), 'utf8'));
  const unapproved = ['sys-w1', 'circ-w1', 'inf-w1'].find((id) => !approvals[id]?.criticApproved);
  if (unapproved) {
    await page.goto(`${base}app.html#/videos/w/${unapproved}`);
    await expect(page.getByText('Walkthrough not available yet')).toBeVisible();
  }
  // an approved one is offered without the preview flag
  if (approvals['sys-w1']?.criticApproved) { await page.goto(`${base}app.html#/videos/w/sys-w1`); await expect(page.getByTestId('lesson-start')).toBeVisible(); }
  await page.goto(`${base}app.html#/videos/lin1`);
  await expect(page.getByTestId('narrated-lesson')).toHaveCount(0);
  // the preview: the narrated lesson
  await page.goto(`${base}app.html#/videos/w/sys-w1?preview=1`);
  await page.getByTestId('lesson-start').click();
  const audio = page.getByTestId('lesson-audio');
  await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.readyState)).toBeGreaterThanOrEqual(1);
  expect(await audio.evaluate((a: HTMLAudioElement) => a.currentSrc)).toContain('/sat/videos/lessons/sys-w1.mp3');
  await expect(page.getByTestId('lesson-caption')).toBeVisible();
  // jump into the silent try-it-first pause: it can be skipped
  await audio.evaluate((a: HTMLAudioElement) => { a.muted = true; a.currentTime = 15; });
  await expect(page.getByTestId('skip-pause')).toBeVisible();
  await page.getByTestId('skip-pause').click();
  await expect(page.getByTestId('try-first')).toBeHidden();
  await page.getByTestId('lesson-transcript-toggle').click();
  await expect(page.getByTestId('lesson-transcript')).toContainText('Proportional coefficients');
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('web build: on 320 and 360 px phones every worked step and every piece of math fits (nothing hidden off the edge)', async ({ browser }) => {
  test.skip(!existsSync(join(ROOT, 'sat/videos/lessons/circ-w1.mp3')), 'the lessons are not built');
  const M = JSON.parse(readFileSync(join(ROOT, 'stellify/src/data/narrated/manifests.json'), 'utf8'));
  // math pieces whose box sticks out of their nearest block parent (inline parents are skipped)
  const overflowing = (root: Element) => [...root.querySelectorAll('.katex')].filter((k) => {
    let q = k.parentElement as HTMLElement;
    while (q && getComputedStyle(q).display.startsWith('inline')) q = q.parentElement as HTMLElement;
    const a = k.getBoundingClientRect(), b = q.getBoundingClientRect();
    return a.width > 0 && (a.right > b.right + 1 || a.left < b.left - 1);
  }).map((k) => k.textContent);
  let checked = 0;
  for (const width of [320, 360]) {
    const page = await browser.newPage({ viewport: { width, height: 740 } });
    await page.goto(`${base}app.html#/onboarding`);
    await page.getByTestId('continue-guest').click();
    await page.getByRole('button', { name: 'Skip setup' }).click();
    for (const id of ['sys-w1', 'circ-w1']) {
      await page.goto(`${base}app.html#/videos/w/${id}?preview=1`);
      await page.getByTestId('lesson-start').click();
      const audio = page.getByTestId('lesson-audio');
      for (const t of M[id].starts) {
        await audio.evaluate((a: HTMLAudioElement, x: number) => { a.muted = true; a.pause(); a.currentTime = x + 0.05; }, t);
        await page.waitForTimeout(700);
        for (const box of await page.getByTestId('morph-step').all()) {
          const [sw, cw] = await box.evaluate((el) => [el.scrollWidth, el.clientWidth]);
          expect(sw, `${id} at ${t}s, ${width}px`).toBeLessThanOrEqual(cw + 1);
          checked++;
        }
        expect(await page.getByTestId('narrated-lesson').evaluate(overflowing), `${id} at ${t}s, ${width}px`).toEqual([]);
      }
      // the transcript, opened
      await page.getByTestId('lesson-transcript-toggle').click();
      expect(await page.getByTestId('lesson-transcript').evaluate(overflowing), `${id} transcript, ${width}px`).toEqual([]);
    }
    await page.close();
  }
  expect(checked, 'step boxes actually checked').toBeGreaterThan(20);
});

test('web build: typing in the side tutor and pressing Enter sends the message and never checks the question', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}app.html#/onboarding`);
  await page.getByTestId('continue-guest').click();
  await page.getByRole('button', { name: 'Skip setup' }).click();
  await page.goto(`${base}app.html#/practice/session?mode=skill&skill=inf&n=3`);
  await page.getByTestId('tutor-dock-open').click();
  const dock = page.getByTestId('tutor-dock');
  await expect(dock.getByTestId('tutor-dock-context')).toContainText('Inferences');
  const box = dock.getByRole('textbox');
  await box.fill('yo'); await box.press('Enter');
  await expect(dock.getByRole('log')).toContainText('yo');
  await expect(dock.getByRole('log')).not.toContainText('thinking', { timeout: 30_000 });
  await expect(page.getByTestId('explanation')).toHaveCount(0); // the question was not checked
  expect(errors).toEqual([]);
});
