import { expect, test } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

/** The hosted web build (../sat), served over http like GitHub Pages would. Run `npm run build:web` first. */
const ROOT = resolve(__dirname, '../..');
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
let server: Server; let base = '';
test.beforeAll(async () => {
  server = createServer((req, res) => {
    const p = join(ROOT, decodeURIComponent((req.url ?? '/').split('?')[0]));
    const f = existsSync(p) && statSync(p).isDirectory() ? join(p, 'index.html') : p;
    if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f));
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
