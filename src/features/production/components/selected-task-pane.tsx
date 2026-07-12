import { useQuery } from '@tanstack/react-query'
import { Check, Clock } from 'lucide-react'
import { useMemo } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { AssetFileList } from '#/components/app/asset-file'
import { FormRoot, useAppForm } from '#/components/app/form'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import { getAssetsForLineItemFn } from '#/features/orders/server'
import { cn } from '#/lib/utils'
import { useTaskDetail, useTaskMutations } from '../hooks'
import type { ProductionTask, Stage } from '../model'
import { StageBadge } from './stage-badge'
import {
  type DeadlineInfo,
  getTaskDeadlineClasses,
  getTaskDeadlineInfo,
  type TaskContext,
} from './task-deadline'

function getCtxValue(ctx: TaskContext, key: string): string {
  const raw = ctx?.[key]
  if (raw == null || raw === '') return ''
  return String(raw)
}

function buildActionLabel(
  task: ProductionTask,
  boardStages: Stage[],
  labels: {
    requestReview: string
    markReadyForProduction: string
    done: string
    advanceTo: (stage: string) => string
  },
): string | null {
  const currentStageIndex = task.stageId
    ? boardStages.findIndex((s) => s.id === task.stageId)
    : -1
  const currentStage =
    currentStageIndex >= 0 ? boardStages[currentStageIndex] : null
  const nextStage = boardStages[currentStageIndex + 1] ?? null
  const isAtLastBoardStage =
    currentStageIndex >= 0 && currentStageIndex >= boardStages.length - 1
  if (task.status === 'queued' && nextStage) {
    return labels.advanceTo(nextStage.name)
  }
  if (task.status === 'in_progress') {
    if (currentStage?.needApproval) return labels.requestReview
    if (isAtLastBoardStage && task.board === 'pre_production')
      return labels.markReadyForProduction
    if (isAtLastBoardStage) return labels.done
    if (nextStage) return labels.advanceTo(nextStage.name)
  }
  return null
}

type TaskIdentityHeaderProps = {
  task: ProductionTask
  activeStages: Stage[]
  deadline: DeadlineInfo | null
  deadlineStatusLabel: string
}

function TaskIdentityHeader({
  task,
  activeStages,
  deadline,
  deadlineStatusLabel,
}: TaskIdentityHeaderProps) {
  const t = useTranslations('production')
  const ctx = (task.context as TaskContext) ?? null
  const productName = getCtxValue(ctx, 'productName') || t('taskDetail')
  const designName = getCtxValue(ctx, 'designName')
  const isPendingApproval = task.status === 'pending_approval'

  return (
    <header className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 border border-border">
          {task.taskNumber ?? '—'}
        </span>
        <StageBadge task={task} activeStages={activeStages} />
        {task.priority ? (
          <Badge variant="destructive" className="text-[10px] rounded-none">
            {t('priorityBadge')}
          </Badge>
        ) : null}
        {isPendingApproval ? (
          <Badge variant="warning" className="text-[10px] rounded-none">
            {t('needReview')}
          </Badge>
        ) : null}
        {deadline ? (
          <Badge
            variant="outline"
            className={cn(
              'gap-1 text-[10px] rounded-none',
              getTaskDeadlineClasses(deadline.dayDelta, false),
            )}
          >
            <Clock className="size-3" aria-hidden />
            {deadlineStatusLabel}
          </Badge>
        ) : null}
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-foreground leading-snug">
        {productName}
      </h2>
      {designName ? (
        <p className="text-xs text-muted-foreground">
          {t('designName')}:{' '}
          <span className="text-foreground font-semibold font-mono bg-muted/65 border border-border px-1.5 py-0.5 ml-1 inline-block">
            {designName}
          </span>
        </p>
      ) : null}
    </header>
  )
}

