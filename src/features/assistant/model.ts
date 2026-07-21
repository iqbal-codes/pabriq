import { and, asc, eq, inArray, isNull, like, or, sql } from 'drizzle-orm'
import { db } from '#/db/index'
import type { AssistantActionPayload } from '#/db/schema'
import * as schema from '#/db/schema'
import {
  createCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from '#/features/customers/model'
import { listInvoices } from '#/features/invoices/model'
import {
  createDraftOrderFromAction,
  getOrder,
  getOrderCreationReadiness,
  listOrders,
  updateDraftOrder,
} from '#/features/orders/model'
import { type Breakpoint, calculateUnitPrice } from '#/features/pricing/engine'
import { listBoardTasks } from '#/features/production/model'
import {
  createProduct,
  getProduct,
  listProductRows,
  listProducts,
  updateProduct,
} from '#/features/products/model'
import { buildPortalUrl } from '#/lib/domain-routing'

export const assistantDomains = [
  'customers',
  'products',
  'orders',
  'invoices',
  'production',
] as const

export type AssistantDomain = (typeof assistantDomains)[number]

export type AssistantRole = 'owner' | 'admin'

export type AssistantToolContext = {
  orgId: string
  userId: string
  role: AssistantRole
}

export type AssistantRecord = {
  domain: AssistantDomain
  id: string
  title: string
  subtitle: string | null
  href: string | null
  metadata: Record<string, string | number | boolean | null>
}

export type AssistantSearchResult = {
  records: AssistantRecord[]
  omittedDomains: AssistantDomain[]
}

export type AssistantOverview = {
  customers: number | null
  activeProducts: number | null
  openOrders: number | null
  unpaidInvoices: number | null
  activeProductionTasks: number | null
  omittedDomains: AssistantDomain[]
}

export type ResolvedLineItem = {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
  minQuantity: number
}

export type OrderDraftResolution = {
  status: 'resolved' | 'ambiguous' | 'invalid'
  lineItems?: ResolvedLineItem[]
  missing?: Array<{
    productHint: string
    quantity: number
    matchedProductIds: string[]
  }>
  missingPrerequisites?: Array<
    | 'business_address'
    | 'production_stages'
    | 'active_products'
    | 'payment_methods'
  >
  customer?: {
    id: string
    name: string
    phone: string | null
    hasAddress: boolean
  } | null
  customerAmbiguous?: Array<{ id: string; name: string }>
  total: number
}

export type AssistantChatMessageMetadata =
  | {
      kind: 'order_draft_proposal'
      actionId: string
      expiresAt: string
    }
  | { kind: 'order_draft_cancelled'; actionId: string }
  | { kind: 'order_draft_error'; actionId: string; reason: string }

export type AssistantStreamToolCall = {
  toolCallId: string
  toolName: string
  status: 'running' | 'done' | 'error'
  summary: string | null
}

export type AssistantChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  clientMessageId?: string | null
  metadata?: AssistantChatMessageMetadata
  toolCalls?: AssistantStreamToolCall[]
}

export type AssistantMemoryScope = {
  thread: string
  resource: string
}

export function getAssistantAllowedDomains(
  _role: AssistantRole,
): readonly AssistantDomain[] {
  return assistantDomains
}

export function buildAssistantMemoryScope(
  context: Pick<AssistantToolContext, 'orgId' | 'userId'>,
): AssistantMemoryScope {
  return {
    thread: `assistant:${context.orgId}:${context.userId}`,
    resource: `org:${context.orgId}:user:${context.userId}`,
  }
}

export function normalizeMastraMemoryMessages(
  messages: unknown[],
): AssistantChatMessage[] {
  const result: AssistantChatMessage[] = []

  for (const msg of messages) {
    const record = msg as Record<string, unknown>
    const role = record.role as string | undefined
    if (role !== 'user' && role !== 'assistant') continue

    const createdAt = record.createdAt as string | Date | undefined
    const id = (record.id as string | undefined) ?? crypto.randomUUID()

    const contentObj = record.content as
      | Record<string, unknown>
      | undefined
      | null
    const metadata = (contentObj?.metadata ??
      (record as Record<string, unknown>).metadata) as
      | AssistantChatMessageMetadata
      | undefined

    const text = extractTextContent(record.content)
    const toolCalls = extractToolCalls(record.content)
    if (!text && !metadata && toolCalls.length === 0) continue

    result.push({
      id,
      role: role as 'user' | 'assistant',
      content: text ?? '',
      createdAt:
        createdAt instanceof Date
          ? createdAt.toISOString()
          : (createdAt ?? new Date().toISOString()),
      metadata,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    })
  }

  result.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  return result
}

