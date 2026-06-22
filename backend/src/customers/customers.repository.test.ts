import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import type { CreateCustomerDto } from "../types/customers.type.js";
import { create, findAll, findByEmail, findById } from "./customers.repository.js";

function buildCustomer(): CreateCustomerDto {
  return {
    email: `customer-${crypto.randomUUID()}@astrobookings.com`,
    name: "Neil Armstrong",
    phone: "+1-555-0100",
  };
}

// The repository exposes no delete, so each test uses a unique email to stay isolated.
describe("customers.repository", () => {
  it("creates a customer with a generated id", () => {
    const dto = buildCustomer();

    const created = create(dto);

    expect(created.id).toBeTypeOf("string");
    expect(created).toMatchObject(dto);
  });

  it("finds a customer by id", () => {
    const created = create(buildCustomer());

    expect(findById(created.id)).toEqual(created);
  });

  it("returns undefined when the customer does not exist", () => {
    expect(findById("missing-id")).toBeUndefined();
  });

  it("finds a customer by email", () => {
    const dto = buildCustomer();
    const created = create(dto);

    expect(findByEmail(dto.email)).toEqual(created);
  });

  it("returns undefined when no customer matches the email", () => {
    expect(findByEmail(`missing-${crypto.randomUUID()}@x.com`)).toBeUndefined();
  });

  it("includes created customers in findAll", () => {
    const created = create(buildCustomer());

    expect(findAll()).toContainEqual(created);
  });
});
