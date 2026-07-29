import type { PlanEntitlements } from '#/db/schema'
import { canWrite, checkEntitlement } from '#/features/subscriptions/model'

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
