import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  assets,
  assetVariants,
  assistantActions,
  businessTemplates,
  type CompatibilityMigrationReport,
  compatibilityMigrations,
  configurationElements,
  customers,
  customerTokens,
  invoiceLineItems,
  invoices,
  member,
  midtransTransactions,
  orderLineItemAddons,
  orderLineItems,
  orders,
  organization,
  organizationConfigurations,
  payments,
  pricingBreakpoints,
  productAddons,
  productionStages,
  productionTasks,
  products,
  specificationPrices,
  specificationSnapshots,
  specifications,
  taskActivity,
} from '#/db/schema'

const COMPATIBILITY_TEMPLATE_SLUG = 'rubber-accessories'
const MIGRATION_ACTOR = 'compatibility-migration'

type CompatibilityDb =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0]

export type CompatibilityMigration = typeof compatibilityMigrations.$inferSelect
export type { CompatibilityMigrationReport }

function migrationIdForLineItem(lineItemId: string): string {
  return `compatibility-spec:${lineItemId}`
}
function snapshotIdForLineItem(lineItemId: string): string {
  return `compatibility-snapshot:${lineItemId}`
}
function priceIdForLineItem(lineItemId: string): string {
  return `compatibility-price:${lineItemId}`
}
function countStatuses(
  rows: Array<{ status: string }>,
): Record<string, number> {
  return rows.reduce<Record<string, number>>((result, row) => {
    result[row.status] = (result[row.status] ?? 0) + 1
    return result
  }, {})
}
function toStringValue(value: string | null): string | null {
  return value?.trim() || null
}

