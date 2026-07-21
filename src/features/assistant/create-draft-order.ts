import crypto from 'node:crypto'
import { db } from '#/db/index'
import * as schema from '#/db/schema'

export async function createDraftOrderFromAction(params: {
  orgId: string
  userId: string
  actionId: string
  lineItems: Array<{
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    total: number
  }>
  customer: { id: string; name: string; phone: string | null } | null
  total: number
}): Promise<{
  id: string
  orgId: string
  customerId: string | null
  status: string
  total: number
  orderNumber: string
  orderToken: string
  portalUrl: string
  adminUrl: string
}> {
  const orderId = crypto.randomUUID()
  const orderToken = crypto.randomUUID().replace(/-/g, '').slice(0, 32)
  const now = new Date()
  const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const orderNumber = `ORD-${now.getFullYear()}-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`

  await db.insert(schema.orders).values({
    id: orderId,
    orgId: params.orgId,
    customerId: params.customer?.id ?? null,
    status: 'draft',
    notes: null,
    total: params.total,
    orderNumber,
    orderToken,
    validUntil,
    createdAt: now,
    updatedAt: now,
  } as typeof schema.orders.$inferInsert)

  if (params.lineItems.length > 0) {
    await db.insert(schema.orderLineItems).values(
      params.lineItems.map((li) => ({
        id: crypto.randomUUID(),
        orgId: params.orgId,
        orderId,
        productId: li.productId,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        total: li.total,
        createdAt: now,
        updatedAt: now,
      })),
    )
  }

  const base = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}`
  return {
    id: orderId,
    orgId: params.orgId,
    customerId: params.customer?.id ?? null,
    status: 'draft',
    total: params.total,
    orderNumber,
    orderToken,
    portalUrl: `${base}/portal/orders/${orderId}`,
    adminUrl: `${base}/_org/orders/${orderId}`,
  }
}
