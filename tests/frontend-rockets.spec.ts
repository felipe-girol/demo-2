import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * E2E coverage for FR10 - Rocket management UI.
 * Spec: IA/specs/feat-rocket-management-ui.spec.md
 *
 * Runs against the Vite dev server (5173), which proxies `/api` to the backend
 * (3000). Both servers are started by playwright.config.ts. The rocket API is
 * mocked at the network boundary with a stateful handler so create/edit/delete
 * reflect in subsequent reads deterministically, independent of backend state.
 *
 * Acceptance criteria → tests:
 *  AC1 load → GET /api/rockets, show name/range/capacity ... "lists rockets..."
 *  AC2 loading state while request in progress ............. "shows the loading state..."
 *  AC3 empty state when no rockets exist ................... "shows the empty state..."
 *  AC4 valid create → POST, add to list ................... "creates a rocket..."
 *  AC5 edit submit → PUT, reflect in list ................. "edits a rocket..."
 *  AC6 confirmed delete → DELETE, remove from list ........ "deletes a rocket after confirmation"
 *  AC7 invalid input → inline feedback, no request ........ "blocks invalid input..." (+ range)
 *  AC8 API error → error state w/ retry, preserve values .. "shows the error state..." (x2)
 *  AC9 range input restricted to the allowed set .......... "restricts the range select..."
 */

const APP_URL = "http://localhost:5173";
const ROCKETS_URL = `${APP_URL}/agency/rockets`;

const ROCKETS_COLLECTION = "**/api/rockets";
const ROCKETS_ITEM = "**/api/rockets/*";

type Rocket = { id: string; name: string; range: string; capacity: number };

function json(status: number, data: unknown) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  };
}

type MockOptions = {
  initial?: Rocket[];
  /** Delay applied to GET (list) responses, in ms. */
  getDelayMs?: number;
};

/**
 * Installs a stateful in-memory mock of the rocket REST API on the page so the
 * UI's optimistic-after-success mutations can be observed end to end.
 * Returns helpers to inspect what the frontend actually sent.
 */
