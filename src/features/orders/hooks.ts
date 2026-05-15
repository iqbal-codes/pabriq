import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { queryKeys } from '#/lib/query-keys'
import type { CreateDraftOrderInput, ListOrdersParams } from './model'
import {
  approveOrderFn,
  completeProductionFn,
  createDraftOrderFn,
  getOrderFn,
  listOrdersFn,
  rejectOrderFn,
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
      customerId: string | null
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

export function useApproveOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string }) => approveOrderFn({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(variables.id),
      })
    },
  })
}

export function useRejectOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      rejectOrderFn({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(variables.id),
      })
    },
  })
}

export function useCompleteProduction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      id: string
      courier?: string
      trackingNumber?: string
      shippingFee?: number
      shippingFeeDescription?: string
      invoicePercentage?: number
      invoiceDueDate: string
      invoicePaymentMethodId: string
      invoiceNotes?: string
    }) => completeProductionFn({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(variables.id),
      })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}
