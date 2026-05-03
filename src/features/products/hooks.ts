import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { queryKeys } from '#/lib/query-keys'
import type { CreateProductInput, UpdateProductInput } from './model'
import {
  createProductFn,
  getProductFn,
  listProductsFn,
  updateProductFn,
} from './server'

export function useProductsList(filters: { orgId: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => listProductsFn({ data: filters }),
    placeholderData: keepPreviousData,
  })
}

export function useProduct(id: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => getProductFn({ data: { id } }),
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<CreateProductInput, 'orgId'>) =>
      createProductFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateProductInput) => updateProductFn({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.id),
      })
    },
  })
}
