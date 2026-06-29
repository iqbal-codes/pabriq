import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  taskActivity as activityTable,
  products as productsTable,
  productionTasks as tasksTable,
} from '#/db/schema'
import { getOrder } from '#/features/orders/model'

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
  const orderData = await getOrder(orderId, orgId)
  if (!orderData) throw new Error('Order not found')

  const { order, lineItems, customerName } = orderData
  if (order.status !== 'approved' && order.status !== 'production') {
    throw new Error('Order is not approved')
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
      board: 'pre_production',
      stageId: null,
      status: 'queued',
      taskNumber,
      lineItemId: item.id,
      priority: productPriorityMap.get(item.productId) ?? false,
      context: {
        productName: item.name ?? '',
        customerName: customerName ?? '',
        requirements: item.notes ?? null,
        orderNumber: order.orderNumber ?? '',
        quantity: item.quantity ?? 1,
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
        productName: item.name ?? '',
        customerName: customerName ?? '',
        requirements: item.notes ?? null,
        orderNumber: order.orderNumber ?? '',
        quantity: item.quantity ?? 1,
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

async function archiveBoardTasks(
  orderId: string,
  board: string,
): Promise<void> {
  const now = new Date()
  await db
    .update(tasksTable)
    .set({ status: 'completed', archivedAt: now, updatedAt: now })
    .where(and(eq(tasksTable.orderId, orderId), eq(tasksTable.board, board)))
}
