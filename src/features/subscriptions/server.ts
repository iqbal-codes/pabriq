import { createServerFn } from '@tanstack/react-start'
import type { BillingCadence } from '#/db/schema'
import type { Role } from '#/features/permissions/model'
import { canManageSettings } from '#/features/permissions/model'
import type { SubscriptionWithPlan } from '#/features/subscriptions/model'
import {
  canDowngrade,
  changePlan,
  getSubscription,
  transitionSubscription,
} from '#/features/subscriptions/model'
import { resolveOrgAndRole, resolveOrgId } from '#/lib/auth-session-server'

async function requireSettingsAdmin(): Promise<{ orgId: string }> {
  const { orgId, role } = await resolveOrgAndRole()
  if (!canManageSettings(role as Role)) {
    throw new Error('Not authorized')
  }
  return { orgId }
}

export const getSubscriptionFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SubscriptionWithPlan | null> => {
    const orgId = await resolveOrgId()
    return getSubscription(orgId)
  },
)

export const changePlanFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { planSlug: string; cadence: BillingCadence }) => input,
  )
  .handler(
    async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        const { orgId } = await requireSettingsAdmin()

        const downgradeCheck = await canDowngrade(orgId, data.planSlug)
        if (!downgradeCheck.ok) {
          return {
            ok: false,
            error: downgradeCheck.reason ?? 'Downgrade not allowed',
          }
        }

        await changePlan(orgId, data.planSlug, data.cadence)
        return { ok: true }
      } catch (err: unknown) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }
    },
  )

export const cancelSubscriptionFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const { orgId } = await requireSettingsAdmin()
      await transitionSubscription(orgId, 'canceled')
      return { ok: true }
    } catch (err: unknown) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  },
)

export const reinstateSubscriptionFn = createServerFn({
  method: 'POST',
}).handler(async (): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    const { orgId } = await requireSettingsAdmin()
    await transitionSubscription(orgId, 'active')
    return { ok: true }
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
})
