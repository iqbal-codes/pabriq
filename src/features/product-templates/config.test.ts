import { describe, expect, it } from 'vitest'
import { validateProductTemplateConfiguration } from './config'

const validConfiguration = {
  itemizationMode: 'uniform',
  fields: [],
  pricing: { basePrice: 0, productionDays: 1, minQuantity: 1 },
  production: { notes: null },
  workflowStages: [],
  bom: [],
}

describe('validateProductTemplateConfiguration', () => {
  it('accepts explicit itemization and field types', () => {
    expect(
      validateProductTemplateConfiguration({
        itemizationMode: 'per_item',
        fields: [
          { key: 'name', type: 'text_per_item', label: 'Name', required: true },
        ],
        pricing: { basePrice: 0, productionDays: 1, minQuantity: 1 },
        production: { notes: null },
        workflowStages: [],
        bom: [],
      }).itemizationMode,
    ).toBe('per_item')
  })

  it('accepts select options and structured BOM data', () => {
    const configuration = validateProductTemplateConfiguration({
      ...validConfiguration,
      fields: [
        {
          key: 'color',
          type: 'select',
          label: 'Color',
          required: true,
          options: ['Black', 'White'],
        },
      ],
      bom: [
        {
          materialId: 'thread',
          basis: 'per_item_field',
          fieldKey: 'color',
          quantity: 1,
          unit: 'meter',
          wastePercent: 10,
          critical: true,
        },
      ],
    })

    expect(configuration.bom[0]?.wastePercent).toBe(10)
  })

  it('rejects unknown field types and malformed options', () => {
    expect(() =>
      validateProductTemplateConfiguration({
        itemizationMode: 'uniform',
        fields: [{ key: 'x', type: 'industry_specific' }],
      }),
    ).toThrow()

    expect(() =>
      validateProductTemplateConfiguration({
        ...validConfiguration,
        fields: [
          {
            key: 'x',
            type: 'text',
            label: 'X',
            required: false,
            options: ['a'],
          },
        ],
      }),
    ).toThrow()
  })

  it('rejects duplicate keys, invalid defaults, and formula strings', () => {
    expect(() =>
      validateProductTemplateConfiguration({
        ...validConfiguration,
        fields: [
          { key: 'x', type: 'text', label: 'X', required: false },
          { key: 'x', type: 'text', label: 'Other X', required: false },
        ],
      }),
    ).toThrow()

    expect(() =>
      validateProductTemplateConfiguration({
        ...validConfiguration,
        pricing: { basePrice: -1, productionDays: 1, minQuantity: 1 },
      }),
    ).toThrow()

    expect(() =>
      validateProductTemplateConfiguration({
        ...validConfiguration,
        pricing: {
          basePrice: 0,
          productionDays: 1,
          minQuantity: 1,
          formula: 'quantity * price',
        },
      }),
    ).toThrow()
  })
})
