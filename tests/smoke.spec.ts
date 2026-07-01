import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("backend health endpoint returns ok", async ({ request }) => {
    const response = await request.get("http://localhost:3000/api/health");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  test("frontend loads and shows the app shell", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome to AstroBookings" }),
    ).toBeVisible();
    await expect(page.locator("nav.app-nav")).toBeVisible();
  });
});
