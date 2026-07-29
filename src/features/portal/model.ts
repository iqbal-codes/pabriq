import { and, asc, eq, inArray, or } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  activityEvents,
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
  payments as paymentsTable,
  productionStages,
  productionTasks,
  specifications,
  taskActivity,
} from '#/db/schema'
import type { ShippingAddress } from '#/features/address/model'
import { normalizeDesignName } from '#/features/orders/line-item-display'
import {
  calculatePrice,
  listProductFields,
  type ProductField,
  savePricingResult,
  submitSpecification,
} from '#/features/product-configuration/model'
import { addWorkingDays } from '#/lib/date-utils'

/** Serializable JSON value for TanStack Start server function compatibility. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

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
  paidAt: string | null
  paymentMethodName: string | null
  paymentProvider: 'bank_transfer' | 'midtrans'
  paymentMethodBankName: string | null
  paymentMethodAccountNumber: string | null
  paymentMethodAccountHolder: string | null
  paymentMethodInstructions: string | null
  hasPaymentProof: boolean
  midtransOrderId: string | null
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
  preProductionFirstStageName?: string | null
  courier: string | null
  trackingNumber: string | null
  approvedAt: Date | null
  shippedAt: Date | null
  deliveredAt: Date | null
  /** Specifications for this order's products. */
  specifications: PortalSpecification[]
}

/** A specification as viewed from the portal side, with field definitions. */
export type PortalSpecification = {
  id: string
  productId: string
  productName: string
  status: string
  quantity: number
  fieldValues: Record<string, JsonValue>
  resolvedDisplay: Record<
    string,
    { label: string; unit?: string; displayValue: string }
  >
  fields: PortalSpecificationField[]
  validationErrors: Array<{
    fieldKey?: string
    message: string
    code: string
  }>
  pricingStatus: string | null
  pricingReviewReason: string | null
  rejectionReason: string | null
  lineItemId: string | null
  createdAt: Date
  updatedAt: Date
}

/** A single product field as seen from the portal, with current value. */
export type PortalSpecificationField = {
  fieldKey: string
  label: string
  fieldType: string
  unit: string | null
  required: boolean
  options: Array<{
    value: string
    label: string
    surcharge?: number
    materialSurcharge?: number
  }>
  matrix: {
    sizes: string[]
    colors: Array<{ name: string; hex?: string }>
  } | null
  sortOrder: number
}

