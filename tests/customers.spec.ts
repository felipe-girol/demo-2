import { test, expect } from "@playwright/test";

const API_URL = "http://localhost:3000/api/customers";

function buildCustomer() {
  return {
    email: `customer-${Date.now()}-${Math.random().toString(36).slice(2)}@astrobookings.com`,
    name: "Neil Armstrong",
    phone: "+1-555-0100",
  };
}

async function createCustomer(request: import("@playwright/test").APIRequestContext) {
  const customer = buildCustomer();
  const response = await request.post(API_URL, { data: customer });
  expect(response.status()).toBe(201);
  return { customer, created: await response.json() };
}

test.describe("Customers API - POST registration", () => {
  // AC: WHEN a valid POST is sent, THE API SHALL register the customer and return 201 with a unique id.
  test("POST valid customer returns 201 with id and echoed fields", async ({ request }) => {
    const customer = buildCustomer();
    const response = await request.post(API_URL, { data: customer });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(typeof body.id).toBe("string");
    expect(body.id.length).toBeGreaterThan(0);
    expect(body.email).toBe(customer.email);
    expect(body.name).toBe(customer.name);
    expect(body.phone).toBe(customer.phone);
  });

  // AC: Two valid registrations SHALL receive distinct unique identifiers.
  test("POST two customers returns distinct ids", async ({ request }) => {
    const first = await request.post(API_URL, { data: buildCustomer() });
    const second = await request.post(API_URL, { data: buildCustomer() });
    const firstBody = await first.json();
    const secondBody = await second.json();

    expect(firstBody.id).not.toBe(secondBody.id);
  });
});

test.describe("Customers API - Duplicate email conflict", () => {
  // AC: IF the email already exists, THEN THE API SHALL reject the request with 409 conflict.
  test("POST duplicate email returns 409 with error message", async ({ request }) => {
    const customer = buildCustomer();
    const first = await request.post(API_URL, { data: customer });
    expect(first.status()).toBe(201);

    const duplicate = await request.post(API_URL, {
      data: { ...customer, name: "Buzz Aldrin", phone: "+1-555-0200" },
    });

    expect(duplicate.status()).toBe(409);
    const body = await duplicate.json();
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });
});

test.describe("Customers API - Validation", () => {
  // AC: IF email is missing or empty, THEN THE API SHALL reject the request with 400.
  test("POST with missing email returns 400 with errors array", async ({ request }) => {
    const { email, ...withoutEmail } = buildCustomer();
    void email;
    const response = await request.post(API_URL, { data: withoutEmail });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(Array.isArray(body.errors)).toBeTruthy();
    expect(body.errors.length).toBeGreaterThan(0);
  });

  test("POST with empty/whitespace email returns 400", async ({ request }) => {
    const response = await request.post(API_URL, { data: { ...buildCustomer(), email: "   " } });
    expect(response.status()).toBe(400);
  });

  // AC: IF name is missing or empty, THEN THE API SHALL reject the request with 400.
  test("POST with missing name returns 400", async ({ request }) => {
    const { name, ...withoutName } = buildCustomer();
    void name;
    const response = await request.post(API_URL, { data: withoutName });
    expect(response.status()).toBe(400);
  });

  test("POST with empty name returns 400", async ({ request }) => {
    const response = await request.post(API_URL, { data: { ...buildCustomer(), name: "" } });
    expect(response.status()).toBe(400);
  });

  // AC: IF phone is missing or empty, THEN THE API SHALL reject the request with 400.
  test("POST with missing phone returns 400", async ({ request }) => {
    const { phone, ...withoutPhone } = buildCustomer();
    void phone;
    const response = await request.post(API_URL, { data: withoutPhone });
    expect(response.status()).toBe(400);
  });

  test("POST with empty/whitespace phone returns 400", async ({ request }) => {
    const response = await request.post(API_URL, { data: { ...buildCustomer(), phone: "   " } });
    expect(response.status()).toBe(400);
  });

  // Service layer aggregates all validation errors in a single response.
  test("POST with empty body returns 400 with all field errors", async ({ request }) => {
    const response = await request.post(API_URL, { data: {} });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(Array.isArray(body.errors)).toBeTruthy();
    expect(body.errors.length).toBeGreaterThanOrEqual(3);
  });
});

test.describe("Customers API - Retrieval", () => {
  // AC: WHEN a GET is sent to the collection, THE API SHALL return all registered customers.
  test("GET all customers returns array including a created customer", async ({ request }) => {
    const { created } = await createCustomer(request);

    const response = await request.get(API_URL);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.some((c: { id: string }) => c.id === created.id)).toBeTruthy();
  });

  // AC: WHEN a GET is sent with an existing id, THE API SHALL return that customer's details.
  test("GET customer by id returns full details", async ({ request }) => {
    const { customer, created } = await createCustomer(request);

    const response = await request.get(`${API_URL}/${created.id}`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.id).toBe(created.id);
    expect(body.email).toBe(customer.email);
    expect(body.name).toBe(customer.name);
    expect(body.phone).toBe(customer.phone);
  });

  // AC: IF a GET is sent with a non-existent id, THEN THE API SHALL respond with 404.
  test("GET non-existent customer returns 404 with error message", async ({ request }) => {
    const response = await request.get(`${API_URL}/non-existent-id`);

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });
});
