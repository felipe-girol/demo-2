import { describe, expect, it } from 'vitest'
import type { Rocket } from '../types/rocket.type'
import {
  formatLaunchDate,
  formatSeatPrice,
  isSoldOut,
  resolveRocketName,
} from './launch-format'

describe('isSoldOut', () => {
  it('is true only when seatsAvailable is zero', () => {
    expect(isSoldOut({ seatsAvailable: 0 })).toBe(true)
    expect(isSoldOut({ seatsAvailable: 1 })).toBe(false)
    expect(isSoldOut({ seatsAvailable: 42 })).toBe(false)
  })
})

describe('resolveRocketName', () => {
  const rockets: Rocket[] = [
    { id: 'r1', name: 'Falcon 9', range: 'orbital', capacity: 7 },
    { id: 'r2', name: 'Starship', range: 'mars', capacity: 10 },
  ]

  it('resolves a known rocketId to its name', () => {
    expect(resolveRocketName('r2', rockets)).toBe('Starship')
  })

  it('degrades gracefully for an unknown rocketId', () => {
    expect(resolveRocketName('ghost', rockets)).toBe('Unknown rocket (ghost)')
  })

  it('degrades gracefully when the fleet is empty', () => {
    expect(resolveRocketName('r1', [])).toBe('Unknown rocket (r1)')
  })
})

describe('formatLaunchDate', () => {
  it('formats a valid ISO date into a localized string', () => {
    const formatted = formatLaunchDate('2999-01-02T03:04:00.000Z')
    expect(formatted).not.toBe('2999-01-02T03:04:00.000Z')
    expect(formatted.length).toBeGreaterThan(0)
  })

  it('echoes an unparseable value unchanged', () => {
    expect(formatLaunchDate('not-a-date')).toBe('not-a-date')
  })
})

describe('formatSeatPrice', () => {
  it('formats a number as USD currency', () => {
    // Locale-agnostic: grouping separator varies by host locale.
    const formatted = formatSeatPrice(2500)
    expect(formatted).toMatch(/2.?500/)
    expect(formatted).toMatch(/\$|USD/)
  })
})
