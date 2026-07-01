import { describe, expect, it } from 'vitest'
import type { Rocket } from '../types/rocket.type'
import { isLaunchFormValid, validateLaunchForm } from './launch-form'

const rockets: Rocket[] = [
  { id: 'r1', name: 'Falcon', range: 'orbital', capacity: 6 },
  { id: 'r2', name: 'Atlas', range: 'moon', capacity: 4 },
]

const FUTURE_DATE = '2999-01-01T10:00:00.000Z'
const PAST_DATE = '2000-01-01T10:00:00.000Z'

const validInput = {
  rocketId: 'r1',
  mission: 'Orbit One',
  date: FUTURE_DATE,
  pricePerSeat: 1000,
  minPassengers: 2,
  seatsOffered: 5,
}

describe('validateLaunchForm', () => {
  it('returns no errors for valid input', () => {
    const errors = validateLaunchForm(validInput, rockets)
    expect(errors).toEqual({})
    expect(isLaunchFormValid(errors)).toBe(true)
  })

  it('flags a missing rocket selection', () => {
    expect(validateLaunchForm({ ...validInput, rocketId: '' }, rockets).rocketId).toBeDefined()
  })

  it('flags a rocketId not in the known rockets', () => {
    const errors = validateLaunchForm({ ...validInput, rocketId: 'nope' }, rockets)
    expect(errors.rocketId).toBeDefined()
    expect(isLaunchFormValid(errors)).toBe(false)
  })

  it('flags an empty mission', () => {
    expect(validateLaunchForm({ ...validInput, mission: '  ' }, rockets).mission).toBeDefined()
  })

  it('flags a missing date', () => {
    expect(validateLaunchForm({ ...validInput, date: '' }, rockets).date).toBeDefined()
  })

  it('flags an invalid date', () => {
    expect(validateLaunchForm({ ...validInput, date: 'not-a-date' }, rockets).date).toBeDefined()
  })

  it('flags a past date', () => {
    expect(validateLaunchForm({ ...validInput, date: PAST_DATE }, rockets).date).toBeDefined()
  })

  it('flags a missing or non-positive price', () => {
    expect(validateLaunchForm({ ...validInput, pricePerSeat: null }, rockets).pricePerSeat).toBeDefined()
    expect(validateLaunchForm({ ...validInput, pricePerSeat: 0 }, rockets).pricePerSeat).toBeDefined()
    expect(validateLaunchForm({ ...validInput, pricePerSeat: -5 }, rockets).pricePerSeat).toBeDefined()
  })

  it('flags a missing or non-integer seatsOffered', () => {
    expect(validateLaunchForm({ ...validInput, seatsOffered: null }, rockets).seatsOffered).toBeDefined()
    expect(validateLaunchForm({ ...validInput, seatsOffered: 3.5 }, rockets).seatsOffered).toBeDefined()
    expect(validateLaunchForm({ ...validInput, seatsOffered: 0 }, rockets).seatsOffered).toBeDefined()
  })

  it('flags seatsOffered above the selected rocket capacity', () => {
    // Falcon capacity is 6.
    expect(validateLaunchForm({ ...validInput, seatsOffered: 7 }, rockets).seatsOffered).toBeDefined()
    // Atlas capacity is 4.
    const errors = validateLaunchForm(
      { ...validInput, rocketId: 'r2', minPassengers: 2, seatsOffered: 5 },
      rockets,
    )
    expect(errors.seatsOffered).toBeDefined()
  })

  it('accepts seatsOffered equal to the rocket capacity', () => {
    expect(
      validateLaunchForm({ ...validInput, seatsOffered: 6, minPassengers: 1 }, rockets).seatsOffered,
    ).toBeUndefined()
  })

  it('flags a missing or non-integer minPassengers', () => {
    expect(validateLaunchForm({ ...validInput, minPassengers: null }, rockets).minPassengers).toBeDefined()
    expect(validateLaunchForm({ ...validInput, minPassengers: 1.5 }, rockets).minPassengers).toBeDefined()
    expect(validateLaunchForm({ ...validInput, minPassengers: 0 }, rockets).minPassengers).toBeDefined()
  })

  it('flags minPassengers above seatsOffered', () => {
    const errors = validateLaunchForm({ ...validInput, minPassengers: 6, seatsOffered: 5 }, rockets)
    expect(errors.minPassengers).toBeDefined()
  })

  it('accepts minPassengers equal to seatsOffered', () => {
    expect(
      validateLaunchForm({ ...validInput, minPassengers: 5, seatsOffered: 5 }, rockets).minPassengers,
    ).toBeUndefined()
  })

  it('reports multiple field errors at once', () => {
    const errors = validateLaunchForm(
      {
        rocketId: '',
        mission: '',
        date: '',
        pricePerSeat: null,
        minPassengers: null,
        seatsOffered: null,
      },
      rockets,
    )
    expect(errors.rocketId).toBeDefined()
    expect(errors.mission).toBeDefined()
    expect(errors.date).toBeDefined()
    expect(errors.pricePerSeat).toBeDefined()
    expect(errors.minPassengers).toBeDefined()
    expect(errors.seatsOffered).toBeDefined()
  })
})
