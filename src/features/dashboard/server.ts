import { createServerFn } from '@tanstack/react-start'
import { count, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { customers, member, orders, products } from '#/db/schema'
import type { SubscriptionWithPlan } from '#/features/subscriptions/model'
import { resolveOrgId } from '#/lib/auth-session-server'
import type { DashboardPeriod } from './hooks'

export const getDashboardData = createServerFn({ method: 'GET' })
  .inputValidator((period: unknown): DashboardPeriod => {
    const validPeriods = ['7d', '30d', 'thisMonth', 'lastMonth'] as const
    const value = period as string
    return validPeriods.includes(value as (typeof validPeriods)[number])
      ? (value as DashboardPeriod)
      : 'thisMonth'
  })
  .handler(async ({ data: period }) => {
    const [
      orgId,
      {
        getDashboardMetrics,
        getRecentOrders,
        getRevenueSeries,
        getTaskStageCounts,
      },
    ] = await Promise.all([resolveOrgId(), import('./model')])

    const [metrics, revenueSeries, taskStages, recentOrders] =
      await Promise.all([
        getDashboardMetrics(orgId, period),
        getRevenueSeries(orgId, period),
        getTaskStageCounts(orgId),
        getRecentOrders(orgId, 5),
      ])

    return {
      metrics,
      period,
      recentOrders,
      revenueSeries,
      taskStages,
    }
  })

export type SubscriptionWithUsage = {
  subscription: SubscriptionWithPlan | null
  usage: {
    orders: number
    products: number
    customers: number
    members: number
  }
}

export const getSubscriptionWithUsageFn = createServerFn({
  method: 'GET',
}).handler(async (): Promise<SubscriptionWithUsage> => {
  const orgId = await resolveOrgId()

  const { getSubscription } = await import('#/features/subscriptions/model')
  const [subscription, counts] = await Promise.all([
    getSubscription(orgId),
    Promise.all([
      db.select({ count: count() }).from(orders).where(eq(orders.orgId, orgId)),
      db
        .select({ count: count() })
        .from(products)
        .where(eq(products.orgId, orgId)),
      db
        .select({ count: count() })
        .from(customers)
        .where(eq(customers.orgId, orgId)),
      db
        .select({ count: count() })
        .from(member)
        .where(eq(member.organizationId, orgId)),
    ]),
  ])

  return {
    subscription,
    usage: {
      orders: counts[0][0]?.count ?? 0,
      products: counts[1][0]?.count ?? 0,
      customers: counts[2][0]?.count ?? 0,
      members: counts[3][0]?.count ?? 0,
    },
  }
})
