import { eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  customers as customersTable,
  orderLineItems as lineItemsTable,
  orders as ordersTable,
  organization,
  products as productsTable,
  productionTasks as tasksTable,
} from '#/db/schema'
import { approveOrder, rejectOrder } from '#/features/orders/model'
import {
  advanceTask,
  approveTaskAdvance,
  createStage,
  deleteStage,
  getStage,
  listBoardTasks,
  listStages,
  listTaskActivities,
  rejectTaskAdvance,
  reorderStages,
  saveTaskComment,
  toggleStage,
  updateStage,
} from './model'
import { spawnProductionTasks, spawnTasksForApprovedOrder } from './spawner'

const org1Id = '00000000-0000-0000-0000-000000000001'
const org2Id = '00000000-0000-0000-0000-000000000002'

beforeEach(async () => {
  await db.execute(sql`TRUNCATE organization CASCADE`)
  const now = new Date()
  await db.insert(organization).values([
    {
      id: org1Id,
      name: 'Org 1',
      slug: 'org-1',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: org2Id,
      name: 'Org 2',
      slug: 'org-2',
      createdAt: now,
      updatedAt: now,
    },
  ])
})

describe('production stages', () => {
  it('creates a stage and returns it', async () => {
    const stage = await createStage({
      orgId: org1Id,
      name: '3D Design',
    })

    expect(stage.id).toBeDefined()
    expect(stage.name).toBe('3D Design')
    expect(stage.orgId).toBe(org1Id)
    expect(stage.active).toBe(true)
    expect(stage.needApproval).toBe(false)
    expect(stage.description).toBeNull()
    expect(stage.requirements).toEqual([])
    expect(stage.orderIndex).toBe(0)
  })

  it('lists stages by org and does not leak across orgs', async () => {
    await createStage({ orgId: org1Id, name: 'Design' })
    await createStage({ orgId: org1Id, name: 'Mold' })
    await createStage({ orgId: org2Id, name: 'Other Stage' })

    const stages = await listStages(org1Id)

    expect(stages).toHaveLength(2)
    expect(stages.map((s) => s.name).sort()).toEqual(['Design', 'Mold'])
  })

  it('gets a stage by id and orgId', async () => {
    const created = await createStage({ orgId: org1Id, name: 'QC' })

    const found = await getStage(created.id, org1Id)

    expect(found).not.toBeNull()
    expect(found?.name).toBe('QC')
  })

  it('returns null when stage not found in org', async () => {
    const created = await createStage({ orgId: org1Id, name: 'Not Found' })

    const result = await getStage(created.id, org2Id)

    expect(result).toBeNull()
  })

  it('updates a stage', async () => {
    const created = await createStage({ orgId: org1Id, name: 'Old Name' })

    const updated = await updateStage({
      id: created.id,
      orgId: org1Id,
      name: 'New Name',
      description: 'Updated description',
      needApproval: true,
    })

    expect(updated.name).toBe('New Name')
    expect(updated.description).toBe('Updated description')
    expect(updated.needApproval).toBe(true)
  })

  it('toggles stage active status', async () => {
    const created = await createStage({ orgId: org1Id, name: 'Toggle Me' })
    expect(created.active).toBe(true)

    const deactivated = await toggleStage(created.id, org1Id, false)
    expect(deactivated.active).toBe(false)

    const reactivated = await toggleStage(created.id, org1Id, true)
    expect(reactivated.active).toBe(true)
  })

  it('reorders stages', async () => {
    const [s1, s2, s3] = await Promise.all([
      createStage({
        orgId: org1Id,
        name: 'First',
        orderIndex: 0,
      }),
      createStage({
        orgId: org1Id,
        name: 'Second',
        orderIndex: 1,
      }),
      createStage({
        orgId: org1Id,
        name: 'Third',
        orderIndex: 2,
      }),
    ])

    const stagesBefore = await listStages(org1Id)
    expect(stagesBefore.map((s) => s.name)).toEqual([
      'First',
      'Second',
      'Third',
    ])

    await reorderStages(org1Id, [s3.id, s1.id, s2.id])

    const stagesAfter = await listStages(org1Id)
    expect(stagesAfter.map((s) => s.name)).toEqual(['Third', 'First', 'Second'])
  })

  it('deletes a stage', async () => {
    const created = await createStage({ orgId: org1Id, name: 'Delete Me' })

    await deleteStage(created.id, org1Id)

    const fetched = await getStage(created.id, org1Id)
    expect(fetched).toBeNull()
  })

  it('does not delete from wrong org', async () => {
    const created = await createStage({ orgId: org1Id, name: 'Safe' })

    await expect(deleteStage(created.id, org2Id)).rejects.toThrow(
      'Stage not found',
    )

    const fetched = await getStage(created.id, org1Id)
    expect(fetched).not.toBeNull()
  })
})

