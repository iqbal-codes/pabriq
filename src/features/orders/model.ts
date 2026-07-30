import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import { db } from '#/db/index'
import {
  type AssistantActionPayload,
  activityEvents as activityEventsTable,
  addresses as addressesTable,
  assets as assetsTable,
  customers as customersTable,
  invoices as invoicesTable,
  orderLineItemAddons as lineItemAddonsTable,
  orderLineItems as lineItemsTable,
  orders as ordersTable,
  organizationProfiles as organizationProfilesTable,
  paymentMethods as paymentMethodsTable,
  payments as paymentsTable,
  productAddons as productAddonsTable,
  productionStages as productionStagesTable,
  productionTasks as productionTasksTable,
  products as productsTable,
  specificationSnapshots,
  specifications,
} from '#/db/schema'
import type { ShippingAddress } from '#/features/address/model'
import { getCustomerAddress } from '#/features/address/model'
import type { AssetMetadata } from '#/features/assets/server'
import {
  createFulfillmentForOrder,
  transitionFulfillment,
} from '#/features/fulfillment/model'
import { rewriteFinalInvoiceFromOrder } from '#/features/invoices/model'
import { normalizeDesignName } from '#/features/orders/line-item-display'
import { type Breakpoint, calculateUnitPrice } from '#/features/pricing/engine'
import { commitSpecification } from '#/features/product-configuration/model'
import { spawnQueuedPreProductionTasksForOrder } from '#/features/production/task-spawn-helpers'
import { type DbClient, listBreakpoints } from '#/features/products/model'
import { addWorkingDays } from '#/lib/date-utils'
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
  deadline: Date | null
  manualDeadline: boolean
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
  isRepeatOrder: boolean
  manualDeadline: boolean
  selectedAddons: Array<{
    id: string
    productAddonId: string | null
    name: string
    unitSurcharge: number
  }>
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
  addonIds?: string[]
  selectedAddons?: Array<{
    id: string
    productAddonId: string | null
    name: string
    unitSurcharge: number
  }>
  isRepeatOrder?: boolean
  deadline?: Date
  manualDeadline?: boolean
}
export type CreateDraftOrderInput = {
  customerId: string | null
  notes?: string
  lineItems: LineItemInput[]
  deadline?: Date
  manualDeadline?: boolean
}

export type UpdateDraftOrderInput = {
  customerId: string | null
  notes?: string
  lineItems: LineItemInput[]
  deadline?: Date
  manualDeadline?: boolean
}

export type CreateDraftOrderResult = {
  order: Order
  lineItems: OrderLineItem[]
}

export type UpdateDraftOrderResult = {
  order: Order
  lineItems: OrderLineItem[]
}
export type OrderCreationReadiness = {
  businessAddressComplete: boolean
  productionStageCount: number
  activeProductCount: number
  paymentMethodCount: number
  completedCount: number
  totalCount: number
  isReady: boolean
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
  deadline: Date | null
  maxDeadline: Date | null
  deliveredAt: Date | null
  shippedAt: Date | null
}

