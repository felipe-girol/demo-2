import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: [
    {
      command: "npm run dev",
      cwd: "./backend",
      port: 3000,
      reuseExistingServer: true,
    },
    {
      command: "npm run dev",
      cwd: "./frontend",
      port: 5173,
      reuseExistingServer: true,
    },
  ],
});