async function seedOrder(
  orgId: string,
  status = 'pending',
  productPriority = false,
) {
  const now = new Date()
  const customerId = crypto.randomUUID()
  const productId = crypto.randomUUID()
  const orderId = crypto.randomUUID()

  await db.insert(customersTable).values({
    id: customerId,
    orgId,
    name: 'Test Customer',
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(productsTable).values({
    id: productId,
    orgId,
    name: 'Test Product',
    priority: productPriority,
    basePrice: 10000,
    productionDays: 1,
    minQuantity: 1,
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(ordersTable).values({
    id: orderId,
    orgId,
    customerId,
    status,
    total: 10000,
    orderNumber: `ORD-${now.getFullYear()}-001`,
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(lineItemsTable).values({
    id: crypto.randomUUID(),
    orgId,
    orderId,
    productId,
    quantity: 1,
    unitPrice: 10000,
    total: 10000,
    name: 'Test Product Item',
    notes: 'Red color, size L',
    createdAt: now,
    updatedAt: now,
  })

  return { orderId, customerId, productId }
}

describe('order approval and task spawning', () => {
  it('approves a pending order', async () => {
    const { orderId } = await seedOrder(org1Id, 'pending')

    await approveOrder(orderId, org1Id, 'user-1')

    const orderRows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1)

    expect(orderRows[0].status).toBe('approved')
    expect(orderRows[0].approvedAt).not.toBeNull()
    expect(orderRows[0].approvedBy).toBe('user-1')
  })

  it('rejects a non-pending order approval', async () => {
    const { orderId } = await seedOrder(org1Id, 'draft')

    await expect(approveOrder(orderId, org1Id, 'user-1')).rejects.toThrow(
      'Only pending orders can be approved',
    )
  })

  it('rejects a pending order', async () => {
    const { orderId } = await seedOrder(org1Id, 'pending')

    await rejectOrder(orderId, org1Id, {
      rejectedBy: 'user-1',
      reason: 'Incomplete details',
    })

    const orderRows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1)

    expect(orderRows[0].status).toBe('rejected')
    expect(orderRows[0].rejectedAt).not.toBeNull()
    expect(orderRows[0].rejectedBy).toBe('user-1')
    expect(orderRows[0].rejectReason).toBe('Incomplete details')
  })

  it('spawns one task per line item with queued status', async () => {
    const { orderId } = await seedOrder(org1Id, 'pending')
    await approveOrder(orderId, org1Id, 'user-1')

    await spawnTasksForApprovedOrder(orderId, org1Id)

    const tasks = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.orderId, orderId))

    expect(tasks).toHaveLength(1)
    expect(tasks[0].status).toBe('queued')
    expect(tasks[0].stageId).toBeNull()
    expect(tasks[0].orgId).toBe(org1Id)
    expect(tasks[0].orderId).toBe(orderId)
  })

  it('copies product priority onto approved-order tasks', async () => {
    const { orderId } = await seedOrder(org1Id, 'pending', true)
    await approveOrder(orderId, org1Id, 'user-1')

    await spawnTasksForApprovedOrder(orderId, org1Id)

    const tasks = await db
      .select({ priority: tasksTable.priority })
      .from(tasksTable)
      .where(eq(tasksTable.orderId, orderId))

    expect(tasks).toHaveLength(1)
    expect(tasks[0].priority).toBe(true)
  })

  it('copies product priority onto production-board tasks', async () => {
    const { orderId } = await seedOrder(org1Id, 'in_progress', true)

    await spawnProductionTasks(orderId, org1Id)

    const tasks = await db
      .select({ priority: tasksTable.priority, board: tasksTable.board })
      .from(tasksTable)
      .where(eq(tasksTable.orderId, orderId))

    expect(tasks).toHaveLength(1)
    expect(tasks[0].priority).toBe(true)
    expect(tasks[0].board).toBe('production')
  })

  it('spawns tasks only for approved orders', async () => {
    const { orderId } = await seedOrder(org1Id, 'draft')

    await expect(spawnTasksForApprovedOrder(orderId, org1Id)).rejects.toThrow(
      'Order is not approved',
    )
  })

  it('generates sequential task numbers per org', async () => {
    const { orderId: o1 } = await seedOrder(org1Id, 'pending')
    await approveOrder(o1, org1Id, 'user-1')
    await spawnTasksForApprovedOrder(o1, org1Id)

    const tasks1 = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.orderId, o1))

    expect(tasks1[0].taskNumber).toBe('TSK-1')

    const { orderId: o2 } = await seedOrder(org1Id, 'pending')
    await approveOrder(o2, org1Id, 'user-1')
    await spawnTasksForApprovedOrder(o2, org1Id)

    const tasks2 = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.orderId, o2))

    expect(tasks2[0].taskNumber).toBe('TSK-2')
  })
})

