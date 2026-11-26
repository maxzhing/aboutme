// node probe2.js <outdir> <w> <h> <t,t,...>: a few frames at a given size (serves this folder itself on 8097)
require('./serve.js');
const { chromium } = require('playwright');
const [out, w, h, ts] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto(`http://127.0.0.1:8097/film.html?w=${w}&h=${h}`);
  await p.waitForFunction(() => window.ready || window.initError, null, { timeout: 120000 });
  const err = await p.evaluate(() => window.initError); if (err) console.log('INIT', err);
  for (const t of ts.split(',').map(Number)) { await p.evaluate((t) => window.seek(t, 60, 1), t); await p.screenshot({ path: `${out}/p${w}x${h}-${t}.png` }); }
  await b.close(); process.exit(0);
})();