function getContentParts(content: unknown): unknown[] {
  if (Array.isArray(content)) return content
  if (!content || typeof content !== 'object') return []
  const parts = (content as Record<string, unknown>).parts
  return Array.isArray(parts) ? parts : []
}

function extractTextContent(content: unknown): string | null {
  if (typeof content === 'string' && content.trim()) return content.trim()
  if (!content || typeof content !== 'object') return null

  const obj = content as Record<string, unknown>
  if (typeof obj.text === 'string' && obj.text.trim()) return obj.text.trim()
  if (typeof obj.content === 'string' && obj.content.trim())
    return obj.content.trim()

  const texts = getContentParts(content).flatMap((part) => {
    if (!part || typeof part !== 'object') return []
    const record = part as Record<string, unknown>
    return record.type === 'text' && typeof record.text === 'string'
      ? [record.text]
      : []
  })
  return texts.length > 0 ? texts.join('\n').trim() : null
}

function extractToolCalls(content: unknown): AssistantStreamToolCall[] {
  const calls = new Map<string, AssistantStreamToolCall>()
  for (const part of getContentParts(content)) {
    const call = normalizeToolInvocation(part)
    if (call) calls.set(call.toolCallId, call)
  }
  return [...calls.values()]
}

function normalizeToolInvocation(
  part: unknown,
): AssistantStreamToolCall | null {
  if (!part || typeof part !== 'object') return null
  const record = part as Record<string, unknown>
  if (record.type !== 'tool-invocation') return null

  const invocation = record.toolInvocation
  if (!invocation || typeof invocation !== 'object') return null
  const data = invocation as Record<string, unknown>
  if (
    typeof data.toolCallId !== 'string' ||
    typeof data.toolName !== 'string'
  ) {
    return null
  }
  return {
    toolCallId: data.toolCallId,
    toolName: data.toolName,
    status:
      data.state === 'result'
        ? 'done'
        : data.state === 'error'
          ? 'error'
          : 'running',
    summary: null,
  }
}

export async function searchAssistantBusinessRecords(input: {
  context: AssistantToolContext
  query: string
  domains?: AssistantDomain[]
  limit?: number
}): Promise<AssistantSearchResult> {
  const allowed = getAssistantAllowedDomains(input.context.role)
  const requested = input.domains ?? [...assistantDomains]
  const filtered = requested.filter((d) => allowed.includes(d))
  const omittedDomains = requested.filter((d) => !allowed.includes(d))

  if (filtered.length === 0) {
    return { records: [], omittedDomains }
  }

  const limit = input.limit ?? 3
  const records: AssistantRecord[] = []

  await Promise.all(
    filtered.map(async (domain) => {
      const domainRecords = await searchDomain(
        domain,
        input.context.orgId,
        input.query,
        limit,
      )
      records.push(...domainRecords)
    }),
  )

  return { records, omittedDomains }
}

