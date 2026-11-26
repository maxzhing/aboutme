import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { ALL_RAW } from '../src/data/questions/all';

/**
 * The optional Google account, against the local Firebase emulators (run `firebase emulators:start --only
 * auth,firestore --project stellify-e1fd0` in the repository root first; skipped otherwise). The emulators accept a
 * made-up Google identity, so the real Google pop-up is not part of this test.
 */
const ROOT = resolve(__dirname, '../..');
const PROJECT = 'stellify-e1fd0', FS = 'http://127.0.0.1:8080', AUTH = 'http://127.0.0.1:9099';
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const KEY = Object.fromEntries(ALL_RAW.map((q) => [q.id, q]));
// this test browser blocks pages from calling the emulators on 127.0.0.1 (its local-network rule); allow it here only
test.use({ launchOptions: { args: ['--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights'] } });
let server: Server; let base = '';
const up = async () => { try { await fetch(`${AUTH}/`); await fetch(`${FS}/`); return true; } catch { return false; } };

test.beforeAll(async () => {
  server = createServer((req, res) => {
    const p = join(ROOT, 'sat', decodeURIComponent((req.url ?? '/').split('?')[0]));
    const f = existsSync(p) && statSync(p).isDirectory() ? join(p, 'index.html') : p;
    if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f));
  });
  await new Promise<void>((r) => server.listen(0, () => r()));
  base = `http://localhost:${(server.address() as { port: number }).port}/`;
  // a clean emulator for every run
  if (await up()) { await fetch(`${FS}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' }); await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' }); }
});
test.afterAll(() => server?.close());

/** A browser profile ("device") signed in as a made-up Google user, talking to the emulators. */
async function device(browser: import('@playwright/test').Browser, user?: { sub: string; email: string; name: string }) {
  const ctx = await browser.newContext();
  await ctx.addInitScript((u) => { (window as unknown as { __STELLIFY_EMULATORS__: unknown }).__STELLIFY_EMULATORS__ = { auth: 'http://127.0.0.1:9099', firestore: ['127.0.0.1', 8080], googleUser: u }; }, user);
  // the page's security policy names the real Google servers; let the local emulators through as well
  await ctx.route(/app\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()).replace('connect-src ', `connect-src ${AUTH} ${FS} `) }); });
  return ctx;
}
const cloudDoc = async (uid: string) => { const r = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`, { headers: { Authorization: 'Bearer owner' } }); return r.ok ? (await r.json()).fields : null; };
const uidOf = async (email: string) => { const r = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:query`, { method: 'POST', headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, body: '{}' })).json(); return (r.userInfo ?? []).find((u: { email: string }) => u.email === email)?.localId as string; };
const localAttempts = (p: Page) => p.evaluate(() => new Promise<number>((ok) => {
  const req = indexedDB.open('keyval-store');
  req.onsuccess = () => { const g = req.result.transaction('keyval').objectStore('keyval').get('stellify-state-v1'); g.onsuccess = () => ok(g.result ? JSON.parse(g.result).state.attempts.length : 0); };
}));
async function answerOne(p: Page) {
  await p.goto(`${base}app.html#/`); await p.goto(`${base}app.html#/practice/session?mode=skill&skill=lin1&n=8&r=${Math.random()}`);
  const card = p.getByTestId('question-card');
  const qid = (await card.getAttribute('data-qid'))!;
  const q = KEY[qid];
  if (q.choices) await p.locator(`[data-testid="question-card"] [data-choice="${'ABCD'[q.answer as number]}"]`).click();
  else await p.locator(`#spr-${qid}`).fill((q.answer as string[])[0]);
  await p.getByTestId('check').click();
  await expect(p.getByTestId('explanation')).toBeVisible();
}
const saveNow = async (p: Page) => { await p.goto(`${base}app.html#/settings`); await p.getByTestId('sync-now').click(); await expect(p.getByTestId('sync-status')).toContainText('Saved to your account'); };

test('account: guest uploads nothing; Google sign-in saves progress, a second device gets it, conflicts ask, other users cannot read it', async ({ browser }) => {
  test.skip(!(await up()), 'start the Firebase emulators first');
  test.setTimeout(180_000);
  const ana = { sub: 'g-ana', email: 'ana@example.com', name: 'Ana Test' };

  // 1. a guest: the choice screen, then the usual setup; nothing reaches the account service
  const g = await device(browser); const gp = await g.newPage();
  await gp.goto(`${base}app.html#/onboarding`);
  await gp.getByTestId('continue-guest').click();
  await expect(gp.getByTestId('intake-welcome')).toContainText('No account needed');
  await gp.getByRole('button', { name: 'Skip setup' }).click();
  await gp.goto(`${base}app.html#/settings`);
  await expect(gp.getByTestId('account-card')).toContainText('using Stellify as a guest');
  await g.close();

  // 2. device A signs in as a new student, sets up, answers, saves
  const A = await device(browser, ana); let a = await A.newPage();
  const errors: string[] = []; a.on('pageerror', (e) => errors.push(e.message));
  await a.goto(`${base}app.html#/onboarding`);
  await a.getByTestId('google-sign-in').click();
  await expect(a.getByTestId('intake-welcome')).toContainText('Signed in');
  await a.getByRole('button', { name: 'Skip setup' }).click();
  await answerOne(a);
  await saveNow(a);
  await expect(a.getByTestId('account-name')).toHaveText('Ana Test');
  const uid = await uidOf(ana.email);
  expect((await cloudDoc(uid)).attempts.integerValue).toBe('1');

  // 3. device B: the same student signs in and lands on their plan with their progress
  const B = await device(browser, ana); const b = await B.newPage();
  await b.goto(`${base}app.html#/onboarding`);
  await b.getByTestId('google-sign-in').click();
  await expect(b).toHaveURL(/#\/$/);
  expect(await localAttempts(b)).toBe(1);

  // 4. both devices study; A cannot save (offline) and is closed; B saves; A comes back: the student chooses
  await A.setOffline(true);
  await answerOne(a);
  await a.close();
  await A.setOffline(false);
  await answerOne(b); await answerOne(b);
  await saveNow(b);
  expect((await cloudDoc(uid)).attempts.integerValue).toBe('3');
  a = await A.newPage();
  await a.goto(`${base}app.html#/`);
  await expect(a.getByTestId('sync-conflict')).toContainText('3 answers');
  await expect(a.getByTestId('sync-conflict')).toContainText('2 answers');
  await a.getByTestId('keep-cloud').click();
  await expect(a.getByTestId('sync-conflict')).toBeHidden();
  await expect.poll(() => localAttempts(a)).toBe(3);

  // 5. the security rules: another signed-in user cannot read or overwrite Ana's record
  const other = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) })).json();
  const read = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`, { headers: { Authorization: `Bearer ${other.idToken}` } });
  expect(read.status).toBe(403);
  const write = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`, { method: 'PATCH', headers: { Authorization: `Bearer ${other.idToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ fields: { v: { integerValue: 1 } } }) });
  expect(write.status).toBe(403);

  // 6. signing out keeps this device's copy and stops syncing
  await a.goto(`${base}app.html#/settings`);
  await a.getByTestId('sign-out').click();
  await expect(a.getByTestId('account-card')).toContainText('guest');
  expect(await localAttempts(a)).toBe(3);
  expect(errors).toEqual([]);
  await A.close(); await B.close();
});
