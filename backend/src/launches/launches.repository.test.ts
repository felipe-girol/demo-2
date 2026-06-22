import { describe, expect, it } from "vitest";
import type { CreateLaunchDto } from "../types/launches.type.js";
import { create, findAll, findById, remove, update } from "./launches.repository.js";

function buildLaunch(): CreateLaunchDto {
  return {
    rocketId: "rocket-1",
    mission: "Lunar Gateway",
    date: "2999-01-01T00:00:00.000Z",
    pricePerSeat: 1000,
    minPassengers: 2,
    seatsOffered: 6,
  };
}

describe("launches.repository", () => {
  it("creates a launch with a generated id", () => {
    const dto = buildLaunch();

    const created = create(dto);

    expect(created.id).toBeTypeOf("string");
    expect(created).toMatchObject(dto);
  });

  it("finds a launch by id", () => {
    const created = create(buildLaunch());

    expect(findById(created.id)).toEqual(created);
  });

  it("returns undefined when the launch does not exist", () => {
    expect(findById("missing-id")).toBeUndefined();
  });

  it("includes created launches in findAll", () => {
    const created = create(buildLaunch());

    expect(findAll()).toContainEqual(created);
  });

  it("updates an existing launch", () => {
    const created = create(buildLaunch());

    const updated = update(created.id, { mission: "Mars Transit" });

    expect(updated).toMatchObject({ id: created.id, mission: "Mars Transit" });
  });

  it("returns undefined when updating a missing launch", () => {
    expect(update("missing-id", { mission: "x" })).toBeUndefined();
  });

  it("removes an existing launch and is idempotent", () => {
    const created = create(buildLaunch());

    expect(remove(created.id)).toBe(true);
    expect(remove(created.id)).toBe(false);
    expect(findById(created.id)).toBeUndefined();
  });
});
