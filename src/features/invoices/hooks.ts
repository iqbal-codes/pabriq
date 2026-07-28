import type { UseMutationResult } from '@tanstack/react-query'
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'
import { queryKeys } from '#/lib/query-keys'
import type { MutationResult } from '#/lib/server-results'
import type {
  CreatePaymentInput,
  ListInvoicesParams,
  PaymentMethod,
} from './model'
import {
  confirmPaymentFn,
  createInvoiceFn,
  createPaymentFn,
  createPaymentMethodFn,
  deletePaymentMethodFn,
  getInvoiceFn,
  getInvoicePaymentProofsForInvoicesFn,
  listInvoicesFn,
  listPaymentMethodsFn,
  markInvoicePaidFn,
  reconcileInvoicePaymentFn,
  rejectPaymentFn,
  updatePaymentMethodFn,
} from './server'

export function useInvoicesList(filters: ListInvoicesParams) {
  return useQuery({
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
    onSuccess: () =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.invoices.all },
      ]),
  })
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.invoices.paymentMethods(),
    queryFn: () => listPaymentMethodsFn({ data: {} }),
  })
}

export function useCreatePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: Omit<PaymentMethod, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>,
    ) => createPaymentMethodFn({ data: input }),
    onSuccess: () =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.invoices.paymentMethods() },
      ]),
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
    onSuccess: () =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.invoices.paymentMethods() },
      ]),
  })
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePaymentMethodFn({ data: { id } }),
    onSuccess: () =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.invoices.paymentMethods() },
      ]),
  })
}

// ── Payment Hooks ──────────────────────────────────────────────

export function useInvoicePaymentProofs(invoiceIds: string[]) {
  return useQuery({
    queryKey: [...queryKeys.invoices.all, 'payment-proofs', ...invoiceIds],
    queryFn: () =>
      getInvoicePaymentProofsForInvoicesFn({ data: { invoiceIds } }),
    enabled: invoiceIds.length > 0,
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePaymentInput) => createPaymentFn({ data: input }),
    onSuccess: () =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.invoices.all },
        { queryKey: queryKeys.notifications.all },
      ]),
  })
}

export function useConfirmPayment(): UseMutationResult<
  MutationResult,
  Error,
  string
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) =>
      confirmPaymentFn({ data: { paymentId } }),
    onSuccess: () =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.invoices.all },
        { queryKey: queryKeys.notifications.all },
      ]),
  })
}

export function useRejectPayment(): UseMutationResult<
  MutationResult,
  Error,
  { paymentId: string; reason: string }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { paymentId: string; reason: string }) =>
      rejectPaymentFn({ data: input }),
    onSuccess: () =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.invoices.all },
        { queryKey: queryKeys.notifications.all },
      ]),
  })
}

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => markInvoicePaidFn({ data: { id } }),
    onSuccess: () =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.invoices.all },
        { queryKey: queryKeys.notifications.all },
      ]),
  })
}

export function useReconcilePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invoiceId: string) =>
      reconcileInvoicePaymentFn({ data: { invoiceId } }),
    onSuccess: (_result, invoiceId) =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.invoices.detail(invoiceId) },
        { queryKey: queryKeys.invoices.all },
        { queryKey: queryKeys.notifications.all },
      ]),
  })
}
