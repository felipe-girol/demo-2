import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * E2E coverage for FR11 - Launch management UI.
 * Spec: IA/specs/feat-launch-management-ui.spec.md
 * Plan: IA/plans/feat-launch-management-ui.plan.md
 *
 * Runs against the Vite dev server (5173), which proxies `/api` to the backend
 * (3000). Both servers are started by playwright.config.ts. The launch and
 * rocket APIs are mocked at the network boundary with a stateful handler so
 * create/edit/delete reflect in subsequent reads deterministically, independent
 * of backend state.
 *
 * Acceptance criteria -> tests:
 *  AC1 load -> GET /api/launches, show mission/rocket/date/price/min/seats . "lists launches..."
 *  AC2 loading state while request in progress ........................... "shows the loading state..."
 *  AC3 error state with retry on failure ................................. "shows the error state..."
 *  AC4 empty state when no launches exist ............................... "shows the empty state..."
 *  AC5 form offers rocket selection from /api/rockets ................... "populates the rocket selector..."
 *  AC6 invalid input -> field messages, no submit ...................... "blocks invalid input..."
 *  AC7 valid create -> POST, add to list .............................. "creates a launch..."
 *  AC8 valid edit -> PUT, reflect in list ............................. "edits a launch..."
 *  AC9 confirmed delete -> DELETE, remove from list ................... "deletes a launch after confirmation"
 *  (+) write error preserves form values .............................. "preserves the entered form values..."
 *  (+) reachable from the Agency area ................................. "is reachable from the Agency area..."
 */

const APP_URL = "http://localhost:5173";
const LAUNCHES_URL = `${APP_URL}/agency/launches`;

const ROCKETS_COLLECTION = "**/api/rockets";
const LAUNCHES_COLLECTION = "**/api/launches";
const LAUNCHES_ITEM = "**/api/launches/*";

type Rocket = { id: string; name: string; range: string; capacity: number };
type Launch = {
  id: string;
  rocketId: string;
  mission: string;
  date: string;
  pricePerSeat: number;
  minPassengers: number;
  seatsOffered: number;
};

function json(status: number, data: unknown) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  };
}

