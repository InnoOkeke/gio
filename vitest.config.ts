import { defineConfig } from 'vitest/config';
export default defineConfig({
  // Components are .tsx with the automatic JSX runtime (as in the app build), so tests can render them.
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup-locales.ts'],
    // Test files that start the real app import the database and Express under a busy parallel run.
    hookTimeout: 30000,
  },
});
