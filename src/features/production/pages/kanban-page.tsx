import { useRouteContext } from '@tanstack/react-router'
import { parseAsString, useQueryState } from 'nuqs'
import { useMemo, useState } from 'react'
import { useTranslations } from 'use-intl'
import { Input } from '#/components/ui/input'
import { NativeSelect } from '#/components/ui/native-select'
import { Spinner } from '#/components/ui/spinner'
import type { Role } from '#/features/permissions/model'
import { canApproveProductionTask } from '#/features/permissions/model'
import { KanbanBoard } from '../components/kanban-board'
import { ReviewModal } from '../components/review-modal'
import { TaskDetailModal } from '../components/task-detail-modal'
import {
  useBoardTasks,
  useStages,
  useTaskDetail,
  useTaskMutations,
} from '../hooks'

type Props = {
  orgId: string
}

export function KanbanPage({ orgId }: Props) {
  const t = useTranslations('production')

  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''))
  const [stageFilter, setStageFilter] = useQueryState(
    'stage',
    parseAsString.withDefault(''),
  )
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null)

  const ctx = useRouteContext({ from: '/_org/production/' }) as {
    org: { id: string; role?: string }
  }
  const role = ctx.org.role as Role
  const canApprove = canApproveProductionTask(role)

  const { data: stages } = useStages()
  const activeStages = useMemo(() => {
    if (!stages) return []
    return stages
      .filter((s) => s.active)
      .sort((a, b) => a.orderIndex - b.orderIndex)
  }, [stages])

  const filters = useMemo(
    () => ({
      orgId,
      // Show all tasks across all boards for unified view
      board: undefined,
      search: search || undefined,
      stageId: stageFilter || undefined,
    }),
    [orgId, search, stageFilter],
  )

  const { data: boardData, isLoading } = useBoardTasks(filters)
  const { data: reviewTask } = useTaskDetail(reviewTaskId ?? '')
  const { approveAdvance, rejectAdvance } = useTaskMutations()

  const reviewStageName = useMemo(() => {
    if (!reviewTask || !activeStages.length) return ''
    const s = activeStages.find((st) => st.id === reviewTask.stageId)
    return s?.name ?? ''
  }, [reviewTask, activeStages])

  const reviewNextStageName = useMemo(() => {
    if (!reviewTask || !activeStages.length) return ''
    const idx = activeStages.findIndex((st) => st.id === reviewTask.stageId)
    const next = activeStages[idx + 1]
    return next?.name ?? ''
  }, [reviewTask, activeStages])

  const reviewRequirementResponses = useMemo(() => {
    if (!reviewTask) return undefined
    const ctx = reviewTask.context as Record<string, unknown> | null
    return ctx?.requirementResponses as
      | Record<string, { value?: string; assetIds?: string[] }>
      | undefined
  }, [reviewTask])

  return (
    <div className="flex flex-col overflow-hidden gap-4 h-full">
      <div className="flex items-center gap-3 px-4">
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value || null)}
          className="max-w-xs"
        />
        <NativeSelect
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value || null)}
          className="w-48"
        >
          <option value="">{t('allStages')}</option>
          {activeStages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="w-full overflow-x-auto h-full">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : boardData ? (
          <KanbanBoard
            stages={activeStages}
            boardData={boardData}
            onClickCard={setSelectedTaskId}
          />
        ) : (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {t('noTasks')}
          </div>
        )}
      </div>

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          orgId={orgId}
          open={!!selectedTaskId}
          onOpenChange={(open) => {
            if (!open) setSelectedTaskId(null)
          }}
          canApprove={canApprove}
          onReview={(taskId) => {
            setSelectedTaskId(null)
            setReviewTaskId(taskId)
          }}
        />
      )}

      {reviewTaskId && (
        <ReviewModal
          taskId={reviewTaskId}
          taskNumber={reviewTask?.taskNumber ?? null}
          stageName={reviewStageName}
          nextStageName={reviewNextStageName || undefined}
          requirementResponses={reviewRequirementResponses}
          open={!!reviewTaskId}
          onOpenChange={(open) => {
            if (!open) setReviewTaskId(null)
          }}
          onApprove={(id, notes) => {
            approveAdvance.mutate({ taskId: id, reviewNotes: notes })
            setReviewTaskId(null)
          }}
          onReject={(id, notes) => {
            rejectAdvance.mutate({ taskId: id, reviewNotes: notes })
            setReviewTaskId(null)
          }}
        />
      )}
    </div>
  )
}
