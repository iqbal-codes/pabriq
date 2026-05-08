import {
  boolean,
  date,
  foreignKey,
  integer,
  json,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const verification = pgTable('verification', {
  id: text().primaryKey().notNull(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }),
  updatedAt: timestamp('updated_at', { mode: 'string' }),
})

export const user = pgTable(
  'user',
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean('email_verified').notNull(),
    image: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (table) => [unique('user_email_unique').on(table.email)],
)

export const account = pgTable(
  'account',
  {
    id: text().primaryKey().notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      mode: 'string',
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      mode: 'string',
    }),
    scope: text(),
    password: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'account_user_id_user_id_fk',
    }).onDelete('cascade'),
  ],
)

export const session = pgTable(
  'session',
  {
    id: text().primaryKey().notNull(),
    expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
    token: text().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'session_user_id_user_id_fk',
    }).onDelete('cascade'),
    unique('session_token_unique').on(table.token),
  ],
)

export const organization = pgTable(
  'organization',
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    slug: text().notNull(),
    logo: text(),
    metadata: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }),
  },
  (table) => [unique('organization_slug_unique').on(table.slug)],
)

export const invitation = pgTable(
  'invitation',
  {
    id: text().primaryKey().notNull(),
    organizationId: text('organization_id').notNull(),
    email: text().notNull(),
    role: text().notNull(),
    status: text().notNull(),
    expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
    inviterId: text('inviter_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: 'invitation_organization_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.inviterId],
      foreignColumns: [user.id],
      name: 'invitation_inviter_id_user_id_fk',
    }).onDelete('cascade'),
  ],
)

export const member = pgTable(
  'member',
  {
    id: text().primaryKey().notNull(),
    organizationId: text('organization_id').notNull(),
    userId: text('user_id').notNull(),
    role: text().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: 'member_organization_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'member_user_id_user_id_fk',
    }).onDelete('cascade'),
  ],
)

export const orders = pgTable(
  'orders',
  {
    id: text().primaryKey().notNull(),
    orgId: text('org_id').notNull(),
    customerId: text('customer_id').notNull(),
    status: text().default('draft').notNull(),
    notes: text(),
    total: real().default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    quoteNumber: text('quote_number'),
    validUntil: timestamp('valid_until', { mode: 'string' }),
    shippingAddress: json('shipping_address'),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [organization.id],
      name: 'orders_org_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'orders_customer_id_customers_id_fk',
    }).onDelete('restrict'),
  ],
)

export const customers = pgTable(
  'customers',
  {
    id: text().primaryKey().notNull(),
    orgId: text('org_id').notNull(),
    name: text().notNull(),
    businessName: text('business_name'),
    email: text(),
    phone: text(),
    address: text(),
    notes: text(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    addressId: text('address_id'),
    isWni: boolean('is_wni').default(true).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [organization.id],
      name: 'customers_org_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.addressId],
      foreignColumns: [addresses.id],
      name: 'customers_address_id_addresses_id_fk',
    }).onDelete('set null'),
  ],
)

export const activityEvents = pgTable(
  'activity_events',
  {
    id: text().primaryKey().notNull(),
    orgId: text('org_id').notNull(),
    actorId: text('actor_id').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    action: text().notNull(),
    details: json().default({}),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [organization.id],
      name: 'activity_events_org_id_organization_id_fk',
    }).onDelete('cascade'),
  ],
)

export const customerTokens = pgTable(
  'customer_tokens',
  {
    id: text().primaryKey().notNull(),
    orgId: text('org_id').notNull(),
    orderId: text('order_id').notNull(),
    token: text().notNull(),
    expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
    scope: json(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [organization.id],
      name: 'customer_tokens_org_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: 'customer_tokens_order_id_orders_id_fk',
    }).onDelete('cascade'),
    unique('customer_tokens_token_unique').on(table.token),
  ],
)

