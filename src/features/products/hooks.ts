import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'
import { queryKeys } from '#/lib/query-keys'
import type {
  CreateProductInput,
  ListProductsParams,
  UpdateProductInput,
} from './model'
import {
  calculateProductPriceFn,
  createProductFn,
  deleteProductFn,
  getProductFn,
  listBreakpointsFn,
  listProductAddonsFn,
  listProductsFn,
  updateProductFn,
} from './server'

export function useProductsList(filters: ListProductsParams) {
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
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.products.lists() },
      ])
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProductFn({ data: { id } }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.products.lists() },
      ])
    },
  })
}

export function useProductBreakpoints(productId: string) {
  return useQuery({
    queryKey: queryKeys.products.breakpoints(productId),
    queryFn: () => listBreakpointsFn({ data: { productId } }),
  })
}

export function useProductAddons(productId: string) {
  return useQuery({
    queryKey: queryKeys.products.addons(productId),
    queryFn: () => listProductAddonsFn({ data: { productId } }),
    enabled: !!productId,
  })
}

type ProductPriceResult =
  | { ok: true; unitPrice: number; total: number }
  | { ok: false; error: string }

export function useCalculateProductPrice() {
  return useMutation({
    mutationFn: (input: {
      productId: string
      quantity: number
      pricingMode?: 'interpolated' | 'step'
      isRepeatOrder?: boolean
      addonIds?: string[]
    }) =>
      calculateProductPriceFn({ data: input }) as Promise<ProductPriceResult>,
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<UpdateProductInput, 'orgId'>) =>
      updateProductFn({ data: input }),
    onSuccess: (_data, variables) => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.products.lists() },
        { queryKey: queryKeys.products.detail(variables.id) },
        { queryKey: queryKeys.products.breakpoints(variables.id) },
        { queryKey: queryKeys.products.addons(variables.id) },
        { queryKey: ['products', 'pricing', variables.id] },
      ])
    },
  })
}
