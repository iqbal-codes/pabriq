import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { queryKeys } from '#/lib/query-keys'
import type { ListInvoicesParams } from './model'
import {
  createInvoiceFn,
  getInvoiceFn,
  listInvoicesFn,
  listPaymentMethodsFn,
} from './server'

export function useInvoicesList(filters: ListInvoicesParams) {
  return useSuspenseQuery({
    queryKey: queryKeys.invoices.list(filters),
    queryFn: () => listInvoicesFn({ data: filters }),
  })
}

export function useInvoice(id: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: () => getInvoiceFn({ data: { id } }),
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof createInvoiceFn>[0]['data']) =>
      createInvoiceFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all })
    },
  })
}

export function usePaymentMethods() {
  return useSuspenseQuery({
    queryKey: queryKeys.invoices.paymentMethods(),
    queryFn: () => listPaymentMethodsFn({ data: {} }),
  })
}