async function buildPreservationReport(
  client: CompatibilityDb,
  orgId: string,
): Promise<CompatibilityMigrationReport> {
  const [
    orgRows,
    memberRows,
    customerRows,
    productRows,
    orderRows,
    lineItemRows,
    invoiceRows,
    invoiceLineItemRows,
    paymentRows,
    midtransRows,
    taskRows,
    activityRows,
    assetRows,
    assetVariantRows,
    tokenRows,
    assistantRows,
    addonRows,
  ] = await Promise.all([
    client
      .select({
        id: organization.id,
        slug: organization.slug,
        name: organization.name,
      })
      .from(organization)
      .where(eq(organization.id, orgId))
      .limit(1),
    client
      .select({ id: member.id })
      .from(member)
      .where(eq(member.organizationId, orgId)),
    client
      .select({
        id: customers.id,
        deletedAt: customers.deletedAt,
        notes: customers.notes,
      })
      .from(customers)
      .where(eq(customers.orgId, orgId)),
    client
      .select({
        id: products.id,
        deletedAt: products.deletedAt,
        productionNotes: products.productionNotes,
      })
      .from(products)
      .where(eq(products.orgId, orgId)),
    client
      .select({
        id: orders.id,
        notes: orders.notes,
        status: orders.status,
        total: orders.total,
        orderNumber: orders.orderNumber,
        orderToken: orders.orderToken,
        validUntil: orders.validUntil,
        deadline: orders.deadline,
      })
      .from(orders)
      .where(eq(orders.orgId, orgId)),
    client
      .select({
        id: orderLineItems.id,
        productId: orderLineItems.productId,
        productName: orderLineItems.productName,
        quantity: orderLineItems.quantity,
        unitPrice: orderLineItems.unitPrice,
        total: orderLineItems.total,
        designName: orderLineItems.designName,
        notes: orderLineItems.notes,
        deadline: orderLineItems.deadline,
        createdAt: orderLineItems.createdAt,
      })
      .from(orderLineItems)
      .where(eq(orderLineItems.orgId, orgId)),
    client
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        total: invoices.total,
        paidAt: invoices.paidAt,
      })
      .from(invoices)
      .where(eq(invoices.orgId, orgId)),
    client
      .select({
        id: invoiceLineItems.id,
        invoiceId: invoiceLineItems.invoiceId,
      })
      .from(invoiceLineItems)
      .innerJoin(invoices, eq(invoiceLineItems.invoiceId, invoices.id))
      .where(eq(invoices.orgId, orgId)),
    client
      .select({
        id: payments.id,
        invoiceId: payments.invoiceId,
        amount: payments.amount,
        status: payments.status,
      })
      .from(payments)
      .where(eq(payments.orgId, orgId)),
    client
      .select({
        id: midtransTransactions.id,
        invoiceId: midtransTransactions.invoiceId,
      })
      .from(midtransTransactions)
      .where(eq(midtransTransactions.orgId, orgId)),
    client
      .select({ id: productionTasks.id })
      .from(productionTasks)
      .where(eq(productionTasks.orgId, orgId)),
    client
      .select({ id: taskActivity.id })
      .from(taskActivity)
      .where(eq(taskActivity.orgId, orgId)),
    client
      .select({
        id: assets.id,
        ownerType: assets.ownerType,
        ownerId: assets.ownerId,
        storageKey: assetVariants.storageKey,
      })
      .from(assets)
      .leftJoin(
        assetVariants,
        and(
          eq(assetVariants.assetId, assets.id),
          eq(assetVariants.variantKey, 'original' as const),
        ),
      )
      .where(eq(assets.orgId, orgId)),
    client
      .select({
        id: assetVariants.id,
        assetId: assetVariants.assetId,
        variantKey: assetVariants.variantKey,
        storageKey: assetVariants.storageKey,
      })
      .from(assetVariants)
      .innerJoin(assets, eq(assetVariants.assetId, assets.id))
      .where(eq(assets.orgId, orgId)),
    client
      .select({ id: customerTokens.id, expiresAt: customerTokens.expiresAt })
      .from(customerTokens)
      .where(eq(customerTokens.orgId, orgId)),
    client
      .select({ id: assistantActions.id })
      .from(assistantActions)
      .where(eq(assistantActions.orgId, orgId)),
    client
      .select({
        id: orderLineItemAddons.id,
        lineItemId: orderLineItemAddons.lineItemId,
        productAddonId: orderLineItemAddons.productAddonId,
        name: orderLineItemAddons.name,
        unitSurcharge: orderLineItemAddons.unitSurcharge,
      })
      .from(orderLineItemAddons)
      .where(eq(orderLineItemAddons.orgId, orgId)),
  ])

  const org = orgRows[0]
  if (!org) throw new Error('Organization not found')

  const orderIds = orderRows.map((row) => row.id)

  // Query specs first, then prices and snapshots in parallel (specs are needed for the joins)
  const specRows =
    orderIds.length === 0
      ? []
      : await client
          .select({ id: specifications.id, orderId: specifications.orderId })
          .from(specifications)
          .where(
            and(
              eq(specifications.orgId, orgId),
              inArray(specifications.orderId, orderIds),
            ),
          )

  const specIds = specRows.map((r) => r.id)
  const [priceRows, snapshotRows] =
    specIds.length === 0
      ? [[], []]
      : await Promise.all([
          client
            .select({
              id: specificationPrices.id,
              specificationId: specificationPrices.specificationId,
            })
            .from(specificationPrices)
            .where(
              and(
                eq(specificationPrices.orgId, orgId),
                inArray(specificationPrices.specificationId, specIds),
              ),
            ),
          client
            .select({
              id: specificationSnapshots.id,
              specificationId: specificationSnapshots.specificationId,
            })
            .from(specificationSnapshots)
            .where(
              and(
                eq(specificationSnapshots.orgId, orgId),
                inArray(specificationSnapshots.specificationId, specIds),
              ),
            ),
        ])

  const now = new Date()
  const reachableOrderIds = new Set<string>()
  for (const order of orderRows) {
    if (order.orderToken === null) continue
    if (order.validUntil && order.validUntil <= now) continue
    reachableOrderIds.add(order.id)
  }

  const paidByInvoice = new Map<string, number>()
  for (const payment of paymentRows) {
    if (payment.status !== 'confirmed') continue
    paidByInvoice.set(
      payment.invoiceId,
      (paidByInvoice.get(payment.invoiceId) ?? 0) + payment.amount,
    )
  }
  const invoiceBalances = invoiceRows.map((invoice) => {
    const paid = paidByInvoice.get(invoice.id) ?? 0
    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      paid,
      balance: invoice.total - paid,
    }
  })
  const assetOwnerMap = assetRows.map((row) => ({
    id: row.id,
    ownerType: row.ownerType,
    ownerId: row.ownerId,
    storageKey: row.storageKey,
  }))
  const assetStorageKeys = assetOwnerMap
    .map((row) => row.storageKey)
    .filter((key): key is string => Boolean(key))
  const generatedDocumentSourceRecords = [
    ...invoiceRows.map((invoice) => ({
      id: `invoice:${invoice.id}`,
      kind: 'invoice' as const,
      sourceId: invoice.id,
      storageKey: null,
    })),
    ...orderRows
      .filter((order) => order.orderNumber !== null)
      .map((order) => ({
        id: `quotation:${order.id}`,
        kind: 'quotation' as const,
        sourceId: order.id,
        storageKey: null,
      })),
  ]
  const addonsByLineItem = new Map<string, typeof addonRows>()
  for (const addon of addonRows) {
    const list = addonsByLineItem.get(addon.lineItemId) ?? []
    list.push(addon)
    addonsByLineItem.set(addon.lineItemId, list)
  }

  // Line-item review items
  const lineItemReviewItems = lineItemRows.flatMap((row) => {
    const items: CompatibilityMigrationReport['reviewItems'] = []
    if (toStringValue(row.designName)) {
      items.push({
        kind: 'legacy_design_name',
        sourceId: row.id,
        label: 'Legacy design name requires semantic review',
        value: row.designName,
      })
    }
    if (toStringValue(row.notes)) {
      items.push({
        kind: 'legacy_notes',
        sourceId: row.id,
        label: 'Legacy line-item notes require semantic review',
        value: row.notes,
      })
    }
    return items
  })
  // Order-level review items
  const orderReviewItems = orderRows
    .filter((row) => toStringValue(row.notes))
    .map((row) => ({
      kind: 'legacy_order_notes',
      sourceId: row.id,
      label: 'Legacy order notes require semantic review',
      value: row.notes,
    }))
  // Customer-level review items
  const customerReviewItems = customerRows
    .filter((row) => toStringValue(row.notes))
    .map((row) => ({
      kind: 'legacy_customer_notes',
      sourceId: row.id,
      label: 'Legacy customer notes require semantic review',
      value: row.notes,
    }))
  // Product-level review items
  const productReviewItems = productRows
    .filter((row) => toStringValue(row.productionNotes))
    .map((row) => ({
      kind: 'legacy_product_notes',
      sourceId: row.id,
      label: 'Legacy product production notes require semantic review',
      value: row.productionNotes,
    }))
  const reviewItems = [
    ...lineItemReviewItems,
    ...orderReviewItems,
    ...customerReviewItems,
    ...productReviewItems,
  ]

  return {
    organization: org,
    counts: {
      memberships: memberRows.length,
      customers: customerRows.length,
      products: productRows.length,
      orders: orderRows.length,
      orderLineItems: lineItemRows.length,
      invoices: invoiceRows.length,
      invoiceLineItems: invoiceLineItemRows.length,
      payments: paymentRows.length,
      midtransTransactions: midtransRows.length,
      productionWork: taskRows.length,
      taskActivity: activityRows.length,
      assets: assetRows.length,
      assetVariants: assetVariantRows.length,
      customerTokens: tokenRows.length,
      assistantActions: assistantRows.length,
      orderLineItemAddons: addonRows.length,
      specifications: specRows.length,
      specificationPrices: priceRows.length,
      specificationSnapshots: snapshotRows.length,
      documents: generatedDocumentSourceRecords.length,
    },
    totals: {
      orderTotal: orderRows.reduce((sum, row) => sum + row.total, 0),
      invoiceTotal: invoiceRows.reduce((sum, row) => sum + row.total, 0),
      confirmedPaymentTotal: paymentRows
        .filter((row) => row.status === 'confirmed')
        .reduce((sum, row) => sum + row.amount, 0),
      invoiceBalances: invoiceBalances.reduce(
        (sum, row) => sum + row.balance,
        0,
      ),
    },
    statuses: {
      orders: countStatuses(orderRows),
      invoices: countStatuses(invoiceRows),
      payments: countStatuses(paymentRows),
    },
    deadlines: {
      ordersWithDeadline: orderRows.filter((row) => row.deadline !== null)
        .length,
      lineItemsWithDeadline: lineItemRows.filter((row) => row.deadline !== null)
        .length,
    },
    ownership: {
      assets: assetRows.length,
      assetVariants: assetVariantRows.length,
      tokens: tokenRows.length,
      assistantActions: assistantRows.length,
      documents: generatedDocumentSourceRecords.length,
      assetStorageKeys,
      assetOwnerMap,
      invoiceBalances,
      softDeletedCustomers: customerRows.filter((r) => r.deletedAt !== null)
        .length,
      softDeletedProducts: productRows.filter((r) => r.deletedAt !== null)
        .length,
      generatedDocumentSourceRecords,
    },
    reachability: {
      ordersWithPortalToken: orderRows.filter((row) => row.orderToken !== null)
        .length,
      reachablePortalTokens: reachableOrderIds.size,
    },
    reviewItems,
    preservedIds: {
      organizations: [org.id],
      memberships: memberRows.map((row) => row.id),
      customers: customerRows.map((row) => row.id),
      products: productRows.map((row) => row.id),
      orders: orderRows.map((row) => row.id),
      orderLineItems: lineItemRows.map((row) => row.id),
      invoices: invoiceRows.map((row) => row.id),
      invoiceLineItems: invoiceLineItemRows.map((row) => row.id),
      payments: paymentRows.map((row) => row.id),
      midtransTransactions: midtransRows.map((row) => row.id),
      productionWork: taskRows.map((row) => row.id),
      taskActivity: activityRows.map((row) => row.id),
      assets: assetRows.map((row) => row.id),
      assetVariants: assetVariantRows.map((row) => row.id),
      customerTokens: tokenRows.map((row) => row.id),
      assistantActions: assistantRows.map((row) => row.id),
      orderLineItemAddons: addonRows.map((row) => row.id),
      generatedDocuments: generatedDocumentSourceRecords.map((row) => row.id),
    },
  }
}

