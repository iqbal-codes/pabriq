import { z } from 'zod'

export const ITEMIZATION_MODES = ['uniform', 'matrix', 'per_item'] as const
export type ItemizationMode = (typeof ITEMIZATION_MODES)[number]

export const TEMPLATE_FIELD_TYPES = [
  'text',
  'text_per_item',
  'number_per_item',
  'select',
  'file',
  'matrix',
] as const
export type TemplateFieldType = (typeof TEMPLATE_FIELD_TYPES)[number]

export type TemplateFieldDefinition = {
  key: string
  type: TemplateFieldType
  label: string
  required: boolean
  options?: string[]
}

export type PricingDefaults = {
  basePrice: number
  productionDays: number
  minQuantity: number
  maxQuantity?: number | null
  negotiateAboveQuantity?: number | null
  repeatOrderUnitPrice?: number | null
  repeatOrderMinQuantity?: number | null
  maxProductionQuantity?: number | null
  pricingMode?: 'interpolated' | 'step'
}

export type ProductionDefaults = {
  notes: string | null
}

export type WorkflowStageDefault = {
  key: string
  label: string
  board: string
  position: number
}

export type BomCondition = {
  fieldKey: string
  operator: 'equals' | 'in'
  value: string | number | boolean | string[]
}

export type BomTemplateItem = {
  materialId: string
  basis: 'per_order' | 'per_item' | 'matrix' | 'per_item_field'
  quantity: number
  unit: string
  wastePercent: number
  critical: boolean
  condition?: BomCondition
  fieldKey?: string
}

export type ProductTemplateConfiguration = {
  itemizationMode: ItemizationMode
  fields: TemplateFieldDefinition[]
  pricing: PricingDefaults
  production: ProductionDefaults
  workflowStages: WorkflowStageDefault[]
  bom: BomTemplateItem[]
}

export type BusinessTemplateConfiguration = {
  productTemplates: Array<{
    sourceKey?: string
    name: string
    description: string | null
    configuration: ProductTemplateConfiguration
  }>
}

const nonNegativeNumber = z.number().finite().min(0)
const positiveInteger = z.number().int().min(1)
const optionalNonNegativeNumber = nonNegativeNumber.nullable().optional()

export const fieldSchema = z
  .object({
    key: z.string().trim().min(1),
    type: z.enum(TEMPLATE_FIELD_TYPES),
    label: z.string().trim().min(1),
    required: z.boolean(),
    options: z.array(z.string().trim().min(1)).min(1).optional(),
  })
  .strict()
  .superRefine((field, context) => {
    if (field.type === 'select' && !field.options) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Select fields require options',
      })
    }
    if (field.type !== 'select' && field.options) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Only select fields may define options',
      })
    }
  })

const pricingSchema = z
  .object({
    basePrice: nonNegativeNumber,
    productionDays: positiveInteger,
    minQuantity: positiveInteger,
    maxQuantity: optionalNonNegativeNumber,
    negotiateAboveQuantity: optionalNonNegativeNumber,
    repeatOrderUnitPrice: optionalNonNegativeNumber,
    repeatOrderMinQuantity: optionalNonNegativeNumber,
    maxProductionQuantity: optionalNonNegativeNumber,
    pricingMode: z.enum(['interpolated', 'step']).optional(),
  })
  .strict()

const productionSchema = z
  .object({
    notes: z.string().nullable(),
  })
  .strict()

export const workflowStageSchema = z
  .object({
    key: z.string().trim().min(1),
    label: z.string().trim().min(1),
    board: z.string().trim().min(1),
    position: z.number().int().min(0),
  })
  .strict()

const bomConditionSchema = z
  .object({
    fieldKey: z.string().trim().min(1),
    operator: z.enum(['equals', 'in']),
    value: z.union([
      z.string(),
      z.number().finite(),
      z.boolean(),
      z.array(z.string().min(1)).min(1),
    ]),
  })
  .strict()

export const bomSchema = z
  .object({
    materialId: z.string().trim().min(1),
    basis: z.enum(['per_order', 'per_item', 'matrix', 'per_item_field']),
    quantity: nonNegativeNumber,
    unit: z.string().trim().min(1),
    wastePercent: z.number().finite().min(0).max(100),
    critical: z.boolean(),
    condition: bomConditionSchema.optional(),
    fieldKey: z.string().trim().min(1).optional(),
  })
  .strict()

const productTemplateConfigurationSchema = z
  .object({
    itemizationMode: z.enum(ITEMIZATION_MODES),
    fields: z.array(fieldSchema),
    pricing: pricingSchema,
    production: productionSchema,
    workflowStages: z.array(workflowStageSchema),
    bom: z.array(bomSchema),
  })
  .strict()
  .superRefine((configuration, context) => {
    const keys = new Set<string>()
    for (const [index, field] of configuration.fields.entries()) {
      if (keys.has(field.key)) {
        context.addIssue({
          code: 'custom',
          path: ['fields', index, 'key'],
          message: 'Field keys must be unique',
        })
      }
      keys.add(field.key)
    }

    for (const [index, item] of configuration.bom.entries()) {
      if (item.basis === 'per_item_field' && !item.fieldKey) {
        context.addIssue({
          code: 'custom',
          path: ['bom', index, 'fieldKey'],
          message: 'Per-item-field BOM items require a field key',
        })
      }
    }
  })

export function validateProductTemplateConfiguration(
  input: unknown,
): ProductTemplateConfiguration {
  return productTemplateConfigurationSchema.parse(input)
}