async function installRocketApi(page: Page, options: MockOptions = {}) {
  const store = new Map<string, Rocket>();
  for (const rocket of options.initial ?? []) store.set(rocket.id, rocket);
  let nextId = (options.initial?.length ?? 0) + 1;

  const calls: { method: string; url: string }[] = [];

  // Collection: GET (list) and POST (create).
  await page.route(ROCKETS_COLLECTION, async (route: Route) => {
    const req = route.request();
    calls.push({ method: req.method(), url: req.url() });

    if (req.method() === "GET") {
      if (options.getDelayMs) {
        await new Promise((r) => setTimeout(r, options.getDelayMs));
      }
      return route.fulfill(json(200, [...store.values()]));
    }

    if (req.method() === "POST") {
      const dto = JSON.parse(req.postData() ?? "{}") as Omit<Rocket, "id">;
      const created: Rocket = { id: `mock-${nextId++}`, ...dto };
      store.set(created.id, created);
      return route.fulfill(json(201, created));
    }

    return route.fallback();
  });

  // Item: PUT (update) and DELETE (remove).
  await page.route(ROCKETS_ITEM, async (route: Route) => {
    const req = route.request();
    calls.push({ method: req.method(), url: req.url() });
    const id = new URL(req.url()).pathname.split("/").pop() as string;

    if (req.method() === "PUT") {
      const dto = JSON.parse(req.postData() ?? "{}") as Partial<Rocket>;
      const updated: Rocket = { ...(store.get(id) as Rocket), ...dto, id };
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

function rocketRow(page: Page, name: string) {
  return page.getByRole("row").filter({ hasText: name });
}

test.describe("Rocket Management UI - Acceptance Criteria", () => {
  // AC1: on load, request GET /api/rockets and show name, range and capacity.
  test("lists rockets with name, range and capacity on load", async ({
    page,
  }) => {
    const api = await installRocketApi(page, {
      initial: [
        { id: "r1", name: "Falcon 9", range: "orbital", capacity: 7 },
        { id: "r2", name: "Starship", range: "mars", capacity: 10 },
      ],
    });

    const listRequest = page.waitForRequest(
      (req) => req.url().endsWith("/api/rockets") && req.method() === "GET",
    );
    await page.goto(ROCKETS_URL);
    await listRequest;

    await expect(
      page.getByRole("heading", { level: 1, name: "Rockets" }),
    ).toBeVisible();

    const falcon = rocketRow(page, "Falcon 9");
    await expect(falcon).toContainText("Falcon 9");
    await expect(falcon).toContainText("orbital");
    await expect(falcon).toContainText("7");

    const starship = rocketRow(page, "Starship");
    await expect(starship).toContainText("mars");
    await expect(starship).toContainText("10");

    expect(api.callsFor("GET").length).toBeGreaterThan(0);
  });

  // AC2: while the request is in progress, show the shared loading state.
  test("shows the loading state while the rockets request is in progress", async ({
    page,
  }) => {
    await installRocketApi(page, {
      initial: [{ id: "r1", name: "Vega", range: "suborbital", capacity: 3 }],
      getDelayMs: 1500,
    });

    await page.goto(ROCKETS_URL);

    await expect(page.getByText("Loading rockets…")).toBeVisible();
    await expect(rocketRow(page, "Vega")).toBeVisible({ timeout: 5000 });
  });

  // AC3: where no rockets exist, show the shared empty state.
  test("shows the empty state when there are no rockets", async ({ page }) => {
    await installRocketApi(page, { initial: [] });

    await page.goto(ROCKETS_URL);

    await expect(
      page.getByText("No rockets yet. Create your first rocket to get started."),
    ).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
  });

  // AC4: valid create → POST /api/rockets and add the created rocket to the list.
  test("creates a rocket and adds it to the list", async ({ page }) => {
    const api = await installRocketApi(page, { initial: [] });

    await page.goto(ROCKETS_URL);
    await expect(page.getByText(/No rockets yet/)).toBeVisible();

    await page.getByRole("button", { name: "New rocket" }).click();

    await page.getByLabel("Name").fill("Atlas V");
    await page.getByLabel("Range").selectOption("orbital");
    await page.getByLabel("Capacity").fill("5");

    const postRequest = page.waitForRequest(
      (req) => req.url().endsWith("/api/rockets") && req.method() === "POST",
    );
    await page.getByRole("button", { name: "Create rocket" }).click();
    const request = await postRequest;
    expect(JSON.parse(request.postData() ?? "{}")).toMatchObject({
      name: "Atlas V",
      range: "orbital",
      capacity: 5,
    });

    const row = rocketRow(page, "Atlas V");
    await expect(row).toBeVisible();
    await expect(row).toContainText("orbital");
    await expect(row).toContainText("5");
    await expect(page.getByText('Rocket "Atlas V" created.')).toBeVisible();
  });

  // AC5: edit submit → PUT /api/rockets/:id and reflect the updated values.
  test("edits a rocket and reflects the updated values in the list", async ({
    page,
  }) => {
    const api = await installRocketApi(page, {
      initial: [{ id: "r1", name: "Falcon 9", range: "orbital", capacity: 7 }],
    });

    await page.goto(ROCKETS_URL);
    await expect(rocketRow(page, "Falcon 9")).toBeVisible();

    await rocketRow(page, "Falcon 9")
      .getByRole("button", { name: /Edit/ })
      .click();

    await expect(page.getByLabel("Name")).toHaveValue("Falcon 9");

    await page.getByLabel("Name").fill("Falcon Heavy");
    await page.getByLabel("Capacity").fill("9");

    const putRequest = page.waitForRequest(
      (req) =>
        req.url().endsWith("/api/rockets/r1") && req.method() === "PUT",
    );
    await page.getByRole("button", { name: "Save changes" }).click();
    const request = await putRequest;
    expect(JSON.parse(request.postData() ?? "{}")).toMatchObject({
      name: "Falcon Heavy",
      capacity: 9,
    });

    const updated = rocketRow(page, "Falcon Heavy");
    await expect(updated).toBeVisible();
    await expect(updated).toContainText("9");
    await expect(rocketRow(page, "Falcon 9")).toHaveCount(0);
  });

  // AC6: confirmed delete → DELETE /api/rockets/:id and remove from the list.
  test("deletes a rocket after confirmation", async ({ page }) => {
    const api = await installRocketApi(page, {
      initial: [
        { id: "r1", name: "Falcon 9", range: "orbital", capacity: 7 },
        { id: "r2", name: "Starship", range: "mars", capacity: 10 },
      ],
    });

    await page.goto(ROCKETS_URL);
    await expect(rocketRow(page, "Starship")).toBeVisible();

    await rocketRow(page, "Starship")
      .getByRole("button", { name: /Delete/ })
      .click();

    // A confirmation step is shown before the request is issued.
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Delete rocket "Starship"?');
    expect(api.callsFor("DELETE").length).toBe(0);

    const deleteRequest = page.waitForRequest(
      (req) =>
        req.url().endsWith("/api/rockets/r2") && req.method() === "DELETE",
    );
    await dialog.getByRole("button", { name: "Delete" }).click();
    await deleteRequest;

    await expect(rocketRow(page, "Starship")).toHaveCount(0);
    await expect(rocketRow(page, "Falcon 9")).toBeVisible();
    await expect(page.getByText('Rocket "Starship" deleted.')).toBeVisible();
  });

  // AC7: invalid input → inline field feedback and NO request sent.
  test("blocks invalid input with inline field errors and sends no request", async ({
    page,
  }) => {
    const api = await installRocketApi(page, { initial: [] });

    await page.goto(ROCKETS_URL);
    await page.getByRole("button", { name: "New rocket" }).click();

    // Submit an empty form: name, range and capacity are all invalid.
    await page.getByRole("button", { name: "Create rocket" }).click();

    await expect(page.getByText("Name is required.")).toBeVisible();
    await expect(page.getByText("Select a valid range.")).toBeVisible();
    await expect(page.getByText("Capacity is required.")).toBeVisible();

    // Out-of-range capacity is also rejected inline.
    await page.getByLabel("Name").fill("Tiny");
    await page.getByLabel("Range").selectOption("moon");
    await page.getByLabel("Capacity").fill("99");
    await page.getByRole("button", { name: "Create rocket" }).click();
    await expect(
      page.getByText("Capacity must be between 1 and 10."),
    ).toBeVisible();

    // No POST was ever issued because client validation blocked the submit.
    expect(api.callsFor("POST").length).toBe(0);
  });

  // AC9: the range input is restricted to suborbital, orbital, moon and mars.
  test("restricts the range select to the allowed values only", async ({
    page,
  }) => {
    await installRocketApi(page, { initial: [] });

    await page.goto(ROCKETS_URL);
    await page.getByRole("button", { name: "New rocket" }).click();

    const options = await page
      .getByLabel("Range")
      .locator("option:not([disabled])")
      .allInnerTexts();

    expect(options.map((o) => o.trim())).toEqual([
      "suborbital",
      "orbital",
      "moon",
      "mars",
    ]);
  });
});

test.describe("Rocket Management UI - API errors & recovery (AC8)", () => {
  // AC8 (load): an API error surfaces the shared error state with a retry that
  // recovers when the API becomes reachable again.
  test("shows the error state with retry when the list fails, then recovers", async ({
    page,
  }) => {
    let attempt = 0;
    await page.route(ROCKETS_COLLECTION, async (route: Route) => {
      attempt += 1;
      if (attempt === 1) {
        return route.fulfill(
          json(500, { errors: ["Rocket service is unavailable"] }),
        );
      }
      return route.fulfill(
        json(200, [{ id: "r1", name: "Falcon 9", range: "orbital", capacity: 7 }]),
      );
    });

    await page.goto(ROCKETS_URL);

    const errorState = page.getByRole("alert");
    await expect(errorState).toContainText("Rocket service is unavailable");

    await page.getByRole("button", { name: "Retry" }).click();

    await expect(rocketRow(page, "Falcon 9")).toBeVisible();
  });

  // AC8 (write): a create error is surfaced while the entered form values are
  // preserved for correction.
  test("preserves the entered form values when the create request fails", async ({
    page,
  }) => {
    // List loads empty; POST is rejected with a server validation error.
    await page.route(ROCKETS_COLLECTION, async (route: Route) => {
      const req = route.request();
      if (req.method() === "POST") {
        return route.fulfill(json(400, { errors: ["name already exists"] }));
      }
      return route.fulfill(json(200, []));
    });

    await page.goto(ROCKETS_URL);
    await page.getByRole("button", { name: "New rocket" }).click();

    await page.getByLabel("Name").fill("Duplicate");
    await page.getByLabel("Range").selectOption("orbital");
    await page.getByLabel("Capacity").fill("4");
    await page.getByRole("button", { name: "Create rocket" }).click();

    // Authoritative server error is surfaced...
    await expect(page.getByText("name already exists")).toBeVisible();

    // ...and the form keeps the entered values so they can be corrected.
    await expect(page.getByLabel("Name")).toHaveValue("Duplicate");
    await expect(page.getByLabel("Range")).toHaveValue("orbital");
    await expect(page.getByLabel("Capacity")).toHaveValue("4");
  });
});

test.describe("Rocket Management UI - Navigation", () => {
  // The screen is reachable from the Agency area within the app shell.
  test("is reachable from the Agency area via the management link", async ({
    page,
  }) => {
    await installRocketApi(page, { initial: [] });

    await page.goto(`${APP_URL}/agency`);
    await page.getByRole("link", { name: "Manage rockets" }).click();

    await expect(page).toHaveURL(ROCKETS_URL);
    await expect(
      page.getByRole("heading", { level: 1, name: "Rockets" }),
    ).toBeVisible();
  });
});
