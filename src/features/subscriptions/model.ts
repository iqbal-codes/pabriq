import { eq } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  type BillingCadence,
  type PlanEntitlements,
  plans,
  type SubscriptionStatus,
  subscriptions,
} from '#/db/schema'

import { seedDefaultPlans } from '#/features/subscriptions/seed'

export type SubscriptionWithPlan = {
  id: string
  orgId: string
  planId: string
  status: SubscriptionStatus
  billingCadence: BillingCadence
  trialStartsAt: Date | null
  trialEndsAt: Date | null
  currentPeriodStartsAt: Date | null
  currentPeriodEndsAt: Date | null
  canceledAt: Date | null
  suspendedAt: Date | null
  gracePeriodEndsAt: Date | null
  plan: {
    slug: string
    name: string
    version: number
    description: string | null
    entitlements: PlanEntitlements
    monthlyPriceCents: number
    annualPriceCents: number
  }
  createdAt: Date
  updatedAt: Date
}

export type EntitlementWarning = {
  resource: string
  current: number
  limit: number | null
  threshold: number
}

const VALID_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  trialing: ['active', 'canceled'],
  active: ['past_due', 'canceled'],
  past_due: ['active', 'grace_period'],
  grace_period: ['active', 'suspended'],
  suspended: ['active', 'canceled'],
  canceled: [],
}

