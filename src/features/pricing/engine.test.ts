import { describe, expect, it } from 'vitest'
import { calculateUnitPrice } from './engine'

describe('calculateUnitPrice', () => {
  it('returns exact breakpoint price for matching quantity', () => {
    const result = calculateUnitPrice({
      quantity: 1,
      breakpoints: [
        { minQuantity: 1, unitPrice: 10 },
        { minQuantity: 10, unitPrice: 8 },
      ],
    })

    expect(result).toEqual({
      unitPrice: { amount: 10, currency: 'USD' },
      lineTotal: { amount: 10, currency: 'USD' },
    })
  })

  it('interpolates between breakpoints', () => {
    const result = calculateUnitPrice({
      quantity: 5,
      breakpoints: [
        { minQuantity: 1, unitPrice: 10 },
        { minQuantity: 10, unitPrice: 8 },
      ],
    })

    expect(result).toEqual({
      unitPrice: { amount: 9.11, currency: 'USD' },
      lineTotal: { amount: 45.55, currency: 'USD' },
    })
  })

  it('uses last breakpoint price for quantities above max', () => {
    const result = calculateUnitPrice({
      quantity: 20,
      breakpoints: [
        { minQuantity: 1, unitPrice: 10 },
        { minQuantity: 10, unitPrice: 8 },
      ],
    })

    expect(result).toEqual({
      unitPrice: { amount: 8, currency: 'USD' },
      lineTotal: { amount: 160, currency: 'USD' },
    })
  })

  it('respects manual unit price override', () => {
    const result = calculateUnitPrice({
      quantity: 10,
      breakpoints: [{ minQuantity: 1, unitPrice: 10 }],
      manualUnitPrice: 7.5,
    })

    expect(result).toEqual({
      unitPrice: { amount: 7.5, currency: 'USD' },
      lineTotal: { amount: 75, currency: 'USD' },
    })
  })

  it('returns error for empty breakpoints', () => {
    const result = calculateUnitPrice({
      quantity: 1,
      breakpoints: [],
    })

    expect(result).toEqual({
      code: 'NO_BREAKPOINTS',
      message: 'No pricing breakpoints configured',
    })
  })

  it('returns error for quantity of zero', () => {
    const result = calculateUnitPrice({
      quantity: 0,
      breakpoints: [{ minQuantity: 1, unitPrice: 10 }],
    })

    expect(result).toEqual({
      code: 'INVALID_QUANTITY',
      message: 'Quantity must be greater than zero',
    })
  })

  it('returns error for negative quantity', () => {
    const result = calculateUnitPrice({
      quantity: -5,
      breakpoints: [{ minQuantity: 1, unitPrice: 10 }],
    })

    expect(result).toEqual({
      code: 'INVALID_QUANTITY',
      message: 'Quantity must be greater than zero',
    })
  })

  it('uses step pricing when mode is step', () => {
    const result = calculateUnitPrice({
      quantity: 5,
      breakpoints: [
        { minQuantity: 1, unitPrice: 10 },
        { minQuantity: 10, unitPrice: 8 },
      ],
      mode: 'step',
    })

    expect(result).toEqual({
      unitPrice: { amount: 10, currency: 'USD' },
      lineTotal: { amount: 50, currency: 'USD' },
    })
  })

  it('uses step pricing for quantity above max breakpoint', () => {
    const result = calculateUnitPrice({
      quantity: 20,
      breakpoints: [
        { minQuantity: 1, unitPrice: 10 },
        { minQuantity: 10, unitPrice: 8 },
      ],
      mode: 'step',
    })

    expect(result).toEqual({
      unitPrice: { amount: 8, currency: 'USD' },
      lineTotal: { amount: 160, currency: 'USD' },
    })
  })

  it('uses interpolation by default when mode is not set', () => {
    const result = calculateUnitPrice({
      quantity: 5,
      breakpoints: [
        { minQuantity: 1, unitPrice: 10 },
        { minQuantity: 10, unitPrice: 8 },
      ],
    })

    expect(result).toEqual({
      unitPrice: { amount: 9.11, currency: 'USD' },
      lineTotal: { amount: 45.55, currency: 'USD' },
    })
  })

  it('supports custom currency', () => {
    const result = calculateUnitPrice({
      quantity: 1,
      breakpoints: [{ minQuantity: 1, unitPrice: 15000 }],
      currency: 'IDR',
    })

    expect(result).toEqual({
      unitPrice: { amount: 15000, currency: 'IDR' },
      lineTotal: { amount: 15000, currency: 'IDR' },
    })
  })
})
