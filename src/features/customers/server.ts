import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import type { Customer, CustomerInput, ListCustomersResult } from './model'
import {
  createCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from './model'

async function resolveOrgId(): Promise<string> {
  const { auth } = await import('#/lib/auth')
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')

  const { db } = await import('#/db/index')
  const { member } = await import('#/db/schema')
  const { eq } = await import('drizzle-orm')
  const memberships = await db
    .select({ orgId: member.organizationId })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1)

  if (memberships.length === 0) throw new Error('No organization')
  return memberships[0].orgId
}

export const listCustomersFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { orgId: string; search?: string }) => data)
  .handler(async ({ data }): Promise<ListCustomersResult> => {
    return listCustomers(data.orgId, data.search)
  })

export const createCustomerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CustomerInput) => input)
  .handler(
    async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
      const orgId = await resolveOrgId()
      try {
        await createCustomer({ ...data, orgId })
        return { ok: true }
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
