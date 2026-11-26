/**
 * The hosted web build for GitHub Pages (../sat/): a static landing page with a real question, and the app split
 * into chunks that load per page, with fonts and the PDF worker as cacheable files and a service worker for
 * offline use after the first visit. The single offline file (scripts/build.mjs) is unchanged.
 *   node scripts/build-web.mjs
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const at = (p) => join(root, p);
const out = join(root, '..', 'sat');
const A = join(out, 'assets');
// start clean, except the rendered video lessons (sat/videos, made by scripts/videos/render.mjs), which are kept
mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) if (f !== 'videos') rmSync(join(out, f), { recursive: true, force: true });
mkdirSync(join(A, 'fonts'), { recursive: true });
mkdirSync(join(A, 'katex'), { recursive: true });
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);

// fonts as files
const serif = 'node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght';
const fontFiles = { 'serif.woff2': `${serif}-normal.woff2`, 'serif-italic.woff2': `${serif}-italic.woff2`, 'plex-400.woff2': 'node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2', 'plex-500.woff2': 'node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2', 'plex-600.woff2': 'node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2' };
for (const [n, f] of Object.entries(fontFiles)) copyFileSync(at(f), join(A, 'fonts', n));
const face = (family, file, weight, style = 'normal') => `@font-face{font-family:'${family}';font-style:${style};font-display:swap;font-weight:${weight};src:url(fonts/${file}) format('woff2')}`;
const fonts = face('Source Serif 4 Variable', 'serif.woff2', '200 900') + face('Source Serif 4 Variable', 'serif-italic.woff2', '200 900', 'italic')
  + face('IBM Plex Sans', 'plex-400.woff2', '400') + face('IBM Plex Sans', 'plex-500.woff2', '500') + face('IBM Plex Sans', 'plex-600.woff2', '600');
let katex = readFileSync(at('node_modules/katex/dist/katex.min.css'), 'utf8');
for (const f of readdirSync(at('node_modules/katex/dist/fonts')).filter((x) => x.endsWith('.woff2'))) copyFileSync(at(`node_modules/katex/dist/fonts/${f}`), join(A, 'katex', f));
katex = katex.replace(/url\(fonts\/([\w-]+)\.woff2\) format\("woff2"\)(?:,url\(fonts\/[\w-]+\.\w+\) format\("[\w]+"\))*/g, (_, n) => `url(katex/${n}.woff2) format("woff2")`);
const tailwind = execFileSync('npx', ['tailwindcss', '-c', 'tailwind.config.ts', '-i', 'src/styles.css', '--minify'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
const css = fonts + tailwind;
const cssName = `app-${hash(css)}.css`;
writeFileSync(join(A, cssName), css);
const katexName = `katex-${hash(katex)}.css`;
writeFileSync(join(A, katexName), katex);

// the app, split per page
const r = await build({
  entryPoints: { app: at('src/web-entry.ts') }, bundle: true, splitting: true, format: 'esm', minify: true, target: ['es2020'], outdir: A,
  entryNames: '[name]-[hash]', chunkNames: 'c-[hash]', jsx: 'automatic', metafile: true, legalComments: 'none', logLevel: 'warning', tsconfig: at('tsconfig.json'),
  define: { 'process.env.NODE_ENV': '"production"', __PACK__: 'null' },
});
const entry = Object.entries(r.metafile.outputs).find(([, o]) => o.entryPoint?.endsWith('web-entry.ts'))?.[0].split('/').pop();
copyFileSync(at('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js'), join(A, 'pdf.worker.min.js'));
copyFileSync(at('public/screenshot-path.webp'), join(A, 'screenshot-path.webp'));
mkdirSync(join(A, 'landing'), { recursive: true });
for (const f of readdirSync(at('public/landing'))) copyFileSync(at(`public/landing/${f}`), join(A, 'landing', f));

writeFileSync(join(A, 'theme.js'), `(function(){try{var t=localStorage.getItem('stellify-theme')||'light';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`);
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="6" fill="#1B1915"/><path d="M20 7 L23.5 16.2 L33.2 16.7 L25.6 22.8 L28.2 32.2 L20 26.8 L11.8 32.2 L14.4 22.8 L6.8 16.7 L16.5 16.2 Z" fill="#F6F3EA"/></svg>`;
writeFileSync(join(out, 'icon.svg'), icon);
writeFileSync(join(out, 'manifest.webmanifest'), JSON.stringify({ name: 'Stellify', short_name: 'Stellify', start_url: 'app.html', display: 'standalone', background_color: '#F6F3EA', theme_color: '#F6F3EA', icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }] }));

// Google sign-in and Firestore (the optional account) need Google's sign-in script, its sign-in frame and three APIs
const FIREBASE = { script: 'https://apis.google.com', frame: 'https://stellify-e1fd0.firebaseapp.com https://accounts.google.com', connect: 'https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com', img: 'https://lh3.googleusercontent.com' };
const csp = `default-src 'self'; script-src 'self' ${FIREBASE.script}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: ${FIREBASE.img}; font-src 'self' data:; media-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self' https://generativelanguage.googleapis.com ${FIREBASE.connect}; frame-src https://www.desmos.com ${FIREBASE.frame}; base-uri 'none'; form-action 'none'; object-src 'none'`;
const head = (title, desc, extra = '') => `<!doctype html>
<html lang="en" data-web="1">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Stellify">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#F6F3EA" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#14120E" media="(prefers-color-scheme: dark)">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="manifest" href="manifest.webmanifest">
<script src="assets/theme.js"></script>
<link rel="preload" href="assets/fonts/plex-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/${cssName}">
${extra}</head>`;

// the app shell: a loading skeleton paints before the script runs
writeFileSync(join(out, 'app.html'), `${head('Stellify — free SAT and AP study', 'Free, independent Digital SAT and AP study. Runs in your browser; your progress stays on your device.', `<link rel="stylesheet" href="assets/${katexName}">\n<link rel="modulepreload" href="assets/${entry}">\n`)}
<body>
<noscript>Stellify needs JavaScript to run. Everything stays on your device.</noscript>
<div id="root"><main style="max-width:48rem;margin:0 auto;padding:40px 16px"><p style="font:600 22px Georgia,serif">Stellify</p><p style="color:#4E483F">Loading your progress from this device…</p></main></div>
<script type="module" src="assets/${entry}"></script>
</body>
</html>
`);

// the landing page: plain HTML and one tiny script; a real practice question you can answer
const q = JSON.parse(execFileSync('npx', ['tsx', 'scripts/landing-question.ts', 'r-bnd-06'], { cwd: root, encoding: 'utf8' }));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
writeFileSync(join(A, 'landing.js'), `(function(){var q=${JSON.stringify({ answer: q.answer, why: q.why })};var f=document.getElementById('try');var out=document.getElementById('try-out');f.addEventListener('submit',function(e){e.preventDefault();var v=f.querySelector('input:checked');if(!v){out.textContent='Pick an answer first.';return;}var i=+v.value,ok=i===q.answer;out.innerHTML='';var p=document.createElement('p');p.className='verdict '+(ok?'ok':'bad');p.textContent=(ok?'Correct. ':'Not quite. The answer is '+'ABCD'[q.answer]+'. ')+q.why[q.answer];out.appendChild(p);if(!ok){var w=document.createElement('p');w.textContent='Why '+'ABCD'[i]+' is wrong: '+q.why[i];out.appendChild(w);}});})();`);
writeFileSync(join(out, 'index.html'), `${head('Stellify — free SAT and AP study', 'Free, independent Digital SAT prep. Original questions, a guided path, honest score estimates. No account needed; sign in with Google to save progress, or stay a guest.')}
<body class="landing">
<header class="l-wrap l-top"><a class="l-brand" href="./"><img src="assets/landing/logo-star.svg" width="32" height="32" alt="">Stellify</a><nav aria-label="Main"><a href="app.html#/about">About</a><a href="app.html#/methodology">Methodology</a><a href="app.html#/privacy">Privacy</a></nav></header>
<main class="l-wrap">
<section class="l-hero" data-section="hero">
<div class="l-hero-text">
<p class="l-chips" aria-label="At a glance"><span class="l-chip" data-layer="chip">Free, for good</span><span class="l-chip" data-layer="chip">No ads</span><span class="l-chip" data-layer="chip">Works offline</span><span class="l-chip" data-layer="chip">All 30 SAT skills</span></p>
<h1>Free SAT practice that tells you what to do next.</h1>
<p>Original questions with an explanation for every choice, a path through all 30 skills, narrated lessons, and score estimates shown as honest ranges. No ads, no paywall, no account needed: stay a guest and your progress stays on your device, or sign in with Google to keep it on any device.</p>
<p class="l-cta"><a class="btn-primary" href="app.html" data-layer="button">Open Stellify</a><a class="btn-ghost" href="../stellify.html" download>Download the offline file</a><span class="l-tiles" aria-hidden="true"><img src="assets/landing/logo-star.svg" alt="" data-layer="tile"><img src="assets/landing/logo-star.svg" alt="" data-layer="tile"><img src="assets/landing/logo-star.svg" alt="" data-layer="tile"><img src="assets/landing/logo-star.svg" alt="" data-layer="tile"></span></p>
</div>
<figure class="l-phone" data-layer="phone"><img src="assets/screenshot-path.webp" width="366" height="645" alt="Screenshot of the Stellify path: skills grouped by topic, with the next step marked"></figure>
</section>
<section class="l-features" aria-labelledby="feat-h" data-section="features">
<h2 id="feat-h">Everything a student needs, in one free place</h2>
<div class="l-grid">
<article class="card l-feature" data-layer="card"><img src="assets/landing/lesson.webp" loading="lazy" alt="A narrated lesson completing the square, step by step" data-layer="photo"><h3>Lessons that move</h3><p>Every SAT skill has a narrated, animated lesson: the idea, a worked problem, the trap, and a question to try mid-lesson. Captions included.</p></article>
<article class="card l-feature" data-layer="card"><img src="assets/landing/question.webp" loading="lazy" alt="A practice question on a linear system, with four answer choices" data-layer="photo"><h3>Every choice explained</h3><p>1,549 original questions. After each one, you see why the right answer works and why each wrong one tempted you.</p></article>
<article class="card l-feature" data-layer="card"><img src="assets/landing/path.webp" loading="lazy" alt="The study path with today's plan" data-layer="photo"><h3>A plan for today</h3><p>A short placement check builds a daily plan around your test date, your weak spots and what is due for review.</p></article>
</div>
</section>
<section class="card l-try" aria-labelledby="try-h">
<p class="eyebrow">Try one</p>
<h2 id="try-h">A real question from the bank</h2>
<p class="passage">${esc(q.passage)}</p>
<form id="try"><fieldset><legend>${esc(q.stem)}</legend>
${q.choices.map((c, i) => `<label class="l-choice"><input type="radio" name="a" value="${i}"> <b>${'ABCD'[i]}</b> ${esc(c)}</label>`).join('\n')}
</fieldset><button class="btn-primary" type="submit">Check</button></form>
<div id="try-out" role="status" aria-live="polite"></div>
</section>
<section class="l-promise" aria-labelledby="promise-h" data-section="promise">
<blockquote class="card" data-layer="testimonial"><p id="promise-h">“Every question here is original. Every explanation shows its reasoning. There is no paywall, no trial and no premium version, and there never will be.”</p><cite>The Stellify promise</cite></blockquote>
</section>
</main>
<footer class="l-wrap l-foot" data-section="footer">
<p class="l-closing">Walk into the SAT ready, <em>free, for good.</em></p>
<p>SAT® and AP® are trademarks registered by the College Board, which is not affiliated with and does not endorse Stellify. All practice questions are original Stellify content, not official College Board questions.</p>
</footer>
<script src="assets/landing.js" defer></script>
</body>
</html>
`);

// service worker: precache the shell, then cache what is visited (same origin only)
const files = [];
const walk = (d, rel = '') => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p, `${rel}${f}/`); else files.push(`${rel}${f}`); } };
walk(out);
// the core: the app chunk and everything it statically imports (page chunks are cached when first visited)
const outs = r.metafile.outputs;
const mainOut = Object.keys(outs).find((k) => outs[k].entryPoint?.endsWith('src/main.tsx'));
const core = new Set();
const visit = (k) => { if (!k || core.has(k)) return; core.add(k); for (const i of outs[k].imports) if (i.kind === 'import-statement') visit(i.path); };
visit(mainOut);
const coreFiles = [...core].map((k) => `assets/${k.split('/').pop()}`);
const shell = [...files.filter((f) => !f.startsWith('assets/c-') && !f.includes('pdf.worker') && !f.startsWith('videos/')), ...coreFiles.filter((f) => f.startsWith('assets/c-'))];
const version = hash(files.join('|') + readFileSync(join(A, entry), 'utf8').length);
writeFileSync(join(out, 'sw.js'), `const V='stellify-${version}';const SHELL=${JSON.stringify(['./', ...shell])};
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.includes('/videos/'))return;e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(hit=>hit||fetch(e.request).then(res=>{if(res.ok){const copy=res.clone();caches.open(V).then(c=>c.put(e.request,copy));}return res;}).catch(()=>caches.match('app.html'))));});
`);
const size = (f) => statSync(join(out, f)).size;
const js = files.filter((f) => f.endsWith('.js') && f.startsWith('assets/'));
console.log(`Built ../sat: landing ${(size('index.html') / 1024).toFixed(1)} KB, app entry ${(size(`assets/${entry}`) / 1024).toFixed(0)} KB, ${js.length} JS files (${(js.reduce((t, f) => t + size(f), 0) / 1024 / 1024).toFixed(2)} MB total), CSS ${(size(`assets/${cssName}`) / 1024).toFixed(0)} KB.`);
