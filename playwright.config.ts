import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const angularCliPath = path.join(process.cwd(), 'node_modules', '@angular', 'cli', 'bin', 'ng.js');

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://127.0.0.1:4200',
    trace: 'on-first-retry',
  },
  webServer: {
    command: `"${process.execPath}" "${angularCliPath}" serve demo --host 127.0.0.1 --port 4200`,
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
