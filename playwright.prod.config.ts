import { defineConfig, devices } from '@playwright/test'

// Runs against the production build (`pnpm build` first): service workers only exist there.
// Set BASE_URL to test a deployed site instead: BASE_URL=https://example.vercel.app pnpm test:e2e:prod
export default defineConfig({
  testDir: './e2e-prod',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3100',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'prod', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'node .output/server/index.mjs',
        env: { PORT: '3100' },
        url: 'http://localhost:3100',
        reuseExistingServer: false,
        timeout: 60_000,
      },
})
