import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Game rules, shared data and the leaderboard server (tests/). The browser tests are in
// tests/e2e and run with Playwright (playwright.config.ts).
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
    // The server tests share one test database.
    fileParallelism: false,
  },
})
