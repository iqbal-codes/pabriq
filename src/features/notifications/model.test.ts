import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  customers as customersTable,
  invoices as invoicesTable,
  orders as ordersTable,
  organization,
  payments as paymentsTable,
  productionStages as productionStagesTable,
  productionTasks as productionTasksTable,
} from '#/db/schema'
import { listActionNotifications } from './model'

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

describe('listActionNotifications', () => {
  it('returns exactly one item for each unresolved source state and filters by org', async () => {
    const now = new Date()
    const past = new Date(now.getTime() - 1000 * 60)
    const older = new Date(now.getTime() - 2000 * 60)

    // Seed customer
    await db.insert(customersTable).values([
      {
        id: 'cust-1',
        orgId: org1Id,
        name: 'Acme Corp',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cust-2',
        orgId: org2Id,
        name: 'Globex Corp',
        createdAt: now,
        updatedAt: now,
      },
    ])

    // Seed invoices & payments
    await db.insert(invoicesTable).values([
      {
        id: 'inv-1',
        orgId: org1Id,
        invoiceNumber: 'INV-001',
        customerId: 'cust-1',
        customerName: 'Acme Corp',
        subtotal: 1000,
        total: 1000,
        dueDate: '2026-08-01',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-2',
        orgId: org2Id,
        invoiceNumber: 'INV-002',
        customerId: 'cust-2',
        customerName: 'Globex Corp',
        subtotal: 2000,
        total: 2000,
        dueDate: '2026-08-01',
        createdAt: now,
        updatedAt: now,
      },
    ])

    await db.insert(paymentsTable).values([
      {
        id: 'pm-1',
        orgId: org1Id,
        invoiceId: 'inv-1',
        amount: 1000,
        method: 'bank_transfer',
        status: 'pending',
        createdAt: older,
        updatedAt: older,
      },
      {
        id: 'pm-2',
        orgId: org2Id,
        invoiceId: 'inv-2',
        amount: 2000,
        method: 'bank_transfer',
        status: 'pending',
        createdAt: older,
        updatedAt: older,
      },
    ])

    // Seed orders
    await db.insert(ordersTable).values([
      {
        id: 'order-1',
        orgId: org1Id,
        customerId: 'cust-1',
        status: 'pending',
        total: 1000,
        orderNumber: 'ORD-001',
        createdAt: past,
        updatedAt: past,
      },
      {
        id: 'order-2',
        orgId: org2Id,
        customerId: 'cust-2',
        status: 'pending',
        total: 2000,
        orderNumber: 'ORD-002',
        createdAt: past,
        updatedAt: past,
      },
    ])

    // Seed production stages & tasks
    await db.insert(productionStagesTable).values([
      {
        id: 'stage-1',
        orgId: org1Id,
        name: 'Design',
        board: 'pre_production',
        createdAt: now,
        updatedAt: now,
      },
    ])

    await db.insert(productionTasksTable).values([
      {
        id: 'task-1',
        orgId: org1Id,
        orderId: 'order-1',
        board: 'pre_production',
        stageId: 'stage-1',
        status: 'pending_approval',
        taskNumber: 'TSK-001',
        context: {
          productName: 'Custom Banner',
          customerName: 'Acme Corp',
          orderNumber: 'ORD-001',
          requirements: null,
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-2',
        orgId: org2Id,
        orderId: 'order-2',
        board: 'pre_production',
        status: 'pending_approval',
        taskNumber: 'TSK-002',
        context: {
          productName: 'Custom Mug',
          customerName: 'Globex Corp',
          orderNumber: 'ORD-002',
          requirements: null,
        },
        createdAt: now,
        updatedAt: now,
      },
    ])

    // Test list for Org 1
    const result1 = await listActionNotifications({ orgId: org1Id })
    expect(result1.totalCount).toBe(3)
    expect(result1.counts).toEqual({
      payment_confirmation: 1,
      order_review: 1,
      dp_invoice_request: 0,
      final_invoice_request: 0,
      task_review: 1,
    })

    // Ordered by createdAt desc: task-1 (now) -> order-1 (past) -> pm-1 (older)
    const item0 = result1.items[0]
    expect(item0.id).toBe('task:task-1')
    expect(item0.type).toBe('task_review')
    if (item0.type === 'task_review') {
      expect(item0.context.stageName).toBe('Design')
    } else {
      expect.fail('Expected task_review')
    }

    const item1 = result1.items[1]
    expect(item1.id).toBe('order:order-1')
    expect(item1.type).toBe('order_review')

    const item2 = result1.items[2]
    expect(item2.id).toBe('payment:pm-1')
    expect(item2.type).toBe('payment_confirmation')

    // Test list for Org 2
    const result2 = await listActionNotifications({ orgId: org2Id })
    expect(result2.totalCount).toBe(3)
    expect(result2.counts).toEqual({
      payment_confirmation: 1,
      order_review: 1,
      dp_invoice_request: 0,
      final_invoice_request: 0,
      task_review: 1,
    })

    const item2_0 = result2.items[0]
    expect(item2_0.id).toBe('task:task-2')
    expect(item2_0.type).toBe('task_review')
    if (item2_0.type === 'task_review') {
      expect(item2_0.context.stageName).toBeNull()
    } else {
      expect.fail('Expected task_review')
    }
  })

  it('excludes resolved/non-action states', async () => {
    const now = new Date()

    await db.insert(customersTable).values([
      {
        id: 'cust-1',
        orgId: org1Id,
        name: 'Acme Corp',
        createdAt: now,
        updatedAt: now,
      },
    ])

    await db.insert(invoicesTable).values([
      {
        id: 'inv-1',
        orgId: org1Id,
        invoiceNumber: 'INV-001',
        customerId: 'cust-1',
        customerName: 'Acme Corp',
        subtotal: 1000,
        total: 1000,
        dueDate: '2026-08-01',
        createdAt: now,
        updatedAt: now,
      },
    ])

    // Seed resolved/non-action states
    await db.insert(paymentsTable).values([
      {
        id: 'pm-1',
        orgId: org1Id,
        invoiceId: 'inv-1',
        amount: 1000,
        method: 'bank_transfer',
        status: 'confirmed',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'pm-2',
        orgId: org1Id,
        invoiceId: 'inv-1',
        amount: 1000,
        method: 'bank_transfer',
        status: 'rejected',
        createdAt: now,
        updatedAt: now,
      },
    ])

    await db.insert(ordersTable).values([
      {
        id: 'order-1',
        orgId: org1Id,
        customerId: 'cust-1',
        status: 'draft',
        total: 1000,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'order-2',
        orgId: org1Id,
        customerId: 'cust-1',
        status: 'approved',
        total: 1000,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'order-3',
        orgId: org1Id,
        customerId: 'cust-1',
        status: 'rejected',
        total: 1000,
        createdAt: now,
        updatedAt: now,
      },
    ])

    await db.insert(productionTasksTable).values([
      {
        id: 'task-1',
        orgId: org1Id,
        orderId: 'order-2',
        board: 'pre_production',
        status: 'queued',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-2',
        orgId: org1Id,
        orderId: 'order-2',
        board: 'pre_production',
        status: 'in_progress',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-3',
        orgId: org1Id,
        orderId: 'order-2',
        board: 'pre_production',
        status: 'completed',
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await listActionNotifications({ orgId: org1Id })
    expect(result.totalCount).toBe(0)
    expect(result.items).toEqual([])
  })

  it('sorts by createdAt descending and applies limit only to items', async () => {
    const now = new Date()
    const t1 = new Date(now.getTime() - 1000 * 60)
    const t2 = new Date(now.getTime() - 2000 * 60)
    const t3 = new Date(now.getTime() - 3000 * 60)

    await db.insert(customersTable).values([
      {
        id: 'cust-1',
        orgId: org1Id,
        name: 'Acme Corp',
        createdAt: now,
        updatedAt: now,
      },
    ])

    await db.insert(invoicesTable).values([
      {
        id: 'inv-1',
        orgId: org1Id,
        invoiceNumber: 'INV-001',
        customerId: 'cust-1',
        customerName: 'Acme Corp',
        subtotal: 1000,
        total: 1000,
        dueDate: '2026-08-01',
        createdAt: now,
        updatedAt: now,
      },
    ])

    await db.insert(paymentsTable).values([
      {
        id: 'pm-1',
        orgId: org1Id,
        invoiceId: 'inv-1',
        amount: 1000,
        method: 'bank_transfer',
        status: 'pending',
        createdAt: t2, // 2nd newest
        updatedAt: t2,
      },
    ])

    await db.insert(ordersTable).values([
      {
        id: 'order-1',
        orgId: org1Id,
        customerId: 'cust-1',
        status: 'pending',
        total: 1000,
        orderNumber: 'ORD-001',
        createdAt: t1, // 1st newest
        updatedAt: t1,
      },
    ])

    await db.insert(productionTasksTable).values([
      {
        id: 'task-1',
        orgId: org1Id,
        orderId: 'order-1',
        board: 'pre_production',
        status: 'pending_approval',
        createdAt: t3, // 3rd newest
        updatedAt: t3,
      },
    ])

    const result = await listActionNotifications({ orgId: org1Id, limit: 2 })
    expect(result.totalCount).toBe(3)
    expect(result.counts).toEqual({
      payment_confirmation: 1,
      order_review: 1,
      dp_invoice_request: 0,
      final_invoice_request: 0,
      task_review: 1,
    })
    expect(result.items.length).toBe(2)
    expect(result.items[0].id).toBe('order:order-1')
    expect(result.items[1].id).toBe('payment:pm-1')
  })

  it('returns invoice request notifications only when order task gates are complete', async () => {
    const now = new Date()
    const dpReadyAt = new Date(now.getTime() - 1000 * 60)
    const finalReadyAt = new Date(now.getTime() - 500)

    await db.insert(customersTable).values([
      {
        id: 'cust-invoice-1',
        orgId: org1Id,
        name: 'Acme Corp',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cust-invoice-2',
        orgId: org2Id,
        name: 'Other Org',
        createdAt: now,
        updatedAt: now,
      },
    ])

    await db.insert(productionStagesTable).values({
      id: 'prod-stage-print',
      orgId: org1Id,
      name: 'Print',
      board: 'production',
      orderIndex: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    })

    await db.insert(ordersTable).values([
      {
        id: 'order-dp-ready',
        orgId: org1Id,
        customerId: 'cust-invoice-1',
        status: 'approved',
        total: 1000,
        orderNumber: 'ORD-DP',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'order-dp-not-ready',
        orgId: org1Id,
        customerId: 'cust-invoice-1',
        status: 'approved',
        total: 1000,
        orderNumber: 'ORD-DP-NOT-READY',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'order-dp-invoiced',
        orgId: org1Id,
        customerId: 'cust-invoice-1',
        status: 'approved',
        total: 1000,
        orderNumber: 'ORD-DP-INVOICED',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'order-final-ready',
        orgId: org1Id,
        customerId: 'cust-invoice-1',
        status: 'in_progress',
        total: 1000,
        orderNumber: 'ORD-FINAL',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'order-final-incomplete',
        orgId: org1Id,
        customerId: 'cust-invoice-1',
        status: 'in_progress',
        total: 1000,
        orderNumber: 'ORD-FINAL-INCOMPLETE',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'order-final-invoiced',
        orgId: org1Id,
        customerId: 'cust-invoice-1',
        status: 'in_progress',
        total: 1000,
        orderNumber: 'ORD-FINAL-INVOICED',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'order-other-org-ready',
        orgId: org2Id,
        customerId: 'cust-invoice-2',
        status: 'approved',
        total: 1000,
        orderNumber: 'ORD-OTHER',
        createdAt: now,
        updatedAt: now,
      },
    ])

    await db.insert(invoicesTable).values([
      {
        id: 'inv-dp-existing',
        orgId: org1Id,
        invoiceNumber: 'INV-DP-EXISTING',
        orderId: 'order-dp-invoiced',
        customerId: 'cust-invoice-1',
        customerName: 'Acme Corp',
        status: 'unpaid',
        percentage: 50,
        subtotal: 1000,
        total: 500,
        dueDate: '2026-08-01',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-final-dp',
        orgId: org1Id,
        invoiceNumber: 'INV-FINAL-DP',
        orderId: 'order-final-ready',
        customerId: 'cust-invoice-1',
        customerName: 'Acme Corp',
        status: 'paid',
        percentage: 50,
        subtotal: 1000,
        total: 500,
        dueDate: '2026-08-01',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-final-existing-dp',
        orgId: org1Id,
        invoiceNumber: 'INV-FINAL-EXISTING-DP',
        orderId: 'order-final-invoiced',
        customerId: 'cust-invoice-1',
        customerName: 'Acme Corp',
        status: 'paid',
        percentage: 50,
        subtotal: 1000,
        total: 500,
        dueDate: '2026-08-01',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-final-existing-final',
        orgId: org1Id,
        invoiceNumber: 'INV-FINAL-EXISTING-FINAL',
        orderId: 'order-final-invoiced',
        customerId: 'cust-invoice-1',
        customerName: 'Acme Corp',
        status: 'unpaid',
        percentage: 50,
        subtotal: 1000,
        total: 500,
        dueDate: '2026-08-01',
        createdAt: now,
        updatedAt: now,
      },
    ])

    await db.insert(productionTasksTable).values([
      {
        id: 'task-dp-ready-1',
        orgId: org1Id,
        orderId: 'order-dp-ready',
        board: 'pre_production',
        status: 'ready_for_production',
        createdAt: dpReadyAt,
        updatedAt: dpReadyAt,
      },
      {
        id: 'task-dp-ready-2',
        orgId: org1Id,
        orderId: 'order-dp-ready',
        board: 'pre_production',
        status: 'ready_for_production',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-dp-not-ready-1',
        orgId: org1Id,
        orderId: 'order-dp-not-ready',
        board: 'pre_production',
        status: 'ready_for_production',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-dp-not-ready-2',
        orgId: org1Id,
        orderId: 'order-dp-not-ready',
        board: 'pre_production',
        status: 'queued',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-dp-invoiced',
        orgId: org1Id,
        orderId: 'order-dp-invoiced',
        board: 'pre_production',
        status: 'ready_for_production',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-final-ready-1',
        orgId: org1Id,
        orderId: 'order-final-ready',
        board: 'production',
        status: 'completed',
        createdAt: dpReadyAt,
        updatedAt: dpReadyAt,
      },
      {
        id: 'task-final-ready-2',
        orgId: org1Id,
        orderId: 'order-final-ready',
        board: 'production',
        status: 'completed',
        createdAt: finalReadyAt,
        updatedAt: finalReadyAt,
      },
      {
        id: 'task-final-incomplete-1',
        orgId: org1Id,
        orderId: 'order-final-incomplete',
        board: 'production',
        status: 'completed',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-final-incomplete-2',
        orgId: org1Id,
        orderId: 'order-final-incomplete',
        board: 'production',
        status: 'in_progress',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-final-invoiced',
        orgId: org1Id,
        orderId: 'order-final-invoiced',
        board: 'production',
        status: 'completed',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-other-org-ready',
        orgId: org2Id,
        orderId: 'order-other-org-ready',
        board: 'pre_production',
        status: 'ready_for_production',
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await listActionNotifications({ orgId: org1Id })
    expect(result.totalCount).toBe(2)
    expect(result.counts).toEqual({
      payment_confirmation: 0,
      order_review: 0,
      dp_invoice_request: 1,
      final_invoice_request: 1,
      task_review: 0,
    })

    const dpItem = result.items.find(
      (item) => item.type === 'dp_invoice_request',
    )
    if (!dpItem || dpItem.type !== 'dp_invoice_request') {
      expect.fail('Expected dp_invoice_request')
    }
    expect(dpItem.id).toBe('dp_invoice:order-dp-ready')
    expect(dpItem.createdAt).toEqual(now)
    expect(dpItem.context).toMatchObject({
      orderId: 'order-dp-ready',
      orderNumber: 'ORD-DP',
      customerName: 'Acme Corp',
      firstProductionStageName: 'Print',
    })

    const finalItem = result.items.find(
      (item) => item.type === 'final_invoice_request',
    )
    if (!finalItem || finalItem.type !== 'final_invoice_request') {
      expect.fail('Expected final_invoice_request')
    }
    expect(finalItem.id).toBe('final_invoice:order-final-ready')
    expect(finalItem.createdAt).toEqual(finalReadyAt)
    expect(finalItem.context).toMatchObject({
      orderId: 'order-final-ready',
      orderNumber: 'ORD-FINAL',
      customerName: 'Acme Corp',
    })

    const itemIds = result.items.map((item) => item.id)
    expect(itemIds).not.toContain('dp_invoice:order-dp-invoiced')
    expect(itemIds).not.toContain('dp_invoice:order-dp-not-ready')
    expect(itemIds).not.toContain('final_invoice:order-final-incomplete')
    expect(itemIds).not.toContain('final_invoice:order-final-invoiced')

    const otherOrgResult = await listActionNotifications({ orgId: org2Id })
    expect(otherOrgResult.totalCount).toBe(1)
    expect(otherOrgResult.items[0]?.id).toBe('dp_invoice:order-other-org-ready')
  })
})
