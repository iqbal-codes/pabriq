import { Clock } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent } from '#/components/ui/card'
import { cn } from '#/lib/utils'
import type { BoardTask } from '../model'
import {
  getTaskDeadlineClasses,
  getTaskDeadlineInfo,
  type TaskContext,
} from './task-deadline'

type Props = {
  task: BoardTask
  onClick?: (taskId: string) => void
  showDeadlineOutcome?: boolean
}

function getCtx(ctx: TaskContext, key: string): string {
  const val = ctx?.[key]
  return val != null && val !== '' ? String(val) : '-'
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
  const ctx = taskData.context as TaskContext
  const productName = getCtx(ctx, 'productName')
  const designName = getCtx(ctx, 'designName')
  const orderNum = getCtx(ctx, 'orderNumber')
  const quantity = getCtx(ctx, 'quantity')
  const deadlineReferenceDate =
    showDeadlineOutcome && taskData.status === 'completed'
      ? new Date(taskData.updatedAt)
      : new Date()
  const deadline = getTaskDeadlineInfo(ctx, locale, deadlineReferenceDate)
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
      className={`gap-0! py-0! ${isInteractive ? 'cursor-pointer hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50' : ''} ${isPendingApproval ? 'border-warning/60' : ''} ${taskData.priority ? 'bg-destructive/10 border-destructive/35 dark:bg-destructive/20 dark:border-destructive/50' : ''}`}
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
                  getTaskDeadlineClasses(
                    deadline.dayDelta,
                    showDeadlineOutcome,
                  ),
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
