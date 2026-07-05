import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '#/lib/query-keys'
import { listActionNotificationsFn } from './server'

export function useActionNotifications(limit?: number) {
  return useQuery({
    queryKey: queryKeys.notifications.list({ limit }),
    queryFn: () => listActionNotificationsFn({ data: { limit } }),
    refetchInterval: 60_000,
  })
}