async function searchDomain(
  domain: AssistantDomain,
  orgId: string,
  query: string,
  limit: number,
): Promise<AssistantRecord[]> {
  switch (domain) {
    case 'customers': {
      const result = await listCustomers({
        orgId,
        search: query,
        page: 1,
        perPage: limit,
      })
      return result.rows.map(
        (row): AssistantRecord => ({
          domain: 'customers',
          id: row.id,
          title: row.name,
          subtitle: row.email ?? row.phone ?? null,
          href: `/customers/${row.id}`,
          metadata: { active: row.active },
        }),
      )
    }
    case 'products': {
      const rows = await listProducts({
        orgId,
        search: query,
        activeOnly: true,
        sortBy: 'name',
        sortDir: 'asc',
      })
      return rows.slice(0, limit).map(
        (row): AssistantRecord => ({
          domain: 'products',
          id: row.id,
          title: row.name,
          subtitle: row.description ?? null,
          href: `/products/${row.id}`,
          metadata: { active: row.active },
        }),
      )
    }
    case 'orders': {
      const result = await listOrders({
        orgId,
        search: query,
        page: 1,
        perPage: limit,
      })
      return result.rows.map(
        (row): AssistantRecord => ({
          domain: 'orders',
          id: row.id,
          title: row.orderNumber ?? row.id,
          subtitle: row.customerName ?? null,
          href: `/orders/${row.id}`,
          metadata: { status: row.status, total: row.total },
        }),
      )
    }
    case 'invoices': {
      const result = await listInvoices({
        orgId,
        q: query,
        page: 1,
        perPage: limit,
      })
      return result.rows.map(
        (row): AssistantRecord => ({
          domain: 'invoices',
          id: row.id,
          title: row.invoiceNumber,
          subtitle: row.customerName ?? null,
          href: null,
          metadata: { status: row.status, total: row.total },
        }),
      )
    }
    case 'production': {
      const board = await listBoardTasks(orgId, { search: query })
      const stageTasks = [...board.stages.values()].flat()
      const allTasks = [...board.queued, ...stageTasks, ...board.done]
      return allTasks.slice(0, limit).map(
        (bt): AssistantRecord => ({
          domain: 'production',
          id: bt.task.id,
          title: bt.task.taskNumber ?? bt.task.id,
          subtitle:
            (bt.task.context as Record<string, string | null> | null)
              ?.productName ?? null,
          href: '/production',
          metadata: { status: bt.task.status, board: bt.task.board },
        }),
      )
    }
  }
}

export async function getAssistantBusinessOverview(
  context: AssistantToolContext,
): Promise<AssistantOverview> {
  const allowed = getAssistantAllowedDomains(context.role)
  const omittedDomains = assistantDomains.filter(
    (d) => !allowed.includes(d),
  ) as AssistantDomain[]

  const canAccess = (domain: AssistantDomain) => allowed.includes(domain)

  const [
    customers,
    activeProducts,
    openOrders,
    unpaidInvoices,
    activeProductionTasks,
  ] = await Promise.all([
    canAccess('customers')
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(schema.customers)
          .where(eq(schema.customers.orgId, context.orgId))
          .then((r) => Number(r[0]?.count ?? 0))
      : Promise.resolve(null),
    canAccess('products')
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(schema.products)
          .where(
            and(
              eq(schema.products.orgId, context.orgId),
              eq(schema.products.active, true),
            ),
          )
          .then((r) => Number(r[0]?.count ?? 0))
      : Promise.resolve(null),
    canAccess('orders')
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(schema.orders)
          .where(
            and(
              eq(schema.orders.orgId, context.orgId),
              sql`${schema.orders.status} NOT IN ('completed', 'cancelled')`,
            ),
          )
          .then((r) => Number(r[0]?.count ?? 0))
      : Promise.resolve(null),
    canAccess('invoices')
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(schema.invoices)
          .where(
            and(
              eq(schema.invoices.orgId, context.orgId),
              sql`${schema.invoices.status} IN ('unpaid', 'partially_paid')`,
            ),
          )
          .then((r) => Number(r[0]?.count ?? 0))
      : Promise.resolve(null),
    canAccess('production')
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(schema.productionTasks)
          .where(
            and(
              eq(schema.productionTasks.orgId, context.orgId),
              isNull(schema.productionTasks.archivedAt),
            ),
          )
          .then((r) => Number(r[0]?.count ?? 0))
      : Promise.resolve(null),
  ])

  return {
    customers,
    activeProducts,
    openOrders,
    unpaidInvoices,
    activeProductionTasks,
    omittedDomains,
  }
}

function resolveProductPricing(params: {
  product: {
    id: string
    basePrice: number
    minQuantity: number
    pricingMode: string
  }
  breakpoints: Array<{ minQuantity: number; unitPrice: number }>
  quantity: number
}): { unitPrice: number; total: number; minQuantity: number } {
  const breakpoints: Breakpoint[] = params.breakpoints.map((bp) => ({
    minQuantity: bp.minQuantity,
    unitPrice: bp.unitPrice,
  }))

  const hasExplicitAtMinQty = breakpoints.some(
    (bp) => bp.minQuantity === params.product.minQuantity,
  )
  if (!hasExplicitAtMinQty) {
    breakpoints.unshift({
      minQuantity: params.product.minQuantity,
      unitPrice: params.product.basePrice,
    })
  }

  const result = calculateUnitPrice({
    quantity: params.quantity,
    breakpoints,
    mode: params.product.pricingMode as 'interpolated' | 'step',
  })
  if ('code' in result) {
    throw new Error(result.message)
  }

  return {
    unitPrice: result.unitPrice.amount,
    total: result.lineTotal.amount,
    minQuantity: params.product.minQuantity,
  }
}

