import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/visual',
  timeout: 90_000,
  expect: {
    timeout: 12_000,
  },
  outputDir: './test-results/playwright',
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}',
  workers: 1,
  fullyParallel: false,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: {
      width: 1366,
      height: 768,
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/api/health',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      REY30_DISABLE_AUTH: 'true',
    },
  },
  projects: [
    {
      name: 'chromium-1366',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {
          width: 1366,
          height: 768,
        },
      },
    },
    {
      name: 'chromium-1600',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {
          width: 1600,
          height: 900,
        },
      },
    },
    {
      name: 'chromium-tablet',
      use: {
        ...devices['iPad Pro 11 landscape'],
        browserName: 'chromium',
      },
    },
    {
      name: 'chromium-mobile-390',
      use: {
        browserName: 'chromium',
        viewport: {
          width: 390,
          height: 844,
        },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
})
