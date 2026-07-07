import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'
import { getPortalOrder } from '#/features/portal/model'
import { resolveOrgId } from '#/lib/auth-session-server'
import type { MutationResult } from '#/lib/server-results'
import type {
  CreateInvoiceInput,
  GetInvoiceResult,
  InvoiceBalance,
  InvoicePaymentProof,
  ListInvoicesParams,
  ListInvoicesResult,
  OrderForInvoice,
  Payment,
  PaymentMethod,
} from './model'
import { createMidtransTransaction } from './model'

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
    const [orgId, { auth }, { markInvoicePaid }] = await Promise.all([
      resolveOrgId(),
      import('#/lib/auth'),
      import('./model'),
    ])
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

export const voidInvoiceFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const [orgId, { voidInvoice }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    try {
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
      const [orgId, { createPaymentMethod }] = await Promise.all([
        resolveOrgId(),
        import('./model'),
      ])
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

// ── Zod Schemas ────────────────────────────────────────────────

const createPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(['bank_transfer', 'payment_gateway', 'cash']),
  reference: z.string().optional(),
  proofAssetId: z.string().optional(),
  receivedAt: z.string().datetime().optional(),
})

const confirmPaymentSchema = z.object({
  paymentId: z.string().min(1),
})

const rejectPaymentSchema = z.object({
  paymentId: z.string().min(1),
  reason: z.string().min(1),
})

const getInvoicePaymentsSchema = z.object({
  invoiceId: z.string().min(1),
})

const updateInvoiceSchema = z.object({
  id: z.string().min(1),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  paymentMethodId: z.string().optional(),
  customerName: z.string().optional(),
})

// ── Payment Server Functions ───────────────────────────────────

async function getSessionUserId(): Promise<string> {
  const { auth } = await import('#/lib/auth')
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  return session?.user.id ?? 'unknown'
}

export const createPaymentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createPaymentSchema.parse(input))
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
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

export const confirmPaymentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => confirmPaymentSchema.parse(input))
  .handler(
    async ({
      data,
    }): Promise<
      { ok: true; balance: InvoiceBalance } | { ok: false; error: string }
    > => {
      const orgId = await resolveOrgId()
      try {
        const userId = await getSessionUserId()
        const { confirmPayment } = await import('./model')
        const result = await confirmPayment(orgId, data.paymentId, userId)
        return { ok: true, balance: result.balance }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        }
      }
    },
  )

export const rejectPaymentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => rejectPaymentSchema.parse(input))
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { rejectPayment } = await import('./model')
      await rejectPayment(orgId, data.paymentId, data.reason)
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

export const getInvoicePaymentsFn = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => getInvoicePaymentsSchema.parse(input))
  .handler(async ({ data }): Promise<Payment[]> => {
    const [orgId, { getPaymentsForInvoice }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return getPaymentsForInvoice(orgId, data.invoiceId)
  })

export const getInvoiceBalanceFn = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => getInvoicePaymentsSchema.parse(input))
  .handler(async ({ data }): Promise<InvoiceBalance> => {
    const [orgId, { getInvoiceBalance }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return getInvoiceBalance(data.invoiceId, orgId)
  })

export const updateInvoiceFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => updateInvoiceSchema.parse(input))
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { updateInvoice } = await import('./model')
      await updateInvoice(data.id, orgId, data)
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const getOrderForInvoiceFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data }): Promise<OrderForInvoice> => {
    const [
      orgId,
      { db },
      {
        orders: ordersTable,
        orderLineItems: orderLineItemsTable,
        invoices: invoicesTable,
        customers: customersTable,
      },
      { eq, and },
    ] = await Promise.all([
      resolveOrgId(),
      import('#/db/index'),
      import('#/db/schema'),
      import('drizzle-orm'),
    ])

    // Fetch order, line items, and existing invoices in parallel
    const [orderRows, itemRows, invoiceRows] = await Promise.all([
      db
        .select()
        .from(ordersTable)
        .where(
          and(eq(ordersTable.id, data.orderId), eq(ordersTable.orgId, orgId)),
        )
        .limit(1),
      db
        .select({
          id: orderLineItemsTable.id,
          productId: orderLineItemsTable.productId,
          designName: orderLineItemsTable.designName,
          quantity: orderLineItemsTable.quantity,
          unitPrice: orderLineItemsTable.unitPrice,
          total: orderLineItemsTable.total,
          productName: orderLineItemsTable.productName,
        })
        .from(orderLineItemsTable)
        .where(eq(orderLineItemsTable.orderId, data.orderId)),
      db
        .select({
          id: invoicesTable.id,
          invoiceNumber: invoicesTable.invoiceNumber,
          percentage: invoicesTable.percentage,
          total: invoicesTable.total,
          status: invoicesTable.status,
        })
        .from(invoicesTable)
        .where(
          and(
            eq(invoicesTable.orderId, data.orderId),
            eq(invoicesTable.orgId, orgId),
            eq(invoicesTable.status, 'paid'),
          ),
        ),
    ])

    if (orderRows.length === 0) throw new Error('Order not found')
    const order = orderRows[0]

    // Fetch customer info (depends on order.customerId)
    const customerRows = order.customerId
      ? await db
          .select({
            name: customersTable.name,
            phone: customersTable.phone,
            email: customersTable.email,
          })
          .from(customersTable)
          .where(eq(customersTable.id, order.customerId))
          .limit(1)
      : []

    const invoicedPercentage = invoiceRows.reduce(
      (sum, inv) => sum + (inv.percentage ?? 0),
      0,
    )
    const invoicedAmount = invoiceRows.reduce((sum, inv) => sum + inv.total, 0)
    const remainingPercentage = Math.max(0, 100 - invoicedPercentage)
    const remainingAmount = Math.max(0, order.total - invoicedAmount)

    const customer = customerRows[0]

    return {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: customer?.name ?? null,
        customerPhone: customer?.phone ?? null,
        customerEmail: customer?.email ?? null,
        total: order.total,
        status: order.status,
        notes: order.notes,
      },
      lineItems: itemRows.map((item) => ({
        ...item,
        productName: item.productName,
      })),
      existingInvoices: invoiceRows.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        percentage: inv.percentage,
        total: inv.total,
        status: inv.status,
      })),
      invoicedPercentage,
      invoicedAmount,
      remainingPercentage,
      remainingAmount,
    }
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
      { ok: true; snapToken: string } | { ok: false; error: string }
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
        const result = await createMidtransTransaction(data.invoiceId, orgId)
        return { ok: true, snapToken: result.token }
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

/**
 * Operator-side reconciliation: admin clicks "Lookup transaction" on the
 * invoice detail page. Resolves the org from the authenticated session.
 */
export const reconcileInvoicePaymentFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ invoiceId: z.string() }))
  .handler(async ({ data }): Promise<ReconcilePaymentResponse> => {
    const [orgId, { reconcilePayment }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    try {
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
