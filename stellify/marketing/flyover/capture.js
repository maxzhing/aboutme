// Captures the landing page for the film: the page with every lifting piece hidden, then each piece alone on a
// transparent background with 28 px padding, and every piece's position in page pixels.
const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await p.goto('http://127.0.0.1:8098/aboutme/sat/');
  // scroll once to the bottom so lazy images load, then back up; then lock the layout
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
  await p.waitForTimeout(800);
  await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  const pieces = await p.evaluate(() => [...document.querySelectorAll('[data-layer]')].map((el, i) => { el.setAttribute('data-film', String(i)); const r = el.getBoundingClientRect(); return { i, kind: el.getAttribute('data-layer'), x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; }));
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  const sections = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-section]')].map((el) => { const r = el.getBoundingClientRect(); return [el.getAttribute('data-section'), { y: r.top + scrollY, h: r.height, x: r.left, w: r.width }]; })));
  // the page without its lifting pieces
  await p.addStyleTag({ content: '[data-layer]{visibility:hidden!important}' });
  await p.screenshot({ path: `${out}/page.png`, fullPage: true });
  // each piece alone
  const solo = await p.addStyleTag({ content: 'html,body{background:transparent!important} body *{visibility:hidden!important} .card{box-shadow:none!important}' });
  for (const pc of pieces) {
    const tag = await p.addStyleTag({ content: `[data-film="${pc.i}"],[data-film="${pc.i}"] *{visibility:visible!important} [data-film="${pc.i}"] [data-layer]{visibility:hidden!important}` });
    const pad = 28;
    await p.screenshot({ path: `${out}/piece-${pc.i}.png`, omitBackground: true, fullPage: true, clip: { x: Math.max(0, pc.x - pad), y: Math.max(0, pc.y - pad), width: pc.w + 2 * pad, height: pc.h + 2 * pad } });
    pc.px = Math.max(0, pc.x - pad); pc.py = Math.max(0, pc.y - pad); pc.pw = pc.w + 2 * pad; pc.ph = pc.h + 2 * pad;
    await tag.evaluate((el) => el.remove());
  }
  void solo;
  fs.writeFileSync(`${out}/layout.json`, JSON.stringify({ width: 1440, height: H, scale: 2, pieces, sections }, null, 1));
  console.log('page', 1440, 'x', H, 'pieces', pieces.length, pieces.map((x) => x.kind).join(' '));
  await b.close();
})();