/** Map product fields to portal-specification field representations. */
function mapFieldsToPortalFields(
  fields: ProductField[],
): PortalSpecificationField[] {
  return fields.map((f) => ({
    fieldKey: f.fieldKey,
    label: f.label,
    fieldType: f.fieldType,
    unit: f.unit,
    required: f.required,
    options: f.options as PortalSpecificationField['options'],
    matrix: f.matrix,
    sortOrder: f.sortOrder,
  }))
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

  // Check token expiry
  if (order.validUntil && new Date() > order.validUntil) {
    return { ok: false, error: 'tokenExpired' }
  }
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

  const [itemRows, allStages, taskRows] = await Promise.all([
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
        productName: orderLineItems.productName,
      })
      .from(orderLineItems)
      .where(
        and(
          eq(orderLineItems.orderId, order.id),
          eq(orderLineItems.orgId, order.orgId),
        ),
      ),
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
      productName: item.productName,
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
      productionDays: item.productionDays,
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
      paidAt: invoicesTable.paidAt,
      paymentMethodName: paymentMethodsTable.name,
      paymentProvider: invoicesTable.paymentProvider,
      paymentMethodBankName: paymentMethodsTable.bankName,
      paymentMethodAccountNumber: paymentMethodsTable.accountNumber,
      paymentMethodAccountHolder: paymentMethodsTable.accountHolder,
      paymentMethodInstructions: paymentMethodsTable.instructions,
      midtransOrderId: invoicesTable.midtransOrderId,
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
    paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
    paymentMethodName: inv.paymentMethodName,
    paymentProvider: inv.paymentProvider as 'bank_transfer' | 'midtrans',
    paymentMethodBankName: inv.paymentMethodBankName,
    paymentMethodAccountNumber: inv.paymentMethodAccountNumber,
    paymentMethodAccountHolder: inv.paymentMethodAccountHolder,
    paymentMethodInstructions: inv.paymentMethodInstructions,
    midtransOrderId: inv.midtransOrderId,
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

  // Get first pre-production stage name
  const firstPreProductionStageRows = await db
    .select({ name: productionStages.name })
    .from(productionStages)
    .where(
      and(
        eq(productionStages.orgId, order.orgId),
        eq(productionStages.board, 'pre_production'),
        eq(productionStages.active, true),
      ),
    )
    .orderBy(asc(productionStages.orderIndex))
    .limit(1)

  const preProductionFirstStageName =
    firstPreProductionStageRows[0]?.name ?? null

  // Load specifications for this order with field definitions
  const specRows = await db
    .select()
    .from(specifications)
    .where(
      and(
        eq(specifications.orgId, order.orgId),
        eq(specifications.orderId, order.id),
      ),
    )
    .orderBy(specifications.createdAt)

  const portalSpecs: PortalSpecification[] = await Promise.all(
    specRows.map(async (spec): Promise<PortalSpecification> => {
      const fields = await listProductFields(spec.orgId, spec.productId)
      // Find associated line item (match by productId in the order's line items)
      const matchingItem = itemRows.find(
        (li) => li.productId === spec.productId,
      )

      const portalFields = mapFieldsToPortalFields(fields)

      return {
        id: spec.id,
        productId: spec.productId,
        productName: matchingItem?.productName ?? '',
        status: spec.status,
        quantity: spec.quantity,
        fieldValues: (spec.fieldValues ?? {}) as Record<string, JsonValue>,
        resolvedDisplay:
          (spec.resolvedDisplay as PortalSpecification['resolvedDisplay']) ??
          {},
        fields: portalFields,
        validationErrors:
          (spec.validationErrors as PortalSpecification['validationErrors']) ??
          [],
        pricingStatus: spec.pricingStatus,
        pricingReviewReason: spec.pricingReviewReason,
        rejectionReason: spec.rejectionReason,
        lineItemId: matchingItem?.id ?? null,
        createdAt: spec.createdAt,
        updatedAt: spec.updatedAt,
      }
    }),
  )

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
      specifications: portalSpecs,
      invoices,
      createdAt: order.createdAt,
      rejectReason: order.rejectReason ?? null,
      productionFirstStageName,
      preProductionFirstStageName,
      courier: order.courier ?? null,
      trackingNumber: order.trackingNumber ?? null,
      approvedAt: order.approvedAt ?? null,
      shippedAt: order.shippedAt ?? null,
      deliveredAt: order.deliveredAt ?? null,
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
    const hourInJakarta = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: 'numeric',
        hour12: false,
      }).format(now),
    )
    const isLate = hourInJakarta >= 15
    const queueDate = new Date(now)
    if (isLate) {
      queueDate.setDate(queueDate.getDate() + 1)
    }

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

      // Validate that all specifications for this order are submitted or priced
      const specRows = await tx
        .select({ id: specifications.id, status: specifications.status })
        .from(specifications)
        .where(
          and(
            eq(specifications.orgId, order.orgId),
            eq(specifications.orderId, order.id),
          ),
        )

      const unsubmitted = specRows.filter(
        (s) =>
          s.status !== 'submitted' &&
          s.status !== 'priced' &&
          s.status !== 'pricing_review' &&
          s.status !== 'committed',
      )
      if (unsubmitted.length > 0) {
        throw new Error('specificationsNotSubmitted')
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
          if (matchedCustomer.name.trim() !== guestName) {
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
          deadline: orderLineItems.deadline,
        })
        .from(orderLineItems)
        .where(eq(orderLineItems.orderId, input.orderId))

      for (const li of lineItems) {
        let newDeadline: Date
        if (!li.manualDeadline) {
          newDeadline = addWorkingDays(now, li.productionDays)
          if (isLate) {
            newDeadline.setDate(newDeadline.getDate() + 1)
          }
        } else {
          newDeadline = new Date(li.deadline)
          if (isLate) {
            newDeadline.setDate(newDeadline.getDate() + 1)
          }
        }
        await tx
          .update(orderLineItems)
          .set({ deadline: newDeadline, updatedAt: now })
          .where(eq(orderLineItems.id, li.id))
      }

      await tx
        .update(orders)
        .set({
          customerId,
          status: 'pending',
          createdAt: queueDate,
          updatedAt: now,
        })
        .where(eq(orders.id, input.orderId))
      await tx.insert(activityEvents).values({
        id: crypto.randomUUID(),
        orgId: order.orgId,
        actorId: order.orgId,
        targetType: 'order',
        targetId: input.orderId,
        action: 'draft_confirmed',
        details: {},
        createdAt: now,
      })
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

