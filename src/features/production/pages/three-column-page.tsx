import { useQuery } from '@tanstack/react-query'
import { Archive, ArchiveRestore, Check, Clock, Search } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { AssetFileList } from '#/components/app/asset-file'
import { FormRoot, useAppForm } from '#/components/app/form'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Spinner } from '#/components/ui/spinner'
import { useMembers } from '#/features/members/hooks'
import { getAssetsForLineItemFn } from '#/features/orders/server'
import { getReadyForProductionLabel } from '#/features/production/ready-for-production-label'
import { cn } from '#/lib/utils'
import { ActivityRow } from '../components/activity-row'
import {
  getTaskDeadlineClasses,
  getTaskDeadlineInfo,
  type TaskContext,
} from '../components/task-deadline'
import type { READY_FOR_PRODUCTION_STATUS } from '../constants'
import {
  useArchivedTasks,
  useBoardTasks,
  useStages,
  useTaskActivities,
  useTaskDetail,
  useTaskMutations,
} from '../hooks'
import type { BoardTask, ProductionTask, Stage } from '../model'

type Props = {
  orgId: string
}

type TaskStatus =
  | 'queued'
  | 'in_progress'
  | 'pending_approval'
  | 'completed'
  | typeof READY_FOR_PRODUCTION_STATUS

const WAITING_STATUSES: TaskStatus[] = ['pending_approval']

function getCtxValue(ctx: TaskContext, key: string): string {
  const raw = ctx?.[key]
  if (raw == null || raw === '') return ''
  return String(raw)
}

const isWaitingTask = (task: ProductionTask): boolean =>
  WAITING_STATUSES.includes(task.status as TaskStatus)

type BoardData = {
  queued: BoardTask[]
  stages: Map<string, BoardTask[]>
  readyForProduction: BoardTask[]
  done: BoardTask[]
}
function pickBoardTasks(
  boardData: BoardData | undefined,
  activeStages: Stage[],
): { ready: BoardTask[]; waiting: BoardTask[] } {
  if (!boardData) return { ready: [], waiting: [] }
  const inFlight: BoardTask[] = []
  for (const stageTasks of boardData.stages.values()) {
    inFlight.push(...stageTasks)
  }
  const ready: BoardTask[] = [
    ...boardData.queued,
    ...inFlight.filter((bt) => bt.task.status !== 'pending_approval'),
    ...boardData.readyForProduction,
  ]
  const waiting: BoardTask[] = inFlight.filter(
    (bt) => bt.task.status === 'pending_approval',
  )
  const stageOrder = new Map(activeStages.map((s, i) => [s.id, i] as const))
  const sortByStage = (a: BoardTask, b: BoardTask): number => {
    const aIdx = a.task.stageId ? (stageOrder.get(a.task.stageId) ?? -1) : -1
    const bIdx = b.task.stageId ? (stageOrder.get(b.task.stageId) ?? -1) : -1
    if (aIdx !== bIdx) return aIdx - bIdx
    return 0
  }
  ready.sort(sortByStage)
  waiting.sort(sortByStage)
  return { ready, waiting }
}

