import { and, count, desc, eq, ilike, isNull, ne, or, sql } from 'drizzle-orm'
import { db } from '#/db/index'
import type {
  AuditActionType,
  AuditEvent,
  BillingCadence,
  BillingEventType,
  CompatibilityMigrationReport,
  NewAuditEvent,
  PlanEntitlements,
  SubscriptionStatus,
} from '#/db/schema'
import {
  auditEvents,
  billingEvents,
  compatibilityMigrations,
  customers,
  invoices,
  member,
  orders,
  organization,
  organizationExports,
  plans,
  platformAdminUsers,
  productionStages,
  productionTasks,
  products,
  retentionPolicies,
  subscriptions,
  user,
} from '#/db/schema'

// ─── Types ───────────────────────────────────────────────────────────────────

export type AdminOrgSummary = {
  id: string
  name: string
  slug: string
  memberCount: number
  subscriptionStatus: string | null
  planName: string | null
  orderCount: number
  invoiceUnpaidCount: number
  createdAt: Date
}

export type AdminPlanSummary = {
  id: string
  slug: string
  name: string
  version: number
  description: string | null
  entitlements: PlanEntitlements
  monthlyPriceCents: number
  annualPriceCents: number
  active: boolean
  subscriberCount: number
  createdAt: Date
  updatedAt: Date
}

export type AdminSubscriptionSummary = {
  id: string
  orgId: string
  orgName: string
  orgSlug: string
  planId: string
  planName: string
  planSlug: string
  planVersion: number
  status: SubscriptionStatus
  billingCadence: BillingCadence
  trialEndsAt: string | null
  currentPeriodEndsAt: string | null
  createdAt: string
  updatedAt: string
}

export type AdminAuditEvent = {
  id: string
  actorId: string
  actorName: string
  organizationId: string | null
  organizationName: string | null
  action: AuditActionType
  reason: string | null
  details: Record<string, string | number | boolean | null> | null
  expiresAt: string | null
  createdAt: string
}

export type AdminMigrationSummary = {
  id: string
  orgId: string
  orgName: string
  orgSlug: string
  status: 'pending_review' | 'accepted' | 'failed'
  report: CompatibilityMigrationReport | null
  reviewedBy: string | null
  reviewedAt: string | null
  failureReason: string | null
  createdAt: string
}

export type AdminDashboardMetrics = {
  totalOrganizations: number
  activeSubscriptions: number
  trialingOrgs: number
  pendingMigrations: number
  totalOrdersThisMonth: number
  unpaidInvoicesTotal: number
  productionBottleneckCount: number
  qualityHoldsCount: number
  recentSignups: number
}

export type AdminExceptionInput = {
  organizationId: string
  action: AuditActionType
  reason: string
  details?: Record<string, unknown>
  expiresAt?: Date
}

// ─── Audit Event Recording ───────────────────────────────────────────────────

export async function recordAuditEvent(
  event: Omit<NewAuditEvent, 'id' | 'createdAt'>,
): Promise<AuditEvent> {
  const [record] = await db
    .insert(auditEvents)
    .values({
      id: crypto.randomUUID(),
      actorId: event.actorId,
      actorName: event.actorName,
      organizationId: event.organizationId ?? null,
      organizationName: event.organizationName ?? null,
      action: event.action,
      reason: event.reason ?? null,
      details: (event.details as Record<string, unknown>) ?? {},
      expiresAt: event.expiresAt ?? null,
    })
    .returning()

  return record
}

// ─── Organizations ───────────────────────────────────────────────────────────

