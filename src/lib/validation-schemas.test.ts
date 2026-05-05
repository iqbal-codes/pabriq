import { describe, expect, it } from 'vitest'
import { customerFormSchema, productFormSchema } from './validation-schemas'

describe('productFormSchema', () => {
  it('rejects empty name', () => {
    const result = productFormSchema.safeParse({
      name: '',
      description: '',
      productionNotes: '',
      basePrice: 0,
      productionDays: 1,
      minQuantity: 1,
      maxQuantity: null,
      pricingMode: 'interpolated',
      pricingBreakpoints: [],
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid input', () => {
    const result = productFormSchema.safeParse({
      name: 'Custom T-Shirt',
      description: 'A nice shirt',
      productionNotes: '',
      basePrice: 50000,
      productionDays: 3,
      minQuantity: 1,
      maxQuantity: 100,
      pricingMode: 'interpolated',
      pricingBreakpoints: [{ minQuantity: 1, unitPrice: 50000 }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional fields as empty', () => {
    const result = productFormSchema.safeParse({
      name: 'Test Product',
      description: '',
      productionNotes: '',
      basePrice: 0,
      productionDays: 1,
      minQuantity: 1,
      maxQuantity: undefined,
      pricingMode: 'step',
      pricingBreakpoints: [],
    })
    expect(result.success).toBe(true)
  })
})

describe('customerFormSchema', () => {
  it('accepts valid customer', () => {
    const result = customerFormSchema.safeParse({
      name: 'John Doe',
      email: '',
      phone: '',
      notes: '',
      active: true,
      isWni: true,
      photoAssetId: null,
      address: {
        areaId: '',
        areaName: '',
        streetAddress: '',
      },
    })
    expect(result.success).toBe(true)
  })
})
