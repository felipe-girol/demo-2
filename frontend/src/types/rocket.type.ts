/**
 * Frontend mirror of the backend rocket DTOs (`backend/src/types/rockets.type.ts`).
 * The API stays the single source of truth; these types only shape requests and
 * responses for the typed client and the management UI.
 */

/** Allowed rocket ranges, matching the backend validation set. */
export const ROCKET_RANGES = ['suborbital', 'orbital', 'moon', 'mars'] as const
export type RocketRange = (typeof ROCKET_RANGES)[number]

/** Inclusive capacity bounds enforced by the backend. */
export const MIN_CAPACITY = 1
export const MAX_CAPACITY = 10

export type Rocket = {
  id: string
  name: string
  range: RocketRange
  capacity: number
}

/** Payload for `POST /api/rockets`. */
export type CreateRocketDto = Pick<Rocket, 'name' | 'range' | 'capacity'>

/** Payload for `PUT /api/rockets/:id`. */
export type UpdateRocketDto = Partial<CreateRocketDto>
