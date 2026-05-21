import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { member } from '#/db/schema'
import type { DashboardPeriod } from './hooks'
import {
  getDashboardMetrics,
  getRecentOrders,
  getRevenueSeries,
  getTaskStageCounts,
} from './model'

async function resolveOrgId(): Promise<string> {
  const { auth } = await import('#/lib/auth')
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')

  const memberships = await db
    .select({ orgId: member.organizationId })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1)

  if (memberships.length === 0) throw new Error('No organization')
  return memberships[0].orgId
}

export const getDashboardData = createServerFn({ method: 'GET' })
  .inputValidator((period: unknown): DashboardPeriod => {
    const validPeriods = ['7d', '30d', 'thisMonth', 'lastMonth'] as const
    const value = period as string
    return validPeriods.includes(value as (typeof validPeriods)[number])
      ? (value as DashboardPeriod)
      : 'thisMonth'
  })
  .handler(async ({ data: period }) => {
    const orgId = await resolveOrgId()

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