export type ListOrdersParams = {
  orgId: string
  customerId?: string
  search?: string
  status?: string
  dateFrom?: Date
  dateTo?: Date
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
function getOrderDeadline(
  items: OrderLineItem[],
  input: { deadline?: Date; manualDeadline?: boolean },
): { deadline: Date | null; manualDeadline: boolean } {
  if (input.manualDeadline === true) {
    if (!input.deadline) throw new Error('Order deadline required')
    return { deadline: input.deadline, manualDeadline: true }
  }
  const maxItemDeadline =
    items.length > 0
      ? items.reduce(
          (latest, item) => (item.deadline > latest ? item.deadline : latest),
          items[0].deadline,
        )
      : null
  return { deadline: maxItemDeadline ?? null, manualDeadline: false }
}

const ORDER_CREATION_READINESS_TOTAL = 4

export async function getOrderCreationReadiness(
  orgId: string,
): Promise<OrderCreationReadiness> {
  const [addressRows, stageRows, productRows, paymentMethodRows] =
    await Promise.all([
      db
        .select({
          areaId: addressesTable.areaId,
          streetAddress: addressesTable.streetAddress,
        })
        .from(organizationProfilesTable)
        .leftJoin(
          addressesTable,
          eq(organizationProfilesTable.addressId, addressesTable.id),
        )
        .where(eq(organizationProfilesTable.orgId, orgId))
        .limit(1),
      db
        .select({ id: productionStagesTable.id })
        .from(productionStagesTable)
        .where(
          and(
            eq(productionStagesTable.orgId, orgId),
            eq(productionStagesTable.board, 'production'),
            eq(productionStagesTable.active, true),
          ),
        )
        .limit(1),
      db
        .select({ id: productsTable.id })
        .from(productsTable)
        .where(
          and(eq(productsTable.orgId, orgId), eq(productsTable.active, true)),
        )
        .limit(1),
      db
        .select({ id: paymentMethodsTable.id })
        .from(paymentMethodsTable)
        .where(
          and(
            eq(paymentMethodsTable.orgId, orgId),
            eq(paymentMethodsTable.active, true),
          ),
        )
        .limit(1),
    ])

  const address = addressRows[0]
  const businessAddressComplete =
    address !== undefined &&
    typeof address.areaId === 'string' &&
    address.areaId.trim().length > 0 &&
    typeof address.streetAddress === 'string' &&
    address.streetAddress.trim().length > 0
  const productionStageCount = stageRows.length
  const activeProductCount = productRows.length
  const paymentMethodCount = paymentMethodRows.length
  const completedCount = [
    businessAddressComplete,
    productionStageCount > 0,
    activeProductCount > 0,
    paymentMethodCount > 0,
  ].filter(Boolean).length

  return {
    businessAddressComplete,
    productionStageCount,
    activeProductCount,
    paymentMethodCount,
    completedCount,
    totalCount: ORDER_CREATION_READINESS_TOTAL,
    isReady: completedCount === ORDER_CREATION_READINESS_TOTAL,
  }
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
  client: DbClient,
  input: {
    orgId: string
    productId: string
    quantity: number
    manualUnitPrice?: number
    isRepeatOrder?: boolean
    addonIds?: string[]
  },
): Promise<{
  unitPrice: number
  total: number
  selectedAddons: Array<{
    productAddonId: string
    name: string
    unitSurcharge: number
  }>
}> {
  const productRows = await client
    .select({
      basePrice: productsTable.basePrice,
      minQuantity: productsTable.minQuantity,
      pricingMode: productsTable.pricingMode,
      repeatOrderUnitPrice: productsTable.repeatOrderUnitPrice,
      repeatOrderMinQuantity: productsTable.repeatOrderMinQuantity,
      negotiateAboveQuantity: productsTable.negotiateAboveQuantity,
    })
    .from(productsTable)
    .where(eq(productsTable.id, input.productId))
    .limit(1)
  const product = productRows[0]
  if (!product) throw new Error('Product not found')

  // Load breakpoints
  const breakpointRows = await listBreakpoints(input.productId, client)
  const breakpoints: Breakpoint[] = breakpointRows.map((bp) => ({
    minQuantity: bp.minQuantity,
    unitPrice: bp.unitPrice,
  }))

  // Inject base price at minQuantity if no explicit breakpoint
  const hasExplicitAtMinQty = breakpoints.some(
    (bp) => bp.minQuantity === product.minQuantity,
  )
  if (!hasExplicitAtMinQty) {
    breakpoints.unshift({
      minQuantity: product.minQuantity,
      unitPrice: product.basePrice,
    })
  }

  // Load addons
  let selectedAddons: Array<{
    productAddonId: string
    name: string
    unitSurcharge: number
  }> = []
  let addonSurcharge = 0
  if (input.addonIds && input.addonIds.length > 0) {
    const addonRows = await client
      .select({
        id: productAddonsTable.id,
        name: productAddonsTable.name,
        unitSurcharge: productAddonsTable.unitSurcharge,
      })
      .from(productAddonsTable)
      .where(
        and(
          eq(productAddonsTable.productId, input.productId),
          eq(productAddonsTable.orgId, input.orgId),
          inArray(productAddonsTable.id, input.addonIds),
        ),
      )
    if (addonRows.length !== input.addonIds.length) {
      throw new Error('Invalid product addon')
    }
    selectedAddons = addonRows.map((a) => ({
      productAddonId: a.id,
      name: a.name,
      unitSurcharge: a.unitSurcharge,
    }))
    addonSurcharge = selectedAddons.reduce((sum, a) => sum + a.unitSurcharge, 0)
  }

  let baseUnitPrice: number

  if (input.isRepeatOrder) {
    if (product.repeatOrderUnitPrice == null) {
      throw new Error('Product does not support repeat orders')
    }
    const minQty = product.repeatOrderMinQuantity ?? product.minQuantity
    if (input.quantity < minQty) {
      throw new Error(`Quantity below repeat order minimum of ${minQty}`)
    }
    baseUnitPrice = product.repeatOrderUnitPrice
  } else if (
    product.negotiateAboveQuantity != null &&
    input.quantity > product.negotiateAboveQuantity
  ) {
    // Use cheapest known price
    const cheapest =
      breakpoints.length > 0
        ? Math.min(...breakpoints.map((bp) => bp.unitPrice))
        : product.basePrice
    baseUnitPrice = input.manualUnitPrice ?? cheapest
  } else {
    const result = calculateUnitPrice({
      quantity: input.quantity,
      breakpoints,
      manualUnitPrice: input.manualUnitPrice,
      mode: product.pricingMode as 'interpolated' | 'step',
    })
    if ('code' in result) {
      throw new Error(result.message)
    }
    baseUnitPrice = result.unitPrice.amount
  }

  const unitPrice = baseUnitPrice + addonSurcharge
  return {
    unitPrice,
    total: unitPrice * input.quantity,
    selectedAddons,
  }
}
type LineItemAddonInsert = {
  id: string
  orgId: string
  lineItemId: string
  productAddonId: string
  name: string
  unitSurcharge: number
  createdAt: Date
  updatedAt: Date
}

async function validateAndPriceLineItems(
  client: DbClient,
  orgId: string,
  orderId: string,
  lineItems: LineItemInput[],
  options?: {
    existingOrderProductIds?: Set<string>
    inactiveProductMessage?: string
  },
): Promise<{
  items: OrderLineItem[]
  addonInserts: LineItemAddonInsert[]
  total: number
}> {
  const now = new Date()

  // Batch-query all products to eliminate N+1
  const productIds = [...new Set(lineItems.map((li) => li.productId))]
  const productRows = await client
    .select({
      id: productsTable.id,
      name: productsTable.name,
      active: productsTable.active,
      productionDays: productsTable.productionDays,
      minQuantity: productsTable.minQuantity,
      repeatOrderMinQuantity: productsTable.repeatOrderMinQuantity,
      maxProductionQuantity: productsTable.maxProductionQuantity,
    })
    .from(productsTable)
    .where(
      and(
        inArray(productsTable.id, productIds),
        eq(productsTable.orgId, orgId),
      ),
    )

  const productMap = new Map(productRows.map((p) => [p.id, p]))

  const items: OrderLineItem[] = []
  const addonInserts: LineItemAddonInsert[] = []

  for (const li of lineItems) {
    const product = productMap.get(li.productId)
    if (!product) throw new Error('Product not found')

    if (!product.active) {
      if (options?.existingOrderProductIds?.has(li.productId)) {
        // Allowed — product already exists in the order
      } else {
        throw new Error(
          options?.inactiveProductMessage ?? 'Product is not active',
        )
      }
    }

    // Validate minimum quantity
    if (li.quantity <= 0) {
      throw new Error('Quantity must be greater than zero')
    }

    if (li.isRepeatOrder) {
      const minQty = product.repeatOrderMinQuantity ?? product.minQuantity
      if (li.quantity < minQty) {
        throw new Error(`Quantity below repeat order minimum of ${minQty}`)
      }
    } else {
      if (li.quantity < product.minQuantity) {
        throw new Error(`Quantity below minimum of ${product.minQuantity}`)
      }
    }

    // Validate max production quantity
    if (
      product.maxProductionQuantity != null &&
      li.quantity > product.maxProductionQuantity &&
      !li.manualDeadline
    ) {
      throw new Error('Manual deadline required')
    }

    const pricing = await computeLineItemPricing(client, {
      orgId,
      productId: li.productId,
      quantity: li.quantity,
      manualUnitPrice: li.unitPrice,
      isRepeatOrder: li.isRepeatOrder,
      addonIds: li.addonIds,
    })

    const itemId = li.id ?? generateId()
    let deadline: Date
    if (li.manualDeadline && li.deadline) {
      deadline = li.deadline
    } else {
      deadline = addWorkingDays(now, product.productionDays)
    }

    items.push({
      id: itemId,
      orgId,
      orderId,
      productId: li.productId,
      quantity: li.quantity,
      unitPrice: pricing.unitPrice,
      total: pricing.total,
      productName: product.name,
      designName: normalizeDesignName(li.designName),
      notes: li.notes ?? null,
      productionDays: product.productionDays,
      deadline,
      isRepeatOrder: li.isRepeatOrder ?? false,
      manualDeadline: li.manualDeadline ?? false,
      selectedAddons: pricing.selectedAddons.map((a) => ({
        id: generateId(),
        productAddonId: a.productAddonId,
        name: a.name,
        unitSurcharge: a.unitSurcharge,
      })),
      createdAt: now,
      updatedAt: now,
    })

    // Collect addon snapshot inserts
    for (const addon of pricing.selectedAddons) {
      addonInserts.push({
        id: generateId(),
        orgId,
        lineItemId: itemId,
        productAddonId: addon.productAddonId,
        name: addon.name,
        unitSurcharge: addon.unitSurcharge,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  const total = items.reduce((sum, i) => sum + i.total, 0)
  return { items, addonInserts, total }
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

  if (params.customerId) {
    conditions.push(eq(ordersTable.customerId, params.customerId))
  }

  if (params.dateFrom) {
    conditions.push(gte(ordersTable.createdAt, params.dateFrom))
  }
  if (params.dateTo) {
    conditions.push(lte(ordersTable.createdAt, params.dateTo))
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
        deadline: ordersTable.deadline,
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
    {
      totalPaidAmount: number
      totalPaidPercentage: number
      anyPartiallyPaid: boolean
      hasOpenInvoice: boolean
      allVoid: boolean
      dueDate: string | null
    }
  >()

  if (rows.length > 0) {
    const orderIds = rows.map((r) => r.id)

    const invoiceAggs = await db
      .select({
        orderId: invoicesTable.orderId,
        totalPaidAmount: sql<number>`SUM(CASE WHEN ${invoicesTable.status} = 'paid' THEN ${invoicesTable.total} ELSE 0 END)`,
        totalPaidPercentage: sql<number>`SUM(CASE WHEN ${invoicesTable.status} = 'paid' THEN COALESCE(${invoicesTable.percentage}, 0) ELSE 0 END)`,
        anyPartiallyPaid: sql<boolean>`BOOL_OR(${invoicesTable.status} = 'partially_paid')`,
        hasOpenInvoice: sql<boolean>`BOOL_OR(${invoicesTable.status} NOT IN ('paid', 'void'))`,
        allVoid: sql<boolean>`BOOL_AND(${invoicesTable.status} = 'void')`,
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
          totalPaidAmount: Number(agg.totalPaidAmount || 0),
          totalPaidPercentage: Number(agg.totalPaidPercentage || 0),
          anyPartiallyPaid: Boolean(agg.anyPartiallyPaid),
          hasOpenInvoice: Boolean(agg.hasOpenInvoice),
          allVoid: Boolean(agg.allVoid),
          dueDate: agg.dueDate as string | null,
        })
      }
    }
  }

  const enrichedRows = rows.map((row) => {
    const agg = invoiceMap.get(row.id)
    let paymentStatus = 'no_invoice'
    let dueDate = null

    if (agg) {
      dueDate = agg.dueDate
      if (agg.allVoid) {
        paymentStatus = 'void'
      } else {
        const isFinalShipmentSettlementPending =
          row.status === 'approved' ||
          row.status === 'in_progress' ||
          row.status === 'production'
        const isFullyPaid =
          !agg.hasOpenInvoice &&
          !isFinalShipmentSettlementPending &&
          (agg.totalPaidAmount >= row.total || agg.totalPaidPercentage >= 100)

        if (isFullyPaid) {
          paymentStatus = 'paid'
        } else {
          const hasPayments =
            agg.totalPaidAmount > 0 ||
            agg.totalPaidPercentage > 0 ||
            agg.anyPartiallyPaid

          if (hasPayments) {
            paymentStatus = 'partially_paid'
          } else {
            paymentStatus = 'unpaid'
          }
        }
      }
    }

    return {
      ...row,
      paymentStatus,
      dueDate,
      maxDeadline: row.maxDeadline ?? null,
    }
  })

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
      isRepeatOrder: lineItemsTable.isRepeatOrder,
      manualDeadline: lineItemsTable.manualDeadline,
      createdAt: lineItemsTable.createdAt,
      updatedAt: lineItemsTable.updatedAt,
      productName: lineItemsTable.productName,
    })
    .from(lineItemsTable)
    .where(and(eq(lineItemsTable.orderId, id), eq(lineItemsTable.orgId, orgId)))
    .orderBy(lineItemsTable.createdAt)

  // Fetch addon snapshots for all line items
  const lineItemIds = itemRows.map((item) => item.id)
  const addonRows =
    lineItemIds.length > 0
      ? await db
          .select({
            id: lineItemAddonsTable.id,
            lineItemId: lineItemAddonsTable.lineItemId,
            productAddonId: lineItemAddonsTable.productAddonId,
            name: lineItemAddonsTable.name,
            unitSurcharge: lineItemAddonsTable.unitSurcharge,
          })
          .from(lineItemAddonsTable)
          .where(inArray(lineItemAddonsTable.lineItemId, lineItemIds))
      : []

  // Group addons by line item ID
  const addonsByLineItem = new Map<
    string,
    Array<{
      id: string
      productAddonId: string | null
      name: string
      unitSurcharge: number
    }>
  >()
  for (const addon of addonRows) {
    const existing = addonsByLineItem.get(addon.lineItemId) ?? []
    existing.push({
      id: addon.id,
      productAddonId: addon.productAddonId,
      name: addon.name,
      unitSurcharge: addon.unitSurcharge,
    })
    addonsByLineItem.set(addon.lineItemId, existing)
  }

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

  // Enrich line items with addon data
  const enrichedLineItems: OrderLineItem[] = itemRows.map((item) => {
    const row = item as Omit<OrderLineItem, 'selectedAddons'> & {
      selectedAddons?: OrderLineItem['selectedAddons']
    }
    return {
      ...row,
      isRepeatOrder: row.isRepeatOrder ?? false,
      manualDeadline: row.manualDeadline ?? false,
      selectedAddons: addonsByLineItem.get(item.id) ?? [],
    }
  })

  return {
    order: orderRows[0] as Order,
    lineItems: enrichedLineItems,
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
): Promise<AssetMetadata[]> {
  const rows = await db
    .select({
      id: assetsTable.id,
      originalFilename: assetsTable.originalFilename,
      mimeType: assetsTable.mimeType,
      sizeBytes: assetsTable.sizeBytes,
      assetKind: assetsTable.assetKind,
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
  let shippingAddress: ShippingAddress | null = null
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

    const custAddr = await getCustomerAddress(customerId, orgId)
    if (custAddr) {
      shippingAddress = {
        areaId: custAddr.areaId ?? '',
        areaName: custAddr.areaName ?? '',
        streetAddress: custAddr.streetAddress ?? '',
      }
    }
  }

  const now = new Date()
  const orderId = generateId()

  const {
    items,
    addonInserts,
    total: orderTotal,
  } = await validateAndPriceLineItems(db, orgId, orderId, input.lineItems)

  const orderNumber = await generateOrderNumber(orgId)
  const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const orderToken = crypto.randomUUID().replace(/-/g, '').slice(0, 32)
  const orderDeadline = getOrderDeadline(items, input)

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
    shippingAddress,
    deadline: orderDeadline.deadline,
    manualDeadline: orderDeadline.manualDeadline,
    createdAt: now,
    updatedAt: now,
  })

  if (items.length > 0) {
    const dbItems = items.map(({ selectedAddons: _, ...rest }) => rest)
    await db.insert(lineItemsTable).values(dbItems)
  }

  if (addonInserts.length > 0) {
    await db.insert(lineItemAddonsTable).values(addonInserts)
  }

  // Auto-create specifications for each unique product in the order
  const uniqueProductIds = [...new Set(items.map((li) => li.productId))]
  for (const productId of uniqueProductIds) {
    const [existingSpec] = await db
      .select({ id: specifications.id })
      .from(specifications)
      .where(
        and(
          eq(specifications.orgId, orgId),
          eq(specifications.orderId, orderId),
          eq(specifications.productId, productId),
        ),
      )
      .limit(1)

    if (!existingSpec) {
      await db.insert(specifications).values({
        id: generateId(),
        orgId,
        productId,
        orderId,
        submittedBy: customerId ?? orgId,
        submittedByRole: customerId ? 'customer' : 'operator',
        status: 'draft',
        fieldValues: {},
        quantity: items.find((li) => li.productId === productId)?.quantity ?? 1,
        createdAt: now,
        updatedAt: now,
      })
    }
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
      deadline: orderDeadline.deadline,
      manualDeadline: orderDeadline.manualDeadline,
      shippingAddress,
      createdAt: now,
      updatedAt: now,
    },
    lineItems: items,
  }
}

export async function createDraftOrderFromAction(
  orgId: string,
  payload: AssistantActionPayload,
): Promise<CreateDraftOrderResult> {
  let shippingAddress: ShippingAddress | null = null
  const customerId = payload.customerId?.trim() || null
  if (customerId) {
    const customerRows = await db
      .select({ id: customersTable.id })
      .from(customersTable)
      .where(
        and(eq(customersTable.id, customerId), eq(customersTable.orgId, orgId)),
      )
      .limit(1)
    if (customerRows.length === 0) throw new Error('Customer not found')

    const custAddr = await getCustomerAddress(customerId, orgId)
    if (custAddr) {
      shippingAddress = {
        areaId: custAddr.areaId ?? '',
        areaName: custAddr.areaName ?? '',
        streetAddress: custAddr.streetAddress ?? '',
      }
    }
  }

  const now = new Date()
  const orderId = generateId()
  const items: OrderLineItem[] = []
  const allAddonInserts: Array<{
    id: string
    orgId: string
    lineItemId: string
    productAddonId: string
    name: string
    unitSurcharge: number
    createdAt: Date
    updatedAt: Date
  }> = []

  const productIds = [...new Set(payload.lineItems.map((li) => li.productId))]
  const productRows =
    productIds.length === 0
      ? []
      : await db
          .select({
            id: productsTable.id,
            name: productsTable.name,
            active: productsTable.active,
            productionDays: productsTable.productionDays,
          })
          .from(productsTable)
          .where(
            and(
              inArray(productsTable.id, productIds),
              eq(productsTable.orgId, orgId),
            ),
          )
  const productMap = new Map(
    productRows.map((product) => [product.id, product]),
  )

  for (const li of payload.lineItems) {
    const product = productMap.get(li.productId)
    if (!product) throw new Error('Product not found')
    if (!product.active) throw new Error('Product is not active')

    if (li.quantity <= 0) {
      throw new Error('Quantity must be greater than zero')
    }
    if (li.quantity < li.minQuantity) {
      throw new Error(`Quantity below minimum of ${li.minQuantity}`)
    }

    const itemId = generateId()
    const deadline = addWorkingDays(now, product.productionDays)

    items.push({
      id: itemId,
      orgId,
      orderId,
      productId: li.productId,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      total: li.total,
      productName: li.productName,
      designName: null,
      notes: null,
      productionDays: product.productionDays,
      deadline,
      isRepeatOrder: false,
      manualDeadline: false,
      selectedAddons: [],
      createdAt: now,
      updatedAt: now,
    })
  }

  const orderTotal = items.reduce((sum, i) => sum + i.total, 0)
  const orderNumber = await generateOrderNumber(orgId)
  const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const orderToken = crypto.randomUUID().replace(/-/g, '').slice(0, 32)
  const orderDeadline = getOrderDeadline(items, {})

  await db.insert(ordersTable).values({
    id: orderId,
    orgId,
    customerId,
    status: 'draft',
    notes: null,
    total: orderTotal,
    orderNumber,
    orderToken,
    validUntil,
    shippingAddress,
    deadline: orderDeadline.deadline,
    manualDeadline: orderDeadline.manualDeadline,
    createdAt: now,
    updatedAt: now,
  })

  if (items.length > 0) {
    const dbItems = items.map(({ selectedAddons: _, ...rest }) => rest)
    await db.insert(lineItemsTable).values(dbItems)
  }

  if (allAddonInserts.length > 0) {
    await db.insert(lineItemAddonsTable).values(allAddonInserts)
  }

  return {
    order: {
      id: orderId,
      orgId,
      customerId,
      status: 'draft',
      notes: null,
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
      deadline: orderDeadline.deadline,
      manualDeadline: orderDeadline.manualDeadline,
      shippingAddress,
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

  // Fetch existing line item product IDs for inactive product check
  const existingItems = await db
    .select({ productId: lineItemsTable.productId })
    .from(lineItemsTable)
    .where(eq(lineItemsTable.orderId, id))
  const existingOrderProductIds = new Set(existingItems.map((i) => i.productId))

  const {
    items,
    addonInserts,
    total: orderTotal,
  } = await validateAndPriceLineItems(db, orgId, id, input.lineItems, {
    existingOrderProductIds,
    inactiveProductMessage: 'Cannot add inactive product',
  })

  const now = new Date()

  // Delete existing line items (cascade deletes addon snapshots)
  await db.delete(lineItemsTable).where(eq(lineItemsTable.orderId, id))

  const orderDeadline = getOrderDeadline(items, input)

  await db
    .update(ordersTable)
    .set({
      customerId,
      notes: input.notes ?? null,
      total: orderTotal,
      deadline: orderDeadline.deadline,
      manualDeadline: orderDeadline.manualDeadline,
      updatedAt: now,
    })
    .where(eq(ordersTable.id, id))

  if (items.length > 0) {
    const dbItems = items.map(({ selectedAddons: _, ...rest }) => rest)
    await db.insert(lineItemsTable).values(dbItems)
  }

  if (addonInserts.length > 0) {
    await db.insert(lineItemAddonsTable).values(addonInserts)
  }

  return {
    order: {
      ...orderRows[0],
      customerId,
      notes: input.notes ?? null,
      total: orderTotal,
      deadline: orderDeadline.deadline,
      manualDeadline: orderDeadline.manualDeadline,
      updatedAt: now,
    } as Order,
    lineItems: items,
  }
}

export type AdjustOrderQuantityInput = {
  orderId: string
  lineItemId: string
  quantity: number
  reason: string
  actorId: string
}

export type AdjustOrderQuantityResult = {
  order: Order
  lineItem: OrderLineItem
  finalInvoiceId: string | null
  overpaidAmount: number
}

export async function adjustOrderQuantity(
  orgId: string,
  input: AdjustOrderQuantityInput,
): Promise<AdjustOrderQuantityResult> {
  return db.transaction(async (tx) => {
    // 1. Read the order
    const orderRows = await tx
      .select({
        id: ordersTable.id,
        orgId: ordersTable.orgId,
        status: ordersTable.status,
        total: ordersTable.total,
      })
      .from(ordersTable)
      .where(
        and(eq(ordersTable.id, input.orderId), eq(ordersTable.orgId, orgId)),
      )
      .limit(1)

    if (orderRows.length === 0) throw new Error('Order not found')
    const order = orderRows[0]

    // 2. Allow only approved/in_progress/production orders
    const allowedStatuses = ['approved', 'in_progress', 'production']
    if (!allowedStatuses.includes(order.status)) {
      throw new Error('Only approved or production orders can be adjusted')
    }

    // 3. Read the target line item
    const lineItemRows = await tx
      .select()
      .from(lineItemsTable)
      .where(
        and(
          eq(lineItemsTable.id, input.lineItemId),
          eq(lineItemsTable.orderId, input.orderId),
          eq(lineItemsTable.orgId, orgId),
        ),
      )
      .limit(1)

    if (lineItemRows.length === 0) throw new Error('Order line item not found')
    const lineItem = lineItemRows[0]

    // 4. Validate reason
    const reason = input.reason.trim()
    if (!reason) throw new Error('Adjustment reason is required')

    // 5. Validate quantity
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new Error('Quantity must be greater than zero')
    }

    // 6. Read product row
    const productRows = await tx
      .select({
        id: productsTable.id,
        minQuantity: productsTable.minQuantity,
        maxQuantity: productsTable.maxQuantity,
        repeatOrderMinQuantity: productsTable.repeatOrderMinQuantity,
      })
      .from(productsTable)
      .where(eq(productsTable.id, lineItem.productId))
      .limit(1)

    if (productRows.length === 0) throw new Error('Product not found')
    const product = productRows[0]

    // 7. Enforce minimum quantity
    if (lineItem.isRepeatOrder && product.repeatOrderMinQuantity != null) {
      if (input.quantity < product.repeatOrderMinQuantity) {
        throw new Error(
          `Quantity below repeat order minimum of ${product.repeatOrderMinQuantity}`,
        )
      }
    } else {
      if (input.quantity < product.minQuantity) {
        throw new Error(`Quantity below minimum of ${product.minQuantity}`)
      }
    }

    // 8. Enforce max quantity
    if (product.maxQuantity != null && input.quantity > product.maxQuantity) {
      throw new Error(`Max quantity is ${product.maxQuantity}`)
    }

    // 9. Final invoice detection
    const nonVoidInvoiceRows = await tx
      .select({
        id: invoicesTable.id,
        status: invoicesTable.status,
        createdAt: invoicesTable.createdAt,
      })
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.orderId, input.orderId),
          eq(invoicesTable.orgId, orgId),
        ),
      )
      .orderBy(desc(invoicesTable.createdAt))

    const nonVoidInvoices = nonVoidInvoiceRows.filter(
      (inv) => inv.status !== 'void',
    )

    // Determine if a paid invoice exists (any non-void invoice that is paid)
    const hasPaidInvoice = nonVoidInvoices.some((inv) => inv.status === 'paid')

    // Final invoice = newest non-void invoice after at least one paid non-void invoice exists
    let finalInvoice: (typeof nonVoidInvoices)[number] | null = null
    if (hasPaidInvoice && nonVoidInvoices.length > 0) {
      // The newest non-void invoice is the final one
      finalInvoice = nonVoidInvoices[0] ?? null
    }

    let finalInvoiceId: string | null = null
    let overpaidAmount = 0

    if (finalInvoice) {
      if (finalInvoice.status === 'paid') {
        throw new Error('Cannot adjust quantity after final invoice is paid')
      }

      // Check for pending payments on the final invoice
      const pendingPayments = await tx
        .select({ id: paymentsTable.id })
        .from(paymentsTable)
        .where(
          and(
            eq(paymentsTable.invoiceId, finalInvoice.id),
            eq(paymentsTable.orgId, orgId),
            eq(paymentsTable.status, 'pending'),
          ),
        )
        .limit(1)

      if (pendingPayments.length > 0) {
        throw new Error(
          'Cannot adjust quantity while final invoice has a pending payment',
        )
      }

      finalInvoiceId = finalInvoice.id
    }

    // 10. Compute new pricing
    const addonRows = await tx
      .select({ productAddonId: lineItemAddonsTable.productAddonId })
      .from(lineItemAddonsTable)
      .where(eq(lineItemAddonsTable.lineItemId, input.lineItemId))

    const addonIds = addonRows
      .map((a) => a.productAddonId)
      .filter((id): id is string => id !== null)

    const oldQuantity = lineItem.quantity
    const oldUnitPrice = lineItem.unitPrice
    const oldLineTotal = lineItem.total

    const pricing = await computeLineItemPricing(tx, {
      orgId,
      productId: lineItem.productId,
      quantity: input.quantity,
      isRepeatOrder: lineItem.isRepeatOrder,
      addonIds: addonIds.length > 0 ? addonIds : undefined,
    })

    // Update the line item
    const now = new Date()
    const [updatedLineItem] = await tx
      .update(lineItemsTable)
      .set({
        quantity: input.quantity,
        unitPrice: pricing.unitPrice,
        total: pricing.total,
        updatedAt: now,
      })
      .where(eq(lineItemsTable.id, input.lineItemId))
      .returning()

    // 11. Recompute order total
    const allLineItems = await tx
      .select({ total: lineItemsTable.total })
      .from(lineItemsTable)
      .where(eq(lineItemsTable.orderId, input.orderId))

    const newOrderTotal = allLineItems.reduce((sum, li) => sum + li.total, 0)
    const oldOrderTotal = order.total

    await tx
      .update(ordersTable)
      .set({ total: newOrderTotal, updatedAt: now })
      .where(eq(ordersTable.id, input.orderId))

    // 12. Sync production task quantities in one update.
    await tx
      .update(productionTasksTable)
      .set({
        context: sql`jsonb_set(${productionTasksTable.context}::jsonb, '{quantity}', to_jsonb(${input.quantity}::integer), true)::json`,
        updatedAt: now,
      })
      .where(
        and(
          eq(productionTasksTable.lineItemId, input.lineItemId),
          eq(productionTasksTable.orgId, orgId),
          eq(productionTasksTable.orderId, input.orderId),
          ne(productionTasksTable.status, 'completed'),
          isNull(productionTasksTable.archivedAt),
          isNotNull(productionTasksTable.context),
          sql`jsonb_typeof(${productionTasksTable.context}::jsonb) = 'object'`,
        ),
      )

    // 13. Rewrite final invoice if present
    if (finalInvoiceId) {
      const paymentRows = await tx
        .select({ amount: paymentsTable.amount, status: paymentsTable.status })
        .from(paymentsTable)
        .where(
          and(
            eq(paymentsTable.invoiceId, finalInvoiceId),
            eq(paymentsTable.orgId, orgId),
          ),
        )

      const paidAmount = paymentRows
        .filter((p) => p.status === 'confirmed')
        .reduce((sum, p) => sum + p.amount, 0)

      const rewriteResult = await rewriteFinalInvoiceFromOrder(tx, {
        orgId,
        orderId: input.orderId,
        invoiceId: finalInvoiceId,
        paidAmount,
      })

      overpaidAmount = rewriteResult.overpaidAmount
    }

    // 14. Insert activity event
    await tx.insert(activityEventsTable).values({
      id: crypto.randomUUID(),
      orgId,
      actorId: input.actorId,
      targetType: 'order',
      targetId: input.orderId,
      action: 'quantity_adjusted',
      details: {
        lineItemId: input.lineItemId,
        productName: lineItem.productName,
        designName: lineItem.designName,
        oldQuantity,
        newQuantity: input.quantity,
        oldUnitPrice,
        newUnitPrice: pricing.unitPrice,
        oldLineTotal,
        newLineTotal: pricing.total,
        oldOrderTotal,
        newOrderTotal,
        reason,
        pricingBasis: 'repriced_by_quantity',
        finalInvoiceId,
        finalInvoiceRewritten: finalInvoiceId !== null,
        overpaidAmount,
      },
      createdAt: now,
    })

    // Read updated order for return
    const [updatedOrder] = await tx
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, input.orderId))
      .limit(1)

    return {
      order: updatedOrder as Order,
      lineItem: updatedLineItem as unknown as OrderLineItem,
      finalInvoiceId,
      overpaidAmount,
    }
  })
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type OrderHistoryEvent = {
  id: string
  action: string
  actorId: string
  details: Record<string, JsonValue>
  createdAt: Date
}

