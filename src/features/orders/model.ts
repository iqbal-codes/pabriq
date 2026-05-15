import { and, asc, desc, eq, ilike, or, type SQL, sql } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  assets as assetsTable,
  customers as customersTable,
  orderLineItems as lineItemsTable,
  orders as ordersTable,
  products as productsTable,
} from '#/db/schema'
import type { ShippingAddress } from '#/features/address/model'
import { type Breakpoint, calculateUnitPrice } from '#/features/pricing/engine'
import { listBreakpoints } from '#/features/products/model'

export type Order = {
  id: string
  orgId: string
  customerId: string | null
  status: string
  notes: string | null
  total: number
  orderNumber: string | null
  orderToken: string | null
  validUntil: Date | null
  approvedAt: Date | null
  approvedBy: string | null
  rejectedAt: Date | null
  rejectedBy: string | null
  rejectReason: string | null
  courier: string | null
  trackingNumber: string | null
  shippedAt: Date | null
  deliveredAt: Date | null
  shippingAddress: ShippingAddress | null
  createdAt: Date
  updatedAt: Date
}

export type DeliveryInfo = {
  courier?: string
  trackingNumber?: string
}

export type OrderLineItem = {
  id: string
  orgId: string
  orderId: string
  productId: string
  quantity: number
  unitPrice: number
  total: number
  name: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export type LineItemInput = {
  id?: string
  productId: string
  quantity: number
  unitPrice?: number
  name?: string
  notes?: string
}

export type CreateDraftOrderInput = {
  customerId: string | null
  notes?: string
  lineItems: LineItemInput[]
}

export type UpdateDraftOrderInput = {
  customerId: string | null
  notes?: string
  lineItems: Array<{
    id?: string
    productId: string
    quantity: number
    unitPrice?: number
    name?: string
    notes?: string
  }>
}

export type CreateDraftOrderResult = {
  order: Order
  lineItems: OrderLineItem[]
}

export type UpdateDraftOrderResult = {
  order: Order
  lineItems: OrderLineItem[]
}

export type GetOrderResult = {
  order: Order
  lineItems: OrderLineItem[]
  customerName: string | null
  customerPhone: string | null
  customerPhotoAssetId: string | null
  customerEmail: string | null
  shippingAddress: ShippingAddress | null
}

export type OrderRow = {
  id: string
  customerName: string | null
  status: string
  total: number
  orderNumber: string | null
  orderToken: string | null
  createdAt: Date
}

export type ListOrdersParams = {
  orgId: string
  search?: string
  status?: string
  sort?: { field: string; direction: 'asc' | 'desc' } | null
  page?: number
  perPage?: number
}

export type ListOrdersResult = {
  rows: OrderRow[]
  totalRows: number
}

function generateId(): string {
  return crypto.randomUUID()
}

async function generateOrderNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `ORD-${year}-`

  const existingRows = await db
    .select({ orderNumber: ordersTable.orderNumber })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.orgId, orgId),
        ilike(ordersTable.orderNumber, `${prefix}%`),
      ),
    )
    .orderBy(desc(ordersTable.orderNumber))
    .limit(1)

  const nextNum =
    existingRows.length > 0 && existingRows[0].orderNumber
      ? Number.parseInt(existingRows[0].orderNumber.split('-')[2] ?? '0', 10) +
        1
      : 1

  return `${prefix}${String(nextNum).padStart(3, '0')}`
}

async function computeLineItemPricing(
  productId: string,
  quantity: number,
  unitPrice?: number,
): Promise<{ unitPrice: number; total: number }> {
  const breakpoints = await listBreakpoints(productId)
  const result = calculateUnitPrice({
    quantity,
    breakpoints: breakpoints as Breakpoint[],
    manualUnitPrice: unitPrice,
  })

  if ('code' in result) {
    throw new Error(result.message)
  }

  return {
    unitPrice: result.unitPrice.amount,
    total: result.lineTotal.amount,
  }
}

const ALLOWED_SORT_FIELDS = new Set([
  'orderNumber',
  'customerName',
  'status',
  'total',
  'createdAt',
])

