import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { queryKeys } from '#/lib/query-keys'
import type { CreateStageInput, UpdateStageInput } from './model'
import type { MutationResult } from '#/lib/server-results'
import {
  advanceTaskFn,
  approveTaskAdvanceFn,
  createStageFn,
  deleteStageFn,
  getTaskCountsFn,
  getTaskDetailFn,
  listArchivedTasksFn,
  listBoardTasksFn,
  listStagesFn,
  listTaskActivitiesFn,
  listTasksByOrderIdFn,
  rejectTaskAdvanceFn,
  reorderStagesFn,
  saveTaskCommentFn,
  toggleStageFn,
  updateStageFn,
} from './server'

export function useStages(board?: string) {
  return useQuery({
    queryKey: queryKeys.production.stages(board),
    queryFn: () => listStagesFn({ data: { board } }),
  })
}

export function useStageMutations() {
  const queryClient = useQueryClient()
  const t = useTranslations('production')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['production', 'stages'] })
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
  board?: string
  stageId?: string
  search?: string
}) {
  return useQuery({
    queryKey: queryKeys.production.board({
      orgId: filters.orgId,
      board: filters.board,
      stageId: filters.stageId,
      search: filters.search,
    }),
    queryFn: () =>
      listBoardTasksFn({
        data: {
          board: filters.board,
          stageId: filters.stageId,
          search: filters.search,
        },
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

export function useArchivedTasks(filters: {
  orgId: string
  board?: string
  search?: string
  page?: number
  perPage?: number
}) {
  return useQuery({
    queryKey: queryKeys.production.archived(filters),
    queryFn: () => listArchivedTasksFn({ data: filters }),
  })
}

export function useTaskCounts(board?: string) {
  return useQuery({
    queryKey: queryKeys.production.counts(board),
    queryFn: () => getTaskCountsFn({ data: { board } }),
  })
}

export function useTasksByOrderId(orderId: string) {
  return useQuery({
    queryKey: queryKeys.production.tasksByOrder(orderId),
    queryFn: () => listTasksByOrderIdFn({ data: { orderId } }),
    enabled: !!orderId,
  })
}

function useTasksForOrderInternal(orderId: string) {
  return useQuery({
    queryKey: queryKeys.production.tasksByOrder(orderId),
    queryFn: () => listTasksByOrderIdFn({ data: { orderId } }),
    enabled: !!orderId,
  })
}

export function useTaskByLineItemId(lineItemId: string, orderId: string) {
  const { data: allTasks } = useTasksForOrderInternal(orderId)

  if (!allTasks) return null

  // Find task that matches lineItemId directly (not from context)
  const matchingTask = allTasks.find((bt) => bt.task.lineItemId === lineItemId)

  return matchingTask ?? null
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
    {
      taskId: string
      requirementResponses?: Record<
        string,
        { value?: string; assetIds?: string[] }
      >
    }
  >({
    mutationFn: (input) => advanceTaskFn({ data: input }),
    onSuccess: (result, vars) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      if (result.pendingApproval) {
        toast.info(t('advancementRequested'))
      } else {
        toast.success(t('movedToStage'))
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.production.task(vars.taskId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.production.activities(vars.taskId),
      })
      invalidate()
    },
  })

  const approveAdvance = useMutation<
    { ok: true; pendingApproval: boolean } | { ok: false; error: string },
    Error,
    { taskId: string; reviewNotes?: string }
  >({
    mutationFn: (input) => approveTaskAdvanceFn({ data: input }),
    onSuccess: (result, vars) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success(t('approved'))
      queryClient.invalidateQueries({
        queryKey: queryKeys.production.task(vars.taskId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.production.activities(vars.taskId),
      })
      invalidate()
    },
  })

  const rejectAdvance = useMutation<
    MutationResult,
    Error,
    { taskId: string; reviewNotes?: string }
  >({
    mutationFn: (input) => rejectTaskAdvanceFn({ data: input }),
    onSuccess: (result, vars) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success(t('rejected'))
      queryClient.invalidateQueries({
        queryKey: queryKeys.production.task(vars.taskId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.production.activities(vars.taskId),
      })
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
      invalidate()
    },
  })

  return { advanceTask, approveAdvance, rejectAdvance, saveComment }
}