describe('listBoardTasks', () => {
  it('sorts queued tasks with priority first', async () => {
    const now = new Date()
    const [
      { orderId: orderId1 },
      { orderId: orderId2 },
      { orderId: orderId3 },
    ] = await Promise.all([
      seedOrder(org1Id),
      seedOrder(org1Id),
      seedOrder(org1Id),
    ])

    const queuedTasks: Array<typeof tasksTable.$inferInsert> = [
      {
        id: 'task-low-old',
        orgId: org1Id,
        orderId: orderId1,
        board: 'pre_production',
        stageId: null,
        status: 'queued',
        taskNumber: 'TSK-1',
        lineItemId: 'line-item-1',
        priority: false,
        context: {
          productName: 'Standard Product',
          customerName: 'Customer',
          requirements: null,
          orderNumber: 'ORD-001',
          quantity: 1,
        },
        createdAt: new Date(now.getTime()),
        updatedAt: new Date(now.getTime()),
      },
      {
        id: 'task-high-new',
        orgId: org1Id,
        orderId: orderId2,
        board: 'pre_production',
        stageId: null,
        status: 'queued',
        taskNumber: 'TSK-2',
        lineItemId: 'line-item-2',
        priority: true,
        context: {
          productName: 'Priority Product',
          customerName: 'Customer',
          requirements: null,
          orderNumber: 'ORD-002',
          quantity: 1,
        },
        createdAt: new Date(now.getTime() + 1000),
        updatedAt: new Date(now.getTime() + 1000),
      },
      {
        id: 'task-low-new',
        orgId: org1Id,
        orderId: orderId3,
        board: 'pre_production',
        stageId: null,
        status: 'queued',
        taskNumber: 'TSK-3',
        lineItemId: 'line-item-3',
        priority: false,
        context: {
          productName: 'Another Standard Product',
          customerName: 'Customer',
          requirements: null,
          orderNumber: 'ORD-003',
          quantity: 1,
        },
        createdAt: new Date(now.getTime() + 2000),
        updatedAt: new Date(now.getTime() + 2000),
      },
    ]

    await db.insert(tasksTable).values(queuedTasks)

    const boardTasks = await listBoardTasks(org1Id)

    expect(boardTasks.queued.map((task) => task.task.id)).toEqual([
      'task-high-new',
      'task-low-old',
      'task-low-new',
    ])
  })
})

