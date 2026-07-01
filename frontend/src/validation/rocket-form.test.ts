import { describe, expect, it } from 'vitest'
import { isRocketFormValid, validateRocketForm } from './rocket-form'

const validInput = { name: 'Falcon', range: 'orbital', capacity: 5 }

describe('validateRocketForm', () => {
  it('returns no errors for valid input', () => {
    const errors = validateRocketForm(validInput)
    expect(errors).toEqual({})
    expect(isRocketFormValid(errors)).toBe(true)
  })

  it('trims the name before checking emptiness', () => {
    expect(validateRocketForm({ ...validInput, name: '  ' }).name).toBeDefined()
    expect(validateRocketForm({ ...validInput, name: '  Falcon  ' }).name).toBeUndefined()
  })

  it('flags an empty name', () => {
    const errors = validateRocketForm({ ...validInput, name: '' })
    expect(errors.name).toBeDefined()
    expect(isRocketFormValid(errors)).toBe(false)
  })

  it('flags a range outside the allowed set', () => {
    expect(validateRocketForm({ ...validInput, range: '' }).range).toBeDefined()
    expect(validateRocketForm({ ...validInput, range: 'galaxy' }).range).toBeDefined()
  })

  it('accepts each allowed range', () => {
    for (const range of ['suborbital', 'orbital', 'moon', 'mars']) {
      expect(validateRocketForm({ ...validInput, range }).range).toBeUndefined()
    }
  })

  it('flags a missing capacity', () => {
    expect(validateRocketForm({ ...validInput, capacity: null }).capacity).toBeDefined()
    expect(validateRocketForm({ ...validInput, capacity: NaN }).capacity).toBeDefined()
  })

  it('flags a non-integer capacity', () => {
    expect(validateRocketForm({ ...validInput, capacity: 3.5 }).capacity).toBeDefined()
  })

  it('flags capacity below the minimum', () => {
    expect(validateRocketForm({ ...validInput, capacity: 0 }).capacity).toBeDefined()
  })

  it('flags capacity above the maximum', () => {
    expect(validateRocketForm({ ...validInput, capacity: 11 }).capacity).toBeDefined()
  })

  it('accepts the inclusive capacity bounds', () => {
    expect(validateRocketForm({ ...validInput, capacity: 1 }).capacity).toBeUndefined()
    expect(validateRocketForm({ ...validInput, capacity: 10 }).capacity).toBeUndefined()
  })

  it('reports multiple field errors at once', () => {
    const errors = validateRocketForm({ name: '', range: 'x', capacity: 0 })
    expect(errors.name).toBeDefined()
    expect(errors.range).toBeDefined()
    expect(errors.capacity).toBeDefined()
  })
})
