import { eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  addresses as addressesTable,
  pricingBreakpoints as breakpointsTable,
  customers as customersTable,
  orderLineItems as lineItemsTable,
  orders as ordersTable,
  organization,
  organizationProfiles as orgProfilesTable,
  paymentMethods as paymentMethodsTable,
  products as productsTable,
  productionStages as stagesTable,
} from '#/db/schema'
import {
  createDraftOrder,
  getOrder,
  getOrderCreationReadiness,
  listOrders,
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