export async function listOrderHistoryEvents(
  orderId: string,
  orgId: string,
): Promise<OrderHistoryEvent[]> {
  const rows = await db
    .select({
      id: activityEventsTable.id,
      action: activityEventsTable.action,
      actorId: activityEventsTable.actorId,
      details: activityEventsTable.details,
      createdAt: activityEventsTable.createdAt,
    })
    .from(activityEventsTable)
    .where(
      and(
        eq(activityEventsTable.targetType, 'order'),
        eq(activityEventsTable.targetId, orderId),
        eq(activityEventsTable.orgId, orgId),
      ),
    )
    .orderBy(desc(activityEventsTable.createdAt))

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    actorId: row.actorId,
    details: (row.details ?? {}) as Record<string, JsonValue>,
    createdAt: row.createdAt,
  }))
}

export async function approveOrder(
  id: string,
  orgId: string,
  approvedBy: string,
): Promise<void> {
  let customerId: string | null = null
  await db.transaction(async (tx) => {
    const orderRows = await tx
      .select({
        id: ordersTable.id,
        status: ordersTable.status,
        customerId: ordersTable.customerId,
      })
      .from(ordersTable)
      .where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, orgId)))
      .limit(1)

    if (orderRows.length === 0) throw new Error('Order not found')
    // Idempotent: already-approved orders succeed as no-op
    if (orderRows[0].status === 'approved') return
    if (orderRows[0].status !== 'pending')
      throw new Error('Only pending orders can be approved')

    customerId = orderRows[0].customerId
    const now = new Date()

    // Commit all specifications for this order (idempotent)
    const specRows = await tx
      .select({ id: specifications.id, status: specifications.status })
      .from(specifications)
      .where(
        and(eq(specifications.orgId, orgId), eq(specifications.orderId, id)),
      )

    for (const spec of specRows) {
      // Skip specs already committed — idempotent
      if (spec.status === 'committed') continue

      // Skip specs not yet priced — must be priced before commit
      if (spec.status !== 'priced' && spec.status !== 'pricing_review') continue

      // Check if snapshot already exists (idempotency)
      const [existingSnapshot] = await tx
        .select({ id: specificationSnapshots.id })
        .from(specificationSnapshots)
        .where(eq(specificationSnapshots.specificationId, spec.id))
        .limit(1)

      if (existingSnapshot) continue

      // Commit the specification
      await commitSpecification(spec.id, orgId, approvedBy)
    }

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

  await createFulfillmentForOrder({
    orgId,
    orderId: id,
    customerId,
  }).catch(() => {})
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