function createLikeMatcher(search: string): RegExp {
  let source = ''
  let isEscaped = false

  for (const char of `%${search}%`) {
    if (isEscaped) {
      source += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      isEscaped = false
    } else if (char === '\\') {
      isEscaped = true
    } else if (char === '%') {
      source += '.*'
    } else if (char === '_') {
      source += '.'
    } else {
      source += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }

  return new RegExp(`^${source}$`, 'su')
}

export async function resolveOrderDraft(params: {
  orgId: string
  candidates: Array<{ productHint: string; quantity: number }>
  customerHint?: string | null
}): Promise<OrderDraftResolution> {
  const lineItems: ResolvedLineItem[] = []
  const missing: Array<{
    productHint: string
    quantity: number
    matchedProductIds: string[]
  }> = []

  const uniqueHints = [
    ...new Set(params.candidates.map((candidate) => candidate.productHint)),
  ]
  const productSearchConditions = uniqueHints.map((hint) =>
    like(schema.products.name, `%${hint}%`),
  )
  const allOrgProducts =
    productSearchConditions.length === 0
      ? []
      : await db
          .select({
            id: schema.products.id,
            name: schema.products.name,
            basePrice: schema.products.basePrice,
            minQuantity: schema.products.minQuantity,
            maxProductionQuantity: schema.products.maxProductionQuantity,
            pricingMode: schema.products.pricingMode,
          })
          .from(schema.products)
          .where(
            and(
              eq(schema.products.orgId, params.orgId),
              eq(schema.products.active, true),
              isNull(schema.products.deletedAt),
              or(...productSearchConditions),
            ),
          )
          .orderBy(asc(schema.products.name))

  const pricingCandidates: Array<{
    product: (typeof allOrgProducts)[number]
    quantity: number
  }> = []

  for (const candidate of params.candidates) {
    const matchesLike = createLikeMatcher(candidate.productHint)
    const matched = allOrgProducts.filter((product) =>
      matchesLike.test(product.name),
    )

    if (matched.length === 0) {
      missing.push({
        productHint: candidate.productHint,
        quantity: candidate.quantity,
        matchedProductIds: [],
      })
      continue
    }

    if (matched.length > 1) {
      missing.push({
        productHint: candidate.productHint,
        quantity: candidate.quantity,
        matchedProductIds: matched.map((p) => p.id),
      })
      continue
    }

    const product = matched[0]

    if (candidate.quantity < product.minQuantity) {
      missing.push({
        productHint: candidate.productHint,
        quantity: candidate.quantity,
        matchedProductIds: [product.id],
      })
      continue
    }

    if (
      product.maxProductionQuantity != null &&
      candidate.quantity > product.maxProductionQuantity
    ) {
      missing.push({
        productHint: candidate.productHint,
        quantity: candidate.quantity,
        matchedProductIds: [product.id],
      })
      continue
    }

    pricingCandidates.push({ product, quantity: candidate.quantity })
  }

  const pricingProductIds = [
    ...new Set(pricingCandidates.map(({ product }) => product.id)),
  ]
  const allBreakpoints =
    pricingProductIds.length > 0
      ? await db
          .select({
            productId: schema.pricingBreakpoints.productId,
            minQuantity: schema.pricingBreakpoints.minQuantity,
            unitPrice: schema.pricingBreakpoints.unitPrice,
          })
          .from(schema.pricingBreakpoints)
          .where(
            and(
              eq(schema.pricingBreakpoints.orgId, params.orgId),
              inArray(schema.pricingBreakpoints.productId, pricingProductIds),
            ),
          )
          .orderBy(asc(schema.pricingBreakpoints.minQuantity))
      : []

  // Group breakpoints by productId for O(1) lookup.
  const breakpointsByProduct = new Map<
    string,
    Array<{ minQuantity: number; unitPrice: number }>
  >()
  for (const bp of allBreakpoints) {
    const list = breakpointsByProduct.get(bp.productId) ?? []
    list.push({ minQuantity: bp.minQuantity, unitPrice: bp.unitPrice })
    breakpointsByProduct.set(bp.productId, list)
  }

  for (const { product, quantity } of pricingCandidates) {
    const pricing = resolveProductPricing({
      product,
      breakpoints: breakpointsByProduct.get(product.id) ?? [],
      quantity,
    })

    lineItems.push({
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: pricing.unitPrice,
      total: pricing.total,
      minQuantity: pricing.minQuantity,
    })
  }

  let customer: {
    id: string
    name: string
    phone: string | null
    hasAddress: boolean
  } | null = null
  let customerAmbiguous: Array<{ id: string; name: string }> | undefined

  if (params.customerHint?.trim()) {
    const customerResult = await listCustomers({
      orgId: params.orgId,
      search: params.customerHint,
      page: 1,
      perPage: 3,
    })
    if (customerResult.rows.length === 1) {
      const fullCustomer = await getCustomer(
        customerResult.rows[0].id,
        params.orgId,
      )
      const hasAddress =
        fullCustomer?.address != null &&
        typeof fullCustomer.address.areaId === 'string' &&
        fullCustomer.address.areaId.trim().length > 0 &&
        typeof fullCustomer.address.streetAddress === 'string' &&
        fullCustomer.address.streetAddress.trim().length > 0
      customer = {
        id: customerResult.rows[0].id,
        name: customerResult.rows[0].name,
        phone: customerResult.rows[0].phone ?? null,
        hasAddress: hasAddress ?? false,
      }
    } else if (customerResult.rows.length > 1) {
      customerAmbiguous = customerResult.rows.map((r) => ({
        id: r.id,
        name: r.name,
      }))
    }
  }

  const hasInvalid = missing.some((m) => m.matchedProductIds.length === 0)
  const hasAmbiguous = missing.some((m) => m.matchedProductIds.length > 1)

  if (hasInvalid) {
    return { status: 'invalid', missing, customer, customerAmbiguous, total: 0 }
  }
  if (hasAmbiguous) {
    return {
      status: 'ambiguous',
      missing,
      customer,
      customerAmbiguous,
      total: 0,
    }
  }

  const total = lineItems.reduce((sum, li) => sum + li.total, 0)
  return { status: 'resolved', lineItems, customer, customerAmbiguous, total }
}

function generateId(): string {
  return crypto.randomUUID()
}

export async function proposeOrderDraft(params: {
  orgId: string
  userId: string
  candidates: Array<{ productHint: string; quantity: number }>
  customerHint?: string | null
}): Promise<OrderDraftResolution & { actionId?: string }> {
  // Check order creation readiness before resolving
  const readiness = await getOrderCreationReadiness(params.orgId)
  if (!readiness.isReady) {
    const missingPrerequisites: Array<
      | 'business_address'
      | 'production_stages'
      | 'active_products'
      | 'payment_methods'
    > = []
    if (!readiness.businessAddressComplete)
      missingPrerequisites.push('business_address')
    if (readiness.productionStageCount === 0)
      missingPrerequisites.push('production_stages')
    if (readiness.activeProductCount === 0)
      missingPrerequisites.push('active_products')
    if (readiness.paymentMethodCount === 0)
      missingPrerequisites.push('payment_methods')
    return { status: 'invalid', total: 0, missingPrerequisites }
  }

  // Resolve the draft to validate products and pricing
  const resolution = await resolveOrderDraft({
    orgId: params.orgId,
    candidates: params.candidates,
    customerHint: params.customerHint,
  })

  if (resolution.status !== 'resolved') {
    return resolution
  }

  const actionId = generateId()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await db.insert(schema.assistantActions).values({
    id: actionId,
    orgId: params.orgId,
    userId: params.userId,
    threadId: `assistant:${params.orgId}:${params.userId}`,
    kind: 'order_draft',
    status: 'pending',
    payload: {
      lineItems: resolution.lineItems ?? [],
      customerId: resolution.customer?.id ?? null,
      customerName: resolution.customer?.name ?? null,
      total: resolution.total,
    },
    expiresAt,
  })

  return { ...resolution, actionId }
}

function getAssistantBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
}

