import { and, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  type FulfillmentStatus,
  type FulfillmentType,
  fulfillments as fulfillmentsTable,
  orders as ordersTable,
} from '#/db/schema'
import {
  getCustomerAddress,
  type ShippingAddress,
} from '#/features/address/model'
import { getConfigurationElement } from '#/features/business-templates/model'
import { getCourierAdapter } from '#/features/fulfillment/courier-adapter'

export type PackageDetails = {
  weightGrams?: number
  dimensionsCm?: { length: number; width: number; height: number }
  packageCount?: number
  contents?: string
}

export type FulfillmentRecord = {
  id: string
  orgId: string
  orderId: string
  type: FulfillmentType
  status: FulfillmentStatus
  shippingAddress: ShippingAddress | null
  courier: string | null
  service: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  packageDetails: PackageDetails | null
  snapshot: Record<
    string,
    | string
    | number
    | boolean
    | null
    | Record<string, string | number | boolean | null>
  > | null
  shippedAt: Date | null
  deliveredAt: Date | null
  pickedUpAt: Date | null
  pickupNotes: string | null
  recipientName: string | null
  createdAt: Date
  updatedAt: Date
}

export type FulfillmentInitParams = {
  orgId: string
  orderId: string
  customerId?: string | null
  explicitType?: FulfillmentType
  explicitAddress?: ShippingAddress | null
  explicitCourier?: string | null
  explicitService?: string | null
  packageDetails?: PackageDetails | null
}

export async function resolveFulfillmentDefaults(
  orgId: string,
  params: {
    customerId?: string | null
    explicitType?: FulfillmentType
    explicitAddress?: ShippingAddress | null
    explicitCourier?: string | null
    explicitService?: string | null
  },
): Promise<{
  type: FulfillmentType
  shippingAddress: ShippingAddress | null
  courier: string | null
  service: string | null
  snapshot: Record<string, unknown>
}> {
  // Read org fulfillment defaults if available
  const [defaultElement, regionalElement] = await Promise.all([
    getConfigurationElement(orgId, 'fulfillment_default', 'defaults'),
    getConfigurationElement(orgId, 'regional_setting', 'defaults'),
  ])

  const defaultData = (defaultElement?.data ?? {}) as Record<string, unknown>
  const regionalData = (regionalElement?.data ?? {}) as Record<string, unknown>

  // Explicit values take precedence over regional/fulfillment defaults
  const type: FulfillmentType =
    params.explicitType ??
    (defaultData.pickupEnabled && !defaultData.shippingEnabled
      ? 'pickup'
      : 'shipping')

  let shippingAddress: ShippingAddress | null = params.explicitAddress ?? null

  if (!shippingAddress && params.customerId) {
    const custAddr = await getCustomerAddress(params.customerId, orgId)
    if (custAddr && (custAddr.areaId || custAddr.streetAddress)) {
      shippingAddress = {
        areaId: custAddr.areaId ?? '',
        areaName: custAddr.areaName ?? '',
        streetAddress: custAddr.streetAddress ?? '',
      }
    }
  }

  const courier =
    params.explicitCourier ??
    (type === 'pickup'
      ? 'pickup'
      : ((defaultData.defaultCourier as string) ?? 'jne'))

  const service =
    params.explicitService ??
    (type === 'pickup'
      ? 'pickup'
      : ((defaultData.defaultService as string) ?? 'reg'))

  const snapshot = {
    resolvedAt: new Date().toISOString(),
    type,
    courier,
    service,
    shippingAddress,
    regionalDefaults: {
      timezone: (regionalData.timezone as string) ?? 'Asia/Jakarta',
      currency: (regionalData.currency as string) ?? 'IDR',
    },
    fulfillmentDefaults: defaultData,
  }

  return {
    type,
    shippingAddress,
    courier,
    service,
    snapshot,
  }
}

export async function createFulfillmentForOrder(
  params: FulfillmentInitParams,
): Promise<FulfillmentRecord> {
  const { orgId, orderId } = params

  const resolved = await resolveFulfillmentDefaults(orgId, {
    customerId: params.customerId,
    explicitType: params.explicitType,
    explicitAddress: params.explicitAddress,
    explicitCourier: params.explicitCourier,
    explicitService: params.explicitService,
  })

  const existing = await getFulfillmentForOrder(orderId, orgId)
  if (existing) {
    return existing
  }

  const id = crypto.randomUUID()
  const now = new Date()

  const [row] = await db
    .insert(fulfillmentsTable)
    .values({
      id,
      orgId,
      orderId,
      type: resolved.type,
      status: 'unfulfilled',
      shippingAddress: resolved.shippingAddress,
      courier: resolved.courier,
      service: resolved.service,
      packageDetails: params.packageDetails ?? null,
      snapshot: resolved.snapshot,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  // Sync address & courier to orders table for backwards compatibility
  await db
    .update(ordersTable)
    .set({
      shippingAddress: resolved.shippingAddress,
      courier: resolved.courier,
      updatedAt: now,
    })
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.orgId, orgId)))

  return mapFulfillmentRow(row)
}

