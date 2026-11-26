import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
  resolve: { alias: [{ find: /^@\//, replacement: at('./src/') }, { find: 'next/link', replacement: at('./src/shim/link.tsx') }, { find: 'next/navigation', replacement: at('./src/shim/navigation.ts') }] },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
