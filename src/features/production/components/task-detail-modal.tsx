import { useQuery } from '@tanstack/react-query'
import { Clock, XIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { AssetFileList } from '#/components/app/asset-file'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { useMembers } from '#/features/members/hooks'
import { getAssetsForLineItemFn } from '#/features/orders/server'
import { cn } from '#/lib/utils'
import {
  useStages,
  useTaskActivities,
  useTaskDetail,
  useTaskMutations,
} from '../hooks'
import type { Stage, TaskActivity } from '../model'
import { ActivityRow } from './activity-row'
import { RequirementForm } from './requirement-form'
import {
  type DeadlineInfo,
  getTaskDeadlineClasses,
  getTaskDeadlineInfo,
  type TaskContext,
} from './task-deadline'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  taskId: string
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  canApprove?: boolean
  onReview?: (taskId: string) => void
}

// ---------------------------------------------------------------------------
// TaskDetailSkeleton – loading skeleton
// ---------------------------------------------------------------------------

function TaskDetailSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-5 pt-5 pb-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 rounded-none bg-muted animate-pulse" />
          <div className="h-5 w-20 rounded-none bg-muted animate-pulse" />
        </div>
        <div className="h-6 w-48 rounded-none bg-muted animate-pulse" />
      </SheetHeader>
      <div className="flex-1 p-5 space-y-6">
        <div className="space-y-3">
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-10 rounded bg-muted animate-pulse" />
            <div className="h-10 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 w-28 rounded bg-muted animate-pulse" />
          <div className="h-20 rounded bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TaskDetailHeader – header with badges, title, and close button
// ---------------------------------------------------------------------------

type TaskDetailHeaderProps = {
  taskNumber: string
  productName: string
  designName: string
  currentStageName: string | null
  isPendingApproval: boolean
  hasPriority: boolean
  onClose: () => void
}

