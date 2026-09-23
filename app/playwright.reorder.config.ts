import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
    channel: process.env.CI ? undefined : 'msedge',
  },
  projects: [
    { name: 'desktop-reordering', use: { ...devices['Desktop Chrome'] } },
    { name: 'touch-reordering', use: { ...devices['iPhone 15 Pro'], browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npx vite --config tests/browser/vite.config.ts',
    url: 'http://127.0.0.1:4174',
    timeout: 30_000,
  },
});
