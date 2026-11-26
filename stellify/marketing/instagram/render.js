// Renders the "question of the day" posts: for each post, slide 1 (the question) and slide 2 (the answer), 1080 x 1350.
// node marketing/instagram/render.js   → marketing/instagram/week1/day<N>-<1|2>.png and captions.txt
const fs = require('fs'), path = require('path');
const katex = require('katex');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(__dirname, 'week1');
const posts = JSON.parse(fs.readFileSync(path.join(__dirname, 'posts.json'), 'utf8'));
const nm = (p) => 'file://' + path.join(ROOT, 'node_modules', p);
const logo = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'public/landing/logo-star.svg')).toString('base64');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// text with $…$ math, rendered by KaTeX
const tex = (s) => s.split(/(\$[^$]+\$)/g).map((part) => part.startsWith('$') && part.endsWith('$') && part.length > 2
  ? katex.renderToString(part.slice(1, -1), { throwOnError: true }) : esc(part)).join('');

const css = `
@font-face { font-family: 'Source Serif 4'; src: url(${nm('@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2')}) format('woff2'); font-weight: 200 900; }
@font-face { font-family: 'Plex'; src: url(${nm('@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2')}) format('woff2'); font-weight: 400; }
@font-face { font-family: 'Plex'; src: url(${nm('@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2')}) format('woff2'); font-weight: 600; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1080px; height: 1350px; }
body { background: #F6F3EA; color: #1b1915; font-family: Plex, sans-serif; padding: 72px 76px; display: flex; flex-direction: column; }
.top { display: flex; align-items: center; justify-content: space-between; }
.brand { display: flex; align-items: center; gap: 14px; font: 600 34px 'Source Serif 4', serif; }
.brand img { width: 54px; height: 54px; border-radius: 12px; }
.tag { font: 600 22px Plex; letter-spacing: .08em; text-transform: uppercase; color: #fff; background: #1e4aa8; padding: 10px 18px; border-radius: 999px; }
.tag.rw { background: #0f7a5c; }
h1 { font: 700 64px/1.05 'Source Serif 4', serif; margin: 46px 0 6px; }
.topic { font: 400 30px Plex; color: #6b6558; margin-bottom: 34px; }
.card { background: #FFFDF7; border: 2px solid #e4ddcb; border-radius: 30px; padding: 40px 44px; }
.passage { font: 400 31px/1.5 'Source Serif 4', serif; margin-bottom: 26px; }
.stem { font: 600 33px/1.45 Plex; }
.choices { margin-top: 30px; display: grid; gap: 16px; }
.choice { display: flex; align-items: center; gap: 20px; font: 400 31px/1.35 Plex; padding: 16px 22px; border: 2px solid #e4ddcb; border-radius: 18px; background: #fff; }
.choice b { flex: none; display: grid; place-items: center; width: 50px; height: 50px; border-radius: 50%; border: 2px solid #1b1915; font: 600 26px Plex; }
.choice.right { border-color: #0f7a5c; background: #e9f6f0; }
.choice.right b { background: #0f7a5c; border-color: #0f7a5c; color: #fff; }
.choice.dim { opacity: .45; font-size: 25px; padding: 8px 18px; }
.choice.dim b { width: 38px; height: 38px; font-size: 20px; }
.answer .choices { gap: 10px; margin-top: 0; }
.why { margin-top: 30px; font: 400 31px/1.5 Plex; display: grid; gap: 14px; }
.tip { margin-top: 28px; padding: 24px 28px; border-radius: 20px; background: #fdf1cf; font: 600 29px/1.45 Plex; }
.tip span { display: block; font: 600 20px Plex; letter-spacing: .08em; text-transform: uppercase; color: #8a6a12; margin-bottom: 6px; }
.foot { margin-top: auto; display: flex; justify-content: space-between; align-items: center; font: 600 28px Plex; color: #6b6558; padding-top: 30px; }
.foot .swipe { color: #1e4aa8; }
.katex { font-size: 1.08em; }
.choice .katex .mfrac { font-size: 1.05em; }
`;

const head = (p, title) => `<div class="top"><div class="brand"><img src="${logo}" alt="">Stellify</div><div class="tag ${p.area === 'Math' ? '' : 'rw'}">${esc(p.area)}</div></div>
<h1>${title}</h1><div class="topic">${esc(p.topic)} · Question of the day #${p.n}</div>`;
const choices = (p, reveal) => `<div class="choices">${p.choices.map((c, i) => `<div class="choice ${reveal ? (i === p.answer ? 'right' : 'dim') : ''}"><b>${'ABCD'[i]}</b><span>${tex(c)}</span></div>`).join('')}</div>`;

const slide1 = (p) => `${head(p, 'Can you solve it?')}
<div class="card">${p.passage ? `<p class="passage">${tex(p.passage)}</p>` : ''}<p class="stem">${tex(p.stem)}</p>${choices(p, false)}</div>
<div class="foot"><span>Comment your answer 👇</span><span class="swipe">Answer on the next slide →</span></div>`;
const slide2 = (p) => `${head(p, `Answer: ${'ABCD'[p.answer]}`)}
<div class="card answer">${choices(p, true)}<div class="why">${p.why.map((w) => `<p>${tex(w)}</p>`).join('')}</div>
<div class="tip"><span>Remember</span>${tex(p.tip)}</div></div>
<div class="foot"><span>Free SAT practice, no ads</span><span class="swipe">Link in bio ⭐</span></div>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  const katexCss = `<link rel="stylesheet" href="${nm('katex/dist/katex.min.css')}">`;
  for (const p of posts) for (const [k, body] of [[1, slide1(p)], [2, slide2(p)]]) {
    // loaded from a file (not setContent), so the page may use the local fonts and KaTeX's stylesheet
    const file = path.join(OUT, '.slide.html');
    fs.writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8">${katexCss}<style>${css}</style></head><body>${body}</body></html>`);
    await page.goto('file://' + file, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const over = await page.evaluate(() => document.body.scrollHeight > 1350 || document.body.scrollWidth > 1080);
    if (over) console.log('TOO TALL', p.n, k);
    await page.screenshot({ path: path.join(OUT, `day${p.n}-${k}.png`) });
  }
  await b.close(); fs.unlinkSync(path.join(OUT, '.slide.html'));
  fs.writeFileSync(path.join(OUT, 'captions.txt'), posts.map((p) => `=== Day ${p.n} (${p.day}) · post day${p.n}-1.png then day${p.n}-2.png ===\n${p.caption}\n`).join('\n'));
  console.log('done', posts.length * 2, 'slides');
})();
