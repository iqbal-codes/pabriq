import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  addresses,
  assets,
  customers,
  invoices as invoicesTable,
  orderLineItems,
  orders,
  organization,
  organizationProfiles,
  paymentMethods as paymentMethodsTable,
  productionStages,
  productionTasks,
  products,
  taskActivity,
} from '#/db/schema'
import type { ShippingAddress } from '#/features/address/model'

export type PortalAsset = {
  id: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
}

export type PortalLineItem = {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
  name: string | null
  notes: string | null
  assetIds: string[]
  assets: PortalAsset[]
  createdAt: Date
  taskId: string | null
  taskNumber: string | null
  currentStageName: string | null
  productionDays: number
}

export type PortalInvoice = {
  id: string
  invoiceNumber: string
  total: number
  percentage: number | null
  dueDate: string
  status: string
  paymentMethodName: string | null
  paymentMethodBankName: string | null
  paymentMethodAccountNumber: string | null
  paymentMethodAccountHolder: string | null
  paymentMethodInstructions: string | null
  hasPaymentProof: boolean
}

export type PortalOrder = {
  id: string
  orgId: string
  orgName: string
  orgLogoAssetId: string | null
  orgPhone: string | null
  status: string
  orderNumber: string | null
  total: number
  shippingAddress: ShippingAddress | null
  customerId: string | null
  customerName: string | null
  customerPhone: string | null
  customerIsWni: boolean | null
  customerPhotoAssetId: string | null
  lineItems: PortalLineItem[]
  invoices: PortalInvoice[]
  createdAt: Date
  rejectReason?: string | null
}

