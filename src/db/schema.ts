import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  json,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
})

export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at'),
})

export const biteshipAreas = pgTable('biteship_areas', {
  areaId: text('area_id').primaryKey(),
  name: text('name').notNull(),
  subdistrict: text('subdistrict').notNull(),
  district: text('district').notNull(),
  city: text('city').notNull(),
  province: text('province').notNull(),
  postalCode: text('postal_code').notNull(),
})

export const addresses = pgTable('addresses', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  areaId: text('area_id'),
  areaName: text('area_name'),
  streetAddress: text('street_address'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const member = pgTable('member', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  createdAt: timestamp('created_at').notNull(),
})

export const invitation = pgTable('invitation', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').notNull(),
  status: text('status').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  inviterId: text('inviter_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull(),
})

// Plan entitlements
export type PlanEntitlements = {
  maxOrders: number | null
  maxProducts: number | null
  maxCustomers: number | null
  maxMembers: number | null
  maxStorageBytes: number | null
  features: string[]
  warningThresholds: {
    orders?: number
    products?: number
    customers?: number
    members?: number
    storage?: number
  }
}

export const plans = pgTable(
  'plans',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    version: integer('version').notNull().default(1),
    description: text('description'),
    entitlements: json('entitlements').$type<PlanEntitlements>().notNull(),
    monthlyPriceCents: integer('monthly_price_cents').notNull().default(0),
    annualPriceCents: integer('annual_price_cents').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_plans_slug_version').on(table.slug, table.version),
  ],
)

export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'grace_period',
  'suspended',
  'canceled',
] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export const BILLING_CADENCES = ['monthly', 'annual'] as const
export type BillingCadence = (typeof BILLING_CADENCES)[number]

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .unique()
    .references(() => organization.id, { onDelete: 'cascade' }),
  planId: text('plan_id')
    .notNull()
    .references(() => plans.id, { onDelete: 'restrict' }),
  status: text('status')
    .$type<SubscriptionStatus>()
    .notNull()
    .default('trialing'),
  billingCadence: text('billing_cadence')
    .$type<BillingCadence>()
    .notNull()
    .default('monthly'),
  trialStartsAt: timestamp('trial_starts_at'),
  trialEndsAt: timestamp('trial_ends_at'),
  currentPeriodStartsAt: timestamp('current_period_starts_at'),
  currentPeriodEndsAt: timestamp('current_period_ends_at'),
  canceledAt: timestamp('canceled_at'),
  suspendedAt: timestamp('suspended_at'),
  gracePeriodEndsAt: timestamp('grace_period_ends_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const BUSINESS_TEMPLATE_STATUSES = [
  'draft',
  'published',
  'retired',
] as const
export type BusinessTemplateStatus = (typeof BUSINESS_TEMPLATE_STATUSES)[number]

export const businessTemplates = pgTable(
  'business_templates',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    version: integer('version').notNull().default(1),
    status: text('status')
      .$type<BusinessTemplateStatus>()
      .notNull()
      .default('draft'),
    category: text('category'),
    capabilities: json('capabilities')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    configSnapshot: json('config_snapshot')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    publishedAt: timestamp('published_at'),
    retiredAt: timestamp('retired_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_business_templates_slug_version').on(
      table.slug,
      table.version,
    ),
  ],
)

export const ORGANIZATION_CONFIGURATION_STATUSES = [
  'active',
  'upgrading',
  'migrating',
] as const
export type OrganizationConfigurationStatus =
  (typeof ORGANIZATION_CONFIGURATION_STATUSES)[number]

export const organizationConfigurations = pgTable(
  'organization_configurations',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .unique()
      .references(() => organization.id, { onDelete: 'cascade' }),
    sourceTemplateId: text('source_template_id')
      .notNull()
      .references(() => businessTemplates.id, { onDelete: 'restrict' }),
    sourceTemplateVersion: integer('source_template_version').notNull(),
    status: text('status')
      .$type<OrganizationConfigurationStatus>()
      .notNull()
      .default('active'),
    lineage: json('lineage')
      .$type<
        Array<{
          templateId: string
          templateVersion: number
          importedAt: string
        }>
      >()
      .notNull()
      .default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
)

export const COMPATIBILITY_MIGRATION_STATUSES = [
  'pending_review',
  'accepted',
  'failed',
] as const
export type CompatibilityMigrationStatus =
  (typeof COMPATIBILITY_MIGRATION_STATUSES)[number]

