import type { PlanEntitlements } from '#/db/schema'
import { canWrite, checkEntitlement, getSubscription } from './model'

export class SubscriptionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'SubscriptionError'
  }
}

export async function assertSubscriptionAllowsWrite(
  orgId: string,
): Promise<void> {
  const ok = await canWrite(orgId)
  if (!ok) {
    throw new SubscriptionError(
      'Subscription is suspended or canceled. Write operations are disabled.',
      'subscription_read_only',
    )
  }
}

export async function assertEntitlementAvailable(
  orgId: string,
  resource: 'orders' | 'products' | 'customers' | 'members',
): Promise<void> {
  const sub = await getSubscription(orgId)
  if (!sub) {
    throw new SubscriptionError(
      'No active subscription found',
      'no_subscription',
    )
  }

  // Map resource names to PlanEntitlements keys
  const resourceKey: keyof PlanEntitlements =
    resource === 'orders'
      ? 'maxOrders'
      : resource === 'products'
        ? 'maxProducts'
        : resource === 'customers'
          ? 'maxCustomers'
          : 'maxMembers'

  const limit = sub.plan.entitlements[resourceKey] as number | null
  if (limit === null) return // unlimited

  // We need a current count — the caller should pass it or we could query.
  // For now, rely on the caller to check before creating.
  // This function is a placeholder that enforces based on explicit counts
  // when passed, or throws a generic "check not implemented" message.

  throw new SubscriptionError(
    `Entitlement check for ${resource} requires a current count. Use checkEntitlement directly or pass counts.`,
    'entitlement_check_needs_counts',
  )
}

export async function assertEntitlementWithCount(
  orgId: string,
  resource: 'orders' | 'products' | 'customers' | 'members',
  currentCount: number,
): Promise<void> {
  const resourceKey: keyof PlanEntitlements =
    resource === 'orders'
      ? 'maxOrders'
      : resource === 'products'
        ? 'maxProducts'
        : resource === 'customers'
          ? 'maxCustomers'
          : 'maxMembers'

  const result = await checkEntitlement(orgId, resourceKey, currentCount)
  if (!result.allowed) {
    throw new SubscriptionError(
      `Cannot create ${resource}: limit of ${result.limit} reached`,
      'entitlement_limit_reached',
    )
  }
}