export async function listOrders(
  params: ListOrdersParams,
): Promise<ListOrdersResult> {
  const conditions: SQL[] = [eq(ordersTable.orgId, params.orgId)]

  if (params.search?.trim()) {
    const pattern = `%${params.search.trim()}%`
    conditions.push(
      or(
        ilike(ordersTable.orderNumber, pattern),
        ilike(customersTable.name, pattern),
      ) as SQL,
    )
  }

  if (params.status) {
    conditions.push(eq(ordersTable.status, params.status))
  }

  const allConditions = and(...conditions) as SQL

  const page = params.page ?? 1
  const perPage = params.perPage ?? 25

  const sortCol =
    params.sort && ALLOWED_SORT_FIELDS.has(params.sort.field)
      ? params.sort.field === 'orderNumber'
        ? ordersTable.orderNumber
        : params.sort.field === 'customerName'
          ? customersTable.name
          : params.sort.field === 'status'
            ? ordersTable.status
            : params.sort.field === 'total'
              ? ordersTable.total
              : ordersTable.createdAt
      : ordersTable.createdAt

  const sortDir =
    params.sort && ALLOWED_SORT_FIELDS.has(params.sort.field)
      ? params.sort.direction === 'asc'
        ? asc(sortCol)
        : desc(sortCol)
      : desc(ordersTable.createdAt)

  const rows = await db
    .select({
      id: ordersTable.id,
      customerName: customersTable.name,
      status: ordersTable.status,
      total: ordersTable.total,
      orderNumber: ordersTable.orderNumber,
      orderToken: ordersTable.orderToken,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
    .where(allConditions)
    .orderBy(sortDir)
    .limit(perPage)
    .offset((page - 1) * perPage)

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(ordersTable)
    .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
    .where(allConditions)

  return {
    rows,
    totalRows: Number(countResult[0]?.count ?? 0),
  }
}

export async function getOrder(
  id: string,
  orgId: string,
): Promise<GetOrderResult | null> {
  const orderRows = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, orgId)))
    .limit(1)

  if (orderRows.length === 0) return null

  const itemRows = await db
    .select()
    .from(lineItemsTable)
    .where(eq(lineItemsTable.orderId, id))
    .orderBy(lineItemsTable.createdAt)

  const customer = orderRows[0].customerId
    ? (
        await db
          .select({
            name: customersTable.name,
            phone: customersTable.phone,
            photoAssetId: customersTable.photoAssetId,
            email: customersTable.email,
          })
          .from(customersTable)
          .where(
            and(
              eq(customersTable.id, orderRows[0].customerId),
              eq(customersTable.orgId, orgId),
            ),
          )
          .limit(1)
      )[0]
    : null

  return {
    order: orderRows[0] as Order,
    lineItems: itemRows as OrderLineItem[],
    customerName: customer?.name ?? null,
    customerPhone: customer?.phone ?? null,
    customerPhotoAssetId: customer?.photoAssetId ?? null,
    customerEmail: customer?.email ?? null,
    shippingAddress: (orderRows[0].shippingAddress ?? null) as ShippingAddress | null,
  }
}

export async function getAssetsForLineItem(
  lineItemId: string,
  orgId: string,
): Promise<Array<{ id: string; originalFilename: string; mimeType: string }>> {
  const rows = await db
    .select({
      id: assetsTable.id,
      originalFilename: assetsTable.originalFilename,
      mimeType: assetsTable.mimeType,
    })
    .from(assetsTable)
    .where(
      and(
        eq(assetsTable.orgId, orgId),
        eq(assetsTable.ownerType, 'order'),
        eq(assetsTable.ownerId, lineItemId),
        eq(assetsTable.status, 'active'),
      ),
    )
    .orderBy(assetsTable.createdAt)

  return rows
}

