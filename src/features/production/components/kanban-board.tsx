import { useTranslations } from "use-intl";
import type { BoardTask, Stage } from "../model";
import { KanbanColumn } from "./kanban-column";

type Props = {
  stages: Stage[];
  board: string;
  boardData: {
    queued: BoardTask[];
    stages: Map<string, BoardTask[]>;
    done: BoardTask[];
  };
  onClickCard?: (taskId: string) => void;
};

export function KanbanBoard({ stages, board, boardData, onClickCard }: Props) {
  const t = useTranslations("production");

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-4 h-full">
      <KanbanColumn
        title={t("queue")}
        count={boardData.queued.length}
        tasks={boardData.queued}
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
            onClickCard={onClickCard}
          />
        ))}

      {board !== "pre_production" && (
        <KanbanColumn
          title={t("done")}
          count={boardData.done.length}
          tasks={boardData.done}
          onClickCard={onClickCard}
        />
      )}
    </div>
  );
}
