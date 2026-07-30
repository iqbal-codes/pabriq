import { and, desc, eq, inArray } from 'drizzle-orm'
import type { db } from '#/db/index'
import {
  taskActivity as activityTable,
  customers as customersTable,
  orderLineItems as lineItemsTable,
  orders as ordersTable,
  products as productsTable,
  productionTasks as tasksTable,
} from '#/db/schema'
import { getResolvedTaskMaterials } from '#/features/materials/model'
import { getVisibleDesignName } from '#/features/orders/line-item-display'

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
type TaskSpawnClient =
  | Pick<typeof db, 'select' | 'insert'>
  | Pick<DbTransaction, 'select' | 'insert'>

export async function spawnQueuedPreProductionTasksForOrder(
  client: TaskSpawnClient,
  input: {
    orderId: string
    orgId: string
    allowedStatuses: readonly string[]
  },
): Promise<void> {
  const { orderId, orgId, allowedStatuses } = input

  const orderRows = await client
    .select({
      id: ordersTable.id,
      status: ordersTable.status,
      orderNumber: ordersTable.orderNumber,
      customerId: ordersTable.customerId,
      total: ordersTable.total,
    })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.orgId, orgId)))
    .limit(1)

  if (orderRows.length === 0) throw new Error('Order not found')

  const order = orderRows[0]
  if (!allowedStatuses.includes(order.status)) {
    throw new Error('Order is not approved')
  }

  const lineItemRows = await client
    .select({
      id: lineItemsTable.id,
      productId: lineItemsTable.productId,
      productName: lineItemsTable.productName,
      designName: lineItemsTable.designName,
      notes: lineItemsTable.notes,
      quantity: lineItemsTable.quantity,
      unitPrice: lineItemsTable.unitPrice,
      total: lineItemsTable.total,
      assetId: lineItemsTable.assetId,
      deadline: lineItemsTable.deadline,
    })
    .from(lineItemsTable)
    .where(eq(lineItemsTable.orderId, orderId))
    .orderBy(lineItemsTable.createdAt)

  if (lineItemRows.length === 0) {
    throw new Error('Order has no line items')
  }

  let customerName: string | null = null
  let customerEmail: string | null = null
  let customerPhone: string | null = null
  if (order.customerId) {
    const customerRows = await client
      .select({
        name: customersTable.name,
        email: customersTable.email,
        phone: customersTable.phone,
      })
      .from(customersTable)
      .where(
        and(
          eq(customersTable.id, order.customerId),
          eq(customersTable.orgId, orgId),
        ),
      )
      .limit(1)

    if (customerRows.length > 0) {
      customerName = customerRows[0].name
      customerEmail = customerRows[0].email ?? null
      customerPhone = customerRows[0].phone ?? null
    }
  }

  const uniqueProductIds = [
    ...new Set(lineItemRows.map((item) => item.productId)),
  ]

  const [latestTask, productPriorityRows, existingTasks, resolvedMaterials] =
    await Promise.all([
      client
        .select({ taskNumber: tasksTable.taskNumber })
        .from(tasksTable)
        .where(eq(tasksTable.orgId, orgId))
        .orderBy(desc(tasksTable.createdAt), desc(tasksTable.id))
        .limit(1),
      uniqueProductIds.length > 0
        ? client
            .select({
              id: productsTable.id,
              priority: productsTable.priority,
              name: productsTable.name,
            })
            .from(productsTable)
            .where(
              and(
                eq(productsTable.orgId, orgId),
                inArray(productsTable.id, uniqueProductIds),
              ),
            )
        : Promise.resolve([]),
      client
        .select({ lineItemId: tasksTable.lineItemId })
        .from(tasksTable)
        .where(
          and(eq(tasksTable.orgId, orgId), eq(tasksTable.orderId, orderId)),
        ),
      getResolvedTaskMaterials(orgId),
    ])

  const productPriorityMap = new Map(
    productPriorityRows.map((row) => [row.id, row.priority]),
  )
  const productNameMap = new Map(
    productPriorityRows.map((row) => [row.id, row.name]),
  )

  const existingLineItemIds = new Set(
    existingTasks
      .map((t) => t.lineItemId)
      .filter((id): id is string => id !== null),
  )
  const missingLineItems = lineItemRows.filter(
    (item) => !existingLineItemIds.has(item.id),
  )

  if (missingLineItems.length === 0) return

  let nextNum = latestTask[0]?.taskNumber
    ? Number.parseInt(latestTask[0].taskNumber.split('-')[1], 10) + 1
    : 1
  const now = new Date()

  const taskValues: (typeof tasksTable.$inferInsert)[] = []
  const activityValues: (typeof activityTable.$inferInsert)[] = []

  for (const item of missingLineItems) {
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
        productName:
          item.productName || (productNameMap.get(item.productId) ?? ''),
        designName: getVisibleDesignName(
          item.designName,
          item.productName || (productNameMap.get(item.productId) ?? ''),
        ),
        customerName: customerName ?? '',
        customerId: order.customerId ?? null,
        customerEmail: customerEmail ?? null,
        customerPhone: customerPhone ?? null,
        requirements: item.notes ?? null,
        specification: item.notes ?? null,
        files: item.assetId ? [{ id: item.assetId }] : null,
        orderNumber: order.orderNumber ?? '',
        orderTotal: order.total ?? 0,
        currency: 'IDR',
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? 0,
        total: item.total ?? 0,
        deadline: item.deadline.toISOString(),
        materials: resolvedMaterials,
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

  if (taskValues.length > 0) {
    await client.insert(tasksTable).values(taskValues)
  }
  if (activityValues.length > 0) {
    await client.insert(activityTable).values(activityValues)
  }
}