function formatDeadlineText(
  info: { dayDelta: number },
  labels: {
    deadlineToday: string
    deadlineTomorrow: string
    deadlineDaysLeft: (days: number) => string
    deadlineDaysOverdue: (days: number) => string
  },
): string {
  if (info.dayDelta < 0) {
    return labels.deadlineDaysOverdue(-info.dayDelta)
  }
  if (info.dayDelta === 0) return labels.deadlineToday
  if (info.dayDelta === 1) return labels.deadlineTomorrow
  return labels.deadlineDaysLeft(info.dayDelta)
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

type QueueTab = 'active' | 'archived'

export function ThreeColumnPage({ orgId }: Props) {
  const t = useTranslations('production')
  const ct = useTranslations('common')
  const locale = useLocale()
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''))
  const [selectedTaskId, setSelectedTaskId] = useQueryState(
    'task',
    parseAsString.withDefault(''),
  )
  const [queueTab, setQueueTab] = useState<QueueTab>('active')

  const { data: stages } = useStages()
  const activeStages = useMemo(
    () =>
      (stages ?? [])
        .filter((s) => s.active)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [stages],
  )

  const firstProdStageName = useMemo(() => {
    return activeStages.find((s) => s.board === 'production')?.name
  }, [activeStages])

  const readyForProductionLabel = useMemo(() => {
    return getReadyForProductionLabel({
      firstProductionStageName: firstProdStageName,
      readyForProduction: t('readyForProduction'),
      readyForProductionWithStage: (values) =>
        t('readyForProductionQueue', values),
    })
  }, [firstProdStageName, t])

  const filters = useMemo(
    () => ({
      orgId,
      search: search || undefined,
    }),
    [orgId, search],
  )
  const { data: boardData, isLoading: boardLoading } = useBoardTasks(filters)
  const { ready, waiting } = useMemo(
    () => pickBoardTasks(boardData, activeStages),
    [boardData, activeStages],
  )

  const stepCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (!boardData) return counts
    counts.queue = boardData.queued.length
    counts.ready_for_production = boardData.readyForProduction.length
    counts.completed = boardData.done.length
    for (const [stageId, tasksList] of boardData.stages.entries()) {
      counts[stageId] = tasksList.length
    }
    return counts
  }, [boardData])

  const allTasks = useMemo(() => [...ready, ...waiting], [ready, waiting])
  const effectiveTaskId =
    selectedTaskId && allTasks.some((bt) => bt.task.id === selectedTaskId)
      ? selectedTaskId
      : (allTasks[0]?.task.id ?? '')

  useEffect(() => {
    if (!selectedTaskId && allTasks.length > 0 && allTasks[0]?.task.id) {
      void setSelectedTaskId(allTasks[0].task.id)
    }
  }, [selectedTaskId, allTasks, setSelectedTaskId])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[320px_minmax(0,1fr)_300px]">
        <WorkQueue
          orgId={orgId}
          tab={queueTab}
          onTabChange={setQueueTab}
          ready={ready}
          waiting={waiting}
          activeStages={activeStages}
          selectedTaskId={effectiveTaskId}
          onSelect={(id) => void setSelectedTaskId(id)}
          isLoading={boardLoading}
          search={search}
          onSearchChange={(val) => void setSearch(val || null)}
          labels={{
            activeTab: t('tabActive'),
            archivedTab: t('tabArchive'),
            ready: t('queueReady'),
            waiting: t('queueWaiting'),
            noReady: t('noReadyTasks'),
            noWaiting: t('noWaitingTasks'),
            noArchived: t('archivedEmpty'),
            stagePending: t('stagePending'),
            readyForProduction: readyForProductionLabel,
            deadlineToday: t('deadlineToday'),
            deadlineTomorrow: t('deadlineTomorrow'),
            deadlineDaysLeft: (days) => t('deadlineDaysLeft', { days }),
            deadlineDaysOverdue: (days) => t('deadlineDaysOverdue', { days }),
            priorityBadge: t('priorityBadge'),
            needReview: t('needReview'),
            openTask: t('openTask', { task: '' }),
            archivedTaskNumber: t('archivedTaskNumber'),
            archivedOrder: t('archivedOrder'),
            archivedProduct: t('archivedProduct'),
            archivedCustomer: t('archivedCustomer'),
            archivedDate: t('archivedDate'),
            pcs: ct('pcs'),
            searchPlaceholder: t('searchPlaceholder'),
          }}
          locale={locale}
        />
        <SelectedTaskPane
          key={effectiveTaskId}
          taskId={effectiveTaskId}
          orgId={orgId}
          activeStages={activeStages}
          labels={{
            taskDetail: t('taskDetail'),
            productLabel: t('productLabel'),
            designName: t('designName'),
            orderLabel: t('orderLabel'),
            customerLabel: t('customerLabel'),
            quantityLabel: t('quantityLabel'),
            specification: t('specification'),
            attachments: t('attachments'),
            requestReview: t('requestReview'),
            markReadyForProduction: t('markReadyForProduction'),
            done: t('done'),
            deadlineLabel: t('deadlineLabel', { date: '' }),
            deadlineToday: t('deadlineToday'),
            deadlineTomorrow: t('deadlineTomorrow'),
            deadlineDaysLeft: (days) => t('deadlineDaysLeft', { days }),
            deadlineDaysOverdue: (days) => t('deadlineDaysOverdue', { days }),
            noTaskSelected: t('noTasks'),
            pcs: ct('pcs'),
            priorityBadge: t('priorityBadge'),
            needReview: t('needReview'),
            advanceTo: (stage: string) => t('advanceTo', { stage }),
            completeRequirements: t('completeRequirements'),
            boardPreProduction: t('boardPreProduction'),
            boardProduction: t('boardProduction'),
            board: t('board'),
          }}
        />
        <WorkflowRail
          taskId={effectiveTaskId}
          orgId={orgId}
          activeStages={activeStages}
          stepCounts={stepCounts}
          labels={{
            workflow: t('workflow'),
            activity: t('activity'),
            commentPlaceholder: t('commentPlaceholder'),
            send: t('send'),
            noActivity: t('noActivity'),
            boardPreProduction: t('boardPreProduction'),
            boardProduction: t('boardProduction'),
            queue: t('queue'),
            readyForProduction: readyForProductionLabel,
            done: t('done'),
          }}
        />
      </div>
    </div>
  )
}

