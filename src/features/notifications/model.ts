import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  customers as customersTable,
  invoices as invoicesTable,
  orders as ordersTable,
  payments as paymentsTable,
  productionStages as productionStagesTable,
  productionTasks as productionTasksTable,
} from '#/db/schema'
import { READY_FOR_PRODUCTION_STATUS } from '#/features/production/constants'

export type ActionNotificationType =
  | 'payment_confirmation'
  | 'order_review'
  | 'dp_invoice_request'
  | 'final_invoice_request'
  | 'task_review'
export type ActionNotificationPriority = 'normal' | 'high'

export type PaymentNotificationContext = {
  invoiceId: string
  invoiceNumber: string
  customerName: string
  amount: number
  method: 'bank_transfer' | 'midtrans' | 'cash'
  reference: string | null
  proofAssetId: string | null
}

export type OrderReviewNotificationContext = {
  orderId: string
  orderNumber: string | null
  customerName: string | null
  total: number
}

export type DpInvoiceNotificationContext = {
  orderId: string
  orderNumber: string | null
  customerName: string | null
  total: number
  firstProductionStageName: string | null
}

export type FinalInvoiceNotificationContext = {
  orderId: string
  orderNumber: string | null
  customerName: string | null
  total: number
}

export type TaskReviewNotificationContext = {
  taskId: string
  taskNumber: string | null
  orderId: string
  orderNumber: string | null
  customerName: string | null
  productName: string | null
  stageName: string | null
}

export type ActionNotification =
  | {
      id: `payment:${string}`
      type: 'payment_confirmation'
      priority: ActionNotificationPriority
      createdAt: Date
      href: string
      context: PaymentNotificationContext
    }
  | {
      id: `order:${string}`
      type: 'order_review'
      priority: ActionNotificationPriority
      createdAt: Date
      href: string
      context: OrderReviewNotificationContext
    }
  | {
      id: `dp_invoice:${string}`
      type: 'dp_invoice_request'
      priority: ActionNotificationPriority
      createdAt: Date
      href: string
      context: DpInvoiceNotificationContext
    }
  | {
      id: `final_invoice:${string}`
      type: 'final_invoice_request'
      priority: ActionNotificationPriority
      createdAt: Date
      href: string
      context: FinalInvoiceNotificationContext
    }
  | {
      id: `task:${string}`
      type: 'task_review'
      priority: ActionNotificationPriority
      createdAt: Date
      href: string
      context: TaskReviewNotificationContext
    }

export type ActionNotificationCounts = Record<ActionNotificationType, number>

export type ListActionNotificationsParams = {
  orgId: string
  limit?: number
}

export type ListActionNotificationsResult = {
  items: ActionNotification[]
  totalCount: number
  counts: ActionNotificationCounts
}

type PaymentMethod = 'bank_transfer' | 'midtrans' | 'cash'

const PAYMENT_METHODS: Record<PaymentMethod, true> = {
  bank_transfer: true,
  midtrans: true,
  cash: true,
}

function coercePaymentMethod(value: string): PaymentMethod {
  return value in PAYMENT_METHODS ? (value as PaymentMethod) : 'bank_transfer'
}

type TaskContextSnapshot = {
  productName?: string | null
  customerName?: string | null
  orderNumber?: string | null
}

