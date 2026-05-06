import { useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { BoardTask } from '../model'

type Props = {
  task: BoardTask
  canApprove?: boolean
  onAdvance?: (taskId: string) => void
  onStart?: (taskId: string) => void
  onReview?: (taskId: string) => void
  onClick?: (taskId: string) => void
}

function contextValue(
  ctx: Record<string, string | number | boolean | null> | null,
  key: string,
): string {
  const val = ctx?.[key]
  return val != null ? String(val) : ''
}

export function KanbanTaskCard({
  task: boardTask,
  canApprove = false,
  onAdvance,
  onStart,
  onReview,
  onClick,
}: Props) {
  const t = useTranslations('production')
  const taskData = boardTask.task
  const ctx = taskData.context as Record<
    string,
    string | number | boolean | null
  > | null
  const productName = contextValue(ctx, 'productName')
  const customerName = contextValue(ctx, 'customerName')

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow py-0! gap-0!"
      onClick={() => onClick?.(taskData.id)}
    >
      <CardHeader className="p-3 pb-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium truncate">
            {productName}
          </CardTitle>
          <Badge variant="secondary">{taskData.status}</Badge>
        </div>
        {customerName && (
          <p className="text-xs text-muted-foreground truncate">
            {customerName}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-2">
        {taskData.status === 'queued' && onStart && (
          <Button
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              onStart(taskData.id)
            }}
          >
            {t('startProduction')}
          </Button>
        )}
        {taskData.status === 'in_progress' && onAdvance && (
          <Button
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              onAdvance(taskData.id)
            }}
          >
            {t('advanceTo')}
          </Button>
        )}
        {taskData.status === 'pending_approval' && canApprove && onReview && (
          <Button
            size="sm"
            className="w-full"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onReview(taskData.id)
            }}
          >
            {t('reviewAdvancement')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
