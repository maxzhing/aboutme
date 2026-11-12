/**
 * Verifies every official resource URL and stamps today's date into src/data/resources.ts for
 * the links that respond. Run on a machine with unrestricted internet access.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RESOURCES } from '../src/data/resources';

async function check(url: string): Promise<number | string> {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (link check)' }, signal: AbortSignal.timeout(20000) });
    return res.status;
  } catch (e) { return (e as Error).message; }
}

(async () => {
  const urls = [...new Set(RESOURCES.map((r) => r.url))];
  let ok = 0;
  const good = new Set<string>();
  for (const url of urls) {
    const s = await check(url);
    const pass = typeof s === 'number' && s < 400;
    if (pass) { ok++; good.add(url); }
    console.log(`${pass ? '✓' : '✗'} ${s}  ${url}`);
  }
  console.log(`\n${ok}/${urls.length} links reachable.`);
  if (process.argv.includes('--stamp') && ok === urls.length) {
    const p = join(__dirname, '../src/data/resources.ts');
    const today = new Date().toISOString().slice(0, 10);
    writeFileSync(p, readFileSync(p, 'utf8').replace(/verifiedOn: null/g, `verifiedOn: '${today}'`));
    console.log(`Stamped verifiedOn: ${today}`);
  }
  if (ok !== urls.length) process.exit(1);
})();
