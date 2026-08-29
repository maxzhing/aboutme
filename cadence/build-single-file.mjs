/* Cadence — bundles the app into one portable HTML file.
   Run: node build-single-file.mjs
   Reads the load order straight out of index.html, so the bundle can never
   drift from the real app: add a file there and it lands here too. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(root, 'index.html'), 'utf8');

// Only local stylesheets are inlined; a remote one (the web fonts) stays a
// <link>, so the single file still picks the faces up when it has a network.
const cssFiles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)]
  .map(m => m[1]).filter(h => !/^https?:/.test(h));
const jsFiles = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
if (!cssFiles.length || !jsFiles.length) throw new Error('Could not read the load order from index.html');

const read = (p) => readFileSync(join(root, p), 'utf8');
const banner = (p) => `\n/* ${'='.repeat(72)}\n   ${p}\n   ${'='.repeat(72)} */\n`;

// A literal </script> anywhere in the source would close the tag early.
const css = cssFiles.map(f => banner(f) + read(f)).join('\n');
const js = jsFiles.map(f => banner(f) + read(f)).join('\n');
for (const [label, body] of [['CSS', css], ['JS', js]]) {
  if (/<\/script/i.test(body)) throw new Error(`${label} contains a literal </script> — inlining would break the page`);
}

const out = html
  .replace(/\n?\s*<link rel="stylesheet" href="(?!https?:)[^"]+">/g, '')
  .replace('</head>', `  <style>\n${css}\n  </style>\n</head>`)
  .replace(/\n?\s*<!-- [^>]*-->\n?\s*<script src="[^"]+"><\/script>/g, '')
  .replace(/\n?\s*<script src="[^"]+"><\/script>/g, '')
  .replace('</body>', `  <script>\n${js}\n  </script>\n</body>`);

writeFileSync(join(root, 'cadence.html'), out);
console.log(`cadence.html  ${cssFiles.length} stylesheets + ${jsFiles.length} scripts  ${(out.length / 1024).toFixed(0)} KB`);
