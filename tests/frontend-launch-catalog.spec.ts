import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * E2E coverage for FR12 - Launch catalog and availability browsing.
 * Spec: IA/specs/feat-launch-catalog-browsing.spec.md
 * Plan: IA/plans/feat-launch-catalog-browsing.plan.md
 *
 * Runs against the Vite dev server (5173), which proxies `/api` to the backend
 * (3000). Both servers are started by playwright.config.ts. The read-only launch
 * and rocket APIs are mocked at the network boundary with a small stateful store
 * so the catalog and detail views render deterministic data (including the
 * API-derived `seatsAvailable` field), independent of backend state.
 *
 * Acceptance criteria -> tests:
 *  AC1 catalog -> GET /api/launches, show mission/rocket/date/price/seats avail .. "lists launches..."
 *  AC2 loading state while the catalog request is in progress .................... "shows the loading state..."
 *  AC3 error state with retry on catalog failure, then recovers .................. "shows the error state..."
 *  AC4 empty state when no launches exist ....................................... "shows the empty state..."
 *  AC5 zero remaining seats -> marked sold out .................................. "marks a launch with zero..."
 *  AC6 selecting a launch opens its detail view ................................. "opens the detail view..."
 *  AC7 detail -> GET /api/launches/:id, show all fields ......................... "shows mission, rocket..."
 *  AC9 detail request for a non-existent launch -> error state .................. "shows the error state for a..."
 *  (+) catalog reachable from the Customer area ................................. "is reachable from the Customer area..."
 */

const APP_URL = "http://localhost:5173";
const CATALOG_URL = `${APP_URL}/customer/launches`;

const ROCKETS_COLLECTION = "**/api/rockets";
const LAUNCHES_COLLECTION = "**/api/launches";
const LAUNCHES_ITEM = "**/api/launches/*";

type Rocket = { id: string; name: string; range: string; capacity: number };
type LaunchView = {
  id: string;
  rocketId: string;
  mission: string;
  date: string;
  pricePerSeat: number;
  minPassengers: number;
  seatsOffered: number;
  seatsAvailable: number;
};

function json(status: number, data: unknown) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  };
}

/** ISO date a given number of days in the future, for seeding launches. */
function futureIso(daysAhead = 30): string {
  return new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
}

/** Year component of an ISO date, used for a locale-robust date assertion. */
function isoYear(iso: string): string {
  return String(new Date(iso).getFullYear());
}

type MockOptions = {
  rockets?: Rocket[];
  launches?: LaunchView[];
  /** Delay applied to GET /api/launches responses, in ms. */
  getDelayMs?: number;
};

/**
 * Installs a stateful, read-only mock of the launch + rocket REST API so the
 * catalog and detail views can be driven end to end. Returns helpers to inspect
 * the requests the frontend actually issued.
 */
async function installCatalogApi(page: Page, options: MockOptions = {}) {
  const rockets = options.rockets ?? [];
  const store = new Map<string, LaunchView>();
  for (const launch of options.launches ?? []) store.set(launch.id, launch);

  const calls: { method: string; url: string }[] = [];

  // Rockets are read-only here: they resolve rocket names for display.
  await page.route(ROCKETS_COLLECTION, (route: Route) =>
    route.fulfill(json(200, rockets)),
  );

  // Collection: GET (list) only — the catalog is read-only browsing.
  await page.route(LAUNCHES_COLLECTION, async (route: Route) => {
    const req = route.request();
    calls.push({ method: req.method(), url: req.url() });
    if (req.method() === "GET") {
      if (options.getDelayMs) {
        await new Promise((r) => setTimeout(r, options.getDelayMs));
      }
      return route.fulfill(json(200, [...store.values()]));
    }
    return route.fallback();
  });

  // Item: GET (detail) — 200 with the LaunchView, or 404 when unknown.
  await page.route(LAUNCHES_ITEM, async (route: Route) => {
    const req = route.request();
    calls.push({ method: req.method(), url: req.url() });
    const id = new URL(req.url()).pathname.split("/").pop() as string;
    if (req.method() === "GET") {
      const launch = store.get(id);
      if (!launch) return route.fulfill(json(404, { error: "Launch not found" }));
      return route.fulfill(json(200, launch));
    }
    return route.fallback();
  });

  return {
    calls,
    callsFor: (method: string) => calls.filter((c) => c.method === method),
  };
}

function catalogRow(page: Page, mission: string) {
  return page.getByRole("row").filter({ hasText: mission });
}

const FALCON: Rocket = { id: "r1", name: "Falcon 9", range: "orbital", capacity: 7 };
const STARSHIP: Rocket = { id: "r2", name: "Starship", range: "mars", capacity: 10 };

