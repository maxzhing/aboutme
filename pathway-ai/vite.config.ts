import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // Absolute, because client-side routing means a lazy chunk requested from
  // /app/path must resolve to /assets/…, not /app/assets/….
  base: '/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) return 'router';
            if (id.includes('react')) return 'react';
            return 'vendor';
          }
          // The catalog is split by area: opening the college explorer should
          // not also download every AP unit and practice question.
          if (id.includes('/src/data/colleges')) return 'catalog-colleges';
          if (id.includes('/src/data/ap/')) return 'catalog-ap';
          if (id.includes('/src/data/questions/')) return 'catalog-questions';
          if (id.includes('/src/data/')) return 'catalog';
        },
      },
    },
  },
});