async function ensureLegacyConfiguration(
  client: CompatibilityDb,
  orgId: string,
  templateId: string,
  templateVersion: number,
): Promise<string> {
  const existing = await client
    .select({
      id: organizationConfigurations.id,
      status: organizationConfigurations.status,
    })
    .from(organizationConfigurations)
    .where(eq(organizationConfigurations.orgId, orgId))
    .limit(1)
  if (existing[0]) {
    if (existing[0].status !== 'migrating') {
      throw new Error(
        'Organization already has an active generalized configuration',
      )
    }
    return existing[0].id
  }

  const configId = crypto.randomUUID()
  await client.insert(organizationConfigurations).values({
    id: configId,
    orgId,
    sourceTemplateId: templateId,
    sourceTemplateVersion: templateVersion,
    status: 'migrating',
    lineage: [
      { templateId, templateVersion, importedAt: new Date().toISOString() },
    ],
  })
  return configId
}

async function translateLegacyConfiguration(
  client: CompatibilityDb,
  orgId: string,
  configId: string,
  templateId: string,
  templateVersion: number,
): Promise<void> {
  const [productRows, breakpointRows, addonRows, stageRows] = await Promise.all(
    [
      client
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          category: products.category,
          active: products.active,
          productionNotes: products.productionNotes,
          basePrice: products.basePrice,
          productionDays: products.productionDays,
          minQuantity: products.minQuantity,
          maxQuantity: products.maxQuantity,
          negotiateAboveQuantity: products.negotiateAboveQuantity,
          repeatOrderUnitPrice: products.repeatOrderUnitPrice,
          repeatOrderMinQuantity: products.repeatOrderMinQuantity,
          maxProductionQuantity: products.maxProductionQuantity,
          pricingMode: products.pricingMode,
          primaryImageAssetId: products.primaryImageAssetId,
          deletedAt: products.deletedAt,
        })
        .from(products)
        .where(eq(products.orgId, orgId)),
      client
        .select({
          id: pricingBreakpoints.id,
          productId: pricingBreakpoints.productId,
          minQuantity: pricingBreakpoints.minQuantity,
          unitPrice: pricingBreakpoints.unitPrice,
        })
        .from(pricingBreakpoints)
        .where(eq(pricingBreakpoints.orgId, orgId)),
      client
        .select({
          id: productAddons.id,
          productId: productAddons.productId,
          name: productAddons.name,
          unitSurcharge: productAddons.unitSurcharge,
        })
        .from(productAddons)
        .where(eq(productAddons.orgId, orgId)),
      client
        .select({
          id: productionStages.id,
          name: productionStages.name,
          board: productionStages.board,
          description: productionStages.description,
          needApproval: productionStages.needApproval,
          requirements: productionStages.requirements,
          orderIndex: productionStages.orderIndex,
          active: productionStages.active,
        })
        .from(productionStages)
        .where(eq(productionStages.orgId, orgId)),
    ],
  )

  const breakpointsByProduct = new Map<string, typeof breakpointRows>()
  for (const row of breakpointRows) {
    const rows = breakpointsByProduct.get(row.productId) ?? []
    rows.push(row)
    breakpointsByProduct.set(row.productId, rows)
  }
  const addonsByProduct = new Map<string, typeof addonRows>()
  for (const row of addonRows) {
    const rows = addonsByProduct.get(row.productId) ?? []
    rows.push(row)
    addonsByProduct.set(row.productId, rows)
  }

  const elements = [
    ...productRows.map((product) => ({
      elementType: 'product' as const,
      elementKey: `legacy_product:${product.id}`,
      data: {
        legacySource: 'products',
        legacyId: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        active: product.active,
        softDeleted: product.deletedAt !== null,
        deletedAt: product.deletedAt ? product.deletedAt.toISOString() : null,
        basePrice: product.basePrice,
        productionDays: product.productionDays,
        minQuantity: product.minQuantity,
        maxQuantity: product.maxQuantity,
        negotiateAboveQuantity: product.negotiateAboveQuantity,
        repeatOrderUnitPrice: product.repeatOrderUnitPrice,
        repeatOrderMinQuantity: product.repeatOrderMinQuantity,
        maxProductionQuantity: product.maxProductionQuantity,
        pricingMode: product.pricingMode,
        productionNotes: product.productionNotes,
        primaryImageAssetId: product.primaryImageAssetId,
        quantityBreakpoints:
          breakpointsByProduct.get(product.id)?.map((r) => ({
            minQuantity: r.minQuantity,
            unitPrice: r.unitPrice,
          })) ?? [],
        addOns:
          addonsByProduct.get(product.id)?.map((r) => ({
            id: r.id,
            name: r.name,
            unitSurcharge: r.unitSurcharge,
          })) ?? [],
      },
    })),
    ...stageRows.map((stage) => ({
      elementType: 'workflow_stage' as const,
      elementKey: `legacy_stage:${stage.id}`,
      data: {
        legacySource: 'production_stages',
        legacyId: stage.id,
        name: stage.name,
        board: stage.board,
        description: stage.description,
        needApproval: stage.needApproval,
        requirements: stage.requirements,
        orderIndex: stage.orderIndex,
        active: stage.active,
      },
    })),
  ]

  if (elements.length > 0) {
    await client
      .insert(configurationElements)
      .values(
        elements.map((element) => ({
          id: crypto.randomUUID(),
          orgId,
          configId,
          elementType: element.elementType,
          elementKey: element.elementKey,
          provenance: 'customized' as const,
          sourceTemplateId: templateId,
          sourceTemplateVersion: templateVersion,
          data: element.data,
          originalData: element.data,
        })),
      )
      .onConflictDoNothing()
  }

  await client
    .insert(configurationElements)
    .values({
      id: crypto.randomUUID(),
      orgId,
      configId,
      elementType: 'regional_setting',
      elementKey: 'legacy_compatibility',
      provenance: 'customized',
      sourceTemplateId: templateId,
      sourceTemplateVersion: templateVersion,
      data: {
        mode: 'compatibility',
        generalizedEntry: 'review_required',
        legacyOperatingRulesPreserved: true,
      },
      originalData: {
        mode: 'compatibility',
        generalizedEntry: 'review_required',
      },
    })
    .onConflictDoNothing()
}

