import { eq, sql } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  assets as assetsTable,
  assetVariants as assetVariantsTable,
  businessTemplates as businessTemplatesTable,
  compatibilityMigrations as compatibilityMigrationsTable,
  configurationElements as configurationElementsTable,
  customers as customersTable,
  customerTokens as customerTokensTable,
  invoiceLineItems as invoiceLineItemsTable,
  invoices as invoicesTable,
  member as memberTable,
  midtransTransactions as midtransTransactionsTable,
  orderLineItems as orderLineItemsTable,
  orders as ordersTable,
  organizationConfigurations as organizationConfigurationsTable,
  organization as organizationTable,
  payments as paymentsTable,
  pricingBreakpoints as pricingBreakpointsTable,
  productAddons as productAddonsTable,
  productionStages as productionStagesTable,
  productionTasks as productionTasksTable,
  products as productsTable,
  specificationSnapshots as specificationSnapshotsTable,
  specifications as specificationsTable,
  taskActivity as taskActivityTable,
  user as userTable,
} from '#/db/schema'
import {
  acceptCompatibilityMigration,
  getCompatibilityMigration,
  migrateOrganizationCompatibility,
  validateCompatibilityMigration,
} from './model'

const orgId = '00000000-0000-0000-0000-0000000000a1'
const orgId2 = '00000000-0000-0000-0000-0000000000a2'
const userId = '00000000-0000-0000-0000-0000000000b1'
const templateSlug = 'rubber-accessories'

