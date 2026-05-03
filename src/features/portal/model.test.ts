import { eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  biteshipAreas,
  customers as customersTable,
  orderLineItems,
  orders,
  organization,
  products,
} from '#/db/schema'
import {
  confirmPortalOrder,
  generateOrderToken,
  getPortalOrder,
  savePortalAddress,
  updatePortalLineItem,
} from './model'

const org1Id = '00000000-0000-0000-0000-000000000001'
const customer1Id = '00000000-0000-0000-0000-000000000002'
const product1Id = '00000000-0000-0000-0000-000000000003'
const order1Id = '00000000-0000-0000-0000-000000000004'
const lineItem1Id = '00000000-0000-0000-0000-000000000005'

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
  ])

  await db.insert(customersTable).values([
    {
      id: customer1Id,
      orgId: org1Id,
      name: 'Customer 1',
      phone: '081234567890',
      active: true,
      isWni: true,
      createdAt: now,
      updatedAt: now,
    },
  ])

  await db.insert(products).values([
    {
      id: product1Id,
      orgId: org1Id,
      name: 'Product 1',
      active: true,
      basePrice: 10000,
      productionDays: 1,
      minQuantity: 1,
      createdAt: now,
      updatedAt: now,
    },
  ])

  await db.insert(orders).values([
    {
      id: order1Id,
      orgId: org1Id,
      customerId: customer1Id,
      status: 'draft',
      total: 10000,
      quoteNumber: 'QT-2026-001',
      createdAt: now,
      updatedAt: now,
    },
  ])

  await db.insert(orderLineItems).values([
    {
      id: lineItem1Id,
      orgId: org1Id,
      orderId: order1Id,
      productId: product1Id,
      quantity: 1,
      unitPrice: 10000,
      total: 10000,
      createdAt: now,
      updatedAt: now,
    },
  ])
})

describe('generateOrderToken', () => {
  it('generates a token and stores it on the order', async () => {
    const token = await generateOrderToken(order1Id)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)

    const rows = await db
      .select({ orderToken: orders.orderToken })
      .from(orders)
      .where(eq(orders.id, order1Id))
      .limit(1)
    expect(rows[0]?.orderToken).toBe(token)
  })
})

describe('getPortalOrder', () => {
  it('returns notFound for invalid token', async () => {
    const result = await getPortalOrder('invalid-token')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('notFound')
  })

  it('returns order for valid token', async () => {
    const token = await generateOrderToken(order1Id)
    const result = await getPortalOrder(token)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.id).toBe(order1Id)
      expect(result.order.status).toBe('draft')
      expect(result.order.quoteNumber).toBe('QT-2026-001')
    }
  })

  it('returns customer name and phone', async () => {
    const token = await generateOrderToken(order1Id)
    const result = await getPortalOrder(token)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.customerName).toBe('Customer 1')
      expect(result.order.customerPhone).toBe('081234567890')
    }
  })

  it('returns line items with product name', async () => {
    const token = await generateOrderToken(order1Id)
    const result = await getPortalOrder(token)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.lineItems.length).toBe(1)
      expect(result.order.lineItems[0].productName).toBe('Product 1')
      expect(result.order.lineItems[0].quantity).toBe(1)
    }
  })
})

describe('confirmPortalOrder', () => {
  it('transitions draft order to pending', async () => {
    const token = await generateOrderToken(order1Id)
    await getPortalOrder(token)
    const result = await confirmPortalOrder(order1Id)
    expect(result.ok).toBe(true)

    const rows = await db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, order1Id))
      .limit(1)
    expect(rows[0]?.status).toBe('pending')
  })

  it('returns notFound for unknown order', async () => {
    const result = await confirmPortalOrder('unknown-id')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('notFound')
  })

  it('returns notDraft for non-draft order', async () => {
    await db
      .update(orders)
      .set({ status: 'pending' })
      .where(eq(orders.id, order1Id))
    const result = await confirmPortalOrder(order1Id)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('notDraft')
  })
})

describe('updatePortalLineItem', () => {
  it('updates name and notes', async () => {
    const result = await updatePortalLineItem(lineItem1Id, {
      name: 'Custom Name',
      notes: 'Custom notes',
    })
    expect(result.ok).toBe(true)

    const rows = await db
      .select({ name: orderLineItems.name, notes: orderLineItems.notes })
      .from(orderLineItems)
      .where(eq(orderLineItems.id, lineItem1Id))
      .limit(1)
    expect(rows[0]?.name).toBe('Custom Name')
    expect(rows[0]?.notes).toBe('Custom notes')
  })

  it('returns notFound for unknown item', async () => {
    const result = await updatePortalLineItem('unknown-id', {
      name: 'Test',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('notFound')
  })
})

describe('savePortalAddress', () => {
  beforeEach(async () => {
    await db.insert(biteshipAreas).values({
      areaId: 'area-1',
      name: 'Cibis, Palmerah',
      subdistrict: 'Palmerah',
      district: 'West Jakarta',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '11480',
    })
  })

  it('saves address and links to customer and order', async () => {
    const result = await savePortalAddress(
      order1Id,
      {
        areaId: 'area-1',
        areaName: 'Cibis, Palmerah',
        streetAddress: 'Jl. Raya Palmerah No. 123',
      },
      true,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const addressId = result.addressId
      expect(typeof addressId).toBe('string')

      const customerRows = await db
        .select({ addressId: customersTable.addressId })
        .from(customersTable)
        .where(eq(customersTable.id, customer1Id))
        .limit(1)
      expect(customerRows[0]?.addressId).toBe(addressId)

      const orderRows = await db
        .select({ shippingAddress: orders.shippingAddress })
        .from(orders)
        .where(eq(orders.id, order1Id))
        .limit(1)
      expect(orderRows[0]?.shippingAddress).toBeTruthy()
    }
  })
})
