import { defineConfig, devices } from '@playwright/test'

/** A port of its own, never reused: a preview left open on another build can't be tested by mistake. */
const PORT = 4817
/** Locally, an already installed Chrome/Chromium can be used instead of downloading one. */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined

/**
 * Browser tests (tests/e2e): the site built into dist-e2e (the normal dist is left alone) and
 * served by `vite preview`. The leaderboard server is a fake address (http://leaderboard.test)
 * that each test answers or blocks, so no database is needed.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: { executablePath },
  },
  projects: [
    { name: 'chromium', testIgnore: /samsung\.spec/, use: { ...devices['Desktop Chrome'] } },
    {
      // A touch phone whose browser says it has a mouse, like Samsung Internet (tests/e2e/samsung.spec.ts).
      name: 'samsung-like',
      testMatch: /samsung\.spec/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath,
          args: ['--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4'],
        },
      },
    },
  ],
  webServer: {
    command: `npx vite build --outDir dist-e2e && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { VITE_LEADERBOARD_URL: 'http://leaderboard.test' },
  },
})
