import { parseAsString, useQueryState } from 'nuqs'
import { useMemo } from 'react'
import { useTranslations } from 'use-intl'
import { Input } from '#/components/ui/input'
import { NativeSelect } from '#/components/ui/native-select'
import { Spinner } from '#/components/ui/spinner'
import { useGlobalModal } from '#/hooks/use-global-overlay'
import { KanbanBoard } from '../components/kanban-board'
import { useBoardTasks, useStages } from '../hooks'

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
        <NativeSelect
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value || null)}
          className="w-48"
        >
          <option value="">{t('allStages')}</option>
          {allActiveStages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
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
          <div className="py-16 text-center text-sm text-muted-foreground">
            {t('noTasks')}
          </div>
        )}
      </div>
    </div>
  )
}
