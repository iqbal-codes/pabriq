import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { resolveOrgId } from '#/lib/auth-session-server'
import type {
  Customer,
  ListCustomersParams,
  ListCustomersResult,
} from './model'
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from './model'

const sortStateSchema = z
  .object({
    field: z.string().trim().max(50),
    direction: z.enum(['asc', 'desc']),
  })
  .nullable()
  .optional()

const shippingAddressSchema = z
  .object({
    areaId: z.string().trim().max(100),
    areaName: z.string().trim().max(200),
    streetAddress: z.string().trim().max(500),
  })
  .nullable()
  .optional()

const customerInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  active: z.boolean().optional(),
  isWni: z.boolean().optional(),
  photoAssetId: z.string().trim().max(100).nullable().optional(),
  address: shippingAddressSchema,
})

const listCustomersParamsSchema = z.object({
  orgId: z.string().trim().min(1).max(100),
  search: z.string().trim().max(100).optional(),
  status: z.string().trim().max(50).optional(),
  sort: sortStateSchema,
  page: z.number().int().min(1).max(10000).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
})
export const listCustomersFn = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => listCustomersParamsSchema.parse(data))
  .handler(async ({ data }): Promise<ListCustomersResult> => {
    const orgId = await resolveOrgId()
    return listCustomers({ ...(data as unknown as ListCustomersParams), orgId })
  })

export const createCustomerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => customerInputSchema.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
      const orgId = await resolveOrgId()
      try {
        const id = await createCustomer({ ...data, orgId })
        return { ok: true, id }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        }
      }
    },
  )

export const updateCustomerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) =>
    customerInputSchema
      .extend({ id: z.string().trim().min(1).max(100) })
      .parse(input),
  )
  .handler(
    async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
      const orgId = await resolveOrgId()
      try {
        await updateCustomer(data.id, orgId, data)
        return { ok: true }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        }
      }
    },
  )

export const getCustomerFn = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().trim().min(1).max(100) }).parse(data),
  )
  .handler(async ({ data }): Promise<Customer | null> => {
    const orgId = await resolveOrgId()
    return getCustomer(data.id, orgId)
  })

export const deleteCustomerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().trim().min(1).max(100) }).parse(input),
  )
  .handler(
    async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
      const orgId = await resolveOrgId()
      try {
        await deleteCustomer(data.id, orgId)
        return { ok: true }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        }
      }
    },
  )
