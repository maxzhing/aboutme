/**
 * Builds Stellify into ONE self-contained HTML file (dist/stellify.html):
 * JavaScript, CSS, fonts and the whole question bank are inlined, so the file works when
 * opened directly from disk with no server and no internet connection.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const at = (p) => join(root, p);
const b64 = (p) => readFileSync(at(p)).toString('base64');
mkdirSync(at('.build'), { recursive: true });
mkdirSync(at('dist'), { recursive: true });

// 1. fonts (latin subsets only) and KaTeX styles with woff2 fonts inlined
const face = (family, file) => `@font-face{font-family:'${family}';font-style:normal;font-display:swap;font-weight:100 900;src:url(data:font/woff2;base64,${b64(file)}) format('woff2')}`;
const fonts = face('Inter Variable', 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')
  + face('Sora Variable', 'node_modules/@fontsource-variable/sora/files/sora-latin-wght-normal.woff2');
let katex = readFileSync(at('node_modules/katex/dist/katex.min.css'), 'utf8');
katex = katex.replace(/src:url\(fonts\/([\w-]+)\.woff2\) format\("woff2"\)(?:,url\(fonts\/[\w-]+\.\w+\) format\("[\w]+"\))*/g,
  (_, name) => `src:url(data:font/woff2;base64,${b64(`node_modules/katex/dist/fonts/${name}.woff2`)}) format("woff2")`);
if (katex.includes('url(fonts/')) throw new Error('KaTeX font inlining missed a font reference');

// 2. Tailwind
const tailwind = execFileSync('npx', ['tailwindcss', '-c', 'tailwind.config.ts', '-i', 'src/styles.css', '--minify'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });

// 3. application bundle
await build({
  entryPoints: [at('src/main.tsx')], bundle: true, minify: true, format: 'iife', target: ['es2020'], outfile: at('.build/app.js'),
  jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'none', logLevel: 'warning', tsconfig: at('tsconfig.json'),
});
const js = readFileSync(at('.build/app.js'), 'utf8').replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

const theme = `(function(){try{var t=localStorage.getItem('stellify-theme')||'dark';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){document.documentElement.classList.add('dark');}})();`;
const html = `<!doctype html>
<html lang="en" class="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Stellify: free, offline Digital SAT preparation in a single file.">
<meta name="theme-color" content="#090D1C">
<title>Stellify — free Digital SAT prep</title>
<script>${theme}</script>
<style>${fonts}${katex}${tailwind}</style>
</head>
<body>
<noscript>Stellify needs JavaScript to run. Everything stays on your device.</noscript>
<div id="root"></div>
<script>${js}</script>
</body>
</html>
`;
writeFileSync(at('dist/stellify.html'), html);
copyFileSync(at('dist/stellify.html'), join(root, '..', 'stellify.html'));
console.log(`Built dist/stellify.html (${(html.length / 1024 / 1024).toFixed(2)} MB) and copied it to the repository root.`);
