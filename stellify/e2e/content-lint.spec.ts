import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

/** Content linter: rendered copy has no banned marketing words, no straight quotes, and no emoji used as icons. */
const FILE = `file://${resolve(__dirname, '../dist/stellify.html')}`;
const ROUTES = ['/', '/path', '/path/rw', '/learn/math', '/learn/lin1', '/practice/session?mode=single&ids=r-bnd-06', '/test-day', '/worked/lin1', '/predict', '/desmos/lab', '/about', '/methodology', '/how-we-write', '/privacy', '/changelog', '/analytics', '/mistakes', '/settings', '/maintainer'];
const BANNED = /\b(seamless(ly)?|empower(s|ing|ed)?|elevat(e|es|ed|ing)|unlock(s|ed|ing)?|supercharg(e|ed|es|ing)|journey)\b/i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}]/u;

test('content lint: no banned words, straight quotes or emoji in rendered copy', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(`${FILE}#/onboarding`);
  await page.getByRole('button', { name: 'Skip setup' }).click();
  const problems: string[] = [];
  for (const r of ROUTES) {
    await page.goto(`${FILE}#${r}`);
    await page.waitForTimeout(400);
    const texts = await page.evaluate(() => {
      const out: string[] = [];
      const skip = (el: Element | null) => !!el?.closest('code, pre, kbd, .katex, textarea, input, script, style, [data-lint-skip], .passage');
      const w = document.createTreeWalker(document.getElementById('root')!, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) { const t = n.textContent ?? ''; if (t.trim() && !skip(n.parentElement)) out.push(t.trim()); }
      return out;
    });
    for (const t of texts) {
      if (/["']/.test(t)) problems.push(`${r}: straight quote in “${t.slice(0, 80)}”`);
      if (BANNED.test(t)) problems.push(`${r}: banned word in “${t.slice(0, 80)}”`);
      if (EMOJI.test(t.replace(/[♯♭♮✓✗★]/g, ''))) problems.push(`${r}: emoji in “${t.slice(0, 80)}”`);
    }
  }
  expect([...new Set(problems)]).toEqual([]);
});
