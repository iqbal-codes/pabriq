import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  taskActivity as activityTable,
  invoices as invoicesTable,
  orders as ordersTable,
  products as productsTable,
  productionStages as stagesTable,
  productionTasks as tasksTable,
} from '#/db/schema'
import { READY_FOR_PRODUCTION_STATUS } from '#/features/production/constants'
import { getVisibleDesignName } from '#/features/orders/line-item-display'
import { advanceOrderStatus, getOrder } from '#/features/orders/model'
import { spawnQueuedPreProductionTasksForOrder } from '#/features/production/task-spawn-helpers'

async function getProductPriorityMap(
  orgId: string,
  productIds: string[],
): Promise<Map<string, boolean>> {
  if (productIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({ id: productsTable.id, priority: productsTable.priority })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.orgId, orgId),
        inArray(productsTable.id, productIds),
      ),
    )

  return new Map(rows.map((row) => [row.id, row.priority]))
}

export async function spawnTasksForApprovedOrder(
  orderId: string,
  orgId: string,
): Promise<void> {
  await spawnQueuedPreProductionTasksForOrder(db, {
    orderId,
    orgId,
    allowedStatuses: ['approved', 'production'] as const,
  })
}

export async function spawnProductionTasks(
  orderId: string,
  orgId: string,
): Promise<void> {
  const orderData = await getOrder(orderId, orgId)
  if (!orderData) throw new Error('Order not found')

  const { order, lineItems, customerName } = orderData
  if (order.status !== 'in_progress') {
    throw new Error('Order is not in progress')
  }
  const [latestTask, productPriorityMap] = await Promise.all([
    db
      .select({ taskNumber: tasksTable.taskNumber })
      .from(tasksTable)
      .where(eq(tasksTable.orgId, orgId))
      .orderBy(desc(tasksTable.createdAt), desc(tasksTable.id))
      .limit(1),
    getProductPriorityMap(orgId, [
      ...new Set(lineItems.map((item) => item.productId)),
    ]),
  ])

  let nextNum = latestTask[0]?.taskNumber
    ? Number.parseInt(latestTask[0].taskNumber.split('-')[1], 10) + 1
    : 1
  const now = new Date()

  const taskValues: (typeof tasksTable.$inferInsert)[] = []
  const activityValues: (typeof activityTable.$inferInsert)[] = []

  for (const item of lineItems) {
    const id = crypto.randomUUID()
    const taskNumber = `TSK-${nextNum}`
    nextNum++
    taskValues.push({
      id,
      orgId,
      orderId,
      board: 'production',
      stageId: null,
      status: 'queued',
      taskNumber,
      lineItemId: item.id,
      priority: productPriorityMap.get(item.productId) ?? false,
      context: {
        productName: item.productName,
        designName: getVisibleDesignName(item.designName, item.productName),
        customerName: customerName ?? '',
        requirements: item.notes ?? null,
        orderNumber: order.orderNumber ?? '',
        quantity: item.quantity ?? 1,
        deadline: item.deadline.toISOString(),
      },
      createdAt: now,
      updatedAt: now,
    })

    activityValues.push({
      id: crypto.randomUUID(),
      orgId,
      taskId: id,
      type: 'stage_transition',
      fromStageId: null,
      toStageId: null,
      data: {},
      actorId: 'system',
      createdAt: now,
    })
  }

  await db.transaction(async (tx) => {
    await Promise.all([
      tx.insert(tasksTable).values(taskValues),
      tx.insert(activityTable).values(activityValues),
    ])
  })
}

export async function archiveBoardTasks(
  orderId: string,
  board: string,
): Promise<void> {
  const now = new Date()
  await db
    .update(tasksTable)
    .set({ status: 'completed', archivedAt: now, updatedAt: now })
    .where(and(eq(tasksTable.orderId, orderId), eq(tasksTable.board, board)))
}

export async function startProductionForOrder(
  orderId: string,
  orgId: string,
  actorId: string,
): Promise<void> {
  const orderRows = await db
    .select({ id: ordersTable.id, status: ordersTable.status })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.orgId, orgId)))
    .limit(1)

  if (orderRows.length === 0) throw new Error('Order not found')

  const orderRow = orderRows[0]
  if (orderRow.status !== 'approved') {
    throw new Error('Only approved orders can start production')
  }

  const paidInvoices = await db
    .select({ id: invoicesTable.id })
    .from(invoicesTable)
    .where(
      and(
        eq(invoicesTable.orderId, orderId),
        eq(invoicesTable.orgId, orgId),
        eq(invoicesTable.status, 'paid'),
      ),
    )
    .limit(1)

  if (paidInvoices.length === 0) {
    throw new Error('At least one paid invoice is required to start production')
  }

  // Ensure pre-production tasks exist
  await spawnTasksForApprovedOrder(orderId, orgId)

  // Fetch first active production stage
  const [firstProdStage] = await db
    .select()
    .from(stagesTable)
    .where(
      and(
        eq(stagesTable.orgId, orgId),
        eq(stagesTable.board, 'production'),
        eq(stagesTable.active, true),
      ),
    )
    .orderBy(asc(stagesTable.orderIndex))
    .limit(1)

  if (!firstProdStage) {
    throw new Error('No active production stage')
  }

  // Fetch all tasks for this order
  const orderTasks = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.orderId, orderId), eq(tasksTable.orgId, orgId)))

  if (orderTasks.length === 0) {
    throw new Error('No tasks found for order')
  }

  // All tasks must be ready for production
  const notReady = orderTasks.filter(
    (t) => t.status !== READY_FOR_PRODUCTION_STATUS,
  )
  if (notReady.length > 0) {
    throw new Error(
      'All pre-production tasks must be ready before production can start',
    )
  }

  // Move all ready tasks to first production stage
  const now = new Date()
  await db.transaction(async (tx) => {
    await tx
      .update(tasksTable)
      .set({
        board: 'production',
        stageId: firstProdStage.id,
        status: 'in_progress',
        updatedAt: now,
      })
      .where(and(eq(tasksTable.orderId, orderId), eq(tasksTable.orgId, orgId)))

    // Log board_transition activity for each task
    for (const task of orderTasks) {
      await tx.insert(activityTable).values({
        id: crypto.randomUUID(),
        orgId,
        taskId: task.id,
        type: 'board_transition',
        fromStageId: null,
        toStageId: firstProdStage.id,
        data: { fromBoard: 'pre_production', toBoard: 'production' },
        actorId,
        createdAt: now,
      })
    }
  })

  await advanceOrderStatus(orderId, orgId, actorId)
}