describe('task advancement', () => {
  async function seedTask(orgId: string) {
    const { orderId } = await seedOrder(orgId, 'approved')
    await spawnTasksForApprovedOrder(orderId, orgId)
    const tasks = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.orderId, orderId))
      .limit(1)
    const task = tasks[0] as { id: string }
    return { orderId, taskId: task.id }
  }

  it('advances queued task to first stage without approval', async () => {
    await createStage({ orgId: org1Id, name: 'Design', orderIndex: 0 })
    await createStage({ orgId: org1Id, name: 'Production', orderIndex: 1 })

    const { taskId } = await seedTask(org1Id)

    const result = await advanceTask(taskId, org1Id, 'operator-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.pendingApproval).toBe(false)

    const task = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1)
    expect(task[0].status).toBe('in_progress')
    expect(task[0].stageId).toBeDefined()
  })

  it('advances queued task to first stage even when it requires approval', async () => {
    const designStage = await createStage({
      orgId: org1Id,
      name: 'Design',
      orderIndex: 0,
      needApproval: true,
    })

    const { taskId } = await seedTask(org1Id)

    const result = await advanceTask(taskId, org1Id, 'operator-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.pendingApproval).toBe(false)

    const task = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1)
    expect(task[0].status).toBe('in_progress')
    expect(task[0].stageId).toBe(designStage.id)
  })

  it('approves pending advancement and moves to next stage', async () => {
    await createStage({ orgId: org1Id, name: 'Design', orderIndex: 0 })
    const productionStage = await createStage({
      orgId: org1Id,
      name: 'Production',
      orderIndex: 1,
      needApproval: true,
    })

    const { taskId } = await seedTask(org1Id)

    await advanceTask(taskId, org1Id, 'operator-1')
    await advanceTask(taskId, org1Id, 'operator-1')

    const result = await approveTaskAdvance(
      taskId,
      org1Id,
      'admin-1',
      'admin',
      'Looks good',
    )

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.pendingApproval).toBe(false)

    const task = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1)
    expect(task[0].status).toBe('in_progress')
    expect(task[0].stageId).toBe(productionStage.id)
  })

  it('rejects pending advancement and returns to in_progress', async () => {
    const designStage = await createStage({
      orgId: org1Id,
      name: 'Design',
      orderIndex: 0,
    })
    await createStage({
      orgId: org1Id,
      name: 'Production',
      orderIndex: 1,
      needApproval: true,
    })

    const { taskId } = await seedTask(org1Id)

    await advanceTask(taskId, org1Id, 'operator-1')
    await advanceTask(taskId, org1Id, 'operator-1')

    await rejectTaskAdvance(
      taskId,
      org1Id,
      'admin-1',
      'admin',
      'Need better photos',
    )

    const task = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1)
    expect(task[0].status).toBe('in_progress')
    expect(task[0].stageId).toBe(designStage.id)
  })

  it('advances through stages then to completed on last stage', async () => {
    await createStage({ orgId: org1Id, name: 'QC', orderIndex: 0 })

    const { taskId } = await seedTask(org1Id)
    await advanceTask(taskId, org1Id, 'operator-1')

    let task = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1)
    expect(task[0].status).toBe('in_progress')

    await advanceTask(taskId, org1Id, 'operator-1')

    task = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1)
    expect(task[0].status).toBe('completed')
    expect(task[0].stageId).toBeNull()
  })

  it('blocks advancement from completed status', async () => {
    await createStage({ orgId: org1Id, name: 'QC', orderIndex: 0 })

    const { taskId } = await seedTask(org1Id)
    await advanceTask(taskId, org1Id, 'operator-1')
    await advanceTask(taskId, org1Id, 'operator-1')

    const result = await advanceTask(taskId, org1Id, 'operator-1')
    expect(result.ok).toBe(false)
  })

  it('logs activities for each action', async () => {
    await createStage({ orgId: org1Id, name: 'Design', orderIndex: 0 })

    const { taskId } = await seedTask(org1Id)

    await advanceTask(taskId, org1Id, 'operator-1')

    const activities = await listTaskActivities(taskId)

    expect(activities.length).toBeGreaterThanOrEqual(2)
    const types = activities.map((a) => a.type)
    expect(types).toContain('stage_transition')
  })

  it('saves a comment', async () => {
    await createStage({ orgId: org1Id, name: 'Design', orderIndex: 0 })

    const { taskId } = await seedTask(org1Id)

    await saveTaskComment(taskId, org1Id, 'operator-1', 'Need client logo')

    const activities = await listTaskActivities(taskId)
    const commentActivity = activities.find((a) => a.type === 'comment')
    expect(commentActivity).toBeDefined()
    expect(commentActivity?.data).toEqual({ text: 'Need client logo' })
  })

  it('rejects member approval of pending advancement', async () => {
    await createStage({
      orgId: org1Id,
      name: 'Design',
      orderIndex: 0,
      needApproval: true,
    })
    await createStage({ orgId: org1Id, name: 'Production', orderIndex: 1 })

    const { taskId } = await seedTask(org1Id)
    await advanceTask(taskId, org1Id, 'operator-1')

    const result = await approveTaskAdvance(
      taskId,
      org1Id,
      'operator-1',
      'member',
    )

    expect(result.ok).toBe(false)
  })

  it('rejects member rejection of pending advancement', async () => {
    await createStage({
      orgId: org1Id,
      name: 'Design',
      orderIndex: 0,
      needApproval: true,
    })

    const { taskId } = await seedTask(org1Id)
    await advanceTask(taskId, org1Id, 'operator-1')

    await expect(
      rejectTaskAdvance(taskId, org1Id, 'operator-1', 'member'),
    ).rejects.toThrow('Not authorized')
  })

  it('blocks advancement when required requirements are missing', async () => {
    await createStage({
      orgId: org1Id,
      name: 'Design',
      orderIndex: 0,
      requirements: [
        { id: 'notes', label: 'Notes', type: 'text' as const, required: true },
      ],
    })
    await createStage({ orgId: org1Id, name: 'Production', orderIndex: 1 })

    const { taskId } = await seedTask(org1Id)
    await advanceTask(taskId, org1Id, 'operator-1')

    const result = await advanceTask(taskId, org1Id, 'operator-1')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('Required requirements')
  })

  it('advances when required requirements are fulfilled', async () => {
    await createStage({
      orgId: org1Id,
      name: 'Design',
      orderIndex: 0,
      requirements: [
        { id: 'notes', label: 'Notes', type: 'text' as const, required: true },
      ],
    })
    await createStage({ orgId: org1Id, name: 'Production', orderIndex: 1 })

    const { taskId } = await seedTask(org1Id)
    await advanceTask(taskId, org1Id, 'operator-1')

    const result = await advanceTask(taskId, org1Id, 'operator-1', {
      notes: { value: 'All good' },
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.pendingApproval).toBe(false)
  })

  it('approveTaskAdvance scopes stages to task board when orderIndex overlaps across boards', async () => {
    const preProdStages = [
      await createStage({ orgId: org1Id, name: 'Design', orderIndex: 0 }),
      await createStage({
        orgId: org1Id,
        name: 'QC',
        orderIndex: 2,
        needApproval: true,
      }),
    ]
    await createStage({
      orgId: org1Id,
      name: 'Print',
      board: 'production',
      orderIndex: 1,
    })
    await createStage({
      orgId: org1Id,
      name: 'Pack',
      board: 'production',
      orderIndex: 3,
    })

    const { taskId, orderId } = await seedTask(org1Id)

    await advanceTask(taskId, org1Id, 'operator-1')

    await advanceTask(taskId, org1Id, 'operator-1')

    const result = await approveTaskAdvance(taskId, org1Id, 'admin-1', 'admin')

    expect(result.ok).toBe(true)

    const task = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1)
      .then((r) => r[0])

    // Must move to QC (next pre_production stage, idx 2), NOT Print (production, idx 1)
    expect(task.stageId).toBe(preProdStages[1].id)
    expect(task.status).toBe('in_progress')
    expect(task.board).toBe('pre_production')

    // Order still approved — task hasn't reached final stage yet
    const order = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1)
      .then((r) => r[0])
    expect(order.status).toBe('approved')
  })

  it('moves completed pre_production tasks onto the production board', async () => {
    const preProdStage = await createStage({
      orgId: org1Id,
      name: 'Design',
      orderIndex: 0,
      needApproval: true,
    })
    const productionStage = await createStage({
      orgId: org1Id,
      name: 'Print',
      board: 'production',
      orderIndex: 1,
    })

    const { taskId, orderId } = await seedTask(org1Id)

    const enterPreProduction = await advanceTask(taskId, org1Id, 'operator-1')
    expect(enterPreProduction.ok).toBe(true)
    if (enterPreProduction.ok) {
      expect(enterPreProduction.pendingApproval).toBe(false)
    }

    let task = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1)
      .then((r) => r[0])
    expect(task.stageId).toBe(preProdStage.id)
    expect(task.board).toBe('pre_production')

    const transitionResult = await advanceTask(taskId, org1Id, 'operator-1')
    expect(transitionResult.ok).toBe(true)
    if (transitionResult.ok) {
      expect(transitionResult.pendingApproval).toBe(false)
    }

    task = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1)
      .then((r) => r[0])
    expect(task.status).toBe('in_progress')
    expect(task.board).toBe('production')
    expect(task.stageId).toBe(productionStage.id)

    const order = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1)
      .then((r) => r[0])
    expect(order.status).toBe('approved')
  })

  it('saves requirementResponses to task context on advance', async () => {
    await createStage({
      orgId: org1Id,
      name: 'Design',
      orderIndex: 0,
      requirements: [
        { id: 'notes', label: 'Notes', type: 'text' as const, required: false },
        { id: 'qty', label: 'Qty', type: 'number' as const, required: true },
      ],
    })
    await createStage({ orgId: org1Id, name: 'Production', orderIndex: 1 })

    const { taskId } = await seedTask(org1Id)
    await advanceTask(taskId, org1Id, 'operator-1')

    await advanceTask(taskId, org1Id, 'operator-1', {
      notes: { value: 'Looks good' },
      qty: { value: '100' },
    })

    const task = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1)
    const ctx = task[0].context as Record<string, unknown> | null
    expect(ctx).toBeDefined()
    const responses = ctx?.requirementResponses as Record<string, unknown>
    expect(responses).toBeDefined()
    expect(responses.notes).toEqual({ value: 'Looks good' })
    expect(responses.qty).toEqual({ value: '100' })
  })
})