export async function listOrganizations(
  search?: string,
): Promise<AdminOrgSummary[]> {
  const memberCounts = db
    .select({
      orgId: member.organizationId,
      memberCount: count(),
    })
    .from(member)
    .groupBy(member.organizationId)
    .as('member_counts')

  const orderCounts = db
    .select({
      orgId: orders.orgId,
      orderCount: count(),
    })
    .from(orders)
    .groupBy(orders.orgId)
    .as('order_counts')

  const invoiceUnpaidCounts = db
    .select({
      orgId: invoices.orgId,
      invoiceUnpaidCount: count(),
    })
    .from(invoices)
    .where(
      or(
        eq(invoices.status, 'unpaid'),
        eq(invoices.status, 'overdue'),
        eq(invoices.status, 'past_due'),
      ),
    )
    .groupBy(invoices.orgId)
    .as('invoice_unpaid_counts')

  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
      memberCount: memberCounts.memberCount,
      subscriptionStatus: subscriptions.status,
      planName: plans.name,
      orderCount: orderCounts.orderCount,
      invoiceUnpaidCount: invoiceUnpaidCounts.invoiceUnpaidCount,
    })
    .from(organization)
    .leftJoin(memberCounts, eq(memberCounts.orgId, organization.id))
    .leftJoin(subscriptions, eq(subscriptions.orgId, organization.id))
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .leftJoin(orderCounts, eq(orderCounts.orgId, organization.id))
    .leftJoin(
      invoiceUnpaidCounts,
      eq(invoiceUnpaidCounts.orgId, organization.id),
    )
    .where(
      search
        ? or(
            ilike(organization.name, `%${search}%`),
            ilike(organization.slug, `%${search}%`),
          )
        : undefined,
    )
    .orderBy(desc(organization.createdAt))
    .limit(100)

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    memberCount: Number(row.memberCount ?? 0),
    subscriptionStatus: row.subscriptionStatus ?? null,
    planName: row.planName ?? null,
    orderCount: Number(row.orderCount ?? 0),
    invoiceUnpaidCount: Number(row.invoiceUnpaidCount ?? 0),
    createdAt: row.createdAt,
  }))
}

// ─── Plans ───────────────────────────────────────────────────────────────────

export async function listPlans(): Promise<AdminPlanSummary[]> {
  const allPlans = await db.select().from(plans).orderBy(desc(plans.createdAt))

  const enriched = await Promise.all(
    allPlans.map(async (plan) => {
      const [subCount] = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.planId, plan.id),
            ne(subscriptions.status, 'canceled'),
          ),
        )

      return {
        ...plan,
        subscriberCount: subCount?.count ?? 0,
      }
    }),
  )

  return enriched
}

export async function createPlan(input: {
  slug: string
  name: string
  version: number
  description?: string
  entitlements: PlanEntitlements
  monthlyPriceCents: number
  annualPriceCents: number
}): Promise<typeof plans.$inferSelect> {
  const [record] = await db
    .insert(plans)
    .values({
      id: crypto.randomUUID(),
      slug: input.slug,
      name: input.name,
      version: input.version,
      description: input.description ?? null,
      entitlements: input.entitlements,
      monthlyPriceCents: input.monthlyPriceCents,
      annualPriceCents: input.annualPriceCents,
      active: true,
    })
    .returning()

  return record
}

export async function createPlanVersion(input: {
  planId: string
  slug: string
  name: string
  description?: string
  entitlements: PlanEntitlements
  monthlyPriceCents: number
  annualPriceCents: number
}): Promise<typeof plans.$inferSelect> {
  // Get current max version
  const [currentPlan] = await db
    .select({ version: plans.version })
    .from(plans)
    .where(eq(plans.id, input.planId))
    .limit(1)

  if (!currentPlan) {
    throw new Error('Plan not found')
  }

  const [record] = await db
    .insert(plans)
    .values({
      id: crypto.randomUUID(),
      slug: input.slug,
      name: input.name,
      version: currentPlan.version + 1,
      parentPlanId: input.planId,
      description: input.description ?? null,
      entitlements: input.entitlements,
      monthlyPriceCents: input.monthlyPriceCents,
      annualPriceCents: input.annualPriceCents,
      active: true,
    })
    .returning()

  return record
}

