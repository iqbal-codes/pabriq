import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import { db } from '#/db/index'
import {
  addresses as addressesTable,
  assets as assetsTable,
  customers as customersTable,
  invoices as invoicesTable,
  orderLineItemAddons as lineItemAddonsTable,
  orderLineItems as lineItemsTable,
  orders as ordersTable,
  organizationProfiles as organizationProfilesTable,
  paymentMethods as paymentMethodsTable,
  productAddons as productAddonsTable,
  productionStages as productionStagesTable,
  productionTasks as productionTasksTable,
  products as productsTable,
} from '#/db/schema'
import type { ShippingAddress } from '#/features/address/model'
import type { AssetMetadata } from '#/features/assets/server'
import { getCustomerAddress } from '#/features/address/model'
import { normalizeDesignName } from '#/features/orders/line-item-display'
import { type Breakpoint, calculateUnitPrice } from '#/features/pricing/engine'
import { spawnQueuedPreProductionTasksForOrder } from '#/features/production/task-spawn-helpers'
import { listBreakpoints } from '#/features/products/model'
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
}

export type UpdateDraftOrderInput = {
  customerId: string | null
  notes?: string
  lineItems: LineItemInput[]
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
  maxDeadline: Date | null
  deliveredAt: Date | null
  shippedAt: Date | null
}

export type ListOrdersParams = {
  orgId: string
  customerId?: string
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

async function computeLineItemPricing(input: {
  orgId: string
  productId: string
  quantity: number
  manualUnitPrice?: number
  isRepeatOrder?: boolean
  addonIds?: string[]
}): Promise<{
  unitPrice: number
  total: number
  selectedAddons: Array<{
    productAddonId: string
    name: string
    unitSurcharge: number
  }>
}> {
  const productRows = await db
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
  const breakpointRows = await listBreakpoints(input.productId)
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
    const addonRows = await db
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

  for (const li of input.lineItems) {
    const productRows = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        active: productsTable.active,
        productionDays: productsTable.productionDays,
        minQuantity: productsTable.minQuantity,
        maxQuantity: productsTable.maxQuantity,
        pricingMode: productsTable.pricingMode,
        basePrice: productsTable.basePrice,
        repeatOrderUnitPrice: productsTable.repeatOrderUnitPrice,
        repeatOrderMinQuantity: productsTable.repeatOrderMinQuantity,
        negotiateAboveQuantity: productsTable.negotiateAboveQuantity,
        maxProductionQuantity: productsTable.maxProductionQuantity,
      })
      .from(productsTable)
      .where(
        and(eq(productsTable.id, li.productId), eq(productsTable.orgId, orgId)),
      )
      .limit(1)
    if (productRows.length === 0) throw new Error('Product not found')
    const product = productRows[0]
    if (!product.active) throw new Error('Product is not active')

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

    const pricing = await computeLineItemPricing({
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
      productName: productRows[0].name,
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
      allAddonInserts.push({
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
    shippingAddress,
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

  // Validate all products and collect productionDays
  const productProductionDays = new Map<string, number>()
  const productNames = new Map<string, string>()
  // Validate all products and collect product data
  const productDataMap = new Map<
    string,
    {
      productionDays: number
      minQuantity: number
      repeatOrderMinQuantity: number | null
      maxProductionQuantity: number | null
    }
  >()
  for (const li of input.lineItems) {
    const productRows = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        active: productsTable.active,
        productionDays: productsTable.productionDays,
        minQuantity: productsTable.minQuantity,
        repeatOrderUnitPrice: productsTable.repeatOrderUnitPrice,
        repeatOrderMinQuantity: productsTable.repeatOrderMinQuantity,
        maxProductionQuantity: productsTable.maxProductionQuantity,
      })
      .from(productsTable)
      .where(
        and(eq(productsTable.id, li.productId), eq(productsTable.orgId, orgId)),
      )
      .limit(1)
    if (productRows.length === 0) throw new Error('Product not found')
    const product = productRows[0]
    if (!product.active) {
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
    productNames.set(li.productId, productRows[0].name)

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

    productDataMap.set(li.productId, {
      productionDays: product.productionDays,
      minQuantity: product.minQuantity,
      repeatOrderMinQuantity: product.repeatOrderMinQuantity,
      maxProductionQuantity: product.maxProductionQuantity,
    })
  }

  const now = new Date()

  // Delete existing line items (cascade deletes addon snapshots)
  await db.delete(lineItemsTable).where(eq(lineItemsTable.orderId, id))

  // Insert new line items
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

  for (const li of input.lineItems) {
    const pricing = await computeLineItemPricing({
      orgId,
      productId: li.productId,
      quantity: li.quantity,
      manualUnitPrice: li.unitPrice,
      isRepeatOrder: li.isRepeatOrder,
      addonIds: li.addonIds,
    })
    const productData = productDataMap.get(li.productId)
    const productionDays = productData?.productionDays ?? 1

    const itemId = li.id ?? generateId()
    let deadline: Date
    if (li.manualDeadline && li.deadline) {
      deadline = li.deadline
    } else {
      deadline = addWorkingDays(now, productionDays)
    }

    items.push({
      id: itemId,
      orgId,
      orderId: id,
      productId: li.productId,
      quantity: li.quantity,
      unitPrice: pricing.unitPrice,
      total: pricing.total,
      productName: productNames.get(li.productId) ?? 'Unknown',
      designName: normalizeDesignName(li.designName),
      notes: li.notes ?? null,
      productionDays,
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
      allAddonInserts.push({
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
    const dbItems = items.map(({ selectedAddons: _, ...rest }) => rest)
    await db.insert(lineItemsTable).values(dbItems)
  }

  if (allAddonInserts.length > 0) {
    await db.insert(lineItemAddonsTable).values(allAddonInserts)
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
