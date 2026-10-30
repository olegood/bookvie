import { defineConfig, devices } from '@playwright/test'

const CI = !!process.env.CI

// Each worker starts its own `bookvie` (see e2e/fixtures.ts) on a free port,
// with a data dir under `$TMPDIR/bookvie-e2e/<run-id>/worker-<n>/`. `baseURL`
// comes from that fixture, not from the environment.
export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // HTML report in playwright-report/, JUnit in test-results/ (both gitignored).
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    // Dates in the browser are local to the same zone `check:e2e` pins (TZ).
    timezoneId: 'Europe/Madrid',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure-and-retries',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