export async function deactivatePlan(planId: string): Promise<void> {
  await db
    .update(plans)
    .set({ active: false, updatedAt: sql`now()` })
    .where(eq(plans.id, planId))
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

export async function listSubscriptions(): Promise<AdminSubscriptionSummary[]> {
  const rows = await db
    .select({
      id: subscriptions.id,
      orgId: subscriptions.orgId,
      orgName: organization.name,
      orgSlug: organization.slug,
      planId: subscriptions.planId,
      planName: plans.name,
      planSlug: plans.slug,
      planVersion: plans.version,
      status: subscriptions.status,
      billingCadence: subscriptions.billingCadence,
      trialEndsAt: subscriptions.trialEndsAt,
      currentPeriodEndsAt: subscriptions.currentPeriodEndsAt,
      createdAt: subscriptions.createdAt,
      updatedAt: subscriptions.updatedAt,
    })
    .from(subscriptions)
    .innerJoin(organization, eq(subscriptions.orgId, organization.id))
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .orderBy(desc(subscriptions.createdAt))

  return rows.map((row) => ({
    ...row,
    trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
    currentPeriodEndsAt: row.currentPeriodEndsAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export async function listAuditEvents(
  limit = 50,
  offset = 0,
  filters?: {
    action?: AuditActionType
    organizationId?: string
    actorId?: string
  },
): Promise<AdminAuditEvent[]> {
  const conditions: ReturnType<typeof eq>[] = []

  if (filters?.action) {
    conditions.push(eq(auditEvents.action, filters.action))
  }
  if (filters?.organizationId) {
    conditions.push(eq(auditEvents.organizationId, filters.organizationId))
  }
  if (filters?.actorId) {
    conditions.push(eq(auditEvents.actorId, filters.actorId))
  }

  const rows = await db
    .select()
    .from(auditEvents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit)
    .offset(offset)

  return rows.map((row) => ({
    id: row.id,
    actorId: row.actorId,
    actorName: row.actorName,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    action: row.action as AdminAuditEvent['action'],
    reason: row.reason,
    details: (row.details ?? {}) as Record<
      string,
      string | number | boolean | null
    >,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }))
}

// ─── Migrations ──────────────────────────────────────────────────────────────

export async function listMigrations(): Promise<AdminMigrationSummary[]> {
  const rows = await db
    .select({
      id: compatibilityMigrations.id,
      orgId: compatibilityMigrations.orgId,
      orgName: organization.name,
      orgSlug: organization.slug,
      status: compatibilityMigrations.status,
      report: compatibilityMigrations.report,
      reviewedBy: compatibilityMigrations.reviewedBy,
      reviewedAt: compatibilityMigrations.reviewedAt,
      failureReason: compatibilityMigrations.failureReason,
      createdAt: compatibilityMigrations.createdAt,
    })
    .from(compatibilityMigrations)
    .innerJoin(organization, eq(compatibilityMigrations.orgId, organization.id))
    .orderBy(desc(compatibilityMigrations.createdAt))

  return rows.map((row) => ({
    ...row,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }))
}

// ─── Dashboard Metrics ───────────────────────────────────────────────────────

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalOrgs,
    activeSubs,
    trialing,
    pendingMigs,
    ordersThisMonth,
    unpaidInvoicesResult,
    bottleneckTasks,
    qualityHolds,
    recentSignups,
  ] = await Promise.all([
    db.select({ count: count() }).from(organization),
    db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active')),
    db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'trialing')),
    db
      .select({ count: count() })
      .from(compatibilityMigrations)
      .where(eq(compatibilityMigrations.status, 'pending_review')),
    db
      .select({ count: count() })
      .from(orders)
      .where(sql`${orders.createdAt} >= ${startOfMonth.toISOString()}`),
    db
      .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
      .from(invoices)
      .where(
        or(
          eq(invoices.status, 'unpaid'),
          eq(invoices.status, 'overdue'),
          eq(invoices.status, 'past_due'),
        ),
      ),
    db
      .select({ count: count() })
      .from(productionTasks)
      .where(
        and(
          ne(productionTasks.status, 'done'),
          ne(productionTasks.status, 'approved'),
          ne(productionTasks.status, 'archived'),
        ),
      ),
    // Quality holds — tasks that have been rejected or are in review
    db
      .select({ count: count() })
      .from(productionTasks)
      .where(
        or(
          eq(productionTasks.status, 'rejected'),
          eq(productionTasks.status, 'review'),
        ),
      ),
    // Organizations created this month
    db
      .select({ count: count() })
      .from(organization)
      .where(sql`${organization.createdAt} >= ${startOfMonth.toISOString()}`),
  ])

  return {
    totalOrganizations: totalOrgs[0]?.count ?? 0,
    activeSubscriptions: activeSubs[0]?.count ?? 0,
    trialingOrgs: trialing[0]?.count ?? 0,
    pendingMigrations: pendingMigs[0]?.count ?? 0,
    totalOrdersThisMonth: ordersThisMonth[0]?.count ?? 0,
    unpaidInvoicesTotal: unpaidInvoicesResult[0]?.total ?? 0,
    productionBottleneckCount: bottleneckTasks[0]?.count ?? 0,
    qualityHoldsCount: qualityHolds[0]?.count ?? 0,
    recentSignups: recentSignups[0]?.count ?? 0,
  }
}

// ─── Platform Admin Users ────────────────────────────────────────────────────

export async function grantPlatformAdmin(
  userId: string,
  grantedBy: string,
): Promise<void> {
  // Check if user already has a record
  const [existing] = await db
    .select({ id: platformAdminUsers.id })
    .from(platformAdminUsers)
    .where(eq(platformAdminUsers.userId, userId))
    .limit(1)

  if (existing) {
    // Reactivate
    await db
      .update(platformAdminUsers)
      .set({
        revokedAt: null,
        revokedBy: null,
        grantedBy,
        grantedAt: sql`now()`,
      })
      .where(eq(platformAdminUsers.id, existing.id))
    return
  }

  await db.insert(platformAdminUsers).values({
    id: crypto.randomUUID(),
    userId,
    grantedBy,
  })
}

export async function revokePlatformAdmin(userId: string, revokedBy: string) {
  await db
    .update(platformAdminUsers)
    .set({
      revokedAt: sql`now()`,
      revokedBy,
    })
    .where(
      and(
        eq(platformAdminUsers.userId, userId),
        isNull(platformAdminUsers.revokedAt),
      ),
    )
}

export async function listPlatformAdmins(): Promise<
  Array<{
    userId: string
    userName: string
    userEmail: string
    grantedAt: string
    isActive: boolean
  }>
> {
  const rows = await db
    .select({
      userId: platformAdminUsers.userId,
      userName: user.name,
      userEmail: user.email,
      grantedAt: platformAdminUsers.grantedAt,
      revokedAt: platformAdminUsers.revokedAt,
    })
    .from(platformAdminUsers)
    .innerJoin(user, eq(platformAdminUsers.userId, user.id))
    .orderBy(desc(platformAdminUsers.grantedAt))

  return rows.map((row) => ({
    userId: row.userId,
    userName: row.userName,
    userEmail: row.userEmail,
    grantedAt: row.grantedAt.toISOString(),
    isActive: row.revokedAt === null,
  }))
}

// ─── Exception / Suspension / Restoration ────────────────────────────────────

export async function suspendOrganization(
  orgId: string,
  reason: string,
  actorId: string,
  actorName: string,
): Promise<void> {
  // Cancel the subscription (suspension)
  await db
    .update(subscriptions)
    .set({
      status: 'suspended',
      suspendedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(eq(subscriptions.orgId, orgId))

  // Record audit event
  const [orgRecord] = await db
    .select({ name: organization.name, slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1)

  await recordAuditEvent({
    actorId,
    actorName,
    organizationId: orgId,
    organizationName: orgRecord?.name ?? null,
    action: 'organization.suspended',
    reason,
  })
}

export async function restoreOrganization(
  orgId: string,
  reason: string,
  actorId: string,
  actorName: string,
): Promise<void> {
  await db
    .update(subscriptions)
    .set({
      status: 'active',
      suspendedAt: null,
      updatedAt: sql`now()`,
    })
    .where(eq(subscriptions.orgId, orgId))

  const [orgRecord] = await db
    .select({ name: organization.name, slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1)

  await recordAuditEvent({
    actorId,
    actorName,
    organizationId: orgId,
    organizationName: orgRecord?.name ?? null,
    action: 'organization.restored',
    reason,
  })
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Legacy placeholder — records audit event only.
 * Use executeOrganizationExport for the full data export pipeline.
 */
export async function createOrganizationExport(
  orgId: string,
  actorId: string,
  actorName: string,
): Promise<void> {
  const [orgRecord] = await db
    .select({ name: organization.name, slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1)

  await recordAuditEvent({
    actorId,
    actorName,
    organizationId: orgId,
    organizationName: orgRecord?.name ?? null,
    action: 'export.created',
    reason: 'Organization data export initiated',
  })
}

/**
 * Count orders by status for a given org.
 */
export async function countOrdersByStatus(
  orgId: string,
): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: orders.status, count: count() })
    .from(orders)
    .where(eq(orders.orgId, orgId))
    .groupBy(orders.status)

  return Object.fromEntries(rows.map((r) => [r.status, r.count]))
}

/**
 * Get production bottlenecks for a given org.
 * Tasks that are in progress but not yet done/approved.
 */
export async function getProductionBottlenecks(
  orgId: string,
  limit = 10,
): Promise<
  Array<{
    taskId: string
    taskNumber: string | null
    stageName: string | null
    productName: string
    status: string
    board: string
    createdAt: string
  }>
> {
  const rows = await db
    .select({
      taskId: productionTasks.id,
      taskNumber: productionTasks.taskNumber,
      stageName: productionStages.name,
      productName: sql<
        string | null
      >`${productionTasks.context}->>'productName'`,
      status: productionTasks.status,
      board: productionTasks.board,
      createdAt: productionTasks.createdAt,
    })
    .from(productionTasks)
    .leftJoin(
      productionStages,
      eq(productionTasks.stageId, productionStages.id),
    )
    .where(
      and(
        eq(productionTasks.orgId, orgId),
        ne(productionTasks.status, 'done'),
        ne(productionTasks.status, 'approved'),
        ne(productionTasks.status, 'archived'),
      ),
    )
    .orderBy(desc(productionTasks.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    taskId: row.taskId,
    taskNumber: row.taskNumber,
    stageName: row.stageName ?? null,
    productName: row.productName ?? 'Unknown',
    status: row.status,
    board: row.board,
    createdAt: row.createdAt.toISOString(),
  }))
}

// ─── Billing Events ──────────────────────────────────────────────────────────

export type AdminBillingEvent = {
  id: string
  orgId: string
  orgName: string
  subscriptionId: string
  eventType: BillingEventType
  previousStatus: string | null
  newStatus: string | null
  previousPlanId: string | null
  newPlanId: string | null
  metadata: Record<string, string | number | boolean | null> | null
  actorId: string | null
  createdAt: string
}

export type RetentionPolicySummary = {
  id: string
  orgId: string | null
  orgName: string | null
  targetTable: string
  retentionDays: number
  enabled: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type OrganizationExportSummary = {
  id: string
  orgId: string
  orgName: string
  status: string
  format: string
  r2Key: string | null
  fileSizeBytes: number | null
  includedData: string[]
  requestedBy: string
  completedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export async function listBillingEvents(
  limit = 50,
  offset = 0,
  filters?: {
    orgId?: string
    eventType?: BillingEventType
  },
): Promise<AdminBillingEvent[]> {
  const conditions: ReturnType<typeof eq>[] = []

  if (filters?.orgId) {
    conditions.push(eq(billingEvents.orgId, filters.orgId))
  }
  if (filters?.eventType) {
    conditions.push(eq(billingEvents.eventType, filters.eventType))
  }

  const rows = await db
    .select({
      id: billingEvents.id,
      orgId: billingEvents.orgId,
      orgName: organization.name,
      subscriptionId: billingEvents.subscriptionId,
      eventType: billingEvents.eventType,
      previousStatus: billingEvents.previousStatus,
      newStatus: billingEvents.newStatus,
      previousPlanId: billingEvents.previousPlanId,
      newPlanId: billingEvents.newPlanId,
      metadata: billingEvents.metadata,
      actorId: billingEvents.actorId,
      createdAt: billingEvents.createdAt,
    })
    .from(billingEvents)
    .innerJoin(organization, eq(billingEvents.orgId, organization.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(billingEvents.createdAt))
    .limit(limit)
    .offset(offset)

  return rows.map((row) => ({
    ...row,
    metadata: (row.metadata ?? {}) as Record<
      string,
      string | number | boolean | null
    >,
    createdAt: row.createdAt.toISOString(),
  }))
}

export async function recordBillingEvent(event: {
  orgId: string
  subscriptionId: string
  eventType: BillingEventType
  previousStatus?: string | null
  newStatus?: string | null
  previousPlanId?: string | null
  newPlanId?: string | null
  metadata?: Record<string, unknown>
  actorId?: string | null
}): Promise<void> {
  await db.insert(billingEvents).values({
    id: crypto.randomUUID(),
    orgId: event.orgId,
    subscriptionId: event.subscriptionId,
    eventType: event.eventType,
    previousStatus: event.previousStatus ?? null,
    newStatus: event.newStatus ?? null,
    previousPlanId: event.previousPlanId ?? null,
    newPlanId: event.newPlanId ?? null,
    metadata: (event.metadata ?? {}) as Record<string, unknown>,
    actorId: event.actorId ?? null,
  })
}

// ─── Organization Exports ────────────────────────────────────────────────────

export async function listOrganizationExports(
  orgId?: string,
): Promise<OrganizationExportSummary[]> {
  const conditions: ReturnType<typeof eq>[] = []

  if (orgId) {
    conditions.push(eq(organizationExports.orgId, orgId))
  }

  const rows = await db
    .select({
      id: organizationExports.id,
      orgId: organizationExports.orgId,
      orgName: organization.name,
      status: organizationExports.status,
      format: organizationExports.format,
      r2Key: organizationExports.r2Key,
      fileSizeBytes: organizationExports.fileSizeBytes,
      includedData: organizationExports.includedData,
      requestedBy: organizationExports.requestedBy,
      completedAt: organizationExports.completedAt,
      expiresAt: organizationExports.expiresAt,
      createdAt: organizationExports.createdAt,
    })
    .from(organizationExports)
    .innerJoin(organization, eq(organizationExports.orgId, organization.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(organizationExports.createdAt))

  return rows.map((row) => ({
    ...row,
    completedAt: row.completedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }))
}

export async function getExportDownloadUrl(
  exportId: string,
): Promise<{ url: string; expiresAt: number } | null> {
  const [record] = await db
    .select({ r2Key: organizationExports.r2Key })
    .from(organizationExports)
    .where(
      and(
        eq(organizationExports.id, exportId),
        eq(organizationExports.status, 'completed'),
      ),
    )
    .limit(1)

  if (!record?.r2Key) return null

  const { generateSignedDownloadUrl } = await import('#/lib/r2')
  return generateSignedDownloadUrl(record.r2Key, 3600, {
    contentDisposition: `attachment; filename="org-export-${exportId}.json"`,
  })
}

// ─── Retention Policies ──────────────────────────────────────────────────────

export async function listRetentionPolicies(): Promise<
  RetentionPolicySummary[]
> {
  const rows = await db
    .select({
      id: retentionPolicies.id,
      orgId: retentionPolicies.orgId,
      orgName: organization.name,
      targetTable: retentionPolicies.targetTable,
      retentionDays: retentionPolicies.retentionDays,
      enabled: retentionPolicies.enabled,
      createdBy: retentionPolicies.createdBy,
      createdAt: retentionPolicies.createdAt,
      updatedAt: retentionPolicies.updatedAt,
    })
    .from(retentionPolicies)
    .leftJoin(organization, eq(retentionPolicies.orgId, organization.id))
    .orderBy(desc(retentionPolicies.createdAt))

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))
}

export async function createRetentionPolicy(input: {
  orgId?: string | null
  targetTable: string
  retentionDays: number
  enabled?: boolean
  createdBy: string
}): Promise<typeof retentionPolicies.$inferSelect> {
  const [record] = await db
    .insert(retentionPolicies)
    .values({
      id: crypto.randomUUID(),
      orgId: input.orgId ?? null,
      targetTable: input.targetTable,
      retentionDays: input.retentionDays,
      enabled: input.enabled ?? true,
      createdBy: input.createdBy,
    })
    .returning()

  return record
}

export async function updateRetentionPolicy(
  id: string,
  input: {
    retentionDays?: number
    enabled?: boolean
  },
): Promise<void> {
  await db
    .update(retentionPolicies)
    .set({
      ...input,
      updatedAt: sql`now()`,
    })
    .where(eq(retentionPolicies.id, id))
}

export async function deleteRetentionPolicy(id: string): Promise<void> {
  await db.delete(retentionPolicies).where(eq(retentionPolicies.id, id))
}

// ─── Proper Data Export ───────────────────────────────────────────────────────

export async function executeOrganizationExport(
  orgId: string,
  actorId: string,
  actorName: string,
): Promise<{ exportId: string }> {
  const [orgRecord] = await db
    .select({ name: organization.name, slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1)

  if (!orgRecord) {
    throw new Error('Organization not found')
  }

  // Gather all data for the export
  const [
    orgData,
    membersData,
    ordersData,
    customersData,
    productsData,
    invoicesData,
    subscriptionsData,
  ] = await Promise.all([
    db.select().from(organization).where(eq(organization.id, orgId)).limit(1),
    db
      .select({
        id: member.id,
        userId: member.userId,
        role: member.role,
        createdAt: member.createdAt,
        userName: user.name,
        userEmail: user.email,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, orgId)),
    db.select().from(orders).where(eq(orders.orgId, orgId)),
    db.select().from(customers).where(eq(customers.orgId, orgId)),
    db.select().from(products).where(eq(products.orgId, orgId)),
    db.select().from(invoices).where(eq(invoices.orgId, orgId)),
    db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        billingCadence: subscriptions.billingCadence,
        planSnapshot: subscriptions.planSnapshot,
        trialStartsAt: subscriptions.trialStartsAt,
        trialEndsAt: subscriptions.trialEndsAt,
        currentPeriodStartsAt: subscriptions.currentPeriodStartsAt,
        currentPeriodEndsAt: subscriptions.currentPeriodEndsAt,
        createdAt: subscriptions.createdAt,
        planName: plans.name,
        planSlug: plans.slug,
        planVersion: plans.version,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.orgId, orgId)),
  ])

  const exportData = {
    organization: orgData[0],
    members: membersData,
    orders: ordersData,
    customers: customersData,
    products: productsData,
    invoices: invoicesData,
    subscription: subscriptionsData[0] ?? null,
    exportedAt: new Date().toISOString(),
  }

  const jsonContent = JSON.stringify(exportData, null, 2)
  const contentBytes = new TextEncoder().encode(jsonContent).length

  // Upload to R2
  const exportId = crypto.randomUUID()
  const key = `exports/${orgId}/${exportId}.json`

  const { generateSignedUploadUrl } = await import('#/lib/r2')
  const { url: uploadUrl } = await generateSignedUploadUrl(
    key,
    'application/json',
    300,
  )

  await fetch(uploadUrl, {
    method: 'PUT',
    body: jsonContent,
    headers: { 'Content-Type': 'application/json' },
  })

  // Create export record
  await db.insert(organizationExports).values({
    id: exportId,
    orgId,
    status: 'completed',
    format: 'json',
    r2Key: key,
    fileSizeBytes: contentBytes,
    includedData: [
      'organization',
      'members',
      'orders',
      'customers',
      'products',
      'invoices',
      'subscription',
    ],
    requestedBy: actorName,
    completedAt: sql`now()`,
    expiresAt: sql`now() + interval '30 days'`,
  })

  // Record audit event
  await recordAuditEvent({
    actorId,
    actorName,
    organizationId: orgId,
    organizationName: orgRecord.name,
    action: 'export.created',
    reason: 'Organization data export completed',
    details: { exportId, format: 'json', sizeBytes: contentBytes },
  })

  return { exportId }
}