async function seedLegacyOrganization(): Promise<void> {
  const now = new Date()
  await db.insert(userTable).values({
    id: userId,
    name: 'Owner',
    email: 'owner@legacy.test',
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(organizationTable).values([
    {
      id: orgId,
      name: 'Legacy Rubber Co',
      slug: 'legacy-rubber-co',
      createdAt: now,
    },
    { id: orgId2, name: 'Other Org', slug: 'other-org', createdAt: now },
  ])
  await db.insert(memberTable).values({
    id: 'mem-1',
    organizationId: orgId,
    userId,
    role: 'admin',
    createdAt: now,
  })
  await db.insert(customersTable).values({
    id: 'cust-1',
    orgId,
    name: 'Pelanggan Lama',
    email: 'legacy@example.com',
    active: true,
    createdAt: now,
    updatedAt: now,
  })
  const [product] = await db
    .insert(productsTable)
    .values({
      id: 'prod-1',
      orgId,
      name: 'Rubber Keychain',
      description: 'Legacy product',
      productionNotes: 'Use silicone mold',
      basePrice: 5000,
      productionDays: 4,
      minQuantity: 100,
      maxQuantity: 10000,
      repeatOrderUnitPrice: 4500,
      repeatOrderMinQuantity: 200,
      pricingMode: 'interpolated',
      category: 'keychain',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  await db.insert(pricingBreakpointsTable).values([
    {
      id: 'bp-1',
      orgId,
      productId: product.id,
      minQuantity: 100,
      unitPrice: 5000,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'bp-2',
      orgId,
      productId: product.id,
      minQuantity: 500,
      unitPrice: 4500,
      createdAt: now,
      updatedAt: now,
    },
  ])
  await db.insert(productAddonsTable).values({
    id: 'addon-1',
    orgId,
    productId: product.id,
    name: 'Embossed logo',
    unitSurcharge: 200,
    createdAt: now,
    updatedAt: now,
  })
  const [stage] = await db
    .insert(productionStagesTable)
    .values({
      id: 'stage-1',
      orgId,
      name: 'Design Review',
      board: 'pre_production',
      needApproval: true,
      orderIndex: 0,
      active: true,
      requirements: [
        {
          id: 'design_file',
          label: 'Design file',
          type: 'upload',
          required: true,
        },
      ],
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  const deadline = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
  const [order] = await db
    .insert(ordersTable)
    .values({
      id: 'ord-1',
      orgId,
      customerId: 'cust-1',
      status: 'approved',
      orderNumber: 'ORD-2024-0001',
      orderToken: 'token-1',
      total: 250_000,
      notes: 'legacy order note',
      deadline,
      manualDeadline: false,
      approvedAt: now,
      approvedBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  await db.insert(orderLineItemsTable).values({
    id: 'li-1',
    orgId,
    orderId: order.id,
    productId: product.id,
    productName: product.name,
    quantity: 50,
    unitPrice: 5000,
    total: 250_000,
    designName: 'Legacy design (untranslated)',
    notes: 'use prior PVC',
    productionDays: 4,
    deadline,
    isRepeatOrder: false,
    manualDeadline: false,
    createdAt: now,
    updatedAt: now,
  })

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      id: 'inv-1',
      orgId,
      invoiceNumber: 'INV-2024-0001',
      orderId: order.id,
      customerId: 'cust-1',
      customerName: 'Pelanggan Lama',
      status: 'paid',
      subtotal: 250_000,
      total: 250_000,
      currency: 'IDR',
      dueDate: '2024-12-01',
      paymentProvider: 'bank_transfer',
      issuedDate: '2024-11-01',
      paidAt: now,
      paidBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  await db.insert(invoiceLineItemsTable).values({
    id: 'ili-1',
    invoiceId: invoice.id,
    description: 'Rubber Keychain',
    quantity: 50,
    unitPrice: 5000,
    lineType: 'product',
    taxPercent: 0,
    total: 250_000,
    createdAt: now,
  })
  await db.insert(paymentsTable).values({
    id: 'pay-1',
    orgId,
    invoiceId: invoice.id,
    amount: 250_000,
    method: 'bank_transfer',
    reference: 'TRF-001',
    status: 'confirmed',
    receivedAt: now,
    confirmedAt: now,
    confirmedBy: userId,
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(midtransTransactionsTable).values({
    id: 'mt-1',
    orgId,
    invoiceId: invoice.id,
    orderId: order.id,
    expectedAmount: 250_000,
    transactionId: 'txn-1',
    transactionStatus: 'settlement',
    paymentType: 'bank_transfer',
    settlementTime: now,
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(customerTokensTable).values({
    id: 'tok-1',
    orgId,
    orderId: order.id,
    token: 'token-1',
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    scope: { readonly: true, orderId: order.id },
    createdAt: now,
    updatedAt: now,
  })
  const [asset] = await db
    .insert(assetsTable)
    .values({
      id: 'asset-1',
      orgId,
      ownerType: 'order',
      ownerId: order.id,
      usage: 'attachment',
      assetKind: 'image',
      originalFilename: 'design.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      uploadedByUserId: userId,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  await db.insert(assetVariantsTable).values({
    id: 'av-1',
    assetId: asset.id,
    variantKey: 'original',
    storageKey: `org/${orgId}/order/${order.id}/design.png`,
    mimeType: 'image/png',
    sizeBytes: 1024,
    createdAt: now,
  })
  const [task] = await db
    .insert(productionTasksTable)
    .values({
      id: 'task-1',
      orgId,
      orderId: order.id,
      board: 'pre_production',
      stageId: stage.id,
      status: 'queued',
      taskNumber: 'TSK-0001',
      lineItemId: 'li-1',
      priority: false,
      context: {
        productName: product.name,
        designName: 'Legacy design (untranslated)',
        customerName: 'Pelanggan Lama',
        requirements: 'See order notes',
        quantity: 50,
        unitPrice: 5000,
        total: 250_000,
        currency: 'IDR',
        deadline: deadline.toISOString(),
      },
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  await db.insert(taskActivityTable).values({
    id: 'ta-1',
    orgId,
    taskId: task.id,
    type: 'created',
    data: { from: null, to: 'pre_production' },
    actorId: userId,
    createdAt: now,
  })
}

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE compatibility_migrations, organization_configurations, configuration_elements, template_upgrade_proposals, business_templates CASCADE`,
  )
  await db.execute(
    sql`TRUNCATE specification_snapshots, specification_prices, specifications, organization, member, "user", customers, products, pricing_breakpoints, product_addons, production_stages, production_tasks, task_activity, orders, order_line_items, order_line_item_addons, invoices, invoice_line_items, payments, midtrans_transactions, customer_tokens, assets, asset_variants, assistant_actions CASCADE`,
  )

  await db.insert(businessTemplatesTable).values({
    id: 'tmpl-rubber',
    slug: templateSlug,
    name: 'Rubber Accessories',
    version: 1,
    status: 'published',
    category: 'rubber_accessories',
    capabilities: { productTypes: ['keychain'] },
    configSnapshot: { products: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  await seedLegacyOrganization()
})

describe('compatibility migration', () => {
  it('preserves all legacy identifiers, ownership, and historical values', async () => {
    const report = await validateCompatibilityMigration(orgId)
    expect(report.preservedIds.orders).toEqual(['ord-1'])
    expect(report.preservedIds.customers).toEqual(['cust-1'])
    expect(report.preservedIds.products).toEqual(['prod-1'])
    expect(report.preservedIds.invoices).toEqual(['inv-1'])
    expect(report.preservedIds.payments).toEqual(['pay-1'])
    expect(report.preservedIds.assets).toEqual(['asset-1'])
    expect(report.preservedIds.customerTokens).toEqual(['tok-1'])
    expect(report.totals.orderTotal).toBe(250_000)
    expect(report.totals.invoiceTotal).toBe(250_000)
    expect(report.totals.confirmedPaymentTotal).toBe(250_000)
    expect(report.reachability.ordersWithPortalToken).toBe(1)
    expect(report.reachability.reachablePortalTokens).toBe(1)
    expect(
      report.reviewItems.some((item) => item.kind === 'legacy_design_name'),
    ).toBe(true)
  })

  it('runs the migration in a transaction and marks status pending review', async () => {
    const migration = await migrateOrganizationCompatibility(orgId)
    expect(migration.status).toBe('pending_review')
    const fetched = await getCompatibilityMigration(orgId)
    expect(fetched?.status).toBe('pending_review')
    expect(fetched?.report.totals.orderTotal).toBe(250_000)
    const config = await db
      .select()
      .from(organizationConfigurationsTable)
      .where(eq(organizationConfigurationsTable.orgId, orgId))
    expect(config[0]?.status).toBe('migrating')
    const elements = await db
      .select()
      .from(configurationElementsTable)
      .where(eq(configurationElementsTable.orgId, orgId))
    expect(elements.length).toBeGreaterThan(0)
    const specs = await db
      .select()
      .from(specificationsTable)
      .where(eq(specificationsTable.orgId, orgId))
    expect(specs.some((s) => s.id === 'compatibility-spec:li-1')).toBe(true)
    const snapshots = await db
      .select()
      .from(specificationSnapshotsTable)
      .where(eq(specificationSnapshotsTable.orgId, orgId))
    expect(snapshots.some((s) => s.id === 'compatibility-snapshot:li-1')).toBe(
      true,
    )
  })

  it('is idempotent — re-running migration does not duplicate records', async () => {
    await migrateOrganizationCompatibility(orgId)
    await migrateOrganizationCompatibility(orgId)
    const snapshots = await db
      .select()
      .from(specificationSnapshotsTable)
      .where(eq(specificationSnapshotsTable.orgId, orgId))
    expect(
      snapshots.filter((s) => s.id === 'compatibility-snapshot:li-1').length,
    ).toBe(1)
    const elements = await db
      .select()
      .from(configurationElementsTable)
      .where(eq(configurationElementsTable.orgId, orgId))
    const productElements = elements.filter(
      (e) =>
        e.elementType === 'product' && e.elementKey === 'legacy_product:prod-1',
    )
    expect(productElements.length).toBe(1)
  })

  it('rolls back when migration throws and leaves no configuration residue', async () => {
    await db
      .delete(compatibilityMigrationsTable)
      .where(eq(compatibilityMigrationsTable.orgId, orgId))
    const conflictingConfigId = 'cfg-existing'
    await db
      .delete(organizationConfigurationsTable)
      .where(eq(organizationConfigurationsTable.orgId, orgId))
    await db.insert(organizationConfigurationsTable).values({
      id: conflictingConfigId,
      orgId,
      sourceTemplateId: 'tmpl-rubber',
      sourceTemplateVersion: 1,
      status: 'active',
      lineage: [
        {
          templateId: 'tmpl-rubber',
          templateVersion: 1,
          importedAt: new Date().toISOString(),
        },
      ],
    })
    await expect(migrateOrganizationCompatibility(orgId)).rejects.toThrow(
      'already has an active generalized configuration',
    )
    const configs = await db
      .select()
      .from(organizationConfigurationsTable)
      .where(eq(organizationConfigurationsTable.orgId, orgId))
    expect(configs).toHaveLength(1)
    expect(configs[0]?.id).toBe(conflictingConfigId)
  })
  it('accepts the migration and flips generalized configuration to active', async () => {
    const migration = await migrateOrganizationCompatibility(orgId)
    const accepted = await acceptCompatibilityMigration(
      orgId,
      migration.id,
      userId,
    )
    expect(accepted.status).toBe('accepted')
    const config = await db
      .select()
      .from(organizationConfigurationsTable)
      .where(eq(organizationConfigurationsTable.orgId, orgId))
    expect(config[0]?.status).toBe('active')
  })

  it('keeps the portal token reachable for the migrated order', async () => {
    await migrateOrganizationCompatibility(orgId)
    const token = await db
      .select()
      .from(customerTokensTable)
      .where(eq(customerTokensTable.orgId, orgId))
    expect(token.map((row) => row.token)).toEqual(['token-1'])
    const ordersWithToken = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.orgId, orgId))
    expect(ordersWithToken.map((row) => row.orderToken)).toEqual(['token-1'])
  })
})