export type CancelOrderInput = {
  cancelledBy: string
  reason: string
}

/**
 * Cancel an order. Allowed from draft or pending status.
 * Rejected and cancelled orders cannot be cancelled again.
 */
export async function cancelOrder(
  id: string,
  orgId: string,
  input: CancelOrderInput,
): Promise<void> {
  const orderRows = await db
    .select({ status: ordersTable.status })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, orgId)))
    .limit(1)

  if (orderRows.length === 0) throw new Error('Order not found')
  const status = orderRows[0].status
  if (status !== 'draft' && status !== 'pending') {
    throw new Error(`Cannot cancel order with status "${status}"`)
  }

  const now = new Date()
  await db
    .update(ordersTable)
    .set({
      status: 'cancelled',
      rejectedAt: now,
      rejectedBy: input.cancelledBy,
      rejectReason: input.reason,
      updatedAt: now,
    })
    .where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, orgId)))

  await db.insert(activityEventsTable).values({
    id: crypto.randomUUID(),
    orgId,
    actorId: input.cancelledBy,
    targetType: 'order',
    targetId: id,
    action: 'order_cancelled',
    details: { reason: input.reason },
    createdAt: now,
  })
}

export async function advanceOrderStatus(
  id: string,
  orgId: string,
  actorId = 'system',
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
    await db.insert(activityEventsTable).values({
      id: crypto.randomUUID(),
      orgId,
      actorId,
      targetType: 'order',
      targetId: id,
      action: 'production_started',
      details: {},
      createdAt: now,
    })
  } else if (order.status === 'in_progress') {
    await transitionFulfillment({
      orderId: id,
      orgId: order.orgId,
      nextStatus: 'shipped',
    }).catch(() => {})
    await db
      .update(ordersTable)
      .set({ status: 'in_delivery', shippedAt: now, updatedAt: now })
      .where(eq(ordersTable.id, id))
  } else if (order.status === 'in_delivery') {
    await transitionFulfillment({
      orderId: id,
      orgId: order.orgId,
      nextStatus: 'completed',
    }).catch(() => {})
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
  await transitionFulfillment({
    orderId: id,
    orgId,
    nextStatus: 'shipped',
    courier: delivery.courier,
    trackingNumber: delivery.trackingNumber,
  }).catch(() => {})
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
  await transitionFulfillment({
    orderId: id,
    orgId,
    nextStatus: 'shipped',
    courier: delivery.courier,
    trackingNumber: delivery.trackingNumber,
  }).catch(() => {})
  await db.transaction(async (tx) => {
    await tx
      .update(ordersTable)
      .set({
        status: 'in_delivery',
        ...(delivery.courier !== undefined
          ? { courier: delivery.courier }
          : {}),
        trackingNumber: delivery.trackingNumber ?? null,
        shippedAt: now,
        updatedAt: now,
      })
      .where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, orgId)))

    await tx
      .update(productionTasksTable)
      .set({ archivedAt: now, updatedAt: now })
      .where(
        and(
          eq(productionTasksTable.orderId, id),
          eq(productionTasksTable.orgId, orgId),
          eq(productionTasksTable.status, 'completed'),
          isNull(productionTasksTable.archivedAt),
        ),
      )
  })
}
export type LateFeeCalculation = {
  daysLate: number
  lateFee: number
  lateFeePerDay: number
  deadline: Date | null
  completionDate: Date
}