export type CompatibilityMigrationReport = {
  organization: { id: string; slug: string; name: string }
  counts: Record<string, number>
  totals: {
    orderTotal: number
    invoiceTotal: number
    confirmedPaymentTotal: number
    invoiceBalances: number
  }
  statuses: {
    orders: Record<string, number>
    invoices: Record<string, number>
    payments: Record<string, number>
  }
  deadlines: { ordersWithDeadline: number; lineItemsWithDeadline: number }
  ownership: {
    assets: number
    assetVariants: number
    tokens: number
    assistantActions: number
    documents: number
    assetStorageKeys: string[]
    assetOwnerMap: Array<{
      id: string
      ownerType: string
      ownerId: string | null
      storageKey: string | null
    }>
    invoiceBalances: Array<{
      invoiceId: string
      invoiceNumber: string
      total: number
      paid: number
      balance: number
    }>
    softDeletedCustomers: number
    softDeletedProducts: number
    generatedDocumentSourceRecords: Array<{
      id: string
      kind: 'invoice' | 'quotation' | 'order'
      sourceId: string
      storageKey: string | null
    }>
  }
  reachability: { ordersWithPortalToken: number; reachablePortalTokens: number }
  reviewItems: Array<{
    kind: string
    sourceId: string
    label: string
    value: string | null
  }>
  preservedIds: Record<string, string[]>
}

export const compatibilityMigrations = pgTable(
  'compatibility_migrations',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .unique()
      .references(() => organization.id, { onDelete: 'cascade' }),
    sourceTemplateId: text('source_template_id')
      .notNull()
      .references(() => businessTemplates.id, { onDelete: 'restrict' }),
    sourceTemplateVersion: integer('source_template_version').notNull(),
    status: text('status')
      .$type<CompatibilityMigrationStatus>()
      .notNull()
      .default('pending_review'),
    report: json('report')
      .$type<CompatibilityMigrationReport>()
      .notNull()
      .default({} as CompatibilityMigrationReport),
    reviewedBy: text('reviewed_by'),
    reviewedAt: timestamp('reviewed_at'),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('idx_compatibility_migrations_status').on(table.status)],
)

export const CONFIGURATION_ELEMENT_TYPES = [
  'product',
  'workflow_stage',
  'requirement',
  'document',
  'material',
  'regional_setting',
  'fulfillment_default',
  'pricing_rule',
] as const
export type ConfigurationElementType =
  (typeof CONFIGURATION_ELEMENT_TYPES)[number]

export const CONFIGURATION_PROVENANCES = [
  'inherited',
  'customized',
  'organization_added',
] as const
export type ConfigurationProvenance = (typeof CONFIGURATION_PROVENANCES)[number]

export const configurationElements = pgTable(
  'configuration_elements',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    configId: text('config_id')
      .notNull()
      .references(() => organizationConfigurations.id, {
        onDelete: 'cascade',
      }),
    elementType: text('element_type')
      .$type<ConfigurationElementType>()
      .notNull(),
    elementKey: text('element_key').notNull(),
    provenance: text('provenance')
      .$type<ConfigurationProvenance>()
      .notNull()
      .default('inherited'),
    sourceTemplateId: text('source_template_id').references(
      () => businessTemplates.id,
      { onDelete: 'set null' },
    ),
    sourceTemplateVersion: integer('source_template_version'),
    data: json('data').$type<Record<string, unknown>>().notNull().default({}),
    originalData: json('original_data').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_config_elements_org_type_key').on(
      table.orgId,
      table.elementType,
      table.elementKey,
    ),
  ],
)

export const UPGRADE_PROPOSAL_STATUSES = [
  'pending_review',
  'accepted',
  'rejected',
  'applied',
  'failed',
] as const
export type UpgradeProposalStatus = (typeof UPGRADE_PROPOSAL_STATUSES)[number]