export const paymentMethods = pgTable(
  'payment_methods',
  {
    id: text().primaryKey().notNull(),
    orgId: text('org_id').notNull(),
    name: text().notNull(),
    type: text().default('bank_transfer').notNull(),
    bankName: text('bank_name'),
    accountNumber: text('account_number'),
    accountHolder: text('account_holder'),
    instructions: text(),
    isDefault: boolean('is_default').default(false).notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [organization.id],
      name: 'payment_methods_org_id_organization_id_fk',
    }).onDelete('cascade'),
  ],
)

export const invoices = pgTable(
  'invoices',
  {
    id: text().primaryKey().notNull(),
    orgId: text('org_id').notNull(),
    invoiceNumber: text('invoice_number').notNull(),
    orderId: text('order_id'),
    customerId: text('customer_id').notNull(),
    customerName: text('customer_name').notNull(),
    status: text().default('unpaid').notNull(),
    percentage: real(),
    subtotal: real().notNull(),
    total: real().notNull(),
    dueDate: date('due_date').notNull(),
    issuedDate: date('issued_date').defaultNow().notNull(),
    paymentMethodId: text('payment_method_id'),
    paidAt: timestamp('paid_at', { mode: 'string' }),
    paidBy: text('paid_by'),
    notes: text(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [organization.id],
      name: 'invoices_org_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: 'invoices_order_id_orders_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'invoices_customer_id_customers_id_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.paymentMethodId],
      foreignColumns: [paymentMethods.id],
      name: 'invoices_payment_method_id_payment_methods_id_fk',
    }).onDelete('set null'),
    uniqueIndex('idx_invoices_org_number').on(table.orgId, table.invoiceNumber),
  ],
)

export const invoiceLineItems = pgTable(
  'invoice_line_items',
  {
    id: text().primaryKey().notNull(),
    invoiceId: text('invoice_id').notNull(),
    description: text().notNull(),
    quantity: integer().notNull(),
    unitPrice: real('unit_price').notNull(),
    taxPercent: real('tax_percent').default(0).notNull(),
    total: real().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoices.id],
      name: 'invoice_line_items_invoice_id_invoices_id_fk',
    }).onDelete('cascade'),
  ],
)

export const orderLineItems = pgTable(
  'order_line_items',
  {
    id: text().primaryKey().notNull(),
    orgId: text('org_id').notNull(),
    orderId: text('order_id').notNull(),
    productId: text('product_id').notNull(),
    variantId: text('variant_id'),
    quantity: integer().default(1).notNull(),
    unitPrice: real('unit_price').notNull(),
    total: real().notNull(),
    notes: text(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [organization.id],
      name: 'order_line_items_org_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: 'order_line_items_order_id_orders_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'order_line_items_product_id_products_id_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.variantId],
      foreignColumns: [productVariants.id],
      name: 'order_line_items_variant_id_product_variants_id_fk',
    }).onDelete('set null'),
  ],
)

export const products = pgTable(
  'products',
  {
    id: text().primaryKey().notNull(),
    orgId: text('org_id').notNull(),
    name: text().notNull(),
    description: text(),
    active: boolean().default(true).notNull(),
    productionNotes: text('production_notes'),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [organization.id],
      name: 'products_org_id_organization_id_fk',
    }).onDelete('cascade'),
  ],
)

export const productVariants = pgTable(
  'product_variants',
  {
    id: text().primaryKey().notNull(),
    orgId: text('org_id').notNull(),
    productId: text('product_id').notNull(),
    name: text().notNull(),
    attributes: json().default({}),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [organization.id],
      name: 'product_variants_org_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'product_variants_product_id_products_id_fk',
    }).onDelete('cascade'),
  ],
)

export const pricingBreakpoints = pgTable(
  'pricing_breakpoints',
  {
    id: text().primaryKey().notNull(),
    orgId: text('org_id').notNull(),
    productId: text('product_id').notNull(),
    variantId: text('variant_id'),
    minQuantity: integer('min_quantity').default(1).notNull(),
    unitPrice: real('unit_price').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [organization.id],
      name: 'pricing_breakpoints_org_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'pricing_breakpoints_product_id_products_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.variantId],
      foreignColumns: [productVariants.id],
      name: 'pricing_breakpoints_variant_id_product_variants_id_fk',
    }).onDelete('set null'),
  ],
)