export async function getFulfillmentForOrder(
  orderId: string,
  orgId: string,
): Promise<FulfillmentRecord | null> {
  const [row] = await db
    .select()
    .from(fulfillmentsTable)
    .where(
      and(
        eq(fulfillmentsTable.orderId, orderId),
        eq(fulfillmentsTable.orgId, orgId),
      ),
    )
    .limit(1)

  if (!row) return null
  return mapFulfillmentRow(row)
}

export type TransitionFulfillmentParams = {
  orderId: string
  orgId: string
  nextStatus: FulfillmentStatus
  courier?: string | null
  service?: string | null
  trackingNumber?: string | null
  packageDetails?: PackageDetails | null
  pickupNotes?: string | null
  recipientName?: string | null
}

export async function transitionFulfillment(
  params: TransitionFulfillmentParams,
): Promise<FulfillmentRecord> {
  const { orderId, orgId, nextStatus } = params
  let fulfillment = await getFulfillmentForOrder(orderId, orgId)

  if (!fulfillment) {
    fulfillment = await createFulfillmentForOrder({ orgId, orderId })
  }

  const now = new Date()
  const updates: Partial<typeof fulfillmentsTable.$inferInsert> = {
    status: nextStatus,
    updatedAt: now,
  }

  if (params.courier !== undefined) updates.courier = params.courier
  if (params.service !== undefined) updates.service = params.service
  if (params.trackingNumber !== undefined)
    updates.trackingNumber = params.trackingNumber
  if (params.packageDetails !== undefined)
    updates.packageDetails = params.packageDetails
  if (params.pickupNotes !== undefined) updates.pickupNotes = params.pickupNotes
  if (params.recipientName !== undefined)
    updates.recipientName = params.recipientName

  if (
    (nextStatus === 'shipped' || nextStatus === 'out_for_delivery') &&
    !fulfillment.shippedAt
  ) {
    updates.shippedAt = now
  }

  if (
    (nextStatus === 'delivered' || nextStatus === 'completed') &&
    !fulfillment.deliveredAt
  ) {
    updates.deliveredAt = now
  }

  if (
    (nextStatus === 'picked_up' ||
      (nextStatus === 'completed' && fulfillment.type === 'pickup')) &&
    !fulfillment.pickedUpAt
  ) {
    updates.pickedUpAt = now
  }

  const [updatedRow] = await db
    .update(fulfillmentsTable)
    .set(updates)
    .where(
      and(
        eq(fulfillmentsTable.id, fulfillment.id),
        eq(fulfillmentsTable.orgId, orgId),
      ),
    )
    .returning()

  // Sync orders table backward-compatibility fields
  const orderUpdates: Record<string, unknown> = { updatedAt: now }
  if (updates.courier !== undefined) orderUpdates.courier = updates.courier
  if (updates.trackingNumber !== undefined)
    orderUpdates.trackingNumber = updates.trackingNumber
  if (updates.shippedAt !== undefined)
    orderUpdates.shippedAt = updates.shippedAt
  if (updates.deliveredAt !== undefined)
    orderUpdates.deliveredAt = updates.deliveredAt

  if (nextStatus === 'shipped' || nextStatus === 'out_for_delivery') {
    orderUpdates.status = 'in_delivery'
  } else if (
    nextStatus === 'delivered' ||
    nextStatus === 'picked_up' ||
    nextStatus === 'completed'
  ) {
    orderUpdates.status = 'completed'
  }

  await db
    .update(ordersTable)
    .set(orderUpdates)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.orgId, orgId)))

  return mapFulfillmentRow(updatedRow)
}

function mapFulfillmentRow(
  row: typeof fulfillmentsTable.$inferSelect,
): FulfillmentRecord {
  const courier = row.courier ?? null
  const trackingNumber = row.trackingNumber ?? null
  const adapter = getCourierAdapter()
  const trackingUrl =
    courier && trackingNumber
      ? adapter.getTrackingUrl(courier, trackingNumber)
      : null

  return {
    id: row.id,
    orgId: row.orgId,
    orderId: row.orderId,
    type: row.type as FulfillmentType,
    status: row.status as FulfillmentStatus,
    shippingAddress: (row.shippingAddress ?? null) as ShippingAddress | null,
    courier,
    service: row.service ?? null,
    trackingNumber,
    trackingUrl,
    packageDetails: (row.packageDetails ?? null) as PackageDetails | null,
    snapshot: (row.snapshot ?? null) as FulfillmentRecord['snapshot'],
    shippedAt: row.shippedAt ?? null,
    deliveredAt: row.deliveredAt ?? null,
    pickedUpAt: row.pickedUpAt ?? null,
    pickupNotes: row.pickupNotes ?? null,
    recipientName: row.recipientName ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