export const templateUpgradeProposals = pgTable('template_upgrade_proposals', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  sourceTemplateId: text('source_template_id')
    .notNull()
    .references(() => businessTemplates.id, { onDelete: 'restrict' }),
  sourceTemplateVersion: integer('source_template_version').notNull(),
  targetTemplateId: text('target_template_id')
    .notNull()
    .references(() => businessTemplates.id, { onDelete: 'restrict' }),
  targetTemplateVersion: integer('target_template_version').notNull(),
  status: text('status')
    .$type<UpgradeProposalStatus>()
    .notNull()
    .default('pending_review'),
  preview: json('preview')
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  conflicts: json('conflicts')
    .$type<Array<Record<string, unknown>>>()
    .notNull()
    .default([]),
  additions: json('additions')
    .$type<Array<Record<string, unknown>>>()
    .notNull()
    .default([]),
  removals: json('removals')
    .$type<Array<Record<string, unknown>>>()
    .notNull()
    .default([]),
  semanticChanges: json('semantic_changes')
    .$type<Array<Record<string, unknown>>>()
    .notNull()
    .default([]),
  rejectedAt: timestamp('rejected_at'),
  appliedAt: timestamp('applied_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  businessName: text('business_name'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  notes: text('notes'),
  active: boolean('active').notNull().default(true),
  addressId: text('address_id').references(() => addresses.id, {
    onDelete: 'set null',
  }),
  isWni: boolean('is_wni').notNull().default(true),
  photoAssetId: text('photo_asset_id').references(() => assets.id, {
    onDelete: 'set null',
  }),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  active: boolean('active').notNull().default(true),
  priority: boolean('priority').notNull().default(false),
  productionNotes: text('production_notes'),
  primaryImageAssetId: text('primary_image_asset_id').references(
    () => assets.id,
    { onDelete: 'set null' },
  ),
  basePrice: integer('base_price').notNull().default(0),
  productionDays: integer('production_days').notNull().default(1),
  minQuantity: integer('min_quantity').notNull().default(1),
  maxQuantity: integer('max_quantity'),
  negotiateAboveQuantity: integer('negotiate_above_quantity'),
  repeatOrderUnitPrice: integer('repeat_order_unit_price'),
  repeatOrderMinQuantity: integer('repeat_order_min_quantity'),
  maxProductionQuantity: integer('max_production_quantity'),
  pricingMode: text('pricing_mode').notNull().default('interpolated'),
  category: text('category'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const pricingBreakpoints = pgTable('pricing_breakpoints', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  minQuantity: integer('min_quantity').notNull().default(1),
  unitPrice: real('unit_price').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const productAddons = pgTable('product_addons', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  unitSurcharge: real('unit_surcharge').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Product Fields (Configurable typed fields) ──────────────────────────────

export const PRODUCT_FIELD_TYPES = [
  'select',
  'multi_select',
  'number_with_unit',
  'boolean',
  'size_color_matrix',
  'artwork',
  'supporting_file',
] as const
export type ProductFieldType = (typeof PRODUCT_FIELD_TYPES)[number]

export type ProductFieldOption = {
  value: string
  label: string
  /** Surcharge applied when this option is selected (additive to base). */
  surcharge?: number
  /** Material surcharge per unit. */
  materialSurcharge?: number
}

export type SizeColorMatrix = {
  sizes: string[]
  colors: Array<{ name: string; hex?: string }>
}

export const productFields = pgTable(
  'product_fields',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    fieldType: text('field_type').$type<ProductFieldType>().notNull(),
    fieldKey: text('field_key').notNull(),
    label: text('label').notNull(),
    unit: text('unit'),
    required: boolean('required').notNull().default(false),
    options: json('options').$type<ProductFieldOption[]>().default([]),
    validationRules: json('validation_rules')
      .$type<Record<string, unknown>>()
      .default({}),
    matrix: json('matrix').$type<SizeColorMatrix | null>(),
    sortOrder: integer('sort_order').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_product_fields_product_key').on(
      table.productId,
      table.fieldKey,
    ),
    index('idx_product_fields_org_product').on(table.orgId, table.productId),
  ],
)

// ─── Product Constraints (Declarative validation rules) ──────────────────────

export const CONSTRAINT_TYPES = [
  'required_combo',
  'incompatible_values',
  'numeric_range',
  'dimensional_relationship',
  'matrix_rule',
] as const
export type ConstraintType = (typeof CONSTRAINT_TYPES)[number]

export const productConstraints = pgTable(
  'product_constraints',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    constraintType: text('constraint_type').$type<ConstraintType>().notNull(),
    name: text('name').notNull(),
    rule: json('rule').$type<Record<string, unknown>>().notNull().default({}),
    errorMessage: text('error_message').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_product_constraints_org_product').on(
      table.orgId,
      table.productId,
    ),
  ],
)

// ─── Specifications (Customer/staff submissions) ─────────────────────────────

export const SPECIFICATION_STATUSES = [
  'draft',
  'submitted',
  'validated',
  'pricing_review',
  'priced',
  'committed',
  'rejected',
] as const
export type SpecificationStatus = (typeof SPECIFICATION_STATUSES)[number]

export const specifications = pgTable(
  'specifications',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    orderId: text('order_id').references(() => orders.id, {
      onDelete: 'set null',
    }),
    submittedBy: text('submitted_by').notNull(),
    submittedByRole: text('submitted_by_role').notNull().default('customer'),
    status: text('status')
      .$type<SpecificationStatus>()
      .notNull()
      .default('draft'),
    fieldValues: json('field_values')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    /** Resolved labels and units for display after validation. */
    resolvedDisplay: json('resolved_display')
      .$type<
        Record<string, { label: string; unit?: string; displayValue: string }>
      >()
      .default({}),
    quantity: integer('quantity').notNull().default(1),
    validationErrors: json('validation_errors')
      .$type<Array<{ fieldKey?: string; message: string; code: string }>>()
      .default([]),
    pricingStatus: text('pricing_status').default('pending'),
    pricingReviewReason: text('pricing_review_reason'),
    rejectionReason: text('rejection_reason'),
    committedAt: timestamp('committed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_specifications_org_product').on(table.orgId, table.productId),
    index('idx_specifications_org_status').on(table.orgId, table.status),
    index('idx_specifications_order').on(table.orderId),
  ],
)

