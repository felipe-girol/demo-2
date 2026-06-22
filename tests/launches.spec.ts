import { test, expect, type APIRequestContext } from "@playwright/test";

const LAUNCHES_URL = "http://localhost:3000/api/launches";
const ROCKETS_URL = "http://localhost:3000/api/rockets";

/** Returns an ISO date string a year in the future. */
function futureDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
}

/** Seeds a rocket and returns its id and capacity for launch tests. */
async function createRocket(request: APIRequestContext, capacity = 6) {
  const response = await request.post(ROCKETS_URL, {
    data: { name: `Falcon-${Date.now()}-${Math.random().toString(36).slice(2)}`, range: "orbital", capacity },
  });
  expect(response.status()).toBe(201);
  const body = await response.json();
  return { id: body.id as string, capacity: body.capacity as number };
}

/** Builds a valid launch payload bound to the given rocket. */
function buildLaunch(rocketId: string, overrides: Record<string, unknown> = {}) {
  return {
    rocketId,
    mission: "Mars Colonization",
    date: futureDate(),
    pricePerSeat: 250_000,
    minPassengers: 2,
    seatsOffered: 4,
    ...overrides,
  };
}

/** Seeds a rocket and a launch, returning both for retrieval/mutation tests. */
async function createLaunch(request: APIRequestContext) {
  const rocket = await createRocket(request);
  const payload = buildLaunch(rocket.id);
  const response = await request.post(LAUNCHES_URL, { data: payload });
  expect(response.status()).toBe(201);
  return { rocket, payload, created: await response.json() };
}

test.describe("Launches API - POST scheduling", () => {
  // AC: WHEN a valid POST is sent, THE API SHALL create a launch and return it with a unique id and 201.
  test("POST valid launch returns 201 with id and echoed fields", async ({ request }) => {
    const rocket = await createRocket(request);
    const payload = buildLaunch(rocket.id);

    const response = await request.post(LAUNCHES_URL, { data: payload });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(typeof body.id).toBe("string");
    expect(body.id.length).toBeGreaterThan(0);
    expect(body.rocketId).toBe(payload.rocketId);
    expect(body.mission).toBe(payload.mission);
    expect(body.date).toBe(payload.date);
    expect(body.pricePerSeat).toBe(payload.pricePerSeat);
    expect(body.minPassengers).toBe(payload.minPassengers);
    expect(body.seatsOffered).toBe(payload.seatsOffered);
  });

  // AC: Two valid launches SHALL receive distinct unique identifiers.
  test("POST two launches returns distinct ids", async ({ request }) => {
    const rocket = await createRocket(request);
    const first = await request.post(LAUNCHES_URL, { data: buildLaunch(rocket.id) });
    const second = await request.post(LAUNCHES_URL, { data: buildLaunch(rocket.id) });

    const firstBody = await first.json();
    const secondBody = await second.json();
    expect(firstBody.id).not.toBe(secondBody.id);
  });

  // Boundary: seatsOffered equal to rocket capacity is accepted.
  test("POST with seatsOffered equal to rocket capacity returns 201", async ({ request }) => {
    const rocket = await createRocket(request, 5);
    const response = await request.post(LAUNCHES_URL, {
      data: buildLaunch(rocket.id, { seatsOffered: 5, minPassengers: 5 }),
    });
    expect(response.status()).toBe(201);
  });
});

