import { eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  addresses,
  assets,
  assetVariants,
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
const asset1Id = '00000000-0000-0000-0000-000000000010'
const guestOrderId = '00000000-0000-0000-0000-000000000011'
const matchedCustomerId = '00000000-0000-0000-0000-000000000012'
const createdCustomerId = '00000000-0000-0000-0000-000000000013'

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

  await db.insert(biteshipAreas).values({
    areaId: 'area-1',
    name: 'Cibis, Palmerah',
    subdistrict: 'Palmerah',
    district: 'Palmerah',
    city: 'Jakarta Barat',
    province: 'DKI Jakarta',
    postalCode: '11480',
  })

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
      orderNumber: 'ORD-2026-001',
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

  await db.insert(assets).values({
    id: asset1Id,
    orgId: org1Id,
    ownerType: 'order',
    ownerId: lineItem1Id,
    usage: 'attachment',
    assetKind: 'image',
    originalFilename: 'test.png',
    mimeType: 'image/png',
    sizeBytes: 1024,
    uploadedByUserId: 'system',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(assetVariants).values({
    id: crypto.randomUUID(),
    assetId: asset1Id,
    variantKey: 'original',
    storageKey: 'test/key/original.png',
    mimeType: 'image/png',
    sizeBytes: 1024,
    createdAt: now,
  })
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
      expect(result.order.orderNumber).toBe('ORD-2026-001')
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

  it('returns line items with assetIds', async () => {
    await db
      .update(orderLineItems)
      .set({ assetId: asset1Id })
      .where(eq(orderLineItems.id, lineItem1Id))

    const token = await generateOrderToken(order1Id)
    const result = await getPortalOrder(token)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.lineItems[0].assetIds).toContain(asset1Id)
    }
  })
})

describe('confirmPortalOrder', () => {
  it('transitions draft order to pending', async () => {
    const token = await generateOrderToken(order1Id)
    await getPortalOrder(token)
    const result = await confirmPortalOrder({ orderId: order1Id })
    expect(result.ok).toBe(true)

    const rows = await db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, order1Id))
      .limit(1)
    expect(rows[0]?.status).toBe('pending')
  })

  it('returns notFound for unknown order', async () => {
    const result = await confirmPortalOrder({ orderId: 'unknown-id' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('notFound')
  })

  it('returns notDraft for non-draft order', async () => {
    await db
      .update(orders)
      .set({ status: 'pending' })
      .where(eq(orders.id, order1Id))
    const result = await confirmPortalOrder({ orderId: order1Id })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('notDraft')
  })

  it('matches an existing customer by phone and keeps their name', async () => {
    const now = new Date()

    await db.insert(orders).values({
      id: guestOrderId,
      orgId: org1Id,
      customerId: null,
      status: 'draft',
      total: 0,
      orderNumber: 'ORD-2026-002',
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(customersTable).values({
      id: matchedCustomerId,
      orgId: org1Id,
      name: 'Existing Guest',
      phone: '082233445566',
      active: true,
      createdAt: now,
      updatedAt: now,
    })

    const result = await confirmPortalOrder({
      orderId: guestOrderId,
      guestName: 'Portal Guest',
      guestPhone: '0822-3344-5566',
    })

    expect(result.ok).toBe(true)

    const orderRows = await db
      .select({ customerId: orders.customerId })
      .from(orders)
      .where(eq(orders.id, guestOrderId))
      .limit(1)
    expect(orderRows[0]?.customerId).toBe(matchedCustomerId)

    const customerRows = await db
      .select({ name: customersTable.name })
      .from(customersTable)
      .where(eq(customersTable.id, matchedCustomerId))
      .limit(1)
    expect(customerRows[0]?.name).toBe('Existing Guest')
  })

  it('backfills an empty customer name from the portal input', async () => {
    const now = new Date()

    await db.insert(orders).values({
      id: '00000000-0000-0000-0000-000000000014',
      orgId: org1Id,
      customerId: null,
      status: 'draft',
      total: 0,
      orderNumber: 'ORD-2026-004',
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(customersTable).values({
      id: '00000000-0000-0000-0000-000000000015',
      orgId: org1Id,
      name: '',
      phone: '081100220033',
      active: true,
      createdAt: now,
      updatedAt: now,
    })

    const result = await confirmPortalOrder({
      orderId: '00000000-0000-0000-0000-000000000014',
      guestName: 'Filled In Name',
      guestPhone: '0811 0022 0033',
    })

    expect(result.ok).toBe(true)

    const customerRows = await db
      .select({ name: customersTable.name })
      .from(customersTable)
      .where(eq(customersTable.phone, '081100220033'))
      .limit(1)
    expect(customerRows[0]?.name).toBe('Filled In Name')
  })

  it('creates a customer when no matching phone exists', async () => {
    const now = new Date()

    await db.insert(orders).values({
      id: createdCustomerId,
      orgId: org1Id,
      customerId: null,
      status: 'draft',
      total: 0,
      orderNumber: 'ORD-2026-003',
      createdAt: now,
      updatedAt: now,
    })

    const result = await confirmPortalOrder({
      orderId: createdCustomerId,
      guestName: 'New Portal Guest',
      guestPhone: '0899 1111 2222',
    })

    expect(result.ok).toBe(true)

    const orderRows = await db
      .select({ customerId: orders.customerId })
      .from(orders)
      .where(eq(orders.id, createdCustomerId))
      .limit(1)
    expect(orderRows[0]?.customerId).toBeTruthy()

    const customerRows = await db
      .select({ name: customersTable.name, phone: customersTable.phone })
      .from(customersTable)
      .where(eq(customersTable.id, orderRows[0]?.customerId ?? ''))
      .limit(1)
    expect(customerRows[0]?.name).toBe('New Portal Guest')
    expect(customerRows[0]?.phone).toBe('0899 1111 2222')
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

  it('updates assetId', async () => {
    const result = await updatePortalLineItem(lineItem1Id, {
      assetId: asset1Id,
    })
    expect(result.ok).toBe(true)

    const rows = await db
      .select({ assetId: orderLineItems.assetId })
      .from(orderLineItems)
      .where(eq(orderLineItems.id, lineItem1Id))
      .limit(1)
    expect(rows[0]?.assetId).toBe(asset1Id)
  })

  it('can clear assetId by setting null', async () => {
    await db
      .update(orderLineItems)
      .set({ assetId: asset1Id })
      .where(eq(orderLineItems.id, lineItem1Id))

    const result = await updatePortalLineItem(lineItem1Id, { assetId: null })
    expect(result.ok).toBe(true)

    const rows = await db
      .select({ assetId: orderLineItems.assetId })
      .from(orderLineItems)
      .where(eq(orderLineItems.id, lineItem1Id))
      .limit(1)
    expect(rows[0]?.assetId).toBeNull()
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

describe('getPortalCustomerAddress', () => {
  it('returns null when customer has no saved address', async () => {
    const { getPortalCustomerAddress } = await import('./model')
    const result = await getPortalCustomerAddress(customer1Id, org1Id)
    expect(result).toBeNull()
  })

  it('returns saved address for customer', async () => {
    const addressId = '00000000-0000-0000-0000-000000000020'
    await db.insert(addresses).values({
      id: addressId,
      orgId: org1Id,
      areaId: 'area-1',
      areaName: 'Cibis, Palmerah',
      streetAddress: 'Jl. Sudirman No. 456',
      isDefault: true,
    })

    await db
      .update(customersTable)
      .set({ addressId })
      .where(eq(customersTable.id, customer1Id))

    const { getPortalCustomerAddress } = await import('./model')
    const result = await getPortalCustomerAddress(customer1Id, org1Id)
    expect(result).not.toBeNull()
    if (result) {
      expect(result.areaId).toBe('area-1')
      expect(result.streetAddress).toBe('Jl. Sudirman No. 456')
    }
  })
})
