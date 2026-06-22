import { describe, expect, it } from "vitest";
import * as customersRepository from "../customers/customers.repository.js";
import * as launchesRepository from "../launches/launches.repository.js";
import type { Launch } from "../types/launches.type.js";
import type { Customer } from "../types/customers.type.js";
import { createBooking, getRemainingSeats } from "./bookings.service.js";

let customerSeq = 0;

function seedLaunch(seatsOffered = 10, pricePerSeat = 1000): Launch {
  return launchesRepository.create({
    rocketId: "rocket-1",
    mission: "Lunar Gateway",
    date: "2999-01-01T00:00:00.000Z",
    pricePerSeat,
    minPassengers: 1,
    seatsOffered,
  });
}

function seedCustomer(): Customer {
  customerSeq += 1;
  return customersRepository.create({
    email: `customer-${customerSeq}@astro.test`,
    name: "Ada",
    phone: "+100000000",
  });
}

describe("bookings.service createBooking", () => {
  it("creates a booking and computes totalPrice and paymentStatus", () => {
    const launch = seedLaunch(10, 1500);
    const customer = seedCustomer();

    const result = createBooking({ launchId: launch.id, customerId: customer.id, seats: 3 });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.booking.id).toBeTypeOf("string");
      expect(result.booking.totalPrice).toBe(4500);
      expect(result.booking.paymentStatus).toBe("pending");
      expect(result.booking.createdAt).toBeTypeOf("string");
    }
  });

  it("returns not-found for an unknown launch", () => {
    const customer = seedCustomer();

    const result = createBooking({ launchId: "missing-launch", customerId: customer.id, seats: 1 });

    expect(result.status).toBe("not-found");
    if (result.status === "not-found") expect(result.message).toBe("Launch not found");
  });

  it("returns not-found for an unknown customer", () => {
    const launch = seedLaunch();

    const result = createBooking({ launchId: launch.id, customerId: "missing-customer", seats: 1 });

    expect(result.status).toBe("not-found");
    if (result.status === "not-found") expect(result.message).toBe("Customer not found");
  });

  it("returns conflict when seats exceed remaining availability", () => {
    const launch = seedLaunch(4);
    const customer = seedCustomer();

    const result = createBooking({ launchId: launch.id, customerId: customer.id, seats: 5 });

    expect(result.status).toBe("conflict");
  });

  it("accounts for existing bookings when computing availability", () => {
    const launch = seedLaunch(5);
    const customer = seedCustomer();
    createBooking({ launchId: launch.id, customerId: customer.id, seats: 3 });

    const result = createBooking({ launchId: launch.id, customerId: customer.id, seats: 3 });

    expect(result.status).toBe("conflict");
  });
});

describe("bookings.service getRemainingSeats", () => {
  it("derives remaining seats from existing bookings", () => {
    const launch = seedLaunch(8);
    const customer = seedCustomer();
    createBooking({ launchId: launch.id, customerId: customer.id, seats: 2 });

    expect(getRemainingSeats(launch)).toBe(6);
  });
});
