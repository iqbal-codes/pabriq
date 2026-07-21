import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import {
  type AssistantDomain,
  type AssistantToolContext,
  assistantDomains,
  getAssistantBusinessOverview,
  resolveOrderDraft,
  proposeOrderDraft,
  confirmOrderDraft,
  searchAssistantBusinessRecords,
} from '#/features/assistant/model'

function readAssistantToolContext(context: unknown): AssistantToolContext {
  const ctx = context as Record<string, unknown> | undefined
  const requestContext = ctx?.requestContext as
    | { get(key: string): unknown }
    | undefined

  if (!requestContext) {
    throw new Error('Assistant request context is missing')
  }

  const orgId = requestContext.get('orgId')
  const userId = requestContext.get('userId')
  const role = requestContext.get('role')

  if (
    typeof orgId !== 'string' ||
    typeof userId !== 'string' ||
    (role !== 'owner' && role !== 'admin' && role !== 'member')
  ) {
    throw new Error('Assistant request context is missing')
  }

  return { orgId, userId, role }
}

export const businessSearchTool = createTool({
  id: 'business-search',
  description:
    'Search Pabriq business records the current user is allowed to view.',
  inputSchema: z.object({
    query: z.string().trim().min(1).max(120),
    domains: z.array(z.enum(assistantDomains)).optional(),
    limit: z.number().int().min(1).max(5).default(3),
  }),
  outputSchema: z.object({
    records: z.array(
      z.object({
        domain: z.enum(assistantDomains),
        id: z.string(),
        title: z.string(),
        subtitle: z.string().nullable(),
        href: z.string().nullable(),
        metadata: z.record(
          z.string(),
          z.union([z.string(), z.number(), z.boolean(), z.null()]),
        ),
      }),
    ),
    omittedDomains: z.array(z.enum(assistantDomains)),
  }),
  execute: async (inputData, context) => {
    const toolContext = readAssistantToolContext(context)
    return searchAssistantBusinessRecords({
      context: toolContext,
      query: inputData.query,
      domains: inputData.domains as AssistantDomain[] | undefined,
      limit: inputData.limit,
    })
  },
})

export const businessOverviewTool = createTool({
  id: 'business-overview',
  description:
    'Summarize counts for Pabriq business areas the current user is allowed to view.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    customers: z.number().nullable(),
    activeProducts: z.number().nullable(),
    openOrders: z.number().nullable(),
    unpaidInvoices: z.number().nullable(),
    activeProductionTasks: z.number().nullable(),
    omittedDomains: z.array(z.enum(assistantDomains)),
  }),
  execute: async (_inputData, context) => {
    const toolContext = readAssistantToolContext(context)
    return getAssistantBusinessOverview(toolContext)
  },
})

export const resolveOrderDraftTool = createTool({
  id: 'resolve-order-draft',
  description:
    'Resolve free-form product hints and quantities into priced line items for a draft order. Returns resolved products with exact pricing, or lists ambiguous/invalid candidates.',
  inputSchema: z.object({
    candidates: z
      .array(
        z.object({
          productHint: z.string().trim().min(1),
          quantity: z.number().int().positive(),
        }),
      )
      .min(1),
    customerHint: z.string().trim().min(1).nullable().optional(),
  }),
  outputSchema: z.object({
    status: z.enum(['resolved', 'ambiguous', 'invalid']),
    lineItems: z
      .array(
        z.object({
          productId: z.string(),
          productName: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
          total: z.number(),
          minQuantity: z.number(),
        }),
      )
      .optional(),
    missing: z
      .array(
        z.object({
          productHint: z.string(),
          quantity: z.number(),
          matchedProductIds: z.array(z.string()),
        }),
      )
      .optional(),
    customer: z
      .object({ id: z.string(), name: z.string(), phone: z.string().nullable() })
      .nullable()
      .optional(),
    customerAmbiguous: z
      .array(z.object({ id: z.string(), name: z.string() }))
      .optional(),
    total: z.number(),
  }),
  execute: async (inputData, context) => {
    const toolContext = readAssistantToolContext(context)
    return resolveOrderDraft({
      orgId: toolContext.orgId,
      candidates: inputData.candidates,
      customerHint: inputData.customerHint ?? null,
    })
  },
})

export const proposeOrderDraftTool = createTool({
  id: 'propose-order-draft',
  description:
    'Resolve free-form product hints into priced line items and persist a pending order proposal. Returns the resolved proposal summary or lists issues.',
  inputSchema: z.object({
    candidates: z
      .array(
        z.object({
          productHint: z.string().trim().min(1),
          quantity: z.number().int().positive(),
        }),
      )
      .min(1),
    customerHint: z.string().trim().min(1).nullable().optional(),
  }),
  outputSchema: z.object({
    status: z.enum(['resolved', 'ambiguous', 'invalid']),
    actionId: z.string().optional(),
    lineItems: z
      .array(
        z.object({
          productId: z.string(),
          productName: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
          total: z.number(),
          minQuantity: z.number(),
        }),
      )
      .optional(),
    missing: z
      .array(
        z.object({
          productHint: z.string(),
          quantity: z.number(),
          matchedProductIds: z.array(z.string()),
        }),
      )
      .optional(),
    customer: z
      .object({ id: z.string(), name: z.string(), phone: z.string().nullable() })
      .nullable()
      .optional(),
    total: z.number(),
  }),
  execute: async (inputData, context) => {
    const toolContext = readAssistantToolContext(context)
    return proposeOrderDraft({
      orgId: toolContext.orgId,
      userId: toolContext.userId,
      candidates: inputData.candidates,
      customerHint: inputData.customerHint ?? null,
    })
  },
})

export const confirmOrderDraftTool = createTool({
  id: 'confirm-order-draft',
  description:
    'Confirm a previously proposed order draft and create the actual order. Returns URLs for the created order.',
  inputSchema: z.object({
    actionId: z.string().trim().min(1),
  }),
  outputSchema: z.object({
    status: z.enum(['confirmed', 'expired', 'not_found']),
    orderId: z.string().optional(),
    orderNumber: z.string().optional(),
    portalUrl: z.string().optional(),
    adminUrl: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const toolContext = readAssistantToolContext(context)
    return confirmOrderDraft({
      actionId: inputData.actionId,
      orgId: toolContext.orgId,
      userId: toolContext.userId,
    })
  },
})
