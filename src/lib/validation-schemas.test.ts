import { describe, expect, it } from 'vitest'
import {
  customerFormSchema,
  orderFormSchema,
  productFormSchema,
} from './validation-schemas'

describe('productFormSchema', () => {
  it('rejects empty name', () => {
    const result = productFormSchema.safeParse({
      name: '',
      description: '',
      priority: false,
      primaryImageAssetId: null,
      basePrice: 0,
      productionDays: 1,
      minQuantity: 1,
      maxQuantity: undefined,
      negotiateAboveQuantity: undefined,
      repeatOrderUnitPrice: undefined,
      repeatOrderMinQuantity: undefined,
      maxProductionQuantity: undefined,
      pricingMode: 'interpolated',
      pricingBreakpoints: [],
      productAddons: [],
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid input', () => {
    const result = productFormSchema.safeParse({
      name: 'Custom T-Shirt',
      description: 'A nice shirt',
      priority: true,
      primaryImageAssetId: null,
      basePrice: 50000,
      productionDays: 3,
      minQuantity: 1,
      maxQuantity: 100,
      negotiateAboveQuantity: undefined,
      repeatOrderUnitPrice: undefined,
      repeatOrderMinQuantity: undefined,
      maxProductionQuantity: undefined,
      pricingMode: 'interpolated',
      pricingBreakpoints: [{ minQuantity: 1, unitPrice: 50000 }],
      productAddons: [],
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional fields as empty', () => {
    const result = productFormSchema.safeParse({
      name: 'Test Product',
      description: '',
      priority: false,
      primaryImageAssetId: null,
      basePrice: 0,
      productionDays: 1,
      minQuantity: 1,
      maxQuantity: undefined,
      negotiateAboveQuantity: undefined,
      repeatOrderUnitPrice: undefined,
      repeatOrderMinQuantity: undefined,
      maxProductionQuantity: undefined,
      pricingMode: 'step',
      pricingBreakpoints: [],
      productAddons: [],
    })
    expect(result.success).toBe(true)
  })
  it('rejects undefined basePrice with custom error', () => {
    const result = productFormSchema.safeParse({
      name: 'Test Product',
      description: '',
      priority: false,
      primaryImageAssetId: null,
      basePrice: undefined,
      productionDays: 1,
      minQuantity: 1,
      maxQuantity: undefined,
      negotiateAboveQuantity: undefined,
      repeatOrderUnitPrice: undefined,
      repeatOrderMinQuantity: undefined,
      maxProductionQuantity: undefined,
      pricingMode: 'step',
      pricingBreakpoints: [],
      productAddons: [],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const error = result.error.format()
      expect(error.basePrice?._errors[0]).toBe('Price is required')
    }
  })

  it('rejects undefined breakpoint unitPrice with custom error', () => {
    const result = productFormSchema.safeParse({
      name: 'Test Product',
      description: '',
      priority: false,
      primaryImageAssetId: null,
      basePrice: 50000,
      productionDays: 1,
      minQuantity: 1,
      maxQuantity: undefined,
      negotiateAboveQuantity: undefined,
      repeatOrderUnitPrice: undefined,
      repeatOrderMinQuantity: undefined,
      maxProductionQuantity: undefined,
      pricingMode: 'step',
      pricingBreakpoints: [
        { minQuantity: 10, unitPrice: undefined as unknown as number },
      ],
      productAddons: [],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const error = result.error.issues
      const priceError = error.find(
        (e) => e.path.join('.') === 'pricingBreakpoints.0.unitPrice',
      )
      expect(priceError?.message).toBe('Price is required')
    }
  })

  it('rejects undefined addon unitSurcharge with custom error', () => {
    const result = productFormSchema.safeParse({
      name: 'Test Product',
      description: '',
      priority: false,
      primaryImageAssetId: null,
      basePrice: 50000,
      productionDays: 1,
      minQuantity: 1,
      maxQuantity: undefined,
      negotiateAboveQuantity: undefined,
      repeatOrderUnitPrice: undefined,
      repeatOrderMinQuantity: undefined,
      maxProductionQuantity: undefined,
      pricingMode: 'step',
      pricingBreakpoints: [],
      productAddons: [
        { name: 'Gold Foil', unitSurcharge: undefined as unknown as number },
      ],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const error = result.error.issues
      const surchargeError = error.find(
        (e) => e.path.join('.') === 'productAddons.0.unitSurcharge',
      )
      expect(surchargeError?.message).toBe('Surcharge is required')
    }
  })
})

describe('customerFormSchema', () => {
  it('accepts valid customer', () => {
    const result = customerFormSchema.safeParse({
      name: 'John Doe',
      email: '',
      phone: '08123456789',
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

describe('orderFormSchema', () => {
  const validLineItem = {
    id: 'item-1',
    productId: 'product-1',
    quantity: '10',
    unitPrice: '50000',
    designName: '',
    notes: '',
    attachments: [],
    addonIds: [],
    isRepeatOrder: false,
    deadline: '',
    manualDeadline: false,
  }

  const validBase = {
    customerId: 'customer-1',
    notes: '',
    address: { areaId: '', areaName: '', streetAddress: '' },
    lineItems: [validLineItem],
  }

  it('accepts a valid order with a line item', () => {
    const result = orderFormSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it('accepts a valid order with a customer', () => {
    const result = orderFormSchema.safeParse({
      ...validBase,
      customerId: 'customer-1',
      notes: 'Please call before delivery',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an order with no line items', () => {
    const result = orderFormSchema.safeParse({ ...validBase, lineItems: [] })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.join('.') === 'lineItems',
      )
      expect(issue?.message).toBe('Add at least one product')
    }
  })

  it('accepts a line item without a product', () => {
    const result = orderFormSchema.safeParse({
      ...validBase,
      lineItems: [{ ...validLineItem, productId: '' }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts a line item with numeric quantity and unitPrice', () => {
    const result = orderFormSchema.safeParse({
      ...validBase,
      lineItems: [{ ...validLineItem, quantity: 10, unitPrice: 50000 }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects a line item with empty quantity', () => {
    const result = orderFormSchema.safeParse({
      ...validBase,
      lineItems: [{ ...validLineItem, quantity: '' }],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.join('.') === 'lineItems.0.quantity',
      )
      expect(issue?.message).toBe('Quantity is required')
    }
  })

  it('rejects a line item with non-positive quantity', () => {
    const result = orderFormSchema.safeParse({
      ...validBase,
      lineItems: [{ ...validLineItem, quantity: '0' }],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.join('.') === 'lineItems.0.quantity',
      )
      expect(issue?.message).toBe('Quantity must be greater than zero')
    }
  })

  it('rejects a line item with non-numeric quantity', () => {
    const result = orderFormSchema.safeParse({
      ...validBase,
      lineItems: [{ ...validLineItem, quantity: 'abc' }],
    })
    expect(result.success).toBe(false)
  })

  it('requires deadline when manualDeadline is true', () => {
    const result = orderFormSchema.safeParse({
      ...validBase,
      lineItems: [{ ...validLineItem, manualDeadline: true }],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.join('.') === 'lineItems.0.deadline',
      )
      expect(issue?.message).toBe('Manual deadline is required')
    }
  })

  it('accepts a line item with manualDeadline and a deadline', () => {
    const result = orderFormSchema.safeParse({
      ...validBase,
      lineItems: [
        { ...validLineItem, manualDeadline: true, deadline: '2026-12-31' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('accepts an order with empty productId line items as long as there is at least one item', () => {
    const result = orderFormSchema.safeParse({
      ...validBase,
      lineItems: [
        { ...validLineItem, id: 'empty', productId: '' },
        validLineItem,
      ],
    })
    expect(result.success).toBe(true)
  })

  it('accepts an order without a customer', () => {
    const result = orderFormSchema.safeParse({
      ...validBase,
      customerId: '',
    })
    expect(result.success).toBe(true)
  })
})
