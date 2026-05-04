import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import type { CreateStageInput, UpdateStageInput } from './model'
import type { MutationResult } from './server'
import {
  createStageFn,
  deleteStageFn,
  listStagesFn,
  reorderStagesFn,
  toggleStageFn,
  updateStageFn,
} from './server'

export function useStages() {
  return useQuery({
    queryKey: ['production-stages'],
    queryFn: () => listStagesFn(),
  })
}

export function useStageMutations() {
  const queryClient = useQueryClient()
  const t = useTranslations('production')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['production-stages'] })
  }

  const createStage = useMutation<
    MutationResult,
    Error,
    Omit<CreateStageInput, 'orgId'>
  >({
    mutationFn: (input) => createStageFn({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success(t('stageManagement'))
      invalidate()
    },
  })

  const updateStage = useMutation<
    MutationResult,
    Error,
    Omit<UpdateStageInput, 'orgId'> & { id: string }
  >({
    mutationFn: (input) => updateStageFn({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success(t('stageManagement'))
      invalidate()
    },
  })

  const deleteStage = useMutation<MutationResult, Error, { id: string }>({
    mutationFn: (input) => deleteStageFn({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      invalidate()
    },
  })

  const toggleStage = useMutation<
    MutationResult,
    Error,
    { id: string; active: boolean }
  >({
    mutationFn: (input) => toggleStageFn({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      invalidate()
    },
  })

  const reorderStages = useMutation<
    MutationResult,
    Error,
    { stageIds: string[] }
  >({
    mutationFn: (input) => reorderStagesFn({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      invalidate()
    },
  })

  return { createStage, updateStage, deleteStage, toggleStage, reorderStages }
}
