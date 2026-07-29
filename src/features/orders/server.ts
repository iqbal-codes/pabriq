import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'
import {
  canAdjustConfirmedOrder,
  type Role,
} from '#/features/permissions/model'
import { resolveOrgId } from '#/lib/auth-session-server'
import type { MutationResult } from '#/lib/server-results'
import type {
  CreateDraftOrderResult,
  GetOrderResult,
  ListOrdersParams,
  ListOrdersResult,
  OrderCreationReadiness,
} from './model'

const listOrdersParamsSchema = z.object({
  orgId: z.string().trim().min(1).max(100),
  search: z.string().trim().max(100).optional(),
  status: z.string().trim().max(50).optional(),
  sort: z
    .object({
      field: z.string().trim().max(50),
      direction: z.enum(['asc', 'desc']),
    })
    .nullable()
    .optional(),
  page: z.number().int().min(1).max(10000).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
})

const lineItemInputSchema = z.object({
  id: z.string().trim().min(1).max(100).optional(),
  productId: z.string().trim().min(1).max(100),
  quantity: z.number().int().min(1).max(1000000),
  unitPrice: z.number().min(0).optional(),
  designName: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  addonIds: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  isRepeatOrder: z.boolean().optional(),
  deadline: z.string().optional(),
  manualDeadline: z.boolean().optional(),
})

const createDraftOrderInputSchema = z.object({
  orgId: z.string().trim().min(1).max(100),
  customerId: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
  lineItems: z.array(lineItemInputSchema).min(1).max(100),
  deadline: z.string().optional(),
  manualDeadline: z.boolean().optional(),
})
const updateDraftOrderInputSchema = createDraftOrderInputSchema.extend({
  id: z.string().trim().min(1).max(100),
})
export const listOrdersFn = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => listOrdersParamsSchema.parse(data))
  .handler(async ({ data }): Promise<ListOrdersResult> => {
    const [orgId, { listOrders }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return listOrders({ ...(data as unknown as ListOrdersParams), orgId })
  })

export const getOrderFn = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().trim().min(1).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<GetOrderResult | null> => {
    const [orgId, { getOrder }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return getOrder(data.id, orgId)
  })

export const getOrderCreationReadinessFn = createServerFn({
  method: 'GET',
}).handler(async (): Promise<OrderCreationReadiness> => {
  const [orgId, { getOrderCreationReadiness }] = await Promise.all([
    resolveOrgId(),
    import('./model'),
  ])
  return getOrderCreationReadiness(orgId)
})

export const createDraftOrderFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createDraftOrderInputSchema.parse(input))
  .handler(async ({ data }): Promise<CreateDraftOrderResult> => {
    const [orgId, orderModel] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    const readiness = await orderModel.getOrderCreationReadiness(orgId)
    if (!readiness.isReady) {
      throw new Error('Complete order setup before creating an order')
    }

    return orderModel.createDraftOrder(orgId, {
      customerId: data.customerId ?? null,
      notes: data.notes,
      lineItems: data.lineItems.map((li) => ({
        ...li,
        deadline: li.deadline ? new Date(li.deadline) : undefined,
      })),
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      manualDeadline: data.manualDeadline,
    })
  })