async function backfillHistoricalSnapshots(
  client: CompatibilityDb,
  orgId: string,
): Promise<void> {
  const lineItemRows = await client
    .select({
      lineItem: {
        id: orderLineItems.id,
        orgId: orderLineItems.orgId,
        orderId: orderLineItems.orderId,
        productId: orderLineItems.productId,
        productName: orderLineItems.productName,
        quantity: orderLineItems.quantity,
        unitPrice: orderLineItems.unitPrice,
        total: orderLineItems.total,
        designName: orderLineItems.designName,
        notes: orderLineItems.notes,
        assetId: orderLineItems.assetId,
        isRepeatOrder: orderLineItems.isRepeatOrder,
        manualDeadline: orderLineItems.manualDeadline,
        deadline: orderLineItems.deadline,
        createdAt: orderLineItems.createdAt,
      },
      order: {
        id: orders.id,
        orgId: orders.orgId,
      },
      product: {
        id: products.id,
        orgId: products.orgId,
        name: products.name,
        description: products.description,
        category: products.category,
        productionNotes: products.productionNotes,
        active: products.active,
        basePrice: products.basePrice,
        productionDays: products.productionDays,
        minQuantity: products.minQuantity,
        maxQuantity: products.maxQuantity,
        negotiateAboveQuantity: products.negotiateAboveQuantity,
        repeatOrderUnitPrice: products.repeatOrderUnitPrice,
        repeatOrderMinQuantity: products.repeatOrderMinQuantity,
        maxProductionQuantity: products.maxProductionQuantity,
        pricingMode: products.pricingMode,
        primaryImageAssetId: products.primaryImageAssetId,
        deletedAt: products.deletedAt,
      },
    })
    .from(orderLineItems)
    .innerJoin(
      orders,
      and(eq(orderLineItems.orderId, orders.id), eq(orders.orgId, orgId)),
    )
    .innerJoin(
      products,
      and(eq(orderLineItems.productId, products.id), eq(products.orgId, orgId)),
    )
    .where(eq(orderLineItems.orgId, orgId))
  if (lineItemRows.length === 0) return

  const lineItemIds = lineItemRows.map(({ lineItem }) => lineItem.id)
  const existingSpecs = await client
    .select({ id: specifications.id })
    .from(specifications)
    .where(
      and(
        eq(specifications.orgId, orgId),
        inArray(specifications.id, lineItemIds.map(migrationIdForLineItem)),
      ),
    )
  const existingPrices = await client
    .select({ id: specificationPrices.id })
    .from(specificationPrices)
    .where(
      and(
        eq(specificationPrices.orgId, orgId),
        inArray(specificationPrices.id, lineItemIds.map(priceIdForLineItem)),
      ),
    )
  const existingSnapshots = await client
    .select({ id: specificationSnapshots.id })
    .from(specificationSnapshots)
    .where(
      and(
        eq(specificationSnapshots.orgId, orgId),
        inArray(
          specificationSnapshots.id,
          lineItemIds.map(snapshotIdForLineItem),
        ),
      ),
    )
  const specIds = new Set(existingSpecs.map((row) => row.id))
  const priceIds = new Set(existingPrices.map((row) => row.id))
  const snapshotIds = new Set(existingSnapshots.map((row) => row.id))

  // Read legacy line-item add-ons
  const legacyAddons = await client
    .select({
      id: orderLineItemAddons.id,
      lineItemId: orderLineItemAddons.lineItemId,
      productAddonId: orderLineItemAddons.productAddonId,
      name: orderLineItemAddons.name,
      unitSurcharge: orderLineItemAddons.unitSurcharge,
    })
    .from(orderLineItemAddons)
    .where(eq(orderLineItemAddons.orgId, orgId))
  const addonsByLineItem = new Map<string, typeof legacyAddons>()
  for (const addon of legacyAddons) {
    const list = addonsByLineItem.get(addon.lineItemId) ?? []
    list.push(addon)
    addonsByLineItem.set(addon.lineItemId, list)
  }

  // Read product-level legacy pricing/addons for the snapshot
  const productIds = [...new Set(lineItemRows.map(({ product }) => product.id))]
  const [breakpointRows, productAddonRows] = await Promise.all([
    client
      .select({
        id: pricingBreakpoints.id,
        productId: pricingBreakpoints.productId,
        minQuantity: pricingBreakpoints.minQuantity,
        unitPrice: pricingBreakpoints.unitPrice,
      })
      .from(pricingBreakpoints)
      .where(
        and(
          eq(pricingBreakpoints.orgId, orgId),
          inArray(pricingBreakpoints.productId, productIds),
        ),
      ),
    client
      .select({
        id: productAddons.id,
        productId: productAddons.productId,
        name: productAddons.name,
        unitSurcharge: productAddons.unitSurcharge,
      })
      .from(productAddons)
      .where(
        and(
          eq(productAddons.orgId, orgId),
          inArray(productAddons.productId, productIds),
        ),
      ),
  ])
  const breakpointsByProduct = new Map<string, typeof breakpointRows>()
  for (const row of breakpointRows) {
    const rows = breakpointsByProduct.get(row.productId) ?? []
    rows.push(row)
    breakpointsByProduct.set(row.productId, rows)
  }
  const addonsByProduct = new Map<string, typeof productAddonRows>()
  for (const row of productAddonRows) {
    const rows = addonsByProduct.get(row.productId) ?? []
    rows.push(row)
    addonsByProduct.set(row.productId, rows)
  }

  for (const { lineItem, order, product } of lineItemRows) {
    const specificationId = migrationIdForLineItem(lineItem.id)
    const priceId = priceIdForLineItem(lineItem.id)
    const snapshotId = snapshotIdForLineItem(lineItem.id)
    const committedAt = lineItem.createdAt
    const lineItemAddons = addonsByLineItem.get(lineItem.id) ?? []
    const legacyValues = {
      legacyLineItemId: lineItem.id,
      productId: lineItem.productId,
      productName: lineItem.productName,
      designName: lineItem.designName,
      notes: lineItem.notes,
      assetId: lineItem.assetId,
      isRepeatOrder: lineItem.isRepeatOrder,
      manualDeadline: lineItem.manualDeadline,
      deadline: lineItem.deadline.toISOString(),
      addons: lineItemAddons.map((a) => ({
        id: a.id,
        productAddonId: a.productAddonId,
        name: a.name,
        unitSurcharge: a.unitSurcharge,
      })),
    }

    if (!specIds.has(specificationId)) {
      await client.insert(specifications).values({
        id: specificationId,
        orgId,
        productId: lineItem.productId,
        orderId: order.id,
        submittedBy: MIGRATION_ACTOR,
        submittedByRole: 'system',
        status: 'committed',
        fieldValues: { legacy: legacyValues },
        resolvedDisplay: {},
        quantity: lineItem.quantity,
        validationErrors: [],
        pricingStatus: 'committed',
        committedAt,
        createdAt: committedAt,
        updatedAt: committedAt,
      })
    }
    if (!priceIds.has(priceId)) {
      await client.insert(specificationPrices).values({
        id: priceId,
        orgId,
        specificationId,
        currency: 'IDR',
        unitPrice: lineItem.unitPrice,
        totalPrice: lineItem.total,
        quantity: lineItem.quantity,
        breakdown: [
          {
            label: 'Legacy committed line item',
            type: 'legacy_preserved',
            amount: lineItem.total,
            unitAmount: lineItem.unitPrice,
          },
        ],
        isOverridden: false,
        extensionStatuses: [],
        committedAt,
        committedBy: MIGRATION_ACTOR,
        createdAt: committedAt,
        updatedAt: committedAt,
      })
    }
    if (!snapshotIds.has(snapshotId)) {
      await client.insert(specificationSnapshots).values({
        id: snapshotId,
        orgId,
        specificationId,
        productSnapshot: {
          legacySource: 'products',
          id: product.id,
          name: product.name,
          description: product.description,
          category: product.category,
          productionNotes: product.productionNotes,
          active: product.active,
          deletedAt: product.deletedAt ? product.deletedAt.toISOString() : null,
          basePrice: product.basePrice,
          productionDays: product.productionDays,
          minQuantity: product.minQuantity,
          maxQuantity: product.maxQuantity,
          negotiateAboveQuantity: product.negotiateAboveQuantity,
          repeatOrderUnitPrice: product.repeatOrderUnitPrice,
          repeatOrderMinQuantity: product.repeatOrderMinQuantity,
          maxProductionQuantity: product.maxProductionQuantity,
          pricingMode: product.pricingMode,
          primaryImageAssetId: product.primaryImageAssetId,
          quantityBreakpoints:
            breakpointsByProduct.get(product.id)?.map((r) => ({
              minQuantity: r.minQuantity,
              unitPrice: r.unitPrice,
            })) ?? [],
          addOns:
            addonsByProduct.get(product.id)?.map((r) => ({
              id: r.id,
              name: r.name,
              unitSurcharge: r.unitSurcharge,
            })) ?? [],
        },
        fieldValuesSnapshot: { legacy: legacyValues },
        priceSnapshot: {
          unitPrice: lineItem.unitPrice,
          totalPrice: lineItem.total,
          currency: 'IDR',
          quantity: lineItem.quantity,
          meaning: 'preserved_without_recalculation',
        },
        quantity: lineItem.quantity,
        committedBy: MIGRATION_ACTOR,
        committedAt,
      })
    }
  }
}