function buildAssistantAdminUrl(path: string): string {
  return new URL(path, getAssistantBaseUrl()).toString()
}

export async function confirmOrderDraft(params: {
  actionId: string
  orgId: string
  userId: string
}): Promise<{
  status: 'confirmed' | 'expired' | 'not_found'
  orderId?: string
  orderNumber?: string
  adminUrl?: string
  portalUrl?: string
}> {
  const result = await db.transaction(async (tx) => {
    // Atomically claim the proposal with FOR UPDATE lock
    const [action] = await tx
      .select({
        id: schema.assistantActions.id,
        payload: schema.assistantActions.payload,
        expiresAt: schema.assistantActions.expiresAt,
      })
      .from(schema.assistantActions)
      .where(
        and(
          eq(schema.assistantActions.id, params.actionId),
          eq(schema.assistantActions.orgId, params.orgId),
          eq(schema.assistantActions.kind, 'order_draft'),
          eq(schema.assistantActions.status, 'pending'),
        ),
      )
      .for('update')
      .limit(1)

    if (!action) {
      return { status: 'not_found' as const }
    }

    if (action.expiresAt && new Date(action.expiresAt) < new Date()) {
      return { status: 'expired' as const }
    }

    const payload =
      typeof action.payload === 'string'
        ? JSON.parse(action.payload)
        : action.payload

    // Use the canonical order creator from the orders module
    const orderResult = await createDraftOrderFromAction(
      params.orgId,
      payload as AssistantActionPayload,
    )

    // Mark action as confirmed within the same transaction
    await tx
      .update(schema.assistantActions)
      .set({
        status: 'confirmed',
        resultOrderId: orderResult.order.id,
        updatedAt: new Date(),
      })
      .where(eq(schema.assistantActions.id, params.actionId))

    const base = getAssistantBaseUrl()
    const adminUrl = buildAssistantAdminUrl(`/orders/${orderResult.order.id}`)

    if (!orderResult.order.orderToken) {
      throw new Error('Created order is missing portal token')
    }
    const portalUrl = buildPortalUrl(orderResult.order.orderToken, base)

    return {
      status: 'confirmed' as const,
      orderId: orderResult.order.id,
      orderNumber: orderResult.order.orderNumber ?? undefined,
      adminUrl,
      portalUrl,
    }
  })

  return result
}
// ─── Customer Assistant Functions ────────────────────────────────────────────

