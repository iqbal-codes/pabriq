import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import type {
  CreateInvoiceInput,
  GetInvoiceResult,
  ListInvoicesParams,
  ListInvoicesResult,
  PaymentMethod,
} from './model'

type MutationResult = { ok: true } | { ok: false; error: string }

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

export const createInvoiceFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateInvoiceInput) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { createInvoice } = await import('./model')
      await createInvoice(orgId, data)
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const getInvoiceFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<GetInvoiceResult | null> => {
    const orgId = await resolveOrgId()
    const { getInvoice } = await import('./model')
    return getInvoice(data.id, orgId)
  })

export const listInvoicesFn = createServerFn({ method: 'GET' })
  .inputValidator((data: ListInvoicesParams) => data)
  .handler(async ({ data }): Promise<ListInvoicesResult> => {
    const { listInvoices } = await import('./model')
    return listInvoices(data)
  })

export const markInvoicePaidFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { auth } = await import('#/lib/auth')
      const headers = getRequestHeaders()
      const session = await auth.api.getSession({ headers })
      const userId = session?.user.id ?? 'unknown'
      const { markInvoicePaid } = await import('./model')
      await markInvoicePaid(data.id, orgId, userId)
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const voidInvoiceFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { voidInvoice } = await import('./model')
      await voidInvoice(data.id, orgId)
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const listPaymentMethodsFn = createServerFn({ method: 'GET' })
  .inputValidator((input: Record<string, never>) => input)
  .handler(async (): Promise<PaymentMethod[]> => {
    const orgId = await resolveOrgId()
    const { listPaymentMethods } = await import('./model')
    return listPaymentMethods(orgId)
  })

export const createPaymentMethodFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: Omit<PaymentMethod, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>) =>
      input,
  )
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { createPaymentMethod } = await import('./model')
      await createPaymentMethod({ ...data, orgId })
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const updatePaymentMethodFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (
      input: {
        id: string
      } & Partial<
        Omit<PaymentMethod, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>
      >,
    ) => input,
  )
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { updatePaymentMethod } = await import('./model')
      await updatePaymentMethod(data.id, orgId, data)
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const deletePaymentMethodFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { deletePaymentMethod } = await import('./model')
      await deletePaymentMethod(data.id, orgId)
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })
