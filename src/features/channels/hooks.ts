import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { ChannelAccessStatus } from '#/db/schema'
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'
import { queryKeys } from '#/lib/query-keys'
import {
  approveChannelAccessFn,
  connectTelegramChannelFn,
  disconnectTelegramChannelFn,
  getConnectedChannelFn,
  listChannelAccessesFn,
  revokeChannelAccessFn,
} from './server'

export function useConnectedChannel() {
  return useQuery({
    queryKey: queryKeys.channels.connection(),
    queryFn: () => getConnectedChannelFn(),
  })
}

export function useChannelAccesses(status?: ChannelAccessStatus) {
  return useQuery({
    queryKey: queryKeys.channels.accesses(status),
    queryFn: () => listChannelAccessesFn({ data: status ? { status } : {} }),
  })
}

function invalidateChannels(queryClient: QueryClient) {
  return invalidateMutationQueries(queryClient, [
    { queryKey: queryKeys.channels.all },
  ])
}

export function useConnectTelegramChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { botToken: string }) =>
      connectTelegramChannelFn({ data: input }),
    onSuccess: () => invalidateChannels(queryClient),
  })
}

export function useDisconnectTelegramChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (_input: Record<string, never>) =>
      disconnectTelegramChannelFn({ data: {} }),
    onSuccess: () => invalidateChannels(queryClient),
  })
}

export function useApproveChannelAccess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string }) =>
      approveChannelAccessFn({ data: input }),
    onSuccess: () => invalidateChannels(queryClient),
  })
}

export function useRevokeChannelAccess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string }) =>
      revokeChannelAccessFn({ data: input }),
    onSuccess: () => invalidateChannels(queryClient),
  })
}
