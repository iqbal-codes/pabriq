import {
  type UseMutationResult,
  type UseSuspenseQueryResult,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import type { Material, MaterialInput } from '#/features/materials/model'
import {
  deleteMaterialFn,
  listMaterialsFn,
  saveMaterialFn,
} from '#/features/materials/server'
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'
import { queryKeys } from '#/lib/query-keys'
import type { MutationResult } from '#/lib/server-results'

export function useMaterials(): UseSuspenseQueryResult<Material[], Error> {
  return useSuspenseQuery({
    queryKey: queryKeys.materials.list(),
    queryFn: () => listMaterialsFn(),
  })
}

export function useSaveMaterialMutation(): UseMutationResult<
  MutationResult,
  Error,
  MaterialInput
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MaterialInput) => saveMaterialFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.materials.all },
        { queryKey: queryKeys.configuration.all },
      ])
    },
  })
}

export function useDeleteMaterialMutation(): UseMutationResult<
  MutationResult,
  Error,
  string
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (key: string) => deleteMaterialFn({ data: { key } }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.materials.all },
        { queryKey: queryKeys.configuration.all },
      ])
    },
  })
}
