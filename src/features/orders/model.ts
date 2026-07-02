import { and, desc, eq, ilike, inArray, or, type SQL, sql } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  assets as assetsTable,
  customers as customersTable,
  invoices as invoicesTable,
  orderLineItems as lineItemsTable,
  orders as ordersTable,
  products as productsTable,
} from '#/db/schema'
import type { ShippingAddress } from '#/features/address/model'
import { normalizeDesignName } from '#/features/orders/line-item-display'
import { type Breakpoint, calculateUnitPrice } from '#/features/pricing/engine'
import { spawnQueuedPreProductionTasksForOrder } from '#/features/production/task-spawn-helpers'
import { listBreakpoints } from '#/features/products/model'
import { addWorkingDays } from '#/lib/date-utils'
import { normalizeDesignName } from '#/features/orders/line-item-display'
import { buildOrderBy, type SortColumnMap, type SortState } from '#/lib/sorting'

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
  productName: string
  designName: string | null
  notes: string | null
  productionDays: number
  deadline: Date
  createdAt: Date
  updatedAt: Date
}

export type LineItemInput = {
  id?: string
  productId: string
  quantity: number
  unitPrice?: number
  designName?: string
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
    designName?: string
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
  paymentStatus: string
  dueDate: string | null
  maxDeadline: Date | null
  deliveredAt: Date | null
  shippedAt: Date | null
}

export type ListOrdersParams = {
  orgId: string
  search?: string
  status?: string
  sort?: SortState | null
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

  const deadlineAggs = db
    .select({
      orderId: lineItemsTable.orderId,
      maxDeadline: sql<Date>`MAX(${lineItemsTable.deadline})`.as(
        'max_deadline',
      ),
    })
    .from(lineItemsTable)
    .where(eq(lineItemsTable.orgId, params.orgId))
    .groupBy(lineItemsTable.orderId)
    .as('deadline_aggs')

  const ORDER_SORT_COLUMNS = {
    orderNumber: ordersTable.orderNumber,
    customerName: customersTable.name,
    status: ordersTable.status,
    total: ordersTable.total,
    createdAt: ordersTable.createdAt,
    shippedAt: { expression: ordersTable.shippedAt, nulls: 'last' },
    maxDeadline: { expression: deadlineAggs.maxDeadline, nulls: 'last' },
  } satisfies SortColumnMap
  const sortDir = buildOrderBy(
    params.sort,
    ORDER_SORT_COLUMNS,
    desc(ordersTable.createdAt),
  )

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: ordersTable.id,
        customerId: ordersTable.customerId,
        customerName: customersTable.name,
        status: ordersTable.status,
        total: ordersTable.total,
        orderNumber: ordersTable.orderNumber,
        orderToken: ordersTable.orderToken,
        createdAt: ordersTable.createdAt,
        deliveredAt: ordersTable.deliveredAt,
        shippedAt: ordersTable.shippedAt,
        maxDeadline: deadlineAggs.maxDeadline,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .leftJoin(deadlineAggs, eq(ordersTable.id, deadlineAggs.orderId))
      .where(allConditions)
      .orderBy(sortDir)
      .limit(perPage)
      .offset((page - 1) * perPage),
    db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(allConditions),
  ])

  // Fetch aggregated invoice data for displayed orders
  const invoiceMap = new Map<
    string,
    { paymentStatus: string; dueDate: string | null }
  >()

  if (rows.length > 0) {
    const orderIds = rows.map((r) => r.id)

    const invoiceAggs = await db
      .select({
        orderId: invoicesTable.orderId,
        paymentStatus: sql<string>`CASE
          WHEN bool_and(${invoicesTable.status} IN ('paid', 'void')) AND bool_or(${invoicesTable.status} = 'paid') THEN 'paid'
          WHEN bool_and(${invoicesTable.status} = 'void') THEN 'void'
          WHEN bool_or(${invoicesTable.status} = 'partially_paid') THEN 'partially_paid'
          ELSE 'unpaid'
        END`,
        dueDate: sql<string | null>`
          MIN(CASE WHEN ${invoicesTable.status} NOT IN ('paid', 'void') THEN ${invoicesTable.dueDate} END)
        `,
      })
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.orgId, params.orgId),
          inArray(invoicesTable.orderId, orderIds),
        ),
      )
      .groupBy(invoicesTable.orderId)

    for (const agg of invoiceAggs) {
      if (agg.orderId) {
        invoiceMap.set(agg.orderId, {
          paymentStatus: agg.paymentStatus,
          dueDate: agg.dueDate as string | null,
        })
      }
    }
  }

  const enrichedRows = rows.map((row) => ({
    ...row,
    paymentStatus: invoiceMap.get(row.id)?.paymentStatus ?? 'no_invoice',
    dueDate: invoiceMap.get(row.id)?.dueDate ?? null,
    maxDeadline: row.maxDeadline ?? null,
  }))

  return {
    rows: enrichedRows,
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
    .select({
      id: lineItemsTable.id,
      orgId: lineItemsTable.orgId,
      orderId: lineItemsTable.orderId,
      productId: lineItemsTable.productId,
      quantity: lineItemsTable.quantity,
      unitPrice: lineItemsTable.unitPrice,
      total: lineItemsTable.total,
      designName: lineItemsTable.designName,
      notes: lineItemsTable.notes,
      assetId: lineItemsTable.assetId,
      productionDays: lineItemsTable.productionDays,
      deadline: lineItemsTable.deadline,
      createdAt: lineItemsTable.createdAt,
      updatedAt: lineItemsTable.updatedAt,
      productName: productsTable.name,
    })
    .from(lineItemsTable)
    .innerJoin(
      productsTable,
      and(
        eq(productsTable.id, lineItemsTable.productId),
        eq(productsTable.orgId, lineItemsTable.orgId),
      ),
    )
<<<<<<< HEAD
    .where(
      and(eq(lineItemsTable.orderId, id), eq(lineItemsTable.orgId, orgId)),
    )
=======
    .where(and(eq(lineItemsTable.orderId, id), eq(lineItemsTable.orgId, orgId)))
>>>>>>> 502307f (refactor: rename order item name to designName, resolve product name from products table)
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
    shippingAddress: (orderRows[0].shippingAddress ??
      null) as ShippingAddress | null,
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
      .select({
        id: productsTable.id,
        name: productsTable.name,
        active: productsTable.active,
        productionDays: productsTable.productionDays,
        name: productsTable.name,
      })
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
    const deadline = addWorkingDays(now, productRows[0].productionDays)
    items.push({
      id: itemId,
      orgId,
      orderId,
      productId: li.productId,
      quantity: li.quantity,
      unitPrice: pricing.unitPrice,
      total: pricing.total,
      productName: productRows[0].name,
      designName: normalizeDesignName(li.designName),
      notes: li.notes ?? null,
      productionDays: productRows[0].productionDays,
      deadline,
      createdAt: now,
      updatedAt: now,
    })
  }

  const orderTotal = items.reduce((sum, i) => sum + i.total, 0)
  const orderNumber = await generateOrderNumber(orgId)
  const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const orderToken = crypto.randomUUID().replace(/-/g, '').slice(0, 32)

  await db.insert(ordersTable).values({
    id: orderId,
    orgId,
    customerId,
    status: 'draft',
    notes: input.notes ?? null,
    total: orderTotal,
    orderNumber,
    orderToken,
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
      orderToken,
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

  // Validate all products and collect productionDays + names
  const productProductionDays = new Map<string, number>()
<<<<<<< HEAD
  const productNames = new Map<string, string>()
=======
  const productNameMap = new Map<string, string>()
>>>>>>> 502307f (refactor: rename order item name to designName, resolve product name from products table)
  for (const li of input.lineItems) {
    const productRows = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        active: productsTable.active,
        productionDays: productsTable.productionDays,
        name: productsTable.name,
      })
      .from(productsTable)
      .where(
        and(eq(productsTable.id, li.productId), eq(productsTable.orgId, orgId)),
      )
      .limit(1)
    if (productRows.length === 0) throw new Error('Product not found')
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
      if (existingItems.length === 0) {
        throw new Error('Cannot add inactive product')
      }
    }
    productProductionDays.set(li.productId, productRows[0].productionDays)
