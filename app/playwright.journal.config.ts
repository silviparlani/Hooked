import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  outputDir: './test-results/journal',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
    channel: process.env.CI ? undefined : 'msedge',
  },
  projects: [
    { name: 'desktop-journal', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'iphone-16-pro-journal',
      use: {
        ...devices['iPhone 15 Pro'],
        viewport: { width: 402, height: 874 },
        browserName: 'chromium',
      },
    },
  ],
  webServer: {
    command: 'npx vite --config tests/browser/vite.config.ts',
    url: 'http://127.0.0.1:4174',
    timeout: 30_000,
  },
});
