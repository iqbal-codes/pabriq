import { and, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  addresses,
  customers,
  orderLineItems,
  orders,
  products,
} from '#/db/schema'
import type { ShippingAddress } from '#/features/address/model'

export type PortalLineItem = {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
  name: string | null
  notes: string | null
  createdAt: Date
}

export type PortalOrder = {
  id: string
  orgId: string
  status: string
  orderNumber: string | null
  total: number
  shippingAddress: ShippingAddress | null
  customerId: string
  customerName: string
  customerPhone: string | null
  lineItems: PortalLineItem[]
  createdAt: Date
}

export type PortalOrderResult =
  | {
      ok: true
      order: PortalOrder
    }
  | { ok: false; error: string }

export type PortalConfirmResult =
  | {
      ok: true
    }
  | { ok: false; error: string }

function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 32)
}

export async function generateOrderToken(orderId: string): Promise<string> {
  const token = randomToken()
  await db
    .update(orders)
    .set({ orderToken: token, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
  return token
}

export async function getPortalOrder(
  token: string,
): Promise<PortalOrderResult> {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.orderToken, token))
    .limit(1)

  if (orderRows.length === 0) {
    return { ok: false, error: 'notFound' }
  }

  const order = orderRows[0]
  const customerRows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
    })
    .from(customers)
    .where(
      and(eq(customers.id, order.customerId), eq(customers.orgId, order.orgId)),
    )
    .limit(1)

  const customer = customerRows[0]

  const itemRows = await db
    .select()
    .from(orderLineItems)
    .where(eq(orderLineItems.orderId, order.id))

  const productRows = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(eq(products.orgId, order.orgId))

  const productMap = new Map(productRows.map((p) => [p.id, p.name]))

  const items: PortalLineItem[] = itemRows.map((item) => ({
    id: item.id,
    productName: productMap.get(item.productId) ?? 'Unknown',
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total,
    name: item.name ?? null,
    notes: item.notes ?? null,
    createdAt: item.createdAt,
  }))

  return {
    ok: true,
    order: {
      id: order.id,
      orgId: order.orgId,
      status: order.status,
      orderNumber: order.orderNumber,
      total: order.total,
      shippingAddress: order.shippingAddress as ShippingAddress | null,
      customerId: order.customerId,
      customerName: customer?.name ?? 'Unknown',
      customerPhone: customer?.phone ?? null,
      lineItems: items,
      createdAt: order.createdAt,
    },
  }
}

export async function confirmPortalOrder(
  orderId: string,
): Promise<PortalConfirmResult> {
  const orderRows = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (orderRows.length === 0) {
    return { ok: false, error: 'notFound' }
  }

  if (orderRows[0].status !== 'draft') {
    return { ok: false, error: 'notDraft' }
  }

  await db
    .update(orders)
    .set({ status: 'pending', updatedAt: new Date() })
    .where(eq(orders.id, orderId))

  return { ok: true }
}

export type UpdatePortalLineItemInput = {
  name?: string
  notes?: string
  assetId?: string | null
}

export async function updatePortalLineItem(
  itemId: string,
  input: UpdatePortalLineItemInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const itemRows = await db
    .select({ id: orderLineItems.id })
    .from(orderLineItems)
    .where(eq(orderLineItems.id, itemId))
    .limit(1)

  if (itemRows.length === 0) {
    return { ok: false, error: 'notFound' }
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (input.name !== undefined) updateData.name = input.name
  if (input.notes !== undefined) updateData.notes = input.notes
  if (input.assetId !== undefined) updateData.assetId = input.assetId

  await db
    .update(orderLineItems)
    .set(updateData)
    .where(eq(orderLineItems.id, itemId))

  return { ok: true }
}

export type SavePortalAddressResult =
  | {
      ok: true
      addressId: string
    }
  | { ok: false; error: string }

export async function savePortalAddress(
  orderId: string,
  addressData: ShippingAddress,
  isWni: boolean,
): Promise<SavePortalAddressResult> {
  const orderRows = await db
    .select({ orgId: orders.orgId, customerId: orders.customerId })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (orderRows.length === 0) {
    return { ok: false, error: 'notFound' }
  }

  const { orgId, customerId } = orderRows[0]

  const addressId = crypto.randomUUID()
  await db.insert(addresses).values({
    id: addressId,
    orgId,
    areaId: addressData.areaId,
    areaName: addressData.areaName,
    streetAddress: addressData.streetAddress,
    isDefault: false,
  })

  await db
    .update(customers)
    .set({ addressId, isWni, updatedAt: new Date() })
    .where(and(eq(customers.id, customerId), eq(customers.orgId, orgId)))

  await db
    .update(orders)
    .set({ shippingAddress: addressData, updatedAt: new Date() })
    .where(eq(orders.id, orderId))

  return { ok: true, addressId }
}
