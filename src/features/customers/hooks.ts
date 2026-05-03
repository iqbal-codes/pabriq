import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { queryKeys } from '#/lib/query-keys'
import type { CustomerInput } from './model'
import {
  createCustomerFn,
  getCustomerFn,
  listCustomersFn,
  updateCustomerFn,
} from './server'

export function useCustomersList(filters: { orgId: string; search?: string }) {
  return useSuspenseQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => listCustomersFn({ data: filters }),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CustomerInput & { id: string }) =>
      updateCustomerFn({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.id),
      })
    },
  })
}
