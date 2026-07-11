import { useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import type { BoardTask } from '../model'
import { KanbanTaskCard } from './kanban-task-card'

type ColumnVariant = 'queue' | 'preProduction' | 'production' | 'done'
const variantStyles: Record<
  ColumnVariant,
  { headerBg: string; badgeBg: string; border: string }
> = {
  queue: {
    headerBg: 'bg-gray-400/5 dark:bg-gray-400/20',
    badgeBg: 'bg-gray-400',
    border: 'border-gray-400',
  },
  preProduction: {
    headerBg: 'bg-blue-400/10 dark:bg-blue-400/20',
    badgeBg: 'bg-blue-400',
    border: 'border-blue-400',
  },
  production: {
    headerBg: 'bg-warning/15 dark:bg-warning/20',
    badgeBg: 'bg-warning',
    border: 'border-warning',
  },
  done: {
    headerBg: 'bg-success/10 dark:bg-success/20',
    badgeBg: 'bg-success',
    border: 'border-success',
  },
}

type Props = {
  title: string
  count: number
  tasks: BoardTask[]
  onClickCard?: (taskId: string) => void
  variant?: ColumnVariant
  needApproval?: boolean
  showDeadlineOutcome?: boolean
}

export function KanbanColumn({
  title,
  count,
  tasks,
  onClickCard,
  variant = 'queue',
  needApproval,
  showDeadlineOutcome = false,
}: Props) {
  const t = useTranslations('production')
  const styles = variantStyles[variant]

  return (
    <Card
      className={`flex h-full min-w-72 flex-col bg-muted/30 gap-0! py-0! border-0 border-t-2 ${styles.border}`}
    >
      <CardHeader
        className={`flex flex-row items-center justify-between p-3! rounded-t-xl ${styles.headerBg}`}
      >
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold">{title}</h3>
          {needApproval && (
            <Badge variant="warning" className="text-xs">
              {t('needApproval')}
            </Badge>
          )}
        </div>
        <Badge
          className={`text-xs size-5 ${styles.badgeBg} text-white`}
          aria-label={t('columnTaskCount', { column: title, count })}
        >
          {count}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 overflow-y-auto p-3!">
        {tasks.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {t('noTasks')}
          </p>
        ) : (
          tasks.map((bt) => (
            <KanbanTaskCard
              key={bt.task.id}
              task={bt}
              onClick={onClickCard}
              showDeadlineOutcome={showDeadlineOutcome}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}
