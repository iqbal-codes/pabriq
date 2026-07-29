import { and, eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  activityEvents as activityEventsTable,
  addresses as addressesTable,
  pricingBreakpoints as breakpointsTable,
  customers as customersTable,
  invoices as invoicesTable,
  orderLineItems as lineItemsTable,
  orders as ordersTable,
  organization,
  organizationProfiles as orgProfilesTable,
  paymentMethods as paymentMethodsTable,
  products as productsTable,
  productionStages as stagesTable,
  productionTasks as tasksTable,
  specifications,
  specificationSnapshots,
  specificationPrices,
  pricingBasis,
} from '#/db/schema'
import {
  adjustOrderQuantity,
  approveOrder,
  cancelOrder,
  createDraftOrder,
  createDraftOrderFromAction,
  getOrder,
  getOrderCreationReadiness,
  listOrders,
  markShipped,
  updateDraftOrder,
} from './model'

const org1Id = '00000000-0000-0000-0000-000000000001'
const org2Id = '00000000-0000-0000-0000-000000000002'

beforeEach(async () => {
  await db.execute(sql`TRUNCATE organization, biteship_areas CASCADE`)
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

describe('createDraftOrder', () => {
  it('creates a draft order with line items calculated from pricing breakpoints', async () => {
    const now = new Date()

    await db.insert(customersTable).values([
      {
        id: 'cust-1',
        orgId: org1Id,
        name: 'Acme Corp',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(productsTable).values([
      {
        id: 'prod-1',
        orgId: org1Id,
        name: 'Custom T-Shirt',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(breakpointsTable).values([
      {
        id: 'bp-1',
        orgId: org1Id,
        productId: 'prod-1',
        minQuantity: 1,
        unitPrice: 15,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'bp-2',
        orgId: org1Id,
        productId: 'prod-1',
        minQuantity: 50,
        unitPrice: 10,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await createDraftOrder(org1Id, {
      customerId: 'cust-1',
      notes: 'Rush order',
      lineItems: [
        { productId: 'prod-1', quantity: 10 },
        { productId: 'prod-1', quantity: 60 },
      ],
    })

    expect(result.order.status).toBe('draft')
    expect(result.order.customerId).toBe('cust-1')
    expect(result.order.notes).toBe('Rush order')
    expect(result.order.orderNumber).toMatch(/^ORD-\d{4}-\d{3}$/)

    expect(result.lineItems).toHaveLength(2)
    expect(result.lineItems[0].unitPrice).toBeCloseTo(14.08, 2)
    expect(result.lineItems[0].total).toBeCloseTo(140.8, 2)
    expect(result.lineItems[1].unitPrice).toBe(10)
    expect(result.lineItems[1].total).toBe(600)
    expect(result.order.total).toBeCloseTo(740.8, 2)
  })

  it('creates a draft order without a customer', async () => {
    const now = new Date()

    await db.insert(productsTable).values([
      {
        id: 'prod-guest-1',
        orgId: org1Id,
        name: 'Poster',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(breakpointsTable).values([
      {
        id: 'bp-guest-1',
        orgId: org1Id,
        productId: 'prod-guest-1',
        minQuantity: 1,
        unitPrice: 20,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await createDraftOrder(org1Id, {
      customerId: null,
      lineItems: [{ productId: 'prod-guest-1', quantity: 2 }],
    })

    expect(result.order.customerId).toBeNull()
    expect(result.order.total).toBe(40)

    const list = await listOrders({ orgId: org1Id })
    expect(list.rows).toHaveLength(1)
    expect(list.rows[0]?.customerName).toBeNull()
  })

  it('creates a draft order with manual price override', async () => {
    const now = new Date()

    await db.insert(customersTable).values([
      {
        id: 'cust-2',
        orgId: org1Id,
        name: 'Beta Inc',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(productsTable).values([
      {
        id: 'prod-2',
        orgId: org1Id,
        name: 'Widget',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(breakpointsTable).values([
      {
        id: 'bp-3',
        orgId: org1Id,
        productId: 'prod-2',
        minQuantity: 1,
        unitPrice: 10,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await createDraftOrder(org1Id, {
      customerId: 'cust-2',
      lineItems: [{ productId: 'prod-2', quantity: 5, unitPrice: 12 }],
    })

    expect(result.lineItems).toHaveLength(1)
    expect(result.lineItems[0].unitPrice).toBe(12)
    expect(result.lineItems[0].total).toBe(60)
    expect(result.order.total).toBe(60)
  })

  it('returns null when order not found', async () => {
    const result = await getOrder('nonexistent', org1Id)
    expect(result).toBeNull()
  })

  it('fetches an order with its line items', async () => {
    const now = new Date()

    await db.insert(customersTable).values([
      {
        id: 'cust-4',
        orgId: org1Id,
        name: 'Delta Co',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(productsTable).values([
      {
        id: 'prod-4',
        orgId: org1Id,
        name: 'Mug',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(breakpointsTable).values([
      {
        id: 'bp-5',
        orgId: org1Id,
        productId: 'prod-4',
        minQuantity: 1,
        unitPrice: 8,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const created = await createDraftOrder(org1Id, {
      customerId: 'cust-4',
      lineItems: [{ productId: 'prod-4', quantity: 3 }],
    })

    const fetched = await getOrder(created.order.id, org1Id)

    expect(fetched?.order.id).toBe(created.order.id)
    expect(fetched?.order.status).toBe('draft')
    expect(fetched?.order.total).toBeCloseTo(24, 2)
    expect(fetched?.lineItems).toHaveLength(1)
    expect(fetched?.lineItems[0].productId).toBe('prod-4')
    expect(fetched?.lineItems[0].quantity).toBe(3)
  })

  it('updates a draft order with full snapshot', async () => {
    const now = new Date()

    await db.insert(customersTable).values([
      {
        id: 'cust-5',
        orgId: org1Id,
        name: 'Echo Ltd',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(productsTable).values([
      {
        id: 'prod-5',
        orgId: org1Id,
        name: 'Sticker',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-5b',
        orgId: org1Id,
        name: 'Badge',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(breakpointsTable).values([
      {
        id: 'bp-6',
        orgId: org1Id,
        productId: 'prod-5',
        minQuantity: 1,
        unitPrice: 2,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'bp-7',
        orgId: org1Id,
        productId: 'prod-5b',
        minQuantity: 1,
        unitPrice: 5,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const created = await createDraftOrder(org1Id, {
      customerId: 'cust-5',
      lineItems: [{ productId: 'prod-5', quantity: 10 }],
    })

    expect(created.lineItems).toHaveLength(1)

    const updated = await updateDraftOrder(created.order.id, org1Id, {
      customerId: 'cust-5',
      notes: 'Updated order',
      lineItems: [
        { productId: 'prod-5', quantity: 200 },
        { productId: 'prod-5b', quantity: 5 },
      ],
    })

    expect(updated.order.notes).toBe('Updated order')
    expect(updated.lineItems).toHaveLength(2)
    expect(updated.lineItems[0].unitPrice).toBe(2)
    expect(updated.lineItems[0].total).toBe(400)
    expect(updated.lineItems[1].unitPrice).toBe(5)
    expect(updated.lineItems[1].total).toBe(25)
    expect(updated.order.total).toBe(425)

    const fetched = await getOrder(created.order.id, org1Id)
    expect(fetched?.lineItems).toHaveLength(2)
    expect(fetched?.order.total).toBe(425)
  })

  it('can clear the customer from a draft order', async () => {
    const now = new Date()

    await db.insert(customersTable).values([
      {
        id: 'cust-guest-clear',
        orgId: org1Id,
        name: 'Clear Me',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(productsTable).values([
      {
        id: 'prod-clear',
        orgId: org1Id,
        name: 'Card',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(breakpointsTable).values([
      {
        id: 'bp-clear',
        orgId: org1Id,
        productId: 'prod-clear',
        minQuantity: 1,
        unitPrice: 4,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const created = await createDraftOrder(org1Id, {
      customerId: 'cust-guest-clear',
      lineItems: [{ productId: 'prod-clear', quantity: 1 }],
    })

    const updated = await updateDraftOrder(created.order.id, org1Id, {
      customerId: null,
      lineItems: [{ productId: 'prod-clear', quantity: 2 }],
    })

    expect(updated.order.customerId).toBeNull()
    expect(updated.order.total).toBe(8)
  })

  it('lists orders scoped to org with customer name', async () => {
    const now = new Date()

    await db.insert(customersTable).values([
      {
        id: 'cust-7a',
        orgId: org1Id,
        name: 'Alpha Corp',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cust-7b',
        orgId: org1Id,
        name: 'Beta Corp',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cust-7c',
        orgId: org2Id,
        name: 'Other Org Customer',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(productsTable).values([
      {
        id: 'prod-7',
        orgId: org1Id,
        name: 'Generic',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-7o',
        orgId: org2Id,
        name: 'Other Generic',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(breakpointsTable).values([
      {
        id: 'bp-10',
        orgId: org1Id,
        productId: 'prod-7',
        minQuantity: 1,
        unitPrice: 5,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'bp-11',
        orgId: org2Id,
        productId: 'prod-7o',
        minQuantity: 1,
        unitPrice: 5,
        createdAt: now,
        updatedAt: now,
      },
    ])

    await createDraftOrder(org1Id, {
      customerId: 'cust-7a',
      lineItems: [{ productId: 'prod-7', quantity: 1 }],
    })
    await createDraftOrder(org1Id, {
      customerId: 'cust-7b',
      lineItems: [{ productId: 'prod-7', quantity: 1 }],
    })
    await createDraftOrder(org2Id, {
      customerId: 'cust-7c',
      lineItems: [{ productId: 'prod-7o', quantity: 1 }],
    })

    const result = await listOrders({ orgId: org1Id })

    expect(result.rows).toHaveLength(2)
    expect(result.totalRows).toBe(2)
    expect(result.rows[0].customerName).toBe('Beta Corp')
    expect(result.rows[1].customerName).toBe('Alpha Corp')
    expect(result.rows.every((r) => r.status === 'draft')).toBe(true)
    expect(result.rows.every((r) => r.id)).toBe(true)
  })

  it('does not leak orders across orgs', async () => {
    const org2Result = await listOrders({ orgId: org2Id })

    expect(org2Result.rows).toHaveLength(0)
    expect(org2Result.totalRows).toBe(0)
  })

  it('rejects invalid quantity', async () => {
    const now = new Date()

    await db.insert(customersTable).values([
      {
        id: 'cust-3',
        orgId: org1Id,
        name: 'Gamma LLC',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(productsTable).values([
      {
        id: 'prod-3',
        orgId: org1Id,
        name: 'Gadget',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(breakpointsTable).values([
      {
        id: 'bp-4',
        orgId: org1Id,
        productId: 'prod-3',
        minQuantity: 1,
        unitPrice: 5,
        createdAt: now,
        updatedAt: now,
      },
    ])

    await expect(
      createDraftOrder(org1Id, {
        customerId: 'cust-3',
        lineItems: [{ productId: 'prod-3', quantity: 0 }],
      }),
    ).rejects.toThrow('Quantity must be greater than zero')
  })
})

describe('markShipped', () => {
  it('archives completed production tasks for the shipped order only', async () => {
    const now = new Date()

    // Seed two in_progress orders
    const targetOrderId = 'order-target'
    const otherOrderId = 'order-other'

    await db.insert(ordersTable).values([
      {
        id: targetOrderId,
        orgId: org1Id,
        status: 'in_progress',
        notes: null,
        total: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: otherOrderId,
        orgId: org2Id,
        status: 'in_progress',
        notes: null,
        total: 0,
        createdAt: now,
        updatedAt: now,
      },
    ])

    // Seed three production tasks
    const taskTargetCompleted = 'task-target-completed'
    const taskTargetInProgress = 'task-target-in-progress'
    const taskOtherCompleted = 'task-other-completed'

    await db.insert(tasksTable).values([
      {
        id: taskTargetCompleted,
        orgId: org1Id,
        orderId: targetOrderId,
        board: 'production',
        status: 'completed',
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: taskTargetInProgress,
        orgId: org1Id,
        orderId: targetOrderId,
        board: 'production',
        status: 'in_progress',
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: taskOtherCompleted,
        orgId: org2Id,
        orderId: otherOrderId,
        board: 'production',
        status: 'completed',
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ])

    await markShipped(targetOrderId, org1Id, {
      courier: 'JNE',
      trackingNumber: 'TRACK-1',
    })

    // Verify target order moved to in_delivery
    const [targetOrder] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, targetOrderId))
      .limit(1)

    expect(targetOrder.status).toBe('in_delivery')
    expect(targetOrder.courier).toBe('JNE')
    expect(targetOrder.trackingNumber).toBe('TRACK-1')
    expect(targetOrder.shippedAt).not.toBeNull()

    // Verify unrelated order stays in_progress
    const [otherOrder] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, otherOrderId))
      .limit(1)

    expect(otherOrder.status).toBe('in_progress')
    expect(otherOrder.courier).toBeNull()
    expect(otherOrder.trackingNumber).toBeNull()

    // Verify only the target completed task was archived
    const [archivedTask] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskTargetCompleted))
      .limit(1)
    expect(archivedTask.archivedAt).not.toBeNull()

    // Verify in-progress task was NOT archived
    const [inProgressTask] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskTargetInProgress))
      .limit(1)
    expect(inProgressTask.archivedAt).toBeNull()

    // Verify unrelated completed task was NOT archived
    const [otherTask] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskOtherCompleted))
      .limit(1)
    expect(otherTask.archivedAt).toBeNull()
  })
})

describe('listOrders sorting', () => {
  it('sorts orders by shippedAt with null dates last', async () => {
    const now = new Date()

    await db.insert(customersTable).values([
      {
        id: 'sort-cust-1',
        orgId: org1Id,
        name: 'Test Customer',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(productsTable).values([
      {
        id: 'sort-prod-1',
        orgId: org1Id,
        name: 'Test Product',
        active: true,
        basePrice: 10000,
        productionDays: 1,
        minQuantity: 1,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(breakpointsTable).values([
      {
        id: 'sort-bp-1',
        orgId: org1Id,
        productId: 'sort-prod-1',
        minQuantity: 1,
        unitPrice: 5000,
        createdAt: now,
        updatedAt: now,
      },
    ])

    // createDraftOrder generates its own id — capture returned ids
    const shipLateResult = await createDraftOrder(org1Id, {
      customerId: 'sort-cust-1',
      lineItems: [{ productId: 'sort-prod-1', quantity: 1 }],
    })
    const shipEarlyResult = await createDraftOrder(org1Id, {
      customerId: 'sort-cust-1',
      lineItems: [{ productId: 'sort-prod-1', quantity: 1 }],
    })
    const shipNoneResult = await createDraftOrder(org1Id, {
      customerId: 'sort-cust-1',
      lineItems: [{ productId: 'sort-prod-1', quantity: 1 }],
    })

    const shipLateId = shipLateResult.order.id
    const shipEarlyId = shipEarlyResult.order.id
    const shipNoneId = shipNoneResult.order.id

    // Set shippedAt after creation (createDraftOrder creates order with no shippedAt)
    await db
      .update(ordersTable)
      .set({ shippedAt: new Date('2026-03-01') })
      .where(eq(ordersTable.id, shipLateId))
    await db
      .update(ordersTable)
      .set({ shippedAt: new Date('2026-01-15') })
      .where(eq(ordersTable.id, shipEarlyId))

    // shippedAt ASC: nulls last
    const ascResult = await listOrders({
      orgId: org1Id,
      sort: { field: 'shippedAt', direction: 'asc' },
      perPage: 10,
    })
    expect(ascResult.rows.map((r) => r.id)).toEqual([
      shipEarlyId,
      shipLateId,
      shipNoneId,
    ])

    // shippedAt DESC: nulls last
    const descResult = await listOrders({
      orgId: org1Id,
      sort: { field: 'shippedAt', direction: 'desc' },
      perPage: 10,
    })
    expect(descResult.rows.map((r) => r.id)).toEqual([
      shipLateId,
      shipEarlyId,
      shipNoneId,
    ])
  })

  it('sorts orders by maxDeadline before pagination', async () => {
    const now = new Date()

    await db.insert(customersTable).values([
      {
        id: 'sort-cust-2',
        orgId: org1Id,
        name: 'DL Customer',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(productsTable).values([
      {
        id: 'sort-prod-2',
        orgId: org1Id,
        name: 'DL Product',
        active: true,
        basePrice: 10000,
        productionDays: 1,
        minQuantity: 1,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(breakpointsTable).values([
      {
        id: 'sort-bp-2',
        orgId: org1Id,
        productId: 'sort-prod-2',
        minQuantity: 1,
        unitPrice: 5000,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const lateResult = await createDraftOrder(org1Id, {
      customerId: 'sort-cust-2',
      lineItems: [{ productId: 'sort-prod-2', quantity: 1 }],
    })
    const earlyResult = await createDraftOrder(org1Id, {
      customerId: 'sort-cust-2',
      lineItems: [{ productId: 'sort-prod-2', quantity: 1 }],
    })
    const noneResult = await createDraftOrder(org1Id, {
      customerId: 'sort-cust-2',
      lineItems: [{ productId: 'sort-prod-2', quantity: 1 }],
    })

    const lateId = lateResult.order.id
    const earlyId = earlyResult.order.id
    const noneId = noneResult.order.id

    // Insert deadline values into line items
    // Each order has one line item from createDraftOrder — update its deadline
    const lineItemsForLate = await db
      .select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.orderId, lateId))
      .limit(1)
    if (lineItemsForLate[0]) {
      await db
        .update(lineItemsTable)
        .set({ deadline: new Date('2026-04-01') })
        .where(eq(lineItemsTable.id, lineItemsForLate[0].id))
    }

    const lineItemsForEarly = await db
      .select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.orderId, earlyId))
      .limit(1)
    if (lineItemsForEarly[0]) {
      await db
        .update(lineItemsTable)
        .set({ deadline: new Date('2026-01-15') })
        .where(eq(lineItemsTable.id, lineItemsForEarly[0].id))
    }

    // Delete line items for noneId so that its maxDeadline is null
    await db.delete(lineItemsTable).where(eq(lineItemsTable.orderId, noneId))

    // maxDeadline ASC with perPage smaller than total
    const ascResult = await listOrders({
      orgId: org1Id,
      sort: { field: 'maxDeadline', direction: 'asc' },
      perPage: 2,
    })
    expect(ascResult.rows.map((r) => r.id)).toEqual([earlyId, lateId])
    expect(ascResult.totalRows).toBe(3)

    // maxDeadline DESC: nulls last
    const descResult = await listOrders({
      orgId: org1Id,
      sort: { field: 'maxDeadline', direction: 'desc' },
      perPage: 10,
    })
    expect(descResult.rows.map((r) => r.id)).toEqual([lateId, earlyId, noneId])
  })
})

describe('getOrderCreationReadiness', () => {
  const addressId = 'a0000000-0000-0000-0000-000000000001'
  const profileId = 'p0000000-0000-0000-0000-000000000001'

  async function seedAddress(areaId: string, streetAddress: string) {
    await db.insert(addressesTable).values({
      id: addressId,
      orgId: org1Id,
      areaId,
      areaName: 'Test Area',
      streetAddress,
    })
  }

  async function seedProfileWithAddress(addressRef?: string | null) {
    await db.insert(orgProfilesTable).values({
      id: profileId,
      orgId: org1Id,
      ...(addressRef === null
        ? { addressId: null }
        : { addressId: addressRef ?? addressId }),
    })
  }

  async function seedStage(opts?: { board?: string; active?: boolean }) {
    await db.insert(stagesTable).values({
      id: `s-${crypto.randomUUID()}`,
      orgId: org1Id,
      name: 'Print',
      board: opts?.board ?? 'production',
      active: opts?.active ?? true,
    })
  }

  async function seedProduct(active = true) {
    await db.insert(productsTable).values({
      id: `prod-${crypto.randomUUID()}`,
      orgId: org1Id,
      name: 'T-Shirt',
      active,
    })
  }

  async function seedPaymentMethod(active = true) {
    await db.insert(paymentMethodsTable).values({
      id: `pm-${crypto.randomUUID()}`,
      orgId: org1Id,
      name: 'Bank Transfer',
      active,
    })
  }

  it('returns all-incomplete readiness for an empty org', async () => {
    const result = await getOrderCreationReadiness(org1Id)

    expect(result.isReady).toBe(false)
    expect(result.businessAddressComplete).toBe(false)
    expect(result.productionStageCount).toBe(0)
    expect(result.activeProductCount).toBe(0)
    expect(result.paymentMethodCount).toBe(0)
    expect(result.completedCount).toBe(0)
    expect(result.totalCount).toBe(4)
  })

  describe('business address prerequisite', () => {
    it('marks complete when address has non-empty areaId and streetAddress', async () => {
      await seedAddress('area-123', '123 Main St')
      await seedProfileWithAddress()

      const result = await getOrderCreationReadiness(org1Id)
      expect(result.businessAddressComplete).toBe(true)
      expect(result.completedCount).toBe(1)
    })

    it('marks incomplete when address has empty areaId', async () => {
      await seedAddress('', '123 Main St')
      await seedProfileWithAddress()

      const result = await getOrderCreationReadiness(org1Id)
      expect(result.businessAddressComplete).toBe(false)
    })

    it('marks incomplete when address has empty streetAddress', async () => {
      await seedAddress('area-123', '')
      await seedProfileWithAddress()

      const result = await getOrderCreationReadiness(org1Id)
      expect(result.businessAddressComplete).toBe(false)
    })

    it('marks incomplete when profile exists but has no linked address', async () => {
      await seedProfileWithAddress(null)

      const result = await getOrderCreationReadiness(org1Id)
      expect(result.businessAddressComplete).toBe(false)
    })
  })

  describe('production stage prerequisite', () => {
    it('counts an active production-board stage', async () => {
      await seedStage({ board: 'production', active: true })

      const result = await getOrderCreationReadiness(org1Id)
      expect(result.productionStageCount).toBe(1)
      expect(result.completedCount).toBe(1)
    })

    it('ignores pre-production-only stages', async () => {
      await seedStage({ board: 'pre_production', active: true })

      const result = await getOrderCreationReadiness(org1Id)
      expect(result.productionStageCount).toBe(0)
    })

    it('ignores inactive stages', async () => {
      await seedStage({ board: 'production', active: false })

      const result = await getOrderCreationReadiness(org1Id)
      expect(result.productionStageCount).toBe(0)
    })
  })

  describe('product prerequisite', () => {
    it('counts active products', async () => {
      await seedProduct(true)

      const result = await getOrderCreationReadiness(org1Id)
      expect(result.activeProductCount).toBe(1)
      expect(result.completedCount).toBe(1)
    })

    it('ignores inactive products', async () => {
      await seedProduct(false)

      const result = await getOrderCreationReadiness(org1Id)
      expect(result.activeProductCount).toBe(0)
    })
  })

  describe('payment method prerequisite', () => {
    it('counts active payment methods', async () => {
      await seedPaymentMethod(true)

      const result = await getOrderCreationReadiness(org1Id)
      expect(result.paymentMethodCount).toBe(1)
      expect(result.completedCount).toBe(1)
    })

    it('ignores inactive payment methods', async () => {
      await seedPaymentMethod(false)

      const result = await getOrderCreationReadiness(org1Id)
      expect(result.paymentMethodCount).toBe(0)
    })
  })

  it('returns partial readiness when some but not all prerequisites are met', async () => {
    await seedAddress('area-123', '123 Main St')
    await seedProfileWithAddress()
    await seedStage({ board: 'production', active: true })

    const result = await getOrderCreationReadiness(org1Id)
    expect(result.isReady).toBe(false)
    expect(result.businessAddressComplete).toBe(true)
    expect(result.productionStageCount).toBe(1)
    expect(result.activeProductCount).toBe(0)
    expect(result.paymentMethodCount).toBe(0)
    expect(result.completedCount).toBe(2)
    expect(result.totalCount).toBe(4)
  })

  it('returns fully ready when all four prerequisites are met', async () => {
    await seedAddress('area-123', '123 Main St')
    await seedProfileWithAddress()
    await seedStage({ board: 'production', active: true })
    await seedProduct(true)
    await seedPaymentMethod(true)

    const result = await getOrderCreationReadiness(org1Id)
    expect(result.isReady).toBe(true)
    expect(result.businessAddressComplete).toBe(true)
    expect(result.productionStageCount).toBe(1)
    expect(result.activeProductCount).toBe(1)
    expect(result.paymentMethodCount).toBe(1)
    expect(result.completedCount).toBe(4)
    expect(result.totalCount).toBe(4)
  })
})

describe('listOrders payment status aggregation', () => {
  it('aggregates paymentStatus correctly for single/multiple invoices', async () => {
    const now = new Date()

    // 1. Seed customer
    await db.insert(customersTable).values([
      {
        id: 'pay-cust-1',
        orgId: org1Id,
        name: 'Pay Customer',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    // 2. Seed product
    await db.insert(productsTable).values([
      {
        id: 'pay-prod-1',
        orgId: org1Id,
        name: 'Pay Product',
        active: true,
        basePrice: 10000,
        productionDays: 1,
        minQuantity: 1,
        createdAt: now,
        updatedAt: now,
      },
    ])

    // Helper to create an order
    const createOrderWithInvoices = async (
      orderId: string,
      orderNumber: string,
      invoices: Array<{
        status: 'unpaid' | 'partially_paid' | 'paid' | 'void'
        total: number
        percentage: number | null
      }>,
      orderStatus = 'draft',
    ) => {
      // Create order
      await db.insert(ordersTable).values({
        id: orderId,
        orgId: org1Id,
        orderNumber,
        customerId: 'pay-cust-1',
        status: orderStatus,
        total: 10000,
        createdAt: now,
        updatedAt: now,
      })

      // Insert invoices
      if (invoices.length > 0) {
        await db.insert(invoicesTable).values(
          invoices.map((inv, index) => ({
            id: `inv-${orderId}-${index}`,
            orgId: org1Id,
            orderId,
            customerId: 'pay-cust-1',
            customerName: 'Pay Customer',
            invoiceNumber: `INV-${orderNumber}-${index}`,
            status: inv.status,
            subtotal: inv.total,
            total: inv.total,
            percentage: inv.percentage,
            dueDate: '2026-08-01',
            issuedDate: '2026-07-01',
            createdAt: now,
            updatedAt: now,
          })),
        )
      }
    }

    // A. Order with no invoices
    await createOrderWithInvoices('order-no-inv', 'ORD-NO-INV', [])

    // B. Order with single unpaid invoice
    await createOrderWithInvoices('order-unpaid', 'ORD-UNPAID', [
      { status: 'unpaid', total: 10000, percentage: 100 },
    ])

    // C. Order with single partially paid invoice
    await createOrderWithInvoices('order-part-paid', 'ORD-PART-PAID', [
      { status: 'partially_paid', total: 10000, percentage: 100 },
    ])

    // D. Order with single paid invoice
    await createOrderWithInvoices('order-paid', 'ORD-PAID', [
      { status: 'paid', total: 10000, percentage: 100 },
    ])

    // E. Order with single void invoice
    await createOrderWithInvoices('order-void', 'ORD-VOID', [
      { status: 'void', total: 10000, percentage: 100 },
    ])

    // F. Split payment: paid (50%) + unpaid (50%) -> partially_paid
    await createOrderWithInvoices('order-split-1', 'ORD-SPLIT-1', [
      { status: 'paid', total: 5000, percentage: 50 },
      { status: 'unpaid', total: 5000, percentage: 50 },
    ])

    // G. Split payment: paid (50%) + partially_paid (50%) -> partially_paid
    await createOrderWithInvoices('order-split-2', 'ORD-SPLIT-2', [
      { status: 'paid', total: 5000, percentage: 50 },
      { status: 'partially_paid', total: 5000, percentage: 50 },
    ])

    // H. Split payment: void (50%) + paid (100%) -> paid
    await createOrderWithInvoices('order-split-3', 'ORD-SPLIT-3', [
      { status: 'void', total: 5000, percentage: 50 },
      { status: 'paid', total: 10000, percentage: 100 },
    ])

    // I. Split payment: void (50%) + unpaid (100%) -> unpaid
    await createOrderWithInvoices('order-split-4', 'ORD-SPLIT-4', [
      { status: 'void', total: 5000, percentage: 50 },
      { status: 'unpaid', total: 10000, percentage: 100 },
    ])

    // J. Split payment: void (50%) + void (50%) -> void
    await createOrderWithInvoices('order-split-5', 'ORD-SPLIT-5', [
      { status: 'void', total: 5000, percentage: 50 },
      { status: 'void', total: 5000, percentage: 50 },
    ])

    // K. Fully covered DP before shipment stays partially paid until shipping is resolved
    await createOrderWithInvoices(
      'order-awaiting-shipment',
      'ORD-AWAITING-SHIPMENT',
      [{ status: 'paid', total: 10000, percentage: 100 }],
      'in_progress',
    )

    // L. Once shipped with no open invoice, the same paid amount is fully paid
    await createOrderWithInvoices(
      'order-shipped-paid',
      'ORD-SHIPPED-PAID',
      [{ status: 'paid', total: 10000, percentage: 100 }],
      'in_delivery',
    )

    // M. Shipped order with an unpaid shipping-fee invoice stays partially paid
    await createOrderWithInvoices(
      'order-shipped-open-fee',
      'ORD-SHIPPED-OPEN-FEE',
      [
        { status: 'paid', total: 10000, percentage: 100 },
        { status: 'unpaid', total: 500, percentage: 0 },
      ],
      'in_delivery',
    )

    // Call listOrders
    const result = await listOrders({ orgId: org1Id, perPage: 100 })
    const rowsMap = new Map(result.rows.map((r) => [r.id, r]))

    expect(rowsMap.get('order-no-inv')?.paymentStatus).toBe('no_invoice')
    expect(rowsMap.get('order-unpaid')?.paymentStatus).toBe('unpaid')
    expect(rowsMap.get('order-part-paid')?.paymentStatus).toBe('partially_paid')
    expect(rowsMap.get('order-paid')?.paymentStatus).toBe('paid')
    expect(rowsMap.get('order-void')?.paymentStatus).toBe('void')
    expect(rowsMap.get('order-split-1')?.paymentStatus).toBe('partially_paid')
    expect(rowsMap.get('order-split-2')?.paymentStatus).toBe('partially_paid')
    expect(rowsMap.get('order-split-3')?.paymentStatus).toBe('paid')
    expect(rowsMap.get('order-split-4')?.paymentStatus).toBe('unpaid')
    expect(rowsMap.get('order-split-5')?.paymentStatus).toBe('void')
    expect(rowsMap.get('order-awaiting-shipment')?.paymentStatus).toBe(
      'partially_paid',
    )
    expect(rowsMap.get('order-shipped-paid')?.paymentStatus).toBe('paid')
    expect(rowsMap.get('order-shipped-open-fee')?.paymentStatus).toBe(
      'partially_paid',
    )
  })
})
describe('createDraftOrderFromAction', () => {
  it('loads duplicate product references through one batched lookup', async () => {
    const now = new Date()
    await db.insert(productsTable).values({
      id: 'action-prod-1',
      orgId: org1Id,
      name: 'Action Product',
      active: true,
      productionDays: 2,
      createdAt: now,
      updatedAt: now,
    })

    const result = await createDraftOrderFromAction(org1Id, {
      lineItems: [
        {
          productId: 'action-prod-1',
          productName: 'Action Product',
          quantity: 2,
          unitPrice: 10,
          total: 20,
          minQuantity: 1,
        },
        {
          productId: 'action-prod-1',
          productName: 'Action Product',
          quantity: 3,
          unitPrice: 10,
          total: 30,
          minQuantity: 1,
        },
      ],
      customerId: null,
      customerName: null,
      total: 50,
    })

    expect(result.lineItems).toHaveLength(2)
    expect(result.lineItems.map((item) => item.quantity)).toEqual([2, 3])
    expect(result.order.total).toBe(50)
  })
})

describe('adjustOrderQuantity', () => {
  it('reprices line item and updates order total', async () => {
    const now = new Date()

    // Seed product with breakpoints
    await db.insert(productsTable).values([
      {
        id: 'adj-prod-1',
        orgId: org1Id,
        name: 'Adjust Product',
        active: true,
        basePrice: 20,
        minQuantity: 1,
        pricingMode: 'step',
        productionDays: 3,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(breakpointsTable).values([
      {
        id: 'adj-bp-1',
        orgId: org1Id,
        productId: 'adj-prod-1',
        minQuantity: 1,
        unitPrice: 20,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'adj-bp-2',
        orgId: org1Id,
        productId: 'adj-prod-1',
        minQuantity: 100,
        unitPrice: 15,
        createdAt: now,
        updatedAt: now,
      },
    ])

    // Seed approved order with line item
    await db.insert(ordersTable).values([
      {
        id: 'adj-order-1',
        orgId: org1Id,
        status: 'approved',
        total: 2000,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(lineItemsTable).values([
      {
        id: 'adj-li-1',
        orgId: org1Id,
        orderId: 'adj-order-1',
        productId: 'adj-prod-1',
        productName: 'Adjust Product',
        quantity: 100,
        unitPrice: 15,
        total: 1500,
        productionDays: 3,
        deadline: new Date(),
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await adjustOrderQuantity(org1Id, {
      orderId: 'adj-order-1',
      lineItemId: 'adj-li-1',
      quantity: 10,
      reason: 'Customer reduced order',
      actorId: 'actor-1',
    })

    // Line item repriced: 10 units at basePrice=20
    expect(result.lineItem.quantity).toBe(10)
    expect(result.lineItem.unitPrice).toBe(20)
    expect(result.lineItem.total).toBe(200)

    // Order total updated
    expect(result.order.total).toBe(200)

    // Activity event inserted
    const events = await db
      .select()
      .from(activityEventsTable)
      .where(
        and(
          eq(activityEventsTable.targetId, 'adj-order-1'),
          eq(activityEventsTable.action, 'quantity_adjusted'),
        ),
      )
    expect(events).toHaveLength(1)
    expect(events[0].details).toMatchObject({
      oldQuantity: 100,
      newQuantity: 10,
      reason: 'Customer reduced order',
    })
  })

  it('blocks in_delivery orders', async () => {
    const now = new Date()
    await db.insert(productsTable).values([
      {
        id: 'adj-prod-2',
        orgId: org1Id,
        name: 'Product 2',
        active: true,
        basePrice: 10,
        minQuantity: 1,
        productionDays: 1,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(ordersTable).values([
      {
        id: 'adj-order-2',
        orgId: org1Id,
        status: 'in_delivery',
        total: 100,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(lineItemsTable).values([
      {
        id: 'adj-li-2',
        orgId: org1Id,
        orderId: 'adj-order-2',
        productId: 'adj-prod-2',
        productName: 'Product 2',
        quantity: 10,
        unitPrice: 10,
        total: 100,
        productionDays: 1,
        deadline: new Date(),
        createdAt: now,
        updatedAt: now,
      },
    ])

    await expect(
      adjustOrderQuantity(org1Id, {
        orderId: 'adj-order-2',
        lineItemId: 'adj-li-2',
        quantity: 5,
        reason: 'Test',
        actorId: 'actor-1',
      }),
    ).rejects.toThrow('Only approved or production orders can be adjusted')
  })

  it('enforces repeat-order minimum', async () => {
    const now = new Date()
    await db.insert(productsTable).values([
      {
        id: 'adj-prod-3',
        orgId: org1Id,
        name: 'Repeat Product',
        active: true,
        basePrice: 10,
        minQuantity: 1,
        repeatOrderMinQuantity: 50,
        repeatOrderUnitPrice: 8,
        productionDays: 1,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(ordersTable).values([
      {
        id: 'adj-order-3',
        orgId: org1Id,
        status: 'approved',
        total: 500,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(lineItemsTable).values([
      {
        id: 'adj-li-3',
        orgId: org1Id,
        orderId: 'adj-order-3',
        productId: 'adj-prod-3',
        productName: 'Repeat Product',
        quantity: 100,
        unitPrice: 8,
        total: 800,
        productionDays: 1,
        deadline: new Date(),
        isRepeatOrder: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    await expect(
      adjustOrderQuantity(org1Id, {
        orderId: 'adj-order-3',
        lineItemId: 'adj-li-3',
        quantity: 10,
        reason: 'Below minimum',
        actorId: 'actor-1',
      }),
    ).rejects.toThrow('Quantity below repeat order minimum of 50')
  })

  it('syncs active production task quantity', async () => {
    const now = new Date()
    await db.insert(productsTable).values([
      {
        id: 'adj-prod-4',
        orgId: org1Id,
        name: 'Task Product',
        active: true,
        basePrice: 25,
        minQuantity: 1,
        productionDays: 2,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(ordersTable).values([
      {
        id: 'adj-order-4',
        orgId: org1Id,
        status: 'production',
        total: 500,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(lineItemsTable).values([
      {
        id: 'adj-li-4',
        orgId: org1Id,
        orderId: 'adj-order-4',
        productId: 'adj-prod-4',
        productName: 'Task Product',
        quantity: 20,
        unitPrice: 25,
        total: 500,
        productionDays: 2,
        deadline: new Date(),
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(tasksTable).values([
      {
        id: 'adj-task-1',
        orgId: org1Id,
        orderId: 'adj-order-4',
        lineItemId: 'adj-li-4',
        board: 'production',
        status: 'in_progress',
        context: {
          productName: 'Task Product',
          customerName: 'Test',
          requirements: null,
          quantity: 20,
        },
        createdAt: now,
        updatedAt: now,
      },
    ])

    await adjustOrderQuantity(org1Id, {
      orderId: 'adj-order-4',
      lineItemId: 'adj-li-4',
      quantity: 30,
      reason: 'Increased order',
      actorId: 'actor-1',
    })

    const task = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, 'adj-task-1'))
      .limit(1)

    expect(task[0].context).toMatchObject({
      productName: 'Task Product',
      customerName: 'Test',
      requirements: null,
      quantity: 30,
    })
  })
})
// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createOrderWithSpec(
  orgId: string,
  orderId: string,
  productId: string,
  specId: string,
  status: string = 'draft',
  specStatus: string = 'draft',
  pricingStatus: string | null = null,
) {
  const now = new Date()
  await db.insert(productsTable).values({
    id: productId,
    orgId,
    name: 'Spec Test Product',
    active: true,
    basePrice: 10000,
    productionDays: 1,
    minQuantity: 1,
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(ordersTable).values({
    id: orderId,
    orgId,
    status,
    total: 10000,
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(specifications).values({
    id: specId,
    orgId,
    productId,
    orderId,
    submittedBy: 'test-user',
    submittedByRole: 'customer',
    status: specStatus as 'draft' | 'submitted' | 'priced' | 'pricing_review' | 'committed',
    fieldValues: { color: 'Red' },
    quantity: 1,
    pricingStatus: pricingStatus ?? null,
    createdAt: now,
    updatedAt: now,
  })
  // Create pricing basis and price to allow commitment
  await db.insert(pricingBasis).values({
    id: `pb-${specId}`,
    orgId,
    productId,
    basisType: 'flat' as const,
    currency: 'IDR',
    precision: 0,
    roundingMode: 'half_up' as const,
    approved: true,
    approvedAt: now,
    approvedBy: 'test-user',
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(specificationPrices).values({
    id: `sp-${specId}`,
    orgId,
    specificationId: specId,
    currency: 'IDR',
    unitPrice: 10000,
    totalPrice: 10000,
    quantity: 1,
    breakdown: [{ label: 'Base', type: 'base', amount: 10000 }],
    isOverridden: false,
    extensionStatuses: [],
    createdAt: now,
    updatedAt: now,
  })
}

// ─── Cancel Order ────────────────────────────────────────────────────────────

describe('cancelOrder', () => {
  it('cancels a draft order', async () => {
    const orderId = 'cancel-draft-1'
    await createOrderWithSpec(org1Id, orderId, 'cancel-prod-1', 'cancel-spec-1', 'draft')

    await cancelOrder(orderId, org1Id, {
      cancelledBy: 'user-1',
      reason: 'No longer needed',
    })

    const [row] = await db
      .select({ status: ordersTable.status })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1)
    expect(row?.status).toBe('cancelled')
  })

  it('cancels a pending order', async () => {
    const orderId = 'cancel-pending-1'
    await createOrderWithSpec(org1Id, orderId, 'cancel-prod-2', 'cancel-spec-2', 'pending', 'submitted', 'calculated')

    await cancelOrder(orderId, org1Id, {
      cancelledBy: 'user-1',
      reason: 'Changed mind',
    })

    const [row] = await db
      .select({ status: ordersTable.status })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1)
    expect(row?.status).toBe('cancelled')
  })

  it('rejects cancelling an approved order', async () => {
    const orderId = 'cancel-approved-1'
    await createOrderWithSpec(org1Id, orderId, 'cancel-prod-3', 'cancel-spec-3', 'approved', 'committed')

    await expect(
      cancelOrder(orderId, org1Id, {
        cancelledBy: 'user-1',
        reason: 'Try cancel',
      }),
    ).rejects.toThrow('Cannot cancel')
  })

  it('rejects cancelling a non-existent order', async () => {
    await expect(
      cancelOrder('nonexistent', org1Id, {
        cancelledBy: 'user-1',
        reason: 'Try',
      }),
    ).rejects.toThrow('Order not found')
  })

  it('records an activity event on cancel', async () => {
    const orderId = 'cancel-activity-1'
    await createOrderWithSpec(org1Id, orderId, 'cancel-prod-4', 'cancel-spec-4', 'draft')

    await cancelOrder(orderId, org1Id, {
      cancelledBy: 'user-1',
      reason: 'Testing activity',
    })

    const events = await db
      .select()
      .from(activityEventsTable)
      .where(eq(activityEventsTable.targetId, orderId))
    expect(events.some((e) => e.action === 'order_cancelled')).toBe(true)
  })
})

// ─── Approve Order with Specs ────────────────────────────────────────────────

describe('approveOrder with specifications', () => {
  it('approves order and creates spec snapshots', async () => {
    const orderId = 'approve-1'
    const specId = 'approve-spec-1'
    await createOrderWithSpec(org1Id, orderId, 'approve-prod-1', specId, 'pending', 'priced', 'calculated')

    await approveOrder(orderId, org1Id, 'admin-1')

    // Order should be approved
    const [order] = await db
      .select({ status: ordersTable.status })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1)
    expect(order?.status).toBe('approved')

    // Spec should be committed
    const [spec] = await db
      .select({ status: specifications.status })
      .from(specifications)
      .where(eq(specifications.id, specId))
      .limit(1)
    expect(spec?.status).toBe('committed')

    // Snapshot should exist
    const snapshots = await db
      .select()
      .from(specificationSnapshots)
      .where(eq(specificationSnapshots.specificationId, specId))
    expect(snapshots.length).toBe(1)
  })

  it('is idempotent — does not create duplicate snapshots', async () => {
    const orderId = 'approve-idem-1'
    const specId = 'approve-spec-idem-1'
    await createOrderWithSpec(org1Id, orderId, 'approve-prod-idem-1', specId, 'pending', 'priced', 'calculated')

    await approveOrder(orderId, org1Id, 'admin-1')

    // Second approval should succeed (already approved + committed)
    await approveOrder(orderId, org1Id, 'admin-1')

    // Should still have exactly one snapshot
    const snapshots = await db
      .select()
      .from(specificationSnapshots)
      .where(eq(specificationSnapshots.specificationId, specId))
    expect(snapshots.length).toBe(1)
  })

  it('rejects approving a non-pending order', async () => {
    const orderId = 'approve-draft-1'
    await createOrderWithSpec(org1Id, orderId, 'approve-prod-draft-1', 'approve-spec-draft-1', 'draft')

    await expect(
      approveOrder(orderId, org1Id, 'admin-1'),
    ).rejects.toThrow('Only pending orders can be approved')
  })
})