// ─── Specification Snapshots (Immutable committed state) ─────────────────────

export const specificationSnapshots = pgTable('specification_snapshots', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  specificationId: text('specification_id')
    .notNull()
    .references(() => specifications.id, { onDelete: 'restrict' }),
  /** Frozen product config at commit time. */
  productSnapshot: json('product_snapshot')
    .$type<Record<string, unknown>>()
    .notNull(),
  /** Frozen field values at commit time. */
  fieldValuesSnapshot: json('field_values_snapshot')
    .$type<Record<string, unknown>>()
    .notNull(),
  /** Frozen pricing at commit time. */
  priceSnapshot: json('price_snapshot')
    .$type<Record<string, unknown>>()
    .notNull(),
  quantity: integer('quantity').notNull(),
  committedBy: text('committed_by').notNull(),
  committedAt: timestamp('committed_at').notNull().defaultNow(),
})

// ─── Pricing Basis (Approved pricing foundation per product) ──────────────────

export const PRICING_BASIS_TYPES = ['flat', 'interpolated', 'tiered'] as const
export type PricingBasisType = (typeof PRICING_BASIS_TYPES)[number]

export const ROUNDING_MODES = [
  'half_up',
  'half_down',
  'ceil',
  'floor',
  'bankers',
] as const
export type RoundingMode = (typeof ROUNDING_MODES)[number]

export const pricingBasis = pgTable(
  'pricing_basis',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .unique()
      .references(() => products.id, { onDelete: 'cascade' }),
    basisType: text('basis_type')
      .$type<PricingBasisType>()
      .notNull()
      .default('flat'),
    currency: text('currency').notNull().default('IDR'),
    /** Number of decimal places for the currency. */
    precision: integer('precision').notNull().default(0),
    roundingMode: text('rounding_mode')
      .$type<RoundingMode>()
      .notNull()
      .default('half_up'),
    /** Minimum price after all effects applied. */
    minimumPrice: real('minimum_price'),
    approved: boolean('approved').notNull().default(false),
    approvedAt: timestamp('approved_at'),
    approvedBy: text('approved_by'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_pricing_basis_org_product').on(table.orgId, table.productId),
  ],
)

// ─── Pricing Rules (Quantity breaks and effects) ─────────────────────────────

export const PRICING_EFFECT_TYPES = [
  'quantity_break',
  'option_surcharge',
  'material_effect',
  'decoration_method',
  'placement_surcharge',
  'setup_charge',
  'additive',
  'percentage',
  'surcharge',
  'conditional',
] as const
export type PricingEffectType = (typeof PRICING_EFFECT_TYPES)[number]

export const pricingRules = pgTable(
  'pricing_rules',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    effectType: text('effect_type').$type<PricingEffectType>().notNull(),
    name: text('name').notNull(),
    /** For quantity_break: min quantity for this tier. */
    minQuantity: integer('min_quantity'),
    /** For quantity_break: max quantity for this tier. */
    maxQuantity: integer('max_quantity'),
    /** Flat amount (can be negative for discounts). */
    amount: real('amount'),
    /** Percentage effect (e.g. 0.05 for 5%). */
    percentage: real('percentage'),
    /** Which field key this rule applies to (for option/material/decoration effects). */
    fieldKey: text('field_key'),
    /** Which option value triggers this rule. */
    optionValue: text('option_value'),
    /** Conditional rule expression (JSON-evaluated). */
    condition: json('condition').$type<Record<string, unknown>>(),
    /** Whether this is a one-time setup charge. */
    isSetup: boolean('is_setup').notNull().default(false),
    /** Priority for ordering rule evaluation. */
    priority: integer('priority').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_pricing_rules_org_product').on(table.orgId, table.productId),
    index('idx_pricing_rules_product_type').on(
      table.productId,
      table.effectType,
    ),
  ],
)

// ─── Pricing Extensions (Versioned, deterministic add-ons) ───────────────────

export const PRICING_EXTENSION_STATUSES = [
  'active',
  'failed',
  'unavailable',
] as const
export type PricingExtensionStatus = (typeof PRICING_EXTENSION_STATUSES)[number]

export const pricingExtensions = pgTable(
  'pricing_extensions',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    version: integer('version').notNull().default(1),
    status: text('status')
      .$type<PricingExtensionStatus>()
      .notNull()
      .default('active'),
    /** Extension logic is deterministic and cannot mutate specification. */
    config: json('config')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    /** What this extension calculates. */
    effectType: text('effect_type').notNull(),
    priority: integer('priority').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_pricing_extensions_org_product').on(
      table.orgId,
      table.productId,
    ),
  ],
)

// ─── Price Overrides (Audited manual adjustments) ────────────────────────────