export async function searchAssistantCustomers(params: {
  orgId: string
  query: string
}): Promise<import('#/features/customers/model').CustomerRow[]> {
  const result = await listCustomers({
    orgId: params.orgId,
    search: params.query,
    page: 1,
    perPage: 10,
  })
  return result.rows
}

export async function createAssistantCustomer(params: {
  orgId: string
  name: string
  email?: string
  phone?: string
  notes?: string
  active?: boolean
  isWni?: boolean
}): Promise<
  { ok: true; id: string; url: string } | { ok: false; error: string }
> {
  if (!params.name || params.name.trim().length === 0) {
    return { ok: false, error: 'Customer name is required' }
  }
  try {
    const id = await createCustomer({
      orgId: params.orgId,
      name: params.name.trim(),
      email: params.email?.trim() || undefined,
      phone: params.phone?.trim() || undefined,
      notes: params.notes?.trim() || undefined,
      active: params.active ?? true,
      isWni: params.isWni ?? true,
    })
    const url = buildAssistantAdminUrl(`/customers/${id}`)
    return { ok: true, id, url }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: message }
  }
}

export async function updateAssistantCustomer(params: {
  orgId: string
  id: string
  name?: string
  email?: string
  phone?: string
  notes?: string
  active?: boolean
}): Promise<
  { ok: true; id: string; url: string } | { ok: false; error: string }
