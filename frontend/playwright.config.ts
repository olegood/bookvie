import { defineConfig, devices } from '@playwright/test'

// Each worker starts its own `bookvie` (see e2e/fixtures.ts) on a free port,
// with a data dir under `$TMPDIR/bookvie-e2e/<run-id>/worker-<n>/`.
export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