test.describe("Launches API - Cross-entity validation", () => {
  // AC: IF rocketId does not reference an existing rocket, THEN reject with 400.
  test("POST with unknown rocketId returns 400 with error message", async ({ request }) => {
    const response = await request.post(LAUNCHES_URL, {
      data: buildLaunch("non-existent-rocket-id"),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(Array.isArray(body.errors)).toBeTruthy();
    expect(body.errors.length).toBeGreaterThan(0);
  });

  // AC: IF seatsOffered exceeds the rocket capacity, THEN reject with 400 indicating the capacity constraint.
  test("POST with seatsOffered exceeding rocket capacity returns 400", async ({ request }) => {
    const rocket = await createRocket(request, 4);
    const response = await request.post(LAUNCHES_URL, {
      data: buildLaunch(rocket.id, { seatsOffered: 10, minPassengers: 1 }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(Array.isArray(body.errors)).toBeTruthy();
    expect(body.errors.some((e: string) => /capacity/i.test(e))).toBeTruthy();
  });
});

test.describe("Launches API - Field validation", () => {
  // AC: IF minPassengers > seatsOffered, THEN reject with 400.
  test("POST with minPassengers greater than seatsOffered returns 400", async ({ request }) => {
    const rocket = await createRocket(request);
    const response = await request.post(LAUNCHES_URL, {
      data: buildLaunch(rocket.id, { minPassengers: 5, seatsOffered: 3 }),
    });
    expect(response.status()).toBe(400);
  });

  // AC: IF date is not in the future, THEN reject with 400.
  test("POST with a past date returns 400", async ({ request }) => {
    const rocket = await createRocket(request);
    const response = await request.post(LAUNCHES_URL, {
      data: buildLaunch(rocket.id, { date: "2000-01-01T00:00:00.000Z" }),
    });
    expect(response.status()).toBe(400);
  });

  // AC: IF mission is empty, THEN reject with 400.
  test("POST with an empty mission returns 400", async ({ request }) => {
    const rocket = await createRocket(request);
    const response = await request.post(LAUNCHES_URL, {
      data: buildLaunch(rocket.id, { mission: "   " }),
    });
    expect(response.status()).toBe(400);
  });

  // AC: IF pricePerSeat is not positive, THEN reject with 400.
  test("POST with a non-positive pricePerSeat returns 400", async ({ request }) => {
    const rocket = await createRocket(request);
    const response = await request.post(LAUNCHES_URL, {
      data: buildLaunch(rocket.id, { pricePerSeat: 0 }),
    });
    expect(response.status()).toBe(400);

    const negative = await request.post(LAUNCHES_URL, {
      data: buildLaunch(rocket.id, { pricePerSeat: -100 }),
    });
    expect(negative.status()).toBe(400);
  });

  // Field-shape: non-integer seat counts are rejected.
  test("POST with non-integer seatsOffered returns 400", async ({ request }) => {
    const rocket = await createRocket(request);
    const response = await request.post(LAUNCHES_URL, {
      data: buildLaunch(rocket.id, { seatsOffered: 2.5 }),
    });
    expect(response.status()).toBe(400);
  });

  // Body-shape validation runs before cross-entity checks; empty body aggregates errors.
  test("POST with empty body returns 400 with multiple field errors", async ({ request }) => {
    const response = await request.post(LAUNCHES_URL, { data: {} });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(Array.isArray(body.errors)).toBeTruthy();
    expect(body.errors.length).toBeGreaterThanOrEqual(3);
  });
});

test.describe("Launches API - Retrieval", () => {
  // AC: WHEN a GET is sent to the collection, THE API SHALL return all registered launches.
  test("GET all launches returns array including a created launch", async ({ request }) => {
    const { created } = await createLaunch(request);

    const response = await request.get(LAUNCHES_URL);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.some((l: { id: string }) => l.id === created.id)).toBeTruthy();
  });

  // AC: WHEN a GET is sent with an existing id, THE API SHALL return that launch's details.
  test("GET launch by id returns full details", async ({ request }) => {
    const { payload, created } = await createLaunch(request);

    const response = await request.get(`${LAUNCHES_URL}/${created.id}`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.id).toBe(created.id);
    expect(body.rocketId).toBe(payload.rocketId);
    expect(body.mission).toBe(payload.mission);
    expect(body.seatsOffered).toBe(payload.seatsOffered);
  });

  // AC: IF a GET is sent with a non-existent id, THEN respond with 404.
  test("GET non-existent launch returns 404 with error message", async ({ request }) => {
    const response = await request.get(`${LAUNCHES_URL}/non-existent-id`);

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });
});

test.describe("Launches API - Update", () => {
  // AC: WHEN a PUT with valid data is sent for an existing launch, THE API SHALL update and return it.
  test("PUT updates an existing launch and returns 200", async ({ request }) => {
    const { created } = await createLaunch(request);

    const response = await request.put(`${LAUNCHES_URL}/${created.id}`, {
      data: { mission: "Lunar Gateway", pricePerSeat: 500_000 },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(created.id);
    expect(body.mission).toBe("Lunar Gateway");
    expect(body.pricePerSeat).toBe(500_000);
  });

  // AC: PUT applies the same validation rules (capacity constraint enforced on update).
  test("PUT with seatsOffered exceeding rocket capacity returns 400", async ({ request }) => {
    const { created, rocket } = await createLaunch(request);

    const response = await request.put(`${LAUNCHES_URL}/${created.id}`, {
      data: { seatsOffered: rocket.capacity + 5 },
    });
    expect(response.status()).toBe(400);
  });

  // AC: PUT applies the same field validation rules (future date).
  test("PUT with a past date returns 400", async ({ request }) => {
    const { created } = await createLaunch(request);

    const response = await request.put(`${LAUNCHES_URL}/${created.id}`, {
      data: { date: "2000-01-01T00:00:00.000Z" },
    });
    expect(response.status()).toBe(400);
  });

  // AC: IF a PUT is sent with a non-existent id, THEN respond with 404.
  test("PUT on non-existent launch returns 404", async ({ request }) => {
    const response = await request.put(`${LAUNCHES_URL}/non-existent-id`, {
      data: { mission: "Ghost Mission" },
    });
    expect(response.status()).toBe(404);
  });
});

test.describe("Launches API - Deletion", () => {
  // AC: WHEN a DELETE is sent with an existing id, THE API SHALL remove the launch and respond with 204.
  test("DELETE removes an existing launch and returns 204", async ({ request }) => {
    const { created } = await createLaunch(request);

    const response = await request.delete(`${LAUNCHES_URL}/${created.id}`);
    expect(response.status()).toBe(204);

    const getResponse = await request.get(`${LAUNCHES_URL}/${created.id}`);
    expect(getResponse.status()).toBe(404);
  });

  // AC: IF a DELETE is sent with a non-existent id, THEN respond with 404.
  test("DELETE on non-existent launch returns 404", async ({ request }) => {
    const response = await request.delete(`${LAUNCHES_URL}/non-existent-id`);
    expect(response.status()).toBe(404);
  });
});
