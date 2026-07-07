import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'
import { queryKeys } from '#/lib/query-keys'
import type {
  CreateDraftOrderInput,
  ListOrdersParams,
  OrderCreationReadiness,
} from './model'
import {
  adjustOrderQuantityFn,
  advanceOrderStatusFn,
  completeProductionFn,
  createDraftOrderFn,
  getOrderCreationReadinessFn,
  getOrderFn,
  listOrderHistoryEventsFn,
  listOrdersFn,
  updateDraftOrderFn,
} from './server'

export function useOrdersList(filters: ListOrdersParams) {
  return useQuery({
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
export function useOrderCreationReadiness() {
  return useQuery<OrderCreationReadiness>({
    queryKey: queryKeys.orders.creationReadiness(),
    queryFn: () => getOrderCreationReadinessFn({ data: {} }),
  })
}

export function useCreateDraftOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: Omit<CreateDraftOrderInput, 'orgId'> & { orgId: string },
    ) => createDraftOrderFn({ data: input }),
    onSuccess: () =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.orders.lists() },
      ]),
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
      deadline?: Date
      manualDeadline?: boolean
      lineItems: Array<{
        id?: string
        productId: string
        quantity: number
        unitPrice?: number
        designName?: string
        notes?: string
        addonIds?: string[]
        isRepeatOrder?: boolean
        deadline?: Date
        manualDeadline?: boolean
      }>
    }) => updateDraftOrderFn({ data: input }),
    onSuccess: (_data, variables) =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.orders.lists() },
        { queryKey: queryKeys.orders.detail(variables.id) },
      ]),
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
      invoiceDueDate?: string
      invoicePaymentMethodId?: string
      invoiceNotes?: string
    }) => completeProductionFn({ data: input }),
    onSuccess: (_data, variables) =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.orders.lists() },
        { queryKey: queryKeys.orders.detail(variables.id) },
        { queryKey: queryKeys.invoices.all },
        { queryKey: queryKeys.production.all },
      ]),
  })
}

export function useAdvanceOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string }) =>
      advanceOrderStatusFn({ data: input }),
    onSuccess: (_data, variables) =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.orders.lists() },
        { queryKey: queryKeys.orders.detail(variables.id) },
      ]),
  })
}

export function useAdjustOrderQuantity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      orderId: string
      lineItemId: string
      quantity: number
      reason: string
    }) => adjustOrderQuantityFn({ data: input }),
    onSuccess: (_data, variables) =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.orders.lists() },
        { queryKey: queryKeys.orders.detail(variables.orderId) },
        { queryKey: queryKeys.invoices.all },
        { queryKey: queryKeys.production.all },
        { queryKey: queryKeys.portal.all },
      ]),
  })
}

export function useOrderHistoryEvents(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orders.history(orderId),
    queryFn: () => listOrderHistoryEventsFn({ data: { orderId } }),
  })
}
