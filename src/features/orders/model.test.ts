import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  pricingBreakpoints as breakpointsTable,
  customers as customersTable,
  organization,
  products as productsTable,
  productVariants as variantsTable,
} from '#/db/schema'
import {
  createDraftOrder,
  getOrder,
  listOrders,
  removeLineItem,
  updateLineItem,
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
    await db.insert(variantsTable).values([
      {
        id: 'var-1',
        orgId: org1Id,
        productId: 'prod-1',
        name: 'Large',
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
        variantId: 'var-1',
        minQuantity: 1,
        unitPrice: 15,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'bp-2',
        orgId: org1Id,
        productId: 'prod-1',
        variantId: 'var-1',
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
        { productId: 'prod-1', variantId: 'var-1', quantity: 10 },
        { productId: 'prod-1', variantId: 'var-1', quantity: 60 },
      ],
    })

    expect(result.order.status).toBe('draft')
    expect(result.order.customerId).toBe('cust-1')
    expect(result.order.notes).toBe('Rush order')

    expect(result.lineItems).toHaveLength(2)
    expect(result.lineItems[0].unitPrice).toBeCloseTo(14.08, 2)
    expect(result.lineItems[0].total).toBeCloseTo(140.8, 2)
    expect(result.lineItems[1].unitPrice).toBe(10)
    expect(result.lineItems[1].total).toBe(600)
    expect(result.order.total).toBeCloseTo(740.8, 2)
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

  it('updates a line item quantity and recalculates totals', async () => {
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
    ])
    await db.insert(breakpointsTable).values([
      {
        id: 'bp-6',
        orgId: org1Id,
        productId: 'prod-5',
        minQuantity: 1,
        unitPrice: 3,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'bp-7',
        orgId: org1Id,
        productId: 'prod-5',
        minQuantity: 100,
        unitPrice: 2,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const created = await createDraftOrder(org1Id, {
      customerId: 'cust-5',
      lineItems: [{ productId: 'prod-5', quantity: 10 }],
    })

    const itemId = created.lineItems[0].id
    const updated = await updateLineItem(itemId, org1Id, { quantity: 200 })

    expect(updated.quantity).toBe(200)
    expect(updated.unitPrice).toBe(2)
    expect(updated.total).toBe(400)

    const fetched = await getOrder(created.order.id, org1Id)
    expect(fetched?.order.total).toBe(400)
  })

  it('removes a line item and recalculates order total', async () => {
    const now = new Date()

    await db.insert(customersTable).values([
      {
        id: 'cust-6',
        orgId: org1Id,
        name: 'Foxtrot Co',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(productsTable).values([
      {
        id: 'prod-6a',
        orgId: org1Id,
        name: 'Item A',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-6b',
        orgId: org1Id,
        name: 'Item B',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(breakpointsTable).values([
      {
        id: 'bp-8',
        orgId: org1Id,
        productId: 'prod-6a',
        minQuantity: 1,
        unitPrice: 10,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'bp-9',
        orgId: org1Id,
        productId: 'prod-6b',
        minQuantity: 1,
        unitPrice: 20,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const created = await createDraftOrder(org1Id, {
      customerId: 'cust-6',
      lineItems: [
        { productId: 'prod-6a', quantity: 2 },
        { productId: 'prod-6b', quantity: 1 },
      ],
    })

    expect(created.lineItems).toHaveLength(2)
    expect(created.order.total).toBeCloseTo(40, 2)

    await removeLineItem(created.lineItems[1].id, org1Id)

    const fetched = await getOrder(created.order.id, org1Id)
    expect(fetched?.lineItems).toHaveLength(1)
    expect(fetched?.order.total).toBeCloseTo(20, 2)
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

    const result = await listOrders(org1Id)

    expect(result.rows).toHaveLength(2)
    expect(result.totalRows).toBe(2)
    expect(result.rows[0].customerName).toBe('Beta Corp')
    expect(result.rows[1].customerName).toBe('Alpha Corp')
    expect(result.rows.every((r) => r.status === 'draft')).toBe(true)
    expect(result.rows.every((r) => r.id)).toBe(true)
  })

  it('does not leak orders across orgs', async () => {
    const org2Result = await listOrders(org2Id)

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