export const productionTasks = pgTable(
  'production_tasks',
  {
    id: text().primaryKey().notNull(),
    orgId: text('org_id').notNull(),
    orderId: text('order_id').notNull(),
    stageId: text('stage_id').notNull(),
    status: text().default('pending').notNull(),
    context: json().default({
      productName: '',
      variantName: null,
      customerName: '',
      requirements: null,
    }),
    assignedTo: text('assigned_to'),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [organization.id],
      name: 'production_tasks_org_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: 'production_tasks_order_id_orders_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.stageId],
      foreignColumns: [workflowStages.id],
      name: 'production_tasks_stage_id_workflow_stages_id_fk',
    }).onDelete('restrict'),
  ],
)

export const workflowStages = pgTable(
  'workflow_stages',
  {
    id: text().primaryKey().notNull(),
    orgId: text('org_id').notNull(),
    name: text().notNull(),
    orderIndex: integer('order_index').default(0).notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [organization.id],
      name: 'workflow_stages_org_id_organization_id_fk',
    }).onDelete('cascade'),
  ],
)

export const addresses = pgTable(
  'addresses',
  {
    id: text().primaryKey().notNull(),
    orgId: text('org_id').notNull(),
    areaId: text('area_id'),
    areaName: text('area_name'),
    streetAddress: text('street_address'),
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [organization.id],
      name: 'addresses_org_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.areaId],
      foreignColumns: [biteshipAreas.areaId],
      name: 'addresses_area_id_biteship_areas_area_id_fk',
    }),
  ],
)

export const biteshipAreas = pgTable('biteship_areas', {
  areaId: text('area_id').primaryKey().notNull(),
  name: text().notNull(),
  subdistrict: text().notNull(),
  district: text().notNull(),
  city: text().notNull(),
  province: text().notNull(),
  postalCode: text('postal_code').notNull(),
})

export const assets = pgTable(
  'assets',
  {
    id: text().primaryKey().notNull(),
    orgId: text('org_id').notNull(),
    ownerType: text('owner_type').notNull(),
    ownerId: text('owner_id'),
    draftId: text('draft_id'),
    usage: text().notNull(),
    assetKind: text('asset_kind').notNull(),
    originalFilename: text('original_filename').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedByUserId: text('uploaded_by_user_id').notNull(),
    status: text().default('pending').notNull(),
    checksumSha256: text('checksum_sha256'),
    imageWidth: integer('image_width'),
    imageHeight: integer('image_height'),
    videoDurationSeconds: integer('video_duration_seconds'),
    deletedAt: timestamp('deleted_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [organization.id],
      name: 'assets_org_id_organization_id_fk',
    }).onDelete('cascade'),
  ],
)

export const assetVariants = pgTable(
  'asset_variants',
  {
    id: text().primaryKey().notNull(),
    assetId: text('asset_id').notNull(),
    variantKey: text('variant_key').notNull(),
    storageKey: text('storage_key').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    width: integer(),
    height: integer(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.assetId],
      foreignColumns: [assets.id],
      name: 'asset_variants_asset_id_assets_id_fk',
    }).onDelete('cascade'),
  ],
)

export const organizationProfiles = pgTable(
  'organization_profiles',
  {
    id: text().primaryKey().notNull(),
    orgId: text('org_id').notNull(),
    displayName: text('display_name'),
    phone: text(),
    email: text(),
    logoAssetId: text('logo_asset_id'),
    addressId: text('address_id'),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [organization.id],
      name: 'organization_profiles_org_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.logoAssetId],
      foreignColumns: [assets.id],
      name: 'organization_profiles_logo_asset_id_assets_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.addressId],
      foreignColumns: [addresses.id],
      name: 'organization_profiles_address_id_addresses_id_fk',
    }).onDelete('set null'),
    unique('organization_profiles_org_id_unique').on(table.orgId),
  ],
)
