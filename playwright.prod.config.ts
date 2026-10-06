import { defineConfig, devices } from '@playwright/test'

// Runs against the production build (`pnpm build` first): service workers only exist there.
export default defineConfig({
  testDir: './e2e-prod',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  projects: [{ name: 'prod', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node .output/server/index.mjs',
    env: { PORT: '3100' },
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