/** Result type for portal specification submission. */
export type SubmitPortalSpecResult =
  | {
      ok: true
      spec: PortalSpecification
    }
  | { ok: false; error: string }

/**
 * Submit specification field values from the portal side.
 * Validates the portal token is scoped to the same order as the spec,
 * then delegates to the product-configuration submitSpecification.
 */
export async function submitPortalSpecification(
  token: string,
  specificationId: string,
  fieldValues: Record<string, JsonValue>,
): Promise<SubmitPortalSpecResult> {
  // Validate token
  const orderRows = await db
    .select({
      id: orders.id,
      orgId: orders.orgId,
      validUntil: orders.validUntil,
    })
    .from(orders)
    .where(eq(orders.orderToken, token))
    .limit(1)

  if (orderRows.length === 0) {
    return { ok: false, error: 'invalidToken' }
  }

  const order = orderRows[0]

  // Check token expiry
  if (order.validUntil && new Date() > order.validUntil) {
    return { ok: false, error: 'tokenExpired' }
  }

  // Verify the spec belongs to this order
  const [specRow] = await db
    .select({ id: specifications.id, orderId: specifications.orderId })
    .from(specifications)
    .where(eq(specifications.id, specificationId))
    .limit(1)

  if (!specRow || specRow.orderId !== order.id) {
    return { ok: false, error: 'specNotFound' }
  }

  // Delegate to product-configuration
  const updatedSpec = await submitSpecification(
    specificationId,
    order.orgId,
    fieldValues,
  )

  // Auto-calculate pricing if spec is now submitted
  let pricedSpec = updatedSpec
  if (updatedSpec.status === 'submitted') {
    try {
      const pricingResult = await calculatePrice(
        order.orgId,
        updatedSpec.productId,
        updatedSpec.quantity,
        updatedSpec.fieldValues as Record<string, unknown>,
      )
      const price = await savePricingResult(
        updatedSpec.id,
        order.orgId,
        pricingResult,
      )
      pricedSpec = {
        ...updatedSpec,
        status: pricingResult.inReview ? 'pricing_review' : 'priced',
        pricingStatus: pricingResult.inReview ? 'review' : 'calculated',
        pricingReviewReason: pricingResult.reviewReason ?? null,
      }
      void price
    } catch {
      // Pricing not configured or failed — spec stays submitted for admin review
    }
  }

  // Reload with portal fields for the response
  const fields = await listProductFields(order.orgId, updatedSpec.productId)
  const portalFields = mapFieldsToPortalFields(fields)

  return {
    ok: true,
    spec: {
      id: pricedSpec.id,
      productId: pricedSpec.productId,
      productName: '',
      status: pricedSpec.status,
      quantity: pricedSpec.quantity,
      fieldValues: (pricedSpec.fieldValues ?? {}) as Record<string, JsonValue>,
      resolvedDisplay:
        (pricedSpec.resolvedDisplay as PortalSpecification['resolvedDisplay']) ??
        {},
      fields: portalFields,
      validationErrors:
        (pricedSpec.validationErrors as PortalSpecification['validationErrors']) ??
        [],
      pricingStatus: pricedSpec.pricingStatus,
      pricingReviewReason: pricedSpec.pricingReviewReason,
      rejectionReason: pricedSpec.rejectionReason,
      lineItemId: null,
      createdAt: pricedSpec.createdAt,
      updatedAt: pricedSpec.updatedAt,
    },
  }
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
  metadata?: {
    fromBoard?: string | null
    toBoard?: string | null
    readyForProduction?: boolean
  }
}
export type ActivityRow = {
  id: string
  taskId: string
  type: string
  fromStageId: string | null
  toStageId: string | null
  data: unknown
  createdAt: Date
}

export type ActivityIndexes = {
  createdByTaskId: Map<string, ActivityRow>
  completedByTaskId: Map<string, ActivityRow>
}

export type TimelineTaskRow = {
  id: string
  taskNumber: string | null
  lineItemId: string | null
  context: { productName?: string } | null
  stageId: string | null
  status: string
}