type WorkQueueLabels = {
  activeTab: string
  archivedTab: string
  ready: string
  waiting: string
  noReady: string
  noWaiting: string
  noArchived: string
  stagePending: string
  readyForProduction: string
  deadlineToday: string
  deadlineTomorrow: string
  deadlineDaysLeft: (days: number) => string
  deadlineDaysOverdue: (days: number) => string
  priorityBadge: string
  needReview: string
  openTask: string
  archivedTaskNumber: string
  archivedOrder: string
  archivedProduct: string
  archivedCustomer: string
  archivedDate: string
  pcs: string
  searchPlaceholder: string
}

const badgeStyles = {
  queue:
    'border-gray-400/50 bg-gray-400/10 text-gray-600 dark:text-gray-400 dark:border-gray-700/50',
  preProduction:
    'border-blue-400/50 bg-blue-400/10 text-blue-600 dark:text-blue-400 dark:border-blue-500/30',
  production:
    'border-warning/50 bg-warning/10 text-warning dark:border-warning/30',
  done: 'border-success/50 bg-success/10 text-success dark:border-success/30',
} as const

function WorkQueue({
  orgId,
  tab,
  onTabChange,
  ready,
  waiting,
  activeStages,
  selectedTaskId,
  onSelect,
  isLoading,
  search,
  onSearchChange,
  labels,
  locale,
}: {
  orgId: string
  tab: QueueTab
  onTabChange: (tab: QueueTab) => void
  ready: BoardTask[]
  waiting: BoardTask[]
  activeStages: Stage[]
  selectedTaskId: string
  onSelect: (id: string) => void
  isLoading: boolean
  search: string
  onSearchChange: (val: string) => void
  labels: WorkQueueLabels
  locale: string
}) {
  const stageNameById = useMemo(
    () => new Map(activeStages.map((s) => [s.id, s.name] as const)),
    [activeStages],
  )
  const stageBoardById = useMemo(
    () => new Map(activeStages.map((s) => [s.id, s.board] as const)),
    [activeStages],
  )
  const stageOrder = useMemo(
    () => new Map(activeStages.map((s, i) => [s.id, i] as const)),
    [activeStages],
  )

  const flat = useMemo(() => {
    return [
      ...ready.map((bt) => ({ bt, group: 'ready' as const })),
      ...waiting.map((bt) => ({ bt, group: 'waiting' as const })),
    ].sort((a, b) => {
      if (a.bt.task.priority !== b.bt.task.priority) {
        return Number(b.bt.task.priority) - Number(a.bt.task.priority)
      }
      const aIdx = a.bt.task.stageId
        ? (stageOrder.get(a.bt.task.stageId) ?? -1)
        : -1
      const bIdx = b.bt.task.stageId
        ? (stageOrder.get(b.bt.task.stageId) ?? -1)
        : -1
      if (aIdx !== bIdx) return aIdx - bIdx
      return 0
    })
  }, [ready, waiting, stageOrder])

  const { data: archivedData, isLoading: archivedLoading } = useArchivedTasks({
    orgId,
    search: search || undefined,
    page: 1,
    perPage: 50,
  })
  const archivedRows = archivedData?.rows ?? []

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  )

  return (
    <aside
      className="flex h-full min-h-0 flex-col border-r border-border bg-muted/30"
      aria-label={labels.activeTab}
    >
      <div className="flex flex-col gap-2.5 bg-background p-3 border-b border-border">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {labels.activeTab}
        </h2>
        <div className="relative w-full">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="text"
            value={search}
            onChange={(e) => void onSearchChange(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="h-8 pl-8 text-sm"
            aria-label={labels.searchPlaceholder}
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center border-b border-border bg-background px-2 pt-2">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'active'}
          onClick={() => onTabChange('active')}
          className={cn(
            'flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
            tab === 'active'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <ArchiveRestore className="size-3.5" aria-hidden />
          {labels.activeTab}
          <span className="font-mono text-[10px] text-muted-foreground">
            {ready.length + waiting.length}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'archived'}
          onClick={() => onTabChange('archived')}
          className={cn(
            'flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
            tab === 'archived'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <Archive className="size-3.5" aria-hidden />
          {labels.archivedTab}
          <span className="font-mono text-[10px] text-muted-foreground">
            {archivedRows.length}
          </span>
        </button>
      </div>

      {tab === 'active' ? (
        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : flat.length === 0 ? (
            <p className="px-4 py-12 text-center text-xs text-muted-foreground">
              {ready.length === 0 ? labels.noReady : labels.noWaiting}
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {flat.map((item, index) => {
                const { bt, group } = item
                const task = bt.task
                const ctx = task.context as TaskContext
                const productName = getCtxValue(ctx, 'productName') || '—'
                const orderNum = getCtxValue(ctx, 'orderNumber') || '—'
                const quantity = getCtxValue(ctx, 'quantity')
                const isQueued = task.status === 'queued'
                const stageName = task.stageId
                  ? (stageNameById.get(task.stageId) ?? '—')
                  : task.status === 'ready_for_production'
                    ? labels.readyForProduction
                    : labels.stagePending
                const stageBoard = task.stageId
                  ? (stageBoardById.get(task.stageId) ?? task.board)
                  : task.board
                const badgeVariant = (() => {
                  if (task.status === 'completed') return 'done' as const
                  if (task.status === 'ready_for_production')
                    return 'preProduction' as const
                  if (task.stageId) {
                    const board = stageBoardById.get(task.stageId) ?? task.board
                    return board === 'production'
                      ? ('production' as const)
                      : ('preProduction' as const)
                  }
                  return 'queue' as const
                })()
                const isSelected = selectedTaskId === task.id
                const showGroupDivider =
                  index > 0 && flat[index - 1]?.group !== group
                return (
                  <li key={task.id}>
                    {showGroupDivider && (
                      <div className="border-y border-border bg-muted/50 px-4 py-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {group === 'ready' ? labels.ready : labels.waiting}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {group === 'ready' ? ready.length : waiting.length}
                          </span>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelect(task.id)}
                      aria-pressed={isSelected}
                      aria-label={labels.openTask
                        .replace('{task}', task.taskNumber ?? productName)
                        .trim()}
                      className={cn(
                        'group block w-full border-b border-border px-4 py-2.5 text-left transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                        isSelected ? 'bg-primary/10' : 'hover:bg-muted/60',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-semibold text-foreground">
                          {task.taskNumber || '—'}
                        </span>
                        <div className="flex items-center gap-1">
                          {task.priority && (
                            <Badge variant="destructive" className="text-[9px]">
                              {labels.priorityBadge}
                            </Badge>
                          )}
                          {isWaitingTask(task) && (
                            <Badge variant="warning" className="text-[9px]">
                              {labels.needReview}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 truncate text-[13px] font-medium leading-tight text-foreground">
                        {productName}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            'px-1.5 py-0 text-[10px] font-medium',
                            badgeStyles[badgeVariant],
                          )}
                        >
                          {stageName}
                        </Badge>
                        {task.status !== 'ready_for_production' && (
                          <Badge
                            variant="secondary"
                            className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                          >
                            {stageBoard === 'pre_production'
                              ? 'pre-prod'
                              : stageBoard === 'production'
                                ? 'prod'
                                : stageBoard}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
                        <span className="truncate font-mono">{orderNum}</span>
                        {quantity ? (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {quantity} {labels.pcs}
                          </span>
                        ) : null}
                      </div>
                      {!isQueued ? (
                        <DeadlineLine
                          ctx={ctx}
                          locale={locale}
                          labels={labels}
                          referenceDate={new Date()}
                        />
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          {archivedLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : archivedRows.length === 0 ? (
            <p className="px-4 py-12 text-center text-xs text-muted-foreground">
              {labels.noArchived}
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {archivedRows.map((row) => (
                <li
                  key={row.id}
                  className="border-b border-border px-4 py-2.5 text-[12px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold text-foreground">
                      {row.taskNumber || '—'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {dateTimeFormatter.format(new Date(row.archivedAt))}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[13px] font-medium leading-tight text-foreground">
                    {row.productName || '—'}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
                    <span className="truncate font-mono">
                      {row.orderNumber || '—'}
                    </span>
                    <span className="truncate">{row.customerName || '—'}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  )
}

function DeadlineLine({
  ctx,
  locale,
  labels,
  referenceDate,
}: {
  ctx: TaskContext
  locale: string
  labels: WorkQueueLabels
  referenceDate: Date
}) {
  const info = getTaskDeadlineInfo(ctx, locale, referenceDate)
  if (!info) return null
  const text = formatDeadlineText(info, labels)
  return (
    <div
      className={cn(
        'mt-1 flex items-center gap-1 text-[10px] font-medium',
        info.dayDelta < 0
          ? 'text-destructive'
          : info.dayDelta <= 2
            ? 'text-warning'
            : 'text-muted-foreground',
      )}
    >
      <Clock className="size-3" aria-hidden />
      {text}
    </div>
  )
}

type SelectedTaskLabels = {
  taskDetail: string
  productLabel: string
  designName: string
  orderLabel: string
  customerLabel: string
  quantityLabel: string
  specification: string
  attachments: string
  requestReview: string
  markReadyForProduction: string
  done: string
  deadlineLabel: string
  deadlineToday: string
  deadlineTomorrow: string
  deadlineDaysLeft: (days: number) => string
  deadlineDaysOverdue: (days: number) => string
  noTaskSelected: string
  pcs: string
  priorityBadge: string
  needReview: string
  completeRequirements: string
  advanceTo: (stage: string) => string
  boardPreProduction: string
  boardProduction: string
  board: string
}

function SelectedTaskPane({
  taskId,
  orgId,
  activeStages,
  labels,
}: {
  taskId: string
  orgId: string
  activeStages: Stage[]
  labels: SelectedTaskLabels
}) {
  const locale = useLocale()
  const isId = locale === 'id'
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
        className="flex h-full min-h-0 items-center justify-center border-r border-border bg-background"
        aria-label={labels.noTaskSelected}
      >
        <p className="text-sm text-muted-foreground">{labels.noTaskSelected}</p>
      </section>
    )
  }

  if (isLoading || !task) {
    return (
      <section
        className="flex h-full min-h-0 flex-col border-r border-border bg-background"
        aria-label={labels.taskDetail}
      >
        <div className="flex flex-col gap-2.5 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-16 animate-pulse rounded-none bg-muted" />
            <div className="h-5 w-20 animate-pulse rounded-none bg-muted" />
          </div>
          <div className="h-6 w-48 animate-pulse rounded-none bg-muted" />
        </div>
        <div className="flex-1 space-y-6 p-5">
          <div className="space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-10 animate-pulse rounded bg-muted" />
              <div className="h-10 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </section>
    )
  }

  const ctx = (task.context as TaskContext) ?? null
  const productName = getCtxValue(ctx, 'productName') || labels.taskDetail
  const orderNumber = getCtxValue(ctx, 'orderNumber')
  const customerName = getCtxValue(ctx, 'customerName')
  const quantity = getCtxValue(ctx, 'quantity')
  const designName = getCtxValue(ctx, 'designName')
  const spec = getCtxValue(ctx, 'requirements')

  const actionLabel = buildActionLabel(task, boardStages, {
    requestReview: labels.requestReview,
    markReadyForProduction: labels.markReadyForProduction,
    done: labels.done,
    advanceTo: labels.advanceTo,
  })
  const isPendingApproval = task.status === 'pending_approval'

  const deadline = getTaskDeadlineInfo(ctx, locale, new Date())
  const deadlineStatusLabel = deadline
    ? deadline.dayDelta < 0
      ? labels.deadlineDaysOverdue(-deadline.dayDelta)
      : deadline.dayDelta === 0
        ? labels.deadlineToday
        : deadline.dayDelta === 1
          ? labels.deadlineTomorrow
          : labels.deadlineDaysLeft(deadline.dayDelta)
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
          <header className="flex flex-col gap-2.5 bg-background">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 border border-border">
                {task.taskNumber ?? '—'}
              </span>
              {currentStage ? (
                <Badge className="text-[10px] rounded-none">
                  {currentStage.name}
                </Badge>
              ) : null}
              {task.priority ? (
                <Badge
                  variant="destructive"
                  className="text-[10px] rounded-none"
                >
                  {labels.priorityBadge}
                </Badge>
              ) : null}
              {isPendingApproval ? (
                <Badge variant="warning" className="text-[10px] rounded-none">
                  {labels.needReview}
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
                {labels.designName}:{' '}
                <span className="text-foreground font-semibold font-mono bg-muted/65 border border-border px-1.5 py-0.5 ml-1 inline-block">
                  {designName}
                </span>
              </p>
            ) : null}
          </header>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1.5 border-border">
              {isId ? 'Ringkasan Produksi' : 'Production Summary'}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  {labels.orderLabel}
                </span>
                <div>
                  <span className="inline-block border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                    {orderNumber || '—'}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  {labels.customerLabel}
                </span>
                <p className="font-medium text-foreground">
                  {customerName || '—'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  {labels.quantityLabel}
                </span>
                <p className="font-medium text-foreground">
                  {quantity || '—'}{' '}
                  {quantity ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      {labels.pcs}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          </section>

          {spec ? (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1.5 border-border">
                {isId ? 'Petunjuk Pengerjaan' : 'Cutting Instructions'}
              </h3>
              <div className="whitespace-pre-wrap border border-border bg-card p-3.5 text-xs leading-relaxed text-foreground/95 rounded-none font-mono">
                {spec}
              </div>
            </section>
          ) : null}

          {lineItemAssets && lineItemAssets.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1.5 border-border">
                {isId ? 'Berkas Produksi' : 'Production Files'}
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
                  {isId ? 'Persyaratan Tahap' : 'Stage Requirements'}
                </h3>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {completedCount} {isId ? 'dari' : 'of'} {totalCount}{' '}
                  {isId ? 'selesai' : 'complete'}
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
                          <div className="size-5 shrink-0 rounded-full border border-border mt-0.5 bg-background" />
                        )}
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-foreground">
                            {req.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            {req.required
                              ? isId
                                ? 'Wajib sebelum lanjut'
                                : 'Required before advancing'
                              : isId
                                ? 'Opsional'
                                : 'Optional'}
                          </span>
                        </div>
                      </div>

                      <div className="w-full md:w-auto min-w-[200px] shrink-0">
                        {req.type === 'text' && (
                          <form.AppField name={`requirements[${index}].value`}>
                            {(field) => (
                              <input
                                type="text"
                                value={field.state.value}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                placeholder={
                                  isId ? 'Masukkan teks...' : 'Enter text...'
                                }
                                className="h-8 w-full border border-input bg-background px-3 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 rounded-none font-mono"
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
                                <input
                                  type="number"
                                  value={field.state.value ?? ''}
                                  onChange={(e) =>
                                    field.handleChange(
                                      e.target.value === ''
                                        ? null
                                        : Number(e.target.value),
                                    )
                                  }
                                  placeholder={
                                    isId
                                      ? 'Masukkan angka...'
                                      : 'Enter number...'
                                  }
                                  className="h-8 w-full border border-input bg-background pl-3 pr-8 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 font-mono rounded-none"
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
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-5 py-3.5">
          <div>
            {hasRequirements && remainingCount > 0 ? (
              <p className="text-[11px] text-muted-foreground leading-snug">
                <span className="font-semibold text-foreground">
                  {remainingCount}{' '}
                  {isId ? 'persyaratan tersisa' : 'requirement remaining'}
                </span>
                <br />
                {isId
                  ? 'Lengkapi semua untuk melanjutkan.'
                  : 'Complete all to move forward.'}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {currentStage?.name ?? labels.taskDetail}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasRequirements ? (
              <form.AppForm>
                <form.SubmitButton
                  isPending={advanceTask.isPending}
                  className="min-w-36 rounded-none h-8 text-xs font-semibold"
                >
                  {remainingCount > 0
                    ? isId
                      ? 'Lengkapi Persyaratan'
                      : 'Complete Requirements'
                    : (actionLabel ?? labels.completeRequirements)}
                </form.SubmitButton>
              </form.AppForm>
            ) : actionLabel ? (
              <Button
                type="button"
                onClick={() => void advanceTask.mutateAsync({ taskId })}
                isLoading={advanceTask.isPending}
                disabled={advanceTask.isPending}
                className="min-w-36 rounded-none h-8 text-xs font-semibold"
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
        className="flex h-full min-h-0 flex-1 flex-col border-r border-border bg-background"
      >
        {paneContent}
      </FormRoot>
    )
  }

  return (
    <section
      className="flex h-full min-h-0 flex-1 flex-col border-r border-border bg-background"
      aria-label={labels.taskDetail}
    >
      {paneContent}
    </section>
  )
}

type WorkflowRailLabels = {
  workflow: string
  activity: string
  commentPlaceholder: string
  send: string
  noActivity: string
  boardPreProduction: string
  boardProduction: string
  queue: string
  readyForProduction: string
  done: string
}

function WorkflowRail({
  taskId,
  orgId,
  activeStages,
  stepCounts,
  labels,
}: {
  taskId: string
  orgId: string
  activeStages: Stage[]
  stepCounts: Record<string, number>
  labels: WorkflowRailLabels
}) {
  const locale = useLocale()
  const isId = locale === 'id'
  const { data: task } = useTaskDetail(taskId)
  const { data: activities } = useTaskActivities(taskId)
  const { data: stages } = useStages()
  const { data: members } = useMembers()
  const { saveComment } = useTaskMutations()
  const [comment, setComment] = useState('')

  const stageNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of stages ?? []) map.set(s.id, s.name)
    return map
  }, [stages])

  const actorMap = useMemo(() => {
    const map = new Map<string, { name: string; image: string | null }>()
    if (!members) return map
    for (const m of members) {
      map.set(m.user.id, { name: m.user.name, image: m.user.image })
    }
    return map
  }, [members])

  const filteredActivities = useMemo(() => {
    if (!activities) return []
    return activities.filter(
      (act) =>
        act.type !== 'advancement_requested' &&
        act.type !== 'approved' &&
        act.type !== 'rejected',
    )
  }, [activities])

  const steps = useMemo(() => {
    const list: {
      id: string
      name: string
      board: string
      needApproval?: boolean
    }[] = []

    // 1. Antrian (Queue)
    list.push({ id: 'queue', name: labels.queue, board: 'pre_production' })

    // 2. Pre-production stages
    const preProdStages = activeStages.filter(
      (s) => s.board === 'pre_production',
    )
    for (const s of preProdStages) {
      list.push({
        id: s.id,
        name: s.name,
        board: 'pre_production',
        needApproval: s.needApproval,
      })
    }

    // 3. Pembayaran DP (Ready for production)
    list.push({
      id: 'ready_for_production',
      name: labels.readyForProduction,
      board: 'pre_production',
    })

    // 4. Production stages
    const prodStages = activeStages.filter((s) => s.board === 'production')
    for (const s of prodStages) {
      list.push({
        id: s.id,
        name: s.name,
        board: 'production',
        needApproval: s.needApproval,
      })
    }

    // 5. Selesai (Completed)
    list.push({ id: 'completed', name: labels.done, board: 'production' })

    if (!task) {
      return list.map((item) => ({ ...item, status: 'later' as const }))
    }

    let currentIndex = -1
    if (task.status === 'queued') {
      currentIndex = 0
    } else if (task.status === 'ready_for_production') {
      currentIndex = list.findIndex(
        (item) => item.id === 'ready_for_production',
      )
    } else if (task.status === 'completed') {
      currentIndex = list.findIndex((item) => item.id === 'completed')
    } else if (task.stageId) {
      currentIndex = list.findIndex((item) => item.id === task.stageId)
    }

    return list.map((item, idx) => {
      let status: 'done' | 'current' | 'next' | 'later' = 'later'
      if (idx < currentIndex) {
        status = 'done'
      } else if (idx === currentIndex) {
        status = 'current'
      } else if (idx === currentIndex + 1) {
        status = 'next'
      }
      return { ...item, status }
    })
  }, [activeStages, task, labels.queue, labels.readyForProduction, labels.done])

  return (
    <aside
      className="flex h-full min-h-0 flex-col border-l border-border bg-muted/30"
      aria-label={labels.workflow}
    >
      <section className="shrink-0 border-b border-border px-4 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {labels.workflow}
        </h3>
        <ol className="mt-3 space-y-3">
          {steps.map((step, idx) => {
            const count = stepCounts?.[step.id] ?? 0
            const subtitle = (() => {
              if (step.id === 'queue') {
                return step.status === 'done'
                  ? isId
                    ? 'Dirilis'
                    : 'Released'
                  : isId
                    ? 'Dalam antrian'
                    : 'In queue'
              }
              if (step.id === 'completed') {
                return isId ? 'Siap dikirim' : 'Ready to ship'
              }
              if (step.status === 'current') {
                if (task?.status === 'pending_approval') {
                  return isId ? 'Menunggu review' : 'Pending review'
                }
                return isId ? 'Tahap saat ini' : 'Current stage'
              }
              if (step.status === 'next') {
                return isId ? 'Tahap berikutnya' : 'Next stage'
              }
              if (step.status === 'later') {
                if (step.needApproval) {
                  return isId ? 'Perlu review' : 'Requires review'
                }
                return isId ? 'Nanti' : 'Later'
              }
              return isId ? 'Selesai' : 'Done'
            })()

            return (
              <li
                key={step.id}
                className="flex items-start justify-between gap-3 text-[12px]"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {step.status === 'done' ? (
                    <div className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
                      <Check className="size-3" strokeWidth={3} />
                    </div>
                  ) : (
                    <span
                      className={cn(
                        'inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                        step.status === 'current' &&
                          'bg-primary text-primary-foreground',
                        step.status === 'next' &&
                          'border border-primary text-foreground',
                        step.status === 'later' &&
                          'border border-border text-muted-foreground',
                      )}
                      aria-hidden
                    >
                      {idx + 1}
                    </span>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span
                      className={cn(
                        'truncate font-medium',
                        step.status === 'current'
                          ? 'font-semibold text-foreground'
                          : 'text-foreground/80',
                      )}
                    >
                      {step.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                      {subtitle}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-sm">
                  {count}
                </span>
              </li>
            )
          })}
        </ol>
      </section>
      <section className="flex min-h-0 flex-1 flex-col border-b border-border px-4 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {labels.activity}
        </h3>
        <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-auto pr-1">
          {filteredActivities.length === 0 ? (
            <li className="py-6 text-center text-[11.5px] text-muted-foreground">
              {labels.noActivity}
            </li>
          ) : (
            filteredActivities.map((act) => (
              <li key={act.id}>
                <ActivityRow
                  activity={act}
                  stageNameMap={stageNameMap}
                  actorMap={actorMap}
                  stages={stages}
                  taskContext={task?.context as Record<string, unknown> | null}
                />
              </li>
            ))
          )}
        </ul>
        <form
          className="mt-2 flex shrink-0 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!taskId || !comment.trim()) return
            void saveComment.mutateAsync({ taskId, text: comment.trim() })
            setComment('')
          }}
        >
          <Input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (!taskId || !comment.trim()) return
                void saveComment.mutateAsync({
                  taskId,
                  text: comment.trim(),
                })
                setComment('')
              }
            }}
            placeholder={labels.commentPlaceholder}
            className="h-8 text-[12px]"
            aria-label={labels.commentPlaceholder}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!comment.trim() || saveComment.isPending}
            isLoading={saveComment.isPending}
          >
            {labels.send}
          </Button>
        </form>
      </section>
      <span hidden aria-hidden>
        {orgId}
      </span>
    </aside>
  )
}
