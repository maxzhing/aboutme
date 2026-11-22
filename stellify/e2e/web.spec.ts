import { expect, test } from '@playwright/test';
import { createServer, type Server } from 'node:http';
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
  expect(errors).toEqual([]);
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