export async function getSubscription(
  orgId: string,
): Promise<SubscriptionWithPlan | null> {
  const rows = await db
    .select({
      id: subscriptions.id,
      orgId: subscriptions.orgId,
      planId: subscriptions.planId,
      status: subscriptions.status,
      billingCadence: subscriptions.billingCadence,
      trialStartsAt: subscriptions.trialStartsAt,
      trialEndsAt: subscriptions.trialEndsAt,
      currentPeriodStartsAt: subscriptions.currentPeriodStartsAt,
      currentPeriodEndsAt: subscriptions.currentPeriodEndsAt,
      canceledAt: subscriptions.canceledAt,
      suspendedAt: subscriptions.suspendedAt,
      gracePeriodEndsAt: subscriptions.gracePeriodEndsAt,
      createdAt: subscriptions.createdAt,
      updatedAt: subscriptions.updatedAt,
      planSlug: plans.slug,
      planName: plans.name,
      planVersion: plans.version,
      planDescription: plans.description,
      entitlements: plans.entitlements,
      monthlyPriceCents: plans.monthlyPriceCents,
      annualPriceCents: plans.annualPriceCents,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.orgId, orgId))
    .limit(1)

  if (rows.length === 0) return null

  const row = rows[0]
  return {
    id: row.id,
    orgId: row.orgId,
    planId: row.planId,
    status: row.status,
    billingCadence: row.billingCadence,
    trialStartsAt: row.trialStartsAt,
    trialEndsAt: row.trialEndsAt,
    currentPeriodStartsAt: row.currentPeriodStartsAt,
    currentPeriodEndsAt: row.currentPeriodEndsAt,
    canceledAt: row.canceledAt,
    suspendedAt: row.suspendedAt,
    gracePeriodEndsAt: row.gracePeriodEndsAt,
    plan: {
      slug: row.planSlug,
      name: row.planName,
      version: row.planVersion,
      description: row.planDescription,
      entitlements: row.entitlements as PlanEntitlements,
      monthlyPriceCents: row.monthlyPriceCents,
      annualPriceCents: row.annualPriceCents,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function startTrial(
  orgId: string,
  planSlug: string,
): Promise<SubscriptionWithPlan> {
  const existing = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .limit(1)

  if (existing.length > 0) {
    throw new Error('Organization already has a subscription')
  }

  // Ensure default plans exist before looking up the requested plan
  await seedDefaultPlans()

  const planRows = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.slug, planSlug))
    .limit(1)

  if (planRows.length === 0) {
    throw new Error(`Plan not found: ${planSlug}`)
  }

  const now = new Date()
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  await db.insert(subscriptions).values({
    id: crypto.randomUUID(),
    orgId,
    planId: planRows[0].id,
    status: 'trialing',
    billingCadence: 'monthly',
    trialStartsAt: now,
    trialEndsAt: trialEnd,
    currentPeriodStartsAt: now,
    currentPeriodEndsAt: trialEnd,
  })

  const result = await getSubscription(orgId)
  if (!result) throw new Error('Failed to create subscription')
  return result
}

export async function transitionSubscription(
  orgId: string,
  targetStatus: SubscriptionStatus,
): Promise<void> {
  const sub = await db
    .select({ status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .limit(1)

  if (sub.length === 0) throw new Error('No subscription found')

  const currentStatus = sub[0].status
  const allowed = VALID_TRANSITIONS[currentStatus]
  if (!allowed.includes(targetStatus)) {
    throw new Error(
      `Cannot transition subscription from '${currentStatus}' to '${targetStatus}'`,
    )
  }

  const updates: Partial<{
    status: SubscriptionStatus
    canceledAt: Date | null
    suspendedAt: Date | null
    gracePeriodEndsAt: Date | null
  }> & { updatedAt?: Date } = {
    status: targetStatus,
    updatedAt: new Date(),
  }

  if (targetStatus === 'canceled') {
    updates.canceledAt = new Date()
  }
  if (targetStatus === 'suspended') {
    updates.suspendedAt = new Date()
  }
  if (targetStatus === 'active') {
    updates.suspendedAt = null
  }

  await db
    .update(subscriptions)
    .set(updates)
    .where(eq(subscriptions.orgId, orgId))
}

export async function canWrite(orgId: string): Promise<boolean> {
  const sub = await db
    .select({ status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .limit(1)

  if (sub.length === 0) return false
  return sub[0].status !== 'suspended' && sub[0].status !== 'canceled'
}

export async function checkEntitlement(
  orgId: string,
  resource: keyof PlanEntitlements,
  currentCount: number,
): Promise<{
  allowed: boolean
  limit: number | null
  current: number
  warning: boolean
}> {
  const sub = await getSubscription(orgId)
  if (!sub) throw new Error('No subscription found')

  const entitlements = sub.plan.entitlements

  if (resource === 'features' || resource === 'warningThresholds') {
    return { allowed: true, limit: null, current: currentCount, warning: false }
  }

  const limit = entitlements[resource] as number | null
  if (limit === null) {
    return { allowed: true, limit: null, current: currentCount, warning: false }
  }

  const allowed = currentCount < limit
  const thresholds = entitlements.warningThresholds as Record<
    string,
    number | undefined
  >
  const threshold = thresholds[resource]
  const warning = threshold !== undefined && currentCount >= limit * threshold

  return { allowed, limit, current: currentCount, warning }
}

export async function getEntitlementWarnings(
  orgId: string,
  counts?: Partial<Record<keyof PlanEntitlements, number>>,
): Promise<EntitlementWarning[]> {
  const sub = await getSubscription(orgId)
  if (!sub) throw new Error('No subscription found')

  const warnings: EntitlementWarning[] = []
  const entitlements = sub.plan.entitlements

  for (const [resource, threshold] of Object.entries(
    entitlements.warningThresholds,
  )) {
    if (!threshold) continue
    const limit = entitlements[resource as keyof PlanEntitlements] as
      | number
      | null
    if (limit === null) continue

    warnings.push({
      resource,
      current: counts?.[resource as keyof PlanEntitlements] ?? 0,
      limit,
      threshold,
    })
  }

  return warnings
}

export async function canDowngrade(
  orgId: string,
  targetPlanSlug: string,
  currentCounts?: {
    maxOrders?: number
    maxProducts?: number
    maxCustomers?: number
    maxMembers?: number
  },
): Promise<{ ok: boolean; reason?: string }> {
  const sub = await getSubscription(orgId)
  if (!sub) throw new Error('No subscription found')

  const targetPlanRows = await db
    .select({ entitlements: plans.entitlements })
    .from(plans)
    .where(eq(plans.slug, targetPlanSlug))
    .limit(1)

  if (targetPlanRows.length === 0) {
    return { ok: false, reason: 'Target plan not found' }
  }

  const target = targetPlanRows[0].entitlements

  const limitResources = [
    { key: 'maxOrders' as const, label: 'orders' },
    { key: 'maxProducts' as const, label: 'products' },
    { key: 'maxCustomers' as const, label: 'customers' },
    { key: 'maxMembers' as const, label: 'members' },
  ]

  for (const { key, label } of limitResources) {
    const targetLimit = target[key]
    if (targetLimit === null) continue // no limit in target, always ok

    const currentLimit = sub.plan.entitlements[key]
    if (currentLimit === null) {
      return {
        ok: false,
        reason: `Cannot downgrade: plan currently has unlimited ${label}`,
      }
    }

    // Check actual resource usage if provided
    const actualCount = currentCounts?.[key]
    if (actualCount !== undefined && actualCount > targetLimit) {
      return {
        ok: false,
        reason: `Cannot downgrade: current ${label} count (${actualCount}) exceeds the target plan limit of ${targetLimit}`,
      }
    }
  }

  return { ok: true }
}

export async function changePlan(
  orgId: string,
  targetPlanSlug: string,
  cadence: BillingCadence,
): Promise<void> {
  const targetPlanRows = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.slug, targetPlanSlug))
    .limit(1)

  if (targetPlanRows.length === 0) {
    throw new Error(`Plan not found: ${targetPlanSlug}`)
  }

  await db
    .update(subscriptions)
    .set({
      planId: targetPlanRows[0].id,
      billingCadence: cadence,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.orgId, orgId))
}

export async function renewBillingPeriod(orgId: string): Promise<void> {
  const sub = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .limit(1)

  if (sub.length === 0) throw new Error('No subscription found')

  const now = new Date()
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await db
    .update(subscriptions)
    .set({
      currentPeriodStartsAt: now,
      currentPeriodEndsAt: periodEnd,
      updatedAt: now,
    })
    .where(eq(subscriptions.orgId, orgId))
}

export async function markPastDue(orgId: string): Promise<void> {
  await transitionSubscription(orgId, 'past_due')

  const graceEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await db
    .update(subscriptions)
    .set({ gracePeriodEndsAt: graceEnd })
    .where(eq(subscriptions.orgId, orgId))
}