test.describe("Launch Catalog - Acceptance Criteria", () => {
  // AC1: opening the catalog requests GET /api/launches and shows each launch's
  // mission, rocket name, date, price per seat, and remaining seats available.
  test("lists launches with mission, rocket name, date, price and seats available", async ({
    page,
  }) => {
    const launchDate = futureIso(30);
    const api = await installCatalogApi(page, {
      rockets: [FALCON, STARSHIP],
      launches: [
        {
          id: "l1",
          rocketId: "r1",
          mission: "Mars Hop",
          date: launchDate,
          pricePerSeat: 2500,
          minPassengers: 3,
          seatsOffered: 6,
          seatsAvailable: 4,
        },
      ],
    });

    const launchesRequest = page.waitForRequest(
      (req) => req.url().endsWith("/api/launches") && req.method() === "GET",
    );
    const rocketsRequest = page.waitForRequest(
      (req) => req.url().endsWith("/api/rockets") && req.method() === "GET",
    );
    await page.goto(CATALOG_URL);
    await launchesRequest;
    await rocketsRequest;

    await expect(
      page.getByRole("heading", { level: 1, name: "Launch catalog" }),
    ).toBeVisible();

    const row = catalogRow(page, "Mars Hop");
    await expect(row).toContainText("Mars Hop");
    await expect(row).toContainText("Falcon 9"); // rocket resolved by name
    await expect(row).toContainText(isoYear(launchDate)); // date displayed
    await expect(row).toContainText("2,500"); // price per seat
    await expect(row).toContainText("4"); // seats available (not seatsOffered 6)

    expect(api.callsFor("GET").length).toBeGreaterThan(0);
  });

  // AC2: while the catalog request is in progress, show the shared loading state.
  test("shows the loading state while the catalog request is in progress", async ({
    page,
  }) => {
    await installCatalogApi(page, {
      rockets: [FALCON],
      launches: [
        {
          id: "l1",
          rocketId: "r1",
          mission: "Slow Orbit",
          date: futureIso(30),
          pricePerSeat: 1000,
          minPassengers: 1,
          seatsOffered: 4,
          seatsAvailable: 4,
        },
      ],
      getDelayMs: 1500,
    });

    await page.goto(CATALOG_URL);

    await expect(page.getByText("Loading launches…")).toBeVisible();
    await expect(catalogRow(page, "Slow Orbit")).toBeVisible({ timeout: 5000 });
  });

  // AC4: when no launches exist, show the shared empty state (and no table).
  test("shows the empty state when there are no launches", async ({ page }) => {
    await installCatalogApi(page, { rockets: [FALCON], launches: [] });

    await page.goto(CATALOG_URL);

    await expect(
      page.getByText("No launches are scheduled yet. Check back soon."),
    ).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
  });

  // AC5: a launch with zero remaining seats is marked sold out (visible badge +
  // accessible text), and the seat count is not shown for it.
  test("marks a launch with zero seats available as sold out", async ({ page }) => {
    await installCatalogApi(page, {
      rockets: [FALCON, STARSHIP],
      launches: [
        {
          id: "l1",
          rocketId: "r1",
          mission: "Open Flight",
          date: futureIso(30),
          pricePerSeat: 1500,
          minPassengers: 2,
          seatsOffered: 5,
          seatsAvailable: 3,
        },
        {
          id: "l2",
          rocketId: "r2",
          mission: "Full House",
          date: futureIso(60),
          pricePerSeat: 3000,
          minPassengers: 4,
          seatsOffered: 8,
          seatsAvailable: 0,
        },
      ],
    });

    await page.goto(CATALOG_URL);

    const soldOutRow = catalogRow(page, "Full House");
    await expect(soldOutRow).toContainText("Sold out");
    await expect(soldOutRow).toContainText("no seats available"); // accessible text

    // The available launch shows its seat count, not the sold-out badge.
    const openRow = catalogRow(page, "Open Flight");
    await expect(openRow).toContainText("3");
    await expect(openRow).not.toContainText("Sold out");
  });

  // AC6 + AC7: selecting a launch opens its detail view, which requests
  // GET /api/launches/:id and shows mission, rocket name, date, price per seat,
  // minimum passengers, seats offered, and remaining seats available.
  test("opens the detail view for a selected launch and shows all fields", async ({
    page,
  }) => {
    const launchDate = futureIso(45);
    await installCatalogApi(page, {
      rockets: [FALCON],
      launches: [
        {
          id: "l1",
          rocketId: "r1",
          mission: "Lunar Gateway",
          date: launchDate,
          pricePerSeat: 4200,
          minPassengers: 2,
          seatsOffered: 6,
          seatsAvailable: 5,
        },
      ],
    });

    await page.goto(CATALOG_URL);

    const detailRequest = page.waitForRequest(
      (req) =>
        req.url().endsWith("/api/launches/l1") && req.method() === "GET",
    );
    await page.getByRole("link", { name: "Lunar Gateway" }).click();
    await detailRequest;

    await expect(page).toHaveURL(`${APP_URL}/customer/launches/l1`);

    // Mission is the page heading; every spec field is rendered.
    await expect(
      page.getByRole("heading", { level: 1, name: "Lunar Gateway" }),
    ).toBeVisible();

    const detail = page.getByRole("article");
    await expect(detail).toContainText("Falcon 9"); // rocket name
    await expect(detail).toContainText(isoYear(launchDate)); // date
    await expect(detail).toContainText("4,200"); // price per seat
    await expect(detail).toContainText("Minimum passengers");
    await expect(detail).toContainText("Seats offered");
    await expect(detail).toContainText("Seats available");
    // Seats offered (6) and seats available (5) are both shown as values.
    await expect(detail.getByText("6", { exact: true })).toBeVisible();
    await expect(detail.getByText("5", { exact: true })).toBeVisible();

    // A back link returns to the catalog.
    await expect(
      page.getByRole("link", { name: "← Back to catalog" }),
    ).toBeVisible();
  });

  // AC7 (sold out on detail): the detail view marks a fully-booked launch as
  // sold out as well.
  test("marks the detail view as sold out when no seats remain", async ({ page }) => {
    await installCatalogApi(page, {
      rockets: [STARSHIP],
      launches: [
        {
          id: "l9",
          rocketId: "r2",
          mission: "Full Cabin",
          date: futureIso(20),
          pricePerSeat: 9000,
          minPassengers: 1,
          seatsOffered: 4,
          seatsAvailable: 0,
        },
      ],
    });

    await page.goto(`${APP_URL}/customer/launches/l9`);

    await expect(
      page.getByRole("heading", { level: 1, name: "Full Cabin" }),
    ).toBeVisible();
    const badge = page.getByRole("article").getByRole("status");
    await expect(badge).toContainText("Sold out");
    await expect(badge).toContainText("no seats available");
  });

  // AC9: a detail request for a non-existent launch shows the shared error state.
  test("shows the error state for a non-existent launch detail", async ({ page }) => {
    await installCatalogApi(page, { rockets: [FALCON], launches: [] });

    await page.goto(`${APP_URL}/customer/launches/does-not-exist`);

    const errorState = page.getByRole("alert");
    await expect(errorState).toBeVisible();
    await expect(errorState).toContainText("Launch not found");
    // No detail content is rendered for a missing launch.
    await expect(page.getByRole("article")).toHaveCount(0);
  });
});

