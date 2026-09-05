const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 3,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: process.env.CASE_BASE_URL || 'http://127.0.0.1:8765', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.CASE_BASE_URL ? undefined : { command: 'python3 tests/serve.py', url: 'http://127.0.0.1:8765', reuseExistingServer: !process.env.CI, timeout: 15000 }
});