export type ConfirmPortalOrderInput = {
  orderId: string
  guestName?: string
  guestPhone?: string
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
  const customer = order.customerId
    ? (
        await db
          .select({
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
            isWni: customers.isWni,
            photoAssetId: customers.photoAssetId,
          })
          .from(customers)
          .where(
            and(
              eq(customers.id, order.customerId),
              eq(customers.orgId, order.orgId),
            ),
          )
          .limit(1)
      )[0]
    : null

  const itemRows = await db
    .select()
    .from(orderLineItems)
    .where(eq(orderLineItems.orderId, order.id))

  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      productionDays: products.productionDays,
    })
    .from(products)
    .where(eq(products.orgId, order.orgId))

  const productNameMap = new Map(productRows.map((p) => [p.id, p.name]))
  const productDaysMap = new Map(
    productRows.map((p) => [p.id, p.productionDays]),
  )

  const lineItemIds = itemRows.map((item) => item.id)
  const assetRows =
    lineItemIds.length > 0
      ? await db
          .select({
            id: assets.id,
            ownerId: assets.ownerId,
            originalFilename: assets.originalFilename,
            mimeType: assets.mimeType,
            sizeBytes: assets.sizeBytes,
          })
          .from(assets)
          .where(
            and(
              eq(assets.ownerType, 'order'),
              inArray(assets.ownerId, lineItemIds),
              eq(assets.status, 'active'),
            ),
          )
      : []

  const assetIdsByLineItem = new Map<string, string[]>()
  const assetsByLineItem = new Map<string, PortalAsset[]>()
  for (const asset of assetRows) {
    if (!asset.ownerId) continue
    const idList = assetIdsByLineItem.get(asset.ownerId) ?? []
    idList.push(asset.id)
    assetIdsByLineItem.set(asset.ownerId, idList)

    const assetList = assetsByLineItem.get(asset.ownerId) ?? []
    assetList.push({
      id: asset.id,
      originalFilename: asset.originalFilename,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
    })
    assetsByLineItem.set(asset.ownerId, assetList)
  }

  const taskRows = await db
    .select({
      id: productionTasks.id,
      taskNumber: productionTasks.taskNumber,
      lineItemId: productionTasks.lineItemId,
      stageId: productionTasks.stageId,
    })
    .from(productionTasks)
    .where(eq(productionTasks.orderId, order.id))

  const allStages = await db
    .select({ id: productionStages.id, name: productionStages.name })
    .from(productionStages)
    .where(eq(productionStages.orgId, order.orgId))

  const stageNameMap = new Map(allStages.map((s) => [s.id, s.name]))
  const taskByLineItem = new Map(taskRows.map((t) => [t.lineItemId, t]))

  const items: PortalLineItem[] = itemRows.map((item) => {
    const task = taskByLineItem.get(item.id)
    return {
      id: item.id,
      productName: productNameMap.get(item.productId) ?? 'Unknown',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      name: item.name ?? null,
      notes: item.notes ?? null,
      assetIds: assetIdsByLineItem.get(item.id) ?? [],
      assets: assetsByLineItem.get(item.id) ?? [],
      createdAt: item.createdAt,
      taskId: task?.id ?? null,
      taskNumber: task?.taskNumber ?? null,
      currentStageName: task?.stageId
        ? (stageNameMap.get(task.stageId) ?? null)
        : null,
      productionDays: productDaysMap.get(item.productId) ?? 0,
    }
  })

  const invoiceRows = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      total: invoicesTable.total,
      percentage: invoicesTable.percentage,
      dueDate: invoicesTable.dueDate,
      status: invoicesTable.status,
      paymentMethodName: paymentMethodsTable.name,
      paymentMethodBankName: paymentMethodsTable.bankName,
      paymentMethodAccountNumber: paymentMethodsTable.accountNumber,
      paymentMethodAccountHolder: paymentMethodsTable.accountHolder,
      paymentMethodInstructions: paymentMethodsTable.instructions,
    })
    .from(invoicesTable)
    .leftJoin(
      paymentMethodsTable,
      eq(invoicesTable.paymentMethodId, paymentMethodsTable.id),
    )
    .where(
      and(
        eq(invoicesTable.orderId, order.id),
        eq(invoicesTable.orgId, order.orgId),
      ),
    )

  const paymentProofAssetIds =
    invoiceRows.length > 0
      ? await db
          .select({ ownerId: assets.ownerId })
          .from(assets)
          .where(
            and(
              eq(assets.ownerType, 'invoice'),
              eq(assets.usage, 'payment_proof'),
              eq(assets.status, 'active'),
              inArray(
                assets.ownerId,
                invoiceRows.map((inv) => inv.id),
              ),
            ),
          )
      : []

  const proofSet = new Set(paymentProofAssetIds.map((a) => a.ownerId))

  const invoices: PortalInvoice[] = invoiceRows.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    total: inv.total,
    percentage: inv.percentage,
    dueDate: inv.dueDate,
    status: inv.status,
    paymentMethodName: inv.paymentMethodName,
    paymentMethodBankName: inv.paymentMethodBankName,
    paymentMethodAccountNumber: inv.paymentMethodAccountNumber,
    paymentMethodAccountHolder: inv.paymentMethodAccountHolder,
    paymentMethodInstructions: inv.paymentMethodInstructions,
    hasPaymentProof: proofSet.has(inv.id),
  }))

  const orgRow = (
    await db
      .select({
        name: organization.name,
        logoAssetId: organizationProfiles.logoAssetId,
        phone: organizationProfiles.phone,
      })
      .from(organization)
      .leftJoin(
        organizationProfiles,
        eq(organizationProfiles.orgId, organization.id),
      )
      .where(eq(organization.id, order.orgId))
      .limit(1)
  )[0]

  return {
    ok: true,
    order: {
      id: order.id,
      orgId: order.orgId,
      orgName: orgRow?.name ?? '',
      orgLogoAssetId: orgRow?.logoAssetId ?? null,
      orgPhone: orgRow?.phone ?? null,
      status: order.status,
      orderNumber: order.orderNumber,
      total: order.total,
      shippingAddress: order.shippingAddress as ShippingAddress | null,
      customerId: order.customerId,
      customerName: customer?.name ?? null,
      customerPhone: customer?.phone ?? null,
      customerIsWni: customer?.isWni ?? null,
      customerPhotoAssetId: customer?.photoAssetId ?? null,
      lineItems: items,
      invoices,
      createdAt: order.createdAt,
      rejectReason: order.rejectReason ?? null,
    },
  }
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '')
}

