import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import type { OrderTaskEvent } from '#/features/portal/model'
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'
import { queryKeys } from '#/lib/query-keys'
import type { MutationResult } from '#/lib/server-results'
import type { CreateStageInput, UpdateStageInput } from './model'
import {
  advanceTaskFn,
  approveTaskAdvanceFn,
  createStageFn,
  deleteStageFn,
  getOrderTasksTimelineFn,
  getTaskDetailFn,
  listArchivedTasksFn,
  listBoardTasksFn,
  listDevicesFn,
  listStagesFn,
  listTaskActivitiesFn,
  listTasksByOrderIdFn,
  registerDeviceFn,
  rejectTaskAdvanceFn,
  reorderStagesFn,
  returnTaskForReworkFn,
  revokeDeviceFn,
  rotateDeviceTokenFn,
  saveRequirementResponsesFn,
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
    return invalidateMutationQueries(queryClient, [
      { queryKey: ['production', 'stages'] },
    ])
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
      return invalidate()
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
      return invalidate()
    },
  })

  const deleteStage = useMutation<MutationResult, Error, { id: string }>({
    mutationFn: (input) => deleteStageFn({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      return invalidate()
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
      return invalidate()
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
      return invalidate()
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

export function useArchivedTasks(
  filters: {
    orgId: string
    board?: string
    search?: string
    sort?: { field: string; direction: 'asc' | 'desc' } | null
    page?: number
    perPage?: number
  },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.production.archived(filters),
    queryFn: () => listArchivedTasksFn({ data: filters }),
    ...options,
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

  const handleMutationError = (error: Error) => {
    toast.error(error.message)
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
    onError: handleMutationError,
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
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.production.task(vars.taskId) },
        { queryKey: queryKeys.production.activities(vars.taskId) },
        { queryKey: [queryKeys.production.all[0], 'board'] },
      ])
    },
  })

  const saveRequirementResponse = useMutation<
    MutationResult,
    Error,
    {
      taskId: string
      requirementResponses: Record<
        string,
        { value?: string; assetIds?: string[] }
      >
    }
  >({
    mutationFn: (input) => saveRequirementResponsesFn({ data: input }),
    onError: handleMutationError,
    onSuccess: (result, vars) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.production.task(vars.taskId) },
        { queryKey: [queryKeys.production.all[0], 'board'] },
      ])
    },
  })

  const approveAdvance = useMutation<
    { ok: true; pendingApproval: boolean } | { ok: false; error: string },
    Error,
    { taskId: string; reviewNotes?: string }
  >({
    mutationFn: (input) => approveTaskAdvanceFn({ data: input }),
    onError: handleMutationError,
    onSuccess: (result, vars) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success(t('approved'))
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.production.task(vars.taskId) },
        { queryKey: queryKeys.production.activities(vars.taskId) },
        { queryKey: [queryKeys.production.all[0], 'board'] },
        { queryKey: queryKeys.notifications.all },
      ])
    },
  })

  const rejectAdvance = useMutation<
    MutationResult,
    Error,
    { taskId: string; reviewNotes?: string }
  >({
    mutationFn: (input) => rejectTaskAdvanceFn({ data: input }),
    onError: handleMutationError,
    onSuccess: (result, vars) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success(t('rejected'))
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.production.task(vars.taskId) },
        { queryKey: queryKeys.production.activities(vars.taskId) },
        { queryKey: [queryKeys.production.all[0], 'board'] },
        { queryKey: queryKeys.notifications.all },
      ])
    },
  })

  const saveComment = useMutation<
    MutationResult,
    Error,
    { taskId: string; text: string }
  >({
    mutationFn: (input) => saveTaskCommentFn({ data: input }),
    onError: handleMutationError,
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      return invalidateMutationQueries(queryClient, [
        {
          predicate: (query: { queryKey: ReadonlyArray<unknown> }) =>
            query.queryKey[0] === 'production' &&
            query.queryKey[1] === 'activities',
        },
        { queryKey: [queryKeys.production.all[0], 'board'] },
      ])
    },
  })

  const returnForRework = useMutation<
    MutationResult,
    Error,
    { taskId: string; reviewNotes?: string; targetStageId?: string }
  >({
    mutationFn: (input) => returnTaskForReworkFn({ data: input }),
    onError: handleMutationError,
    onSuccess: (result, vars) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success(t('rejected'))
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.production.task(vars.taskId) },
        { queryKey: queryKeys.production.activities(vars.taskId) },
        { queryKey: [queryKeys.production.all[0], 'board'] },
        { queryKey: queryKeys.notifications.all },
      ])
    },
  })

  return {
    advanceTask,
    saveRequirementResponse,
    approveAdvance,
    rejectAdvance,
    returnForRework,
    saveComment,
  }
}

export function useShopFloorDevices() {
  return useQuery({
    queryKey: ['shop-floor-devices'],
    queryFn: () => listDevicesFn(),
  })
}

export function useShopFloorDeviceMutations() {
  const queryClient = useQueryClient()

  const registerDevice = useMutation({
    mutationFn: (input: {
      name: string
      code?: string
      allowedStageIds?: string[]
    }) => registerDeviceFn({ data: input }),
    onSuccess: () => {
      toast.success('Device registered successfully')
      void queryClient.invalidateQueries({ queryKey: ['shop-floor-devices'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const rotateToken = useMutation({
    mutationFn: (input: { id: string }) => rotateDeviceTokenFn({ data: input }),
    onSuccess: () => {
      toast.success('Device credential rotated')
      void queryClient.invalidateQueries({ queryKey: ['shop-floor-devices'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const revokeDevice = useMutation({
    mutationFn: (input: { id: string }) => revokeDeviceFn({ data: input }),
    onSuccess: () => {
      toast.success('Device revoked')
      void queryClient.invalidateQueries({ queryKey: ['shop-floor-devices'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return { registerDevice, rotateToken, revokeDevice }
}

export function useOrderTasksTimeline(orderId: string) {
  return useQuery<OrderTaskEvent[], Error>({
    queryKey: queryKeys.production.timeline(orderId),
    queryFn: () => getOrderTasksTimelineFn({ data: { orderId } }),
    enabled: !!orderId,
  })
}
