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
    if (daysFromNow > 0) return 'text-success'
    if (daysFromNow === 0) return 'text-brand-accent'
    return 'text-destructive'
  }
  if (daysFromNow < 0) return 'text-destructive'
  if (daysFromNow <= 1) return 'text-warning'
  return 'text-muted-foreground'
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
      className={`gap-0! py-0! ${isInteractive ? 'cursor-pointer hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50' : ''} ${isPendingApproval ? 'border-warning/60' : ''}`}
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
            {isPendingApproval ? (
              <Badge variant="warning" className="text-[10px]">
                {pt('needReview')}
              </Badge>
            ) : null}
            {taskData.priority ? (
              <Badge variant="warning" className="text-[10px]">
                {pt('priorityBadge')}
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
          {deadline ? (
            <Badge
              variant="outline"
              className={cn(
                'shrink-0 text-[10px] gap-1 border-current',
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
      </CardContent>
    </Card>
  )
}
