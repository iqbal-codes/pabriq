import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { queryKeys } from '#/lib/query-keys'
import type {
  CreateProductInput,
  ListProductsParams,
  UpdateProductInput,
} from './model'
import {
  calculateProductPriceFn,
  createProductFn,
  getProductFn,
  listBreakpointsFn,
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
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() })
    },
  })
}

export function useProductBreakpoints(productId: string) {
  return useQuery({
    queryKey: queryKeys.products.breakpoints(productId),
    queryFn: () => listBreakpointsFn({ data: { productId } }),
  })
}

type ProductPriceResult =
  | { ok: true; unitPrice: number; total: number }
  | { ok: false; error: string }

export function useProductPrice(
  productId: string,
  quantity: number,
  pricingMode?: 'interpolated' | 'step',
) {
  return useQuery({
    queryKey: queryKeys.products.pricing(productId, quantity),
    queryFn: () =>
      calculateProductPriceFn({
        data: { productId, quantity, pricingMode },
      }) as Promise<ProductPriceResult>,
    enabled: quantity > 0 && !!productId,
  })
}
export function useCalculateProductPrice() {
  return useMutation({
    mutationFn: (input: {
      productId: string
      quantity: number
      pricingMode?: 'interpolated' | 'step'
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
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.id),
      })
    },
  })
}
