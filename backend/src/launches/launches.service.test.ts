import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBooking } from "../bookings/bookings.service.js";
import * as customersRepository from "../customers/customers.repository.js";
import * as rocketsRepository from "../rockets/rockets.repository.js";
import type { CreateLaunchDto } from "../types/launches.type.js";
import { createLaunch, updateLaunch, withAvailability } from "./launches.service.js";

function seedRocket(capacity: number) {
  return rocketsRepository.create({ name: "Falcon", range: "orbital", capacity });
}

function buildLaunchDto(rocketId: string, seatsOffered = 5): CreateLaunchDto {
  return {
    rocketId,
    mission: "Lunar Gateway",
    date: "2999-01-01T00:00:00.000Z",
    pricePerSeat: 1000,
    minPassengers: 2,
    seatsOffered,
  };
}

describe("launches.service createLaunch", () => {
  it("creates a launch for a valid rocket and capacity", () => {
    const rocket = seedRocket(8);

    const result = createLaunch(buildLaunchDto(rocket.id, 6));

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.launch.rocketId).toBe(rocket.id);
      expect(result.launch.id).toBeTypeOf("string");
    }
  });

  it("rejects an unknown rocketId", () => {
    const result = createLaunch(buildLaunchDto("missing-rocket"));

    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors).toContain("rocketId must reference an existing rocket");
    }
  });

  it("rejects seatsOffered exceeding rocket capacity", () => {
    const rocket = seedRocket(4);

    const result = createLaunch(buildLaunchDto(rocket.id, 6));

    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors[0]).toContain("seatsOffered must not exceed the rocket capacity");
    }
  });
});

describe("launches.service updateLaunch", () => {
  it("signals not-found for a missing launch", () => {
    const result = updateLaunch("missing-launch", { mission: "x" });

    expect(result.status).toBe("not-found");
  });

  it("updates an existing launch with valid data", () => {
    const rocket = seedRocket(8);
    const created = createLaunch(buildLaunchDto(rocket.id, 6));
    if (created.status !== "ok") throw new Error("setup failed");

    const result = updateLaunch(created.launch.id, { mission: "Mars Transit" });

    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.launch.mission).toBe("Mars Transit");
  });

  it("rejects an update that breaks the capacity rule", () => {
    const rocket = seedRocket(5);
    const created = createLaunch(buildLaunchDto(rocket.id, 5));
    if (created.status !== "ok") throw new Error("setup failed");

    const result = updateLaunch(created.launch.id, { seatsOffered: 9 });

    expect(result.status).toBe("invalid");
  });
});

describe("launches.service withAvailability", () => {
  function seedLaunch(seatsOffered: number) {
    const rocket = seedRocket(10);
    const created = createLaunch(buildLaunchDto(rocket.id, seatsOffered));
    if (created.status !== "ok") throw new Error("setup failed");
    return created.launch;
  }

  function bookSeats(launchId: string, seats: number) {
    const customer = customersRepository.create({
      email: `passenger-${crypto.randomUUID()}@astro.test`,
      name: "Passenger",
      phone: "555-0100",
    });
    const result = createBooking({ launchId, customerId: customer.id, seats });
    if (result.status !== "ok") throw new Error("booking setup failed");
  }

  it("equals seatsOffered when the launch has no bookings", () => {
    const launch = seedLaunch(6);

    const view = withAvailability(launch);

    expect(view.seatsAvailable).toBe(6);
    expect(view.seatsOffered).toBe(6);
  });

  it("subtracts booked seats from seatsOffered", () => {
    const launch = seedLaunch(6);
    bookSeats(launch.id, 2);

    expect(withAvailability(launch).seatsAvailable).toBe(4);
  });

  it("reports zero (sold out) when every seat is booked", () => {
    const launch = seedLaunch(4);
    bookSeats(launch.id, 4);

    expect(withAvailability(launch).seatsAvailable).toBe(0);
  });

  it("preserves all original launch fields", () => {
    const launch = seedLaunch(5);

    expect(withAvailability(launch)).toMatchObject({
      id: launch.id,
      rocketId: launch.rocketId,
      mission: launch.mission,
      seatsOffered: launch.seatsOffered,
    });
  });
});
