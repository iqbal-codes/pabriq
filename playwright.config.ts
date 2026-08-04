import { defineConfig, devices } from '@playwright/test'

const port = 3001
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    // system Chrome fallback (PW_CHANNEL=chrome) — applies to the setup
    // project too; the chromium project overrides with the same value.
    channel: process.env.PW_CHANNEL === 'chrome' ? 'chrome' : undefined,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Allow running against system Google Chrome when the bundled
        // browser binaries aren't installed (PW_CHANNEL=chrome).
        channel: process.env.PW_CHANNEL === 'chrome' ? 'chrome' : undefined,
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'bun run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
