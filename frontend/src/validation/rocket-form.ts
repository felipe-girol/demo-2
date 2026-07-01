import {
  MAX_CAPACITY,
  MIN_CAPACITY,
  ROCKET_RANGES,
  type RocketRange,
} from '../types/rocket.type'

/** Raw, possibly-invalid values straight from the form inputs. */
export type RocketFormInput = {
  name: string
  range: string
  capacity: number | null
}

/** Per-field validation messages; absent keys mean the field is valid. */
export type RocketFormErrors = Partial<Record<keyof RocketFormInput, string>>

function isRocketRange(value: string): value is RocketRange {
  return (ROCKET_RANGES as readonly string[]).includes(value)
}

/**
 * Pure mirror of the backend rocket rules for fast inline feedback. The server
 * stays authoritative; this only blocks obviously invalid submits.
 */
export function validateRocketForm(input: RocketFormInput): RocketFormErrors {
  const errors: RocketFormErrors = {}

  if (input.name.trim().length === 0) {
    errors.name = 'Name is required.'
  }

  if (!isRocketRange(input.range)) {
    errors.range = 'Select a valid range.'
  }

  const { capacity } = input
  if (capacity === null || Number.isNaN(capacity)) {
    errors.capacity = 'Capacity is required.'
  } else if (!Number.isInteger(capacity)) {
    errors.capacity = 'Capacity must be a whole number.'
  } else if (capacity < MIN_CAPACITY || capacity > MAX_CAPACITY) {
    errors.capacity = `Capacity must be between ${MIN_CAPACITY} and ${MAX_CAPACITY}.`
  }

  return errors
}

/** Convenience guard: true when no field errors are present. */
export function isRocketFormValid(errors: RocketFormErrors): boolean {
  return Object.keys(errors).length === 0
}