export const updateDraftOrderFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => updateDraftOrderInputSchema.parse(input))
  .handler(async ({ data }) => {
    const [orgId, { updateDraftOrder }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return updateDraftOrder(data.id, orgId, {
      customerId: data.customerId ?? null,
      notes: data.notes,
      lineItems: data.lineItems.map((li) => ({
        ...li,
        deadline: li.deadline ? new Date(li.deadline) : undefined,
      })),
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      manualDeadline: data.manualDeadline,
    })
  })

export const getAssetsForLineItemFn = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) =>
    z.object({ lineItemId: z.string().trim().min(1).max(100) }).parse(input),
  )
  .handler(async ({ data }) => {
    const [orgId, { getAssetsForLineItem }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return getAssetsForLineItem(data.lineItemId, orgId)
  })

export const approveOrderFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const [orgId, { auth }, { approveOrder }] = await Promise.all([
      resolveOrgId(),
      import('#/lib/auth'),
      import('./model'),
    ])
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    const userId = session?.user.id ?? 'unknown'
    try {
      await approveOrder(data.id, orgId, userId)
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const rejectOrderFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string; reason: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const [orgId, { auth }, { rejectOrder }] = await Promise.all([
      resolveOrgId(),
      import('#/lib/auth'),
      import('./model'),
    ])
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    const userId = session?.user.id ?? 'unknown'
    try {
      await rejectOrder(data.id, orgId, {
        rejectedBy: userId,
        reason: data.reason,
      })
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const advanceOrderStatusFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const [orgId, { auth }, { advanceOrderStatus }] = await Promise.all([
      resolveOrgId(),
      import('#/lib/auth'),
      import('./model'),
    ])
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    const userId = session?.user.id ?? 'unknown'
    try {
      await advanceOrderStatus(data.id, orgId, userId)
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const completeProductionFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      id: string
      courier?: string
      trackingNumber?: string
      shippingFee?: number
      shippingFeeDescription?: string
      invoiceDueDate?: string
      invoicePaymentProvider?: string
      invoicePaymentMethodId?: string
      invoiceNotes?: string
    }) => input,
  )
  .handler(async ({ data }): Promise<MutationResult> => {
    const [
      orgId,
      { db },
      {
        productionTasks,
        orders: ordersTable,
        customers: customersTable,
        invoices: invoicesTable,
      },
      { eq, and },
      { createInvoice },
      { computeLateFee, capLateFee, logLateFeeApplied, markShipped },
      { auth },
    ] = await Promise.all([
      resolveOrgId(),
      import('#/db/index'),
      import('#/db/schema'),
      import('drizzle-orm'),
      import('#/features/invoices/model'),
      import('./model'),
      import('#/lib/auth'),
    ])

    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    const userId = session?.user.id ?? 'unknown'

    const tasks = await db
      .select({ id: productionTasks.id, status: productionTasks.status })
      .from(productionTasks)
      .where(
        and(
          eq(productionTasks.orderId, data.id),
          eq(productionTasks.orgId, orgId),
        ),
      )

    const incompleteTasks = tasks.filter((t) => t.status !== 'completed')
    if (incompleteTasks.length > 0) {
      return {
        ok: false,
        error: `Cannot complete production: ${incompleteTasks.length} task(s) still in progress`,
      }
    }

    // 2. Get order and customer info
    const orderRows = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, data.id), eq(ordersTable.orgId, orgId)))
      .limit(1)

    if (orderRows.length === 0) throw new Error('Order not found')
    const order = orderRows[0]
    if (order.status !== 'in_progress' && order.status !== 'approved') {
      return { ok: false, error: 'Order is not in progress' }
    }

    if (order.status === 'approved') {
      const { advanceOrderStatus } = await import('./model')
      await advanceOrderStatus(data.id, orgId, 'system')
    }

    // Get customer info
    const customerId = order.customerId ?? 'unknown'
    let customerName = 'Unknown Customer'

    if (order.customerId) {
      const customerRows = await db
        .select({
          name: customersTable.name,
        })
        .from(customersTable)
        .where(eq(customersTable.id, order.customerId))
        .limit(1)

      if (customerRows.length > 0) {
        customerName = customerRows[0].name ?? 'Unknown Customer'
      }
    }

    // 3. Calculate remaining balance
    const paidInvoices = await db
      .select({ total: invoicesTable.total })
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.orderId, data.id),
          eq(invoicesTable.orgId, orgId),
          eq(invoicesTable.status, 'paid'),
        ),
      )

    const invoicedAmount = paidInvoices.reduce((sum, inv) => sum + inv.total, 0)
    const remainingAmount = Math.max(0, order.total - invoicedAmount)
    const shippingAmount = data.shippingFee ?? 0

    // Compute late fee
    const now = new Date()
    const lateFeeCalc = await computeLateFee(data.id, orgId, now)
    const maxDeduction = remainingAmount + shippingAmount
    const cappedLateFee = capLateFee(lateFeeCalc.lateFee, maxDeduction)

    // 4. Create final invoice when there is unpaid order balance or shipping
    if (remainingAmount + shippingAmount > 0) {
      if (
        !data.invoiceDueDate ||
        (!data.invoicePaymentMethodId && !data.invoicePaymentProvider)
      ) {
        throw new Error(
          'Due date and payment method are required to create the final invoice',
        )
      }

      const remainingPercentage =
        remainingAmount > 0 && order.total > 0
          ? Math.round((remainingAmount / order.total) * 10_000) / 100
          : 0

      const invoiceResult = await createInvoice(orgId, {
        orderId: data.id,
        customerId,
        customerName,
        lineItems: [],
        percentage: remainingPercentage,
        customProductTotal: remainingAmount,
        paymentMethodId: data.invoicePaymentMethodId ?? null,
        paymentProvider: data.invoicePaymentProvider as
          | 'bank_transfer'
          | 'midtrans'
          | undefined,
        notes: data.invoiceNotes,
        shippingFee: shippingAmount > 0 ? shippingAmount : undefined,
        shippingFeeDescription:
          shippingAmount > 0 ? data.shippingFeeDescription : undefined,
        lateFee: cappedLateFee > 0 ? cappedLateFee : undefined,
        lateFeeDays: cappedLateFee > 0 ? lateFeeCalc.daysLate : undefined,
        lateFeePerDay:
          cappedLateFee > 0 ? lateFeeCalc.lateFeePerDay : undefined,
      })

      // Log activity event for late fee
      if (cappedLateFee > 0 && lateFeeCalc.deadline) {
        await logLateFeeApplied({
          orgId,
          orderId: data.id,
          actorId: userId,
          invoiceId: invoiceResult.invoice.id,
          daysLate: lateFeeCalc.daysLate,
          lateFee: cappedLateFee,
          lateFeePerDay: lateFeeCalc.lateFeePerDay,
          deadline: lateFeeCalc.deadline,
          completionDate: now,
        })
      }
    }

    // 5. Mark order as shipped (in_delivery)
    await markShipped(data.id, orgId, {
      courier: data.courier,
      trackingNumber: data.trackingNumber,
    })

    return { ok: true }
  })

