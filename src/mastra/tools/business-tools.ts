import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import {
  type AssistantDomain,
  type AssistantToolContext,
  assistantDomains,
  getAssistantBusinessOverview,
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
