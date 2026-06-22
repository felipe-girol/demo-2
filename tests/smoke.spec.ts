import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("backend health endpoint returns ok", async ({ request }) => {
    const response = await request.get("http://localhost:3000/api/health");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  test("frontend loads and shows heading", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toHaveText("Get started");
  });

  test("frontend counter button works", async ({ page }) => {
    await page.goto("http://localhost:5173");
    const button = page.locator("button.counter");
    await expect(button).toContainText("Count is 0");
    await button.click();
    await expect(button).toContainText("Count is 1");
  });
});