> {
  if (params.name !== undefined && params.name.trim().length === 0) {
    return { ok: false, error: 'Customer name is required' }
  }
  try {
    const existing = await getCustomer(params.id, params.orgId)
    if (!existing) {
      return { ok: false, error: 'Customer not found' }
    }
    await updateCustomer(params.id, params.orgId, {
      name: params.name ?? existing.name,
      email: params.email !== undefined ? params.email : existing.email,
      phone: params.phone !== undefined ? params.phone : existing.phone,
      notes: params.notes !== undefined ? params.notes : existing.notes,
      active: params.active !== undefined ? params.active : existing.active,
      isWni: existing.isWni,
      photoAssetId: existing.photoAssetId,
      address: existing.address,
    })
    const url = buildAssistantAdminUrl(`/customers/${params.id}`)
    return { ok: true, id: params.id, url }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: message }
  }
}

// ─── Product Assistant Functions ─────────────────────────────────────────────

export async function searchAssistantProducts(params: {
  orgId: string
  query?: string
  activeOnly?: boolean
}): Promise<import('#/features/products/model').ProductRow[]> {
  const result = await listProductRows({
    orgId: params.orgId,
    search: params.query,
    status: params.activeOnly ? 'active' : undefined,
    page: 1,
    perPage: 10,
  })
  return result.rows
}

export async function createAssistantProduct(params: {
  orgId: string
  name: string
  description?: string
  category?: string
  basePrice: number
  minQuantity: number
  pricingMode: 'interpolated' | 'step'
  productionDays: number
  maxProductionQuantity?: number
  repeatOrderMinQuantity?: number
}): Promise<
  { ok: true; id: string; url: string } | { ok: false; error: string }
> {
  if (!params.name || params.name.trim().length === 0) {
    return { ok: false, error: 'Product name is required' }
  }
  if (params.basePrice < 0) {
    return { ok: false, error: 'Base price must not be negative' }
  }
  if (params.minQuantity < 1) {
    return { ok: false, error: 'Minimum quantity must be at least 1' }
  }
  if (params.productionDays < 1) {
    return { ok: false, error: 'Production days must be at least 1' }
  }
  if (
    params.maxProductionQuantity !== undefined &&
    params.maxProductionQuantity < 1
  ) {
    return {
      ok: false,
      error: 'Maximum production quantity must be at least 1',
    }
  }
  if (
    params.repeatOrderMinQuantity !== undefined &&
    params.repeatOrderMinQuantity < 1
  ) {
    return {
      ok: false,
      error: 'Repeat order minimum quantity must be at least 1',
    }
  }
  try {
    const product = await createProduct({
      orgId: params.orgId,
      name: params.name.trim(),
      description: params.description,
      category: params.category,
      basePrice: params.basePrice,
      minQuantity: params.minQuantity,
      pricingMode: params.pricingMode,
      productionDays: params.productionDays,
      maxProductionQuantity: params.maxProductionQuantity,
      repeatOrderMinQuantity: params.repeatOrderMinQuantity,
    })
    const url = buildAssistantAdminUrl(`/products/${product.id}`)
    return { ok: true, id: product.id, url }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: message }
  }
}

export async function updateAssistantProduct(params: {
  orgId: string
  id: string
  name?: string
  description?: string
  basePrice?: number
  minQuantity?: number
  productionDays?: number
  active?: boolean
}): Promise<
  { ok: true; id: string; url: string } | { ok: false; error: string }
> {
  if (params.name !== undefined && params.name.trim().length === 0) {
    return { ok: false, error: 'Product name is required' }
  }
  if (params.basePrice !== undefined && params.basePrice < 0) {
    return { ok: false, error: 'Base price must not be negative' }
  }
  if (params.minQuantity !== undefined && params.minQuantity < 1) {
    return { ok: false, error: 'Minimum quantity must be at least 1' }
  }
  if (params.productionDays !== undefined && params.productionDays < 1) {
    return { ok: false, error: 'Production days must be at least 1' }
  }
  try {
    const existing = await getProduct(params.id, params.orgId)
    if (!existing) {
      return { ok: false, error: 'Product not found' }
    }
    const updated = await updateProduct({
      id: params.id,
      orgId: params.orgId,
      name: params.name,
      description: params.description,
      basePrice: params.basePrice,
      minQuantity: params.minQuantity,
      productionDays: params.productionDays,
      active: params.active,
    })
    const url = buildAssistantAdminUrl(`/products/${updated.id}`)
    return { ok: true, id: updated.id, url }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: message }
  }
}

// ─── Order Assistant Functions ───────────────────────────────────────────────

