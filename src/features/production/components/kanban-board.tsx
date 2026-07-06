import { useMemo } from 'react'
import { useTranslations } from 'use-intl'
import { Separator } from '#/components/ui/separator'
import { getReadyForProductionLabel } from '#/features/production/ready-for-production-label'
import type { BoardTask, Stage } from '../model'
import { KanbanColumn } from './kanban-column'

type Props = {
  stages: Stage[]
  boardData: {
    queued: BoardTask[]
    stages: Map<string, BoardTask[]>
    readyForProduction: BoardTask[]
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

  const firstProdStageName = prodStages[0]?.name
  const readyForProductionTitle = useMemo(
    () =>
      getReadyForProductionLabel({
        firstProductionStageName: firstProdStageName,
        readyForProduction: t('readyForProduction'),
        readyForProductionWithStage: (values) =>
          t('readyForProductionQueue', values),
      }),
    [firstProdStageName, t],
  )

  return (
    <section
      className="flex gap-4 overflow-x-auto pb-4 px-4 h-full"
      aria-label={t('productionTasks')}
    >
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
          needApproval={stage.needApproval}
        />
      ))}
      {preProdStages.length > 0 && (
        <KanbanColumn
          title={readyForProductionTitle}
          count={boardData.readyForProduction.length}
          tasks={boardData.readyForProduction}
          variant="preProduction"
          onClickCard={onClickCard}
        />
      )}

      {prodStages.length > 0 && (
        <Separator orientation="vertical" className="h-auto self-stretch" />
      )}
      {prodStages.map((stage, index) => (
        <KanbanColumn
          key={stage.id}
          title={stage.name}
          count={boardData.stages.get(stage.id)?.length ?? 0}
          tasks={boardData.stages.get(stage.id) ?? []}
          onClickCard={onClickCard}
          variant="production"
          needApproval={stage.needApproval}
          showDeadlineOutcome={index === prodStages.length - 1}
        />
      ))}

      <Separator orientation="vertical" className="h-auto self-stretch" />

      <KanbanColumn
        title={t('done')}
        count={boardData.done.length}
        tasks={boardData.done}
        onClickCard={onClickCard}
        variant="done"
        showDeadlineOutcome={true}
      />
    </section>
  )
}