async function findCustomerByPhone(
  database: Pick<typeof db, 'select'>,
  orgId: string,
  phone: string,
) {
  const rows = await database
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
    })
    .from(customers)
    .where(eq(customers.orgId, orgId))

  const targetPhone = normalizePhone(phone)
  return (
    rows.find((row) => normalizePhone(row.phone ?? '') === targetPhone) ?? null
  )
}

export async function confirmPortalOrder(
  input: ConfirmPortalOrderInput,
): Promise<PortalConfirmResult> {
  try {
    const now = new Date()

    await db.transaction(async (tx) => {
      const orderRows = await tx
        .select({
          id: orders.id,
          orgId: orders.orgId,
          status: orders.status,
          customerId: orders.customerId,
        })
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1)

      if (orderRows.length === 0) {
        throw new Error('notFound')
      }

      const order = orderRows[0]
      if (order.status !== 'draft') {
        throw new Error('notDraft')
      }

      let customerId = order.customerId

      if (!customerId) {
        const guestName = input.guestName?.trim() ?? ''
        const guestPhone = input.guestPhone?.trim() ?? ''

        if (!guestName || !guestPhone) {
          throw new Error('guestInfoRequired')
        }

        const matchedCustomer = await findCustomerByPhone(
          tx,
          order.orgId,
          guestPhone,
        )

        if (matchedCustomer) {
          customerId = matchedCustomer.id
          if (!matchedCustomer.name.trim()) {
            await tx
              .update(customers)
              .set({ name: guestName, updatedAt: now })
              .where(
                and(
                  eq(customers.id, matchedCustomer.id),
                  eq(customers.orgId, order.orgId),
                ),
              )
          }
        } else {
          customerId = crypto.randomUUID()
          await tx.insert(customers).values({
            id: customerId,
            orgId: order.orgId,
            name: guestName,
            phone: guestPhone,
            active: true,
            createdAt: now,
            updatedAt: now,
          })
        }
      }

      await tx
        .update(orders)
        .set({
          customerId,
          status: 'pending',
          updatedAt: now,
        })
        .where(eq(orders.id, input.orderId))
    })

    return { ok: true }
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
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

export async function removePortalAsset(
  token: string,
  assetId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const orderRows = await db
    .select({ id: orders.id, orgId: orders.orgId })
    .from(orders)
    .where(eq(orders.orderToken, token))
    .limit(1)

  if (orderRows.length === 0) {
    return { ok: false, error: 'notFound' }
  }

  const lineItemRows = await db
    .select({ id: orderLineItems.id })
    .from(orderLineItems)
    .where(eq(orderLineItems.orderId, orderRows[0].id))

  const lineItemIds = lineItemRows.map((item) => item.id)
  if (lineItemIds.length === 0) {
    return { ok: false, error: 'notFound' }
  }

  const updated = await db
    .update(assets)
    .set({
      status: 'deleted',
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(assets.id, assetId),
        eq(assets.orgId, orderRows[0].orgId),
        eq(assets.ownerType, 'order'),
        eq(assets.status, 'active'),
        inArray(assets.ownerId, lineItemIds),
      ),
    )
    .returning({ id: assets.id })

  if (updated.length === 0) {
    return { ok: false, error: 'notFound' }
  }

  return { ok: true }
}

export async function savePortalAddress(
  orderId: string,
  addressData: ShippingAddress,
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

  const isWni = customerId
    ? ((
        await db
          .select({ isWni: customers.isWni })
          .from(customers)
          .where(and(eq(customers.id, customerId), eq(customers.orgId, orgId)))
          .limit(1)
      )[0]?.isWni ?? true)
    : true

  const addressId = crypto.randomUUID()
  await db.insert(addresses).values({
    id: addressId,
    orgId,
    areaId: addressData.areaId,
    areaName: addressData.areaName,
    streetAddress: addressData.streetAddress,
    isDefault: false,
  })

  if (customerId) {
    await db
      .update(customers)
      .set({ addressId, isWni, updatedAt: new Date() })
      .where(and(eq(customers.id, customerId), eq(customers.orgId, orgId)))
  }

  await db
    .update(orders)
    .set({ shippingAddress: addressData, updatedAt: new Date() })
    .where(eq(orders.id, orderId))

  return { ok: true, addressId }
}

export async function getPortalCustomerAddress(
  customerId: string,
  orgId: string,
): Promise<ShippingAddress | null> {
  const customerRows = await db
    .select({ addressId: customers.addressId })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.orgId, orgId)))
    .limit(1)

  if (!customerRows[0]?.addressId) {
    return null
  }

  const addressRows = await db
    .select({
      areaId: addresses.areaId,
      areaName: addresses.areaName,
      streetAddress: addresses.streetAddress,
    })
    .from(addresses)
    .where(eq(addresses.id, customerRows[0].addressId))
    .limit(1)

  if (!addressRows[0]) {
    return null
  }

  const addr = addressRows[0]
  if (!addr.areaId || !addr.areaName || !addr.streetAddress) {
    return null
  }

  return {
    areaId: addr.areaId,
    areaName: addr.areaName,
    streetAddress: addr.streetAddress,
  }
}

