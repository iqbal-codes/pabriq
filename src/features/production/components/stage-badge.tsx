import { useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import type { ProductionTask, Stage } from '../model'

export const stageBadgeStyles = {
  queue:
    'border-gray-400/50 bg-gray-400/10 text-gray-600 dark:text-gray-400 dark:border-gray-700/50',
  preProduction:
    'border-blue-400/50 bg-blue-400/10 text-blue-600 dark:text-blue-400 dark:border-blue-500/30',
  production:
    'border-warning/50 bg-warning/10 text-warning dark:border-warning/30',
  done: 'border-success/50 bg-success/10 text-success dark:border-success/30',
} as const

type StageBadgeVariant = keyof typeof stageBadgeStyles

export function getStageBadgeVariant(
  taskStatus: string,
  taskStageId: string | null,
  taskBoard: string,
  stageBoardById: Map<string, string>,
): StageBadgeVariant {
  if (taskStatus === 'completed') return 'done'
  if (taskStatus === 'ready_for_production') return 'preProduction'
  if (taskStageId) {
    const board = stageBoardById.get(taskStageId) ?? taskBoard
    return board === 'production' ? 'production' : 'preProduction'
  }
  return 'queue'
}

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
