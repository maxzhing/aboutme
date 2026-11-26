import { defineConfig } from '@playwright/test';

/** End-to-end tests run against the built single file, opened from disk exactly as a student would. */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  fullyParallel: true,
  reporter: [['list']],
  outputDir: './e2e-results',
  use: { viewport: { width: 1366, height: 850 }, trace: 'off' },
});
