import {
  type FieldValidator,
  collectErrors,
  futureDateString,
  nonEmptyString,
  positiveInteger,
  positiveNumber,
} from "../utils/validation.js";

const FIELD_VALIDATORS: Record<string, FieldValidator> = {
  rocketId: nonEmptyString("rocketId"),
  mission: nonEmptyString("mission"),
  date: futureDateString("date"),
  pricePerSeat: positiveNumber("pricePerSeat"),
  minPassengers: positiveInteger("minPassengers"),
  seatsOffered: positiveInteger("seatsOffered"),
};

/**
 * Cross-field rule: when both values are valid integers, minPassengers must not
 * exceed seatsOffered. Returns an error message or null.
 */
function validatePassengerThreshold(body: Record<string, unknown>): string | null {
  const { minPassengers, seatsOffered } = body;
  if (typeof minPassengers !== "number" || typeof seatsOffered !== "number") return null;
  if (minPassengers > seatsOffered) return "minPassengers must not exceed seatsOffered";
  return null;
}

export function validateCreateLaunch(body: Record<string, unknown>): string[] {
  const errors = collectErrors(FIELD_VALIDATORS, body);
  const thresholdError = validatePassengerThreshold(body);
  if (thresholdError) errors.push(thresholdError);
  return errors;
}

export function validateUpdateLaunch(body: Record<string, unknown>): string[] {
  const errors = collectErrors(FIELD_VALIDATORS, body, { partial: true });
  const thresholdError = validatePassengerThreshold(body);
  if (thresholdError) errors.push(thresholdError);
  return errors;
}