// fallow-ignore-next-line unused-export — imported by production/server.ts via dynamic import
export function extractActivityIndexes(
  activities: ActivityRow[],
): ActivityIndexes {
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

function formatRequirementResponses(
  stageReqs: Array<{ id: string; label: string; type: string }>,
  activityData: Record<string, unknown> | null,
  taskContext: Record<string, unknown> | null,
  stageName: string,
): OrderTaskEvent['requirementResponses'] {
  let requirementResponses = activityData?.responses as Record<
    string,
    { value?: string; assetIds?: string[] }
  > | null
  if (!requirementResponses || Object.keys(requirementResponses).length === 0) {
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
    return [
      {
        stageName,
        responses: formattedResponses,
      },
    ]
  }
  return undefined
}

function buildStageTransitionEvent(
  trans: ActivityRow,
  task: TimelineTaskRow,
  stageNameMap: Map<string, string>,
  stageReqMap: Map<string, Array<{ id: string; label: string; type: string }>>,
  _activityIndexes: ActivityIndexes,
): OrderTaskEvent {
  const productName = task.context?.productName ?? ''
  const fromStageId = trans.fromStageId ?? ''
  const stageReqs = stageReqMap.get(fromStageId) ?? []
  const activityData = trans.data as Record<string, unknown> | null
  const taskContext = task.context as Record<string, unknown> | null
  const stageName =
    stageNameMap.get(fromStageId) ?? trans.fromStageId ?? 'Unknown Stage'
  const requirementResponses = formatRequirementResponses(
    stageReqs,
    activityData,
    taskContext,
    stageName,
  )
  const readyForProduction = activityData?.readyForProduction === true

  return {
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
    requirementResponses,
    metadata: readyForProduction ? { readyForProduction: true } : undefined,
  }
}

function buildBoardTransitionEvent(
  trans: ActivityRow,
  task: TimelineTaskRow,
  stageNameMap: Map<string, string>,
  stageReqMap: Map<string, Array<{ id: string; label: string; type: string }>>,
  _activityIndexes: ActivityIndexes,
): OrderTaskEvent {
  const productName = task.context?.productName ?? ''
  const activityData = trans.data as Record<string, unknown> | null
  const fromBoard = activityData?.fromBoard as string | undefined
  const toBoard = activityData?.toBoard as string | undefined
  const fromStageId = trans.fromStageId ?? ''
  const stageReqs = stageReqMap.get(fromStageId) ?? []
  const taskContext = task.context as Record<string, unknown> | null
  const stageName =
    stageNameMap.get(fromStageId) ?? trans.fromStageId ?? 'Unknown Stage'
  const requirementResponses = formatRequirementResponses(
    stageReqs,
    activityData,
    taskContext,
    stageName,
  )

  return {
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
    requirementResponses,
    metadata: {
      fromBoard: fromBoard ?? null,
      toBoard: toBoard ?? null,
    },
  }
}

function buildCompletedEvent(
  task: TimelineTaskRow,
  completedActivity: ActivityRow | undefined,
  lastTransition: ActivityRow | undefined,
  stageNameMap: Map<string, string>,
  stageReqMap: Map<string, Array<{ id: string; label: string; type: string }>>,
  _activityIndexes: ActivityIndexes,
): OrderTaskEvent {
  const productName = task.context?.productName ?? ''

  let requirementResponsesData: OrderTaskEvent['requirementResponses']

  if (lastTransition) {
    const fromStageId = lastTransition.fromStageId ?? ''
    const stageReqs = stageReqMap.get(fromStageId) ?? []
    const activityData = lastTransition.data as Record<string, unknown> | null
    const taskContext = task.context as Record<string, unknown> | null
    const stageName = lastTransition.fromStageId
      ? (stageNameMap.get(lastTransition.fromStageId) ?? 'Unknown Stage')
      : 'Unknown Stage'
    requirementResponsesData = formatRequirementResponses(
      stageReqs,
      activityData,
      taskContext,
      stageName,
    )
  }

  const fromStageName = lastTransition
    ? completedActivity?.fromStageId
      ? (stageNameMap.get(completedActivity.fromStageId) ?? null)
      : lastTransition.fromStageId
        ? (stageNameMap.get(lastTransition.fromStageId) ?? null)
        : (stageNameMap.get(task.stageId ?? '') ?? null)
    : (stageNameMap.get(task.stageId ?? '') ?? null)

  return {
    id: completedActivity
      ? completedActivity.id
      : lastTransition
        ? `completed-${lastTransition.id}`
        : `completed-${task.id}`,
    taskId: task.id,
    lineItemId: task.lineItemId,
    taskNumber: task.taskNumber ?? null,
    productName,
    type: 'completed',
    fromStageName,
    toStageName: null,
    createdAt:
      completedActivity?.createdAt ?? lastTransition?.createdAt ?? new Date(),
    requirementResponses: requirementResponsesData,
  }
}

// fallow-ignore-next-line unused-export — imported by production/server.ts via dynamic import
export function buildTimelineEvents(params: {
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
    const taskActivities = activitiesByTaskId.get(task.id) ?? []
    const createdActivity = createdByTaskId.get(task.id)
    if (createdActivity) {
      events.push({
        id: createdActivity.id,
        taskId: task.id,
        lineItemId: task.lineItemId,
        taskNumber: task.taskNumber ?? null,
        productName: task.context?.productName ?? '',
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
      if (
        task.status === 'completed' &&
        lastTransitionEndsNull &&
        trans.id === lastTransition.id
      ) {
        continue
      }
      events.push(
        buildStageTransitionEvent(
          trans,
          task,
          stageNameMap,
          stageReqMap,
          activityIndexes,
        ),
      )
    }

    const boardTransitions = taskActivities
      .filter((a) => a.type === 'board_transition')
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )

    for (const trans of boardTransitions) {
      events.push(
        buildBoardTransitionEvent(
          trans,
          task,
          stageNameMap,
          stageReqMap,
          activityIndexes,
        ),
      )
    }

    if (task.status === 'completed' || completedActivity) {
      events.push(
        buildCompletedEvent(
          task,
          completedActivity,
          task.status === 'completed' ? lastTransition : undefined,
          stageNameMap,
          stageReqMap,
          activityIndexes,
        ),
      )
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
export type OrderTimelineMilestoneType =
  | 'draft_created'
  | 'draft_confirmed'
  | 'order_approved'
  | 'dp_invoice_created'
  | 'dp_payment_confirmed'
  | 'production_started'
  | 'final_invoice_created'
  | 'final_payment_confirmed'
  | 'production_finished'
  | 'shipment_confirmed'
  | 'order_completed'
  | 'quantity_adjusted'

export type OrderTimelineStatus = 'completed' | 'current' | 'upcoming'

export type OrderTimelineEvent = {
  id: string
  type: OrderTimelineMilestoneType
  status: OrderTimelineStatus
  completedAt: Date | null
  invoiceId?: string
  invoiceNumber?: string
  amount?: number
  details?: {
    productName?: string
    designName?: string
    oldQuantity?: number
    newQuantity?: number
    impact?: number
    [key: string]: string | number | boolean | null | undefined
  }
}

function classifyInvoiceKind(
  invoices: Array<{ id: string; percentage: number | null }>,
  targetId: string,
): 'down_payment' | 'final_payment' {
  if (invoices.length > 1) {
    const lastInvoice = invoices.at(-1)
    return lastInvoice?.id === targetId ? 'final_payment' : 'down_payment'
  }
  const only = invoices[0]
  if (only && only.percentage !== null && only.percentage < 100) {
    return 'down_payment'
  }
  return 'final_payment'
}

const ORDER_APPROVED_STATUSES = new Set([
  'approved',
  'in_progress',
  'production',
  'in_delivery',
  'completed',
])

const ORDER_PRODUCING_STATUSES = new Set([
  'in_progress',
  'production',
  'in_delivery',
  'completed',
])

export async function getOrderTimelineByOrderId(
  orderId: string,
  orgId: string,
): Promise<OrderTimelineEvent[]> {
  const [orderRow, rawInvoices] = await Promise.all([
    db
      .select({
        id: orders.id,
        status: orders.status,
        createdAt: orders.createdAt,
        approvedAt: orders.approvedAt,
        shippedAt: orders.shippedAt,
        deliveredAt: orders.deliveredAt,
        courier: orders.courier,
        trackingNumber: orders.trackingNumber,
      })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.orgId, orgId)))
      .limit(1)
      .then((r) => r[0]),
    db
      .select({
        id: invoicesTable.id,
        invoiceNumber: invoicesTable.invoiceNumber,
        percentage: invoicesTable.percentage,
        total: invoicesTable.total,
        status: invoicesTable.status,
        paidAt: invoicesTable.paidAt,
        createdAt: invoicesTable.createdAt,
      })
      .from(invoicesTable)
      .where(
        and(eq(invoicesTable.orderId, orderId), eq(invoicesTable.orgId, orgId)),
      )
      .orderBy(asc(invoicesTable.createdAt)),
  ])

  const invoiceIds = rawInvoices.map((i) => i.id)
  const rawPayments =
    invoiceIds.length > 0
      ? await db
          .select({
            invoiceId: paymentsTable.invoiceId,
            amount: paymentsTable.amount,
            status: paymentsTable.status,
            confirmedAt: paymentsTable.confirmedAt,
            createdAt: paymentsTable.createdAt,
          })
          .from(paymentsTable)
          .where(
            and(
              eq(paymentsTable.orgId, orgId),
              inArray(paymentsTable.invoiceId, invoiceIds),
            ),
          )
      : []
  const orderEvents = await db
    .select({
      id: activityEvents.id,
      action: activityEvents.action,
      createdAt: activityEvents.createdAt,
      details: activityEvents.details,
    })
    .from(activityEvents)
    .where(
      and(
        eq(activityEvents.targetType, 'order'),
        eq(activityEvents.targetId, orderId),
        inArray(activityEvents.action, [
          'draft_confirmed',
          'production_started',
          'quantity_adjusted',
        ]),
      ),
    )

  const eventDates = new Map(
    orderEvents.map((e) => [e.action, e.createdAt] as const),
  )

  if (!orderRow) throw new Error('Order not found')

  const nonVoidInvoices = rawInvoices.filter((inv) => inv.status !== 'void')

  const confirmedPayments = rawPayments
    .filter(
      (p): p is typeof p & { confirmedAt: Date } =>
        p.status === 'confirmed' && p.confirmedAt !== null,
    )
    .sort(
      (a, b) =>
        new Date(a.confirmedAt).getTime() - new Date(b.confirmedAt).getTime(),
    )

  const invoiceIdSet = new Set(nonVoidInvoices.map((i) => i.id))
  const paymentsByInvoice = new Map<string, typeof confirmedPayments>()
  for (const p of confirmedPayments) {
    if (!invoiceIdSet.has(p.invoiceId)) continue
    const list = paymentsByInvoice.get(p.invoiceId) ?? []
    list.push(p)
    paymentsByInvoice.set(p.invoiceId, list)
  }

  const classifiedInvoices = nonVoidInvoices.map((inv) => ({
    ...inv,
    kind: classifyInvoiceKind(nonVoidInvoices, inv.id),
  }))
  const dpInvoice =
    classifiedInvoices.find((inv) => inv.kind === 'down_payment') ?? null
  const finalInvoice =
    classifiedInvoices.find((inv) => inv.kind === 'final_payment') ?? null

  const dpPayments = dpInvoice
    ? (paymentsByInvoice.get(dpInvoice.id) ?? [])
    : []
  const finalPayments = finalInvoice
    ? (paymentsByInvoice.get(finalInvoice.id) ?? [])
    : []
  const dpPaymentSum = dpPayments.reduce((s, p) => s + p.amount, 0)
  const finalPaymentSum = finalPayments.reduce((s, p) => s + p.amount, 0)
  const dpEarliestConfirmed = dpPayments[0]?.confirmedAt ?? null
  const finalEarliestConfirmed = finalPayments[0]?.confirmedAt ?? null

  const status = orderRow.status
  const draftCreated = true
  const draftConfirmed = status !== 'draft'
  const orderApproved =
    orderRow.approvedAt !== null || ORDER_APPROVED_STATUSES.has(status)
  const dpInvoiceCreated = dpInvoice !== null
  const dpPaymentConfirmed =
    dpInvoiceCreated &&
    (dpPayments.length > 0 ||
      (dpInvoice?.paidAt !== null && dpInvoice?.paidAt !== undefined))
  const productionStarted = ORDER_PRODUCING_STATUSES.has(status)
  const finalInvoiceCreated = finalInvoice !== null
  const finalPaymentConfirmed =
    finalInvoiceCreated &&
    (finalPayments.length > 0 ||
      (finalInvoice?.paidAt !== null && finalInvoice?.paidAt !== undefined))
  const productionFinished =
    status === 'in_delivery' ||
    status === 'completed' ||
    orderRow.shippedAt !== null
  const shipmentConfirmed =
    orderRow.courier !== null || orderRow.trackingNumber !== null
  const orderCompleted = status === 'completed' || orderRow.deliveredAt !== null

  const completedFlags = [
    draftCreated,
    draftConfirmed,
    orderApproved,
    dpInvoiceCreated,
    dpPaymentConfirmed,
    productionStarted,
    finalInvoiceCreated,
    finalPaymentConfirmed,
    productionFinished,
    shipmentConfirmed,
    orderCompleted,
  ] as const

  const milestoneTypes: OrderTimelineMilestoneType[] = [
    'draft_created',
    'draft_confirmed',
    'order_approved',
    'dp_invoice_created',
    'dp_payment_confirmed',
    'production_started',
    'final_invoice_created',
    'final_payment_confirmed',
    'production_finished',
    'shipment_confirmed',
    'order_completed',
  ]

  const dpInvoiceCompletedAt = dpInvoice?.createdAt ?? null
  const dpPaymentCompletedAt =
    dpEarliestConfirmed ??
    (dpInvoice?.paidAt !== null && dpInvoice?.paidAt !== undefined
      ? dpInvoice.paidAt
      : null)
  const dpPaymentAmount =
    dpPayments.length > 0
      ? dpPaymentSum
      : dpInvoice?.paidAt !== null && dpInvoice?.paidAt !== undefined
        ? dpInvoice.total
        : undefined
  const finalInvoiceCompletedAt = finalInvoice?.createdAt ?? null
  const finalPaymentCompletedAt =
    finalEarliestConfirmed ??
    (finalInvoice?.paidAt !== null && finalInvoice?.paidAt !== undefined
      ? finalInvoice.paidAt
      : null)
  const finalPaymentAmount =
    finalPayments.length > 0
      ? finalPaymentSum
      : finalInvoice?.paidAt !== null && finalInvoice?.paidAt !== undefined
        ? finalInvoice.total
        : undefined

  const completedDates: Array<Date | null> = [
    orderRow.createdAt,
    eventDates.get('draft_confirmed') ?? null,
    orderRow.approvedAt,
    dpInvoiceCompletedAt,
    dpPaymentCompletedAt,
    eventDates.get('production_started') ?? null,
    finalInvoiceCompletedAt,
    finalPaymentCompletedAt,
    orderRow.shippedAt,
    orderRow.shippedAt,
    orderRow.deliveredAt,
  ]

  let firstIncompleteIdx = completedFlags.findIndex((c) => !c)
  if (firstIncompleteIdx === -1) firstIncompleteIdx = milestoneTypes.length

  const events: OrderTimelineEvent[] = milestoneTypes.map((type, i) => {
    const isCompleted = completedFlags[i] ?? false
    const timelineStatus: OrderTimelineStatus = isCompleted
      ? 'completed'
      : i === firstIncompleteIdx
        ? 'current'
        : 'upcoming'

    const event: OrderTimelineEvent = {
      id: `${type}-${orderId}`,
      type,
      status: timelineStatus,
      completedAt: isCompleted ? completedDates[i] : null,
    }

    if (type === 'dp_invoice_created' && dpInvoice) {
      event.invoiceId = dpInvoice.id
      event.invoiceNumber = dpInvoice.invoiceNumber
      event.amount = dpInvoice.total
    } else if (type === 'dp_payment_confirmed' && dpPaymentAmount != null) {
      event.amount = dpPaymentAmount
    } else if (type === 'final_invoice_created' && finalInvoice) {
      event.invoiceId = finalInvoice.id
      event.invoiceNumber = finalInvoice.invoiceNumber
      event.amount = finalInvoice.total
    } else if (
      type === 'final_payment_confirmed' &&
      finalPaymentAmount != null
    ) {
      event.amount = finalPaymentAmount
    }

    return event
  })

  const quantityAdjustedEvents: OrderTimelineEvent[] = orderEvents
    .filter((e) => e.action === 'quantity_adjusted')
    .map((e) => ({
      id: e.id,
      type: 'quantity_adjusted' as const,
      status: 'completed' as const,
      completedAt: e.createdAt,
      details: (e.details ?? undefined) as OrderTimelineEvent['details'],
    }))
    .sort(
      (a, b) =>
        (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0),
    )

  return events.concat(quantityAdjustedEvents)
}

export async function getOrderTimeline(
  token: string,
): Promise<OrderTimelineEvent[]> {
  const orderResult = await getPortalOrder(token)
  if (!orderResult.ok) throw new Error('Invalid token')
  const order = orderResult.order
  return getOrderTimelineByOrderId(order.id, order.orgId)
}
