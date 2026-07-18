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
  type: 'text' | 'number' | 'upload'
  required: boolean
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
      requirements: string | null
      orderNumber?: string
      quantity?: number
      deadline?: string
      requirementResponses?: Record<
        string,
        { assetIds?: string[]; value?: string }
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