export async function computeLateFee(
  orderId: string,
  orgId: string,
  completionDate: Date = new Date(),
): Promise<LateFeeCalculation> {
  const orderRows = await db
    .select({ id: ordersTable.id, deadline: ordersTable.deadline })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.orgId, orgId)))
    .limit(1)

  if (orderRows.length === 0) throw new Error('Order not found')
  const { deadline } = orderRows[0]

  const profileRows = await db
    .select({ lateFeePerDay: organizationProfilesTable.lateFeePerDay })
    .from(organizationProfilesTable)
    .where(eq(organizationProfilesTable.orgId, orgId))
    .limit(1)

  const lateFeePerDay = profileRows[0]?.lateFeePerDay ?? 0

  if (!deadline || lateFeePerDay <= 0) {
    return { daysLate: 0, lateFee: 0, lateFeePerDay, deadline, completionDate }
  }

  const deadlineDay = new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate(),
  )
  const completionDay = new Date(
    completionDate.getFullYear(),
    completionDate.getMonth(),
    completionDate.getDate(),
  )
  const daysLate = Math.max(
    0,
    Math.floor((completionDay.getTime() - deadlineDay.getTime()) / 86_400_000),
  )
  const lateFee = daysLate * lateFeePerDay

  return { daysLate, lateFee, lateFeePerDay, deadline, completionDate }
}

export function capLateFee(lateFee: number, maxDeduction: number): number {
  return Math.min(lateFee, maxDeduction)
}

export async function logLateFeeApplied(params: {
  orgId: string
  orderId: string
  actorId: string
  invoiceId: string
  daysLate: number
  lateFee: number
  lateFeePerDay: number
  deadline: Date
  completionDate: Date
}): Promise<void> {
  await db.insert(activityEventsTable).values({
    id: generateId(),
    orgId: params.orgId,
    targetType: 'order',
    targetId: params.orderId,
    action: 'late_fee_applied',
    details: {
      invoiceId: params.invoiceId,
      daysLate: params.daysLate,
      lateFee: params.lateFee,
      lateFeePerDay: params.lateFeePerDay,
      deadline: params.deadline.toISOString(),
      completionDate: params.completionDate.toISOString(),
    },
    actorId: params.actorId,
    createdAt: params.completionDate,
  })
}
