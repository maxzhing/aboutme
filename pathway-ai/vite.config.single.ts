import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/* ==========================================================================
   Single-file build.

   Produces `dist-single/pathway-ai.html`: the entire application — every
   route, the whole catalog, all styles — inlined into one document that runs
   by double-clicking it, with no server and no network.

   `npm run build:single`
   ========================================================================== */

/** Escapes a string for use inside a RegExp. */
const rx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Folds every emitted chunk and stylesheet into the HTML document and drops
 * the now-unreferenced files from the bundle.
 */
function inlineEverything(): Plugin {
  return {
    name: 'pathway-inline-everything',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlFile = Object.values(bundle).find(
        (f): f is typeof f & { type: 'asset'; source: string } =>
          f.type === 'asset' && f.fileName.endsWith('.html'),
      );
      if (!htmlFile) return;

      let html = String(htmlFile.source);

      for (const file of Object.values(bundle)) {
        if (file.type === 'asset' && file.fileName.endsWith('.css')) {
          // A stylesheet could contain `</style` inside a content string.
          const css = String(file.source).replace(/<\/style/gi, '<\\/style');
          // A replacer function, because `$&`, `$1` and friends in the bundled
          // source would otherwise be treated as replacement patterns.
          html = html.replace(
            new RegExp(`<link[^>]*href="[^"]*${rx(file.fileName)}"[^>]*>`, 'g'),
            () => `<style>\n${css}\n</style>`,
          );
          delete bundle[file.fileName];
        }
      }

      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk') {
          const code = file.code
            // Dynamic imports are already inlined, so the preload helper has
            // nothing to fetch — but Vite still leaves its dependency marker.
            .replaceAll('__VITE_PRELOAD__', 'void 0')
            // The bundle contains regex literals and strings holding `</script>`.
            .replace(/<\/script/gi, '<\\/script');
          html = html.replace(
            new RegExp(`<script[^>]*src="[^"]*${rx(file.fileName)}"[^>]*></script>`, 'g'),
            () => `<script type="module">\n${code}\n</script>`,
          );
          delete bundle[file.fileName];
        }
      }

      // Preload hints point at files that no longer exist.
      html = html.replace(/\s*<link rel="modulepreload"[^>]*>/g, '');

      // Webfonts need the network; the stack already falls back to system
      // faces, so the single file stays usable entirely offline.
      html = html.replace(
        /<link href="https:\/\/fonts\.googleapis\.com[^>]*>/g,
        () =>
          '<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400&family=Inter:wght@300..800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" media="print" onload="this.media=\'all\'" />',
      );

      // Nothing may remain that the browser would have to fetch: a file://
      // document cannot load a sibling script at all (opaque origin).
      if (html.includes('__VITE_PRELOAD__')) {
        this.error('Single-file build left an unresolved __VITE_PRELOAD__ marker.');
      }

      const stillExternal = html.match(/<(?:script[^>]*src|link[^>]*rel="(?:stylesheet|modulepreload)")[^>]*>/g) ?? [];
      const unresolved = stillExternal.filter((tag) => !tag.includes('fonts.googleapis.com'));
      if (unresolved.length) {
        this.error(`Single-file build left ${unresolved.length} external reference(s): ${unresolved.join(', ')}`);
      }

      htmlFile.fileName = 'pathway-ai.html';
      htmlFile.source = html;
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), inlineEverything()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: 'dist-single',
    target: 'es2020',
    // Vite otherwise injects __VITE_PRELOAD__ markers for dynamic imports and
    // resolves them against chunks that no longer exist once everything is
    // folded into one script.
    modulePreload: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 4000,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // One chunk, so there is nothing left to fetch at runtime.
        inlineDynamicImports: true,
      },
    },
  },
});