export type AssistantLineItemInput = Pick<
  import('#/features/orders/model').LineItemInput,
  | 'id'
  | 'productId'
  | 'quantity'
  | 'designName'
  | 'notes'
  | 'addonIds'
  | 'isRepeatOrder'
  | 'manualDeadline'
> & { deadline?: string }

export async function searchAssistantOrders(params: {
  orgId: string
  query?: string
  status?: string
  customerId?: string
  dateFrom?: string
  dateTo?: string
}): Promise<
  Array<{
    id: string
    orderNumber: string | null
    customerName: string | null
    status: string
    total: number
    createdAt: string
  }>
> {
  const dateFrom = params.dateFrom
    ? new Date(`${params.dateFrom}T00:00:00.000Z`)
    : undefined
  const dateTo = params.dateTo
    ? new Date(`${params.dateTo}T23:59:59.999Z`)
    : undefined

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('dateFrom must be on or before dateTo')
  }

  const result = await listOrders({
    orgId: params.orgId,
    search: params.query,
    status: params.status,
    customerId: params.customerId,
    dateFrom,
    dateTo,
    page: 1,
    perPage: 10,
  })

  return result.rows.map((row: import('#/features/orders/model').OrderRow) => ({
    id: row.id,
    orderNumber: row.orderNumber,
    customerName: row.customerName,
    status: row.status,
    total: row.total,
    createdAt: row.createdAt.toISOString(),
  }))
}

export async function getAssistantOrder(params: {
  orgId: string
  orderId: string
}): Promise<
  | {
      ok: true
      order: import('#/features/orders/model').Order
      lineItems: import('#/features/orders/model').OrderLineItem[]
      customerName: string | null
    }
  | { ok: false; error: string }
> {
  const result = await getOrder(params.orderId, params.orgId)
  if (!result) {
    return { ok: false, error: 'Order not found' }
  }
  return {
    ok: true,
    order: result.order,
    lineItems: result.lineItems,
    customerName: result.customerName,
  }
}

export async function updateAssistantDraftOrder(params: {
  orgId: string
  orderId: string
  customerId?: string
  notes?: string
  lineItems?: AssistantLineItemInput[]
  deadline?: string
}): Promise<
  { ok: true; orderId: string; adminUrl: string } | { ok: false; error: string }
> {
  try {
    const existing = await getOrder(params.orderId, params.orgId)
    if (!existing) {
      return { ok: false, error: 'Order not found' }
    }
    if (existing.order.status !== 'draft') {
      return { ok: false, error: 'Can only modify draft orders' }
    }

    const deadline = params.deadline
      ? new Date(`${params.deadline}T00:00:00.000Z`)
      : undefined

    // Build line items: if supplied, use them as complete replacement; otherwise preserve existing
    let lineItems: import('#/features/orders/model').LineItemInput[]
    if (params.lineItems) {
      lineItems = params.lineItems.map((li) => ({
        id: li.id,
        productId: li.productId,
        quantity: li.quantity,
        designName: li.designName,
        notes: li.notes,
        addonIds: li.addonIds,
        isRepeatOrder: li.isRepeatOrder,
        deadline: li.deadline
          ? new Date(`${li.deadline}T00:00:00.000Z`)
          : undefined,
        manualDeadline: li.manualDeadline,
      }))
    } else {
      // Preserve existing line items with their current unit prices
      lineItems = existing.lineItems.map((li) => ({
        id: li.id,
        productId: li.productId,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        designName: li.designName ?? undefined,
        notes: li.notes ?? undefined,
        addonIds: li.selectedAddons
          ?.map((a) => a.productAddonId)
          .filter((id): id is string => id !== null),
        isRepeatOrder: li.isRepeatOrder,
        deadline: li.deadline,
        manualDeadline: li.manualDeadline,
      }))
    }

    const result = await updateDraftOrder(params.orderId, params.orgId, {
      customerId:
        params.customerId !== undefined
          ? params.customerId
          : existing.order.customerId,
      notes:
        params.notes !== undefined
          ? params.notes
          : (existing.order.notes ?? undefined),
      lineItems,
      deadline,
      manualDeadline: params.deadline ? true : undefined,
    })

    const adminUrl = buildAssistantAdminUrl(`/orders/${result.order.id}`)
    return { ok: true, orderId: result.order.id, adminUrl }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: message }
  }
}
