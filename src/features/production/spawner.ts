import { and, desc, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  taskActivity as activityTable,
  productionTasks as tasksTable,
} from '#/db/schema'
import { getOrder } from '#/features/orders/model'

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

  const latestTask = await db
    .select({ taskNumber: tasksTable.taskNumber })
    .from(tasksTable)
    .where(eq(tasksTable.orgId, orgId))
    .orderBy(desc(tasksTable.createdAt), desc(tasksTable.id))
    .limit(1)

  let nextNum = latestTask[0]?.taskNumber
    ? Number.parseInt(latestTask[0].taskNumber.split('-')[1], 10) + 1
    : 1
  const now = new Date()

  for (const item of lineItems) {
    const id = crypto.randomUUID()
    const taskNumber = `TSK-${nextNum}`
    nextNum++
    await db.insert(tasksTable).values({
      id,
      orgId,
      orderId,
      board: 'pre_production',
      stageId: null,
      status: 'queued',
      taskNumber,
      lineItemId: item.id,
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

    await db.insert(activityTable).values({
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

  const latestTask = await db
    .select({ taskNumber: tasksTable.taskNumber })
    .from(tasksTable)
    .where(eq(tasksTable.orgId, orgId))
    .orderBy(desc(tasksTable.createdAt), desc(tasksTable.id))
    .limit(1)

  let nextNum = latestTask[0]?.taskNumber
    ? Number.parseInt(latestTask[0].taskNumber.split('-')[1], 10) + 1
    : 1
  const now = new Date()

  for (const item of lineItems) {
    const id = crypto.randomUUID()
    const taskNumber = `TSK-${nextNum}`
    nextNum++
    await db.insert(tasksTable).values({
      id,
      orgId,
      orderId,
      board: 'production',
      stageId: null,
      status: 'queued',
      taskNumber,
      lineItemId: item.id,
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

    await db.insert(activityTable).values({
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
}

export async function archiveBoardTasks(
  orderId: string,
  board: string,
): Promise<void> {
  const now = new Date()
  await db
    .update(tasksTable)
    .set({ status: 'completed', archivedAt: now, updatedAt: now })
    .where(
      and(
        eq(tasksTable.orderId, orderId),
        eq(tasksTable.board, board),
      ),
    )
}