export async function createDraftOrder(
  orgId: string,
  input: CreateDraftOrderInput,
): Promise<CreateDraftOrderResult> {
  const customerId = input.customerId?.trim() || null
  if (customerId) {
    const customerRows = await db
      .select({ id: customersTable.id })
      .from(customersTable)
      .where(
        and(eq(customersTable.id, customerId), eq(customersTable.orgId, orgId)),
      )
      .limit(1)
    if (customerRows.length === 0) throw new Error('Customer not found')
  }

  const now = new Date()
  const orderId = generateId()
  const items: OrderLineItem[] = []

  for (const li of input.lineItems) {
    const productRows = await db
      .select({ id: productsTable.id, active: productsTable.active })
      .from(productsTable)
      .where(
        and(eq(productsTable.id, li.productId), eq(productsTable.orgId, orgId)),
      )
      .limit(1)
    if (productRows.length === 0) throw new Error('Product not found')
    if (!productRows[0].active) throw new Error('Product is not active')

    const pricing = await computeLineItemPricing(
      li.productId,
      li.quantity,
      li.unitPrice,
    )

    const itemId = li.id ?? generateId()
    items.push({
      id: itemId,
      orgId,
      orderId,
      productId: li.productId,
      quantity: li.quantity,
      unitPrice: pricing.unitPrice,
      total: pricing.total,
      name: li.name ?? null,
      notes: li.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
  }

  const orderTotal = items.reduce((sum, i) => sum + i.total, 0)
  const orderNumber = await generateOrderNumber(orgId)
  const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  await db.insert(ordersTable).values({
    id: orderId,
    orgId,
    customerId,
    status: 'draft',
    notes: input.notes ?? null,
    total: orderTotal,
    orderNumber,
    validUntil,
    createdAt: now,
    updatedAt: now,
  })

  if (items.length > 0) {
    await db.insert(lineItemsTable).values(items)
  }

  return {
    order: {
      id: orderId,
      orgId,
      customerId,
      status: 'draft',
      notes: input.notes ?? null,
      total: orderTotal,
      orderNumber,
      orderToken: null,
      validUntil,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      rejectReason: null,
      courier: null,
      trackingNumber: null,
      shippedAt: null,
      deliveredAt: null,
      shippingAddress: null,
      createdAt: now,
      updatedAt: now,
    },
    lineItems: items,
  }
}

export async function updateDraftOrder(
  id: string,
  orgId: string,
  input: UpdateDraftOrderInput,
): Promise<UpdateDraftOrderResult> {
  const orderRows = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, orgId)))
    .limit(1)

  if (orderRows.length === 0) throw new Error('Order not found')
  if (orderRows[0].status !== 'draft')
    throw new Error('Can only modify draft orders')

  const customerId = input.customerId?.trim() || null
  if (customerId) {
    const customerRows = await db
      .select({ id: customersTable.id })
      .from(customersTable)
      .where(
        and(eq(customersTable.id, customerId), eq(customersTable.orgId, orgId)),
      )
      .limit(1)
    if (customerRows.length === 0) throw new Error('Customer not found')
  }

  // Validate all products
  for (const li of input.lineItems) {
    const productRows = await db
      .select({ id: productsTable.id, active: productsTable.active })
      .from(productsTable)
      .where(
        and(eq(productsTable.id, li.productId), eq(productsTable.orgId, orgId)),
      )
      .limit(1)
    if (productRows.length === 0) throw new Error('Product not found')
    // For existing drafts, allow already-selected inactive products
    if (!productRows[0].active) {
      const existingItems = await db
        .select({ id: lineItemsTable.id })
        .from(lineItemsTable)
        .where(
          and(
            eq(lineItemsTable.orderId, id),
            eq(lineItemsTable.productId, li.productId),
          ),
        )
        .limit(1)
      // If this product is new (not in existing items), reject
      if (existingItems.length === 0) {
        throw new Error('Cannot add inactive product')
      }
    }
  }

  const now = new Date()

  // Delete existing line items
  await db.delete(lineItemsTable).where(eq(lineItemsTable.orderId, id))

  // Insert new line items
  const items: OrderLineItem[] = []
  for (const li of input.lineItems) {
    const pricing = await computeLineItemPricing(
      li.productId,
      li.quantity,
      li.unitPrice,
    )

    const itemId = li.id ?? generateId()
    items.push({
      id: itemId,
      orgId,
      orderId: id,
      productId: li.productId,
      quantity: li.quantity,
      unitPrice: pricing.unitPrice,
      total: pricing.total,
      name: li.name ?? null,
      notes: li.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
  }

  const orderTotal = items.reduce((sum, i) => sum + i.total, 0)

  await db
    .update(ordersTable)
    .set({
      customerId,
      notes: input.notes ?? null,
      total: orderTotal,
      updatedAt: now,
    })
    .where(eq(ordersTable.id, id))

  if (items.length > 0) {
    await db.insert(lineItemsTable).values(items)
  }

  return {
    order: {
      ...orderRows[0],
      customerId,
      notes: input.notes ?? null,
      total: orderTotal,
      updatedAt: now,
    } as Order,
    lineItems: items,
  }
}

export async function approveOrder(
  id: string,
  orgId: string,
  approvedBy: string,
): Promise<void> {
  const orderRows = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, orgId)))
    .limit(1)

  if (orderRows.length === 0) throw new Error('Order not found')
  if (orderRows[0].status !== 'pending')
    throw new Error('Only pending orders can be approved')

  const now = new Date()
  await db
    .update(ordersTable)
    .set({
      status: 'approved',
      approvedAt: now,
      approvedBy,
      updatedAt: now,
    })
    .where(eq(ordersTable.id, id))
}

