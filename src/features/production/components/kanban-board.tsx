import { useMemo } from 'react'
import { useTranslations } from 'use-intl'
import { Separator } from '#/components/ui/separator'
import type { BoardTask, Stage } from '../model'
import { KanbanColumn } from './kanban-column'

type Props = {
  stages: Stage[]
  boardData: {
    queued: BoardTask[]
    stages: Map<string, BoardTask[]>
    done: BoardTask[]
  }
  onClickCard?: (taskId: string) => void
}

export function KanbanBoard({ stages, boardData, onClickCard }: Props) {
  const t = useTranslations('production')

  const preProdStages = useMemo(
    () =>
      stages
        .filter((s) => s.active && s.board === 'pre_production')
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [stages],
  )

  const prodStages = useMemo(
    () =>
      stages
        .filter((s) => s.active && s.board === 'production')
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [stages],
  )

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-4 h-full">
      <KanbanColumn
        title={t('queue')}
        count={boardData.queued.length}
        tasks={boardData.queued}
        onClickCard={onClickCard}
        variant="queue"
      />

      <Separator orientation="vertical" className="h-auto self-stretch" />

      {preProdStages.map((stage) => (
        <KanbanColumn
          key={stage.id}
          title={stage.name}
          count={boardData.stages.get(stage.id)?.length ?? 0}
          tasks={boardData.stages.get(stage.id) ?? []}
          onClickCard={onClickCard}
          variant="preProduction"
        />
      ))}

      {preProdStages.length > 0 && prodStages.length > 0 && (
        <Separator orientation="vertical" className="h-auto self-stretch" />
      )}

      {prodStages.map((stage) => (
        <KanbanColumn
          key={stage.id}
          title={stage.name}
          count={boardData.stages.get(stage.id)?.length ?? 0}
          tasks={boardData.stages.get(stage.id) ?? []}
          onClickCard={onClickCard}
          variant="production"
        />
      ))}

      <Separator orientation="vertical" className="h-auto self-stretch" />

      <KanbanColumn
        title={t('done')}
        count={boardData.done.length}
        tasks={boardData.done}
        onClickCard={onClickCard}
        variant="done"
      />
    </div>
  )
}
