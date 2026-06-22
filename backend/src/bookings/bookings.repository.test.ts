import { describe, expect, it } from "vitest";
import type { Booking } from "../types/bookings.type.js";
import { create, findAll, findById, findByLaunch } from "./bookings.repository.js";

function buildBooking(launchId = "launch-1"): Omit<Booking, "id"> {
  return {
    launchId,
    customerId: "customer-1",
    seats: 2,
    totalPrice: 2000,
    paymentStatus: "pending",
    createdAt: "2026-06-15T00:00:00.000Z",
  };
}

describe("bookings.repository", () => {
  it("creates a booking with a generated id", () => {
    const dto = buildBooking();

    const created = create(dto);

    expect(created.id).toBeTypeOf("string");
    expect(created).toMatchObject(dto);
  });

  it("finds a booking by id", () => {
    const created = create(buildBooking());

    expect(findById(created.id)).toEqual(created);
  });

  it("returns undefined when the booking does not exist", () => {
    expect(findById("missing-id")).toBeUndefined();
  });

  it("includes created bookings in findAll", () => {
    const created = create(buildBooking());

    expect(findAll()).toContainEqual(created);
  });

  it("filters bookings by launch", () => {
    const target = create(buildBooking("launch-target"));
    create(buildBooking("launch-other"));

    const result = findByLaunch("launch-target");

    expect(result).toContainEqual(target);
    expect(result.every((booking) => booking.launchId === "launch-target")).toBe(true);
  });

  it("returns an empty array when no bookings match the launch", () => {
    expect(findByLaunch("launch-none")).toEqual([]);
  });
});
