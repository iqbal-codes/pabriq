import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { queryKeys } from '#/lib/query-keys'
import type { CreateStageInput, UpdateStageInput } from './model'
import type { MutationResult } from './server'
import {
  advanceTaskFn,
  approveTaskAdvanceFn,
  createStageFn,
  deleteStageFn,
  getTaskDetailFn,
  listBoardTasksFn,
  listStagesFn,
  listTaskActivitiesFn,
  rejectTaskAdvanceFn,
  reorderStagesFn,
  saveTaskCommentFn,
  toggleStageFn,
  updateStageFn,
} from './server'

export function useStages() {
  return useQuery({
    queryKey: queryKeys.production.stages(),
    queryFn: () => listStagesFn(),
  })
}

export function useStageMutations() {
  const queryClient = useQueryClient()
  const t = useTranslations('production')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.production.stages() })
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

export function useBoardTasks(filters: {
  orgId: string
  stageId?: string
  search?: string
}) {
  return useQuery({
    queryKey: queryKeys.production.board({
      orgId: filters.orgId,
      stageId: filters.stageId,
      search: filters.search,
    }),
    queryFn: () =>
      listBoardTasksFn({
        data: { stageId: filters.stageId, search: filters.search },
      }),
  })
}

export function useTaskDetail(taskId: string) {
  return useQuery({
    queryKey: queryKeys.production.task(taskId),
    queryFn: () => getTaskDetailFn({ data: { taskId } }),
    enabled: !!taskId,
  })
}

export function useTaskActivities(taskId: string) {
  return useQuery({
    queryKey: queryKeys.production.activities(taskId),
    queryFn: () => listTaskActivitiesFn({ data: { taskId } }),
    enabled: !!taskId,
  })
}

export function useTaskMutations() {
  const queryClient = useQueryClient()
  const t = useTranslations('production')

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: [queryKeys.production.all[0], 'board'],
    })
  }

  const advanceTask = useMutation<
    { ok: true; pendingApproval: boolean } | { ok: false; error: string },
    Error,
    { taskId: string }
  >({
    mutationFn: (input) => advanceTaskFn({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      if (result.pendingApproval) {
        toast.info(t('advancementRequested'))
      } else {
        toast.success(t('movedToStage'))
      }
      invalidate()
    },
  })

  const approveAdvance = useMutation<
    { ok: true; pendingApproval: boolean } | { ok: false; error: string },
    Error,
    { taskId: string; reviewNotes?: string }
  >({
    mutationFn: (input) => approveTaskAdvanceFn({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success(t('approved'))
      invalidate()
    },
  })

  const rejectAdvance = useMutation<
    MutationResult,
    Error,
    { taskId: string; reviewNotes?: string }
  >({
    mutationFn: (input) => rejectTaskAdvanceFn({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success(t('rejected'))
      invalidate()
    },
  })

  const saveComment = useMutation<
    MutationResult,
    Error,
    { taskId: string; text: string }
  >({
    mutationFn: (input) => saveTaskCommentFn({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      queryClient.invalidateQueries({
        predicate: (query: { queryKey: ReadonlyArray<unknown> }) =>
          query.queryKey[0] === 'production' &&
          query.queryKey[1] === 'activities',
      })
    },
  })

  return { advanceTask, approveAdvance, rejectAdvance, saveComment }
}
