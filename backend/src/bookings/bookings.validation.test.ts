import { describe, expect, it } from "vitest";
import { validateCreateBooking } from "./bookings.validation.js";

const VALID_BODY = {
  launchId: "launch-1",
  customerId: "customer-1",
  seats: 2,
};

describe("bookings.validation create", () => {
  it("returns no errors for a valid body", () => {
    expect(validateCreateBooking(VALID_BODY)).toEqual([]);
  });

  it("rejects a missing launchId", () => {
    expect(validateCreateBooking({ customerId: "c", seats: 1 })).toContain("launchId must be a non-empty string");
  });

  it("rejects an empty launchId", () => {
    expect(validateCreateBooking({ ...VALID_BODY, launchId: "  " })).toContain("launchId must be a non-empty string");
  });

  it("rejects a missing customerId", () => {
    expect(validateCreateBooking({ launchId: "l", seats: 1 })).toContain("customerId must be a non-empty string");
  });

  it("rejects an empty customerId", () => {
    expect(validateCreateBooking({ ...VALID_BODY, customerId: "" })).toContain(
      "customerId must be a non-empty string",
    );
  });

  it("rejects a non-integer seats", () => {
    expect(validateCreateBooking({ ...VALID_BODY, seats: 1.5 })).toContain("seats must be an integer >= 1");
  });

  it("rejects seats below one", () => {
    expect(validateCreateBooking({ ...VALID_BODY, seats: 0 })).toContain("seats must be an integer >= 1");
  });

  it("collects all errors for an empty body", () => {
    expect(validateCreateBooking({}).length).toBe(3);
  });
});
