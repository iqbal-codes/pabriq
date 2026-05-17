import { useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import type { BoardTask } from '../model'
import { KanbanTaskCard } from './kanban-task-card'

export type ColumnVariant = 'queue' | 'preProduction' | 'production' | 'done'

const variantStyles: Record<
  ColumnVariant,
  { headerBorder: string; headerBg: string; badgeBg: string }
> = {
  queue: {
    headerBorder: 'border-l-slate-400',
    headerBg: 'bg-slate-50/80 dark:bg-slate-900/50',
    badgeBg: 'bg-slate-500',
  },
  preProduction: {
    headerBorder: 'border-l-sky-500',
    headerBg: 'bg-sky-50/80 dark:bg-sky-950/30',
    badgeBg: 'bg-sky-600',
  },
  production: {
    headerBorder: 'border-l-amber-500',
    headerBg: 'bg-amber-50/80 dark:bg-amber-950/30',
    badgeBg: 'bg-amber-600',
  },
  done: {
    headerBorder: 'border-l-emerald-500',
    headerBg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    badgeBg: 'bg-emerald-600',
  },
}

type Props = {
  title: string
  count: number
  tasks: BoardTask[]
  onClickCard?: (taskId: string) => void
  variant?: ColumnVariant
}

export function KanbanColumn({
  title,
  count,
  tasks,
  onClickCard,
  variant = 'queue',
}: Props) {
  const t = useTranslations('production')
  const styles = variantStyles[variant]

  return (
    <Card className="flex h-full min-w-72 flex-col bg-muted/30 gap-0! py-0!">
      <CardHeader
        className={`flex flex-row items-center justify-between p-3 border-l-4 rounded-t-xl ${styles.headerBorder} ${styles.headerBg}`}
      >
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge className={`text-xs size-5 ${styles.badgeBg} text-white`}>
          {count}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 overflow-y-auto p-3 pt-0">
        {tasks.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {t('noTasks')}
          </p>
        ) : (
          tasks.map((bt) => (
            <KanbanTaskCard key={bt.task.id} task={bt} onClick={onClickCard} />
          ))
        )}
      </CardContent>
    </Card>
  )
}
