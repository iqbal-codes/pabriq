import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { queryKeys } from '#/lib/query-keys'
import type {
  ConfirmPortalOrderInput,
  UpdatePortalLineItemInput,
} from './model'
import {
  confirmPortalOrderFn,
  generateOrderTokenFn,
  getOrderTasksTimelineFn,
  getPortalOrderFn,
  portalGetInvoiceUploadUrlFn,
  savePortalAddressFn,
  submitPaymentProofFn,
  updatePortalLineItemFn,
} from './server'

export function usePortalOrder(token: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.portal.order(token),
    queryFn: () => getPortalOrderFn({ data: { token } }),
  })
}

export function useOrderTimeline(token: string) {
  return useQuery({
    queryKey: queryKeys.portal.timeline(token),
    queryFn: () => getOrderTasksTimelineFn({ data: { token } }),
    enabled: !!token,
  })
}

export function useConfirmPortalOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ConfirmPortalOrderInput) =>
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
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { itemId: string } & UpdatePortalLineItemInput) =>
      updatePortalLineItemFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portal.all })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.portal.all })
    },
  })
}

export function usePortalGetInvoiceUploadUrl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      token: string
      invoiceId: string
      fileName: string
      fileType: string
      fileSize: number
    }) => portalGetInvoiceUploadUrlFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portal.all })
    },
  })
}

export function useSubmitPaymentProof() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      token: string
      invoiceId: string
      assetId: string
      originalFilename: string
      mimeType: string
      sizeBytes: number
      storageKey: string
    }) => submitPaymentProofFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portal.all })
    },
  })
}
