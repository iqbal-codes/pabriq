import { and, count, desc, eq, ilike, isNull, ne, or, sql } from 'drizzle-orm'
import { db } from '#/db/index'
import type {
  AuditActionType,
  AuditEvent,
  BillingCadence,
  CompatibilityMigrationReport,
  NewAuditEvent,
  PlanEntitlements,
  SubscriptionStatus,
} from '#/db/schema'
import {
  auditEvents,
  compatibilityMigrations,
  invoices,
  member,
  orders,
  organization,
  plans,
  platformAdminUsers,
  productionTasks,
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
  const baseQuery = db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
    })
    .from(organization)
    .orderBy(desc(organization.createdAt))
    .limit(100)

  const orgs = search
    ? await baseQuery.where(
        or(
          ilike(organization.name, `%${search}%`),
          ilike(organization.slug, `%${search}%`),
        ),
      )
    : await baseQuery

  // Enrich with counts in parallel
  const enriched = await Promise.all(
    orgs.map(async (org) => {
      const [memberCount] = await db
        .select({ count: count() })
        .from(member)
        .where(eq(member.organizationId, org.id))

      const [sub] = await db
        .select({
          status: subscriptions.status,
          planName: plans.name,
        })
        .from(subscriptions)
        .leftJoin(plans, eq(subscriptions.planId, plans.id))
        .where(eq(subscriptions.orgId, org.id))
        .limit(1)

      const [orderCount] = await db
        .select({ count: count() })
        .from(orders)
        .where(eq(orders.orgId, org.id))

      const [invoiceUnpaid] = await db
        .select({ count: count() })
        .from(invoices)
        .where(
          and(
            eq(invoices.orgId, org.id),
            or(
              eq(invoices.status, 'unpaid'),
              eq(invoices.status, 'overdue'),
              eq(invoices.status, 'past_due'),
            ),
          ),
        )

      return {
        ...org,
        memberCount: memberCount?.count ?? 0,
        subscriptionStatus: sub?.status ?? null,
        planName: sub?.planName ?? null,
        orderCount: orderCount?.count ?? 0,
        invoiceUnpaidCount: invoiceUnpaid?.count ?? 0,
      }
    }),
  )

  return enriched
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
      .where(
        and(
          eq(orders.orgId, orders.orgId),
          sql`${orders.createdAt} >= ${startOfMonth.toISOString()}`,
        ),
      ),
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
    recentSignups: 0, // Filled in below
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

// ─── Export (placeholder for retention/export) ───────────────────────────────

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
      stageName: productionTasks.context,
      productName: productionTasks.context,
      status: productionTasks.status,
      board: productionTasks.board,
      createdAt: productionTasks.createdAt,
    })
    .from(productionTasks)
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
    stageName:
      typeof row.stageName === 'object' && row.stageName !== null
        ? ((row.stageName as Record<string, unknown>).productName as string)
        : null,
    productName:
      typeof row.productName === 'object' && row.productName !== null
        ? ((row.productName as Record<string, unknown>).productName as string)
        : 'Unknown',
    status: row.status,
    board: row.board,
    createdAt: row.createdAt.toISOString(),
  }))
}
