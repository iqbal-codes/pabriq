import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'
import type { UpdateOrgSettingsInput } from './server'
import { getOrgSettingsFn, updateOrgSettingsFn } from './server'

export function useOrgSettings() {
  return useQuery({
    queryKey: ['settings', 'org'],
    queryFn: () => getOrgSettingsFn(),
  })
}

export function useUpdateOrgSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateOrgSettingsInput) =>
      updateOrgSettingsFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [{ queryKey: ['settings', 'org'] }])
    },
  })
}
