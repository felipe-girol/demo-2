import { describe, expect, it } from "vitest";
import { validateCreateCustomer } from "./customers.validation.js";

const VALID_BODY = {
  email: "neil@astrobookings.com",
  name: "Neil Armstrong",
  phone: "+1-555-0100",
};

describe("customers.validation", () => {
  it("returns no errors for a valid body", () => {
    expect(validateCreateCustomer(VALID_BODY)).toEqual([]);
  });

  it("rejects a missing email", () => {
    const { email, ...rest } = VALID_BODY;
    void email;

    expect(validateCreateCustomer(rest)).toContain("email must be a non-empty string");
  });

  it("rejects an empty email", () => {
    expect(validateCreateCustomer({ ...VALID_BODY, email: "   " })).toContain("email must be a non-empty string");
  });

  it("rejects a missing name", () => {
    const { name, ...rest } = VALID_BODY;
    void name;

    expect(validateCreateCustomer(rest)).toContain("name must be a non-empty string");
  });

  it("rejects an empty phone", () => {
    expect(validateCreateCustomer({ ...VALID_BODY, phone: "" })).toContain("phone must be a non-empty string");
  });

  it("rejects non-string values", () => {
    const errors = validateCreateCustomer({ email: 1, name: true, phone: null });

    expect(errors).toHaveLength(3);
  });
});
