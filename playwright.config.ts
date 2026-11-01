import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 7000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3101',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--no-sandbox'] },
  },
  webServer: {
    command: 'node --import tsx server/index.ts',
    url: 'http://127.0.0.1:3101/api/status',
    reuseExistingServer: false,
    env: { PORT: '3101', DATABASE_PATH: '/tmp/living-realms-e2e.sqlite', OPENAI_API_KEY: '' },
    timeout: 20000,
  },
});
