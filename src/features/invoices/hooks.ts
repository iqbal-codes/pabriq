import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { queryKeys } from '#/lib/query-keys'
import type { ListInvoicesParams, PaymentMethod } from './model'
import {
  createInvoiceFn,
  createPaymentMethodFn,
  deletePaymentMethodFn,
  getInvoiceFn,
  listInvoicesFn,
  listPaymentMethodsFn,
  updatePaymentMethodFn,
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

export function useCreatePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>,
    ) => createPaymentMethodFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.paymentMethods(),
      })
    },
  })
}

export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: { id: string } & Partial<
        Omit<PaymentMethod, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>
      >,
    ) => updatePaymentMethodFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.paymentMethods(),
      })
    },
  })
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePaymentMethodFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.paymentMethods(),
      })
    },
  })
}
