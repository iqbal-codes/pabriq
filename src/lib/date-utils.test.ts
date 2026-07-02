import { describe, expect, it } from 'vitest'
import { addWorkingDays } from './date-utils'

describe('addWorkingDays', () => {
  it('starts from the next day (H+1)', () => {
    // Monday + 1 working day = Tuesday
    const monday = new Date('2024-01-01')
    const result = addWorkingDays(monday, 1)
    expect(result.getDate()).toBe(2) // Tuesday
  })

  it('skips Sunday', () => {
    // Saturday + 1 working day = Monday (skips Sunday)
    const saturday = new Date('2024-01-06')
    const result = addWorkingDays(saturday, 1)
    expect(result.getDay()).toBe(1) // Monday
    expect(result.getDate()).toBe(8)
  })

  it('handles zero working days', () => {
    const date = new Date('2024-01-01')
    const result = addWorkingDays(date, 0)
    expect(result.getTime()).toBe(date.getTime())
  })

  it('adds multiple working days across weekends', () => {
    // Thursday + 3 working days:
    // Start from Fri Jan 5, count: Fri(1), Sat(2), skip Sun, Mon(3) => Jan 8 Mon
    const thursday = new Date('2024-01-04')
    const result = addWorkingDays(thursday, 3)
    expect(result.getDate()).toBe(8) // Monday
    expect(result.getDay()).toBe(1) // Monday
  })

  it('handles week-long spans', () => {
    // Monday + 5 working days:
    // Start from Tue Jan 2, count: Tue(1), Wed(2), Thu(3), Fri(4), Sat(5) => Jan 6 Sat
    const monday = new Date('2024-01-01')
    const result = addWorkingDays(monday, 5)
    expect(result.getDate()).toBe(6) // Saturday
    expect(result.getDay()).toBe(6) // Saturday
  })
})