export const startProductionFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const [orgId, { auth }, { startProductionForOrder }] = await Promise.all([
      resolveOrgId(),
      import('#/lib/auth'),
      import('#/features/production/spawner'),
    ])
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    const userId = session?.user.id ?? 'unknown'
    try {
      await startProductionForOrder(data.id, orgId, userId)
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const adjustOrderQuantityFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      orderId: string
      lineItemId: string
      quantity: number
      reason: string
    }) => input,
  )
  .handler(async ({ data }): Promise<MutationResult> => {
    const [orgId, { auth }, { adjustOrderQuantity }] = await Promise.all([
      resolveOrgId(),
      import('#/lib/auth'),
      import('./model'),
    ])
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    if (!session) return { ok: false, error: 'Not authenticated' }

    // Get user's role
    const { db } = await import('#/db/index')
    const { member } = await import('#/db/schema')
    const { eq } = await import('drizzle-orm')
    const memberships = await db
      .select({ role: member.role })
      .from(member)
      .where(eq(member.userId, session.user.id))
      .limit(1)

    const role = memberships[0]?.role
    if (!role || !canAdjustConfirmedOrder(role as Role)) {
      return { ok: false, error: 'Not authorized' }
    }

    try {
      await adjustOrderQuantity(orgId, { ...data, actorId: session.user.id })
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const getOrderAdminTimelineFn = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) =>
    z.object({ orderId: z.string().trim().min(1).max(100) }).parse(input),
  )
  .handler(async ({ data }) => {
    const [orgId, { getOrderTimelineByOrderId }] = await Promise.all([
      resolveOrgId(),
      import('#/features/portal/model'),
    ])
    return getOrderTimelineByOrderId(data.orderId, orgId)
  })

const cancelOrderInputSchema = z.object({
  orderId: z.string().trim().min(1).max(100),
  reason: z.string().trim().min(1).max(2000),
})

export const cancelOrderFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => cancelOrderInputSchema.parse(input))
  .handler(async ({ data }): Promise<MutationResult> => {
    const [orgId, { auth }, { cancelOrder }] = await Promise.all([
      resolveOrgId(),
      import('#/lib/auth'),
      import('./model'),
    ])
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    const userId = session?.user.id ?? 'unknown'
    try {
      await cancelOrder(data.orderId, orgId, {
        cancelledBy: userId,
        reason: data.reason,
      })
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })
