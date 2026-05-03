import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { queryKeys } from '#/lib/query-keys'
import type { UpdatePortalLineItemInput } from './model'
import {
  confirmPortalOrderFn,
  generateOrderTokenFn,
  getPortalOrderFn,
  savePortalAddressFn,
  updatePortalLineItemFn,
} from './server'

export function usePortalOrder(token: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.portal.order(token),
    queryFn: () => getPortalOrderFn({ data: { token } }),
  })
}

export function useConfirmPortalOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { orderId: string }) =>
      confirmPortalOrderFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portal.all })
    },
  })
}

export function useGenerateOrderToken() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { orderId: string }) =>
      generateOrderTokenFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() })
    },
  })
}

export function useUpdatePortalLineItem() {
  return useMutation({
    mutationFn: (input: { itemId: string } & UpdatePortalLineItemInput) =>
      updatePortalLineItemFn({ data: input }),
  })
}

export function useSavePortalAddress() {
  return useMutation({
    mutationFn: (input: {
      orderId: string
      areaId: string
      areaName: string
      streetAddress: string
      isWni: boolean
    }) => savePortalAddressFn({ data: input }),
  })
}
