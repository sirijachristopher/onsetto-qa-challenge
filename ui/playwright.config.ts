import { defineConfig, devices } from '@playwright/test';

export const STORAGE_STATE = '.auth/user.json';

// Uses the Google Chrome installed on this machine.
const channel = process.env.PW_CHANNEL ?? 'chrome';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://marketplace.dev-challenge.com',
    testIdAttribute: 'data-testid',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(channel === 'bundled' ? {} : { channel }),   // applies to every project, including setup
  },
  projects: [
    // Logs in + completes MFA once and saves storage state.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
});