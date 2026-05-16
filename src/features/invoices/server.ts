import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'
import type {
  CreateInvoiceInput,
  GetInvoiceResult,
  InvoiceBalance,
  ListInvoicesParams,
  ListInvoicesResult,
  Payment,
  PaymentMethod,
} from './model'

export type OrderForInvoice = {
  order: {
    id: string
    orderNumber: string | null
    customerId: string | null
    customerName: string | null
    customerPhone: string | null
    customerEmail: string | null
    total: number
    status: string
    notes: string | null
  }
  lineItems: Array<{
    id: string
    name: string | null
    quantity: number
    unitPrice: number
    total: number
  }>
  existingInvoices: Array<{
    id: string
    invoiceNumber: string
    percentage: number | null
    total: number
    status: string
  }>
  invoicedPercentage: number
  invoicedAmount: number
  remainingPercentage: number
  remainingAmount: number
}

type MutationResult = { ok: true } | { ok: false; error: string }

async function resolveOrgId(): Promise<string> {
  const [{ auth }, { db }, { member }, { eq }] = await Promise.all([
    import('#/lib/auth'),
    import('#/db/index'),
    import('#/db/schema'),
    import('drizzle-orm'),
  ])
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')

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
    const orgId = await resolveOrgId()
    const { listInvoices } = await import('./model')
    return listInvoices({ ...data, orgId })
  })

export const markInvoicePaidFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    const [{ auth }, { markInvoicePaid }] = await Promise.all([
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

export const getInvoicePaymentsFn = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => getInvoicePaymentsSchema.parse(input))
  .handler(async ({ data }): Promise<Payment[]> => {
    const orgId = await resolveOrgId()
    const { getPaymentsForInvoice } = await import('./model')
    return getPaymentsForInvoice(orgId, data.invoiceId)
  })

export const getInvoiceBalanceFn = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => getInvoicePaymentsSchema.parse(input))
  .handler(async ({ data }): Promise<InvoiceBalance> => {
    const orgId = await resolveOrgId()
    const { getInvoiceBalance } = await import('./model')
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
    const orgId = await resolveOrgId()

    const [
      { db },
      {
        orders: ordersTable,
        orderLineItems: orderLineItemsTable,
        invoices: invoicesTable,
        customers: customersTable,
      },
      { eq, and },
    ] = await Promise.all([
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
          name: orderLineItemsTable.name,
          quantity: orderLineItemsTable.quantity,
          unitPrice: orderLineItemsTable.unitPrice,
          total: orderLineItemsTable.total,
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
      lineItems: itemRows,
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
