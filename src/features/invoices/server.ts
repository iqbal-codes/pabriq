import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'
import {
  canManageInvoices,
  canManagePaymentSettings,
} from '#/features/permissions/model'
import { getPortalOrder } from '#/features/portal/model'
import { resolveOrgAndRole, resolveOrgId } from '#/lib/auth-session-server'
import type { MutationResult } from '#/lib/server-results'
import type {
  CreateInvoiceInput,
  GetInvoiceResult,
  InvoicePaymentProof,
  ListInvoicesParams,
  ListInvoicesResult,
  PaymentMethod,
} from './model'
import { createMidtransTransaction } from './model'

export const createInvoiceFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateInvoiceInput) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const { orgId, role } = await resolveOrgAndRole()
    if (!canManageInvoices(role as 'owner' | 'admin' | 'member')) {
      return { ok: false, error: 'Insufficient permissions' }
    }
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
    const [orgId, { getInvoice }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return getInvoice(data.id, orgId)
  })

export const listInvoicesFn = createServerFn({ method: 'GET' })
  .inputValidator((data: ListInvoicesParams) => data)
  .handler(async ({ data }): Promise<ListInvoicesResult> => {
    const [orgId, { listInvoices }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return listInvoices({ ...data, orgId })
  })

export const markInvoicePaidFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const [{ orgId, role }, { auth }, { markInvoicePaid }] = await Promise.all([
      resolveOrgAndRole(),
      import('#/lib/auth'),
      import('./model'),
    ])
    if (!canManageInvoices(role as 'owner' | 'admin' | 'member')) {
      return { ok: false, error: 'Insufficient permissions' }
    }
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    const userId = session?.user.id ?? 'unknown'
    try {
      await markInvoicePaid(data.id, orgId, userId)
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
    const [orgId, { listPaymentMethods }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return listPaymentMethods(orgId)
  })

export const createPaymentMethodFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: Omit<PaymentMethod, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>) =>
      input,
  )
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const [{ orgId, role }, { createPaymentMethod }] = await Promise.all([
        resolveOrgAndRole(),
        import('./model'),
      ])
      if (!canManagePaymentSettings(role as 'owner' | 'admin' | 'member')) {
        return { ok: false, error: 'Insufficient permissions' }
      }
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
    const { orgId, role } = await resolveOrgAndRole()
    if (!canManagePaymentSettings(role as 'owner' | 'admin' | 'member')) {
      return { ok: false, error: 'Insufficient permissions' }
    }
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
    const { orgId, role } = await resolveOrgAndRole()
    if (!canManagePaymentSettings(role as 'owner' | 'admin' | 'member')) {
      return { ok: false, error: 'Insufficient permissions' }
    }
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

// ── Zod Schemas ────────────────────────────────────────────────

const createPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(['bank_transfer', 'midtrans', 'cash']),
  reference: z.string().optional(),
  proofAssetId: z.string().optional(),
  receivedAt: z.string().datetime().optional(),
})

// ── Payment Server Functions ───────────────────────────────────

export const createPaymentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createPaymentSchema.parse(input))
  .handler(async ({ data }): Promise<MutationResult> => {
    const { orgId, role } = await resolveOrgAndRole()
    if (!canManageInvoices(role as 'owner' | 'admin' | 'member')) {
      return { ok: false, error: 'Insufficient permissions' }
    }
    try {
      const { createPayment } = await import('./model')
      await createPayment(orgId, {
        invoiceId: data.invoiceId,
        amount: data.amount,
        method: data.method,
        reference: data.reference,
        proofAssetId: data.proofAssetId,
        receivedAt: data.receivedAt ? new Date(data.receivedAt) : undefined,
      })
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const getInvoicePaymentProofsForInvoicesFn = createServerFn({
  method: 'GET',
})
  .inputValidator((input: { invoiceIds: string[] }) => input)
  .handler(async ({ data }): Promise<Record<string, InvoicePaymentProof[]>> => {
    const [orgId, { getPaymentProofsForInvoices }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return getPaymentProofsForInvoices(orgId, data.invoiceIds)
  })
export const createSnapTokenFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      invoiceId: z.string(),
      token: z.string(),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<
      | {
          ok: true
          snapToken: string
          clientKey: string
          isProduction: boolean
        }
      | { ok: false; error: string }
    > => {
      try {
        const portalOrderResult = await getPortalOrder(data.token)
        if (!portalOrderResult.ok) {
          return { ok: false, error: 'Invalid token' }
        }
        const hasInvoice = portalOrderResult.order.invoices.some(
          (inv) => inv.id === data.invoiceId,
        )
        if (!hasInvoice) {
          return { ok: false, error: 'Invoice not found in this order' }
        }
        const orgId = portalOrderResult.order.orgId
        const {
          token: snapToken,
          clientKey,
          isProduction,
        } = await createMidtransTransaction(data.invoiceId, orgId)
        return { ok: true, snapToken, clientKey, isProduction }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        }
      }
    },
  )

type ReconcilePaymentResponse =
  | {
      ok: true
      status: 'paid'
      reason: 'confirmed' | 'already_paid'
      paymentId?: string
    }
  | {
      ok: true
      status: 'not_settled_yet' | 'no_midtrans_order_id' | 'mismatch'
    }
  | { ok: false; error: string }
/**
 * Portal-side reconciliation: customer calls this when the post-pay poll
 * times out (webhook never arrived but they did pay). Resolves the org from
 * the portal token.
 */
export const reconcilePortalPaymentFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      invoiceId: z.string(),
      token: z.string(),
    }),
  )
  .handler(async ({ data }): Promise<ReconcilePaymentResponse> => {
    try {
      const portalOrderResult = await getPortalOrder(data.token)
      if (!portalOrderResult.ok) {
        return { ok: false, error: 'Invalid token' }
      }
      const hasInvoice = portalOrderResult.order.invoices.some(
        (inv) => inv.id === data.invoiceId,
      )
      if (!hasInvoice) {
        return { ok: false, error: 'Invoice not found in this order' }
      }
      const orgId = portalOrderResult.order.orgId
      const { reconcilePayment } = await import('./model')
      const result = await reconcilePayment(orgId, data.invoiceId)
      if (!result.ok) return { ok: false, error: result.error }
      if (result.confirmed) {
        return {
          ok: true,
          status: 'paid',
          reason: result.reason === 'confirmed' ? 'confirmed' : 'already_paid',
          paymentId: result.paymentId,
        }
      }
      // result.confirmed is false → reason is one of the not-paid cases
      return {
        ok: true,
        status: result.reason as
          | 'not_settled_yet'
          | 'no_midtrans_order_id'
          | 'mismatch',
      }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })
