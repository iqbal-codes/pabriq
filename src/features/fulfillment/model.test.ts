import { eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import { orders, organization } from '#/db/schema'
import { getCourierAdapter } from '#/features/fulfillment/courier-adapter'
import {
  createFulfillmentForOrder,
  getFulfillmentForOrder,
  resolveFulfillmentDefaults,
  transitionFulfillment,
} from '#/features/fulfillment/model'

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

async function createTestOrder(orgId: string, orderId: string) {
  const now = new Date()
  await db.insert(orders).values({
    id: orderId,
    orgId,
    status: 'approved',
    total: 50000,
    createdAt: now,
    updatedAt: now,
  })
}

describe('Fulfillment model', () => {
  it('resolves regional/fulfillment defaults when no explicit value exists', async () => {
    const res = await resolveFulfillmentDefaults(org1Id, {})
    expect(res.type).toBe('shipping')
    expect(res.courier).toBe('jne')
    expect(res.service).toBe('reg')
    expect(res.snapshot).toBeDefined()
  })

  it('respects explicit transaction values over regional defaults', async () => {
    const explicitAddress = {
      areaId: 'area-100',
      areaName: 'Jakarta Selatan',
      streetAddress: 'Jl. Sudirman No. 123',
    }

    const res = await resolveFulfillmentDefaults(org1Id, {
      explicitType: 'pickup',
      explicitCourier: 'pickup',
      explicitService: 'pickup',
      explicitAddress,
    })

    expect(res.type).toBe('pickup')
    expect(res.courier).toBe('pickup')
    expect(res.shippingAddress).toEqual(explicitAddress)
  })

  it('creates a fulfillment record for an order and snapshots values', async () => {
    const orderId = 'order-ful-1'
    await createTestOrder(org1Id, orderId)

    const ful = await createFulfillmentForOrder({
      orgId: org1Id,
      orderId,
      explicitCourier: 'sicepat',
      explicitService: 'best',
    })

    expect(ful.orderId).toBe(orderId)
    expect(ful.status).toBe('unfulfilled')
    expect(ful.courier).toBe('sicepat')
    expect(ful.service).toBe('best')
    expect(ful.snapshot).toBeDefined()

    const retrieved = await getFulfillmentForOrder(orderId, org1Id)
    expect(retrieved?.id).toBe(ful.id)
  })

  it('transitions fulfillment to shipped and syncs order status', async () => {
    const orderId = 'order-ful-2'
    await createTestOrder(org1Id, orderId)

    const shipped = await transitionFulfillment({
      orderId,
      orgId: org1Id,
      nextStatus: 'shipped',
      courier: 'jne',
      trackingNumber: 'JNE123456789',
    })

    expect(shipped.status).toBe('shipped')
    expect(shipped.trackingNumber).toBe('JNE123456789')
    expect(shipped.shippedAt).not.toBeNull()

    // Check order backward compatibility fields
    const [orderRow] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
    expect(orderRow.status).toBe('in_delivery')
    expect(orderRow.courier).toBe('jne')
    expect(orderRow.trackingNumber).toBe('JNE123456789')
    expect(orderRow.shippedAt).not.toBeNull()
  })

  it('transitions fulfillment to delivered/completed', async () => {
    const orderId = 'order-ful-3'
    await createTestOrder(org1Id, orderId)

    await transitionFulfillment({
      orderId,
      orgId: org1Id,
      nextStatus: 'shipped',
      courier: 'sicepat',
      trackingNumber: 'SOC123',
    })

    const completed = await transitionFulfillment({
      orderId,
      orgId: org1Id,
      nextStatus: 'delivered',
      recipientName: 'Budi',
    })

    expect(completed.status).toBe('delivered')
    expect(completed.deliveredAt).not.toBeNull()
    expect(completed.recipientName).toBe('Budi')

    const [orderRow] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
    expect(orderRow.status).toBe('completed')
    expect(orderRow.deliveredAt).not.toBeNull()
  })

  it('handles courier adapter tracking URL generation', async () => {
    const adapter = getCourierAdapter()
    const jneUrl = adapter.getTrackingUrl('jne', 'JNE999')
    expect(jneUrl).toContain('jne.co.id')
    expect(jneUrl).toContain('JNE999')

    const sicepatUrl = adapter.getTrackingUrl('sicepat', 'SOC999')
    expect(sicepatUrl).toContain('sicepat.com')

    const pickupUrl = adapter.getTrackingUrl('pickup', 'PICKUP1')
    expect(pickupUrl).toBeNull()
  })

  it('enforces organization isolation', async () => {
    const orderId1 = 'order-org1'
    const orderId2 = 'order-org2'
    await createTestOrder(org1Id, orderId1)
    await createTestOrder(org2Id, orderId2)

    await createFulfillmentForOrder({ orgId: org1Id, orderId: orderId1 })

    const org2Result = await getFulfillmentForOrder(orderId1, org2Id)
    expect(org2Result).toBeNull()
  })
})
