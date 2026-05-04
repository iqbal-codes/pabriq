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

  const { order, lineItems } = orderData
  if (order.status !== 'approved' && order.status !== 'production') {
    throw new Error('Order is not approved')
  }

  const now = new Date()

  for (const item of lineItems) {
    const id = crypto.randomUUID()
    await db.insert(tasksTable).values({
      id,
      orgId,
      orderId,
      stageId: null,
      status: 'queued',
      context: {
        productName: item.name ?? '',
        customerName: '',
        requirements: item.notes ?? null,
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
