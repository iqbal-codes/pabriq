import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import {
  createAssistantCustomer,
  searchAssistantCustomers,
  updateAssistantCustomer,
} from '#/features/assistant/model'
import type { CustomerRow } from '#/features/customers/model'
import { readAssistantToolContext } from '#/mastra/tools/business-tools'

const customerRowSchema: z.ZodType<CustomerRow> = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  active: z.boolean(),
  photoAssetId: z.string().nullable(),
  createdAt: z.date(),
})

export const searchCustomerTool = createTool({
  id: 'search-customers',
  description:
    'Search customers in the organization by name, email, or phone number.',
  inputSchema: z.object({
    query: z.string().trim().min(1).max(120),
  }),
  outputSchema: z.array(customerRowSchema),
  execute: async (inputData, context) => {
    const { orgId } = readAssistantToolContext(context)
    return searchAssistantCustomers({
      orgId,
      query: inputData.query,
    })
  },
})

export const createCustomerTool = createTool({
  id: 'create-customer',
  description: 'Create a new customer in the organization.',
  inputSchema: z.object({
    name: z.string().trim().min(1),
    email: z.string().email().optional(),
    phone: z
      .string()
      .regex(/^\d{8,16}$/)
      .optional(),
    notes: z.string().optional(),
    active: z.boolean().optional(),
    isWni: z.boolean().optional(),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    id: z.string().optional(),
    url: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const { orgId } = readAssistantToolContext(context)
    return createAssistantCustomer({
      orgId,
      ...inputData,
    })
  },
})

export const updateCustomerTool = createTool({
  id: 'update-customer',
  description: 'Update an existing customer in the organization.',
  inputSchema: z.object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1).optional(),
    email: z.string().email().optional(),
    phone: z
      .string()
      .regex(/^\d{8,16}$/)
      .optional(),
    notes: z.string().optional(),
    active: z.boolean().optional(),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    id: z.string().optional(),
    url: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const { orgId } = readAssistantToolContext(context)
    return updateAssistantCustomer({
      orgId,
      ...inputData,
    })
  },
})
