import { parseAsString, useQueryState } from 'nuqs'
import { useMemo } from 'react'
import { useTranslations } from 'use-intl'
import { EmptyState } from '#/components/app/page-shell/empty-state'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Spinner } from '#/components/ui/spinner'
import { useGlobalModal } from '#/hooks/use-global-overlay'
import { KanbanBoard } from '../components/kanban-board'
import { useBoardTasks, useStages } from '../hooks'

const ALL_STAGES = '__all__'

type Props = {
  orgId: string
}

export function KanbanPage({ orgId }: Props) {
  const t = useTranslations('production')
  const { openModal } = useGlobalModal()

  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''))
  const [stageFilter, setStageFilter] = useQueryState(
    'stage',
    parseAsString.withDefault(''),
  )

  const { data: stages } = useStages()
  const allActiveStages = useMemo(() => {
    if (!stages) return []
    return stages
      .filter((s) => s.active)
      .sort((a, b) => a.orderIndex - b.orderIndex)
  }, [stages])

  const filters = useMemo(
    () => ({
      orgId,
      board: undefined,
      search: search || undefined,
      stageId: stageFilter || undefined,
    }),
    [orgId, search, stageFilter],
  )

  const { data: boardData, isLoading } = useBoardTasks(filters)

  return (
    <div className="flex flex-col overflow-hidden gap-4 h-full">
      <div className="flex items-center gap-3 px-4">
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value || null)}
          className="max-w-xs"
        />
        <Select
          value={stageFilter || ALL_STAGES}
          onValueChange={(v) => setStageFilter(v === ALL_STAGES ? null : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STAGES}>{t('allStages')}</SelectItem>
            {allActiveStages.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-full overflow-x-auto h-full">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : boardData ? (
          <KanbanBoard
            stages={allActiveStages}
            boardData={boardData}
            onClickCard={(taskId) => openModal('task-detail', taskId)}
          />
        ) : (
          <EmptyState
            title={t('noTasks')}
            description={t('searchPlaceholder')}
          />
        )}
      </div>
    </div>
  )
}
