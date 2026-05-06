import { useTranslations } from 'use-intl'
import type { BoardTask, Stage } from '../model'
import { KanbanColumn } from './kanban-column'

type Props = {
  stages: Stage[]
  boardData: {
    queued: BoardTask[]
    stages: Map<string, BoardTask[]>
    done: BoardTask[]
  }
  canApprove?: boolean
  onAdvance?: (taskId: string) => void
  onStart?: (taskId: string) => void
  onReview?: (taskId: string) => void
  onClickCard?: (taskId: string) => void
}

export function KanbanBoard({
  stages,
  boardData,
  canApprove = false,
  onAdvance,
  onStart,
  onReview,
  onClickCard,
}: Props) {
  const t = useTranslations('production')

  return (
    <div className="flex gap-4 overflow-x-auto px-4 h-full pb-4">
      <KanbanColumn
        title={t('queue')}
        count={boardData.queued.length}
        tasks={boardData.queued}
        canApprove={canApprove}
        onAdvance={onAdvance}
        onStart={onStart}
        onReview={onReview}
        onClickCard={onClickCard}
      />

      {stages
        .filter((s) => s.active)
        .map((stage) => (
          <KanbanColumn
            key={stage.id}
            title={stage.name}
            count={boardData.stages.get(stage.id)?.length ?? 0}
            tasks={boardData.stages.get(stage.id) ?? []}
            canApprove={canApprove}
            onAdvance={onAdvance}
            onStart={onStart}
            onReview={onReview}
            onClickCard={onClickCard}
          />
        ))}

      <KanbanColumn
        title={t('done')}
        count={boardData.done.length}
        tasks={boardData.done}
        canApprove={canApprove}
        onAdvance={onAdvance}
        onStart={onStart}
        onReview={onReview}
        onClickCard={onClickCard}
      />
    </div>
  )
}
