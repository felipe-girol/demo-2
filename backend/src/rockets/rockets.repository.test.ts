import { beforeEach, describe, expect, it } from "vitest";
import type { CreateRocketDto } from "../types/rockets.type.js";
import { create, findAll, findById, remove, update } from "./rockets.repository.js";

const SAMPLE_ROCKET: CreateRocketDto = {
  name: "Falcon 9",
  range: "orbital",
  capacity: 7,
};

function clearRepository(): void {
  for (const rocket of findAll()) {
    remove(rocket.id);
  }
}

describe("rockets.repository", () => {
  beforeEach(() => {
    clearRepository();
  });

  it("creates a rocket with a generated id", () => {
    const created = create(SAMPLE_ROCKET);

    expect(created.id).toBeTypeOf("string");
    expect(created).toMatchObject(SAMPLE_ROCKET);
  });

  it("finds a rocket by id", () => {
    const created = create(SAMPLE_ROCKET);

    expect(findById(created.id)).toEqual(created);
  });

  it("returns undefined when the rocket does not exist", () => {
    expect(findById("missing-id")).toBeUndefined();
  });

  it("updates an existing rocket", () => {
    const created = create(SAMPLE_ROCKET);

    const updated = update(created.id, { capacity: 10 });

    expect(updated).toMatchObject({ ...SAMPLE_ROCKET, capacity: 10 });
    expect(findById(created.id)?.capacity).toBe(10);
  });

  it("returns undefined when updating a missing rocket", () => {
    expect(update("missing-id", { capacity: 5 })).toBeUndefined();
  });

  it("removes an existing rocket", () => {
    const created = create(SAMPLE_ROCKET);

    expect(remove(created.id)).toBe(true);
    expect(findById(created.id)).toBeUndefined();
  });

  it("returns false when removing a missing rocket", () => {
    expect(remove("missing-id")).toBe(false);
  });
});
