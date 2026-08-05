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
  CreateProductTemplateInput,
  UpdateProductTemplateInput,
} from './model'
import {
  archiveProductTemplateFn,
  createProductTemplateFn,
  deleteProductTemplateFn,
  duplicateProductTemplateFn,
  getProductTemplateFn,
  listBusinessTemplatesFn,
  listProductTemplatesFn,
  materializeBusinessTemplateFn,
  updateProductTemplateFn,
} from './server'

export function useBusinessTemplates() {
  return useQuery({
    queryKey: queryKeys.productTemplates.businessTemplates(),
    queryFn: () => listBusinessTemplatesFn(),
    placeholderData: keepPreviousData,
  })
}

export function useProductTemplates() {
  return useQuery({
    queryKey: queryKeys.productTemplates.list(),
    queryFn: () => listProductTemplatesFn(),
    placeholderData: keepPreviousData,
  })
}

export function useProductTemplate(id: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.productTemplates.detail(id),
    queryFn: () => getProductTemplateFn({ data: { id } }),
  })
}

export function useCreateProductTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<CreateProductTemplateInput, 'orgId'>) =>
      createProductTemplateFn({ data: input }),
    onSuccess: () =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.productTemplates.lists() },
      ]),
  })
}

export function useUpdateProductTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<UpdateProductTemplateInput, 'orgId'>) =>
      updateProductTemplateFn({ data: input }),
    onSuccess: (_result, variables) =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.productTemplates.lists() },
        { queryKey: queryKeys.productTemplates.detail(variables.id) },
      ]),
  })
}

export function useDuplicateProductTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; name?: string }) =>
      duplicateProductTemplateFn({ data: input }),
    onSuccess: () =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.productTemplates.lists() },
      ]),
  })
}

export function useArchiveProductTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archiveProductTemplateFn({ data: { id } }),
    onSuccess: (_result, id) =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.productTemplates.lists() },
        { queryKey: queryKeys.productTemplates.detail(id) },
      ]),
  })
}

export function useDeleteProductTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProductTemplateFn({ data: { id } }),
    onSuccess: () =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.productTemplates.lists() },
      ]),
  })
}

export function useMaterializeBusinessTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (businessTemplateId: string) =>
      materializeBusinessTemplateFn({ data: { businessTemplateId } }),
    onSuccess: () =>
      invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.productTemplates.lists() },
        { queryKey: queryKeys.productTemplates.businessTemplates() },
      ]),
  })
}
