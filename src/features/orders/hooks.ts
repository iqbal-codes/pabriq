import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { queryKeys } from '#/lib/query-keys'
import type { CreateDraftOrderInput, ListOrdersParams } from './model'
import {
  createDraftOrderFn,
  getOrderFn,
  listOrdersFn,
  updateDraftOrderFn,
} from './server'

export function useOrdersList(filters: ListOrdersParams) {
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

export function useUpdateDraftOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      id: string
      orgId: string
      customerId: string
      notes?: string
      lineItems: Array<{
        id?: string
        productId: string
        quantity: number
        unitPrice?: number
        name?: string
        notes?: string
      }>
    }) => updateDraftOrderFn({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(variables.id),
      })
    },
  })
}
