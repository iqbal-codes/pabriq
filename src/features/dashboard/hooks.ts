import { useQuery } from '@tanstack/react-query'
import type {
  DashboardMetrics,
  RecentOrder,
  RevenuePoint,
  TaskStageCount,
} from './model'
import { getDashboardData } from './server'

export type DashboardPeriod = '7d' | '30d' | 'thisMonth' | 'lastMonth'

export interface DashboardData {
  metrics: DashboardMetrics
  period: DashboardPeriod
  recentOrders: RecentOrder[]
  revenueSeries: RevenuePoint[]
  taskStages: TaskStageCount[]
}

export function useDashboardData(period: DashboardPeriod = 'thisMonth') {
  return useQuery({
    queryKey: ['dashboard', period],
    queryFn: () => getDashboardData({ data: period }),
  })
}
