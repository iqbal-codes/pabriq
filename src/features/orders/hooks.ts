import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { queryKeys } from '#/lib/query-keys'
import type { CreateDraftOrderInput, UpdateLineItemInput } from './model'
import {
  createDraftOrderFn,
  getOrderFn,
  listOrdersFn,
  removeLineItemFn,
  updateLineItemFn,
} from './server'

export function useOrdersList(filters: { orgId: string }) {
  return useSuspenseQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => listOrdersFn({ data: filters }),
  })
}

export function useOrder(params: { id: string; orgId: string }) {
  return useSuspenseQuery({
    queryKey: queryKeys.orders.detail(params.id),
    queryFn: () => getOrderFn({ data: params }),
  })
}

export function useCreateDraftOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: Omit<CreateDraftOrderInput, 'orgId'> & { orgId: string },
    ) => createDraftOrderFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() })
    },
  })
}

export function useUpdateLineItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: { itemId: string; orgId: string } & UpdateLineItemInput,
    ) => updateLineItemFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.details() })
    },
  })
}

export function useRemoveLineItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { itemId: string; orgId: string }) =>
      removeLineItemFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.details() })
    },
  })
}
