import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  customers as customersTable,
  orderLineItems as lineItemsTable,
  orders as ordersTable,
  organization,
  products as productsTable,
  productionStages as stagesTable,
  productionTasks as tasksTable,
} from '#/db/schema'
import { READY_FOR_PRODUCTION_STATUS } from '#/features/production/constants'
import { getTaskStageCounts } from './model'

const orgId = '00000000-0000-0000-0000-000000000001'
const otherOrgId = '00000000-0000-0000-0000-000000000002'

beforeEach(async () => {
  await db.execute(sql`TRUNCATE organization CASCADE`)
  const now = new Date()
  await db.insert(organization).values([
    {
      id: orgId,
      name: 'Test Org',
      slug: 'test-org',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: otherOrgId,
      name: 'Other Org',
      slug: 'other-org',
      createdAt: now,
      updatedAt: now,
    },
  ])
})

async function seedOrder(orgId: string) {
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
    priority: false,
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
    status: 'approved',
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
    designName: 'Test Item',
    notes: '',
    productionDays: 1,
    deadline: new Date(now.getTime() + 86400000),
    createdAt: now,
    updatedAt: now,
  })

  return { orderId, customerId, productId }
}

describe('getTaskStageCounts', () => {
  it('returns empty array when no stages and no tasks exist', async () => {
    const result = await getTaskStageCounts(orgId)
    // Should still return synthetic buckets even with no stages
    expect(result).toEqual([
      { id: 'queue', name: 'queue', board: 'pre_production', count: 0 },
      {
        id: READY_FOR_PRODUCTION_STATUS,
        name: READY_FOR_PRODUCTION_STATUS,
        board: 'pre_production',
        count: 0,
      },
      { id: 'done', name: 'done', board: 'production', count: 0 },
    ])
  })

  it('mirrors kanban flow order: queue → pre-production stages → ready_for_production → production stages → done', async () => {
    const now = new Date()

    // Create stages in explicit order
    await db.insert(stagesTable).values([
      {
        id: 'pp-stage-1',
        orgId,
        name: 'Design Review',
        board: 'pre_production',
        orderIndex: 0,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'pp-stage-2',
        orgId,
        name: 'Prepress',
        board: 'pre_production',
        orderIndex: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-stage-1',
        orgId,
        name: 'Printing',
        board: 'production',
        orderIndex: 0,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-stage-2',
        orgId,
        name: 'Finishing',
        board: 'production',
        orderIndex: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await getTaskStageCounts(orgId)

    expect(result.map((r) => r.id)).toEqual([
      'queue',
      'pp-stage-1',
      'pp-stage-2',
      READY_FOR_PRODUCTION_STATUS,
      'prod-stage-1',
      'prod-stage-2',
      'done',
    ])

    // All counts zero since no tasks seeded
    for (const item of result) {
      expect(item.count).toBe(0)
    }
  })

  it('counts queued tasks in the queue bucket', async () => {
    const now = new Date()
    const { orderId } = await seedOrder(orgId)

    await db.insert(tasksTable).values([
      {
        id: 'task-q1',
        orgId,
        orderId,
        board: 'pre_production',
        stageId: null,
        status: 'queued',
        taskNumber: 'TSK-001',
        priority: false,
        context: { productName: 'P1', customerName: 'C1', requirements: null },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-q2',
        orgId,
        orderId,
        board: 'pre_production',
        stageId: null,
        status: 'queued',
        taskNumber: 'TSK-002',
        priority: false,
        context: { productName: 'P2', customerName: 'C2', requirements: null },
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await getTaskStageCounts(orgId)
    const queue = result.find((r) => r.id === 'queue')
    expect(queue?.count).toBe(2)
  })

  it('counts queued tasks in the queue bucket even when stageId is set', async () => {
    const now = new Date()
    const { orderId } = await seedOrder(orgId)

    await db.insert(stagesTable).values({
      id: 'pp-stage',
      orgId,
      name: 'Design',
      board: 'pre_production',
      orderIndex: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    })

    await db.insert(tasksTable).values({
      id: 'task-q-stage',
      orgId,
      orderId,
      board: 'pre_production',
      stageId: 'pp-stage',
      status: 'queued',
      taskNumber: 'TSK-QS',
      priority: false,
      context: { productName: 'P1', customerName: 'C1', requirements: null },
      createdAt: now,
      updatedAt: now,
    })

    const result = await getTaskStageCounts(orgId)
    const queue = result.find((r) => r.id === 'queue')
    const stage = result.find((r) => r.id === 'pp-stage')

    expect(queue?.count).toBe(1)
    expect(stage?.count).toBe(0)
  })
  it('counts tasks in active pre-production stages', async () => {
    const now = new Date()
    const { orderId } = await seedOrder(orgId)

    await db.insert(stagesTable).values({
      id: 'pp-stage',
      orgId,
      name: 'Design',
      board: 'pre_production',
      orderIndex: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    })

    await db.insert(tasksTable).values({
      id: 'task-pp',
      orgId,
      orderId,
      board: 'pre_production',
      stageId: 'pp-stage',
      status: 'in_progress',
      taskNumber: 'TSK-PP',
      priority: false,
      context: { productName: 'P1', customerName: 'C1', requirements: null },
      createdAt: now,
      updatedAt: now,
    })

    const result = await getTaskStageCounts(orgId)
    const stage = result.find((r) => r.id === 'pp-stage')
    expect(stage?.count).toBe(1)
  })

  it('counts ready_for_production tasks in their own synthetic bucket, not in queue', async () => {
    const now = new Date()
    const { orderId } = await seedOrder(orgId)

    await db.insert(stagesTable).values({
      id: 'pp-stage',
      orgId,
      name: 'Design',
      board: 'pre_production',
      orderIndex: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    })

    await db.insert(tasksTable).values([
      {
        id: 'task-queued',
        orgId,
        orderId,
        board: 'pre_production',
        stageId: null,
        status: 'queued',
        taskNumber: 'TSK-Q',
        priority: false,
        context: { productName: 'P1', customerName: 'C1', requirements: null },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-ready',
        orgId,
        orderId,
        board: 'pre_production',
        stageId: null,
        status: READY_FOR_PRODUCTION_STATUS,
        taskNumber: 'TSK-R',
        priority: false,
        context: { productName: 'P2', customerName: 'C2', requirements: null },
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await getTaskStageCounts(orgId)
    const queue = result.find((r) => r.id === 'queue')
    const ready = result.find((r) => r.id === READY_FOR_PRODUCTION_STATUS)

    expect(queue?.count).toBe(1)
    expect(ready?.count).toBe(1)
  })

  it('counts active production stage tasks', async () => {
    const now = new Date()
    const { orderId } = await seedOrder(orgId)

    await db.insert(stagesTable).values({
      id: 'prod-stage',
      orgId,
      name: 'Printing',
      board: 'production',
      orderIndex: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    })

    await db.insert(tasksTable).values({
      id: 'task-prod',
      orgId,
      orderId,
      board: 'production',
      stageId: 'prod-stage',
      status: 'in_progress',
      taskNumber: 'TSK-P',
      priority: false,
      context: { productName: 'P1', customerName: 'C1', requirements: null },
      createdAt: now,
      updatedAt: now,
    })

    const result = await getTaskStageCounts(orgId)
    const stage = result.find((r) => r.id === 'prod-stage')
    expect(stage?.count).toBe(1)
  })

  it('counts unarchived completed tasks in the done bucket', async () => {
    const now = new Date()
    const { orderId } = await seedOrder(orgId)

    await db.insert(tasksTable).values({
      id: 'task-done',
      orgId,
      orderId,
      board: 'production',
      stageId: null,
      status: 'completed',
      taskNumber: 'TSK-D',
      priority: false,
      context: { productName: 'P1', customerName: 'C1', requirements: null },
      createdAt: now,
      updatedAt: now,
    })

    const result = await getTaskStageCounts(orgId)
    const done = result.find((r) => r.id === 'done')
    expect(done?.count).toBe(1)
  })

  it('excludes archived completed tasks from the done bucket', async () => {
    const now = new Date()
    const { orderId } = await seedOrder(orgId)

    await db.insert(tasksTable).values([
      {
        id: 'task-done-unarchived',
        orgId,
        orderId,
        board: 'production',
        stageId: null,
        status: 'completed',
        taskNumber: 'TSK-U',
        priority: false,
        context: { productName: 'P1', customerName: 'C1', requirements: null },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-done-archived',
        orgId,
        orderId,
        board: 'production',
        stageId: null,
        status: 'completed',
        taskNumber: 'TSK-A',
        priority: false,
        context: { productName: 'P2', customerName: 'C2', requirements: null },
        archivedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await getTaskStageCounts(orgId)
    const done = result.find((r) => r.id === 'done')
    expect(done?.count).toBe(1)
  })

  it('excludes archived tasks from stage counts', async () => {
    const now = new Date()
    const { orderId } = await seedOrder(orgId)

    await db.insert(stagesTable).values({
      id: 'stage-a',
      orgId,
      name: 'Design',
      board: 'pre_production',
      orderIndex: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    })

    await db.insert(tasksTable).values([
      {
        id: 'task-active',
        orgId,
        orderId,
        board: 'pre_production',
        stageId: 'stage-a',
        status: 'in_progress',
        taskNumber: 'TSK-ACTIVE',
        priority: false,
        context: { productName: 'P1', customerName: 'C1', requirements: null },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-archived',
        orgId,
        orderId,
        board: 'pre_production',
        stageId: 'stage-a',
        status: 'in_progress',
        taskNumber: 'TSK-ARCH',
        priority: false,
        context: { productName: 'P2', customerName: 'C2', requirements: null },
        archivedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await getTaskStageCounts(orgId)
    const stage = result.find((r) => r.id === 'stage-a')
    expect(stage?.count).toBe(1)
  })

  it('excludes archived tasks from queue counts', async () => {
    const now = new Date()
    const { orderId } = await seedOrder(orgId)

    await db.insert(tasksTable).values([
      {
        id: 'task-q-active',
        orgId,
        orderId,
        board: 'pre_production',
        stageId: null,
        status: 'queued',
        taskNumber: 'TSK-Q1',
        priority: false,
        context: { productName: 'P1', customerName: 'C1', requirements: null },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-q-archived',
        orgId,
        orderId,
        board: 'pre_production',
        stageId: null,
        status: 'queued',
        taskNumber: 'TSK-Q2',
        priority: false,
        context: { productName: 'P2', customerName: 'C2', requirements: null },
        archivedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await getTaskStageCounts(orgId)
    const queue = result.find((r) => r.id === 'queue')
    expect(queue?.count).toBe(1)
  })

  it('isolates counts by org', async () => {
    const now = new Date()
    const { orderId: orderId1 } = await seedOrder(orgId)
    const { orderId: orderId2 } = await seedOrder(otherOrgId)

    await db.insert(stagesTable).values([
      {
        id: 'stage-org1',
        orgId,
        name: 'Org1 Stage',
        board: 'pre_production',
        orderIndex: 0,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'stage-org2',
        orgId: otherOrgId,
        name: 'Org2 Stage',
        board: 'pre_production',
        orderIndex: 0,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    await db.insert(tasksTable).values([
      {
        id: 'task-org1',
        orgId,
        orderId: orderId1,
        board: 'pre_production',
        stageId: 'stage-org1',
        status: 'in_progress',
        taskNumber: 'TSK-O1',
        priority: false,
        context: { productName: 'P1', customerName: 'C1', requirements: null },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-org2',
        orgId: otherOrgId,
        orderId: orderId2,
        board: 'pre_production',
        stageId: 'stage-org2',
        status: 'in_progress',
        taskNumber: 'TSK-O2',
        priority: false,
        context: { productName: 'P2', customerName: 'C2', requirements: null },
        createdAt: now,
        updatedAt: now,
      },
    ])

    const org1Result = await getTaskStageCounts(orgId)
    const org2Result = await getTaskStageCounts(otherOrgId)

    const org1Stage = org1Result.find((r) => r.id === 'stage-org1')
    const org2Stage = org2Result.find((r) => r.id === 'stage-org2')

    expect(org1Stage?.count).toBe(1)
    expect(org2Stage?.count).toBe(1)

    // org1 should not see org2's stage
    expect(org1Result.find((r) => r.id === 'stage-org2')).toBeUndefined()
    expect(org2Result.find((r) => r.id === 'stage-org1')).toBeUndefined()
  })

  it('excludes inactive stages from results', async () => {
    const now = new Date()
    const { orderId } = await seedOrder(orgId)

    await db.insert(stagesTable).values([
      {
        id: 'active-stage',
        orgId,
        name: 'Active',
        board: 'pre_production',
        orderIndex: 0,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inactive-stage',
        orgId,
        name: 'Inactive',
        board: 'pre_production',
        orderIndex: 1,
        active: false,
        createdAt: now,
        updatedAt: now,
      },
    ])

    await db.insert(tasksTable).values({
      id: 'task-inactive',
      orgId,
      orderId,
      board: 'pre_production',
      stageId: 'inactive-stage',
      status: 'in_progress',
      taskNumber: 'TSK-INACT',
      priority: false,
      context: { productName: 'P1', customerName: 'C1', requirements: null },
      createdAt: now,
      updatedAt: now,
    })

    const result = await getTaskStageCounts(orgId)
    const ids = result.map((r) => r.id)

    expect(ids).toContain('active-stage')
    expect(ids).not.toContain('inactive-stage')
  })

  it('seeds mixed statuses across both boards and asserts correct counts per bucket', async () => {
    const now = new Date()
    const { orderId } = await seedOrder(orgId)

    await db.insert(stagesTable).values([
      {
        id: 'pp-design',
        orgId,
        name: 'Design Review',
        board: 'pre_production',
        orderIndex: 0,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-print',
        orgId,
        name: 'Printing',
        board: 'production',
        orderIndex: 0,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    await db.insert(tasksTable).values([
      // 2 queued
      {
        id: 't-q1',
        orgId,
        orderId,
        board: 'pre_production',
        stageId: null,
        status: 'queued',
        taskNumber: 'TSK-Q1',
        priority: false,
        context: { productName: 'P1', customerName: 'C1', requirements: null },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 't-q2',
        orgId,
        orderId,
        board: 'pre_production',
        stageId: null,
        status: 'queued',
        taskNumber: 'TSK-Q2',
        priority: false,
        context: { productName: 'P2', customerName: 'C2', requirements: null },
        createdAt: now,
        updatedAt: now,
      },
      // 1 in pre-production stage
      {
        id: 't-pp',
        orgId,
        orderId,
        board: 'pre_production',
        stageId: 'pp-design',
        status: 'in_progress',
        taskNumber: 'TSK-PP',
        priority: false,
        context: { productName: 'P3', customerName: 'C3', requirements: null },
        createdAt: now,
        updatedAt: now,
      },
      // 1 ready_for_production
      {
        id: 't-rfp',
        orgId,
        orderId,
        board: 'pre_production',
        stageId: null,
        status: READY_FOR_PRODUCTION_STATUS,
        taskNumber: 'TSK-RFP',
        priority: false,
        context: { productName: 'P4', customerName: 'C4', requirements: null },
        createdAt: now,
        updatedAt: now,
      },
      // 2 in production stage
      {
        id: 't-pr1',
        orgId,
        orderId,
        board: 'production',
        stageId: 'prod-print',
        status: 'in_progress',
        taskNumber: 'TSK-PR1',
        priority: false,
        context: { productName: 'P5', customerName: 'C5', requirements: null },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 't-pr2',
        orgId,
        orderId,
        board: 'production',
        stageId: 'prod-print',
        status: 'in_progress',
        taskNumber: 'TSK-PR2',
        priority: false,
        context: { productName: 'P6', customerName: 'C6', requirements: null },
        createdAt: now,
        updatedAt: now,
      },
      // 1 completed unarchived → done
      {
        id: 't-done',
        orgId,
        orderId,
        board: 'production',
        stageId: null,
        status: 'completed',
        taskNumber: 'TSK-DONE',
        priority: false,
        context: { productName: 'P7', customerName: 'C7', requirements: null },
        createdAt: now,
        updatedAt: now,
      },
      // 1 completed archived → excluded
      {
        id: 't-arch',
        orgId,
        orderId,
        board: 'production',
        stageId: null,
        status: 'completed',
        taskNumber: 'TSK-ARCH',
        priority: false,
        context: { productName: 'P8', customerName: 'C8', requirements: null },
        archivedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await getTaskStageCounts(orgId)

    expect(result).toHaveLength(5) // queue + pp-design + ready_for + prod-print + done
    expect(result.map((r) => r.id)).toEqual([
      'queue',
      'pp-design',
      READY_FOR_PRODUCTION_STATUS,
      'prod-print',
      'done',
    ])

    expect(result).toEqual([
      { id: 'queue', name: 'queue', board: 'pre_production', count: 2 },
      {
        id: 'pp-design',
        name: 'Design Review',
        board: 'pre_production',
        count: 1,
      },
      {
        id: READY_FOR_PRODUCTION_STATUS,
        name: READY_FOR_PRODUCTION_STATUS,
        board: 'pre_production',
        count: 1,
      },
      { id: 'prod-print', name: 'Printing', board: 'production', count: 2 },
      { id: 'done', name: 'done', board: 'production', count: 1 },
    ])
  })
})
