import { sql } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  organization,
  type ProductFieldType,
  priceOverrides,
  pricingBasis,
  pricingExtensions,
  pricingRules,
  productConstraints,
  productFields,
  products,
  specificationPrices,
  specificationSnapshots,
  specifications,
} from '#/db/schema'
import {
  applyPriceOverride,
  approvePricingBasis,
  calculatePrice,
  commitSpecification,
  createPricingExtension,
  createPricingRule,
  createProductConstraint,
  createProductField,
  createSpecification,
  deleteProductConstraint,
  deleteProductField,
  getOverrideHistory,
  getPricingBasis,
  getProduct,
  getProductField,
  getSpecification,
  getSpecificationPrice,
  getSpecificationSnapshots,
  listPricingExtensions,
  listPricingRules,
  listProductConstraints,
  listProductFields,
  listSpecifications,
  rejectSpecification,
  resolveDisplayValues,
  roundAmount,
  savePricingResult,
  submitSpecification,
  updateProductField,
  upsertPricingBasis,
  validateConstraints,
} from './model'

const orgId = '00000000-0000-0000-0000-000000000001'
const orgId2 = '00000000-0000-0000-0000-000000000002'
const productId1 = '00000000-0000-0000-0000-000000000011'
const productId2 = '00000000-0000-0000-0000-000000000012'

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE organization, products, product_fields, product_constraints, specifications, specification_snapshots, pricing_basis, pricing_rules, pricing_extensions, price_overrides, specification_prices CASCADE`,
  )

  const now = new Date()
  await db.insert(organization).values([
    {
      id: orgId,
      name: 'Test Org 1',
      slug: 'test-org-1',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: orgId2,
      name: 'Test Org 2',
      slug: 'test-org-2',
      createdAt: now,
      updatedAt: now,
    },
  ])

  await db.insert(products).values([
    { id: productId1, orgId, name: 'Product 1' },
    { id: productId2, orgId: orgId2, name: 'Product 2' },
  ])
})

afterEach(async () => {})

// ─── 1. Product Field CRUD ───────────────────────────────────────────────────

describe('product field CRUD', () => {
  it('creates product fields with all field types and fetches them', async () => {
    const selectField = await createProductField({
      orgId,
      productId: productId1,
      fieldType: 'select',
      fieldKey: 'paper_type',
      label: 'Paper Type',
      unit: null,
      required: true,
      options: [
        { value: 'standard', label: 'Standard Matte' },
        { value: 'glossy', label: 'Premium Glossy', surcharge: 500 },
      ],
      validationRules: {},
      matrix: null,
      sortOrder: 1,
      active: true,
    })

    const multiSelectField = await createProductField({
      orgId,
      productId: productId1,
      fieldType: 'multi_select',
      fieldKey: 'finishing',
      label: 'Finishing Options',
      unit: null,
      required: false,
      options: [
        { value: 'folding', label: 'Folding' },
        { value: 'embossing', label: 'Embossing' },
      ],
      validationRules: {},
      matrix: null,
      sortOrder: 2,
      active: true,
    })

    const numberField = await createProductField({
      orgId,
      productId: productId1,
      fieldType: 'number_with_unit',
      fieldKey: 'custom_width',
      label: 'Custom Width',
      unit: 'cm',
      required: true,
      options: [],
      validationRules: { min: 10, max: 100 },
      matrix: null,
      sortOrder: 3,
      active: true,
    })

    const booleanField = await createProductField({
      orgId,
      productId: productId1,
      fieldType: 'boolean',
      fieldKey: 'express_production',
      label: 'Express Production',
      unit: null,
      required: false,
      options: [],
      validationRules: {},
      matrix: null,
      sortOrder: 4,
      active: true,
    })

    const matrixField = await createProductField({
      orgId,
      productId: productId1,
      fieldType: 'size_color_matrix',
      fieldKey: 'variant_matrix',
      label: 'Variant Matrix',
      unit: null,
      required: false,
      options: [],
      validationRules: {},
      matrix: {
        sizes: ['S', 'M', 'L'],
        colors: [
          { name: 'Red', hex: '#FF0000' },
          { name: 'Blue', hex: '#0000FF' },
        ],
      },
      sortOrder: 5,
      active: true,
    })

    const artworkField = await createProductField({
      orgId,
      productId: productId1,
      fieldType: 'artwork',
      fieldKey: 'front_artwork',
      label: 'Front Artwork',
      unit: null,
      required: true,
      options: [],
      validationRules: {},
      matrix: null,
      sortOrder: 6,
      active: true,
    })

    const fileField = await createProductField({
      orgId,
      productId: productId1,
      fieldType: 'supporting_file',
      fieldKey: 'po_document',
      label: 'Purchase Order Document',
      unit: null,
      required: false,
      options: [],
      validationRules: {},
      matrix: null,
      sortOrder: 7,
      active: true,
    })

    expect(selectField.id).toBeDefined()
    expect(multiSelectField.id).toBeDefined()
    expect(numberField.id).toBeDefined()
    expect(booleanField.id).toBeDefined()
    expect(matrixField.id).toBeDefined()
    expect(artworkField.id).toBeDefined()
    expect(fileField.id).toBeDefined()

    const fetched = await getProductField(selectField.id)
    expect(fetched).not.toBeNull()
    expect(fetched?.label).toBe('Paper Type')

    const fieldsList = await listProductFields(orgId, productId1)
    expect(fieldsList.length).toBe(7)
    expect(fieldsList[0].fieldKey).toBe('paper_type')
    expect(fieldsList[6].fieldKey).toBe('po_document')

    const dbFields = await db.select().from(productFields)
    expect(dbFields.length).toBe(7)
  })

  it('updates a product field', async () => {
    const field = await createProductField({
      orgId,
      productId: productId1,
      fieldType: 'select',
      fieldKey: 'color_option',
      label: 'Color Option',
      unit: null,
      required: false,
      options: [{ value: 'black', label: 'Black' }],
      validationRules: {},
      matrix: null,
      sortOrder: 1,
      active: true,
    })

    const updated = await updateProductField(field.id, orgId, {
      label: 'Updated Color Option',
      required: true,
      options: [
        { value: 'black', label: 'Black' },
        { value: 'white', label: 'White' },
      ],
      sortOrder: 10,
    })

    expect(updated.label).toBe('Updated Color Option')
    expect(updated.required).toBe(true)
    expect(updated.options.length).toBe(2)
    expect(updated.sortOrder).toBe(10)
  })

  it('deletes (soft-deletes) a product field and respects org tenant scoping', async () => {
    const field = await createProductField({
      orgId,
      productId: productId1,
      fieldType: 'boolean',
      fieldKey: 'gift_wrap',
      label: 'Gift Wrap',
      unit: null,
      required: false,
      options: [],
      validationRules: {},
      matrix: null,
      sortOrder: 1,
      active: true,
    })

    await deleteProductField(field.id, orgId)

    const fieldsList = await listProductFields(orgId, productId1)
    expect(fieldsList.find((f) => f.id === field.id)).toBeUndefined()

    const otherOrgList = await listProductFields(orgId2, productId1)
    expect(otherOrgList.length).toBe(0)
  })
})

// ─── 2. Product Constraint CRUD ──────────────────────────────────────────────

describe('product constraint CRUD', () => {
  it('creates, lists, and deletes product constraints', async () => {
    const constraint = await createProductConstraint({
      orgId,
      productId: productId1,
      constraintType: 'required_combo',
      name: 'Dimensions Combo',
      rule: { fields: ['width', 'height'] },
      errorMessage: 'Width and height must both be provided',
      active: true,
    })

    expect(constraint.id).toBeDefined()
    expect(constraint.name).toBe('Dimensions Combo')

    const list = await listProductConstraints(orgId, productId1)
    expect(list.length).toBe(1)
    expect(list[0].id).toBe(constraint.id)

    await deleteProductConstraint(constraint.id, orgId)

    const listAfterDelete = await listProductConstraints(orgId, productId1)
    expect(listAfterDelete.length).toBe(0)

    const dbConstraints = await db.select().from(productConstraints)
    expect(dbConstraints.length).toBe(1)
    expect(dbConstraints[0].active).toBe(false)
  })
})

// ─── 3. Constraint Validation Engine (Pure Functions) ─────────────────────────

describe('constraint validation engine', () => {
  const dummyField = (
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
  ) => ({
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
  })

  it('validates required_combo constraint', () => {
    const fields = [
      dummyField('width', 'number_with_unit'),
      dummyField('height', 'number_with_unit'),
    ]
    const constraints = [
      {
        id: 'c1',
        orgId,
        productId: productId1,
        constraintType: 'required_combo' as const,
        name: 'Dimension Combo',
        rule: { fields: ['width', 'height'] },
        errorMessage: 'Width and height must be provided together',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    // Neither provided -> passes (combo not triggered)
    expect(validateConstraints({}, fields, constraints)).toEqual([])

    // Both provided -> passes
    expect(
      validateConstraints({ width: 10, height: 20 }, fields, constraints),
    ).toEqual([])

    // Partial provided -> fails
    const errors = validateConstraints({ width: 10 }, fields, constraints)
    expect(errors.length).toBe(1)
    expect(errors[0].code).toBe('required_combo')
    expect(errors[0].fieldKey).toBe('height')
  })

  it('validates incompatible_values constraint', () => {
    const fields = [
      dummyField('paper', 'select', {
        options: [{ value: 'recycled', label: 'Recycled' }],
      }),
      dummyField('coating', 'select', {
        options: [
          { value: 'matte', label: 'Matte' },
          { value: 'high_gloss', label: 'High Gloss' },
        ],
      }),
    ]
    const constraints = [
      {
        id: 'c2',
        orgId,
        productId: productId1,
        constraintType: 'incompatible_values' as const,
        name: 'Paper Coating Incompatibility',
        rule: {
          pairs: [
            {
              fieldA: 'paper',
              valueA: 'recycled',
              fieldB: 'coating',
              valueB: 'high_gloss',
            },
          ],
        },
        errorMessage: 'Recycled paper cannot have high gloss coating',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    // Compatible pair -> passes
    expect(
      validateConstraints(
        { paper: 'recycled', coating: 'matte' },
        fields,
        constraints,
      ),
    ).toEqual([])

    // Incompatible pair -> fails
    const errors = validateConstraints(
      { paper: 'recycled', coating: 'high_gloss' },
      fields,
      constraints,
    )
    expect(errors.length).toBe(1)
    expect(errors[0].code).toBe('incompatible_values')
    expect(errors[0].fieldKey).toBe('coating')
  })

  it('validates numeric_range constraint', () => {
    const fields = [dummyField('length', 'number_with_unit')]
    const constraints = [
      {
        id: 'c3',
        orgId,
        productId: productId1,
        constraintType: 'numeric_range' as const,
        name: 'Length Range',
        rule: { field: 'length', min: 10, max: 100 },
        errorMessage: 'Length out of range',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    expect(validateConstraints({ length: 50 }, fields, constraints)).toEqual([])

    const errMin = validateConstraints({ length: 5 }, fields, constraints)
    expect(errMin.length).toBe(1)
    expect(errMin[0].code).toBe('numeric_range_min')

    const errMax = validateConstraints({ length: 150 }, fields, constraints)
    expect(errMax.length).toBe(1)
    expect(errMax[0].code).toBe('numeric_range_max')
  })

  it('validates dimensional_relationship constraint across all operators', () => {
    const fields = [
      dummyField('width', 'number_with_unit'),
      dummyField('height', 'number_with_unit'),
    ]
    const makeConstraint = (relationship: string, multiplier?: number) => [
      {
        id: 'c4',
        orgId,
        productId: productId1,
        constraintType: 'dimensional_relationship' as const,
        name: 'Width to Height Relationship',
        rule: { fieldA: 'width', fieldB: 'height', relationship, multiplier },
        errorMessage: 'Dimensional relationship failed',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    // lt
    expect(
      validateConstraints(
        { width: 10, height: 20 },
        fields,
        makeConstraint('lt'),
      ),
    ).toEqual([])
    expect(
      validateConstraints(
        { width: 20, height: 10 },
        fields,
        makeConstraint('lt'),
      ).length,
    ).toBe(1)

    // lte
    expect(
      validateConstraints(
        { width: 20, height: 20 },
        fields,
        makeConstraint('lte'),
      ),
    ).toEqual([])
    expect(
      validateConstraints(
        { width: 25, height: 20 },
        fields,
        makeConstraint('lte'),
      ).length,
    ).toBe(1)

    // gt
    expect(
      validateConstraints(
        { width: 30, height: 20 },
        fields,
        makeConstraint('gt'),
      ),
    ).toEqual([])
    expect(
      validateConstraints(
        { width: 10, height: 20 },
        fields,
        makeConstraint('gt'),
      ).length,
    ).toBe(1)

    // gte
    expect(
      validateConstraints(
        { width: 20, height: 20 },
        fields,
        makeConstraint('gte'),
      ),
    ).toEqual([])
    expect(
      validateConstraints(
        { width: 15, height: 20 },
        fields,
        makeConstraint('gte'),
      ).length,
    ).toBe(1)

    // eq
    expect(
      validateConstraints(
        { width: 20, height: 20 },
        fields,
        makeConstraint('eq'),
      ),
    ).toEqual([])
    expect(
      validateConstraints(
        { width: 20, height: 25 },
        fields,
        makeConstraint('eq'),
      ).length,
    ).toBe(1)

    // multiplier
    expect(
      validateConstraints(
        { width: 10, height: 25 },
        fields,
        makeConstraint('lt', 2),
      ),
    ).toEqual([]) // 10 * 2 = 20 < 25
    expect(
      validateConstraints(
        { width: 15, height: 25 },
        fields,
        makeConstraint('lt', 2),
      ).length,
    ).toBe(1) // 15 * 2 = 30 not < 25
  })

  it('validates matrix_rule constraint', () => {
    const fields = [
      dummyField('variants', 'size_color_matrix', {
        matrix: {
          sizes: ['S', 'M', 'L'],
          colors: [{ name: 'Red' }, { name: 'Blue' }],
        },
      }),
    ]
    const constraints = [
      {
        id: 'c5',
        orgId,
        productId: productId1,
        constraintType: 'matrix_rule' as const,
        name: 'Allowed Combinations',
        rule: {
          field: 'variants',
          validCombinations: [
            { size: 'S', color: 'Red' },
            { size: 'M', color: 'Blue' },
          ],
        },
        errorMessage: 'Invalid matrix combo',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    // Valid combo -> passes
    expect(
      validateConstraints(
        {
          variants: [
            { size: 'S', color: 'Red' },
            { size: 'M', color: 'Blue' },
          ],
        },
        fields,
        constraints,
      ),
    ).toEqual([])

    // Invalid size -> fails
    const errSize = validateConstraints(
      { variants: [{ size: 'XL', color: 'Red' }] },
      fields,
      constraints,
    )
    expect(errSize.some((e) => e.code === 'matrix_invalid_size')).toBe(true)

    // Invalid color -> fails
    const errColor = validateConstraints(
      { variants: [{ size: 'S', color: 'Green' }] },
      fields,
      constraints,
    )
    expect(errColor.some((e) => e.code === 'matrix_invalid_color')).toBe(true)

    // Invalid combination -> fails
    const errCombo = validateConstraints(
      { variants: [{ size: 'S', color: 'Blue' }] },
      fields,
      constraints,
    )
    expect(errCombo.some((e) => e.code === 'matrix_invalid_combo')).toBe(true)
  })

  it('validates per-field types correctly', () => {
    const fields = [
      dummyField('sel', 'select', {
        required: true,
        options: [{ value: 'a', label: 'A' }],
      }),
      dummyField('msel', 'multi_select', {
        options: [{ value: 'x', label: 'X' }],
      }),
      dummyField('num', 'number_with_unit', {
        unit: 'kg',
        validationRules: { min: 1, max: 10 },
      }),
      dummyField('bool', 'boolean'),
      dummyField('mat', 'size_color_matrix', {
        matrix: { sizes: ['S'], colors: [{ name: 'Red' }] },
      }),
      dummyField('art', 'artwork'),
      dummyField('file', 'supporting_file'),
    ]

    // Test required check
    const reqErr = validateConstraints({}, fields, [])
    expect(
      reqErr.some((e) => e.fieldKey === 'sel' && e.code === 'required'),
    ).toBe(true)

    // Test select invalid option
    const selErr = validateConstraints({ sel: 'b' }, fields, [])
    expect(
      selErr.some((e) => e.fieldKey === 'sel' && e.code === 'invalid_option'),
    ).toBe(true)

    // Test multi_select invalid option
    const mselErr = validateConstraints(
      { sel: 'a', msel: ['x', 'y'] },
      fields,
      [],
    )
    expect(
      mselErr.some((e) => e.fieldKey === 'msel' && e.code === 'invalid_option'),
    ).toBe(true)

    // Test number_with_unit NaN, min, max
    expect(
      validateConstraints({ sel: 'a', num: 'abc' }, fields, []).some(
        (e) => e.code === 'invalid_number',
      ),
    ).toBe(true)
    expect(
      validateConstraints({ sel: 'a', num: 0 }, fields, []).some(
        (e) => e.code === 'min_value',
      ),
    ).toBe(true)
    expect(
      validateConstraints({ sel: 'a', num: 20 }, fields, []).some(
        (e) => e.code === 'max_value',
      ),
    ).toBe(true)

    // Test boolean invalid type
    expect(
      validateConstraints({ sel: 'a', bool: 'maybe' }, fields, []).some(
        (e) => e.code === 'invalid_boolean',
      ),
    ).toBe(true)

    // Test size_color_matrix invalid structure
    expect(
      validateConstraints({ sel: 'a', mat: 'not-an-array' }, fields, []).some(
        (e) => e.code === 'invalid_matrix',
      ),
    ).toBe(true)
    expect(
      validateConstraints({ sel: 'a', mat: [{ size: '' }] }, fields, []).some(
        (e) => e.code === 'matrix_missing_fields',
      ),
    ).toBe(true)
    expect(
      validateConstraints(
        { sel: 'a', mat: [{ size: 'S', color: 'Red', quantity: -5 }] },
        fields,
        [],
      ).some((e) => e.code === 'matrix_invalid_quantity'),
    ).toBe(true)

    // Test artwork / supporting_file invalid type
    expect(
      validateConstraints({ sel: 'a', art: 123 }, fields, []).some(
        (e) => e.fieldKey === 'art' && e.code === 'invalid_file',
      ),
    ).toBe(true)
    expect(
      validateConstraints({ sel: 'a', file: true }, fields, []).some(
        (e) => e.fieldKey === 'file' && e.code === 'invalid_file',
      ),
    ).toBe(true)
  })
})

// ─── 4. Resolve Display Values ───────────────────────────────────────────────

describe('resolve display values', () => {
  it('resolves display labels and units for field values', () => {
    const fields = [
      {
        id: 'f1',
        orgId,
        productId: productId1,
        fieldType: 'select' as const,
        fieldKey: 'paper',
        label: 'Paper Option',
        unit: null,
        required: false,
        options: [{ value: 'matte', label: 'Matte Finish' }],
        validationRules: {},
        matrix: null,
        sortOrder: 1,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'f2',
        orgId,
        productId: productId1,
        fieldType: 'number_with_unit' as const,
        fieldKey: 'weight',
        label: 'Weight',
        unit: 'gsm',
        required: false,
        options: [],
        validationRules: {},
        matrix: null,
        sortOrder: 2,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'f3',
        orgId,
        productId: productId1,
        fieldType: 'boolean' as const,
        fieldKey: 'proof',
        label: 'Digital Proof',
        unit: null,
        required: false,
        options: [],
        validationRules: {},
        matrix: null,
        sortOrder: 3,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'f4',
        orgId,
        productId: productId1,
        fieldType: 'size_color_matrix' as const,
        fieldKey: 'items',
        label: 'Items Breakdown',
        unit: null,
        required: false,
        options: [],
        validationRules: {},
        matrix: null,
        sortOrder: 4,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const resolved = resolveDisplayValues(
      {
        paper: 'matte',
        weight: 300,
        proof: true,
        items: [{ size: 'L', color: 'Black', quantity: 10 }],
      },
      fields,
    )

    expect(resolved.paper.displayValue).toBe('Matte Finish')
    expect(resolved.weight.displayValue).toBe('300 gsm')
    expect(resolved.weight.unit).toBe('gsm')
    expect(resolved.proof.displayValue).toBe('Yes')
    expect(resolved.items.displayValue).toBe('L/Black ×10')
  })
})

// ─── 5. Specification Lifecycle ─────────────────────────────────────────────

describe('specification lifecycle', () => {
  it('creates, submits, commits, and rejects specifications', async () => {
    // Add a field to product 1
    await createProductField({
      orgId,
      productId: productId1,
      fieldType: 'select',
      fieldKey: 'size',
      label: 'Size',
      unit: null,
      required: true,
      options: [{ value: 'A4', label: 'A4 Size' }],
      validationRules: {},
      matrix: null,
      sortOrder: 1,
      active: true,
    })

    // 1. Create draft spec
    const spec = await createSpecification({
      orgId,
      productId: productId1,
      submittedBy: 'user-1',
      submittedByRole: 'customer',
      quantity: 100,
    })

    expect(spec.id).toBeDefined()
    expect(spec.status).toBe('draft')

    // 2. Submit with invalid field values -> stays draft with errors
    const invalidSubmit = await submitSpecification(spec.id, orgId, {
      size: 'A3',
    })
    expect(invalidSubmit.status).toBe('draft')
    expect(invalidSubmit.validationErrors.length).toBeGreaterThan(0)

    // 3. Submit with valid field values -> status becomes submitted
    const validSubmit = await submitSpecification(spec.id, orgId, {
      size: 'A4',
    })
    expect(validSubmit.status).toBe('submitted')
    expect(validSubmit.resolvedDisplay.size.displayValue).toBe('A4 Size')

    // Setup pricing so it can be priced and committed
    await upsertPricingBasis({
      orgId,
      productId: productId1,
      basisType: 'flat',
      currency: 'USD',
      precision: 2,
      roundingMode: 'half_up',
      minimumPrice: null,
      approved: true,
      approvedAt: new Date(),
      approvedBy: 'admin',
    })

    await createPricingRule({
      orgId,
      productId: productId1,
      effectType: 'quantity_break',
      name: 'Base Price',
      minQuantity: 1,
      maxQuantity: 1000,
      amount: 10,
      percentage: null,
      fieldKey: null,
      optionValue: null,
      condition: null,
      isSetup: false,
      priority: 1,
      active: true,
    })

    const pricing = await calculatePrice(orgId, productId1, 100, { size: 'A4' })
    await savePricingResult(spec.id, orgId, pricing)

    const pricedSpec = await getSpecification(spec.id, orgId)
    expect(pricedSpec?.status).toBe('priced')

    const dbSpecs = await db.select().from(specifications)
    expect(dbSpecs.length).toBe(1)

    // 4. Commit specification -> locks status and creates snapshot
    const commitResult = await commitSpecification(spec.id, orgId, 'admin-1')
    expect(commitResult.spec.status).toBe('committed')
    expect(commitResult.snapshot.id).toBeDefined()
    expect(commitResult.snapshot.quantity).toBe(100)

    const snapshots = await getSpecificationSnapshots(spec.id)
    expect(snapshots.length).toBe(1)

    // 5. Test rejecting a draft specification
    const spec2 = await createSpecification({
      orgId,
      productId: productId1,
      submittedBy: 'user-2',
      submittedByRole: 'customer',
      quantity: 50,
    })

    const rejected = await rejectSpecification(spec2.id, orgId, 'Out of stock')
    expect(rejected.status).toBe('rejected')
    expect(rejected.rejectionReason).toBe('Out of stock')
  })

  it('lists specifications with filters', async () => {
    await createSpecification({
      orgId,
      productId: productId1,
      submittedBy: 'user-1',
      submittedByRole: 'customer',
      quantity: 10,
    })

    await createSpecification({
      orgId: orgId2,
      productId: productId2,
      submittedBy: 'user-2',
      submittedByRole: 'customer',
      quantity: 20,
    })

    const allOrg1Specs = await listSpecifications(orgId)
    expect(allOrg1Specs.length).toBe(1)

    const p1Specs = await listSpecifications(orgId, { productId: productId1 })
    expect(p1Specs.length).toBe(1)
  })
})

// ─── 6. Pricing Calculation & Effect Types ────────────────────────────────────

describe('pricing calculation & rounding', () => {
  it('tests pure roundAmount function for all rounding modes', () => {
    expect(roundAmount(10.555, 2, 'half_up')).toBe(10.56)
    expect(roundAmount(10.554, 2, 'half_up')).toBe(10.55)

    expect(roundAmount(10.551, 2, 'ceil')).toBe(10.56)
    expect(roundAmount(10.559, 2, 'floor')).toBe(10.55)

    expect(roundAmount(10.555, 2, 'half_down')).toBe(10.55)

    // Bankers rounding (round to even on tie)
    expect(roundAmount(2.5, 0, 'bankers')).toBe(2)
    expect(roundAmount(3.5, 0, 'bankers')).toBe(4)
  })

  it('calculates pricing with all rule effect types, setup charges, and minimum price', async () => {
    await upsertPricingBasis({
      orgId,
      productId: productId1,
      basisType: 'flat',
      currency: 'USD',
      precision: 2,
      roundingMode: 'half_up',
      minimumPrice: 50, // Minimum unit price of 50
      approved: true,
      approvedAt: new Date(),
      approvedBy: 'admin',
    })

    // Quantity break rule
    await createPricingRule({
      orgId,
      productId: productId1,
      effectType: 'quantity_break',
      name: 'Base Tier',
      minQuantity: 1,
      maxQuantity: 100,
      amount: 10,
      percentage: null,
      fieldKey: null,
      optionValue: null,
      condition: null,
      isSetup: false,
      priority: 1,
      active: true,
    })

    // Option surcharge rule
    await createPricingRule({
      orgId,
      productId: productId1,
      effectType: 'option_surcharge',
      name: 'Paper Surcharge',
      minQuantity: null,
      maxQuantity: null,
      amount: 2,
      percentage: null,
      fieldKey: 'paper',
      optionValue: 'glossy',
      condition: null,
      isSetup: false,
      priority: 2,
      active: true,
    })

    // Material effect rule
    await createPricingRule({
      orgId,
      productId: productId1,
      effectType: 'material_effect',
      name: 'Leather Material',
      minQuantity: null,
      maxQuantity: null,
      amount: 5,
      percentage: null,
      fieldKey: 'material',
      optionValue: 'leather',
      condition: null,
      isSetup: false,
      priority: 3,
      active: true,
    })

    // Decoration method rule
    await createPricingRule({
      orgId,
      productId: productId1,
      effectType: 'decoration_method',
      name: 'Foil Stamping',
      minQuantity: null,
      maxQuantity: null,
      amount: 3,
      percentage: null,
      fieldKey: 'decoration',
      optionValue: 'foil',
      condition: null,
      isSetup: false,
      priority: 4,
      active: true,
    })

    // Placement surcharge rule with condition
    await createPricingRule({
      orgId,
      productId: productId1,
      effectType: 'placement_surcharge',
      name: 'Back Placement',
      minQuantity: null,
      maxQuantity: null,
      amount: 4,
      percentage: null,
      fieldKey: null,
      optionValue: null,
      condition: { field: 'placement', op: 'eq', value: 'back' },
      isSetup: false,
      priority: 5,
      active: true,
    })

    // Setup charge (one-time)
    await createPricingRule({
      orgId,
      productId: productId1,
      effectType: 'additive',
      name: 'Screen Setup',
      minQuantity: null,
      maxQuantity: null,
      amount: 100,
      percentage: null,
      fieldKey: null,
      optionValue: null,
      condition: null,
      isSetup: true, // setup charge
      priority: 6,
      active: true,
    })

    // Additive effect rule
    await createPricingRule({
      orgId,
      productId: productId1,
      effectType: 'additive',
      name: 'Express Fee',
      minQuantity: null,
      maxQuantity: null,
      amount: 1,
      percentage: null,
      fieldKey: null,
      optionValue: null,
      condition: null,
      isSetup: false,
      priority: 7,
      active: true,
    })

    // Percentage effect rule (10%)
    await createPricingRule({
      orgId,
      productId: productId1,
      effectType: 'percentage',
      name: 'Handling Fee (10%)',
      minQuantity: null,
      maxQuantity: null,
      amount: null,
      percentage: 0.1,
      fieldKey: null,
      optionValue: null,
      condition: null,
      isSetup: false,
      priority: 8,
      active: true,
    })

    // Surcharge rule
    await createPricingRule({
      orgId,
      productId: productId1,
      effectType: 'surcharge',
      name: 'Fuel Surcharge',
      minQuantity: null,
      maxQuantity: null,
      amount: 2,
      percentage: null,
      fieldKey: null,
      optionValue: null,
      condition: null,
      isSetup: false,
      priority: 9,
      active: true,
    })

    const fieldValues = {
      paper: 'glossy',
      material: 'leather',
      decoration: 'foil',
      placement: 'back',
    }

    const result = await calculatePrice(orgId, productId1, 10, fieldValues)

    // Base unit price sum before percentage: 10 (base) + 2 (paper) + 5 (leather) + 3 (foil) + 4 (placement) + 1 (additive) = 25
    // Percentage 10% on 25 = 2.5. Subtotal = 27.5
    // Surcharge 2 added -> 29.5
    // Since minimum price is 50, calculated unitPrice of 29.5 is enforced to 50!
    expect(result.unitPrice).toBe(50)
    // Total price: (unitPrice * qty) + setup = (50 * 10) + 100 = 600
    expect(result.totalPrice).toBe(600)
    expect(
      result.breakdown.some(
        (b) => b.type === 'setup_charge' && b.amount === 100,
      ),
    ).toBe(true)

    const dbBasis = await db.select().from(pricingBasis)
    expect(dbBasis.length).toBe(1)

    const dbRules = await db.select().from(pricingRules)
    expect(dbRules.length).toBe(9)

    const fetchedRules = await listPricingRules(orgId, productId1)
    expect(fetchedRules.length).toBe(9)
  })

  it('throws error if pricing basis is missing or unapproved', async () => {
    await expect(calculatePrice(orgId, productId1, 10, {})).rejects.toThrow(
      'No pricing basis configured for this product',
    )

    await upsertPricingBasis({
      orgId,
      productId: productId1,
      basisType: 'flat',
      currency: 'USD',
      precision: 2,
      roundingMode: 'half_up',
      minimumPrice: null,
      approved: false,
      approvedAt: null,
      approvedBy: null,
    })

    await expect(calculatePrice(orgId, productId1, 10, {})).rejects.toThrow(
      'Pricing basis is not approved',
    )

    const basis = await approvePricingBasis(productId1, 'admin')
    expect(basis.approved).toBe(true)

    const fetchedBasis = await getPricingBasis(productId1, orgId)
    expect(fetchedBasis?.approved).toBe(true)
  })
})

// ─── 7. Pricing Extensions & Review Flagging ──────────────────────────────────

describe('pricing extensions', () => {
  it('flags pricing review when an extension is failed or unavailable', async () => {
    await upsertPricingBasis({
      orgId,
      productId: productId1,
      basisType: 'flat',
      currency: 'USD',
      precision: 2,
      roundingMode: 'half_up',
      minimumPrice: null,
      approved: true,
      approvedAt: new Date(),
      approvedBy: 'admin',
    })

    await createPricingExtension({
      orgId,
      productId: productId1,
      name: 'External Rate Calculator',
      version: 1,
      status: 'failed',
      config: {},
      effectType: 'external_rate',
      priority: 1,
      active: true,
    })

    const extList = await listPricingExtensions(orgId, productId1)
    expect(extList.length).toBe(1)

    const dbExts = await db.select().from(pricingExtensions)
    expect(dbExts.length).toBe(1)

    const result = await calculatePrice(orgId, productId1, 10, {})
    expect(result.inReview).toBe(true)
    expect(result.reviewReason).toContain('failed or are unavailable')

    // Create spec and save pricing result
    const spec = await createSpecification({
      orgId,
      productId: productId1,
      submittedBy: 'user-1',
      submittedByRole: 'customer',
      quantity: 10,
    })

    await savePricingResult(spec.id, orgId, result)

    const updatedSpec = await getSpecification(spec.id, orgId)
    expect(updatedSpec?.status).toBe('pricing_review')
    expect(updatedSpec?.pricingStatus).toBe('review')
  })
})

// ─── 8. Manual Price Overrides ────────────────────────────────────────────────

describe('manual price overrides', () => {
  it('applies manual price override with immutable reason', async () => {
    await upsertPricingBasis({
      orgId,
      productId: productId1,
      basisType: 'flat',
      currency: 'USD',
      precision: 2,
      roundingMode: 'half_up',
      minimumPrice: null,
      approved: true,
      approvedAt: new Date(),
      approvedBy: 'admin',
    })

    const spec = await createSpecification({
      orgId,
      productId: productId1,
      submittedBy: 'user-1',
      submittedByRole: 'customer',
      quantity: 10,
    })

    const pricing = await calculatePrice(orgId, productId1, 10, {})
    await savePricingResult(spec.id, orgId, pricing)

    // Override price from calculated to 500
    const { override, price } = await applyPriceOverride(
      spec.id,
      orgId,
      500,
      'Customer loyalty discount',
      'manager-1',
    )

    expect(override.id).toBeDefined()
    expect(override.reason).toBe('Customer loyalty discount')
    expect(override.overrideBy).toBe('manager-1')
    expect(override.overridePrice).toBe(500)

    expect(price.isOverridden).toBe(true)
    expect(price.totalPrice).toBe(500)

    const history = await getOverrideHistory(spec.id, orgId)
    expect(history.length).toBe(1)
    expect(history[0].reason).toBe('Customer loyalty discount')

    const dbOverrides = await db.select().from(priceOverrides)
    expect(dbOverrides.length).toBe(1)

    const updatedSpec = await getSpecification(spec.id, orgId)
    expect(updatedSpec?.status).toBe('priced')
    expect(updatedSpec?.pricingStatus).toBe('overridden')
  })
})

// ─── 9. Snapshot Immutability & Protection ────────────────────────────────────

describe('snapshot immutability', () => {
  it('prevents modification or overriding of committed specifications', async () => {
    await upsertPricingBasis({
      orgId,
      productId: productId1,
      basisType: 'flat',
      currency: 'USD',
      precision: 2,
      roundingMode: 'half_up',
      minimumPrice: null,
      approved: true,
      approvedAt: new Date(),
      approvedBy: 'admin',
    })

    const spec = await createSpecification({
      orgId,
      productId: productId1,
      submittedBy: 'user-1',
      submittedByRole: 'customer',
      quantity: 10,
    })

    const pricing = await calculatePrice(orgId, productId1, 10, {})
    await savePricingResult(spec.id, orgId, pricing)

    await commitSpecification(spec.id, orgId, 'admin')

    const committedSpec = await getSpecification(spec.id, orgId)
    expect(committedSpec?.status).toBe('committed')

    const committedPrice = await getSpecificationPrice(spec.id, orgId)
    expect(committedPrice?.committedAt).not.toBeNull()

    const dbSnapshots = await db.select().from(specificationSnapshots)
    expect(dbSnapshots.length).toBe(1)

    const dbPrices = await db.select().from(specificationPrices)
    expect(dbPrices.length).toBe(1)

    // 1. Cannot re-submit a committed spec
    await expect(submitSpecification(spec.id, orgId, {})).rejects.toThrow(
      'Cannot submit specification with status "committed"',
    )

    // 2. Cannot override price of a committed spec
    await expect(
      applyPriceOverride(spec.id, orgId, 999, 'Late discount', 'manager'),
    ).rejects.toThrow('Cannot override price of a committed specification')

    // 3. Cannot reject a committed spec
    await expect(
      rejectSpecification(spec.id, orgId, 'Changed mind'),
    ).rejects.toThrow('Cannot reject a committed specification')
  })
})
describe('assigned task bugfixes & enhancements', () => {
  it('getProduct helper fetches product scoped by orgId', async () => {
    const prod1 = await getProduct(productId1, orgId)
    expect(prod1).not.toBeNull()
    expect(prod1?.name).toBe('Product 1')

    // Wrong orgId returns null
    const crossOrg = await getProduct(productId1, orgId2)
    expect(crossOrg).toBeNull()
  })

  it('roundAmount half_down mode rounds 0.5 down toward zero', () => {
    // Positive values
    expect(roundAmount(10.555, 2, 'half_down')).toBe(10.55)
    expect(roundAmount(10.556, 2, 'half_down')).toBe(10.56)
    expect(roundAmount(10.554, 2, 'half_down')).toBe(10.55)

    // Negative values
    expect(roundAmount(-10.555, 2, 'half_down')).toBe(-10.55)
    expect(roundAmount(-10.556, 2, 'half_down')).toBe(-10.56)
  })

  it('commitSpecification populates productSnapshot with product data and config', async () => {
    await upsertPricingBasis({
      orgId,
      productId: productId1,
      basisType: 'flat',
      currency: 'USD',
      precision: 2,
      roundingMode: 'half_up',
      minimumPrice: null,
      approved: true,
      approvedAt: new Date(),
      approvedBy: 'admin',
    })

    const spec = await createSpecification({
      orgId,
      productId: productId1,
      submittedBy: 'user-snapshot',
      submittedByRole: 'customer',
      quantity: 5,
    })

    const pricing = await calculatePrice(orgId, productId1, 5, {})
    await savePricingResult(spec.id, orgId, pricing)

    const commitResult = await commitSpecification(spec.id, orgId, 'admin-snap')
    const snap = commitResult.snapshot.productSnapshot as Record<
      string,
      unknown
    >
    expect(snap).toBeDefined()
    expect(snap.name).toBe('Product 1')
    expect(snap.id).toBe(productId1)
    expect(Array.isArray(snap.fields)).toBe(true)
    expect(Array.isArray(snap.constraints)).toBe(true)
  })

  it('calculatePrice uses product basePrice when no quantity break rule applies', async () => {
    // Set basePrice on product
    await db
      .update(products)
      .set({ basePrice: 45 })
      .where(sql`${products.id} = ${productId1}`)

    await upsertPricingBasis({
      orgId,
      productId: productId1,
      basisType: 'flat',
      currency: 'USD',
      precision: 2,
      roundingMode: 'half_up',
      minimumPrice: null,
      approved: true,
      approvedAt: new Date(),
      approvedBy: 'admin',
    })

    const result = await calculatePrice(orgId, productId1, 1, {})
    expect(result.unitPrice).toBe(45)
    expect(result.totalPrice).toBe(45)
    expect(result.breakdown[0].label).toBe('Base Price')
    expect(result.breakdown[0].unitAmount).toBe(45)
  })

  it('getPricingBasis, getSpecificationPrice, and getOverrideHistory enforce orgId scoping', async () => {
    await upsertPricingBasis({
      orgId,
      productId: productId1,
      basisType: 'flat',
      currency: 'USD',
      precision: 2,
      roundingMode: 'half_up',
      minimumPrice: null,
      approved: true,
      approvedAt: new Date(),
      approvedBy: 'admin',
    })

    // Correct orgId
    const basis = await getPricingBasis(productId1, orgId)
    expect(basis).not.toBeNull()

    // Wrong orgId returns null
    const wrongBasis = await getPricingBasis(productId1, orgId2)
    expect(wrongBasis).toBeNull()

    const spec = await createSpecification({
      orgId,
      productId: productId1,
      submittedBy: 'user-scope',
      submittedByRole: 'customer',
      quantity: 1,
    })
    const pricing = await calculatePrice(orgId, productId1, 1, {})
    await savePricingResult(spec.id, orgId, pricing)

    // getSpecificationPrice orgId scoping
    expect(await getSpecificationPrice(spec.id, orgId)).not.toBeNull()
    expect(await getSpecificationPrice(spec.id, orgId2)).toBeNull()

    // getOverrideHistory orgId scoping
    await applyPriceOverride(spec.id, orgId, 100, 'Discount', 'manager')
    expect((await getOverrideHistory(spec.id, orgId)).length).toBe(1)
    expect((await getOverrideHistory(spec.id, orgId2)).length).toBe(0)
  })
})
