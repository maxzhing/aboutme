// Bundles the modular source into one self-contained cityos.html that runs
// straight off the filesystem — no server, no network, no build step for the
// person opening it.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, statSync } from 'fs';

const alias = {
  name: 'alias',
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: new URL('./vendor/three.module.min.js', import.meta.url).pathname }));
    b.onResolve({ filter: /^three\/addons\// }, (a) => ({
      path: new URL('./vendor/addons/' + a.path.slice('three/addons/'.length), import.meta.url).pathname,
    }));
  },
};

const res = await build({
  entryPoints: ['js/main.js'],
  bundle: true, format: 'iife', minify: true, target: 'es2020',
  write: false, plugins: [alias], legalComments: 'none',
});
const js = res.outputFiles[0].text;
const css = readFileSync('css/ui.css', 'utf8');
const shell = readFileSync('index.html', 'utf8');

const body = shell
  .slice(shell.indexOf('<body>') + 6, shell.indexOf('</body>'))
  .replace(/<script type="module"[\s\S]*?<\/script>/, '')
  .trim();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>CITYOS — 3D Living City Simulator</title>
<style>
${css}
</style>
</head>
<body>
${body}
<script>
${js}
</script>
</body>
</html>
`;
writeFileSync('cityos.html', html);
console.log('cityos.html', (statSync('cityos.html').size / 1024 / 1024).toFixed(2) + ' MB');
