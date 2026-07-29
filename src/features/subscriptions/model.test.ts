import { sql } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import { organization } from '#/db/schema'
import {
  canDowngrade,
  canWrite,
  changePlan,
  checkEntitlement,
  getSubscription,
  startTrial,
  transitionSubscription,
} from './model'
import { seedDefaultPlans } from './seed'

const orgId = '00000000-0000-0000-0000-000000000001'

function expectNonNull<T>(value: T): NonNullable<T> {
  expect(value).not.toBeNull()
  expect(value).not.toBeUndefined()
  return value as NonNullable<T>
}

beforeEach(async () => {
  await db.execute(sql`TRUNCATE organization, plans, subscriptions CASCADE`)

  const now = new Date()
  await db.insert(organization).values([
    {
      id: orgId,
      name: 'Test Org',
      slug: 'test-org',
      createdAt: now,
      updatedAt: now,
    },
  ])

  await seedDefaultPlans()
})

afterEach(async () => {})

describe('startTrial', () => {
  it('creates subscription with trialing status and 14-day trial', async () => {
    const sub = await startTrial(orgId, 'starter')

    expect(sub.status).toBe('trialing')
    expect(sub.plan.slug).toBe('starter')

    const trialEnd = expectNonNull(sub.trialEndsAt)
    const trialStart = expectNonNull(sub.trialStartsAt)
    const diffDays =
      (trialEnd.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThanOrEqual(13)
    expect(diffDays).toBeLessThanOrEqual(15)
  })

  it('throws if org already has a subscription', async () => {
    await startTrial(orgId, 'starter')
    await expect(startTrial(orgId, 'starter')).rejects.toThrow(
      'already has a subscription',
    )
  })

  it('throws if plan slug does not exist', async () => {
    await expect(startTrial(orgId, 'nonexistent')).rejects.toThrow(
      'Plan not found',
    )
  })
})

describe('getSubscription', () => {
  it('returns null for org with no subscription', async () => {
    const result = await getSubscription(orgId)
    expect(result).toBeNull()
  })

  it('returns subscription with plan data', async () => {
    const sub = await startTrial(orgId, 'starter')
    const fetched = await getSubscription(orgId)

    const f = expectNonNull(fetched)
    expect(f.id).toBe(sub.id)
    expect(f.plan.slug).toBe('starter')
    expect(f.plan.name).toBe('Starter')
    expect(f.plan.entitlements.maxOrders).toBe(50)
    expect(f.orgId).toBe(orgId)
  })
})

describe('transitionSubscription', () => {
  it('transitions from trialing to active', async () => {
    await startTrial(orgId, 'starter')
    await transitionSubscription(orgId, 'active')

    const sub = expectNonNull(await getSubscription(orgId))
    expect(sub.status).toBe('active')
  })

  it('transitions from trialing to canceled', async () => {
    await startTrial(orgId, 'starter')
    await transitionSubscription(orgId, 'canceled')

    const sub = expectNonNull(await getSubscription(orgId))
    expect(sub.status).toBe('canceled')
    expect(sub.canceledAt).toBeInstanceOf(Date)
  })

  it('transitions from active to canceled', async () => {
    await startTrial(orgId, 'starter')
    await transitionSubscription(orgId, 'active')
    await transitionSubscription(orgId, 'canceled')

    const sub = expectNonNull(await getSubscription(orgId))
    expect(sub.status).toBe('canceled')
  })

  it('throws on invalid transition (canceled to active)', async () => {
    await startTrial(orgId, 'starter')
    await transitionSubscription(orgId, 'canceled')

    await expect(transitionSubscription(orgId, 'active')).rejects.toThrow(
      'Cannot transition',
    )
  })

  it('throws on invalid transition (active to trialing)', async () => {
    await startTrial(orgId, 'starter')
    await transitionSubscription(orgId, 'active')

    await expect(transitionSubscription(orgId, 'trialing')).rejects.toThrow(
      'Cannot transition',
    )
  })
})

describe('canWrite', () => {
  it('returns true for trialing subscription', async () => {
    await startTrial(orgId, 'starter')
    expect(await canWrite(orgId)).toBe(true)
  })

  it('returns true for active subscription', async () => {
    await startTrial(orgId, 'starter')
    await transitionSubscription(orgId, 'active')
    expect(await canWrite(orgId)).toBe(true)
  })

  it('returns false for suspended subscription', async () => {
    await startTrial(orgId, 'starter')
    await transitionSubscription(orgId, 'active')
    await transitionSubscription(orgId, 'past_due')
    await transitionSubscription(orgId, 'grace_period')
    await transitionSubscription(orgId, 'suspended')
    expect(await canWrite(orgId)).toBe(false)
  })

  it('returns false for canceled subscription', async () => {
    await startTrial(orgId, 'starter')
    await transitionSubscription(orgId, 'canceled')
    expect(await canWrite(orgId)).toBe(false)
  })

  it('returns false when no subscription exists', async () => {
    expect(await canWrite(orgId)).toBe(false)
  })
})

describe('checkEntitlement', () => {
  it('allows when under limit', async () => {
    await startTrial(orgId, 'starter')
    const result = await checkEntitlement(orgId, 'maxOrders', 10)
    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(50)
    expect(result.current).toBe(10)
  })

  it('blocks when limit reached', async () => {
    await startTrial(orgId, 'starter')
    const result = await checkEntitlement(orgId, 'maxOrders', 50)
    expect(result.allowed).toBe(false)
    expect(result.limit).toBe(50)
  })

  it('returns warning when threshold exceeded', async () => {
    await startTrial(orgId, 'starter')
    // Starter has maxOrders: 50, warningThreshold: 0.8 -> warn at 40+
    const result = await checkEntitlement(orgId, 'maxOrders', 45)
    expect(result.warning).toBe(true)
  })

  it('returns no warning when under threshold', async () => {
    await startTrial(orgId, 'starter')
    const result = await checkEntitlement(orgId, 'maxOrders', 30)
    expect(result.warning).toBe(false)
  })

  it('allows unlimited resources', async () => {
    await startTrial(orgId, 'starter')
    await changePlan(orgId, 'scale', 'monthly')

    const result = await checkEntitlement(orgId, 'maxOrders', 99999)
    expect(result.allowed).toBe(true)
    expect(result.limit).toBeNull()
  })
})

describe('canDowngrade', () => {
  it('allows downgrade when both plans have limits', async () => {
    await startTrial(orgId, 'growth')
    const result = await canDowngrade(orgId, 'starter')
    expect(result.ok).toBe(true)
  })

  it('blocks downgrade from unlimited to limited', async () => {
    await startTrial(orgId, 'starter')
    await changePlan(orgId, 'scale', 'monthly')

    const result = await canDowngrade(orgId, 'starter')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('unlimited')
  })

  it('returns error for nonexistent target plan', async () => {
    await startTrial(orgId, 'starter')
    const result = await canDowngrade(orgId, 'nonexistent')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('Target plan not found')
  })
})

describe('changePlan', () => {
  it('updates plan and preserves status', async () => {
    const sub = await startTrial(orgId, 'starter')
    await changePlan(orgId, 'growth', 'annual')

    const updated = expectNonNull(await getSubscription(orgId))
    expect(updated.plan.slug).toBe('growth')
    expect(updated.billingCadence).toBe('annual')
    expect(updated.status).toBe(sub.status)
  })

  it('throws for nonexistent plan', async () => {
    await startTrial(orgId, 'starter')
    await expect(changePlan(orgId, 'nonexistent', 'monthly')).rejects.toThrow(
      'Plan not found',
    )
  })
})
