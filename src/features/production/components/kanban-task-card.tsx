import { Clock } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent } from '#/components/ui/card'
import { formatShortDate } from '#/lib/formatters'
import { cn } from '#/lib/utils'
import type { BoardTask } from '../model'

type Props = {
  task: BoardTask
  onClick?: (taskId: string) => void
  showDeadlineOutcome?: boolean
}

function getCtx(
  ctx: Record<string, string | number | boolean | null> | null,
  key: string,
): string {
  const val = ctx?.[key]
  return val != null && val !== '' ? String(val) : '-'
}

type DeadlineInfo = {
  date: Date
  dayDelta: number
  dateLabel: string
}

function getDeadlineInfo(
  ctx: Record<string, string | number | boolean | null> | null,
  locale: string,
  referenceDate: Date,
): DeadlineInfo | null {
  const raw = ctx?.deadline
  if (raw == null || raw === '') return null
  const date = new Date(String(raw))
  if (Number.isNaN(date.getTime())) return null
  const msPerDay = 24 * 60 * 60 * 1000
  const startOfReference = new Date(referenceDate)
  startOfReference.setHours(0, 0, 0, 0)
  const startOfDeadline = new Date(date)
  startOfDeadline.setHours(0, 0, 0, 0)
  const dayDelta = Math.round(
    (startOfDeadline.getTime() - startOfReference.getTime()) / msPerDay,
  )
  return {
    date,
    dayDelta,
    dateLabel: formatShortDate(date.toISOString(), locale),
  }
}

function getDeadlineClasses(
  daysFromNow: number,
  showDeadlineOutcome: boolean,
): string {
  if (showDeadlineOutcome) {
    if (daysFromNow > 0) return 'bg-success text-white border-transparent'
    if (daysFromNow === 0)
      return 'bg-brand-accent text-white border-transparent'
    return 'bg-destructive text-white border-transparent'
  }
  // Overdue
  if (daysFromNow < 0) {
    return 'bg-destructive text-white border-transparent font-semibold animate-pulse'
  }
  // Today
  if (daysFromNow === 0) {
    return 'bg-destructive text-white border-transparent font-medium'
  }
  // Tomorrow or day after (near deadline: 1-2 days)
  if (daysFromNow <= 2) {
    return 'bg-orange-600 dark:bg-orange-500 text-white border-transparent'
  }
  // Mid deadline: 3-5 days
  if (daysFromNow <= 5) {
    return 'bg-amber-500 text-white border-transparent'
  }
  // Long time: > 5 days
  return 'bg-success text-white border-transparent'
}

export function KanbanTaskCard({
  task,
  onClick,
  showDeadlineOutcome = false,
}: Props) {
  const ct = useTranslations('common')
  const pt = useTranslations('production')
  const locale = useLocale()
  const taskData = task.task
  const ctx = taskData.context as Record<
    string,
    string | number | boolean | null
  > | null
  const productName = getCtx(ctx, 'productName')
  const designName = getCtx(ctx, 'designName')
  const orderNum = getCtx(ctx, 'orderNumber')
  const quantity = getCtx(ctx, 'quantity')
  const deadlineReferenceDate =
    showDeadlineOutcome && taskData.status === 'completed'
      ? new Date(taskData.updatedAt)
      : new Date()
  const deadline = getDeadlineInfo(ctx, locale, deadlineReferenceDate)
  const isPendingApproval = taskData.status === 'pending_approval'
  const isInteractive = typeof onClick === 'function'

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!isInteractive) return
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Space')
      return
    event.preventDefault()
    onClick(taskData.id)
  }

  const taskLabel = taskData.taskNumber || productName

  return (
    <Card
      className={`gap-0! py-0! ${isInteractive ? 'cursor-pointer hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50' : ''} ${isPendingApproval ? 'border-warning/60' : ''} ${taskData.priority ? 'bg-red-50/70 border-red-200 dark:bg-red-950/20 dark:border-red-900/60' : ''}`}
      onClick={isInteractive ? () => onClick(taskData.id) : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={
        isInteractive ? pt('openTask', { task: taskLabel }) : undefined
      }
      onKeyDown={isInteractive ? handleKeyDown : undefined}
    >
      <CardContent className="p-2.5! space-y-0.5">
        <div className="flex h-5 items-center justify-between gap-1.5">
          <span className="font-mono text-xs font-semibold">
            {taskData.taskNumber || '-'}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {taskData.priority ? (
              <Badge variant="destructive" className="text-[10px]">
                {pt('priorityBadge')}
              </Badge>
            ) : null}
            {deadline ? (
              <Badge
                variant="outline"
                className={cn(
                  'shrink-0 text-[10px] gap-1',
                  getDeadlineClasses(deadline.dayDelta, showDeadlineOutcome),
                )}
                title={pt('deadlineLabel', { date: deadline.dateLabel })}
              >
                <Clock className="size-3" />
                {showDeadlineOutcome
                  ? deadline.dayDelta > 0
                    ? pt('deadlineFinishedEarly', { days: deadline.dayDelta })
                    : deadline.dayDelta === 0
                      ? pt('deadlineOnTime')
                      : pt('deadlineFinishedLate', {
                          days: -deadline.dayDelta,
                        })
                  : deadline.dayDelta < 0
                    ? pt('deadlineDaysOverdue', { days: -deadline.dayDelta })
                    : deadline.dayDelta === 0
                      ? pt('deadlineToday')
                      : deadline.dayDelta === 1
                        ? pt('deadlineTomorrow')
                        : pt('deadlineDaysLeft', {
                            days: deadline.dayDelta,
                          })}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          {orderNum}
        </div>
        <p className="text-sm font-medium leading-tight truncate">
          {productName}
        </p>
        {designName && designName !== '-' && (
          <p className="text-xs text-muted-foreground truncate">{designName}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground truncate">
            {quantity ? `${quantity} ${ct('pcs')}` : ''}
          </p>
          {isPendingApproval ? (
            <Badge variant="warning" className="text-[10px] shrink-0">
              {pt('needReview')}
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