export async function rejectOrder(
  id: string,
  orgId: string,
  rejectInfo: { rejectedBy: string; reason: string },
): Promise<void> {
  const orderRows = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, orgId)))
    .limit(1)

  if (orderRows.length === 0) throw new Error('Order not found')
  if (orderRows[0].status !== 'pending')
    throw new Error('Only pending orders can be rejected')

  const now = new Date()
  await db
    .update(ordersTable)
    .set({
      status: 'rejected',
      rejectedAt: now,
      rejectedBy: rejectInfo.rejectedBy,
      rejectReason: rejectInfo.reason,
      updatedAt: now,
    })
    .where(eq(ordersTable.id, id))
}

export async function advanceOrderStatus(
  id: string,
  orgId: string,
  _actorId: string,
): Promise<void> {
  const orderRows = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, orgId)))
    .limit(1)

  if (orderRows.length === 0) throw new Error('Order not found')
  const order = orderRows[0]

  const now = new Date()
  if (order.status === 'approved') {
    await db
      .update(ordersTable)
      .set({ status: 'in_progress', updatedAt: now })
      .where(eq(ordersTable.id, id))
  } else if (order.status === 'in_progress') {
    await db
      .update(ordersTable)
      .set({ status: 'in_delivery', updatedAt: now })
      .where(eq(ordersTable.id, id))
  } else if (order.status === 'in_delivery') {
    await db
      .update(ordersTable)
      .set({ status: 'completed', deliveredAt: now, updatedAt: now })
      .where(eq(ordersTable.id, id))
  } else {
    throw new Error(`Cannot advance order from status: ${order.status}`)
  }
}

export async function setDeliveryInfo(
  id: string,
  orgId: string,
  delivery: DeliveryInfo,
): Promise<void> {
  const orderRows = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, orgId)))
    .limit(1)

  if (orderRows.length === 0) throw new Error('Order not found')
  if (orderRows[0].status !== 'in_delivery')
    throw new Error('Only in_delivery orders can have delivery info set')

  const now = new Date()
  const updates: Record<string, unknown> = { updatedAt: now }
  if (delivery.courier !== undefined) updates.courier = delivery.courier
  if (delivery.trackingNumber !== undefined)
    updates.trackingNumber = delivery.trackingNumber

  await db.update(ordersTable).set(updates).where(eq(ordersTable.id, id))
}

export async function markShipped(
  id: string,
  orgId: string,
  delivery: DeliveryInfo,
): Promise<void> {
  const orderRows = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, orgId)))
    .limit(1)

  if (orderRows.length === 0) throw new Error('Order not found')
  if (orderRows[0].status !== 'in_progress')
    throw new Error('Only in_progress orders can be shipped')

  const now = new Date()
  await db
    .update(ordersTable)
    .set({
      status: 'in_delivery',
      courier: delivery.courier ?? null,
      trackingNumber: delivery.trackingNumber ?? null,
      shippedAt: now,
      updatedAt: now,
    })
    .where(eq(ordersTable.id, id))
}
