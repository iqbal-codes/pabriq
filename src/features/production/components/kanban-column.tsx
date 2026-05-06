import { useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import type { BoardTask } from '../model'
import { KanbanTaskCard } from './kanban-task-card'

type Props = {
  title: string
  count: number
  tasks: BoardTask[]
  canApprove?: boolean
  onAdvance?: (taskId: string) => void
  onStart?: (taskId: string) => void
  onReview?: (taskId: string) => void
  onClickCard?: (taskId: string) => void
}

export function KanbanColumn({
  title,
  count,
  tasks,
  canApprove = false,
  onAdvance,
  onStart,
  onReview,
  onClickCard,
}: Props) {
  const t = useTranslations('production')

  return (
    <Card className="flex h-full min-w-72 flex-col bg-muted/30 py-0! gap-2!">
      <CardHeader className="flex flex-row items-center justify-between p-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary">{count}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 overflow-y-auto p-3 pt-0">
        {tasks.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {t('noTasks')}
          </p>
        ) : (
          tasks.map((bt) => (
            <KanbanTaskCard
              key={bt.task.id}
              task={bt}
              canApprove={canApprove}
              onAdvance={onAdvance}
              onStart={onStart}
              onReview={onReview}
              onClick={onClickCard}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}