export async function listActionNotifications(
  params: ListActionNotificationsParams,
): Promise<ListActionNotificationsResult> {
  const { orgId, limit } = params

  const [
    paymentRows,
    orderRows,
    taskRows,
    dpCandidateRows,
    finalCandidateRows,
    firstStageRows,
  ] = await Promise.all([
    db
      .select({
        id: paymentsTable.id,
        invoiceId: paymentsTable.invoiceId,
        amount: paymentsTable.amount,
        method: paymentsTable.method,
        reference: paymentsTable.reference,
        proofAssetId: paymentsTable.proofAssetId,
        createdAt: paymentsTable.createdAt,
        invoiceNumber: invoicesTable.invoiceNumber,
        customerName: invoicesTable.customerName,
      })
      .from(paymentsTable)
      .innerJoin(invoicesTable, eq(paymentsTable.invoiceId, invoicesTable.id))
      .where(
        and(
          eq(paymentsTable.orgId, orgId),
          eq(paymentsTable.status, 'pending'),
        ),
      ),
    db
      .select({
        id: ordersTable.id,
        orderNumber: ordersTable.orderNumber,
        total: ordersTable.total,
        updatedAt: ordersTable.updatedAt,
        customerName: customersTable.name,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(
        and(eq(ordersTable.orgId, orgId), eq(ordersTable.status, 'pending')),
      ),
    db
      .select({
        id: productionTasksTable.id,
        taskNumber: productionTasksTable.taskNumber,
        orderId: productionTasksTable.orderId,
        updatedAt: productionTasksTable.updatedAt,
        context: productionTasksTable.context,
        stageName: productionStagesTable.name,
      })
      .from(productionTasksTable)
      .leftJoin(
        productionStagesTable,
        eq(productionTasksTable.stageId, productionStagesTable.id),
      )
      .where(
        and(
          eq(productionTasksTable.orgId, orgId),
          eq(productionTasksTable.status, 'pending_approval'),
        ),
      ),
    db
      .select({
        id: ordersTable.id,
        orderNumber: ordersTable.orderNumber,
        total: ordersTable.total,
        updatedAt: ordersTable.updatedAt,
        customerName: customersTable.name,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(
        and(eq(ordersTable.orgId, orgId), eq(ordersTable.status, 'approved')),
      ),
    db
      .select({
        id: ordersTable.id,
        orderNumber: ordersTable.orderNumber,
        total: ordersTable.total,
        updatedAt: ordersTable.updatedAt,
        customerName: customersTable.name,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(
        and(
          eq(ordersTable.orgId, orgId),
          eq(ordersTable.status, 'in_progress'),
        ),
      ),
    db
      .select({ name: productionStagesTable.name })
      .from(productionStagesTable)
      .where(
        and(
          eq(productionStagesTable.orgId, orgId),
          eq(productionStagesTable.board, 'production'),
          eq(productionStagesTable.active, true),
        ),
      )
      .orderBy(asc(productionStagesTable.orderIndex))
      .limit(1),
  ])

  const invoiceCandidateOrderIds = [
    ...dpCandidateRows.map((row) => row.id),
    ...finalCandidateRows.map((row) => row.id),
  ]
  const [invoiceTaskRows, invoiceRows] =
    invoiceCandidateOrderIds.length > 0
      ? await Promise.all([
          db
            .select({
              orderId: productionTasksTable.orderId,
              board: productionTasksTable.board,
              status: productionTasksTable.status,
              updatedAt: productionTasksTable.updatedAt,
            })
            .from(productionTasksTable)
            .where(
              and(
                eq(productionTasksTable.orgId, orgId),
                inArray(productionTasksTable.orderId, invoiceCandidateOrderIds),
              ),
            ),
          db
            .select({
              orderId: invoicesTable.orderId,
              status: invoicesTable.status,
              percentage: invoicesTable.percentage,
            })
            .from(invoicesTable)
            .where(
              and(
                eq(invoicesTable.orgId, orgId),
                inArray(invoicesTable.orderId, invoiceCandidateOrderIds),
              ),
            ),
        ])
      : [[], []]
  const paymentNotifications: ActionNotification[] = paymentRows.map((row) => ({
    id: `payment:${row.id}` as const,
    type: 'payment_confirmation',
    priority: 'high',
    createdAt: row.createdAt,
    href: `/invoices/${row.invoiceId}`,
    context: {
      invoiceId: row.invoiceId,
      invoiceNumber: row.invoiceNumber,
      customerName: row.customerName,
      amount: row.amount,
      method: coercePaymentMethod(row.method),
      reference: row.reference,
      proofAssetId: row.proofAssetId,
    },
  }))

  const orderNotifications: ActionNotification[] = orderRows.map((row) => ({
    id: `order:${row.id}` as const,
    type: 'order_review',
    priority: 'high',
    createdAt: row.updatedAt,
    href: `/orders/${row.id}`,
    context: {
      orderId: row.id,
      orderNumber: row.orderNumber,
      customerName: row.customerName ?? null,
      total: row.total,
    },
  }))

  const invoiceTaskStateByOrder = new Map<
    string,
    {
      taskCount: number
      allReadyForProduction: boolean
      allProductionTasksCompleted: boolean
      latestUpdatedAt: Date
    }
  >()

  for (const task of invoiceTaskRows) {
    const existing = invoiceTaskStateByOrder.get(task.orderId)
    if (!existing) {
      invoiceTaskStateByOrder.set(task.orderId, {
        taskCount: 1,
        allReadyForProduction: task.status === READY_FOR_PRODUCTION_STATUS,
        allProductionTasksCompleted:
          task.board === 'production' && task.status === 'completed',
        latestUpdatedAt: task.updatedAt,
      })
      continue
    }

    existing.taskCount += 1
    existing.allReadyForProduction =
      existing.allReadyForProduction &&
      task.status === READY_FOR_PRODUCTION_STATUS
    existing.allProductionTasksCompleted =
      existing.allProductionTasksCompleted &&
      task.board === 'production' &&
      task.status === 'completed'
    if (task.updatedAt.getTime() > existing.latestUpdatedAt.getTime()) {
      existing.latestUpdatedAt = task.updatedAt
    }
  }

  const activeInvoiceOrderIds = new Set<string>()
  const activeInvoicePercentageByOrder = new Map<string, number>()
  for (const invoice of invoiceRows) {
    if (!invoice.orderId || invoice.status === 'void') continue

    activeInvoiceOrderIds.add(invoice.orderId)
    activeInvoicePercentageByOrder.set(
      invoice.orderId,
      (activeInvoicePercentageByOrder.get(invoice.orderId) ?? 0) +
        (invoice.percentage ?? 0),
    )
  }

  const firstProductionStageName = firstStageRows[0]?.name ?? null
  const dpInvoiceNotifications: ActionNotification[] = []
  for (const row of dpCandidateRows) {
    const taskState = invoiceTaskStateByOrder.get(row.id)
    if (
      !taskState ||
      taskState.taskCount === 0 ||
      !taskState.allReadyForProduction ||
      activeInvoiceOrderIds.has(row.id)
    ) {
      continue
    }

    dpInvoiceNotifications.push({
      id: `dp_invoice:${row.id}` as const,
      type: 'dp_invoice_request',
      priority: 'high',
      createdAt: taskState.latestUpdatedAt,
      href: `/orders/${row.id}`,
      context: {
        orderId: row.id,
        orderNumber: row.orderNumber,
        customerName: row.customerName ?? null,
        total: row.total,
        firstProductionStageName,
      },
    })
  }

  const finalInvoiceNotifications: ActionNotification[] = []
  for (const row of finalCandidateRows) {
    const taskState = invoiceTaskStateByOrder.get(row.id)
    const activeInvoicePercentage =
      activeInvoicePercentageByOrder.get(row.id) ?? 0
    if (
      !taskState ||
      taskState.taskCount === 0 ||
      !taskState.allProductionTasksCompleted ||
      activeInvoicePercentage >= 100
    ) {
      continue
    }

    finalInvoiceNotifications.push({
      id: `final_invoice:${row.id}` as const,
      type: 'final_invoice_request',
      priority: 'high',
      createdAt: taskState.latestUpdatedAt,
      href: `/orders/${row.id}`,
      context: {
        orderId: row.id,
        orderNumber: row.orderNumber,
        customerName: row.customerName ?? null,
        total: row.total,
      },
    })
  }

  const taskNotifications: ActionNotification[] = taskRows.map((row) => {
    const ctx = (row.context ?? {}) as TaskContextSnapshot
    return {
      id: `task:${row.id}` as const,
      type: 'task_review',
      priority: 'normal',
      createdAt: row.updatedAt,
      href: `/production?reviewTask=${row.id}`,
      context: {
        taskId: row.id,
        taskNumber: row.taskNumber,
        orderId: row.orderId,
        orderNumber: ctx.orderNumber ?? null,
        customerName: ctx.customerName ?? null,
        productName: ctx.productName ?? null,
        stageName: row.stageName ?? null,
      },
    }
  })

  const allItems = [
    ...paymentNotifications,
    ...orderNotifications,
    ...dpInvoiceNotifications,
    ...finalInvoiceNotifications,
    ...taskNotifications,
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const counts: ActionNotificationCounts = {
    payment_confirmation: paymentNotifications.length,
    order_review: orderNotifications.length,
    dp_invoice_request: dpInvoiceNotifications.length,
    final_invoice_request: finalInvoiceNotifications.length,
    task_review: taskNotifications.length,
  }

  const totalCount = allItems.length
  const items =
    typeof limit === 'number' && limit >= 0
      ? allItems.slice(0, limit)
      : allItems

  return { items, totalCount, counts }
}
