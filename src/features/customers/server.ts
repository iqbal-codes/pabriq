import { createServerFn } from '@tanstack/react-start'
import { resolveOrgId } from '#/lib/auth-session'
import type {
  Customer,
  CustomerInput,
  ListCustomersParams,
  ListCustomersResult,
} from './model'
import {
  createCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from './model'

export const listCustomersFn = createServerFn({ method: 'GET' })
  .inputValidator((data: ListCustomersParams) => data)
  .handler(async ({ data }): Promise<ListCustomersResult> => {
    return listCustomers(data)
  })

export const createCustomerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CustomerInput) => input)
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
  .inputValidator((input: CustomerInput & { id: string }) => input)
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
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<Customer | null> => {
    const orgId = await resolveOrgId()
    return getCustomer(data.id, orgId)
  })
