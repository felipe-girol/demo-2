import { test, expect } from "@playwright/test";

const API_URL = "http://localhost:3000/api/rockets";

const validRocket = {
  name: "Falcon Heavy",
  range: "orbital",
  capacity: 6,
};

test.describe("Rockets API - Acceptance Criteria", () => {
  let createdId: string;

  test("POST valid rocket returns 201 with id", async ({ request }) => {
    const response = await request.post(API_URL, { data: validRocket });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe(validRocket.name);
    expect(body.range).toBe(validRocket.range);
    expect(body.capacity).toBe(validRocket.capacity);
    createdId = body.id;
  });

  test("POST with invalid range returns 400", async ({ request }) => {
    const response = await request.post(API_URL, {
      data: { name: "Bad Rocket", range: "jupiter", capacity: 3 },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.errors).toBeDefined();
  });

  test("POST with capacity outside 1-10 returns 400", async ({ request }) => {
    const response = await request.post(API_URL, {
      data: { name: "Big Rocket", range: "orbital", capacity: 99 },
    });
    expect(response.status()).toBe(400);

    const response2 = await request.post(API_URL, {
      data: { name: "Tiny Rocket", range: "orbital", capacity: 0 },
    });
    expect(response2.status()).toBe(400);
  });

  test("POST with missing required fields returns 400", async ({ request }) => {
    const response = await request.post(API_URL, {
      data: { name: "No Range" },
    });
    expect(response.status()).toBe(400);

    const response2 = await request.post(API_URL, {
      data: {},
    });
    expect(response2.status()).toBe(400);
  });

  test("GET all rockets returns list", async ({ request }) => {
    // Create a rocket first
    const created = await request.post(API_URL, { data: validRocket });
    expect(created.status()).toBe(201);

    const response = await request.get(API_URL);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
  });

  test("GET rocket by id returns details", async ({ request }) => {
    const created = await request.post(API_URL, { data: validRocket });
    const { id } = await created.json();

    const response = await request.get(`${API_URL}/${id}`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.id).toBe(id);
    expect(body.name).toBe(validRocket.name);
  });

  test("GET non-existent rocket returns 404", async ({ request }) => {
    const response = await request.get(`${API_URL}/non-existent-id`);
    expect(response.status()).toBe(404);
  });

  test("PUT updates existing rocket", async ({ request }) => {
    const created = await request.post(API_URL, { data: validRocket });
    const { id } = await created.json();

    const response = await request.put(`${API_URL}/${id}`, {
      data: { name: "Updated Falcon", capacity: 8 },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.name).toBe("Updated Falcon");
    expect(body.capacity).toBe(8);
    expect(body.range).toBe(validRocket.range);
  });

  test("DELETE removes existing rocket", async ({ request }) => {
    const created = await request.post(API_URL, { data: validRocket });
    const { id } = await created.json();

    const response = await request.delete(`${API_URL}/${id}`);
    expect(response.status()).toBe(204);

    const getResponse = await request.get(`${API_URL}/${id}`);
    expect(getResponse.status()).toBe(404);
  });
});
