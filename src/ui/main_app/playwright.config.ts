import { defineConfig } from '@playwright/test';

const baseURL = process.env.UI_BASE_URL || 'http://127.0.0.1:3002';

export default defineConfig({
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    headless: true,
    trace: 'on-first-retry',
  },
  reporter: [['list']],
});
