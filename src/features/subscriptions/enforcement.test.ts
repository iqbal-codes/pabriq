import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import { organization } from '#/db/schema'
import {
  assertEntitlementWithCount,
  assertSubscriptionAllowsWrite,
  SubscriptionError,
} from './enforcement'
import { changePlan, startTrial, transitionSubscription } from './model'
import { seedDefaultPlans } from './seed'

const orgId = '00000000-0000-0000-0000-000000000001'

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

describe('assertSubscriptionAllowsWrite', () => {
  it('passes for trialing subscription', async () => {
    await startTrial(orgId, 'starter')
    await expect(assertSubscriptionAllowsWrite(orgId)).resolves.toBeUndefined()
  })

  it('passes for active subscription', async () => {
    await startTrial(orgId, 'starter')
    await transitionSubscription(orgId, 'active')
    await expect(assertSubscriptionAllowsWrite(orgId)).resolves.toBeUndefined()
  })

  it('throws for suspended subscription', async () => {
    await startTrial(orgId, 'starter')
    await transitionSubscription(orgId, 'active')
    await transitionSubscription(orgId, 'past_due')
    await transitionSubscription(orgId, 'grace_period')
    await transitionSubscription(orgId, 'suspended')

    await expect(assertSubscriptionAllowsWrite(orgId)).rejects.toThrow(
      SubscriptionError,
    )
    await expect(assertSubscriptionAllowsWrite(orgId)).rejects.toThrow(
      'suspended or canceled',
    )
  })

  it('throws for canceled subscription', async () => {
    await startTrial(orgId, 'starter')
    await transitionSubscription(orgId, 'canceled')

    await expect(assertSubscriptionAllowsWrite(orgId)).rejects.toThrow(
      SubscriptionError,
    )
  })
})

describe('assertEntitlementWithCount', () => {
  it('passes when under limit', async () => {
    await startTrial(orgId, 'starter')
    await expect(
      assertEntitlementWithCount(orgId, 'orders', 10),
    ).resolves.toBeUndefined()
  })

  it('throws when limit reached', async () => {
    await startTrial(orgId, 'starter')
    await expect(
      assertEntitlementWithCount(orgId, 'orders', 50),
    ).rejects.toThrow(SubscriptionError)
    await expect(
      assertEntitlementWithCount(orgId, 'orders', 50),
    ).rejects.toThrow('limit of 50 reached')
  })

  it('passes for unlimited resources (scale plan)', async () => {
    await startTrial(orgId, 'starter')
    await changePlan(orgId, 'scale', 'monthly')
    await expect(
      assertEntitlementWithCount(orgId, 'orders', 99999),
    ).resolves.toBeUndefined()
  })
})
