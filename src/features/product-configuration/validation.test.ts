import { describe, expect, it } from 'vitest'
import type { ProductFieldType } from '#/db/schema'
import type { ProductConstraint, ProductField } from './model'
import { resolveDisplayValues, roundAmount, validateConstraints } from './model'

const orgId = '00000000-0000-0000-0000-000000000001'
const productId1 = '00000000-0000-0000-0000-000000000011'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeField(
  key: string,
  type: ProductFieldType,
  opts: {
    required?: boolean
    options?: Array<{ value: string; label: string }>
    validationRules?: Record<string, unknown>
    matrix?: {
      sizes: string[]
      colors: Array<{ name: string; hex?: string }>
    } | null
    unit?: string
  } = {},
): ProductField {
  return {
    id: `field-${key}`,
    orgId,
    productId: productId1,
    fieldType: type,
    fieldKey: key,
    label: key.toUpperCase(),
    unit: opts.unit ?? null,
    required: opts.required ?? false,
    options: opts.options ?? [],
    validationRules: opts.validationRules ?? {},
    matrix: opts.matrix ?? null,
    sortOrder: 1,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function makeConstraint(
  type: ProductConstraint['constraintType'],
  rule: Record<string, unknown>,
  errorMessage: string,
): ProductConstraint {
  return {
    id: `c-${type}`,
    orgId,
    productId: productId1,
    constraintType: type,
    name: `Test ${type}`,
    rule,
    errorMessage,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// ─── Rounding ────────────────────────────────────────────────────────────────

describe('roundAmount', () => {
  it('rounds half_up by default', () => {
    expect(roundAmount(1.445, 2)).toBe(1.45)
    expect(roundAmount(1.444, 2)).toBe(1.44)
    expect(roundAmount(-1.445, 2)).toBe(-1.45)
  })

  it('rounds ceil', () => {
    expect(roundAmount(1.1, 0, 'ceil')).toBe(2)
    expect(roundAmount(-1.1, 0, 'ceil')).toBe(-1)
  })

  it('rounds floor', () => {
    expect(roundAmount(1.9, 0, 'floor')).toBe(1)
    expect(roundAmount(-1.9, 0, 'floor')).toBe(-2)
  })

  it('rounds bankers', () => {
    // 0.5 rounds to even (0)
    expect(roundAmount(0.5, 0, 'bankers')).toBe(0)
    // 1.5 rounds to even (2)
    expect(roundAmount(1.5, 0, 'bankers')).toBe(2)
    // 2.5 rounds to even (2)
    expect(roundAmount(2.5, 0, 'bankers')).toBe(2)
  })
})

// ─── Constraint Validation Engine ────────────────────────────────────────────

describe('constraint validation engine', () => {
  describe('required_combo', () => {
    it('passes when no fields provided (combo not triggered)', () => {
      const fields = [
        makeField('width', 'number_with_unit'),
        makeField('height', 'number_with_unit'),
      ]
      const constraints = [
        makeConstraint(
          'required_combo',
          { fields: ['width', 'height'] },
          'Must provide both',
        ),
      ]
      expect(validateConstraints({}, fields, constraints)).toEqual([])
    })

    it('passes when all fields provided', () => {
      const fields = [
        makeField('width', 'number_with_unit'),
        makeField('height', 'number_with_unit'),
      ]
      const constraints = [
        makeConstraint(
          'required_combo',
          { fields: ['width', 'height'] },
          'Must provide both',
        ),
      ]
      expect(
        validateConstraints({ width: 10, height: 20 }, fields, constraints),
      ).toEqual([])
    })

    it('fails when only some fields provided', () => {
      const fields = [
        makeField('width', 'number_with_unit'),
        makeField('height', 'number_with_unit'),
      ]
      const constraints = [
        makeConstraint(
          'required_combo',
          { fields: ['width', 'height'] },
          'Must provide both',
        ),
      ]
      const errors = validateConstraints({ width: 10 }, fields, constraints)
      expect(errors.length).toBe(1)
      expect(errors[0].code).toBe('required_combo')
      expect(errors[0].fieldKey).toBe('height')
    })
  })

  describe('incompatible_values', () => {
    it('passes for compatible values', () => {
      const fields = [
        makeField('paper', 'select', {
          options: [{ value: 'recycled', label: 'Recycled' }],
        }),
        makeField('coating', 'select', {
          options: [
            { value: 'matte', label: 'Matte' },
            { value: 'high_gloss', label: 'High Gloss' },
          ],
        }),
      ]
      const constraints = [
        makeConstraint(
          'incompatible_values',
          {
            pairs: [
              {
                fieldA: 'paper',
                valueA: 'recycled',
                fieldB: 'coating',
                valueB: 'high_gloss',
              },
            ],
          },
          'Recycled paper cannot have high gloss',
        ),
      ]
      expect(
        validateConstraints(
          { paper: 'recycled', coating: 'matte' },
          fields,
          constraints,
        ),
      ).toEqual([])
    })

    it('fails for incompatible values', () => {
      const fields = [
        makeField('paper', 'select', {
          options: [{ value: 'recycled', label: 'Recycled' }],
        }),
        makeField('coating', 'select', {
          options: [
            { value: 'matte', label: 'Matte' },
            { value: 'high_gloss', label: 'High Gloss' },
          ],
        }),
      ]
      const constraints = [
        makeConstraint(
          'incompatible_values',
          {
            pairs: [
              {
                fieldA: 'paper',
                valueA: 'recycled',
                fieldB: 'coating',
                valueB: 'high_gloss',
              },
            ],
          },
          'Recycled paper cannot have high gloss',
        ),
      ]
      const errors = validateConstraints(
        { paper: 'recycled', coating: 'high_gloss' },
        fields,
        constraints,
      )
      expect(errors.length).toBe(1)
      expect(errors[0].code).toBe('incompatible_values')
      expect(errors[0].fieldKey).toBe('coating')
    })
  })

  describe('numeric_range', () => {
    it('passes for value within range', () => {
      const fields = [makeField('length', 'number_with_unit')]
      const constraints = [
        makeConstraint(
          'numeric_range',
          { field: 'length', min: 10, max: 100 },
          'Out of range',
        ),
      ]
      expect(validateConstraints({ length: 50 }, fields, constraints)).toEqual(
        [],
      )
    })

    it('fails for value below min', () => {
      const fields = [makeField('length', 'number_with_unit')]
      const constraints = [
        makeConstraint(
          'numeric_range',
          { field: 'length', min: 10, max: 100 },
          'Out of range',
        ),
      ]
      const errors = validateConstraints({ length: 5 }, fields, constraints)
      expect(errors.length).toBe(1)
      expect(errors[0].code).toBe('numeric_range_min')
    })

    it('fails for value above max', () => {
      const fields = [makeField('length', 'number_with_unit')]
      const constraints = [
        makeConstraint(
          'numeric_range',
          { field: 'length', min: 10, max: 100 },
          'Out of range',
        ),
      ]
      const errors = validateConstraints({ length: 150 }, fields, constraints)
      expect(errors.length).toBe(1)
      expect(errors[0].code).toBe('numeric_range_max')
    })

    it('skips when value is null/empty', () => {
      const fields = [makeField('length', 'number_with_unit')]
      const constraints = [
        makeConstraint(
          'numeric_range',
          { field: 'length', min: 10, max: 100 },
          'Out of range',
        ),
      ]
      expect(validateConstraints({}, fields, constraints)).toEqual([])
    })
  })

  describe('dimensional_relationship', () => {
    it('validates lt relationship', () => {
      const fields = [
        makeField('w', 'number_with_unit'),
        makeField('h', 'number_with_unit'),
      ]
      const constraints = [
        makeConstraint(
          'dimensional_relationship',
          { fieldA: 'w', fieldB: 'h', relationship: 'lt' },
          'Failed',
        ),
      ]
      expect(
        validateConstraints({ w: 10, h: 20 }, fields, constraints),
      ).toEqual([])
      expect(
        validateConstraints({ w: 20, h: 10 }, fields, constraints).length,
      ).toBe(1)
    })

    it('validates lte relationship', () => {
      const fields = [
        makeField('w', 'number_with_unit'),
        makeField('h', 'number_with_unit'),
      ]
      const constraints = [
        makeConstraint(
          'dimensional_relationship',
          { fieldA: 'w', fieldB: 'h', relationship: 'lte' },
          'Failed',
        ),
      ]
      expect(
        validateConstraints({ w: 20, h: 20 }, fields, constraints),
      ).toEqual([])
      expect(
        validateConstraints({ w: 25, h: 20 }, fields, constraints).length,
      ).toBe(1)
    })

    it('validates gt relationship', () => {
      const fields = [
        makeField('w', 'number_with_unit'),
        makeField('h', 'number_with_unit'),
      ]
      const constraints = [
        makeConstraint(
          'dimensional_relationship',
          { fieldA: 'w', fieldB: 'h', relationship: 'gt' },
          'Failed',
        ),
      ]
      expect(
        validateConstraints({ w: 30, h: 20 }, fields, constraints),
      ).toEqual([])
      expect(
        validateConstraints({ w: 10, h: 20 }, fields, constraints).length,
      ).toBe(1)
    })

    it('validates gte relationship', () => {
      const fields = [
        makeField('w', 'number_with_unit'),
        makeField('h', 'number_with_unit'),
      ]
      const constraints = [
        makeConstraint(
          'dimensional_relationship',
          { fieldA: 'w', fieldB: 'h', relationship: 'gte' },
          'Failed',
        ),
      ]
      expect(
        validateConstraints({ w: 20, h: 20 }, fields, constraints),
      ).toEqual([])
      expect(
        validateConstraints({ w: 15, h: 20 }, fields, constraints).length,
      ).toBe(1)
    })

    it('validates eq relationship', () => {
      const fields = [
        makeField('w', 'number_with_unit'),
        makeField('h', 'number_with_unit'),
      ]
      const constraints = [
        makeConstraint(
          'dimensional_relationship',
          { fieldA: 'w', fieldB: 'h', relationship: 'eq' },
          'Failed',
        ),
      ]
      expect(
        validateConstraints({ w: 20, h: 20 }, fields, constraints),
      ).toEqual([])
      expect(
        validateConstraints({ w: 20, h: 25 }, fields, constraints).length,
      ).toBe(1)
    })

    it('applies multiplier', () => {
      const fields = [
        makeField('w', 'number_with_unit'),
        makeField('h', 'number_with_unit'),
      ]
      const constraints = [
        makeConstraint(
          'dimensional_relationship',
          { fieldA: 'w', fieldB: 'h', relationship: 'lt', multiplier: 2 },
          'Failed',
        ),
      ]
      expect(
        validateConstraints({ w: 10, h: 25 }, fields, constraints),
      ).toEqual([]) // 10*2=20 < 25
      expect(
        validateConstraints({ w: 15, h: 25 }, fields, constraints).length,
      ).toBe(1) // 15*2=30 not < 25
    })
  })

  describe('matrix_rule', () => {
    it('passes for valid size/color combinations', () => {
      const fields = [
        makeField('variants', 'size_color_matrix', {
          matrix: {
            sizes: ['S', 'M', 'L'],
            colors: [{ name: 'Red' }, { name: 'Blue' }],
          },
        }),
      ]
      const constraints = [
        makeConstraint(
          'matrix_rule',
          {
            field: 'variants',
            validCombinations: [
              { size: 'S', color: 'Red' },
              { size: 'M', color: 'Blue' },
            ],
          },
          'Invalid combo',
        ),
      ]
      expect(
        validateConstraints(
          { variants: [{ size: 'S', color: 'Red' }] },
          fields,
          constraints,
        ),
      ).toEqual([])
    })

    it('fails for invalid size', () => {
      const fields = [
        makeField('variants', 'size_color_matrix', {
          matrix: { sizes: ['S', 'M', 'L'], colors: [{ name: 'Red' }] },
        }),
      ]
      const constraints = [
        makeConstraint('matrix_rule', { field: 'variants' }, 'Invalid'),
      ]
      const errors = validateConstraints(
        { variants: [{ size: 'XL', color: 'Red' }] },
        fields,
        constraints,
      )
      expect(errors.some((e) => e.code === 'matrix_invalid_size')).toBe(true)
    })

    it('fails for invalid color', () => {
      const fields = [
        makeField('variants', 'size_color_matrix', {
          matrix: { sizes: ['S'], colors: [{ name: 'Red' }] },
        }),
      ]
      const constraints = [
        makeConstraint('matrix_rule', { field: 'variants' }, 'Invalid'),
      ]
      const errors = validateConstraints(
        { variants: [{ size: 'S', color: 'Green' }] },
        fields,
        constraints,
      )
      expect(errors.some((e) => e.code === 'matrix_invalid_color')).toBe(true)
    })

    it('fails for invalid combination when validCombinations specified', () => {
      const fields = [
        makeField('variants', 'size_color_matrix', {
          matrix: {
            sizes: ['S', 'M'],
            colors: [{ name: 'Red' }, { name: 'Blue' }],
          },
        }),
      ]
      const constraints = [
        makeConstraint(
          'matrix_rule',
          {
            field: 'variants',
            validCombinations: [{ size: 'S', color: 'Red' }],
          },
          'Invalid combo',
        ),
      ]
      const errors = validateConstraints(
        { variants: [{ size: 'S', color: 'Blue' }] },
        fields,
        constraints,
      )
      expect(errors.some((e) => e.code === 'matrix_invalid_combo')).toBe(true)
    })
  })

  describe('per-field type validation', () => {
    it('validates required fields', () => {
      const fields = [
        makeField('sel', 'select', {
          required: true,
          options: [{ value: 'a', label: 'A' }],
        }),
      ]
      const errors = validateConstraints({}, fields, [])
      expect(
        errors.some((e) => e.fieldKey === 'sel' && e.code === 'required'),
      ).toBe(true)
    })

    it('validates select options', () => {
      const fields = [
        makeField('sel', 'select', { options: [{ value: 'a', label: 'A' }] }),
      ]
      expect(
        validateConstraints({ sel: 'b' }, fields, []).some(
          (e) => e.code === 'invalid_option',
        ),
      ).toBe(true)
      expect(validateConstraints({ sel: 'a' }, fields, [])).toEqual([])
    })

    it('validates multi_select options', () => {
      const fields = [
        makeField('msel', 'multi_select', {
          options: [{ value: 'x', label: 'X' }],
        }),
      ]
      expect(
        validateConstraints({ msel: ['x', 'y'] }, fields, []).some(
          (e) => e.code === 'invalid_option',
        ),
      ).toBe(true)
      expect(validateConstraints({ msel: ['x'] }, fields, [])).toEqual([])
    })

    it('validates number_with_unit NaN, min, max', () => {
      const fields = [
        makeField('num', 'number_with_unit', {
          unit: 'kg',
          validationRules: { min: 1, max: 10 },
        }),
      ]
      expect(
        validateConstraints({ num: 'abc' }, fields, []).some(
          (e) => e.code === 'invalid_number',
        ),
      ).toBe(true)
      expect(
        validateConstraints({ num: 0 }, fields, []).some(
          (e) => e.code === 'min_value',
        ),
      ).toBe(true)
      expect(
        validateConstraints({ num: 20 }, fields, []).some(
          (e) => e.code === 'max_value',
        ),
      ).toBe(true)
      expect(validateConstraints({ num: 5 }, fields, [])).toEqual([])
    })

    it('validates boolean type', () => {
      const fields = [makeField('bool', 'boolean')]
      expect(
        validateConstraints({ bool: 'maybe' }, fields, []).some(
          (e) => e.code === 'invalid_boolean',
        ),
      ).toBe(true)
      expect(validateConstraints({ bool: true }, fields, [])).toEqual([])
      expect(validateConstraints({ bool: 'true' }, fields, [])).toEqual([])
    })

    it('validates size_color_matrix structure', () => {
      const fields = [
        makeField('mat', 'size_color_matrix', {
          matrix: { sizes: ['S'], colors: [{ name: 'Red' }] },
        }),
      ]
      expect(
        validateConstraints({ mat: 'not-array' }, fields, []).some(
          (e) => e.code === 'invalid_matrix',
        ),
      ).toBe(true)
      expect(
        validateConstraints({ mat: [{ size: '' }] }, fields, []).some(
          (e) => e.code === 'matrix_missing_fields',
        ),
      ).toBe(true)
      expect(
        validateConstraints(
          { mat: [{ size: 'S', color: 'Red', quantity: -5 }] },
          fields,
          [],
        ).some((e) => e.code === 'matrix_invalid_quantity'),
      ).toBe(true)
      expect(
        validateConstraints(
          { mat: [{ size: 'S', color: 'Red', quantity: 10 }] },
          fields,
          [],
        ),
      ).toEqual([])
    })

    it('validates artwork and supporting_file fields', () => {
      const fields = [
        makeField('art', 'artwork'),
        makeField('file', 'supporting_file'),
      ]
      expect(
        validateConstraints({ art: 123 }, fields, []).some(
          (e) => e.fieldKey === 'art' && e.code === 'invalid_file',
        ),
      ).toBe(true)
      expect(
        validateConstraints({ file: true }, fields, []).some(
          (e) => e.fieldKey === 'file' && e.code === 'invalid_file',
        ),
      ).toBe(true)
      expect(
        validateConstraints(
          { art: 'asset-id-123', file: 'file-ref' },
          fields,
          [],
        ),
      ).toEqual([])
    })
  })
})

// ─── Resolve Display Values ──────────────────────────────────────────────────

describe('resolve display values', () => {
  it('resolves select label', () => {
    const fields = [
      makeField('paper', 'select', {
        options: [{ value: 'matte', label: 'Matte Finish' }],
      }),
    ]
    const resolved = resolveDisplayValues({ paper: 'matte' }, fields)
    expect(resolved.paper.displayValue).toBe('Matte Finish')
    expect(resolved.paper.label).toBe('PAPER')
  })

  it('resolves multi_select labels', () => {
    const fields = [
      makeField('fin', 'multi_select', {
        options: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ],
      }),
    ]
    const resolved = resolveDisplayValues({ fin: ['a', 'b'] }, fields)
    expect(resolved.fin.displayValue).toBe('Alpha, Beta')
  })

  it('resolves number_with_unit with unit', () => {
    const fields = [makeField('weight', 'number_with_unit', { unit: 'gsm' })]
    const resolved = resolveDisplayValues({ weight: 300 }, fields)
    expect(resolved.weight.displayValue).toBe('300 gsm')
    expect(resolved.weight.unit).toBe('gsm')
  })

  it('resolves boolean', () => {
    const fields = [makeField('proof', 'boolean')]
    expect(
      resolveDisplayValues({ proof: true }, fields).proof.displayValue,
    ).toBe('Yes')
    expect(
      resolveDisplayValues({ proof: false }, fields).proof.displayValue,
    ).toBe('No')
  })

  it('resolves size_color_matrix entries', () => {
    const fields = [makeField('items', 'size_color_matrix')]
    const resolved = resolveDisplayValues(
      { items: [{ size: 'L', color: 'Black', quantity: 10 }] },
      fields,
    )
    expect(resolved.items.displayValue).toBe('L/Black ×10')
  })

  it('resolves artwork as file reference', () => {
    const fields = [makeField('art', 'artwork')]
    const resolved = resolveDisplayValues({ art: 'asset-123' }, fields)
    expect(resolved.art.displayValue).toBe('asset-123')
  })
})
