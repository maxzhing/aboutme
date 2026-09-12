#!/usr/bin/env node
/* Cadenza — single-file build.
 *
 * The app is written as ES modules, which browsers only load over http.  This
 * script walks the import graph and emits one self-contained `cadenza.html`
 * that also works from a plain file:// path — handy for sharing a score editor
 * on a USB stick or an offline machine.
 *
 * Usage:  node build.mjs [outfile]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const ENTRY = resolve(ROOT, 'js/ui/app.js');
const OUT = resolve(ROOT, process.argv[2] || 'cadenza.html');

const modules = new Map();   // id -> transformed source
const order = [];

function idOf(file) {
  return relative(ROOT, file).replace(/\\/g, '/');
}

function collect(file) {
  const id = idOf(file);
  if (modules.has(id)) return id;
  modules.set(id, null);               // reserve, so cycles terminate
  const src = readFileSync(file, 'utf8');
  const deps = [];
  let body = src;

  /* import { a, b as c } from './x.js'   |   import * as N from './x.js' */
  body = body.replace(
    /^[ \t]*import\s+(?:(\*\s*as\s+[A-Za-z_$][\w$]*)|(\{[\s\S]*?\}))\s+from\s+['"]([^'"]+)['"];?[ \t]*$/gm,
    (_m, ns, named, spec) => {
      const dep = collect(resolve(dirname(file), spec));
      deps.push(dep);
      if (ns) {
        const name = ns.replace(/\*\s*as\s+/, '').trim();
        return `const ${name} = __req(${JSON.stringify(dep)});`;
      }
      const bindings = named.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean)
        .map((b) => {
          const m2 = /^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/.exec(b);
          return m2 ? `${m2[1]}: ${m2[2]}` : b;
        });
      return `const { ${bindings.join(', ')} } = __req(${JSON.stringify(dep)});`;
    },
  );
  /* bare side-effect import */
  body = body.replace(/^[ \t]*import\s+['"]([^'"]+)['"];?[ \t]*$/gm, (_m, spec) => {
    const dep = collect(resolve(dirname(file), spec));
    deps.push(dep);
    return `__req(${JSON.stringify(dep)});`;
  });

  const exported = [];
  /* export function / class / const / let */
  body = body.replace(/^[ \t]*export\s+(async\s+)?function(\s*\*)?\s+([A-Za-z_$][\w$]*)/gm, (_m, a, star, n) => {
    exported.push(n);
    return `${a || ''}function${star || ''} ${n}`;
  });
  body = body.replace(/^[ \t]*export\s+class\s+([A-Za-z_$][\w$]*)/gm, (_m, n) => {
    exported.push(n);
    return `class ${n}`;
  });
  body = body.replace(/^[ \t]*export\s+(const|let|var)\s+([A-Za-z_$][\w$]*)/gm, (_m, kw, n) => {
    exported.push(n);
    return `${kw} ${n}`;
  });
  /* export { a, b as c } */
  body = body.replace(/^[ \t]*export\s+(\{[\s\S]*?\});?[ \t]*$/gm, (_m, list) => {
    for (const raw of list.slice(1, -1).split(',')) {
      const b = raw.trim();
      if (!b) continue;
      const m2 = /^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/.exec(b);
      exported.push(m2 ? [m2[1], m2[2]] : b);
    }
    return '';
  });
  /* export default x */
  body = body.replace(/^[ \t]*export\s+default\s+([^;]+);?[ \t]*$/gm, (_m, expr) => {
    exported.push(['__default_expr__', 'default', expr]);
    return '';
  });

  const assigns = exported.map((e) => {
    if (Array.isArray(e)) {
      if (e[0] === '__default_expr__') return `__exp.default = ${e[2]};`;
      return `__exp.${e[1]} = ${e[0]};`;
    }
    return `__exp.${e} = ${e};`;
  }).join('\n');

  modules.set(id, `function (__exp, __req) {\n${body}\n${assigns}\n}`);
  order.push(id);
  return id;
}

const entryId = collect(ENTRY);
const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
const css = readFileSync(resolve(ROOT, 'css/app.css'), 'utf8');

const registry = [...modules.entries()]
  .map(([id, fn]) => `  ${JSON.stringify(id)}: ${fn},`)
  .join('\n');

const runtime = `
(function () {
  var __defs = {
${registry}
  };
  var __cache = {};
  function __req(id) {
    if (__cache[id]) return __cache[id];
    var exp = __cache[id] = {};
    __defs[id](exp, __req);
    return exp;
  }
  __req(${JSON.stringify(entryId)});
})();`;

const out = html
  .replace(/<link rel="stylesheet" href="css\/app\.css">/, `<style>\n${css}\n</style>`)
  .replace(/<script type="module" src="js\/ui\/app\.js"><\/script>/, `<script>\n${runtime}\n</script>`);

writeFileSync(OUT, out);
const kb = (Buffer.byteLength(out) / 1024).toFixed(0);
console.log(`Wrote ${relative(process.cwd(), OUT)} — ${modules.size} modules, ${kb} KB`);