export const priceOverrides = pgTable('price_overrides', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  specificationId: text('specification_id')
    .notNull()
    .references(() => specifications.id, { onDelete: 'restrict' }),
  originalPrice: real('original_price').notNull(),
  overridePrice: real('override_price').notNull(),
  /** Immutable reason — cannot be changed after creation. */
  reason: text('reason').notNull(),
  overrideBy: text('override_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ─── Specification Prices (Committed price breakdown) ────────────────────────

export const specificationPrices = pgTable('specification_prices', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  specificationId: text('specification_id')
    .notNull()
    .references(() => specifications.id, { onDelete: 'restrict' }),
  currency: text('currency').notNull().default('IDR'),
  unitPrice: real('unit_price').notNull(),
  totalPrice: real('total_price').notNull(),
  quantity: integer('quantity').notNull(),
  /** Human-readable breakdown of all price components. */
  breakdown: json('breakdown')
    .$type<
      Array<{
        label: string
        type: string
        amount: number
        unitAmount?: number
      }>
    >()
    .notNull()
    .default([]),
  /** Whether this price was manually overridden. */
  isOverridden: boolean('is_overridden').notNull().default(false),
  overrideId: text('override_id').references(() => priceOverrides.id, {
    onDelete: 'set null',
  }),
  /** Status of required extensions at pricing time. */
  extensionStatuses: json('extension_statuses')
    .$type<
      Array<{
        extensionId: string
        name: string
        status: string
        error?: string
      }>
    >()
    .notNull()
    .default([]),
  committedAt: timestamp('committed_at'),
  committedBy: text('committed_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const organizationProfiles = pgTable('organization_profiles', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .unique()
    .references(() => organization.id, { onDelete: 'cascade' }),
  displayName: text('display_name'),
  phone: text('phone'),
  email: text('email'),
  logoAssetId: text('logo_asset_id').references(() => assets.id, {
    onDelete: 'set null',
  }),
  addressId: text('address_id').references(() => addresses.id, {
    onDelete: 'set null',
  }),
  lateFeePerDay: integer('late_fee_per_day').notNull().default(0),
  midtransServerKey: text('midtrans_server_key'),
  midtransClientKey: text('midtrans_client_key'),
  midtransIsProduction: boolean('midtrans_is_production')
    .notNull()
    .default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id, {
    onDelete: 'restrict',
  }),
  status: text('status').notNull().default('draft'),
  notes: text('notes'),
  total: real('total').notNull().default(0),
  orderNumber: text('order_number'),
  orderToken: text('order_token').unique(),
  validUntil: timestamp('valid_until'),
  shippingAddress: json('shipping_address'),
  approvedAt: timestamp('approved_at'),
  approvedBy: text('approved_by'),
  rejectedAt: timestamp('rejected_at'),
  rejectedBy: text('rejected_by'),
  rejectReason: text('reject_reason'),
  courier: text('courier'),
  trackingNumber: text('tracking_number'),
  shippedAt: timestamp('shipped_at'),
  deadline: timestamp('deadline'),
  manualDeadline: boolean('manual_deadline').notNull().default(false),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const orderLineItems = pgTable('order_line_items', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  productName: text('product_name').notNull().default(''),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: real('unit_price').notNull(),
  total: real('total').notNull(),
  designName: text('design_name'),
  notes: text('notes'),
  assetId: text('asset_id').references(() => assets.id, {
    onDelete: 'set null',
  }),
  productionDays: integer('production_days').notNull().default(1),
  deadline: timestamp('deadline').notNull().defaultNow(),
  isRepeatOrder: boolean('is_repeat_order').notNull().default(false),
  manualDeadline: boolean('manual_deadline').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const orderLineItemAddons = pgTable('order_line_item_addons', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  lineItemId: text('line_item_id')
    .notNull()
    .references(() => orderLineItems.id, { onDelete: 'cascade' }),
  productAddonId: text('product_addon_id').references(() => productAddons.id, {
    onDelete: 'set null',
  }),
  name: text('name').notNull(),
  unitSurcharge: real('unit_surcharge').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
export const FULFILLMENT_TYPES = ['shipping', 'pickup'] as const
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number]

export const FULFILLMENT_STATUSES = [
  'unfulfilled',
  'processing',
  'ready_for_pickup',
  'shipped',
  'out_for_delivery',
  'delivered',
  'picked_up',
  'completed',
  'cancelled',
] as const
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number]

export const fulfillments = pgTable('fulfillments', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  type: text('type').$type<FulfillmentType>().notNull().default('shipping'),
  status: text('status')
    .$type<FulfillmentStatus>()
    .notNull()
    .default('unfulfilled'),
  shippingAddress: json('shipping_address'),
  courier: text('courier'),
  service: text('service'),
  trackingNumber: text('tracking_number'),
  packageDetails: json('package_details').$type<{
    weightGrams?: number
    dimensionsCm?: { length: number; width: number; height: number }
    packageCount?: number
    contents?: string
  }>(),
  snapshot: json('snapshot').$type<Record<string, unknown>>(),
  shippedAt: timestamp('shipped_at'),
  deliveredAt: timestamp('delivered_at'),
  pickedUpAt: timestamp('picked_up_at'),
  pickupNotes: text('pickup_notes'),
  recipientName: text('recipient_name'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const customerTokens = pgTable('customer_tokens', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  scope: json('scope').$type<{ readonly: boolean; orderId: string }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const paymentMethods = pgTable('payment_methods', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull().default('bank_transfer'),
  bankName: text('bank_name'),
  accountNumber: text('account_number'),
  accountHolder: text('account_holder'),
  instructions: text('instructions'),
  isDefault: boolean('is_default').notNull().default(false),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const invoices = pgTable(
  'invoices',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    invoiceNumber: text('invoice_number').notNull(),
    orderId: text('order_id').references(() => orders.id, {
      onDelete: 'set null',
    }),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    customerName: text('customer_name').notNull(),
    status: text('status').notNull().default('unpaid'),
    percentage: real('percentage'),
    subtotal: real('subtotal').notNull(),
    total: real('total').notNull(),
    currency: text('currency').notNull().default('IDR'),
    dueDate: date('due_date').notNull(),
    paymentProvider: text('payment_provider')
      .notNull()
      .default('bank_transfer'),
    issuedDate: date('issued_date').notNull().defaultNow(),
    paymentMethodId: text('payment_method_id').references(
      () => paymentMethods.id,
      { onDelete: 'set null' },
    ),
    paidAt: timestamp('paid_at'),
    paidBy: text('paid_by'),
    lateFee: real('late_fee').notNull().default(0),
    notes: text('notes'),
    midtransOrderId: text('midtrans_order_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_invoices_org_number').on(table.orgId, table.invoiceNumber),
  ],
)
export const midtransTransactions = pgTable(
  'midtrans_transactions',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    orderId: text('order_id').notNull().unique(),
    expectedAmount: real('expected_amount').notNull(),
    grossAmount: real('gross_amount'),
    transactionId: text('transaction_id'),
    transactionStatus: text('transaction_status').notNull().default('created'),
    errorMessage: text('error_message'),
    failedAt: timestamp('failed_at'),
    fraudStatus: text('fraud_status'),
    paymentType: text('payment_type'),
    settlementTime: timestamp('settlement_time'),
    refundedAmount: real('refunded_amount').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_midtrans_transactions_org_id').on(table.orgId),
    index('idx_midtrans_transactions_invoice_id').on(table.invoiceId),
    index('idx_midtrans_transactions_status').on(table.transactionStatus),
  ],
)
export const invoiceLineItems = pgTable('invoice_line_items', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  lineType: text('line_type').notNull().default('product'),
  taxPercent: real('tax_percent').notNull().default(0),
  total: real('total').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Requirement = {
  id: string
  label: string
  type:
    | 'text'
    | 'number'
    | 'measurement'
    | 'pass_fail'
    | 'non_conformance'
    | 'upload'
    | 'photo'
    | 'material'
  required: boolean
  unit?: string
  targetValue?: number
  tolerance?: number
  materialKey?: string
  estimatedQuantity?: number
  wasteAllowance?: number
}

export const payments = pgTable(
  'payments',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    amount: real('amount').notNull(),
    method: text('method').notNull().default('bank_transfer'),
    reference: text('reference'),
    proofAssetId: text('proof_asset_id').references(() => assets.id, {
      onDelete: 'set null',
    }),
    status: text('status').notNull().default('pending'),
    receivedAt: timestamp('received_at'),
    confirmedAt: timestamp('confirmed_at'),
    confirmedBy: text('confirmed_by'),
    rejectedReason: text('rejected_reason'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_payments_org_id').on(table.orgId),
    index('idx_payments_invoice_id').on(table.invoiceId),
    index('idx_payments_status').on(table.status),
    uniqueIndex('idx_payments_midtrans_reference')
      .on(table.orgId, table.invoiceId, table.reference)
      .where(sql`${table.method} = 'midtrans'`),
  ],
)

export const productionStages = pgTable('production_stages', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  board: text('board').notNull().default('pre_production'),
  description: text('description'),
  needApproval: boolean('need_approval').notNull().default(false),
  requirements: json('requirements')
    .$type<Requirement[]>()
    .notNull()
    .default([]),
  orderIndex: integer('order_index').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const productionTasks = pgTable('production_tasks', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  board: text('board').notNull().default('pre_production'),
  stageId: text('stage_id').references(() => productionStages.id, {
    onDelete: 'restrict',
  }),
  status: text('status').notNull().default('queued'),
  taskNumber: text('task_number'),
  lineItemId: text('line_item_id'),
  priority: boolean('priority').notNull().default(false),
  context: json('context')
    .$type<{
      productName: string
      designName?: string | null
      customerName: string
      customerId?: string | null
      customerEmail?: string | null
      customerPhone?: string | null
      requirements: string | null
      specification?: string | null
      files?: Array<{ id: string; url?: string; filename?: string }> | null
      orderNumber?: string
      orderTotal?: number
      currency?: string
      quantity?: number
      unitPrice?: number
      total?: number
      deadline?: string
      materials?: Array<{
        key: string
        name: string
        unit: string
        estimatedQuantity?: number | null
        wasteAllowance?: number | null
        supplier?: string | null
      }> | null
      requirementResponses?: Record<
        string,
        {
          assetIds?: string[]
          value?: string
          pass?: boolean
          numericValue?: number
          unit?: string
          notes?: string
        }
      >
    }>()
    .default({
      productName: '',
      customerName: '',
      requirements: null,
    }),
  assignedTo: text('assigned_to'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  archivedAt: timestamp('archived_at'),
})

export const taskActivity = pgTable('task_activity', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  taskId: text('task_id')
    .notNull()
    .references(() => productionTasks.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  fromStageId: text('from_stage_id').references(() => productionStages.id, {
    onDelete: 'set null',
  }),
  toStageId: text('to_stage_id').references(() => productionStages.id, {
    onDelete: 'set null',
  }),
  data: json('data').$type<Record<string, unknown>>().default({}),
  actorId: text('actor_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const shopFloorDevices = pgTable(
  'shop_floor_devices',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    code: text('code').notNull(),
    secretHash: text('secret_hash').notNull(),
    status: text('status').notNull().default('active'),
    allowedStageIds: json('allowed_stage_ids').$type<string[]>().default([]),
    lastActiveAt: timestamp('last_active_at'),
    registeredBy: text('registered_by').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    revokedAt: timestamp('revoked_at'),
  },
  (table) => [
    index('idx_shop_floor_devices_org_id').on(table.orgId),
    uniqueIndex('idx_shop_floor_devices_code').on(table.orgId, table.code),
  ],
)

export type ShopFloorDevice = typeof shopFloorDevices.$inferSelect
export type NewShopFloorDevice = typeof shopFloorDevices.$inferInsert

export const activityEvents = pgTable('activity_events', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  actorId: text('actor_id').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  action: text('action').notNull(),
  details: json('details').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const assets = pgTable('assets', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  ownerType: text('owner_type').notNull(),
  ownerId: text('owner_id'),
  draftId: text('draft_id'),
  usage: text('usage').notNull(),
  assetKind: text('asset_kind').notNull(),
  originalFilename: text('original_filename').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  uploadedByUserId: text('uploaded_by_user_id').notNull(),
  status: text('status').notNull().default('pending'),
  checksumSha256: text('checksum_sha256'),
  imageWidth: integer('image_width'),
  imageHeight: integer('image_height'),
  videoDurationSeconds: integer('video_duration_seconds'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const assetVariants = pgTable('asset_variants', {
  id: text('id').primaryKey(),
  assetId: text('asset_id')
    .notNull()
    .references(() => assets.id, { onDelete: 'cascade' }),
  variantKey: text('variant_key').notNull(),
  storageKey: text('storage_key').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  width: integer('width'),
  height: integer('height'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const assistantActions = pgTable(
  'assistant_actions',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    threadId: text('thread_id').notNull(),
    kind: text('kind').notNull(),
    status: text('status').notNull().default('pending'),
    payload: json('payload').$type<AssistantActionPayload>().notNull(),
    resultOrderId: text('result_order_id'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_assistant_actions_org_user_thread').on(
      table.orgId,
      table.userId,
      table.threadId,
    ),
    index('idx_assistant_actions_status').on(table.status),
    index('idx_assistant_actions_expires').on(table.expiresAt),
  ],
)

export type AssistantActionPayload = {
  lineItems: Array<{
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    total: number
    minQuantity: number
  }>
  customerId: string | null
  customerName: string | null
  total: number
}

export const CONNECTED_CHANNEL_STATUSES = ['connected', 'disconnected'] as const
export type ConnectedChannelStatus = (typeof CONNECTED_CHANNEL_STATUSES)[number]

export const CHANNEL_ACCESS_STATUSES = [
  'pending',
  'approved',
  'revoked',
] as const
export type ChannelAccessStatus = (typeof CHANNEL_ACCESS_STATUSES)[number]

export const CHANNEL_TYPES = ['telegram'] as const
export type ChannelType = (typeof CHANNEL_TYPES)[number]

export const connectedChannels = pgTable(
  'connected_channels',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    channelType: text('channel_type')
      .$type<ChannelType>()
      .notNull()
      .default('telegram'),
    status: text('status')
      .$type<ConnectedChannelStatus>()
      .notNull()
      .default('connected'),
    telegramBotId: text('telegram_bot_id').notNull(),
    telegramBotUsername: text('telegram_bot_username'),
    telegramBotName: text('telegram_bot_name').notNull(),
    botToken: text('bot_token').notNull(),
    webhookSecret: text('webhook_secret').notNull(),
    connectionVersion: integer('connection_version').notNull().default(1),
    connectedAt: timestamp('connected_at').notNull().defaultNow(),
    disconnectedAt: timestamp('disconnected_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_connected_channels_org_type').on(
      table.orgId,
      table.channelType,
    ),
    uniqueIndex('idx_connected_channels_webhook_secret').on(
      table.webhookSecret,
    ),
    uniqueIndex('idx_connected_channels_type_bot').on(
      table.channelType,
      table.telegramBotId,
    ),
  ],
)

export const messagingIdentities = pgTable(
  'messaging_identities',
  {
    id: text('id').primaryKey(),
    channelType: text('channel_type')
      .$type<ChannelType>()
      .notNull()
      .default('telegram'),
    providerUserId: text('provider_user_id').notNull(),
    displayName: text('display_name').notNull(),
    username: text('username'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_messaging_identities_provider').on(
      table.channelType,
      table.providerUserId,
    ),
  ],
)

export const channelAccesses = pgTable(
  'channel_accesses',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    connectedChannelId: text('connected_channel_id')
      .notNull()
      .references(() => connectedChannels.id, { onDelete: 'cascade' }),
    messagingIdentityId: text('messaging_identity_id')
      .notNull()
      .references(() => messagingIdentities.id, { onDelete: 'cascade' }),
    status: text('status')
      .$type<ChannelAccessStatus>()
      .notNull()
      .default('pending'),
    requestedAt: timestamp('requested_at').notNull().defaultNow(),
    approvedAt: timestamp('approved_at'),
    revokedAt: timestamp('revoked_at'),
    startedConnectionVersion: integer('started_connection_version'),
    startedAt: timestamp('started_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_channel_accesses_channel_identity').on(
      table.connectedChannelId,
      table.messagingIdentityId,
    ),
    index('idx_channel_accesses_org_status').on(table.orgId, table.status),
  ],
)

export const telegramProcessedUpdates = pgTable(
  'telegram_processed_updates',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    connectedChannelId: text('connected_channel_id')
      .notNull()
      .references(() => connectedChannels.id, { onDelete: 'cascade' }),
    updateId: text('update_id').notNull(),
    processedAt: timestamp('processed_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_telegram_updates_channel_update').on(
      table.connectedChannelId,
      table.updateId,
    ),
    index('idx_telegram_updates_org').on(table.orgId),
  ],
)

// ─── Audit Events (Platform-level audit trail) ────────────────────────────────

export const AUDIT_ACTION_TYPES = [
  'organization.created',
  'organization.updated',
  'organization.suspended',
  'organization.restored',
  'plan.created',
  'plan.updated',
  'plan.versioned',
  'subscription.changed',
  'subscription.canceled',
  'subscription.suspended',
  'subscription.restored',
  'trial.started',
  'trial.extended',
  'exception.granted',
  'exception.revoked',
  'retention.applied',
  'export.created',
  'migration.reviewed',
  'migration.accepted',
  'member.role_changed',
  'admin.action',
] as const
export type AuditActionType = (typeof AUDIT_ACTION_TYPES)[number]

export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id').notNull(),
    actorName: text('actor_name').notNull(),
    organizationId: text('organization_id').references(() => organization.id, {
      onDelete: 'set null',
    }),
    organizationName: text('organization_name'),
    action: text('action').$type<AuditActionType>().notNull(),
    reason: text('reason'),
    details: json('details').$type<Record<string, unknown>>().default({}),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_audit_events_actor').on(table.actorId),
    index('idx_audit_events_organization').on(table.organizationId),
    index('idx_audit_events_action').on(table.action),
    index('idx_audit_events_created').on(table.createdAt),
  ],
)

export type AuditEvent = typeof auditEvents.$inferSelect
export type NewAuditEvent = typeof auditEvents.$inferInsert

// ─── Platform Admin Users ─────────────────────────────────────────────────────

export const platformAdminUsers = pgTable(
  'platform_admin_users',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    grantedBy: text('granted_by').notNull(),
    grantedAt: timestamp('granted_at').notNull().defaultNow(),
    revokedAt: timestamp('revoked_at'),
    revokedBy: text('revoked_by'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_platform_admin_user').on(table.userId),
    index('idx_platform_admin_active').on(table.userId, table.revokedAt),
  ],
)

export type PlatformAdminUser = typeof platformAdminUsers.$inferSelect
