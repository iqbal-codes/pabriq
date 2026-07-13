import { useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import type { ProductionTask, Stage } from '../model'

import { getStageBadgeVariant, stageBadgeStyles } from './stage-badge-utils'

export function StageBadge({
  task,
  activeStages,
}: {
  task: ProductionTask
  activeStages: Stage[]
}) {
  const t = useTranslations('production')

  const stageNameById = new Map(
    activeStages.map((s) => [s.id, s.name] as const),
  )
  const stageBoardById = new Map(
    activeStages.map((s) => [s.id, s.board] as const),
  )

  const firstProdStageName = activeStages.find(
    (s) => s.board === 'production',
  )?.name
  const readyForProductionLabel = firstProdStageName
    ? t('readyForProductionQueue', { stage: firstProdStageName })
    : t('readyForProduction')

  const stageName = task.stageId
    ? (stageNameById.get(task.stageId) ?? '—')
    : task.status === 'ready_for_production'
      ? readyForProductionLabel
      : t('stagePending')

  const variant = getStageBadgeVariant(
    task.status,
    task.stageId,
    task.board,
    stageBoardById,
  )

  return (
    <Badge
      variant="outline"
      className={cn(
        'px-1.5 py-0 text-[10px] font-medium',
        stageBadgeStyles[variant],
      )}
    >
      {stageName}
    </Badge>
  )
}
