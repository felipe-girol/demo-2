/**
 * Pure presentation helpers for the launch catalog and detail views. They hold
 * no business rules — availability is always served by the API; these only
 * format and read the API-provided fields for display.
 */
import type { LaunchView } from '../types/launch.type'
import type { Rocket } from '../types/rocket.type'

/** A launch is presented as "sold out" WHEN the API reports zero seats. */
export function isSoldOut(launch: Pick<LaunchView, 'seatsAvailable'>): boolean {
  return launch.seatsAvailable === 0
}

/**
 * Resolve a rocketId to its display name, degrading gracefully to a labelled
 * fallback when the rocket is missing or stale.
 */
export function resolveRocketName(rocketId: string, rockets: Rocket[]): string {
  const rocket = rockets.find((r) => r.id === rocketId)
  return rocket?.name ?? `Unknown rocket (${rocketId})`
}

/** Format an ISO date for display; echoes the raw value if it is unparseable. */
export function formatLaunchDate(iso: string): string {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return iso
  return new Date(time).toLocaleString()
}

/** Format a seat price as USD currency. */
export function formatSeatPrice(price: number): string {
  return price.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}
