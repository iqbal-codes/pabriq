import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import type {
  CreateDraftOrderInput,
  GetOrderResult,
  ListOrdersParams,
  ListOrdersResult,
  UpdateDraftOrderInput,
} from './model'

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

export const createDraftOrderFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: Omit<CreateDraftOrderInput, 'orgId'> & { orgId: string }) => input,
  )
  .handler(async ({ data }) => {
    const orgId = await resolveOrgId()
    const { createDraftOrder } = await import('./model')
    return createDraftOrder(orgId, {
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
    const orgId = await resolveOrgId()
    const { updateDraftOrder } = await import('./model')
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
    const orgId = await resolveOrgId()
    try {
      const { auth } = await import('#/lib/auth')
      const headers = getRequestHeaders()
      const session = await auth.api.getSession({ headers })
      const userId = session?.user.id ?? 'unknown'
      const { approveOrder } = await import('./model')
      await approveOrder(data.id, orgId, userId)
      const { spawnTasksForApprovedOrder } = await import(
        '#/features/production/spawner'
      )
      await spawnTasksForApprovedOrder(data.id, orgId)
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
    const orgId = await resolveOrgId()
    try {
      const { auth } = await import('#/lib/auth')
      const headers = getRequestHeaders()
      const session = await auth.api.getSession({ headers })
      const userId = session?.user.id ?? 'unknown'
      const { rejectOrder } = await import('./model')
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
    const orgId = await resolveOrgId()
    try {
      const { auth } = await import('#/lib/auth')
      const headers = getRequestHeaders()
      const session = await auth.api.getSession({ headers })
      const userId = session?.user.id ?? 'unknown'
      const { advanceOrderStatus } = await import('./model')
      await advanceOrderStatus(data.id, orgId, userId)
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const setDeliveryInfoFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { id: string; courier?: string; trackingNumber?: string }) => input,
  )
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { setDeliveryInfo } = await import('./model')
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

export const markShippedFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { id: string; courier?: string; trackingNumber?: string }) => input,
  )
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { markShipped } = await import('./model')
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
      invoicePercentage?: number
      invoiceDueDate: string
      invoicePaymentMethodId: string
      invoiceNotes?: string
    }) => input,
  )
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      // 1. Check all tasks are completed
      const { db } = await import('#/db/index')
      const { productionTasks } = await import('#/db/schema')
      const { eq, and } = await import('drizzle-orm')

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
      const { orders: ordersTable, customers: customersTable } =
        await await import('#/db/schema')
      const orderRows = await db
        .select()
        .from(ordersTable)
        .where(and(eq(ordersTable.id, data.id), eq(ordersTable.orgId, orgId)))
        .limit(1)

      if (orderRows.length === 0) throw new Error('Order not found')
      const order = orderRows[0]

      if (order.status !== 'in_progress') {
        return { ok: false, error: 'Order is not in progress' }
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
      const { invoices: invoicesTable } = await import('#/db/schema')
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

      const invoicedAmount = paidInvoices.reduce(
        (sum, inv) => sum + inv.total,
        0,
      )
      const remainingAmount = Math.max(0, order.total - invoicedAmount)

      // 4. Create final invoice if there's remaining balance
      if (remainingAmount > 0) {
        const { createInvoice } = await import('#/features/invoices/model')
        await createInvoice(orgId, {
          orderId: data.id,
          customerId,
          customerName,
          lineItems: [],
          percentage: data.invoicePercentage ?? 100,
          dueDate: data.invoiceDueDate,
          paymentMethodId: data.invoicePaymentMethodId,
          notes: data.invoiceNotes,
          shippingFee: data.shippingFee,
          shippingFeeDescription: data.shippingFeeDescription,
        })
      }

      // 5. Mark order as shipped (in_delivery)
      const { markShipped } = await import('./model')
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
