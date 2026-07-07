import { createServerFn } from '@tanstack/react-start'
import { resolveOrgId } from '#/lib/auth-session-server'
import type { DashboardPeriod } from './hooks'
import {
  getDashboardMetrics,
  getRecentOrders,
  getRevenueSeries,
  getTaskStageCounts,
} from './model'

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
