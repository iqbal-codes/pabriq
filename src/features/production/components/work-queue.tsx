import { Archive, ArchiveRestore, Clock, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import { Spinner } from '#/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { cn } from '#/lib/utils'
import { useArchivedTasks } from '../hooks'
import type { BoardTask, Stage } from '../model'
import { StageBadge } from './stage-badge'
import { getTaskDeadlineInfo, type TaskContext } from './task-deadline'

export type QueueTab = 'active' | 'archived'

function getCtxValue(ctx: TaskContext, key: string): string {
  const raw = ctx?.[key]
  if (raw == null || raw === '') return ''
  return String(raw)
}

export function WorkQueue({
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
}) {
  const t = useTranslations('production')
  const ct = useTranslations('common')
  const locale = useLocale()

  const [referenceDate, setReferenceDate] = useState<Date | null>(null)
  useEffect(() => {
    setReferenceDate(new Date())
  }, [])

  const stageOrder = useMemo(
    () => new Map(activeStages.map((s, i) => [s.id, i] as const)),
    [activeStages],
  )

  const flat = useMemo(() => {
    return [...ready, ...waiting].sort((a, b) => {
      if (a.task.priority !== b.task.priority) {
        return Number(b.task.priority) - Number(a.task.priority)
      }
      const aIdx = a.task.stageId ? (stageOrder.get(a.task.stageId) ?? -1) : -1
      const bIdx = b.task.stageId ? (stageOrder.get(b.task.stageId) ?? -1) : -1
      if (aIdx !== bIdx) return aIdx - bIdx
      return 0
    })
  }, [ready, waiting, stageOrder])

  // Optimization: Only fetch archived tasks when the archive tab is active.
  const { data: archivedData, isLoading: archivedLoading } = useArchivedTasks(
    {
      orgId,
      search: search || undefined,
      page: 1,
      perPage: 50,
    },
    { enabled: tab === 'archived' },
  )
  const archivedRows = archivedData?.rows ?? []

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  )

  const searchPlaceholder = t('searchPlaceholder')
  const activeTab = t('tabActive')
  const archivedTab = t('tabArchive')

  return (
    <aside
      className="flex h-full min-h-0 flex-col border-r border-border bg-muted/30"
      aria-label={activeTab}
    >
      <div className="flex flex-col gap-2.5 bg-background p-3 border-b border-border">
        <div className="relative w-full">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="text"
            value={search}
            onChange={(e) => void onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-8 text-sm"
            aria-label={searchPlaceholder}
          />
        </div>
      </div>
      <Tabs value={tab} onValueChange={(v) => onTabChange(v as QueueTab)}>
        <TabsList variant="line" className="border-b border-border w-full">
          <TabsTrigger value="active" className="gap-1.5 text-xs font-medium">
            <ArchiveRestore className="size-3.5" aria-hidden />
            {activeTab}
            <span className="font-mono text-[10px] text-muted-foreground">
              {ready.length + waiting.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-1.5 text-xs font-medium">
            <Archive className="size-3.5" aria-hidden />
            {archivedTab}
            <span className="font-mono text-[10px] text-muted-foreground">
              {archivedRows.length}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === 'active' ? (
        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : flat.length === 0 ? (
            <p className="px-4 py-12 text-center text-xs text-muted-foreground">
              {ready.length === 0 ? t('noReadyTasks') : t('noWaitingTasks')}
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {flat.map((bt) => {
                const task = bt.task
                const ctx = task.context as TaskContext
                const productName = getCtxValue(ctx, 'productName') || '—'
                const orderNum = getCtxValue(ctx, 'orderNumber') || '—'
                const quantity = getCtxValue(ctx, 'quantity')
                const isQueued = task.status === 'queued'
                const isSelected = selectedTaskId === task.id
                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(task.id)}
                      aria-pressed={isSelected}
                      aria-label={t('openTask', {
                        task: task.taskNumber ?? productName,
                      })}
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
                              {t('priorityBadge')}
                            </Badge>
                          )}
                          {task.status === 'pending_approval' && (
                            <Badge variant="warning" className="text-[9px]">
                              {t('needReview')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 truncate text-[13px] font-medium leading-tight text-foreground">
                        {productName}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StageBadge task={task} activeStages={activeStages} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
                        <span className="truncate font-mono">{orderNum}</span>
                        {quantity ? (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {quantity} {ct('pcs')}
                          </span>
                        ) : null}
                      </div>
                      {!isQueued && referenceDate ? (
                        <DeadlineLine
                          ctx={ctx}
                          locale={locale}
                          referenceDate={referenceDate}
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
              {t('archivedEmpty')}
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
  referenceDate,
}: {
  ctx: TaskContext
  locale: string
  referenceDate: Date
}) {
  const t = useTranslations('production')
  const info = getTaskDeadlineInfo(ctx, locale, referenceDate)
  if (!info) return null
  const text =
    info.dayDelta < 0
      ? t('deadlineDaysOverdue', { days: -info.dayDelta })
      : info.dayDelta === 0
        ? t('deadlineToday')
        : info.dayDelta === 1
          ? t('deadlineTomorrow')
          : t('deadlineDaysLeft', { days: info.dayDelta })
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
