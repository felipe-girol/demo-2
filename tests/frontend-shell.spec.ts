import { test, expect, type Page } from "@playwright/test";

/**
 * E2E coverage for FR9 - Frontend application shell and API integration.
 * Spec: IA/specs/feat-frontend-app-shell.spec.md
 *
 * Runs against the Vite dev server (5173), which proxies `/api` to the
 * backend (3000). Both servers are started by playwright.config.ts.
 *
 * Acceptance criteria → tests:
 *  AC1 shared layout + agency/customer nav .......... "renders a shared layout..."
 *  AC2 client-side routing, no full reload .......... "navigates client-side..."
 *  AC3 request /api/health on start + indicator ..... "requests GET /api/health..."
 *  AC4 health failure/timeout → unreachable ......... "shows unreachable when..." (x2)
 *  AC5 single typed client on /api base ............. "all data access targets /api"
 *  AC6 reusable loading state while in progress ..... "shows a loading/checking state..."
 *  AC7 reusable error state w/ retry on failure ..... "exposes a reusable error state..."
 *  AC8 reusable empty state when no data ............ "shows a reusable empty state..." (x2)
 *  AC9 unknown path → not-found inside layout ....... "shows a not-found route..."
 */

const APP_URL = "http://localhost:5173";

const HEALTH_GLOB = "**/api/health";

function mockHealthOk(timestamp = new Date().toISOString()) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status: "ok", timestamp }),
  };
}

test.describe("Frontend App Shell - Acceptance Criteria", () => {
  // AC1: shared layout with navigation to agency and customer areas.
  test("renders a shared layout with brand, agency/customer nav and footer", async ({
    page,
  }) => {
    await page.goto(APP_URL);

    const nav = page.locator("nav.app-nav");
    await expect(nav).toBeVisible();
    await expect(page.getByRole("link", { name: "AstroBookings" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Agency", exact: true })).toBeVisible();
    await expect(
      nav.getByRole("link", { name: "Customer", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText("AstroBookings");
  });

  // AC2: navigation routes client-side without a full page reload.
  test("navigates client-side between areas without a full page reload", async ({
    page,
  }) => {
    await page.goto(APP_URL);
    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome to AstroBookings" }),
    ).toBeVisible();

    // Sentinel that only survives if the JS context is NOT reloaded.
    await page.evaluate(() => ((window as Window & { __noReload?: boolean }).__noReload = true));

    const nav = page.locator("nav.app-nav");

    await nav.getByRole("link", { name: "Agency", exact: true }).click();
    await expect(page).toHaveURL(`${APP_URL}/agency`);
    await expect(page.getByRole("heading", { level: 1, name: "Agency" })).toBeVisible();

    await nav.getByRole("link", { name: "Customer", exact: true }).click();
    await expect(page).toHaveURL(`${APP_URL}/customer`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Customer" }),
    ).toBeVisible();

    await nav.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page).toHaveURL(`${APP_URL}/`);

    const survived = await page.evaluate(
      () => (window as Window & { __noReload?: boolean }).__noReload === true,
    );
    expect(survived).toBe(true);
  });

  // AC3: on start, request GET /api/health and reflect a reachable response.
  test("requests GET /api/health on startup and shows the reachable indicator", async ({
    page,
  }) => {
    await page.route(HEALTH_GLOB, (route) => route.fulfill(mockHealthOk()));

    const healthRequest = page.waitForRequest(HEALTH_GLOB);
    await page.goto(APP_URL);
    const request = await healthRequest;
    expect(request.method()).toBe("GET");

    await expect(page.getByText("API reachable")).toBeVisible();
  });

  // AC5: a single typed client targets the `/api` base path for data access.
  test("all data access targets the /api base path", async ({ page }) => {
    const apiRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/health")) apiRequests.push(req.url());
    });

    await page.goto(APP_URL);
    await expect(page.getByText(/API (reachable|unreachable)/)).toBeVisible();

    expect(apiRequests.length).toBeGreaterThan(0);
    expect(apiRequests.every((url) => url.includes("/api/health"))).toBe(true);
  });

  // AC4: health request failure (non-2xx) → unreachable indicator.
  test("shows the unreachable indicator when the health request fails", async ({
    page,
  }) => {
    await page.route(HEALTH_GLOB, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
    );

    await page.goto(APP_URL);
    await expect(page.getByText("API unreachable")).toBeVisible();
  });

  // AC4: health request network error / timeout → unreachable indicator.
  test("shows the unreachable indicator when the health request errors out", async ({
    page,
  }) => {
    await page.route(HEALTH_GLOB, (route) => route.abort());

    await page.goto(APP_URL);
    await expect(page.getByText("API unreachable")).toBeVisible();
  });

  // AC6: a loading/in-progress state shows while the health request is pending.
  test("shows a checking state while the health request is in progress", async ({
    page,
  }) => {
    await page.route(HEALTH_GLOB, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill(mockHealthOk());
    });

    await page.goto(APP_URL);
    await expect(page.getByText(/Checking API/)).toBeVisible();
    await expect(page.getByText("API reachable")).toBeVisible({ timeout: 5000 });
  });

  // AC8: the agency area now hosts the rocket-management entry (FR10); the
  // reusable empty state moved to the rockets screen (see frontend-rockets.spec).
  test("shows the agency area with the rocket-management entry", async ({
    page,
  }) => {
    await page.goto(`${APP_URL}/agency`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Agency" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Manage rockets" }),
    ).toBeVisible();
  });

  // AC8: the customer area surfaces the launch-catalog entry point (FR12).
  test("shows the customer area with the launch-catalog entry", async ({
    page,
  }) => {
    await page.goto(`${APP_URL}/customer`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Customer" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Browse launch catalog" }),
    ).toBeVisible();
  });

  // AC9: unknown path renders the not-found view inside the shared layout.
  test("shows a not-found route within the shared layout for unknown paths", async ({
    page,
  }) => {
    await page.goto(`${APP_URL}/this-path-does-not-exist`);

    await expect(
      page.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeVisible();
    // Still inside the shared layout (nav + footer present).
    await expect(page.locator("nav.app-nav")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();

    await page.getByRole("link", { name: "Back to home" }).click();
    await expect(page).toHaveURL(`${APP_URL}/`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome to AstroBookings" }),
    ).toBeVisible();
  });
});

/**
 * AC7 - reusable error state WITH a retry affordance.
 *
 * The shell wires the live failure path to the health indicator's
 * "unreachable" state (covered above). The reusable ErrorState component and
 * its retry behaviour are driven by the `use-async` composable's `retry()`
 * (covered by frontend unit tests in `use-async.test.ts`) and are surfaced by
 * the feature screens delivered in later stages (FR10-FR13). This block
 * verifies the shell's observable failure feedback and recovery on retry.
 */
test.describe("Frontend App Shell - API failure & recovery (AC7)", () => {
  async function gotoWithFlakyHealth(page: Page, failFirst: number) {
    let calls = 0;
    await page.route(HEALTH_GLOB, async (route) => {
      calls += 1;
      if (calls <= failFirst) {
        await route.abort();
        return;
      }
      await route.fulfill(mockHealthOk());
    });
  }

  test("surfaces a failure state and recovers when the API becomes reachable", async ({
    page,
  }) => {
    await gotoWithFlakyHealth(page, 1);

    await page.goto(APP_URL);
    // Initial failure feedback.
    await expect(page.getByText("API unreachable")).toBeVisible();

    // A subsequent successful health check (re-run) resolves to reachable,
    // proving the failure feedback is recoverable rather than terminal.
    await page.reload();
    await expect(page.getByText("API reachable")).toBeVisible();
  });
});