export function SelectedTaskPane({
  taskId,
  orgId,
  activeStages,
  showSummary = true,
}: {
  taskId: string
  orgId: string
  activeStages: Stage[]
  showSummary?: boolean
}) {
  const locale = useLocale()
  const t = useTranslations('production')
  const ct = useTranslations('common')
  const { data: task, isLoading } = useTaskDetail(taskId)
  const { advanceTask } = useTaskMutations()

  const { data: lineItemAssets } = useQuery({
    queryKey: ['order-assets', task?.lineItemId ?? ''],
    queryFn: () => {
      const lineItemId = task?.lineItemId
      if (!lineItemId) throw new Error('No line item')
      return getAssetsForLineItemFn({ data: { lineItemId, orgId } })
    },
    enabled: !!task?.lineItemId,
  })

  const responses = useMemo(() => {
    return (
      ((task?.context as Record<string, unknown>)
        ?.requirementResponses as Record<
        string,
        { value?: string; assetIds?: string[] }
      >) ?? {}
    )
  }, [task])

  const boardStages = useMemo(() => {
    if (!task) return []
    return activeStages.filter((s) => s.board === task.board)
  }, [activeStages, task])

  const currentStage = useMemo(() => {
    if (!task) return null
    return task.stageId
      ? (boardStages.find((s) => s.id === task.stageId) ?? null)
      : null
  }, [task, boardStages])

  const hasRequirements = useMemo(() => {
    return (
      currentStage !== null &&
      Array.isArray(currentStage.requirements) &&
      currentStage.requirements.length > 0
    )
  }, [currentStage])

  const defaultValues = useMemo(() => {
    if (!currentStage || !hasRequirements) return { requirements: [] }
    return {
      requirements: currentStage.requirements.map((req) => {
        const resp = responses[req.id] ?? {}
        return {
          id: req.id,
          type: req.type,
          value: resp.value ?? '',
          numberValue: resp.value ? Number(resp.value) : null,
          assetIds: resp.assetIds ?? [],
        }
      }),
    }
  }, [currentStage, hasRequirements, responses])

  const form = useAppForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const filled: Record<string, { value?: string; assetIds?: string[] }> = {}
      value.requirements.forEach((item) => {
        if (item.type === 'upload') {
          if (item.assetIds && item.assetIds.length > 0) {
            filled[item.id] = { value: '', assetIds: item.assetIds }
          }
        } else if (item.type === 'number') {
          if (item.numberValue !== null) {
            filled[item.id] = { value: String(item.numberValue) }
          }
        } else {
          if (item.value) {
            filled[item.id] = { value: item.value }
          }
        }
      })
      await advanceTask.mutateAsync({
        taskId,
        requirementResponses: filled,
      })
    },
  })

  if (!taskId) {
    return (
      <section
        className="flex h-full min-h-0 items-center justify-center border-r border-border"
        aria-label={t('noTasks')}
      >
        <p className="text-sm text-muted-foreground">{t('noTasks')}</p>
      </section>
    )
  }

  if (isLoading || !task) {
    return (
      <section
        className="flex h-full min-h-0 flex-col border-r border-border"
        aria-label={t('taskDetail')}
      >
        <div className="flex flex-col gap-2.5 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 space-y-6 p-5">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-20" />
          </div>
        </div>
      </section>
    )
  }

  const ctx = (task.context as TaskContext) ?? null
  const orderNumber = getCtxValue(ctx, 'orderNumber')
  const customerName = getCtxValue(ctx, 'customerName')
  const quantity = getCtxValue(ctx, 'quantity')
  const spec = getCtxValue(ctx, 'requirements')

  const actionLabel = buildActionLabel(task, boardStages, {
    requestReview: t('requestReview'),
    markReadyForProduction: t('markReadyForProduction'),
    done: t('done'),
    advanceTo: (stage) => t('advanceTo', { stage }),
  })

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

  const completedCount = currentStage?.requirements
    ? currentStage.requirements.filter((r) => {
        const resp = responses[r.id]
        return (
          resp && (resp.value || (resp.assetIds && resp.assetIds.length > 0))
        )
      }).length
    : 0
  const totalCount = currentStage?.requirements?.length ?? 0
  const remainingCount = totalCount - completedCount

  const paneContent = (
    <>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="space-y-6 p-5">
          {showSummary && (
            <TaskIdentityHeader
              task={task}
              activeStages={activeStages}
              deadline={deadline}
              deadlineStatusLabel={deadlineStatusLabel}
            />
          )}

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1.5 border-border">
              {t('paneProductionSummary')}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  {t('orderLabel')}
                </span>
                <div>
                  <span className="inline-block border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                    {orderNumber || '—'}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  {t('customerLabel')}
                </span>
                <p className="font-medium text-foreground">
                  {customerName || '—'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  {t('quantityLabel')}
                </span>
                <p className="font-medium text-foreground">
                  {quantity || '—'}{' '}
                  {quantity ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      {ct('pcs')}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          </section>

          {spec ? (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1.5 border-border">
                {t('paneCuttingInstructions')}
              </h3>
              <div className="whitespace-pre-wrap border border-border bg-card p-3.5 text-xs leading-relaxed text-foreground/95 rounded-none font-mono">
                {spec}
              </div>
            </section>
          ) : null}

          {lineItemAssets && lineItemAssets.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1.5 border-border">
                {t('paneProductionFiles')}
              </h3>
              <AssetFileList
                assetIds={lineItemAssets.map((a) => a.id)}
                layout="list"
                showSize
              />
            </section>
          ) : null}

          {hasRequirements && currentStage && (
            <section className="mt-6 space-y-3">
              <div className="flex items-baseline justify-between border-b pb-1.5 border-border">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('paneStageRequirements')}
                </h3>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {completedCount} {t('paneCountSeparator')} {totalCount}{' '}
                  {t('paneCountComplete')}
                </span>
              </div>
              <div className="space-y-2">
                {currentStage.requirements.map((req, index) => {
                  const isCompleted =
                    responses[req.id] &&
                    (responses[req.id]?.value ||
                      (responses[req.id]?.assetIds?.length ?? 0) > 0)

                  return (
                    <div
                      key={req.id}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-3 border border-border bg-card p-3 rounded-none"
                    >
                      <div className="flex items-start gap-2.5">
                        {isCompleted ? (
                          <div className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground mt-0.5">
                            <Check className="size-3" strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="size-5 shrink-0 rounded-full border border-border mt-0.5" />
                        )}
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-foreground">
                            {req.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            {req.required
                              ? t('paneRequirementRequiredHint')
                              : t('paneRequirementOptionalHint')}
                          </span>
                        </div>
                      </div>

                      <div className="w-full md:w-auto min-w-[200px] shrink-0">
                        {req.type === 'text' && (
                          <form.AppField name={`requirements[${index}].value`}>
                            {(field) => (
                              <Input
                                type="text"
                                value={field.state.value}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                placeholder={t('paneEnterText')}
                                className="h-8 text-xs font-mono rounded-none"
                              />
                            )}
                          </form.AppField>
                        )}
                        {req.type === 'number' && (
                          <form.AppField
                            name={`requirements[${index}].numberValue`}
                          >
                            {(field) => (
                              <div className="relative flex items-center">
                                <Input
                                  type="number"
                                  value={field.state.value ?? ''}
                                  onChange={(e) =>
                                    field.handleChange(
                                      e.target.value === ''
                                        ? null
                                        : Number(e.target.value),
                                    )
                                  }
                                  placeholder={t('paneEnterNumber')}
                                  className="h-8 pl-3 pr-8 text-xs font-mono rounded-none"
                                />
                                <span className="absolute right-3 font-mono text-[10px] text-muted-foreground uppercase">
                                  pcs
                                </span>
                              </div>
                            )}
                          </form.AppField>
                        )}
                        {req.type === 'upload' && (
                          <form.AppField
                            name={`requirements[${index}].assetIds`}
                          >
                            {(field) => (
                              <div className="text-right text-xs [&_[data-slot=dropzone]]:py-2 [&_[data-slot=dropzone]]:px-3 [&_h4]:text-[11px]">
                                <field.FileUploadField
                                  ownerType="productionTask"
                                  ownerId={taskId}
                                  usage="attachment"
                                  maxFiles={1}
                                  optional={!req.required}
                                  label=""
                                />
                              </div>
                            )}
                          </form.AppField>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      {(hasRequirements || !!actionLabel) && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3.5">
          <div>
            {hasRequirements && remainingCount > 0 ? (
              <p className="text-[11px] text-muted-foreground leading-snug">
                <span className="font-semibold text-foreground">
                  {t('paneRequirementRemaining', { count: remainingCount })}
                </span>
                <br />
                {t('paneRequirementRemainingHint')}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {currentStage?.name ?? t('taskDetail')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasRequirements ? (
              <form.AppForm>
                <form.SubmitButton isPending={advanceTask.isPending} size="lg">
                  {remainingCount > 0
                    ? t('paneCompleteRequirements')
                    : (actionLabel ?? t('completeRequirements'))}
                </form.SubmitButton>
              </form.AppForm>
            ) : actionLabel ? (
              <Button
                type="button"
                onClick={() => void advanceTask.mutateAsync({ taskId })}
                isLoading={advanceTask.isPending}
                disabled={advanceTask.isPending}
                size="lg"
              >
                {actionLabel}
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </>
  )

  if (hasRequirements && currentStage) {
    return (
      <FormRoot
        form={form}
        className="flex h-full min-h-0 flex-1 flex-col border-r border-border space-y-0!"
      >
        {paneContent}
      </FormRoot>
    )
  }

  return (
    <section
      className="flex h-full min-h-0 flex-1 flex-col border-r border-border"
      aria-label={t('taskDetail')}
    >
      {paneContent}
    </section>
  )
}

export function SelectedTaskSummary({
  taskId,
  activeStages,
}: {
  taskId: string
  activeStages: Stage[]
}) {
  const locale = useLocale()
  const t = useTranslations('production')
  const { data: task, isLoading } = useTaskDetail(taskId)

  if (isLoading || !task) {
    return (
      <div className="p-5 pr-16">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-6 w-48" />
        </div>
      </div>
    )
  }

  const ctx = (task.context as TaskContext) ?? null
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

  return (
    <div className="p-5 pr-16">
      <TaskIdentityHeader
        task={task}
        activeStages={activeStages}
        deadline={deadline}
        deadlineStatusLabel={deadlineStatusLabel}
      />
    </div>
  )
}
