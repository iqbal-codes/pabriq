import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from './server'

export type DashboardPeriod = '7d' | '30d' | 'thisMonth' | 'lastMonth'

export function useDashboardData(period: DashboardPeriod = 'thisMonth') {
  return useQuery({
    queryKey: ['dashboard', period],
    queryFn: () => getDashboardData({ data: period }),
  })
}
