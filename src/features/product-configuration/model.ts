import { and, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  type ConstraintType,
  type PricingBasisType,
  type PricingEffectType,
  type PricingExtensionStatus,
  type ProductFieldOption,
  type ProductFieldType,
  priceOverrides,
  pricingBasis,
  pricingExtensions,
  pricingRules,
  productConstraints,
  productFields,
  products,
  type RoundingMode,
  type SizeColorMatrix,
  type SpecificationStatus,
  specificationPrices,
  specificationSnapshots,
  specifications,
} from '#/db/schema'

export type { SpecificationStatus } from '#/db/schema'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProductField {
  id: string
  orgId: string
  productId: string
  fieldType: ProductFieldType
  fieldKey: string
  label: string
  unit: string | null
  required: boolean
  options: Array<{
    value: string
    label: string
    surcharge?: number
    materialSurcharge?: number
  }>
  validationRules: object
  matrix: {
    sizes: string[]
    colors: Array<{ name: string; hex?: string }>
  } | null
  sortOrder: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ProductConstraint {
  id: string
  orgId: string
  productId: string
  constraintType: ConstraintType
  name: string
  rule: object
  errorMessage: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Specification {
  id: string
  orgId: string
  productId: string
  orderId: string | null
  submittedBy: string
  submittedByRole: string
  status: SpecificationStatus
  fieldValues: object
  resolvedDisplay: Record<
    string,
    { label: string; unit?: string; displayValue: string }
  >
  quantity: number
  validationErrors: Array<{
    fieldKey?: string
    message: string
    code: string
  }>
  pricingStatus: string | null
  pricingReviewReason: string | null
  rejectionReason: string | null
  committedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface SpecificationSnapshot {
  id: string
  orgId: string
  specificationId: string
  productSnapshot: object
  fieldValuesSnapshot: object
  priceSnapshot: object
  quantity: number
  committedBy: string
  committedAt: Date
}

export interface PricingBasisConfig {
  id: string
  orgId: string
  productId: string
  basisType: PricingBasisType
  currency: string
  precision: number
  roundingMode: RoundingMode
  minimumPrice: number | null
  approved: boolean
  approvedAt: Date | null
  approvedBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface PricingRuleConfig {
  id: string
  orgId: string
  productId: string
  effectType: PricingEffectType
  name: string
  minQuantity: number | null
  maxQuantity: number | null
  amount: number | null
  percentage: number | null
  fieldKey: string | null
  optionValue: string | null
  condition: object | null
  isSetup: boolean
  priority: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PricingExtension {
  id: string
  orgId: string
  productId: string
  name: string
  version: number
  status: PricingExtensionStatus
  config: object
  effectType: string
  priority: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PriceOverride {
  id: string
  orgId: string
  specificationId: string
  originalPrice: number
  overridePrice: number
  reason: string
  overrideBy: string
  createdAt: Date
}

export interface SpecificationPrice {
  id: string
  orgId: string
  specificationId: string
  currency: string
  unitPrice: number
  totalPrice: number
  quantity: number
  breakdown: Array<{
    label: string
    type: string
    amount: number
    unitAmount?: number
  }>
  isOverridden: boolean
  overrideId: string | null
  extensionStatuses: Array<{
    extensionId: string
    name: string
    status: string
    error?: string
  }>
  committedAt: Date | null
  committedBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ValidationError {
  fieldKey?: string
  message: string
  code: string
}

export interface PricingBreakdownItem {
  label: string
  type: string
  amount: number
  unitAmount?: number
}

export interface PricingResult {
  unitPrice: number
  totalPrice: number
  currency: string
  breakdown: PricingBreakdownItem[]
  extensionStatuses: Array<{
    extensionId: string
    name: string
    status: string
    error?: string
  }>
  inReview: boolean
  reviewReason?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Round a number to the given number of decimal places using the specified mode.
 */
export function roundAmount(
  value: number,
  precision: number,
  mode: RoundingMode = 'half_up',
): number {
  const factor = 10 ** precision
  const shifted = value * factor
  switch (mode) {
    case 'half_up':
      return (
        (shifted >= 0 ? Math.round(shifted) : -Math.round(-shifted)) / factor
      )
    case 'half_down': {
      const val =
        shifted >= 0
          ? Math.trunc(shifted + 0.4999999999)
          : Math.trunc(shifted - 0.4999999999)
      return val / factor
    }
    case 'ceil':
      return Math.ceil(shifted) / factor
    case 'floor':
      return Math.floor(shifted) / factor
    case 'bankers': {
      const rounded = Math.round(shifted)
      if (Math.abs(shifted - Math.floor(shifted) - 0.5) < 1e-10) {
        // Tie: round to even
        return (rounded % 2 === 0 ? rounded : rounded - 1) / factor
      }
      return rounded / factor
    }
    default:
      return Math.round(shifted) / factor
  }
}

// ─── Product Field CRUD ──────────────────────────────────────────────────────

export async function createProductField(
  input: Omit<ProductField, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ProductField> {
  const id = generateId()
  const now = new Date()

  const [row] = await db
    .insert(productFields)
    .values({
      id,
      orgId: input.orgId,
      productId: input.productId,
      fieldType: input.fieldType,
      fieldKey: input.fieldKey,
      label: input.label,
      unit: input.unit ?? null,
      required: input.required,
      options: input.options as unknown as ProductFieldOption[],
      validationRules: input.validationRules as Record<string, unknown>,
      matrix: input.matrix as SizeColorMatrix | null,
      sortOrder: input.sortOrder,
      active: input.active,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  if (!row) throw new Error('Failed to create product field')
  return row as unknown as ProductField
}

export async function listProductFields(
  orgId: string,
  productId: string,
): Promise<ProductField[]> {
  const rows = await db
    .select()
    .from(productFields)
    .where(
      and(
        eq(productFields.orgId, orgId),
        eq(productFields.productId, productId),
        eq(productFields.active, true),
      ),
    )
    .orderBy(productFields.sortOrder)

  return rows as unknown as ProductField[]
}

export async function getProductField(
  id: string,
): Promise<ProductField | null> {
  const [row] = await db
    .select()
    .from(productFields)
    .where(eq(productFields.id, id))
    .limit(1)

  return (row as unknown as ProductField) ?? null
}

export async function updateProductField(
  id: string,
  orgId: string,
  updates: Partial<
    Pick<
      ProductField,
      | 'label'
      | 'unit'
      | 'required'
      | 'options'
      | 'validationRules'
      | 'matrix'
      | 'sortOrder'
      | 'active'
    >
  >,
): Promise<ProductField> {
  const now = new Date()
  const set: Record<string, unknown> = { updatedAt: now }

  if (updates.label !== undefined) set.label = updates.label
  if (updates.unit !== undefined) set.unit = updates.unit
  if (updates.required !== undefined) set.required = updates.required
  if (updates.options !== undefined) set.options = updates.options
  if (updates.validationRules !== undefined)
    set.validationRules = updates.validationRules
  if (updates.matrix !== undefined) set.matrix = updates.matrix
  if (updates.sortOrder !== undefined) set.sortOrder = updates.sortOrder
  if (updates.active !== undefined) set.active = updates.active

  const [row] = await db
    .update(productFields)
    .set(set)
    .where(and(eq(productFields.id, id), eq(productFields.orgId, orgId)))
    .returning()

  if (!row) throw new Error('Product field not found')
  return row as unknown as ProductField
}

export async function deleteProductField(
  id: string,
  orgId: string,
): Promise<void> {
  await db
    .update(productFields)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(productFields.id, id), eq(productFields.orgId, orgId)))
}

// ─── Product Constraint CRUD ─────────────────────────────────────────────────

export async function createProductConstraint(
  input: Omit<ProductConstraint, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ProductConstraint> {
  const id = generateId()
  const now = new Date()

  const [row] = await db
    .insert(productConstraints)
    .values({
      id,
      orgId: input.orgId,
      productId: input.productId,
      constraintType: input.constraintType,
      name: input.name,
      rule: input.rule as Record<string, unknown>,
      errorMessage: input.errorMessage,
      active: input.active,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  if (!row) throw new Error('Failed to create product constraint')
  return row as unknown as ProductConstraint
}

export async function listProductConstraints(
  orgId: string,
  productId: string,
): Promise<ProductConstraint[]> {
  const rows = await db
    .select()
    .from(productConstraints)
    .where(
      and(
        eq(productConstraints.orgId, orgId),
        eq(productConstraints.productId, productId),
        eq(productConstraints.active, true),
      ),
    )

  return rows as unknown as ProductConstraint[]
}

export async function deleteProductConstraint(
  id: string,
  orgId: string,
): Promise<void> {
  await db
    .update(productConstraints)
    .set({ active: false, updatedAt: new Date() })
    .where(
      and(eq(productConstraints.id, id), eq(productConstraints.orgId, orgId)),
    )
}

// ─── Constraint Validation Engine ────────────────────────────────────────────

/**
 * Validate specification field values against product constraints.
 * Returns an empty array if all constraints pass.
 */
export function validateConstraints(
  fieldValues: object,
  fields: ProductField[],
  constraints: ProductConstraint[],
): ValidationError[] {
  const fv = fieldValues as Record<string, unknown>
  const errors: ValidationError[] = []

  // Build a lookup map for field definitions
  const fieldMap = new Map(fields.map((f) => [f.fieldKey, f]))

  for (const constraint of constraints) {
    const rule = constraint.rule as Record<string, unknown>

    switch (constraint.constraintType) {
      case 'required_combo': {
        // Rule: { fields: string[] } — all listed fields must be provided together
        const requiredFields = rule.fields as string[] | undefined
        if (!requiredFields) break
        const provided = requiredFields.filter(
          (key) => fv[key] != null && fv[key] !== '',
        )
        const hasAny = provided.length > 0
        const hasAll = provided.length === requiredFields.length
        if (hasAny && !hasAll) {
          const missing = requiredFields.filter(
            (key) => fv[key] == null || fv[key] === '',
          )
          errors.push({
            message: constraint.errorMessage,
            code: 'required_combo',
            fieldKey: missing[0],
          })
        }
        break
      }

      case 'incompatible_values': {
        // Rule: { pairs: Array<{ fieldA: string, valueA: unknown, fieldB: string, valueB: unknown }> }
        const pairs = rule.pairs as
          | Array<{
              fieldA: string
              valueA: unknown
              fieldB: string
              valueB: unknown
            }>
          | undefined
        if (!pairs) break
        for (const pair of pairs) {
          if (
            fv[pair.fieldA] === pair.valueA &&
            fv[pair.fieldB] === pair.valueB
          ) {
            errors.push({
              message: constraint.errorMessage,
              code: 'incompatible_values',
              fieldKey: pair.fieldB,
            })
          }
        }
        break
      }

      case 'numeric_range': {
        // Rule: { field: string, min?: number, max?: number }
        const targetField = rule.field as string | undefined
        if (!targetField) break
        const value = fv[targetField]
        if (value == null || value === '') break
        const num = Number(value)
        if (Number.isNaN(num)) break
        const min = rule.min as number | undefined
        const max = rule.max as number | undefined
        if (min !== undefined && num < min) {
          errors.push({
            message: constraint.errorMessage,
            code: 'numeric_range_min',
            fieldKey: targetField,
          })
        }
        if (max !== undefined && num > max) {
          errors.push({
            message: constraint.errorMessage,
            code: 'numeric_range_max',
            fieldKey: targetField,
          })
        }
        break
      }

      case 'dimensional_relationship': {
        // Rule: { fieldA: string, fieldB: string, relationship: 'lt' | 'lte' | 'gt' | 'gte' | 'eq', multiplier?: number }
        const fieldA = rule.fieldA as string | undefined
        const fieldB = rule.fieldB as string | undefined
        const relationship = rule.relationship as string | undefined
        if (!fieldA || !fieldB || !relationship) break
        const valA = Number(fv[fieldA])
        const valB = Number(fv[fieldB])
        if (Number.isNaN(valA) || Number.isNaN(valB)) break
        const multiplier = (rule.multiplier as number) ?? 1
        const effectiveA = valA * multiplier
        let passes = false
        switch (relationship) {
          case 'lt':
            passes = effectiveA < valB
            break
          case 'lte':
            passes = effectiveA <= valB
            break
          case 'gt':
            passes = effectiveA > valB
            break
          case 'gte':
            passes = effectiveA >= valB
            break
          case 'eq':
            passes = effectiveA === valB
            break
        }
        if (!passes) {
          errors.push({
            message: constraint.errorMessage,
            code: 'dimensional_relationship',
            fieldKey: fieldB,
          })
        }
        break
      }

      case 'matrix_rule': {
        // Rule: { field: string, validCombinations?: Array<{ size: string, color: string }> }
        // Validates that submitted size/color combinations are in the allowed set
        const targetField = rule.field as string | undefined
        if (!targetField) break
        const matrixValue = fv[targetField] as
          | Array<{ size: string; color: string; quantity?: number }>
          | undefined
        if (!Array.isArray(matrixValue)) break
        const field = fieldMap.get(targetField)
        if (!field?.matrix) break
        const validCombinations = rule.validCombinations as
          | Array<{ size: string; color: string }>
          | undefined
        for (const entry of matrixValue) {
          // Check size exists in matrix
          if (!field.matrix.sizes.includes(entry.size)) {
            errors.push({
              message: `Invalid size "${entry.size}"`,
              code: 'matrix_invalid_size',
              fieldKey: targetField,
            })
            continue
          }
          // Check color exists in matrix
          if (!field.matrix.colors.some((c) => c.name === entry.color)) {
            errors.push({
              message: `Invalid color "${entry.color}"`,
              code: 'matrix_invalid_color',
              fieldKey: targetField,
            })
            continue
          }
          // Check against valid combinations if specified
          if (validCombinations) {
            const isValid = validCombinations.some(
              (vc) => vc.size === entry.size && vc.color === entry.color,
            )
            if (!isValid) {
              errors.push({
                message: `Combination ${entry.size}/${entry.color} is not available`,
                code: 'matrix_invalid_combo',
                fieldKey: targetField,
              })
            }
          }
        }
        break
      }
    }
  }

  // Also validate per-field type requirements
  for (const field of fields) {
    if (!field.active) continue
    const value = fv[field.fieldKey]

    // Required field check
    if (field.required && (value == null || value === '')) {
      errors.push({
        fieldKey: field.fieldKey,
        message: `${field.label} is required`,
        code: 'required',
      })
      continue
    }

    if (value == null || value === '') continue

    // Type-specific validation
    switch (field.fieldType) {
      case 'select': {
        const validValues = field.options.map((o) => o.value)
        if (!validValues.includes(String(value))) {
          errors.push({
            fieldKey: field.fieldKey,
            message: `Invalid option "${value}" for ${field.label}`,
            code: 'invalid_option',
          })
        }
        break
      }

      case 'multi_select': {
        const arr = Array.isArray(value) ? value : [value]
        const validValues = field.options.map((o) => o.value)
        for (const v of arr) {
          if (!validValues.includes(String(v))) {
            errors.push({
              fieldKey: field.fieldKey,
              message: `Invalid option "${v}" for ${field.label}`,
              code: 'invalid_option',
            })
          }
        }
        break
      }

      case 'number_with_unit': {
        const num = Number(value)
        if (Number.isNaN(num)) {
          errors.push({
            fieldKey: field.fieldKey,
            message: `${field.label} must be a number`,
            code: 'invalid_number',
          })
        } else {
          const rules = field.validationRules as Record<string, unknown>
          if (rules.min !== undefined && num < (rules.min as number)) {
            errors.push({
              fieldKey: field.fieldKey,
              message: `${field.label} must be at least ${rules.min}${field.unit ? ` ${field.unit}` : ''}`,
              code: 'min_value',
            })
          }
          if (rules.max !== undefined && num > (rules.max as number)) {
            errors.push({
              fieldKey: field.fieldKey,
              message: `${field.label} must be at most ${rules.max}${field.unit ? ` ${field.unit}` : ''}`,
              code: 'max_value',
            })
          }
        }
        break
      }

      case 'boolean': {
        if (
          typeof value !== 'boolean' &&
          value !== 'true' &&
          value !== 'false'
        ) {
          errors.push({
            fieldKey: field.fieldKey,
            message: `${field.label} must be true or false`,
            code: 'invalid_boolean',
          })
        }
        break
      }

      case 'size_color_matrix': {
        if (!Array.isArray(value)) {
          errors.push({
            fieldKey: field.fieldKey,
            message: `${field.label} must be an array of size/color entries`,
            code: 'invalid_matrix',
          })
        } else if (field.matrix) {
          for (const entry of value as Array<{
            size: string
            color: string
            quantity?: number
          }>) {
            if (!entry.size || !entry.color) {
              errors.push({
                fieldKey: field.fieldKey,
                message: 'Each matrix entry must have size and color',
                code: 'matrix_missing_fields',
              })
            }
            if (
              entry.quantity !== undefined &&
              (typeof entry.quantity !== 'number' || entry.quantity < 0)
            ) {
              errors.push({
                fieldKey: field.fieldKey,
                message: 'Matrix quantity must be a non-negative number',
                code: 'matrix_invalid_quantity',
              })
            }
          }
        }
        break
      }

      case 'artwork':
      case 'supporting_file': {
        // File fields should have an asset reference (string ID)
        if (typeof value !== 'string' && typeof value !== 'object') {
          errors.push({
            fieldKey: field.fieldKey,
            message: `${field.label} must be a file reference`,
            code: 'invalid_file',
          })
        }
        break
      }
    }
  }

  return errors
}

// ─── Resolve Display Values ──────────────────────────────────────────────────

/**
 * Build resolved display labels and units for a specification's field values.
 */
export function resolveDisplayValues(
  fieldValues: object,
  fields: ProductField[],
): Record<string, { label: string; unit?: string; displayValue: string }> {
  const result: Record<
    string,
    { label: string; unit?: string; displayValue: string }
  > = {}

  const fieldMap = new Map(fields.map((f) => [f.fieldKey, f]))

  for (const [key, value] of Object.entries(fieldValues)) {
    const field = fieldMap.get(key)
    if (!field) continue

    let displayValue: string

    switch (field.fieldType) {
      case 'select': {
        const option = field.options.find((o) => o.value === value)
        displayValue = option?.label ?? String(value)
        break
      }

      case 'multi_select': {
        const arr = Array.isArray(value) ? value : [value]
        displayValue = arr
          .map((v) => {
            const option = field.options.find((o) => o.value === v)
            return option?.label ?? String(v)
          })
          .join(', ')
        break
      }

      case 'number_with_unit': {
        displayValue = field.unit ? `${value} ${field.unit}` : String(value)
        break
      }

      case 'boolean': {
        displayValue = value ? 'Yes' : 'No'
        break
      }

      case 'size_color_matrix': {
        const entries = Array.isArray(value) ? value : []
        displayValue = entries
          .map(
            (e: { size: string; color: string; quantity?: number }) =>
              `${e.size}/${e.color}${e.quantity ? ` ×${e.quantity}` : ''}`,
          )
          .join('; ')
        break
      }

      case 'artwork':
      case 'supporting_file': {
        displayValue = typeof value === 'string' ? value : 'File attached'
        break
      }

      default:
        displayValue = String(value)
    }

    result[key] = {
      label: field.label,
      unit: field.unit ?? undefined,
      displayValue,
    }
  }

  return result
}

// ─── Specification CRUD ──────────────────────────────────────────────────────

export async function createSpecification(
  input: Pick<
    Specification,
    'orgId' | 'productId' | 'submittedBy' | 'submittedByRole' | 'quantity'
  > & { orderId?: string },
): Promise<Specification> {
  const id = generateId()
  const now = new Date()

  const [row] = await db
    .insert(specifications)
    .values({
      id,
      orgId: input.orgId,
      productId: input.productId,
      orderId: input.orderId ?? null,
      submittedBy: input.submittedBy,
      submittedByRole: input.submittedByRole,
      status: 'draft',
      fieldValues: {},
      quantity: input.quantity,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  if (!row) throw new Error('Failed to create specification')
  return row as unknown as Specification
}

export async function getSpecification(
  id: string,
  orgId: string,
): Promise<Specification | null> {
  const [row] = await db
    .select()
    .from(specifications)
    .where(and(eq(specifications.id, id), eq(specifications.orgId, orgId)))
    .limit(1)

  return (row as unknown as Specification) ?? null
}

export async function listSpecifications(
  orgId: string,
  filters?: { productId?: string; status?: SpecificationStatus },
): Promise<Specification[]> {
  const conditions = [eq(specifications.orgId, orgId)]
  if (filters?.productId)
    conditions.push(eq(specifications.productId, filters.productId))
  if (filters?.status)
    conditions.push(eq(specifications.status, filters.status))

  const rows = await db
    .select()
    .from(specifications)
    .where(and(...conditions))
    .orderBy(specifications.createdAt)

  return rows as unknown as Specification[]
}

/**
 * Submit field values for a draft specification. Validates against fields
 * and constraints, resolves display values, and transitions status.
 */
export async function submitSpecification(
  id: string,
  orgId: string,
  fieldValues: object,
): Promise<Specification> {
  const spec = await getSpecification(id, orgId)
  if (!spec) throw new Error('Specification not found')
  if (spec.status !== 'draft' && spec.status !== 'rejected') {
    throw new Error(`Cannot submit specification with status "${spec.status}"`)
  }

  // Load product fields and constraints
  const fields = await listProductFields(orgId, spec.productId)
  const constraints = await listProductConstraints(orgId, spec.productId)

  // Validate
  const errors = validateConstraints(fieldValues, fields, constraints)
  const resolvedDisplay = resolveDisplayValues(fieldValues, fields)

  const hasErrors = errors.length > 0
  const newStatus: SpecificationStatus = hasErrors ? 'draft' : 'submitted'

  const [row] = await db
    .update(specifications)
    .set({
      fieldValues: fieldValues as Record<string, unknown>,
      resolvedDisplay,
      validationErrors: errors,
      status: newStatus,
      pricingStatus: hasErrors ? 'pending' : 'pending',
      updatedAt: new Date(),
    })
    .where(and(eq(specifications.id, id), eq(specifications.orgId, orgId)))
    .returning()

  if (!row) throw new Error('Failed to update specification')
  return row as unknown as Specification
}

/**
 * Commit a specification — creates immutable snapshots and locks status.
 */
export async function commitSpecification(
  id: string,
  orgId: string,
  committedBy: string,
): Promise<{ spec: Specification; snapshot: SpecificationSnapshot }> {
  const spec = await getSpecification(id, orgId)
  if (!spec) throw new Error('Specification not found')
  if (spec.status !== 'priced' && spec.status !== 'pricing_review') {
    throw new Error(`Cannot commit specification with status "${spec.status}"`)
  }

  // Check if pricing exists
  const [price] = await db
    .select()
    .from(specificationPrices)
    .where(eq(specificationPrices.specificationId, id))
    .limit(1)

  if (!price) throw new Error('Specification must be priced before commit')

  // Check for unresolved pricing review
  if (spec.status === 'pricing_review') {
    // Allow commit with manual override only
    if (!price.isOverridden) {
      throw new Error(
        'Cannot commit specification in pricing review without manual override',
      )
    }
  }

  // Create immutable snapshots
  const snapshotId = generateId()
  const now = new Date()

  const product = await getProduct(spec.productId, orgId)
  const fields = await listProductFields(orgId, spec.productId)
  const constraints = await listProductConstraints(orgId, spec.productId)

  await db.insert(specificationSnapshots).values({
    id: snapshotId,
    orgId,
    specificationId: id,
    productSnapshot: product
      ? {
          ...product,
          fields,
          constraints,
        }
      : {},
    fieldValuesSnapshot: spec.fieldValues as Record<string, unknown>,
    priceSnapshot: {
      unitPrice: price.unitPrice,
      totalPrice: price.totalPrice,
      currency: price.currency,
      breakdown: price.breakdown,
    },
    quantity: spec.quantity,
    committedBy,
    committedAt: now,
  })

  // Commit the price
  await db
    .update(specificationPrices)
    .set({
      committedAt: now,
      committedBy,
      updatedAt: now,
    })
    .where(eq(specificationPrices.specificationId, id))

  // Update spec status
  const [updatedSpec] = await db
    .update(specifications)
    .set({
      status: 'committed',
      committedAt: now,
      updatedAt: now,
    })
    .where(and(eq(specifications.id, id), eq(specifications.orgId, orgId)))
    .returning()

  if (!updatedSpec) throw new Error('Failed to commit specification')

  const [snapshot] = await db
    .select()
    .from(specificationSnapshots)
    .where(eq(specificationSnapshots.id, snapshotId))
    .limit(1)

  return {
    spec: updatedSpec as unknown as Specification,
    snapshot: snapshot as unknown as SpecificationSnapshot,
  }
}

/**
 * Reject a specification with a reason.
 */
export async function rejectSpecification(
  id: string,
  orgId: string,
  reason: string,
): Promise<Specification> {
  const spec = await getSpecification(id, orgId)
  if (!spec) throw new Error('Specification not found')
  if (spec.status === 'committed') {
    throw new Error('Cannot reject a committed specification')
  }

  const [row] = await db
    .update(specifications)
    .set({
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: new Date(),
    })
    .where(and(eq(specifications.id, id), eq(specifications.orgId, orgId)))
    .returning()

  if (!row) throw new Error('Failed to reject specification')
  return row as unknown as Specification
}

// ─── Pricing Basis ───────────────────────────────────────────────────────────

export async function upsertPricingBasis(
  input: Omit<PricingBasisConfig, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<PricingBasisConfig> {
  const now = new Date()

  // Check for existing
  const [existing] = await db
    .select()
    .from(pricingBasis)
    .where(eq(pricingBasis.productId, input.productId))
    .limit(1)

  if (existing) {
    const [row] = await db
      .update(pricingBasis)
      .set({
        basisType: input.basisType,
        currency: input.currency,
        precision: input.precision,
        roundingMode: input.roundingMode,
        minimumPrice: input.minimumPrice,
        approved: input.approved,
        approvedAt: input.approvedAt,
        approvedBy: input.approvedBy,
        updatedAt: now,
      })
      .where(eq(pricingBasis.productId, input.productId))
      .returning()

    if (!row) throw new Error('Failed to update pricing basis')
    return row as unknown as PricingBasisConfig
  }

  const id = generateId()
  const [row] = await db
    .insert(pricingBasis)
    .values({
      id,
      orgId: input.orgId,
      productId: input.productId,
      basisType: input.basisType,
      currency: input.currency,
      precision: input.precision,
      roundingMode: input.roundingMode,
      minimumPrice: input.minimumPrice,
      approved: input.approved,
      approvedAt: input.approvedAt,
      approvedBy: input.approvedBy,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  if (!row) throw new Error('Failed to create pricing basis')
  return row as unknown as PricingBasisConfig
}

export async function getProduct(
  id: string,
  orgId: string,
): Promise<Record<string, unknown> | null> {
  const [row] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.orgId, orgId)))
    .limit(1)

  return (row as Record<string, unknown>) ?? null
}

export async function getPricingBasis(
  productId: string,
  orgId: string,
): Promise<PricingBasisConfig | null> {
  const [row] = await db
    .select()
    .from(pricingBasis)
    .where(
      and(eq(pricingBasis.productId, productId), eq(pricingBasis.orgId, orgId)),
    )
    .limit(1)

  return (row as unknown as PricingBasisConfig) ?? null
}

export async function approvePricingBasis(
  productId: string,
  approvedBy: string,
): Promise<PricingBasisConfig> {
  const [row] = await db
    .update(pricingBasis)
    .set({
      approved: true,
      approvedAt: new Date(),
      approvedBy,
      updatedAt: new Date(),
    })
    .where(eq(pricingBasis.productId, productId))
    .returning()

  if (!row) throw new Error('Pricing basis not found')
  return row as unknown as PricingBasisConfig
}

// ─── Pricing Rules ───────────────────────────────────────────────────────────

export async function createPricingRule(
  input: Omit<PricingRuleConfig, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<PricingRuleConfig> {
  const id = generateId()
  const now = new Date()

  const [row] = await db
    .insert(pricingRules)
    .values({
      id,
      orgId: input.orgId,
      productId: input.productId,
      effectType: input.effectType,
      name: input.name,
      minQuantity: input.minQuantity,
      maxQuantity: input.maxQuantity,
      amount: input.amount,
      percentage: input.percentage,
      fieldKey: input.fieldKey,
      optionValue: input.optionValue,
      condition: input.condition as Record<string, unknown> | null,
      isSetup: input.isSetup,
      priority: input.priority,
      active: input.active,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  if (!row) throw new Error('Failed to create pricing rule')
  return row as unknown as PricingRuleConfig
}

export async function listPricingRules(
  orgId: string,
  productId: string,
): Promise<PricingRuleConfig[]> {
  const rows = await db
    .select()
    .from(pricingRules)
    .where(
      and(
        eq(pricingRules.orgId, orgId),
        eq(pricingRules.productId, productId),
        eq(pricingRules.active, true),
      ),
    )
    .orderBy(pricingRules.priority)

  return rows as unknown as PricingRuleConfig[]
}
export async function deletePricingRule(
  id: string,
  orgId: string,
): Promise<void> {
  await db
    .update(pricingRules)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(pricingRules.id, id), eq(pricingRules.orgId, orgId)))
}

// ─── Pricing Extensions ──────────────────────────────────────────────────────

export async function createPricingExtension(
  input: Omit<PricingExtension, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<PricingExtension> {
  const id = generateId()
  const now = new Date()

  const [row] = await db
    .insert(pricingExtensions)
    .values({
      id,
      orgId: input.orgId,
      productId: input.productId,
      name: input.name,
      version: input.version,
      status: input.status,
      config: input.config as Record<string, unknown>,
      effectType: input.effectType,
      priority: input.priority,
      active: input.active,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  if (!row) throw new Error('Failed to create pricing extension')
  return row as unknown as PricingExtension
}

export async function listPricingExtensions(
  orgId: string,
  productId: string,
): Promise<PricingExtension[]> {
  const rows = await db
    .select()
    .from(pricingExtensions)
    .where(
      and(
        eq(pricingExtensions.orgId, orgId),
        eq(pricingExtensions.productId, productId),
        eq(pricingExtensions.active, true),
      ),
    )
    .orderBy(pricingExtensions.priority)

  return rows as unknown as PricingExtension[]
}

// ─── Pricing Calculation ─────────────────────────────────────────────────────

/**
 * Evaluate a conditional expression against field values.
 * Supports simple comparisons: { field: 'x', op: 'eq'|'neq'|'gt'|'lt'|'gte'|'lte'|'in', value: ... }
 */
function evaluateCondition(condition: object, fieldValues: object): boolean {
  const fv = fieldValues as Record<string, unknown>
  const cond = condition as Record<string, unknown>
  const field = cond.field as string
  const op = cond.op as string
  const expected = cond.value
  const actual = fv[field]

  switch (op) {
    case 'eq':
      return actual === expected
    case 'neq':
      return actual !== expected
    case 'gt':
      return Number(actual) > Number(expected)
    case 'lt':
      return Number(actual) < Number(expected)
    case 'gte':
      return Number(actual) >= Number(expected)
    case 'lte':
      return Number(actual) <= Number(expected)
    case 'in':
      return Array.isArray(expected) && expected.includes(actual)
    case 'not_in':
      return Array.isArray(expected) && !expected.includes(actual)
    default:
      return true
  }
}

/**
 * Calculate the full price for a specification with all effects applied.
 * Returns a PricingResult with breakdown, extension statuses, and review flag.
 */
export async function calculatePrice(
  orgId: string,
  productId: string,
  quantity: number,
  fieldValues: object,
): Promise<PricingResult> {
  const fv = fieldValues as Record<string, unknown>
  // Load pricing basis
  const basis = await getPricingBasis(productId, orgId)
  if (!basis) {
    throw new Error('No pricing basis configured for this product')
  }
  if (!basis.approved) {
    throw new Error('Pricing basis is not approved')
  }

  // Load pricing rules
  const rules = await listPricingRules(orgId, productId)

  // Load pricing extensions
  const extensions = await listPricingExtensions(orgId, productId)

  // Load product fields for option lookups
  const _fields = await listProductFields(orgId, productId)
  void _fields

  // Start with base price from the product's quantity breakpoints
  // For now, use flat pricing from the product's basePrice
  // (In a full implementation, this would load from pricingBreakpoints)
  const product = await getProduct(productId, orgId)
  let baseUnitPrice = Number(product?.basePrice ?? 0)
  const breakdown: PricingBreakdownItem[] = []

  // ─── Step 1: Find applicable quantity break ──────────────────────────────

  const quantityBreakRules = rules
    .filter((r) => r.effectType === 'quantity_break')
    .sort((a, b) => (b.minQuantity ?? 0) - (a.minQuantity ?? 0))

  let appliedQuantityBreak: PricingRuleConfig | null = null
  for (const qb of quantityBreakRules) {
    const min = qb.minQuantity ?? 0
    const max = qb.maxQuantity ?? Infinity
    if (quantity >= min && quantity <= max) {
      appliedQuantityBreak = qb
      break
    }
  }

  if (appliedQuantityBreak) {
    baseUnitPrice = appliedQuantityBreak.amount ?? 0
    breakdown.push({
      label: appliedQuantityBreak.name,
      type: 'quantity_break',
      amount: baseUnitPrice * quantity,
      unitAmount: baseUnitPrice,
    })
  } else if (baseUnitPrice > 0) {
    breakdown.push({
      label: 'Base Price',
      type: 'quantity_break',
      amount: baseUnitPrice * quantity,
      unitAmount: baseUnitPrice,
    })
  }

  // ─── Step 2: Apply option surcharges ────────────────────────────────────

  const optionRules = rules
    .filter((r) => r.effectType === 'option_surcharge')
    .sort((a, b) => a.priority - b.priority)

  for (const rule of optionRules) {
    if (!rule.fieldKey || !rule.optionValue) continue
    const fieldValue = fv[rule.fieldKey]
    const isSelected = Array.isArray(fieldValue)
      ? fieldValue.includes(rule.optionValue)
      : fieldValue === rule.optionValue
    if (!isSelected) continue

    const amount = rule.amount ?? 0
    const unitAmount = amount
    baseUnitPrice += unitAmount
    breakdown.push({
      label: rule.name,
      type: 'option_surcharge',
      amount: unitAmount * quantity,
      unitAmount,
    })
  }

  // ─── Step 3: Apply material effects ─────────────────────────────────────

  const materialRules = rules
    .filter((r) => r.effectType === 'material_effect')
    .sort((a, b) => a.priority - b.priority)

  for (const rule of materialRules) {
    if (!rule.fieldKey) continue
    const fieldValue = fv[rule.fieldKey]
    const isSelected = Array.isArray(fieldValue)
      ? rule.optionValue && fieldValue.includes(rule.optionValue)
      : fieldValue === rule.optionValue
    if (!isSelected) continue

    const unitAmount = rule.amount ?? 0
    baseUnitPrice += unitAmount
    breakdown.push({
      label: rule.name,
      type: 'material_effect',
      amount: unitAmount * quantity,
      unitAmount,
    })
  }

  // ─── Step 4: Apply decoration method effects ────────────────────────────

  const decorationRules = rules
    .filter((r) => r.effectType === 'decoration_method')
    .sort((a, b) => a.priority - b.priority)

  for (const rule of decorationRules) {
    if (!rule.fieldKey || !rule.optionValue) continue
    const fieldValue = fv[rule.fieldKey]
    if (fieldValue !== rule.optionValue) continue

    const unitAmount = rule.amount ?? 0
    baseUnitPrice += unitAmount
    breakdown.push({
      label: rule.name,
      type: 'decoration_method',
      amount: unitAmount * quantity,
      unitAmount,
    })
  }

  // ─── Step 5: Apply placement surcharges ─────────────────────────────────

  const placementRules = rules
    .filter((r) => r.effectType === 'placement_surcharge')
    .sort((a, b) => a.priority - b.priority)

  for (const rule of placementRules) {
    if (!rule.condition) continue
    if (!evaluateCondition(rule.condition, fieldValues)) continue

    const unitAmount = rule.amount ?? 0
    baseUnitPrice += unitAmount
    breakdown.push({
      label: rule.name,
      type: 'placement_surcharge',
      amount: unitAmount * quantity,
      unitAmount,
    })
  }

  // ─── Step 6: Apply setup charges (one-time, not per unit) ───────────────

  const setupRules = rules.filter((r) => r.isSetup)
  let setupTotal = 0

  for (const rule of setupRules) {
    // Check condition if present
    if (rule.condition && !evaluateCondition(rule.condition, fieldValues))
      continue

    const amount = rule.amount ?? 0
    setupTotal += amount
    breakdown.push({
      label: rule.name,
      type: 'setup_charge',
      amount,
    })
  }

  // ─── Step 7: Apply additive effects ─────────────────────────────────────

  const additiveRules = rules
    .filter((r) => r.effectType === 'additive' && !r.isSetup)
    .sort((a, b) => a.priority - b.priority)

  for (const rule of additiveRules) {
    if (rule.condition && !evaluateCondition(rule.condition, fieldValues))
      continue

    const unitAmount = rule.amount ?? 0
    baseUnitPrice += unitAmount
    breakdown.push({
      label: rule.name,
      type: 'additive',
      amount: unitAmount * quantity,
      unitAmount,
    })
  }

  // ─── Step 8: Apply percentage effects ───────────────────────────────────

  const percentageRules = rules
    .filter((r) => r.effectType === 'percentage')
    .sort((a, b) => a.priority - b.priority)

  for (const rule of percentageRules) {
    if (rule.condition && !evaluateCondition(rule.condition, fieldValues))
      continue

    const pct = rule.percentage ?? 0
    const unitEffect = baseUnitPrice * pct
    baseUnitPrice += unitEffect
    breakdown.push({
      label: rule.name,
      type: 'percentage',
      amount: unitEffect * quantity,
      unitAmount: unitEffect,
    })
  }

  // ─── Step 9: Apply surcharge effects ────────────────────────────────────

  const surchargeRules = rules
    .filter((r) => r.effectType === 'surcharge')
    .sort((a, b) => a.priority - b.priority)

  for (const rule of surchargeRules) {
    if (rule.condition && !evaluateCondition(rule.condition, fieldValues))
      continue

    const unitAmount = rule.amount ?? 0
    baseUnitPrice += unitAmount
    breakdown.push({
      label: rule.name,
      type: 'surcharge',
      amount: unitAmount * quantity,
      unitAmount,
    })
  }

  // ─── Step 10: Process pricing extensions ────────────────────────────────

  const extensionStatuses: PricingResult['extensionStatuses'] = []
  let hasFailedExtensions = false

  for (const ext of extensions) {
    if (ext.status === 'failed' || ext.status === 'unavailable') {
      extensionStatuses.push({
        extensionId: ext.id,
        name: ext.name,
        status: ext.status,
        error:
          ext.status === 'failed'
            ? 'Extension has failed'
            : 'Extension is unavailable',
      })
      hasFailedExtensions = true
      continue
    }

    // Extension is active — for now, mark as active
    // In a full implementation, this would execute the extension logic
    extensionStatuses.push({
      extensionId: ext.id,
      name: ext.name,
      status: 'active',
    })
  }

  // ─── Step 11: Apply rounding ────────────────────────────────────────────

  let unitPrice = roundAmount(
    baseUnitPrice,
    basis.precision,
    basis.roundingMode,
  )

  // Enforce minimum price
  if (basis.minimumPrice !== null && unitPrice < basis.minimumPrice) {
    unitPrice = basis.minimumPrice
  }

  // Apply currency precision to final price
  const totalUnitComponents = unitPrice
  const totalPrice = roundAmount(
    totalUnitComponents * quantity + setupTotal,
    basis.precision,
    basis.roundingMode,
  )

  // Determine if pricing review is needed
  const inReview = hasFailedExtensions
  const reviewReason = hasFailedExtensions
    ? 'One or more required pricing extensions failed or are unavailable'
    : undefined

  return {
    unitPrice,
    totalPrice,
    currency: basis.currency,
    breakdown,
    extensionStatuses,
    inReview,
    reviewReason,
  }
}

/**
 * Save a pricing result for a specification.
 */
export async function savePricingResult(
  specificationId: string,
  orgId: string,
  result: PricingResult,
): Promise<SpecificationPrice> {
  const spec = await getSpecification(specificationId, orgId)
  if (!spec) throw new Error('Specification not found')

  // Delete existing price if any
  await db
    .delete(specificationPrices)
    .where(eq(specificationPrices.specificationId, specificationId))

  const id = generateId()
  const now = new Date()
  const newStatus: SpecificationStatus = result.inReview
    ? 'pricing_review'
    : 'priced'

  const [row] = await db
    .insert(specificationPrices)
    .values({
      id,
      orgId,
      specificationId,
      currency: result.currency,
      unitPrice: result.unitPrice,
      totalPrice: result.totalPrice,
      quantity: spec.quantity,
      breakdown: result.breakdown,
      isOverridden: false,
      extensionStatuses: result.extensionStatuses,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  if (!row) throw new Error('Failed to save pricing result')

  // Update specification status
  await db
    .update(specifications)
    .set({
      status: newStatus,
      pricingStatus: result.inReview ? 'review' : 'calculated',
      pricingReviewReason: result.reviewReason ?? null,
      updatedAt: now,
    })
    .where(
      and(
        eq(specifications.id, specificationId),
        eq(specifications.orgId, orgId),
      ),
    )

  return row as unknown as SpecificationPrice
}

// ─── Price Overrides ─────────────────────────────────────────────────────────

/**
 * Apply a manual price override with an audited reason.
 * The reason is immutable once saved.
 */
export async function applyPriceOverride(
  specificationId: string,
  orgId: string,
  overridePrice: number,
  reason: string,
  overrideBy: string,
): Promise<{ override: PriceOverride; price: SpecificationPrice }> {
  const spec = await getSpecification(specificationId, orgId)
  if (!spec) throw new Error('Specification not found')
  if (spec.status === 'committed') {
    throw new Error('Cannot override price of a committed specification')
  }

  // Load existing price
  const [existingPrice] = await db
    .select()
    .from(specificationPrices)
    .where(eq(specificationPrices.specificationId, specificationId))
    .limit(1)

  if (!existingPrice) {
    throw new Error('No pricing found for specification')
  }

  const now = new Date()

  // Create override record (immutable)
  const overrideId = generateId()
  const [override] = await db
    .insert(priceOverrides)
    .values({
      id: overrideId,
      orgId,
      specificationId,
      originalPrice: existingPrice.totalPrice,
      overridePrice,
      reason,
      overrideBy,
      createdAt: now,
    })
    .returning()

  if (!override) throw new Error('Failed to create price override')

  // Update the price record
  const [updatedPrice] = await db
    .update(specificationPrices)
    .set({
      totalPrice: overridePrice,
      unitPrice: roundAmount(overridePrice / spec.quantity, 0, 'half_up'),
      isOverridden: true,
      overrideId,
      updatedAt: now,
    })
    .where(eq(specificationPrices.specificationId, specificationId))
    .returning()

  if (!updatedPrice) throw new Error('Failed to update price')

  // Update spec status to priced (override resolves pricing review)
  await db
    .update(specifications)
    .set({
      status: 'priced',
      pricingStatus: 'overridden',
      pricingReviewReason: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(specifications.id, specificationId),
        eq(specifications.orgId, orgId),
      ),
    )

  return {
    override: override as unknown as PriceOverride,
    price: updatedPrice as unknown as SpecificationPrice,
  }
}

/**
 * Get the override history for a specification.
 */
export async function getOverrideHistory(
  specificationId: string,
  orgId: string,
): Promise<PriceOverride[]> {
  const rows = await db
    .select()
    .from(priceOverrides)
    .where(
      and(
        eq(priceOverrides.specificationId, specificationId),
        eq(priceOverrides.orgId, orgId),
      ),
    )
    .orderBy(priceOverrides.createdAt)

  return rows as unknown as PriceOverride[]
}

// ─── Snapshot Immutability ───────────────────────────────────────────────────

/**
 * Get all snapshots for a specification. Snapshots are read-only;
 * no update or delete functions exist by design.
 */
export async function getSpecificationSnapshots(
  specificationId: string,
): Promise<SpecificationSnapshot[]> {
  const rows = await db
    .select()
    .from(specificationSnapshots)
    .where(eq(specificationSnapshots.specificationId, specificationId))
    .orderBy(specificationSnapshots.committedAt)

  return rows as unknown as SpecificationSnapshot[]
}

/**
 * Get the committed price for a specification.
 */
export async function getSpecificationPrice(
  specificationId: string,
  orgId: string,
): Promise<SpecificationPrice | null> {
  const [row] = await db
    .select()
    .from(specificationPrices)
    .where(
      and(
        eq(specificationPrices.specificationId, specificationId),
        eq(specificationPrices.orgId, orgId),
      ),
    )
    .limit(1)

  return (row as unknown as SpecificationPrice) ?? null
}
