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
  const taskData = task.task
  const ctx = taskData.context as Record<
    string,
    string | number | boolean | null
  > | null
  const productName = getCtx(ctx, 'productName')
  const customerName = getCtx(ctx, 'customerName')
  const orderNum = getCtx(ctx, 'orderNumber')
  const quantity = getCtx(ctx, 'quantity')

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow gap-0! py-0!"
      onClick={() => onClick?.(taskData.id)}
    >
      <CardContent className="p-3 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold">
            {taskData.taskNumber || '-'}
          </span>
          <Badge variant="secondary" className="text-[10px] leading-3">
            {taskData.status}
          </Badge>
        </div>
        <div className="text-[11px] text-muted-foreground font-mono">
          {orderNum}
        </div>
        <p className="text-sm font-medium leading-tight truncate">
          {productName}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          {customerName}
          {quantity ? ` \u00B7 ${quantity} pcs` : ''}
        </p>
      </CardContent>
    </Card>
  )
}
