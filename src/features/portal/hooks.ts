import {
  useMutation,
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
  getPortalOrderFn,
  portalFinalizeUploadFn,
  portalGetUploadUrlFn,
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
    }) => savePortalAddressFn({ data: input }),
  })
}

export function usePortalGetUploadUrl() {
  return useMutation({
    mutationFn: (input: {
      token: string
      fileName: string
      fileType: string
      fileSize: number
      lineItemId: string
    }) => portalGetUploadUrlFn({ data: input }),
  })
}

export function usePortalFinalizeUpload() {
  return useMutation({
    mutationFn: (input: {
      token: string
      lineItemId: string
      assetId: string
      originalFilename: string
      mimeType: string
      sizeBytes: number
      checksumSha256?: string
      storageKey: string
    }) => portalFinalizeUploadFn({ data: input }),
  })
}
