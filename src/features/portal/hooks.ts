import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'
import { queryKeys } from '#/lib/query-keys'
import type {
  ConfirmPortalOrderInput,
  UpdatePortalLineItemInput,
} from './model'
import {
  confirmPortalOrderFn,
  getOrderTasksTimelineFn,
  getOrderTimelineFn,
  getPortalOrderFn,
  savePortalAddressFn,
  updatePortalLineItemFn,
} from './server'

export function usePortalOrder(token: string) {
  return useQuery({
    queryKey: queryKeys.portal.order(token),
    queryFn: () => getPortalOrderFn({ data: { token } }),
  })
}

export function useOrderTasksTimeline(token: string) {
  return useQuery({
    queryKey: queryKeys.portal.timeline(token),
    queryFn: () => getOrderTasksTimelineFn({ data: { token } }),
    enabled: !!token,
  })
}

export function useOrderTimeline(token: string) {
  return useQuery({
    queryKey: queryKeys.portal.orderTimeline(token),
    queryFn: () => getOrderTimelineFn({ data: { token } }),
    enabled: !!token,
  })
}

export function useConfirmPortalOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ConfirmPortalOrderInput) =>
      confirmPortalOrderFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.portal.all },
      ])
    },
  })
}

export function useUpdatePortalLineItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { itemId: string } & UpdatePortalLineItemInput) =>
      updatePortalLineItemFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.portal.all },
      ])
    },
  })
}

export function useSavePortalAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      orderId: string
      areaId: string
      areaName: string
      streetAddress: string
    }) => savePortalAddressFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.portal.all },
      ])
    },
  })
}