export async function getCompatibilityMigration(
  orgId: string,
): Promise<CompatibilityMigration | null> {
  const [row] = await db
    .select({
      id: compatibilityMigrations.id,
      orgId: compatibilityMigrations.orgId,
      sourceTemplateId: compatibilityMigrations.sourceTemplateId,
      sourceTemplateVersion: compatibilityMigrations.sourceTemplateVersion,
      status: compatibilityMigrations.status,
      report: compatibilityMigrations.report,
      reviewedBy: compatibilityMigrations.reviewedBy,
      reviewedAt: compatibilityMigrations.reviewedAt,
      failureReason: compatibilityMigrations.failureReason,
      createdAt: compatibilityMigrations.createdAt,
      updatedAt: compatibilityMigrations.updatedAt,
    })
    .from(compatibilityMigrations)
    .where(eq(compatibilityMigrations.orgId, orgId))
    .limit(1)
  return row ?? null
}

export async function validateCompatibilityMigration(
  orgId: string,
): Promise<CompatibilityMigrationReport> {
  return buildPreservationReport(db, orgId)
}

/**
 * Write a failed migration record outside the calling transaction.
 * Does NOT overwrite accepted/pending_review rows.
 */
async function writeFailureRecord(
  orgId: string,
  templateId: string,
  templateVersion: number,
  migrationId: string,
  reason: string,
  createdAt: Date,
): Promise<void> {
  const [existing] = await db
    .select({
      id: compatibilityMigrations.id,
      status: compatibilityMigrations.status,
    })
    .from(compatibilityMigrations)
    .where(eq(compatibilityMigrations.orgId, orgId))
    .limit(1)
  // Do not overwrite an already accepted or pending_review migration
  if (
    existing &&
    (existing.status === 'accepted' || existing.status === 'pending_review')
  ) {
    return
  }
  await db
    .insert(compatibilityMigrations)
    .values({
      id: migrationId,
      orgId,
      sourceTemplateId: templateId,
      sourceTemplateVersion: templateVersion,
      status: 'failed',
      report: {} as CompatibilityMigrationReport,
      failureReason: reason,
      createdAt,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: compatibilityMigrations.orgId,
      set: {
        status: 'failed',
        failureReason: reason,
        updatedAt: new Date(),
      },
    })
}

