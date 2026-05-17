import { useTranslations } from 'use-intl'
import { StatusBadge } from '#/components/status-badge'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent } from '#/components/ui/card'
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

export function KanbanTaskCard({ task, onClick }: Props) {
  const ct = useTranslations('common')
  const pt = useTranslations('production')
  const taskData = task.task
  const ctx = taskData.context as Record<
    string,
    string | number | boolean | null
  > | null
  const productName = getCtx(ctx, 'productName')
  const orderNum = getCtx(ctx, 'orderNumber')
  const quantity = getCtx(ctx, 'quantity')
  const isPendingApproval = taskData.status === 'pending_approval'

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow gap-0! py-0! ${isPendingApproval ? 'opacity-80' : ''}`}
      onClick={() => onClick?.(taskData.id)}
    >
      <CardContent className="p-3 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold">
            {taskData.taskNumber || '-'}
          </span>
          <StatusBadge status={taskData.status} />
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          {orderNum}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium leading-tight truncate">
            {productName}
          </p>
          {taskData.priority ? (
            <Badge variant="warning" className="shrink-0 text-[10px]">
              {pt('priorityBadge')}
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {quantity ? `${quantity} ${ct('pcs')}` : ''}
        </p>
      </CardContent>
    </Card>
  )
}
