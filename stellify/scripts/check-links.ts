/**
 * Opens every resource URL, checks its status and that the page title contains the expected words, and
 * reports moved addresses. With --stamp (and every link reachable) it updates the check date in
 * src/data/resources.ts. Needs internet access.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RESOURCES } from '../src/data/resources';

async function check(url: string): Promise<{ status: number | string; title: string; final: string }> {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (link check)' }, signal: AbortSignal.timeout(20000) });
    const html = await res.text();
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim()
      .replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
    return { status: res.status, title, final: res.url };
  } catch (e) { return { status: (e as Error).message, title: '', final: url }; }
}

(async () => {
  let ok = 0;
  for (const r of RESOURCES) {
    const c = await check(r.url);
    const reachable = typeof c.status === 'number' && c.status < 400;
    const titled = c.title.toLowerCase().includes(r.expect.toLowerCase());
    if (reachable) ok++;
    const moved = c.final.replace(/\/$/, '') !== r.url.replace(/\/$/, '') ? `  → moved to ${c.final}` : '';
    console.log(`${!reachable ? '✗' : titled ? '✓' : '◐'} ${c.status}  ${r.url}  “${c.title.slice(0, 70)}”${titled || !reachable ? '' : `  (expected “${r.expect}” in the title)`}${moved}`);
  }
  console.log(`\n${ok}/${RESOURCES.length} links reachable. ◐ = reachable but the title did not confirm the page (check by hand; app pages often need a browser).`);
  if (process.argv.includes('--stamp') && ok === RESOURCES.length) {
    const p = join(__dirname, '../src/data/resources.ts');
    const today = new Date().toISOString().slice(0, 10);
    writeFileSync(p, readFileSync(p, 'utf8').replace(/const ON = '\d{4}-\d{2}-\d{2}'/, `const ON = '${today}'`));
    console.log(`Stamped the check date: ${today}`);
  }
  if (ok !== RESOURCES.length) process.exit(1);
})();