export async function migrateOrganizationCompatibility(
  orgId: string,
): Promise<CompatibilityMigration> {
  const [template] = await db
    .select({ id: businessTemplates.id, version: businessTemplates.version })
    .from(businessTemplates)
    .where(
      and(
        eq(businessTemplates.slug, COMPATIBILITY_TEMPLATE_SLUG),
        eq(businessTemplates.status, 'published'),
      ),
    )
    .orderBy(desc(businessTemplates.version))
    .limit(1)
  if (!template)
    throw new Error('Published rubber-accessories template not found')

  const now = new Date()
  const migrationId = crypto.randomUUID()

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Lock and check existing — NEVER overwrite accepted/pending_review
      const [existing] = await tx
        .select({
          id: compatibilityMigrations.id,
          orgId: compatibilityMigrations.orgId,
          sourceTemplateId: compatibilityMigrations.sourceTemplateId,
          sourceTemplateVersion: compatibilityMigrations.sourceTemplateVersion,
          status: compatibilityMigrations.status,
          report: compatibilityMigrations.report,
          reviewedBy: compatibilityMigrations.reviewedBy,
          reviewedAt: compatibilityMigrations.reviewedAt,
          failureReason: compatibilityMigrations.failureReason,
          createdAt: compatibilityMigrations.createdAt,
          updatedAt: compatibilityMigrations.updatedAt,
        })
        .from(compatibilityMigrations)
        .where(eq(compatibilityMigrations.orgId, orgId))
        .for('update')
        .limit(1)

      // Return early if already accepted or pending_review (idempotent)
      if (existing?.status === 'accepted') return existing
      if (existing?.status === 'pending_review') return existing

      // 2. Validate organization exists
      const [org] = await tx
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.id, orgId))
        .limit(1)
      if (!org) throw new Error('Organization not found')

      // 3. Create/reset migration record (only if failed or new)
      // Use DO NOTHING to let the SELECT FOR UPDATE serialize concurrent callers.
      const insertResult = await tx
        .insert(compatibilityMigrations)
        .values({
          id: existing?.id ?? migrationId,
          orgId,
          sourceTemplateId: template.id,
          sourceTemplateVersion: template.version,
          status: 'pending_review',
          report: {} as CompatibilityMigrationReport,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .returning({ id: compatibilityMigrations.id })

      let effectiveMigrationId: string
      if (insertResult[0]) {
        // Fresh insert succeeded
        effectiveMigrationId = insertResult[0].id
      } else {
        // Conflict — re-read the winning row
        const [winner] = await tx
          .select({
            id: compatibilityMigrations.id,
            status: compatibilityMigrations.status,
          })
          .from(compatibilityMigrations)
          .where(eq(compatibilityMigrations.orgId, orgId))
          .for('update')
          .limit(1)
        if (!winner)
          throw new Error('Migration row disappeared during insert conflict')
        effectiveMigrationId = winner.id
        // If another caller finished, abort
        if (
          winner.status === 'accepted' ||
          winner.status === 'pending_review'
        ) {
          const [full] = await tx
            .select({
              id: compatibilityMigrations.id,
              orgId: compatibilityMigrations.orgId,
              sourceTemplateId: compatibilityMigrations.sourceTemplateId,
              sourceTemplateVersion:
                compatibilityMigrations.sourceTemplateVersion,
              status: compatibilityMigrations.status,
              report: compatibilityMigrations.report,
              reviewedBy: compatibilityMigrations.reviewedBy,
              reviewedAt: compatibilityMigrations.reviewedAt,
              failureReason: compatibilityMigrations.failureReason,
              createdAt: compatibilityMigrations.createdAt,
              updatedAt: compatibilityMigrations.updatedAt,
            })
            .from(compatibilityMigrations)
            .where(eq(compatibilityMigrations.orgId, orgId))
            .limit(1)
          if (full) return full
        }
        // Reset failed row to pending_review
        await tx
          .update(compatibilityMigrations)
          .set({
            status: 'pending_review',
            failureReason: null,
            updatedAt: now,
          })
          .where(eq(compatibilityMigrations.id, effectiveMigrationId))
      }
      const configId = await ensureLegacyConfiguration(
        tx,
        orgId,
        template.id,
        template.version,
      )
      await translateLegacyConfiguration(
        tx,
        orgId,
        configId,
        template.id,
        template.version,
      )
      await backfillHistoricalSnapshots(tx, orgId)
      const report = await buildPreservationReport(tx, orgId)
      const [migration] = await tx
        .update(compatibilityMigrations)
        .set({ report, status: 'pending_review', updatedAt: new Date() })
        .where(eq(compatibilityMigrations.id, effectiveMigrationId))
        .returning()
      if (!migration)
        throw new Error('Failed to record compatibility migration')
      return migration
    })

    return result
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : 'Unknown migration failure'
    await writeFailureRecord(
      orgId,
      template.id,
      template.version,
      migrationId,
      reason,
      now,
    )
    throw error instanceof Error ? error : new Error(reason)
  }
}

