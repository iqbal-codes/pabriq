import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'
import { queryKeys } from '#/lib/query-keys'
import type { CustomerInput, ListCustomersParams } from './model'
import {
  createCustomerFn,
  deleteCustomerFn,
  getCustomerFn,
  listCustomersFn,
  updateCustomerFn,
} from './server'

export function useCustomersList(filters: ListCustomersParams) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => listCustomersFn({ data: filters }),
    placeholderData: keepPreviousData,
  })
}

export function useCustomer(id: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => getCustomerFn({ data: { id } }),
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CustomerInput) => createCustomerFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.customers.lists() },
      ])
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CustomerInput & { id: string }) =>
      updateCustomerFn({ data: input }),
    onSuccess: (_data, variables) => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.customers.lists() },
        { queryKey: queryKeys.customers.detail(variables.id) },
      ])
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCustomerFn({ data: { id } }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.customers.lists() },
      ])
    },
  })
}
