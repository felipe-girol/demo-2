import type { Rocket } from '../types/rocket.type'

/** Raw, possibly-invalid values straight from the form inputs. */
export type LaunchFormInput = {
  rocketId: string
  mission: string
  date: string
  pricePerSeat: number | null
  minPassengers: number | null
  seatsOffered: number | null
}

/** Per-field validation messages; absent keys mean the field is valid. */
export type LaunchFormErrors = Partial<Record<keyof LaunchFormInput, string>>

/**
 * Pure mirror of the backend launch rules (FR5) for fast inline feedback. The
 * server stays authoritative; this only blocks obviously invalid submits. The
 * caller passes the loaded rockets so the validator can resolve the selected
 * rocket's capacity for the seat-count rule.
 */
export function validateLaunchForm(
  input: LaunchFormInput,
  rockets: Rocket[],
): LaunchFormErrors {
  const errors: LaunchFormErrors = {}

  const rocket = rockets.find((r) => r.id === input.rocketId)
  if (input.rocketId.trim().length === 0) {
    errors.rocketId = 'Select a rocket.'
  } else if (!rocket) {
    errors.rocketId = 'Select a valid rocket.'
  }

  if (input.mission.trim().length === 0) {
    errors.mission = 'Mission is required.'
  }

  if (input.date.trim().length === 0) {
    errors.date = 'Date is required.'
  } else {
    const time = Date.parse(input.date)
    if (Number.isNaN(time)) {
      errors.date = 'Enter a valid date.'
    } else if (time <= Date.now()) {
      errors.date = 'Date must be in the future.'
    }
  }

  const { pricePerSeat } = input
  if (pricePerSeat === null || Number.isNaN(pricePerSeat)) {
    errors.pricePerSeat = 'Price per seat is required.'
  } else if (pricePerSeat <= 0) {
    errors.pricePerSeat = 'Price per seat must be greater than zero.'
  }

  const { seatsOffered } = input
  if (seatsOffered === null || Number.isNaN(seatsOffered)) {
    errors.seatsOffered = 'Seats offered is required.'
  } else if (!Number.isInteger(seatsOffered) || seatsOffered < 1) {
    errors.seatsOffered = 'Seats offered must be a whole number of at least 1.'
  } else if (rocket && seatsOffered > rocket.capacity) {
    errors.seatsOffered = `Seats offered must not exceed the rocket capacity (${rocket.capacity}).`
  }

  const { minPassengers } = input
  if (minPassengers === null || Number.isNaN(minPassengers)) {
    errors.minPassengers = 'Minimum passengers is required.'
  } else if (!Number.isInteger(minPassengers) || minPassengers < 1) {
    errors.minPassengers = 'Minimum passengers must be a whole number of at least 1.'
  } else if (
    seatsOffered !== null &&
    !Number.isNaN(seatsOffered) &&
    Number.isInteger(seatsOffered) &&
    minPassengers > seatsOffered
  ) {
    errors.minPassengers = 'Minimum passengers must not exceed seats offered.'
  }

  return errors
}

/** Convenience guard: true when no field errors are present. */
export function isLaunchFormValid(errors: LaunchFormErrors): boolean {
  return Object.keys(errors).length === 0
}
