import { type FieldValidator, collectErrors, nonEmptyString } from "../utils/validation.js";

const FIELD_VALIDATORS: Record<string, FieldValidator> = {
  email: nonEmptyString("email"),
  name: nonEmptyString("name"),
  phone: nonEmptyString("phone"),
};

export function validateCreateCustomer(body: Record<string, unknown>): string[] {
  return collectErrors(FIELD_VALIDATORS, body);
}
