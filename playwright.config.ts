import { defineConfig } from '@playwright/test';

// Two projects, same Electron app, two wiring modes:
//   • "electron-local"  → in-process SQLite via IPC (default)
//   • "electron-server" → API calls go to Express on :3500 via HTTP
// Playwright spawns the Express server before the server-mode project runs
// and tears it down after.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 15 * 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'electron-local',
      use: {}, // serverUrl is left unset → IPC/local mode
      metadata: { serverUrl: '' },
    },
    {
      name: 'electron-server',
      use: {},
      metadata: { serverUrl: 'http://127.0.0.1:3500' },
    },
  ],
  webServer: [
    {
      // Only needed for the server-mode project, but Playwright starts it
      // once and reuses across all projects — harmless for the local one.
      command: 'npm run server',
      url: 'http://127.0.0.1:3500/api/health',
      reuseExistingServer: true,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
