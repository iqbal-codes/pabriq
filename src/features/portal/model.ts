import { and, asc, eq, inArray, or } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  addresses,
  assets,
  customers,
  invoiceLineItems,
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
import { normalizeDesignName } from '#/features/orders/line-item-display'
import { addWorkingDays } from '#/lib/date-utils'

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
  designName: string | null
  notes: string | null
  assetIds: string[]
  assets: PortalAsset[]
  createdAt: Date
  taskId: string | null
  taskNumber: string | null
  currentStageName: string | null
  productionDays: number
  deadline: Date
}

export type PortalInvoice = {
  id: string
  invoiceNumber: string
  total: number
  percentage: number | null
  dueDate: string
  status: string
  paymentMethodName: string | null
  paymentMethodType: string | null
  paymentMethodBankName: string | null
  paymentMethodAccountNumber: string | null
  paymentMethodAccountHolder: string | null
  paymentMethodInstructions: string | null
  hasPaymentProof: boolean
  shippingFee: number | null
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
  productionFirstStageName?: string | null
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

  const [itemRows, productRows, allStages, taskRows] = await Promise.all([
    db
      .select({
        id: orderLineItems.id,
        productId: orderLineItems.productId,
        quantity: orderLineItems.quantity,
        unitPrice: orderLineItems.unitPrice,
        total: orderLineItems.total,
        designName: orderLineItems.designName,
        notes: orderLineItems.notes,
        assetId: orderLineItems.assetId,
        productionDays: orderLineItems.productionDays,
        deadline: orderLineItems.deadline,
        createdAt: orderLineItems.createdAt,
      })
      .from(orderLineItems)
      .where(
        and(
          eq(orderLineItems.orderId, order.id),
          eq(orderLineItems.orgId, order.orgId),
        ),
      ),
    db
      .select({
        id: products.id,
        name: products.name,
        productionDays: products.productionDays,
      })
      .from(products)
      .where(eq(products.orgId, order.orgId)),
    db
      .select({ id: productionStages.id, name: productionStages.name })
      .from(productionStages)
      .where(eq(productionStages.orgId, order.orgId)),
    db
      .select({
        id: productionTasks.id,
        taskNumber: productionTasks.taskNumber,
        lineItemId: productionTasks.lineItemId,
        stageId: productionTasks.stageId,
      })
      .from(productionTasks)
      .where(eq(productionTasks.orderId, order.id)),
  ])

  const productNameMap = new Map(productRows.map((p) => [p.id, p.name]))
  const productDaysMap = new Map(
    productRows.map((p) => [p.id, p.productionDays]),
  )
  const stageNameMap = new Map(allStages.map((s) => [s.id, s.name]))

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

  const taskByLineItem = new Map(taskRows.map((t) => [t.lineItemId, t]))

  const items: PortalLineItem[] = itemRows.map((item) => {
    const task = taskByLineItem.get(item.id)
    return {
      id: item.id,
      productName: productNameMap.get(item.productId) ?? 'Unknown',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      designName: item.designName ?? null,
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
      deadline: item.deadline,
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
      paymentMethodType: paymentMethodsTable.type,
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

  const shippingLineItems =
    invoiceRows.length > 0
      ? await db
          .select({
            invoiceId: invoiceLineItems.invoiceId,
            total: invoiceLineItems.total,
          })
          .from(invoiceLineItems)
          .where(
            and(
              eq(invoiceLineItems.lineType, 'shipping'),
              inArray(
                invoiceLineItems.invoiceId,
                invoiceRows.map((inv) => inv.id),
              ),
            ),
          )
      : []

  const shippingFeeByInvoice = new Map(
    shippingLineItems.map((row) => [row.invoiceId, row.total]),
  )

  const invoices: PortalInvoice[] = invoiceRows.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    total: inv.total,
    percentage: inv.percentage,
    dueDate: inv.dueDate,
    status: inv.status,
    paymentMethodName: inv.paymentMethodName,
    paymentMethodType: inv.paymentMethodType,
    paymentMethodBankName: inv.paymentMethodBankName,
    paymentMethodAccountNumber: inv.paymentMethodAccountNumber,
    paymentMethodAccountHolder: inv.paymentMethodAccountHolder,
    paymentMethodInstructions: inv.paymentMethodInstructions,
    hasPaymentProof: proofSet.has(inv.id),
    shippingFee: shippingFeeByInvoice.get(inv.id) ?? null,
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

  // Get first production stage name
  const firstProductionStageRows = await db
    .select({ name: productionStages.name })
    .from(productionStages)
    .where(
      and(
        eq(productionStages.orgId, order.orgId),
        eq(productionStages.board, 'production'),
        eq(productionStages.active, true),
      ),
    )
    .orderBy(asc(productionStages.orderIndex))
    .limit(1)

  const productionFirstStageName = firstProductionStageRows[0]?.name ?? null

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
      productionFirstStageName,
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
      // Recompute non-manual deadlines from submission timestamp
      const lineItems = await tx
        .select({
          id: orderLineItems.id,
          productionDays: orderLineItems.productionDays,
          manualDeadline: orderLineItems.manualDeadline,
        })
        .from(orderLineItems)
        .where(eq(orderLineItems.orderId, input.orderId))

      for (const li of lineItems) {
        if (!li.manualDeadline) {
          const newDeadline = addWorkingDays(now, li.productionDays)
          await tx
            .update(orderLineItems)
            .set({ deadline: newDeadline, updatedAt: now })
            .where(eq(orderLineItems.id, li.id))
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
  designName?: string
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
  if (input.designName !== undefined)
    updateData.designName = normalizeDesignName(input.designName)
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
  requirementResponses?: Array<{
    stageName: string
    responses: Array<{
      requirementName: string
      value?: string
      assetIds?: string[]
    }>
  }>
  metadata?: { fromBoard?: string | null; toBoard?: string | null }
}
type ActivityRow = {
  id: string
  taskId: string
  type: string
  fromStageId: string | null
  toStageId: string | null
  data: unknown
  createdAt: Date
}

type ActivityIndexes = {
  createdByTaskId: Map<string, ActivityRow>
  completedByTaskId: Map<string, ActivityRow>
}

type TimelineTaskRow = {
  id: string
  taskNumber: string | null
  lineItemId: string | null
  context: { productName?: string } | null
  stageId: string | null
  status: string
}

function extractActivityIndexes(activities: ActivityRow[]): ActivityIndexes {
  const createdByTaskId = new Map<string, ActivityRow>()
  const completedByTaskId = new Map<string, ActivityRow>()
  for (const activity of activities) {
    if (activity.type === 'created') {
      createdByTaskId.set(activity.taskId, activity)
    } else if (activity.type === 'completed') {
      completedByTaskId.set(activity.taskId, activity)
    }
  }
  return { createdByTaskId, completedByTaskId }
}

function buildTimelineEvents(params: {
  tasks: TimelineTaskRow[]
  stageNameMap: Map<string, string>
  stageReqMap: Map<string, Array<{ id: string; label: string; type: string }>>
  activityIndexes: ActivityIndexes
  activitiesByTaskId: Map<string, ActivityRow[]>
}): OrderTaskEvent[] {
  const {
    tasks,
    stageNameMap,
    stageReqMap,
    activityIndexes,
    activitiesByTaskId,
  } = params
  const { createdByTaskId, completedByTaskId } = activityIndexes

  const events: OrderTaskEvent[] = []
  for (const task of tasks) {
    const productName = task.context?.productName ?? ''
    const taskActivities = activitiesByTaskId.get(task.id) ?? []
    const createdActivity = createdByTaskId.get(task.id)
    if (createdActivity) {
      events.push({
        id: createdActivity.id,
        taskId: task.id,
        lineItemId: task.lineItemId,
        taskNumber: task.taskNumber ?? null,
        productName,
        type: 'created',
        fromStageName: null,
        toStageName: stageNameMap.get(task.stageId ?? '') ?? null,
        createdAt: createdActivity.createdAt,
      })
    }

    const transitions = taskActivities
      .filter((a) => a.type === 'stage_transition')
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )

    const lastTransition = transitions[transitions.length - 1]
    const lastTransitionEndsNull = lastTransition && !lastTransition.toStageId
    const completedActivity = completedByTaskId.get(task.id)

    for (const trans of transitions) {
      // Skip the last transition if task is completed and it ends with null
      // (it will be added as a 'completed' event below)
      if (
        task.status === 'completed' &&
        lastTransitionEndsNull &&
        trans.id === lastTransition.id
      ) {
        continue
      }

      const fromStageId = trans.fromStageId ?? ''
      // Look up requirements for the SOURCE stage (where work was done)
      const stageReqs = stageReqMap.get(fromStageId) ?? []
      const activityData = trans.data as Record<string, unknown> | null
      // First try activity data, then fall back to task.context for existing tasks
      let requirementResponses = activityData?.responses as Record<
        string,
        { value?: string; assetIds?: string[] }
      > | null
      if (
        !requirementResponses ||
        Object.keys(requirementResponses).length === 0
      ) {
        const taskContext = task.context as Record<string, unknown> | null
        requirementResponses = taskContext?.requirementResponses as Record<
          string,
          { value?: string; assetIds?: string[] }
        > | null
      }

      const formattedResponses = stageReqs.map((req) => {
        const response = requirementResponses?.[req.id]
        return {
          requirementName: req.label,
          value: response?.value as string | undefined,
          assetIds: response?.assetIds as string[] | undefined,
        }
      })

      const hasResponses = formattedResponses.some(
        (r) => r.value || (r.assetIds && r.assetIds.length > 0),
      )

      events.push({
        id: trans.id,
        taskId: task.id,
        lineItemId: task.lineItemId,
        taskNumber: task.taskNumber ?? null,
        productName,
        type: 'stage_transition',
        fromStageName: trans.fromStageId
          ? (stageNameMap.get(trans.fromStageId) ?? null)
          : null,
        toStageName: trans.toStageId
          ? (stageNameMap.get(trans.toStageId) ?? null)
          : null,
        createdAt: trans.createdAt,
        requirementResponses: hasResponses
          ? [
              {
                stageName:
                  stageNameMap.get(fromStageId) ??
                  trans.fromStageId ??
                  'Unknown Stage',
                responses: formattedResponses,
              },
            ]
          : undefined,
      })
    }

    // Handle board transitions (pre-production → production)
    const boardTransitions = taskActivities
      .filter((a) => a.type === 'board_transition')
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )

    for (const trans of boardTransitions) {
      const activityData = trans.data as Record<string, unknown> | null
      const fromBoard = activityData?.fromBoard as string | undefined
      const toBoard = activityData?.toBoard as string | undefined
      const fromStageId = trans.fromStageId ?? ''

      // Look up requirements for the SOURCE stage (where work was done)
      const stageReqs = stageReqMap.get(fromStageId) ?? []
      // First try activity data, then fall back to task.context for existing tasks
      let requirementResponses = activityData?.responses as Record<
        string,
        { value?: string; assetIds?: string[] }
      > | null
      if (
        !requirementResponses ||
        Object.keys(requirementResponses).length === 0
      ) {
        const taskContext = task.context as Record<string, unknown> | null
        requirementResponses = taskContext?.requirementResponses as Record<
          string,
          { value?: string; assetIds?: string[] }
        > | null
      }

      const formattedResponses = stageReqs.map((req) => {
        const response = requirementResponses?.[req.id]
        return {
          requirementName: req.label,
          value: response?.value as string | undefined,
          assetIds: response?.assetIds as string[] | undefined,
        }
      })

      const hasResponses = formattedResponses.some(
        (r) => r.value || (r.assetIds && r.assetIds.length > 0),
      )

      events.push({
        id: trans.id,
        taskId: task.id,
        lineItemId: task.lineItemId,
        taskNumber: task.taskNumber ?? null,
        productName,
        type: 'board_transition',
        fromStageName: trans.fromStageId
          ? (stageNameMap.get(trans.fromStageId) ?? null)
          : null,
        toStageName: trans.toStageId
          ? (stageNameMap.get(trans.toStageId) ?? null)
          : null,
        createdAt: trans.createdAt,
        requirementResponses: hasResponses
          ? [
              {
                stageName:
                  stageNameMap.get(fromStageId) ??
                  trans.fromStageId ??
                  'Unknown Stage',
                responses: formattedResponses,
              },
            ]
          : undefined,
        metadata: {
          fromBoard: fromBoard ?? null,
          toBoard: toBoard ?? null,
        },
      })
    }
    // Add completed event if task is completed
    // Add completed event if task is completed
    if (task.status === 'completed') {
      let requirementResponsesData:
        | Array<{
            stageName: string
            responses: Array<{
              requirementName: string
              value?: string
              assetIds?: string[]
            }>
          }>
        | undefined

      if (lastTransition) {
        const fromStageId = lastTransition.fromStageId ?? ''
        const stageReqs = stageReqMap.get(fromStageId) ?? []
        const activityData = lastTransition.data as Record<
          string,
          unknown
        > | null
        let requirementResponses = activityData?.responses as Record<
          string,
          { value?: string; assetIds?: string[] }
        > | null
        if (
          !requirementResponses ||
          Object.keys(requirementResponses).length === 0
        ) {
          const taskContext = task.context as Record<string, unknown> | null
          requirementResponses = taskContext?.requirementResponses as Record<
            string,
            { value?: string; assetIds?: string[] }
          > | null
        }

        const formattedResponses = stageReqs.map((req) => {
          const response = requirementResponses?.[req.id]
          return {
            requirementName: req.label,
            value: response?.value as string | undefined,
            assetIds: response?.assetIds as string[] | undefined,
          }
        })

        const hasResponses = formattedResponses.some(
          (r) => r.value || (r.assetIds && r.assetIds.length > 0),
        )

        if (hasResponses) {
          requirementResponsesData = [
            {
              stageName: lastTransition.fromStageId
                ? (stageNameMap.get(lastTransition.fromStageId) ??
                  'Unknown Stage')
                : 'Unknown Stage',
              responses: formattedResponses,
            },
          ]
        }
      }

      events.push({
        id: lastTransition
          ? `completed-${lastTransition.id}`
          : `completed-${task.id}`,
        taskId: task.id,
        lineItemId: task.lineItemId,
        taskNumber: task.taskNumber ?? null,
        productName,
        type: 'completed',
        fromStageName: lastTransition?.fromStageId
          ? (stageNameMap.get(lastTransition.fromStageId) ?? null)
          : null,
        toStageName: null,
        createdAt: lastTransition?.createdAt ?? new Date(),
        requirementResponses: requirementResponsesData,
      })
    } else if (completedActivity) {
      events.push({
        id: completedActivity.id,
        taskId: task.id,
        lineItemId: task.lineItemId,
        taskNumber: task.taskNumber ?? null,
        productName,
        type: 'completed',
        fromStageName: stageNameMap.get(task.stageId ?? '') ?? null,
        toStageName: null,
        createdAt: completedActivity.createdAt,
      })
    }
  }

  return events
}

export async function getOrderTasksTimeline(
  token: string,
): Promise<OrderTaskEvent[]> {
  const orderResult = await getPortalOrder(token)
  if (!orderResult.ok) throw new Error('Invalid token')

  // Get all production stages for this org
  const allStages = await db
    .select({
      id: productionStages.id,
      name: productionStages.name,
      requirements: productionStages.requirements,
    })
    .from(productionStages)
    .where(eq(productionStages.orgId, orderResult.order.orgId))
  const stageNameMap = new Map(allStages.map((s) => [s.id, s.name]))
  const stageReqMap = new Map<
    string,
    Array<{ id: string; label: string; type: string }>
  >()
  for (const stage of allStages) {
    const requirements = stage.requirements as unknown as Array<{
      id: string
      label: string
      type: string
    }> | null
    if (requirements && requirements.length > 0) {
      stageReqMap.set(stage.id, requirements)
    }
  }

  // Query production_tasks for this order
  const tasks = await db
    .select({
      id: productionTasks.id,
      taskNumber: productionTasks.taskNumber,
      lineItemId: productionTasks.lineItemId,
      context: productionTasks.context,
      stageId: productionTasks.stageId,
      status: productionTasks.status,
    })
    .from(productionTasks)
    .where(eq(productionTasks.orderId, orderResult.order.id))
  if (tasks.length === 0) return []
  const taskIds = tasks.map((t) => t.id)

  // Query task_activity for stage transitions
  const activities = await db
    .select({
      id: taskActivity.id,
      taskId: taskActivity.taskId,
      type: taskActivity.type,
      fromStageId: taskActivity.fromStageId,
      toStageId: taskActivity.toStageId,
      data: taskActivity.data,
      createdAt: taskActivity.createdAt,
    })
    .from(taskActivity)
    .where(
      and(
        inArray(taskActivity.taskId, taskIds),
        or(
          eq(taskActivity.type, 'stage_transition'),
          eq(taskActivity.type, 'created'),
          eq(taskActivity.type, 'completed'),
          eq(taskActivity.type, 'board_transition'),
        ),
      ),
    )
    .orderBy(asc(taskActivity.createdAt))

  const activityIndexes = extractActivityIndexes(activities)

  // Build index: taskId → all activities (for stage transitions)
  const activitiesByTaskId = new Map<string, typeof activities>()
  for (const activity of activities) {
    const list = activitiesByTaskId.get(activity.taskId) ?? []
    list.push(activity)
    activitiesByTaskId.set(activity.taskId, list)
  }

  const events = buildTimelineEvents({
    tasks,
    stageNameMap,
    stageReqMap,
    activityIndexes,
    activitiesByTaskId,
  })

  return events.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}
