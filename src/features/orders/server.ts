import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { resolveOrgId } from '#/lib/auth-session'
import type { MutationResult } from '#/lib/server-results'
import type {
  CreateDraftOrderInput,
  CreateDraftOrderResult,
  GetOrderResult,
  ListOrdersParams,
  ListOrdersResult,
  OrderCreationReadiness,
  UpdateDraftOrderInput,
} from './model'

export const listOrdersFn = createServerFn({ method: 'GET' })
  .inputValidator((data: ListOrdersParams) => data)
  .handler(async ({ data }): Promise<ListOrdersResult> => {
    const { listOrders } = await import('./model')
    return listOrders(data)
  })

export const getOrderFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { id: string; orgId: string }) => input)
  .handler(async ({ data }): Promise<GetOrderResult | null> => {
    const { getOrder } = await import('./model')
    return getOrder(data.id, data.orgId)
  })

export const getOrderCreationReadinessFn = createServerFn({ method: 'GET' })
  .inputValidator((data: Record<string, never>) => data)
  .handler(async (): Promise<OrderCreationReadiness> => {
    const [orgId, { getOrderCreationReadiness }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return getOrderCreationReadiness(orgId)
  })


export const createDraftOrderFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: Omit<CreateDraftOrderInput, 'orgId'> & { orgId: string }) => input,
  )
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
      customerId: data.customerId,
      notes: data.notes,
      lineItems: data.lineItems,
    })
  })

export const updateDraftOrderFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (
      input: { id: string; orgId: string } & Omit<
        UpdateDraftOrderInput,
        'orgId'
      >,
    ) => input,
  )
  .handler(async ({ data }) => {
    const [orgId, { updateDraftOrder }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return updateDraftOrder(data.id, orgId, {
      customerId: data.customerId,
      notes: data.notes,
      lineItems: data.lineItems,
    })
  })

export const getAssetsForLineItemFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { lineItemId: string; orgId: string }) => input)
  .handler(async ({ data }) => {
    const { getAssetsForLineItem } = await import('./model')
    return getAssetsForLineItem(data.lineItemId, data.orgId)
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

const setDeliveryInfoFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { id: string; courier?: string; trackingNumber?: string }) => input,
  )
  .handler(async ({ data }): Promise<MutationResult> => {
    const [orgId, { setDeliveryInfo }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    try {
      await setDeliveryInfo(data.id, orgId, {
        courier: data.courier,
        trackingNumber: data.trackingNumber,
      })
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

const markShippedFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { id: string; courier?: string; trackingNumber?: string }) => input,
  )
  .handler(async ({ data }): Promise<MutationResult> => {
    const [orgId, { markShipped }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    try {
      await markShipped(data.id, orgId, {
        courier: data.courier,
        trackingNumber: data.trackingNumber,
      })
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
      { markShipped },
    ] = await Promise.all([
      resolveOrgId(),
      import('#/db/index'),
      import('#/db/schema'),
      import('drizzle-orm'),
      import('#/features/invoices/model'),
      import('./model'),
    ])

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

    // Auto-advance from approved → in_progress if all tasks are already done
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

    // 4. Create final invoice if there's remaining balance
    if (remainingAmount > 0) {
      if (!data.invoiceDueDate || !data.invoicePaymentMethodId) {
        throw new Error(
          'Due date and payment method are required to create the final invoice',
        )
      }

      const remainingPercentage =
        order.total > 0
          ? Math.round((remainingAmount / order.total) * 10_000) / 100
          : 100

      await createInvoice(orgId, {
        orderId: data.id,
        customerId,
        customerName,
        lineItems: [],
        percentage: remainingPercentage,
        dueDate: data.invoiceDueDate,
        paymentMethodId: data.invoicePaymentMethodId,
        notes: data.invoiceNotes,
        shippingFee: data.shippingFee,
        shippingFeeDescription: data.shippingFeeDescription,
      })
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
