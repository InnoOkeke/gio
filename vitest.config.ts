import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Test files that start the real app import the database and Express under a busy parallel run.
    hookTimeout: 30000,
  },
});