export type OrderTaskEvent = {
  id: string
  taskId: string
  lineItemId: string | null
  taskNumber: string | null
  productName: string
  type: string
  fromStageName: string | null
  toStageName: string | null
  createdAt: Date
}

export async function getOrderTasksTimeline(
  token: string,
): Promise<OrderTaskEvent[]> {
  const orderResult = await getPortalOrder(token)
  if (!orderResult.ok) throw new Error('Invalid token')

  const allStages = await db
    .select({ id: productionStages.id, name: productionStages.name })
    .from(productionStages)
    .where(eq(productionStages.orgId, orderResult.order.orgId))

  const stageNameMap = new Map(allStages.map((s) => [s.id, s.name]))

  const tasks = await db
    .select({
      id: productionTasks.id,
      taskNumber: productionTasks.taskNumber,
      lineItemId: productionTasks.lineItemId,
      context: productionTasks.context,
    })
    .from(productionTasks)
    .where(eq(productionTasks.orderId, orderResult.order.id))

  if (tasks.length === 0) return []

  const activities = await db
    .select({
      id: taskActivity.id,
      taskId: taskActivity.taskId,
      type: taskActivity.type,
      fromStageId: taskActivity.fromStageId,
      toStageId: taskActivity.toStageId,
      createdAt: taskActivity.createdAt,
    })
    .from(taskActivity)
    .where(
      and(
        inArray(
          taskActivity.taskId,
          tasks.map((t) => t.id),
        ),
        eq(taskActivity.type, 'stage_transition'),
      ),
    )
    .orderBy(desc(taskActivity.createdAt))

  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  return activities.map((act) => {
    const task = taskMap.get(act.taskId)
    return {
      id: act.id,
      taskId: act.taskId,
      lineItemId: task?.lineItemId ?? null,
      taskNumber: task?.taskNumber ?? null,
      productName: task?.context?.productName ?? '',
      type: act.type,
      fromStageName: act.fromStageId
        ? (stageNameMap.get(act.fromStageId) ?? null)
        : null,
      toStageName: act.toStageId
        ? (stageNameMap.get(act.toStageId) ?? null)
        : null,
      createdAt: act.createdAt,
    }
  })
}
