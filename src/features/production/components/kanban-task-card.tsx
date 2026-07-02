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
  daysFromNow: number
  dateLabel: string
}

function getDeadlineInfo(
  ctx: Record<string, string | number | boolean | null> | null,
  locale: string,
): DeadlineInfo | null {
  const raw = ctx?.deadline
  if (raw == null || raw === '') return null
  const date = new Date(String(raw))
  if (Number.isNaN(date.getTime())) return null
  const msPerDay = 24 * 60 * 60 * 1000
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfDeadline = new Date(date)
  startOfDeadline.setHours(0, 0, 0, 0)
  const daysFromNow = Math.round(
    (startOfDeadline.getTime() - startOfToday.getTime()) / msPerDay,
  )
  return {
    date,
    daysFromNow,
    dateLabel: formatShortDate(date.toISOString(), locale),
  }
}

function getDeadlineClasses(daysFromNow: number): string {
  if (daysFromNow < 0) return 'text-destructive'
  if (daysFromNow <= 1) return 'text-warning'
  return 'text-muted-foreground'
}

export function KanbanTaskCard({ task, onClick }: Props) {
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
  const deadline = getDeadlineInfo(ctx, locale)
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
      className={`gap-0! py-0! ${isInteractive ? 'cursor-pointer hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50' : ''} ${isPendingApproval ? 'opacity-80' : ''}`}
      onClick={isInteractive ? () => onClick(taskData.id) : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={
        isInteractive ? pt('openTask', { task: taskLabel }) : undefined
      }
      onKeyDown={isInteractive ? handleKeyDown : undefined}
    >
      <CardContent className="p-3 space-y-1">
        <div className="flex h-[21px] items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold">
            {taskData.taskNumber || '-'}
          </span>
          {taskData.priority ? (
            <Badge variant="warning" className="shrink-0 text-[10px]">
              {pt('priorityBadge')}
            </Badge>
          ) : null}
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
                getDeadlineClasses(deadline.daysFromNow),
              )}
              title={pt('deadlineLabel', { date: deadline.dateLabel })}
            >
              <Clock className="size-3" />
              {deadline.daysFromNow < 0
                ? pt('deadlineDaysOverdue', { days: -deadline.daysFromNow })
                : deadline.daysFromNow === 0
                  ? pt('deadlineToday')
                  : deadline.daysFromNow === 1
                    ? pt('deadlineTomorrow')
                    : pt('deadlineDaysLeft', { days: deadline.daysFromNow })}
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
