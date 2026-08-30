/**
 * Build the single-file distribution.
 *
 * Produces `dist/grant-match-engine.html`: one file, openable from disk, that
 * makes no network requests of any kind. The engine, the interface, the styles
 * and the demonstration corpus are all inlined.
 *
 *   node tools/build-single-file.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT_FILE = path.join(OUT_DIR, 'grant-match-engine.html');

const bundle = await build({
  entryPoints: [path.join(ROOT, 'browser/main.mjs')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2022'],
  write: false,
  legalComments: 'none',
  logLevel: 'warning',
});

const script = bundle.outputFiles[0].text;
const styles = fs.readFileSync(path.join(ROOT, 'public/styles.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');

/**
 * Inline with a replacer FUNCTION, never a replacement string.
 *
 * `String.replace` interprets `$$`, `$&`, `$'` and `` $` `` inside a replacement
 * string. A bundle containing `const $$ = ...` would be silently rewritten to
 * `const $ = ...`, producing a corrupt file that still looks plausible. A
 * function replacement disables that substitution entirely.
 */
const inject = (haystack, needle, value) => haystack.replace(needle, () => value);

// Everything must be inline: a file:// page cannot fetch its own siblings.
let output = html;
output = inject(output, '<link rel="stylesheet" href="/styles.css">', `<style>\n${styles}\n</style>`);
output = inject(output, '<script src="/main.js" type="module"></script>', `<script>\n${script}\n</script>`);

// The banner is part of the document, not something the interface can be
// configured to hide: a reader must never mistake demonstration data for a
// live search of real funding opportunities.
const banner = `
  <div class="demo-banner" role="note">
    <strong>Demonstration build — the funders below are fictional.</strong>
    This single file runs the real eligibility, verification and scoring engine in your browser, but it
    cannot search the internet: a page opened from a file has no API keys and cannot fetch funder sites
    across origins. Opportunities come from a bundled set of invented funders on <code>.demo.invalid</code>
    domains, which can never resolve. The analysis is genuine; the opportunities are not.
    To search live sources, run the full engine with <code>npm start</code>.
  </div>`;

output = inject(output, '<div class="app">', `<div class="app">\n${banner}`);

output = inject(output, '</style>', `
.demo-banner {
  margin: 14px 0 0; padding: 13px 16px; border-radius: 10px; font-size: 13px; line-height: 1.55;
  background: var(--amber-bg); border: 1px solid color-mix(in srgb, var(--amber) 34%, transparent);
  color: var(--text);
}
.demo-banner strong { display: block; margin-bottom: 3px; color: var(--amber); }
.demo-banner code { font-family: var(--mono); font-size: 12px; }
</style>`);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, output, 'utf8');

// A stray external reference would break the file the moment it left this
// machine. Only real markup can cause a fetch, so script and style bodies are
// excluded — they contain template strings that merely look like attributes.
const markup = output
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
const external = [...markup.matchAll(/(?:src|href)\s*=\s*"([^"]+)"/g)]
  .map((match) => match[1])
  .filter((value) => !value.startsWith('data:') && !value.startsWith('#'));
if (external.length) {
  console.error(`\n  ✗ external references found, the file is not self-contained:\n    ${external.join('\n    ')}`);
  process.exit(1);
}

// Guard against silent corruption of the kind `$$` replacement causes.
if (!output.includes(script)) {
  console.error('\n  ✗ the bundled script was altered during injection; the output is not trustworthy');
  process.exit(1);
}

const size = fs.statSync(OUT_FILE).size;
console.log(`\n  ✓ ${path.relative(ROOT, OUT_FILE)} — ${(size / 1024).toFixed(0)} KB, no external references\n`);
