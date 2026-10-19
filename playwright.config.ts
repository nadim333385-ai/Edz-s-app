import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const baseSegment = (process.env.LENDULET_BASE_PATH || '/').replace(/^\/+|\/+$/g, '');
const baseURL = `http://127.0.0.1:4173${baseSegment ? `/${baseSegment}/` : '/'}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: 'list',
  timeout: 40_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL,
    locale: 'hu-HU',
    timezoneId: 'Europe/Budapest',
    launchOptions: { executablePath: chromiumPath },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
