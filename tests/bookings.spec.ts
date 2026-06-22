import { test, expect, type APIRequestContext } from "@playwright/test";

const BOOKINGS_URL = "http://localhost:3000/api/bookings";
const LAUNCHES_URL = "http://localhost:3000/api/launches";
const ROCKETS_URL = "http://localhost:3000/api/rockets";
const CUSTOMERS_URL = "http://localhost:3000/api/customers";

/** Returns an ISO date string a year in the future. */
function futureDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
}

/** Generates a value unique to this test run to avoid cross-test collisions. */
function unique(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Seeds a rocket and returns its id. */
async function createRocket(request: APIRequestContext, capacity = 10): Promise<string> {
  const response = await request.post(ROCKETS_URL, {
    data: { name: `Falcon-${unique()}`, range: "orbital", capacity },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).id as string;
}

/** Seeds a customer and returns its id. */
async function createCustomer(request: APIRequestContext): Promise<string> {
  const response = await request.post(CUSTOMERS_URL, {
    data: { email: `customer-${unique()}@astrobookings.com`, name: "Neil Armstrong", phone: "+1-555-0100" },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).id as string;
}

/** Seeds a launch and returns its id plus pricing/capacity details. */
async function createLaunch(
  request: APIRequestContext,
  overrides: { seatsOffered?: number; pricePerSeat?: number } = {},
): Promise<{ launchId: string; pricePerSeat: number; seatsOffered: number }> {
  const seatsOffered = overrides.seatsOffered ?? 8;
  const pricePerSeat = overrides.pricePerSeat ?? 250_000;
  const rocketId = await createRocket(request, 10);
  const response = await request.post(LAUNCHES_URL, {
    data: {
      rocketId,
      mission: "Mars Colonization",
      date: futureDate(),
      pricePerSeat,
      minPassengers: 1,
      seatsOffered,
    },
  });
  expect(response.status()).toBe(201);
  const body = await response.json();
  return { launchId: body.id as string, pricePerSeat, seatsOffered };
}

/** Seeds a launch and a customer, returning everything needed for a booking. */
async function seedBookingContext(
  request: APIRequestContext,
  overrides: { seatsOffered?: number; pricePerSeat?: number } = {},
) {
  const launch = await createLaunch(request, overrides);
  const customerId = await createCustomer(request);
  return { ...launch, customerId };
}

test.describe("Bookings API - POST creation", () => {
  // AC: WHEN a valid POST is sent, THE API SHALL create a booking and return it with a
  // unique id, computed totalPrice, createdAt, paymentStatus, and status 201.
  test("POST valid booking returns 201 with id, totalPrice, createdAt and paymentStatus", async ({ request }) => {
    const { launchId, customerId, pricePerSeat } = await seedBookingContext(request);

    const response = await request.post(BOOKINGS_URL, {
      data: { launchId, customerId, seats: 3 },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(typeof body.id).toBe("string");
    expect(body.id.length).toBeGreaterThan(0);
    expect(body.launchId).toBe(launchId);
    expect(body.customerId).toBe(customerId);
    expect(body.seats).toBe(3);
    expect(body.totalPrice).toBe(3 * pricePerSeat);
    expect(body.paymentStatus).toBe("pending");
    expect(typeof body.createdAt).toBe("string");
    expect(Number.isNaN(Date.parse(body.createdAt))).toBe(false);
  });

  // AC: WHEN THE API creates a booking, THE API SHALL set totalPrice to seats * pricePerSeat.
  test("POST booking computes totalPrice as seats multiplied by pricePerSeat", async ({ request }) => {
    const { launchId, customerId, pricePerSeat } = await seedBookingContext(request, { pricePerSeat: 99_999, seatsOffered: 10 });

    const response = await request.post(BOOKINGS_URL, {
      data: { launchId, customerId, seats: 5 },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.totalPrice).toBe(5 * 99_999);
  });

  // AC: Two valid bookings SHALL receive distinct unique identifiers.
  test("POST two bookings returns distinct ids", async ({ request }) => {
    const { launchId, customerId } = await seedBookingContext(request, { seatsOffered: 10 });

    const first = await request.post(BOOKINGS_URL, { data: { launchId, customerId, seats: 1 } });
    const second = await request.post(BOOKINGS_URL, { data: { launchId, customerId, seats: 1 } });

    const firstBody = await first.json();
    const secondBody = await second.json();
    expect(firstBody.id).not.toBe(secondBody.id);
  });
});

test.describe("Bookings API - Cross-entity validation", () => {
  // AC: IF launchId does not reference an existing launch, THEN respond with 404.
  test("POST with unknown launchId returns 404 with error message", async ({ request }) => {
    const customerId = await createCustomer(request);

    const response = await request.post(BOOKINGS_URL, {
      data: { launchId: "non-existent-launch-id", customerId, seats: 1 },
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
    expect(body.error).toMatch(/launch/i);
  });

  // AC: IF customerId does not reference an existing customer, THEN respond with 404.
  test("POST with unknown customerId returns 404 with error message", async ({ request }) => {
    const { launchId } = await createLaunch(request);

    const response = await request.post(BOOKINGS_URL, {
      data: { launchId, customerId: "non-existent-customer-id", seats: 1 },
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
    expect(body.error).toMatch(/customer/i);
  });
});

test.describe("Bookings API - Field validation", () => {
  // AC: IF seats is not an integer >= 1, THEN reject with 400 validation error.
  test("POST with zero seats returns 400", async ({ request }) => {
    const { launchId, customerId } = await seedBookingContext(request);

    const response = await request.post(BOOKINGS_URL, {
      data: { launchId, customerId, seats: 0 },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(Array.isArray(body.errors)).toBeTruthy();
    expect(body.errors.length).toBeGreaterThan(0);
  });

  test("POST with negative seats returns 400", async ({ request }) => {
    const { launchId, customerId } = await seedBookingContext(request);

    const response = await request.post(BOOKINGS_URL, {
      data: { launchId, customerId, seats: -2 },
    });

    expect(response.status()).toBe(400);
  });

  test("POST with non-integer seats returns 400", async ({ request }) => {
    const { launchId, customerId } = await seedBookingContext(request);

    const response = await request.post(BOOKINGS_URL, {
      data: { launchId, customerId, seats: 2.5 },
    });

    expect(response.status()).toBe(400);
  });

  // Body-shape validation runs before cross-entity checks; empty body aggregates errors.
  test("POST with empty body returns 400 with multiple field errors", async ({ request }) => {
    const response = await request.post(BOOKINGS_URL, { data: {} });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(Array.isArray(body.errors)).toBeTruthy();
    expect(body.errors.length).toBeGreaterThanOrEqual(3);
  });

  // Field-shape validation precedes existence checks: invalid seats with unknown refs still 400.
  test("POST with invalid seats is rejected with 400 before existence checks", async ({ request }) => {
    const response = await request.post(BOOKINGS_URL, {
      data: { launchId: "non-existent", customerId: "non-existent", seats: 0 },
    });
    expect(response.status()).toBe(400);
  });
});

test.describe("Bookings API - Availability constraint", () => {
  // AC: IF seats exceed the launch's remaining available seats, THEN reject with 409 conflict.
  test("POST with seats exceeding seatsOffered returns 409", async ({ request }) => {
    const { launchId, customerId } = await seedBookingContext(request, { seatsOffered: 4 });

    const response = await request.post(BOOKINGS_URL, {
      data: { launchId, customerId, seats: 5 },
    });

    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
    expect(body.error).toMatch(/availab/i);
  });

  // Boundary: seats equal to remaining availability is accepted.
  test("POST with seats equal to remaining availability returns 201", async ({ request }) => {
    const { launchId, customerId } = await seedBookingContext(request, { seatsOffered: 4 });

    const response = await request.post(BOOKINGS_URL, {
      data: { launchId, customerId, seats: 4 },
    });

    expect(response.status()).toBe(201);
  });

  // Availability is derived: an existing booking reduces remaining seats for the next one.
  test("POST exceeding remaining seats after a prior booking returns 409", async ({ request }) => {
    const { launchId, customerId } = await seedBookingContext(request, { seatsOffered: 5 });

    const first = await request.post(BOOKINGS_URL, { data: { launchId, customerId, seats: 3 } });
    expect(first.status()).toBe(201);

    // Only 2 seats remain; requesting 3 must conflict.
    const second = await request.post(BOOKINGS_URL, { data: { launchId, customerId, seats: 3 } });
    expect(second.status()).toBe(409);

    // Exactly 2 seats remain and is accepted.
    const third = await request.post(BOOKINGS_URL, { data: { launchId, customerId, seats: 2 } });
    expect(third.status()).toBe(201);
  });
});

test.describe("Bookings API - Retrieval", () => {
  // AC: WHEN a GET is sent to /api/bookings, THE API SHALL return a list of all bookings.
  test("GET all bookings returns array including a created booking", async ({ request }) => {
    const { launchId, customerId } = await seedBookingContext(request);
    const created = await request.post(BOOKINGS_URL, { data: { launchId, customerId, seats: 1 } });
    const createdBody = await created.json();

    const response = await request.get(BOOKINGS_URL);

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.some((b: { id: string }) => b.id === createdBody.id)).toBeTruthy();
  });

  // AC: WHERE a launchId query parameter is provided, THE API SHALL return only that launch's bookings.
  test("GET with launchId query returns only that launch's bookings", async ({ request }) => {
    const contextA = await seedBookingContext(request, { seatsOffered: 6 });
    const contextB = await seedBookingContext(request, { seatsOffered: 6 });

    const bookingA = await request.post(BOOKINGS_URL, {
      data: { launchId: contextA.launchId, customerId: contextA.customerId, seats: 2 },
    });
    const bookingB = await request.post(BOOKINGS_URL, {
      data: { launchId: contextB.launchId, customerId: contextB.customerId, seats: 2 },
    });
    const bookingAId = (await bookingA.json()).id;
    const bookingBId = (await bookingB.json()).id;

    const response = await request.get(`${BOOKINGS_URL}?launchId=${contextA.launchId}`);

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.every((b: { launchId: string }) => b.launchId === contextA.launchId)).toBeTruthy();
    expect(body.some((b: { id: string }) => b.id === bookingAId)).toBeTruthy();
    expect(body.some((b: { id: string }) => b.id === bookingBId)).toBeFalsy();
  });

  // AC: WHEN a GET is sent with an existing booking id, THE API SHALL return that booking.
  test("GET booking by id returns full details", async ({ request }) => {
    const { launchId, customerId } = await seedBookingContext(request);
    const created = await request.post(BOOKINGS_URL, { data: { launchId, customerId, seats: 2 } });
    const createdBody = await created.json();

    const response = await request.get(`${BOOKINGS_URL}/${createdBody.id}`);

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.id).toBe(createdBody.id);
    expect(body.launchId).toBe(launchId);
    expect(body.customerId).toBe(customerId);
    expect(body.seats).toBe(2);
  });

  // AC: IF a GET is sent with a non-existent booking id, THEN respond with 404.
  test("GET non-existent booking returns 404 with error message", async ({ request }) => {
    const response = await request.get(`${BOOKINGS_URL}/non-existent-id`);

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });
});
