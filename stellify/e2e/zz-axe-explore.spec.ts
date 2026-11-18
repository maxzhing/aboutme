import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { resolve } from 'node:path';
const FILE = `file://${resolve(__dirname, '../dist/stellify.html')}`;
const ROUTES = ['/', '/learn', '/learn/math', '/practice', '/practice/session?mode=single&ids=r-bnd-06', '/practice/smart', '/official', '/mocks', '/analytics', '/mistakes', '/calendar', '/report', '/pet', '/rewards', '/achievements', '/settings', '/resources', '/qc', '/stats', '/stats/st4-2', '/calc/c1-1', '/hacks'];
/**
 * Full accessibility audit (opt-in): lists every serious or critical axe violation on 22 pages in both themes.
 * The regular suite runs a faster pass/fail version. Run with: AXE_FULL=1 npx playwright test e2e/zz-axe-explore.spec.ts
 */
test('full axe audit report', async ({ page }) => {
  test.skip(!process.env.AXE_FULL, 'opt-in: set AXE_FULL=1');
  test.setTimeout(300_000);
  await page.goto(`${FILE}#/onboarding`);
  await page.getByRole('button', { name: 'Skip setup' }).click();
  const all = new Map<string, { impact: string; help: string; n: number; where: Set<string>; sample: string }>();
  for (const theme of ['dark', 'light']) {
    if (theme === 'light') { await page.goto(`${FILE}#/settings`); await page.getByTestId('theme-light').click(); }
    for (const r of ROUTES) {
      await page.goto(`${FILE}#${r}`); await page.waitForTimeout(500);
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('.backdrop').analyze();
      for (const v of res.violations) {
        if (!['serious', 'critical'].includes(v.impact ?? '')) continue;
        const e = all.get(v.id) ?? { impact: v.impact!, help: v.help, n: 0, where: new Set<string>(), sample: v.nodes[0]?.target.join(' ') + ' :: ' + (v.nodes[0]?.failureSummary ?? '').slice(0, 160).replace(/\n/g, ' ') };
        e.n += v.nodes.length; e.where.add(`${theme}:${r}`); all.set(v.id, e);
      }
    }
  }
  for (const [id, e] of all) console.log(`AXE ${e.impact} ${id} (${e.n} nodes) ${e.help} | ${[...e.where].slice(0, 6).join(', ')} | ${e.sample}`);
  console.log('AXE-DONE', all.size);
});