<<<<<<< HEAD
    productNames.set(li.productId, productRows[0].name)
=======
    productNameMap.set(li.productId, productRows[0].name)
>>>>>>> 502307f (refactor: rename order item name to designName, resolve product name from products table)
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
    const productionDays = productProductionDays.get(li.productId) ?? 1
    const deadline = addWorkingDays(now, productionDays)

    const itemId = li.id ?? generateId()
    items.push({
      id: itemId,
      orgId,
      orderId: id,
      productId: li.productId,
      quantity: li.quantity,
      unitPrice: pricing.unitPrice,
      total: pricing.total,
<<<<<<< HEAD
      productName: productNames.get(li.productId) ?? 'Unknown',
=======
      productName: productNameMap.get(li.productId) ?? 'Unknown',
>>>>>>> 502307f (refactor: rename order item name to designName, resolve product name from products table)
      designName: normalizeDesignName(li.designName),
      notes: li.notes ?? null,
      productionDays,
      deadline,
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
  await db.transaction(async (tx) => {
    const orderRows = await tx
      .select({ id: ordersTable.id, status: ordersTable.status })
      .from(ordersTable)
      .where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, orgId)))
      .limit(1)

    if (orderRows.length === 0) throw new Error('Order not found')
    if (orderRows[0].status !== 'pending')
      throw new Error('Only pending orders can be approved')

    const now = new Date()
    await tx
      .update(ordersTable)
      .set({
        status: 'approved',
        approvedAt: now,
        approvedBy,
        updatedAt: now,
      })
      .where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, orgId)))

    await spawnQueuedPreProductionTasksForOrder(tx, {
      orderId: id,
      orgId,
      allowedStatuses: ['approved'] as const,
    })
  })
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
      .set({ status: 'in_delivery', shippedAt: now, updatedAt: now })
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
