import { describe, expect, it } from "vitest";
import { validateCreateLaunch, validateUpdateLaunch } from "./launches.validation.js";

const FUTURE_DATE = "2999-01-01T00:00:00.000Z";

const VALID_BODY = {
  rocketId: "rocket-1",
  mission: "Lunar Gateway",
  date: FUTURE_DATE,
  pricePerSeat: 1000,
  minPassengers: 2,
  seatsOffered: 6,
};

describe("launches.validation create", () => {
  it("returns no errors for a valid body", () => {
    expect(validateCreateLaunch(VALID_BODY)).toEqual([]);
  });

  it("rejects an empty rocketId", () => {
    expect(validateCreateLaunch({ ...VALID_BODY, rocketId: "" })).toContain("rocketId must be a non-empty string");
  });

  it("rejects an empty mission", () => {
    expect(validateCreateLaunch({ ...VALID_BODY, mission: "  " })).toContain("mission must be a non-empty string");
  });

  it("rejects a non-positive pricePerSeat", () => {
    expect(validateCreateLaunch({ ...VALID_BODY, pricePerSeat: 0 })).toContain("pricePerSeat must be a positive number");
  });

  it("rejects a non-integer minPassengers", () => {
    expect(validateCreateLaunch({ ...VALID_BODY, minPassengers: 1.5 })).toContain("minPassengers must be an integer >= 1");
  });

  it("rejects a seatsOffered below one", () => {
    expect(validateCreateLaunch({ ...VALID_BODY, seatsOffered: 0 })).toContain("seatsOffered must be an integer >= 1");
  });

  it("rejects a past date", () => {
    expect(validateCreateLaunch({ ...VALID_BODY, date: "2000-01-01T00:00:00.000Z" })).toContain(
      "date must be a valid date in the future",
    );
  });

  it("rejects an invalid date string", () => {
    expect(validateCreateLaunch({ ...VALID_BODY, date: "not-a-date" })).toContain(
      "date must be a valid date in the future",
    );
  });

  it("rejects minPassengers greater than seatsOffered", () => {
    expect(validateCreateLaunch({ ...VALID_BODY, minPassengers: 8, seatsOffered: 6 })).toContain(
      "minPassengers must not exceed seatsOffered",
    );
  });

  it("collects all errors for an empty body", () => {
    expect(validateCreateLaunch({}).length).toBeGreaterThanOrEqual(6);
  });
});

describe("launches.validation update", () => {
  it("skips absent fields", () => {
    expect(validateUpdateLaunch({ mission: "New Mission" })).toEqual([]);
  });

  it("still validates present fields", () => {
    expect(validateUpdateLaunch({ pricePerSeat: -5 })).toContain("pricePerSeat must be a positive number");
  });

  it("enforces the passenger threshold when both fields are present", () => {
    expect(validateUpdateLaunch({ minPassengers: 5, seatsOffered: 3 })).toContain(
      "minPassengers must not exceed seatsOffered",
    );
  });
});
