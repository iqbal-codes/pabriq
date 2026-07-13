export const stageBadgeStyles = {
  queue:
    'border-gray-400/50 bg-gray-400/10 text-gray-600 dark:text-gray-400 dark:border-gray-700/50',
  preProduction:
    'border-blue-400/50 bg-blue-400/10 text-blue-600 dark:text-blue-400 dark:border-blue-500/30',
  production:
    'border-warning/50 bg-warning/10 text-warning dark:border-warning/30',
  done: 'border-success/50 bg-success/10 text-success dark:border-success/30',
} as const

export type StageBadgeVariant = keyof typeof stageBadgeStyles

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
