import { Badge } from '#/components/ui/badge'
import type { TaskStageCount } from '#/features/dashboard/model'
import { READY_FOR_PRODUCTION_STATUS } from '#/features/production/constants'
import { formatNumber } from '#/lib/formatters'
import { cn } from '#/lib/utils'

export function TaskStageList({
  items,
  queueLabel,
  readyForProductionLabel,
  doneLabel,
  locale,
}: {
  items: TaskStageCount[]
  queueLabel: string
  readyForProductionLabel: string
  doneLabel: string
  locale: string
}) {
  const maxCount = Math.max(...items.map((item) => item.count), 1)

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const label =
          item.id === 'queue'
            ? queueLabel
            : item.id === READY_FOR_PRODUCTION_STATUS
              ? readyForProductionLabel
              : item.id === 'done'
                ? doneLabel
                : item.name
        const width = `${Math.max((item.count / maxCount) * 100, item.count > 0 ? 8 : 0)}%`
        const barColor =
          item.id === 'queue'
            ? 'bg-primary'
            : item.id === 'done'
              ? 'bg-success'
              : item.board === 'pre_production'
                ? 'bg-brand-accent'
                : 'bg-warning'

        return (
          <div key={item.id} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="truncate font-medium">{label}</p>
              <Badge variant="secondary">
                {formatNumber(item.count, locale)}
              </Badge>
            </div>
            <div className="h-2 bg-muted">
              <div
                className={cn('h-2 transition-all', barColor)}
                style={{ width }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
