import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'
import {
  canManageInvoices,
  canManagePaymentSettings,
} from '#/features/permissions/model'
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

const confirmPaymentSchema = z.object({
  paymentId: z.string().min(1),
})

const rejectPaymentSchema = z.object({
  paymentId: z.string().min(1),
  reason: z.string().trim().min(1, 'Reason is required'),
})

async function withInvoiceManagement<T>(
  handler: (ctx: {
    orgId: string
    role: 'owner' | 'admin' | 'member'
  }) => Promise<T>,
): Promise<MutationResult> {
  const { orgId, role } = await resolveOrgAndRole()
  if (!canManageInvoices(role as 'owner' | 'admin' | 'member')) {
    return { ok: false, error: 'Insufficient permissions' }
  }
  try {
    await handler({ orgId, role: role as 'owner' | 'admin' | 'member' })
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}

export const confirmPaymentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => confirmPaymentSchema.parse(input))
  .handler(async ({ data }): Promise<MutationResult> => {
    return withInvoiceManagement(async ({ orgId }) => {
      const { auth } = await import('#/lib/auth')
      const headers = getRequestHeaders()
      const session = await auth.api.getSession({ headers })
      const userId = session?.user.id ?? 'operator'
      const { confirmPayment } = await import('./model')
      await confirmPayment(orgId, data.paymentId, userId)
    })
  })

export const rejectPaymentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => rejectPaymentSchema.parse(input))
  .handler(async ({ data }): Promise<MutationResult> => {
    return withInvoiceManagement(async ({ orgId }) => {
      const { rejectPayment } = await import('./model')
      await rejectPayment(orgId, data.paymentId, data.reason)
    })
  })

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
        const [{ getPortalOrder }, { createMidtransTransaction }] =
          await Promise.all([
            import('#/features/portal/model'),
            import('./model'),
          ])
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

export type ReconcilePaymentResponse =
  | {
      ok: true
      status: 'paid' | 'refunded' | 'partially_refunded'
      reason: 'confirmed' | 'already_paid' | 'refunded' | 'partially_refunded'
      paymentId?: string
    }
  | {
      ok: true
      status:
        | 'not_settled_yet'
        | 'no_midtrans_order_id'
        | 'mismatch'
        | 'gateway_unavailable'
        | 'manual_review_required'
        | 'pending'
        | 'deny'
        | 'failed'
        | 'cancel'
        | 'expire'
    }
  | {
      ok: false
      error: string
      reason?: 'gateway_unavailable' | 'manual_review_required'
    }

export async function reconcileInvoicePaymentForRole(
  orgId: string,
  role: 'owner' | 'admin' | 'member',
  invoiceId: string,
): Promise<ReconcilePaymentResponse> {
  if (!canManageInvoices(role)) return { ok: false, error: 'Forbidden' }
  try {
    const { reconcilePayment } = await import('./model')
    const result = await reconcilePayment(orgId, invoiceId)
    if (!result.ok && result.reason === 'manual_review_required') {
      return { ok: true, status: 'manual_review_required' }
    }
    if (!result.ok) return result
    if (!result.confirmed) {
      if (
        result.reason === 'refunded' ||
        result.reason === 'partially_refunded'
      ) {
        return {
          ok: true,
          status: result.reason,
          reason: result.reason,
          paymentId: result.paymentId,
        }
      }
      return {
        ok: true,
        status: result.reason as
          | 'not_settled_yet'
          | 'no_midtrans_order_id'
          | 'mismatch'
          | 'pending'
          | 'deny'
          | 'failed'
          | 'cancel'
          | 'expire'
          | 'gateway_unavailable'
          | 'manual_review_required',
      }
    }
    return {
      ok: true,
      status: 'paid',
      reason: result.reason === 'confirmed' ? 'confirmed' : 'already_paid',
      paymentId: result.paymentId,
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}

export const reconcileInvoicePaymentFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ invoiceId: z.string().min(1) }))
  .handler(async ({ data }): Promise<ReconcilePaymentResponse> => {
    const { orgId, role } = await resolveOrgAndRole()
    return reconcileInvoicePaymentForRole(
      orgId,
      role as 'owner' | 'admin' | 'member',
      data.invoiceId,
    )
  })
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
      const [{ getPortalOrder }, { reconcilePayment }] = await Promise.all([
        import('#/features/portal/model'),
        import('./model'),
      ])
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
      const result = await reconcilePayment(orgId, data.invoiceId)
      if (!result.ok && result.reason === 'manual_review_required') {
        return { ok: true, status: 'manual_review_required' }
      }
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
          | 'mismatch'
          | 'gateway_unavailable'
          | 'manual_review_required',
      }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })
