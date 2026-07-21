import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import {
  createAssistantProduct,
  searchAssistantProducts,
  updateAssistantProduct,
} from '#/features/assistant/model'
import type { ProductRow } from '#/features/products/model'
import { readAssistantToolContext } from '#/mastra/tools/business-tools'

const productRowSchema: z.ZodType<ProductRow> = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  active: z.boolean(),
  primaryImageAssetId: z.string().nullable(),
  basePrice: z.number(),
  productionDays: z.number(),
  minQuantity: z.number(),
  maxQuantity: z.number().nullable(),
  negotiateAboveQuantity: z.number().nullable(),
  repeatOrderUnitPrice: z.number().nullable(),
  repeatOrderMinQuantity: z.number().nullable(),
  maxProductionQuantity: z.number().nullable(),
  minDiscountPrice: z.number().nullable(),
  pricingMode: z.enum(['step', 'interpolated']),
  category: z.string().nullable(),
  createdAt: z.date(),
})

const mutationOutputSchema = z.object({
  ok: z.boolean(),
  id: z.string().optional(),
  url: z.string().optional(),
  error: z.string().optional(),
})

export const searchProductTool = createTool({
  id: 'search-products',
  description:
    'Search products in the organization by name, category, or active status.',
  inputSchema: z.object({
    query: z.string().trim().min(1).max(120).default(''),
    activeOnly: z.boolean().optional(),
  }),
  outputSchema: z.array(productRowSchema),
  execute: async (inputData, context) => {
    const toolContext = readAssistantToolContext(context)
    return searchAssistantProducts({
      orgId: toolContext.orgId,
      query: inputData.query,
      activeOnly: inputData.activeOnly,
    })
  },
})

export const createProductTool = createTool({
  id: 'create-product',
  description: 'Create a new product in the organization.',
  inputSchema: z.object({
    name: z.string().trim().min(1),
    description: z.string().optional(),
    category: z.string().optional(),
    basePrice: z.number().int().min(0),
    minQuantity: z.number().int().min(1),
    pricingMode: z.enum(['interpolated', 'step']),
    productionDays: z.number().int().min(1),
    maxProductionQuantity: z.number().int().min(1).optional(),
    repeatOrderMinQuantity: z.number().int().min(1).optional(),
  }),
  outputSchema: mutationOutputSchema,
  execute: async (inputData, context) => {
    const toolContext = readAssistantToolContext(context)
    return createAssistantProduct({
      orgId: toolContext.orgId,
      ...inputData,
    })
  },
})

export const updateProductTool = createTool({
  id: 'update-product',
  description: 'Update an existing product in the organization.',
  inputSchema: z.object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    basePrice: z.number().int().min(0).optional(),
    minQuantity: z.number().int().min(1).optional(),
    productionDays: z.number().int().min(1).optional(),
    active: z.boolean().optional(),
  }),
  outputSchema: mutationOutputSchema,
  execute: async (inputData, context) => {
    const toolContext = readAssistantToolContext(context)
    return updateAssistantProduct({
      orgId: toolContext.orgId,
      ...inputData,
    })
  },
})