function TaskDetailHeader({
  taskNumber,
  productName,
  designName,
  currentStageName,
  isPendingApproval,
  hasPriority,
  onClose,
}: TaskDetailHeaderProps) {
  const t = useTranslations('production')

  return (
    <SheetHeader className="px-5 pt-5 pb-4 border-b space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded border border-border">
            {taskNumber}
          </span>
          {currentStageName && <Badge>{currentStageName}</Badge>}
          {hasPriority ? (
            <Badge variant="destructive">{t('priorityBadge')}</Badge>
          ) : null}
          {isPendingApproval ? (
            <Badge variant="warning">{t('needReview')}</Badge>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('close')}
          className="-mr-1 shrink-0"
          onClick={onClose}
        >
          <XIcon className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <SheetTitle className="text-lg font-semibold tracking-tight text-left leading-snug">
        {productName || t('taskDetail')}
      </SheetTitle>
      {designName && (
        <p className="text-sm text-muted-foreground text-left">
          {t('designName')}:{' '}
          <span className="text-foreground font-medium">{designName}</span>
        </p>
      )}
    </SheetHeader>
  )
}

// ---------------------------------------------------------------------------
// TaskDetailFooter – primary action bar
// ---------------------------------------------------------------------------

type TaskDetailFooterProps = {
  taskStatus: string
  nextStageName: string | null
  currentStageNeedApproval: boolean
  isAtLastBoardStage: boolean
  taskBoard: string
  canApprove: boolean
  isPendingApproval: boolean
  isAdvancePending: boolean
  onAdvance: () => void
  onReview: () => void
}

function TaskDetailFooter({
  taskStatus,
  nextStageName,
  currentStageNeedApproval,
  isAtLastBoardStage,
  taskBoard,
  canApprove,
  isPendingApproval,
  isAdvancePending,
  onAdvance,
  onReview,
}: TaskDetailFooterProps) {
  const t = useTranslations('production')

  if (isPendingApproval && canApprove) {
    return (
      <div className="px-5 py-3 border-b bg-muted/30">
        <Button
          className="w-full"
          onClick={onReview}
          isLoading={isAdvancePending}
          disabled={isAdvancePending}
        >
          {t('reviewAdvancement')}
        </Button>
      </div>
    )
  }

  const label =
    taskStatus === 'queued' && nextStageName
      ? t('advanceTo', { stage: nextStageName })
      : taskStatus === 'in_progress' && (nextStageName || isAtLastBoardStage)
        ? currentStageNeedApproval
          ? t('requestReview')
          : isAtLastBoardStage && taskBoard === 'pre_production'
            ? t('markReadyForProduction')
            : isAtLastBoardStage
              ? t('done')
              : t('advanceTo', { stage: nextStageName ?? '' })
        : null

  if (!label) return null

  return (
    <div className="px-5 py-3 border-b bg-muted/30">
      <Button
        className="w-full"
        onClick={onAdvance}
        isLoading={isAdvancePending}
        disabled={isAdvancePending}
      >
        {label}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TaskDetailsTab – key details and specification
// ---------------------------------------------------------------------------

type TaskDetailsTabProps = {
  orderNumber: string
  customerName: string
  quantity: string
  spec: string
  deadline: DeadlineInfo | null
  deadlineStatusLabel: string
}

function TaskDetailsTab({
  orderNumber,
  customerName,
  quantity,
  spec,
  deadline,
  deadlineStatusLabel,
}: TaskDetailsTabProps) {
  const t = useTranslations('production')
  const ct = useTranslations('common')

  return (
    <>
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t('taskDetail')}
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">
              {t('orderLabel')}
            </span>
            <div>
              <span className="font-mono text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border inline-block">
                {orderNumber}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">
              {t('customerLabel')}
            </span>
            <p className="font-medium text-foreground">{customerName || '-'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">
              {t('quantityLabel')}
            </span>
            <p className="font-medium text-foreground">
              {quantity}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                {ct('pcs')}
              </span>
            </p>
          </div>
          {deadline ? (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                {t('deadlineLabel', { date: deadline.dateLabel })}
              </span>
              <div>
                <Badge
                  variant="outline"
                  className={cn(
                    'gap-1 text-[10px]',
                    getTaskDeadlineClasses(deadline.dayDelta, false),
                  )}
                >
                  <Clock className="size-3" aria-hidden="true" />
                  {deadlineStatusLabel}
                </Badge>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {spec && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t('specification')}
          </h3>
          <div className="bg-card border border-border rounded-none p-3.5 text-sm text-foreground/95 leading-relaxed whitespace-pre-wrap">
            {spec}
          </div>
        </section>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// TaskFilesTab – attachments section
// ---------------------------------------------------------------------------

type TaskFilesTabProps = {
  lineItemAssets: Array<{ id: string }> | undefined
}

function TaskFilesTab({ lineItemAssets }: TaskFilesTabProps) {
  const t = useTranslations('production')

  if (!lineItemAssets || lineItemAssets.length === 0) return null

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {t('attachments')}
      </h3>
      <AssetFileList
        assetIds={lineItemAssets.map((a) => a.id)}
        layout="grid"
        showSize
      />
    </section>
  )
}

// ---------------------------------------------------------------------------
// TaskActivityTab – activity feed
// ---------------------------------------------------------------------------

type TaskActivityTabProps = {
  activities: TaskActivity[] | undefined
  stageNameMap: Map<string, string>
  actorMap: Map<string, { name: string; image: string | null }>
  stages: Stage[] | undefined
  taskContext: Record<string, unknown> | null
}

function TaskActivityTab({
  activities,
  stageNameMap,
  actorMap,
  stages,
  taskContext,
}: TaskActivityTabProps) {
  const t = useTranslations('production')

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {t('activity')}
      </h3>
      {(!activities || activities.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t('noActivity')}
        </p>
      )}
      {activities?.map((act) => (
        <ActivityRow
          key={act.id}
          activity={act}
          stageNameMap={stageNameMap}
          actorMap={actorMap}
          stages={stages}
          taskContext={taskContext}
        />
      ))}
    </section>
  )
}

// ---------------------------------------------------------------------------
// TaskCommentComposer – comment input pinned to bottom
// ---------------------------------------------------------------------------

type TaskCommentComposerProps = {
  commentText: string
  onCommentTextChange: (text: string) => void
  onSend: () => void
  isPending: boolean
}

function TaskCommentComposer({
  commentText,
  onCommentTextChange,
  onSend,
  isPending,
}: TaskCommentComposerProps) {
  const t = useTranslations('production')

  return (
    <div className="shrink-0 border-t p-4">
      <div className="flex gap-2 items-center bg-background p-2 border border-input rounded-none focus-within:ring-2 focus-within:ring-ring/40 focus-within:border-ring transition-all">
        <input
          type="text"
          placeholder={t('commentPlaceholder')}
          value={commentText}
          onChange={(e) => onCommentTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
          className="flex-1 ml-2 border-0 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground text-foreground min-w-0"
        />
        <Button
          size="sm"
          className="h-8 px-4 text-xs font-semibold shrink-0 cursor-pointer"
          onClick={onSend}
          isLoading={isPending}
          disabled={!commentText.trim() || isPending}
        >
          {t('send')}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TaskDetailModal – orchestrator
// ---------------------------------------------------------------------------

export function TaskDetailModal({
  taskId,
  orgId,
  open,
  onOpenChange,
  canApprove = false,
  onReview,
}: Props) {
  const t = useTranslations('production')
  const locale = useLocale()
  const { data: task, isLoading: taskLoading } = useTaskDetail(taskId)
  const { data: activities } = useTaskActivities(taskId)
  const { data: stages } = useStages()
  const { advanceTask, saveComment } = useTaskMutations()
  const { data: members } = useMembers()
  const [commentText, setCommentText] = useState('')
  const [showRequirementForm, setShowRequirementForm] = useState(false)
  const { data: lineItemAssets } = useQuery({
    queryKey: ['order-assets', task?.lineItemId ?? ''],
    queryFn: () => {
      const lineItemId = task?.lineItemId
      if (!lineItemId) throw new Error('No line item')
      return getAssetsForLineItemFn({ data: { lineItemId, orgId } })
    },
    enabled: !!task?.lineItemId,
  })
  const stageNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of stages ?? []) map.set(s.id, s.name)
    return map
  }, [stages])

  const actorMap = useMemo(() => {
    const map = new Map<string, { name: string; image: string | null }>()
    if (!members) return map
    for (const m of members)
      map.set(m.user.id, { name: m.user.name, image: m.user.image })
    return map
  }, [members])
  const ctx = task ? (task.context as TaskContext) : null
  const productName = String(ctx?.productName ?? '')
  const designName = String(ctx?.designName ?? '')
  const deadline = getTaskDeadlineInfo(ctx, locale, new Date())
  const deadlineStatusLabel = deadline
    ? deadline.dayDelta < 0
      ? t('deadlineDaysOverdue', { days: -deadline.dayDelta })
      : deadline.dayDelta === 0
        ? t('deadlineToday')
        : deadline.dayDelta === 1
          ? t('deadlineTomorrow')
          : t('deadlineDaysLeft', { days: deadline.dayDelta })
    : ''
  const isPendingApproval = task?.status === 'pending_approval'
  const boardStages = (stages ?? [])
    .filter((s) => s.active && s.board === task?.board)
    .sort((a, b) => a.orderIndex - b.orderIndex)

  const currentStageIndex = task?.stageId
    ? boardStages.findIndex((s) => s.id === task.stageId)
    : -1
  const currentStage =
    currentStageIndex >= 0 ? boardStages[currentStageIndex] : null
  const nextStage = boardStages[currentStageIndex + 1]
  const isAtLastBoardStage =
    currentStageIndex >= 0 && currentStageIndex >= boardStages.length - 1
  const hasRequirements =
    currentStage !== null && currentStage.requirements?.length > 0
  const showFooter =
    task?.status === 'queued' ||
    task?.status === 'in_progress' ||
    (task?.status === 'pending_approval' && canApprove && !!onReview)
  function handleAdvanceClick() {
    if (hasRequirements) {
      setShowRequirementForm(true)
    } else {
      handleAdvance({})
    }
  }

  async function handleAdvance(
    responses: Record<string, { value?: string; assetIds?: string[] }>,
  ) {
    const result = await advanceTask.mutateAsync({
      taskId,
      requirementResponses: responses,
    })
    if ('error' in result) return
    if (
      'pendingApproval' in result &&
      result.pendingApproval &&
      canApprove &&
      onReview
    ) {
      onReview(taskId)
      return
    }
    onOpenChange(false)
  }

  async function handleSendComment() {
    if (!commentText.trim()) return
    const result = await saveComment.mutateAsync({
      taskId,
      text: commentText.trim(),
    })
    if ('error' in result) return
    setCommentText('')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 gap-0"
        showCloseButton={false}
        aria-describedby={undefined}
      >
        {taskLoading && <TaskDetailSkeleton />}

        {!taskLoading &&
          task &&
          showRequirementForm &&
          currentStage?.requirements &&
          currentStage.requirements.length > 0 && (
            <div className="flex flex-col h-full">
              <SheetHeader className="px-5 pt-5 pb-4 border-b">
                <SheetTitle>{t('taskDetail')}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-5 min-h-0">
                <RequirementForm
                  taskId={taskId}
                  requirements={currentStage.requirements}
                  onCancel={() => setShowRequirementForm(false)}
                  onSubmit={handleAdvance}
                  isSubmitting={advanceTask.isPending}
                />
              </div>
            </div>
          )}

        {!taskLoading && task && !showRequirementForm && (
          <div className="flex flex-col h-full">
            <TaskDetailHeader
              taskNumber={task.taskNumber ?? ''}
              productName={productName}
              designName={designName}
              currentStageName={currentStage?.name ?? null}
              isPendingApproval={!!isPendingApproval}
              hasPriority={!!task.priority}
              onClose={() => onOpenChange(false)}
            />

            {showFooter && (
              <TaskDetailFooter
                taskStatus={task.status}
                nextStageName={nextStage?.name ?? null}
                currentStageNeedApproval={!!currentStage?.needApproval}
                isAtLastBoardStage={isAtLastBoardStage}
                taskBoard={task.board}
                canApprove={canApprove}
                isPendingApproval={!!isPendingApproval}
                isAdvancePending={advanceTask.isPending}
                onAdvance={handleAdvanceClick}
                onReview={() => onReview?.(taskId)}
              />
            )}

            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-5 space-y-6">
                <TaskDetailsTab
                  orderNumber={String(ctx?.orderNumber ?? '')}
                  customerName={String(ctx?.customerName ?? '')}
                  quantity={String(ctx?.quantity ?? '')}
                  spec={String(ctx?.requirements ?? '')}
                  deadline={deadline}
                  deadlineStatusLabel={deadlineStatusLabel}
                />
                <TaskFilesTab lineItemAssets={lineItemAssets} />
                <TaskActivityTab
                  activities={activities}
                  stageNameMap={stageNameMap}
                  actorMap={actorMap}
                  stages={stages}
                  taskContext={task.context as Record<string, unknown> | null}
                />
              </div>
            </div>

            <TaskCommentComposer
              commentText={commentText}
              onCommentTextChange={setCommentText}
              onSend={handleSendComment}
              isPending={saveComment.isPending}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