test.describe("Launch Catalog - errors & recovery (AC3)", () => {
  // AC3: a catalog request failure surfaces the shared error state with a retry
  // that recovers once the API becomes reachable again.
  test("shows the error state with retry when the catalog fails, then recovers", async ({
    page,
  }) => {
    await page.route(ROCKETS_COLLECTION, (route: Route) =>
      route.fulfill(json(200, [FALCON])),
    );

    let attempt = 0;
    await page.route(LAUNCHES_COLLECTION, async (route: Route) => {
      attempt += 1;
      if (attempt === 1) {
        return route.fulfill(
          json(500, { errors: ["Launch service is unavailable"] }),
        );
      }
      return route.fulfill(
        json(200, [
          {
            id: "l1",
            rocketId: "r1",
            mission: "Recovered Flight",
            date: futureIso(30),
            pricePerSeat: 1000,
            minPassengers: 2,
            seatsOffered: 5,
            seatsAvailable: 5,
          },
        ]),
      );
    });

    await page.goto(CATALOG_URL);

    const errorState = page.getByRole("alert");
    await expect(errorState).toContainText("Launch service is unavailable");

    await page.getByRole("button", { name: "Retry" }).click();

    await expect(catalogRow(page, "Recovered Flight")).toBeVisible();
  });
});

test.describe("Launch Catalog - Navigation", () => {
  // The catalog is reachable from the Customer area within the app shell.
  test("is reachable from the Customer area via the browse link", async ({ page }) => {
    await installCatalogApi(page, { rockets: [FALCON], launches: [] });

    await page.goto(`${APP_URL}/customer`);
    await page.getByRole("link", { name: "Browse launch catalog" }).click();

    await expect(page).toHaveURL(CATALOG_URL);
    await expect(
      page.getByRole("heading", { level: 1, name: "Launch catalog" }),
    ).toBeVisible();
  });
});
