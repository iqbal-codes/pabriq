import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import {
  type AssistantLineItemInput,
  getAssistantOrder,
  searchAssistantOrders,
  updateAssistantDraftOrder,
} from '#/features/assistant/model'
import { readAssistantToolContext } from '#/mastra/tools/business-tools'

export const searchOrderTool = createTool({
  id: 'search-orders',
  description:
    'Search orders in the organization with optional filtering by query, status, customer, or creation date range.',
  inputSchema: z.object({
    query: z.string().trim().min(1).max(120).optional(),
    status: z.string().optional(),
    customerId: z.string().optional(),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  outputSchema: z.array(
    z.object({
      id: z.string(),
      orderNumber: z.string().nullable(),
      customerName: z.string().nullable(),
      status: z.string(),
      total: z.number(),
      createdAt: z.string(),
    }),
  ),
  execute: async (inputData, context) => {
    const { orgId } = readAssistantToolContext(context)
    return searchAssistantOrders({
      orgId,
      query: inputData.query,
      status: inputData.status,
      customerId: inputData.customerId,
      dateFrom: inputData.dateFrom,
      dateTo: inputData.dateTo,
    })
  },
})

export const getOrderTool = createTool({
  id: 'get-order',
  description:
    'Get details of a specific order including line items and customer name.',
  inputSchema: z.object({
    orderId: z.string().trim().min(1),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    order: z
      .object({
        id: z.string(),
        orgId: z.string(),
        customerId: z.string().nullable(),
        status: z.string(),
        notes: z.string().nullable(),
        total: z.number(),
        orderNumber: z.string().nullable(),
        deadline: z.date().nullable(),
        manualDeadline: z.boolean(),
        createdAt: z.date(),
        updatedAt: z.date(),
      })
      .passthrough()
      .optional(),
    lineItems: z
      .array(
        z
          .object({
            id: z.string(),
            productId: z.string(),
            quantity: z.number(),
            unitPrice: z.number(),
            total: z.number(),
            productName: z.string(),
            designName: z.string().nullable(),
            notes: z.string().nullable(),
            productionDays: z.number(),
            deadline: z.date(),
            isRepeatOrder: z.boolean(),
            manualDeadline: z.boolean(),
            selectedAddons: z.array(
              z.object({
                id: z.string(),
                productAddonId: z.string().nullable(),
                name: z.string(),
                unitSurcharge: z.number(),
              }),
            ),
          })
          .passthrough(),
      )
      .optional(),
    customerName: z.string().nullable().optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const { orgId } = readAssistantToolContext(context)
    return getAssistantOrder({
      orgId,
      orderId: inputData.orderId,
    })
  },
})

export const updateDraftOrderTool = createTool({
  id: 'update-draft-order',
  description:
    'Update customer, notes, line items, or deadline of a draft order.',
  inputSchema: z.object({
    orderId: z.string().trim().min(1),
    customerId: z.string().optional(),
    notes: z.string().optional(),
    lineItems: z
      .array(
        z.object({
          id: z.string().optional(),
          productId: z.string(),
          quantity: z.number().int().positive(),
          designName: z.string().optional(),
          notes: z.string().optional(),
          addonIds: z.array(z.string()).optional(),
          isRepeatOrder: z.boolean().optional(),
          deadline: z.string().optional(),
        }),
      )
      .optional(),
    deadline: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    orderId: z.string().optional(),
    adminUrl: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const { orgId } = readAssistantToolContext(context)
    return updateAssistantDraftOrder({
      orgId,
      orderId: inputData.orderId,
      customerId: inputData.customerId,
      notes: inputData.notes,
      lineItems: inputData.lineItems as AssistantLineItemInput[] | undefined,
      deadline: inputData.deadline,
    })
  },
})