/** Build a `datetime-local` input value some days in the future. */
function futureDateTimeLocal(daysAhead = 30): string {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

type MockOptions = {
  rockets?: Rocket[];
  launches?: Launch[];
  /** Delay applied to GET /api/launches responses, in ms. */
  getDelayMs?: number;
};

/**
 * Installs a stateful in-memory mock of the launch REST API (plus a read-only
 * rocket list) on the page so the UI's after-success mutations can be observed
 * end to end. Returns helpers to inspect what the frontend actually sent.
 */
async function installLaunchApi(page: Page, options: MockOptions = {}) {
  const rockets = options.rockets ?? [];
  const store = new Map<string, Launch>();
  for (const launch of options.launches ?? []) store.set(launch.id, launch);
  let nextId = (options.launches?.length ?? 0) + 1;

  const calls: { method: string; url: string }[] = [];

  // Rockets are read-only here: they populate the selector and list names.
  await page.route(ROCKETS_COLLECTION, (route: Route) =>
    route.fulfill(json(200, rockets)),
  );

  // Collection: GET (list) and POST (create).
  await page.route(LAUNCHES_COLLECTION, async (route: Route) => {
    const req = route.request();
    calls.push({ method: req.method(), url: req.url() });

    if (req.method() === "GET") {
      if (options.getDelayMs) {
        await new Promise((r) => setTimeout(r, options.getDelayMs));
      }
      return route.fulfill(json(200, [...store.values()]));
    }

    if (req.method() === "POST") {
      const dto = JSON.parse(req.postData() ?? "{}") as Omit<Launch, "id">;
      const created: Launch = { id: `mock-${nextId++}`, ...dto };
      store.set(created.id, created);
      return route.fulfill(json(201, created));
    }

    return route.fallback();
  });

  // Item: PUT (update) and DELETE (remove).
  await page.route(LAUNCHES_ITEM, async (route: Route) => {
    const req = route.request();
    calls.push({ method: req.method(), url: req.url() });
    const id = new URL(req.url()).pathname.split("/").pop() as string;

    if (req.method() === "PUT") {
      const dto = JSON.parse(req.postData() ?? "{}") as Partial<Launch>;
      const updated: Launch = { ...(store.get(id) as Launch), ...dto, id };
      store.set(id, updated);
      return route.fulfill(json(200, updated));
    }

    if (req.method() === "DELETE") {
      store.delete(id);
      return route.fulfill({ status: 204, body: "" });
    }

    return route.fallback();
  });

  return {
    calls,
    callsFor: (method: string) => calls.filter((c) => c.method === method),
  };
}

function launchRow(page: Page, mission: string) {
  return page.getByRole("row").filter({ hasText: mission });
}

const FALCON: Rocket = { id: "r1", name: "Falcon 9", range: "orbital", capacity: 7 };
const STARSHIP: Rocket = { id: "r2", name: "Starship", range: "mars", capacity: 10 };

test.describe("Launch Management UI - Acceptance Criteria", () => {
  // AC1: on load, request GET /api/launches and show mission, rocket name,
  // date, price per seat, minimum passengers and seats offered.
  test("lists launches with mission, rocket name, price, min passengers and seats on load", async ({
    page,
  }) => {
    const api = await installLaunchApi(page, {
      rockets: [FALCON, STARSHIP],
      launches: [
        {
          id: "l1",
          rocketId: "r1",
          mission: "Mars Hop",
          date: futureDateTimeLocalIso(30),
          pricePerSeat: 2500,
          minPassengers: 3,
          seatsOffered: 6,
        },
      ],
    });

    const launchesRequest = page.waitForRequest(
      (req) => req.url().endsWith("/api/launches") && req.method() === "GET",
    );
    const rocketsRequest = page.waitForRequest(
      (req) => req.url().endsWith("/api/rockets") && req.method() === "GET",
    );
    await page.goto(LAUNCHES_URL);
    await launchesRequest;
    await rocketsRequest;

    await expect(
      page.getByRole("heading", { level: 1, name: "Launches" }),
    ).toBeVisible();

    const row = launchRow(page, "Mars Hop");
    await expect(row).toContainText("Mars Hop");
    await expect(row).toContainText("Falcon 9"); // rocket resolved by name
    await expect(row).toContainText("2,500"); // price per seat
    await expect(row).toContainText("3"); // minimum passengers
    await expect(row).toContainText("6"); // seats offered

    expect(api.callsFor("GET").length).toBeGreaterThan(0);
  });

  // AC2: while the launches request is in progress, show the shared loading state.
  test("shows the loading state while the launches request is in progress", async ({
    page,
  }) => {
    await installLaunchApi(page, {
      rockets: [FALCON],
      launches: [
        {
          id: "l1",
          rocketId: "r1",
          mission: "Slow Orbit",
          date: futureDateTimeLocalIso(30),
          pricePerSeat: 1000,
          minPassengers: 1,
          seatsOffered: 4,
        },
      ],
      getDelayMs: 1500,
    });

    await page.goto(LAUNCHES_URL);

    await expect(page.getByText("Loading launches…")).toBeVisible();
    await expect(launchRow(page, "Slow Orbit")).toBeVisible({ timeout: 5000 });
  });

  // AC4: when no launches exist, show the shared empty state.
  test("shows the empty state when there are no launches", async ({ page }) => {
    await installLaunchApi(page, { rockets: [FALCON], launches: [] });

    await page.goto(LAUNCHES_URL);

    await expect(
      page.getByText(
        "No launches yet. Schedule your first launch to get started.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
  });

  // AC5: the launch form offers rocket selection populated from /api/rockets.
  test("populates the rocket selector from /api/rockets", async ({ page }) => {
    await installLaunchApi(page, {
      rockets: [FALCON, STARSHIP],
      launches: [],
    });

    await page.goto(LAUNCHES_URL);
    await page.getByRole("button", { name: "New launch" }).click();

    const options = await page
      .getByLabel("Rocket")
      .locator("option:not([disabled])")
      .allInnerTexts();

    expect(options.map((o) => o.trim())).toEqual([
      "Falcon 9 (capacity 7)",
      "Starship (capacity 10)",
    ]);
  });

  // AC6: invalid input shows field-specific messages and no request is sent.
  test("blocks invalid input with inline field errors and sends no request", async ({
    page,
  }) => {
    const api = await installLaunchApi(page, {
      rockets: [FALCON],
      launches: [],
    });

    await page.goto(LAUNCHES_URL);
    await page.getByRole("button", { name: "New launch" }).click();

    // Submit an empty form: every required field is invalid.
    await page.getByRole("button", { name: "Schedule launch" }).click();

    await expect(page.getByText("Select a rocket.")).toBeVisible();
    await expect(page.getByText("Mission is required.")).toBeVisible();
    await expect(page.getByText("Date is required.")).toBeVisible();
    await expect(page.getByText("Price per seat is required.")).toBeVisible();
    await expect(page.getByText("Seats offered is required.")).toBeVisible();
    await expect(
      page.getByText("Minimum passengers is required."),
    ).toBeVisible();

    // Cross-field: seats offered cannot exceed the selected rocket's capacity.
    await page.getByLabel("Rocket").selectOption("r1");
    await page.getByLabel("Mission").fill("Overbooked");
    await page.getByLabel("Date").fill(futureDateTimeLocal(30));
    await page.getByLabel("Price per seat").fill("500");
    await page.getByLabel("Seats offered").fill("9"); // capacity is 7
    await page.getByLabel("Minimum passengers").fill("2");
    await page.getByRole("button", { name: "Schedule launch" }).click();
    await expect(
      page.getByText(
        "Seats offered must not exceed the rocket capacity (7).",
      ),
    ).toBeVisible();

    // Cross-field: minimum passengers cannot exceed seats offered.
    await page.getByLabel("Seats offered").fill("5");
    await page.getByLabel("Minimum passengers").fill("6");
    await page.getByRole("button", { name: "Schedule launch" }).click();
    await expect(
      page.getByText("Minimum passengers must not exceed seats offered."),
    ).toBeVisible();

    // No POST was ever issued because client validation blocked every submit.
    expect(api.callsFor("POST").length).toBe(0);
  });

  // AC7: valid create -> POST /api/launches and add the launch to the list.
  test("creates a launch and adds it to the list", async ({ page }) => {
    await installLaunchApi(page, { rockets: [FALCON], launches: [] });

    await page.goto(LAUNCHES_URL);
    await expect(page.getByText(/No launches yet/)).toBeVisible();

    await page.getByRole("button", { name: "New launch" }).click();

    await page.getByLabel("Rocket").selectOption("r1");
    await page.getByLabel("Mission").fill("First Light");
    await page.getByLabel("Date").fill(futureDateTimeLocal(45));
    await page.getByLabel("Price per seat").fill("1200");
    await page.getByLabel("Seats offered").fill("5");
    await page.getByLabel("Minimum passengers").fill("2");

    const postRequest = page.waitForRequest(
      (req) => req.url().endsWith("/api/launches") && req.method() === "POST",
    );
    await page.getByRole("button", { name: "Schedule launch" }).click();
    const request = await postRequest;
    expect(JSON.parse(request.postData() ?? "{}")).toMatchObject({
      rocketId: "r1",
      mission: "First Light",
      pricePerSeat: 1200,
      seatsOffered: 5,
      minPassengers: 2,
    });

    const row = launchRow(page, "First Light");
    await expect(row).toBeVisible();
    await expect(row).toContainText("Falcon 9");
    await expect(row).toContainText("1,200");
    await expect(
      page.getByText('Launch "First Light" scheduled.'),
    ).toBeVisible();
  });

  // AC8: edit submit -> PUT /api/launches/:id and reflect the updated values.
  test("edits a launch and reflects the updated values in the list", async ({
    page,
  }) => {
    await installLaunchApi(page, {
      rockets: [FALCON, STARSHIP],
      launches: [
        {
          id: "l1",
          rocketId: "r1",
          mission: "Orbital Test",
          date: futureDateTimeLocalIso(30),
          pricePerSeat: 1000,
          minPassengers: 2,
          seatsOffered: 5,
        },
      ],
    });

    await page.goto(LAUNCHES_URL);
    await expect(launchRow(page, "Orbital Test")).toBeVisible();

    await launchRow(page, "Orbital Test")
      .getByRole("button", { name: /Edit/ })
      .click();

    // Form is pre-filled for edit.
    await expect(page.getByLabel("Mission")).toHaveValue("Orbital Test");
    await expect(page.getByLabel("Rocket")).toHaveValue("r1");

    await page.getByLabel("Mission").fill("Orbital Test v2");
    await page.getByLabel("Seats offered").fill("6");

    const putRequest = page.waitForRequest(
      (req) =>
        req.url().endsWith("/api/launches/l1") && req.method() === "PUT",
    );
    await page.getByRole("button", { name: "Save changes" }).click();
    const request = await putRequest;
    expect(JSON.parse(request.postData() ?? "{}")).toMatchObject({
      mission: "Orbital Test v2",
      seatsOffered: 6,
    });

    const updated = launchRow(page, "Orbital Test v2");
    await expect(updated).toBeVisible();
    await expect(updated).toContainText("6");
    // The old mission label no longer exists as its own cell (exact match).
    await expect(
      page.getByRole("cell", { name: "Orbital Test", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText('Launch "Orbital Test v2" updated.'),
    ).toBeVisible();
  });

  // AC9: confirmed delete -> DELETE /api/launches/:id and remove from the list.
  test("deletes a launch after confirmation", async ({ page }) => {
    const api = await installLaunchApi(page, {
      rockets: [FALCON, STARSHIP],
      launches: [
        {
          id: "l1",
          rocketId: "r1",
          mission: "Keep Me",
          date: futureDateTimeLocalIso(30),
          pricePerSeat: 1000,
          minPassengers: 2,
          seatsOffered: 5,
        },
        {
          id: "l2",
          rocketId: "r2",
          mission: "Cancel Me",
          date: futureDateTimeLocalIso(60),
          pricePerSeat: 2000,
          minPassengers: 4,
          seatsOffered: 8,
        },
      ],
    });

    await page.goto(LAUNCHES_URL);
    await expect(launchRow(page, "Cancel Me")).toBeVisible();

    await launchRow(page, "Cancel Me")
      .getByRole("button", { name: /Delete/ })
      .click();

    // A confirmation step is shown before any request is issued.
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Delete launch "Cancel Me"?');
    expect(api.callsFor("DELETE").length).toBe(0);

    const deleteRequest = page.waitForRequest(
      (req) =>
        req.url().endsWith("/api/launches/l2") && req.method() === "DELETE",
    );
    await dialog.getByRole("button", { name: "Delete" }).click();
    await deleteRequest;

    await expect(launchRow(page, "Cancel Me")).toHaveCount(0);
    await expect(launchRow(page, "Keep Me")).toBeVisible();
    await expect(page.getByText('Launch "Cancel Me" deleted.')).toBeVisible();
  });
});

test.describe("Launch Management UI - API errors & recovery (AC3)", () => {
  // AC3 (load): an API error surfaces the shared error state with a retry that
  // recovers when the API becomes reachable again.
  test("shows the error state with retry when the list fails, then recovers", async ({
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
            mission: "Recovered",
            date: futureDateTimeLocalIso(30),
            pricePerSeat: 1000,
            minPassengers: 2,
            seatsOffered: 5,
          },
        ]),
      );
    });

    await page.goto(LAUNCHES_URL);

    const errorState = page.getByRole("alert");
    await expect(errorState).toContainText("Launch service is unavailable");

    await page.getByRole("button", { name: "Retry" }).click();

    await expect(launchRow(page, "Recovered")).toBeVisible();
  });

  // Write path: a create error is surfaced while the entered form values are
  // preserved for correction (server stays authoritative).
  test("preserves the entered form values when the create request fails", async ({
    page,
  }) => {
    await page.route(ROCKETS_COLLECTION, (route: Route) =>
      route.fulfill(json(200, [FALCON])),
    );

    // List loads empty; POST is rejected with a server validation error.
    await page.route(LAUNCHES_COLLECTION, async (route: Route) => {
      const req = route.request();
      if (req.method() === "POST") {
        return route.fulfill(
          json(400, { errors: ["seatsOffered exceeds rocket capacity"] }),
        );
      }
      return route.fulfill(json(200, []));
    });

    await page.goto(LAUNCHES_URL);
    await page.getByRole("button", { name: "New launch" }).click();

    await page.getByLabel("Rocket").selectOption("r1");
    await page.getByLabel("Mission").fill("Risky Burn");
    await page.getByLabel("Date").fill(futureDateTimeLocal(30));
    await page.getByLabel("Price per seat").fill("1500");
    await page.getByLabel("Seats offered").fill("7");
    await page.getByLabel("Minimum passengers").fill("3");
    await page.getByRole("button", { name: "Schedule launch" }).click();

    // Authoritative server error is surfaced...
    await expect(
      page.getByText("seatsOffered exceeds rocket capacity"),
    ).toBeVisible();

    // ...and the form keeps the entered values so they can be corrected.
    await expect(page.getByLabel("Mission")).toHaveValue("Risky Burn");
    await expect(page.getByLabel("Rocket")).toHaveValue("r1");
    await expect(page.getByLabel("Price per seat")).toHaveValue("1500");
    await expect(page.getByLabel("Seats offered")).toHaveValue("7");
    await expect(page.getByLabel("Minimum passengers")).toHaveValue("3");
  });
});

test.describe("Launch Management UI - Navigation", () => {
  // The screen is reachable from the Agency area within the app shell.
  test("is reachable from the Agency area via the management link", async ({
    page,
  }) => {
    await installLaunchApi(page, { rockets: [FALCON], launches: [] });

    await page.goto(`${APP_URL}/agency`);
    await page.getByRole("link", { name: "Manage launches" }).click();

    await expect(page).toHaveURL(LAUNCHES_URL);
    await expect(
      page.getByRole("heading", { level: 1, name: "Launches" }),
    ).toBeVisible();
  });
});

/** ISO variant of a future date for seeding launch records. */
function futureDateTimeLocalIso(daysAhead = 30): string {
  return new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
}