export async function acceptCompatibilityMigration(
  orgId: string,
  migrationId: string,
  reviewedBy: string,
): Promise<CompatibilityMigration> {
  return db.transaction(async (tx) => {
    const [migration] = await tx
      .select({
        id: compatibilityMigrations.id,
        orgId: compatibilityMigrations.orgId,
        status: compatibilityMigrations.status,
      })
      .from(compatibilityMigrations)
      .where(
        and(
          eq(compatibilityMigrations.id, migrationId),
          eq(compatibilityMigrations.orgId, orgId),
        ),
      )
      .limit(1)
    if (!migration) throw new Error('Compatibility migration not found')
    if (migration.status === 'accepted') {
      // Return the full row — already accepted, no-op
      const [full] = await tx
        .select({
          id: compatibilityMigrations.id,
          orgId: compatibilityMigrations.orgId,
          sourceTemplateId: compatibilityMigrations.sourceTemplateId,
          sourceTemplateVersion: compatibilityMigrations.sourceTemplateVersion,
          status: compatibilityMigrations.status,
          report: compatibilityMigrations.report,
          reviewedBy: compatibilityMigrations.reviewedBy,
          reviewedAt: compatibilityMigrations.reviewedAt,
          failureReason: compatibilityMigrations.failureReason,
          createdAt: compatibilityMigrations.createdAt,
          updatedAt: compatibilityMigrations.updatedAt,
        })
        .from(compatibilityMigrations)
        .where(eq(compatibilityMigrations.id, migrationId))
        .limit(1)
      if (!full)
        throw new Error('Compatibility migration not found after accept')
      return full
    }
    if (migration.status !== 'pending_review') {
      throw new Error(
        `Cannot accept migration with status "${migration.status}"`,
      )
    }

    const [config] = await tx
      .select({
        id: organizationConfigurations.id,
        status: organizationConfigurations.status,
      })
      .from(organizationConfigurations)
      .where(eq(organizationConfigurations.orgId, orgId))
      .limit(1)
    if (config?.status !== 'migrating') {
      throw new Error('Organization is not in compatibility mode')
    }

    const [updated] = await tx
      .update(organizationConfigurations)
      .set({ status: 'active', updatedAt: new Date() })
      .where(
        and(
          eq(organizationConfigurations.id, config.id),
          eq(organizationConfigurations.orgId, orgId),
        ),
      )
      .returning()
    if (!updated)
      throw new Error('Failed to activate generalized configuration')

    const [accepted] = await tx
      .update(compatibilityMigrations)
      .set({
        status: 'accepted',
        reviewedBy,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(compatibilityMigrations.id, migrationId),
          eq(compatibilityMigrations.orgId, orgId),
        ),
      )
      .returning()
    if (!accepted) throw new Error('Failed to accept compatibility migration')
    return accepted
  })
}
