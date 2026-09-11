import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-browser',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        channel: process.env.CI ? undefined : 'msedge',
      },
    },
    {
      name: 'iphone-16-pro',
      use: {
        ...devices['iPhone 15 Pro'],
        browserName: 'chromium',
        channel: process.env.CI ? undefined : 'msedge',
        viewport: { width: 393, height: 852 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
