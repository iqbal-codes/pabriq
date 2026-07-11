import { useTranslations } from 'use-intl'
import type { DataTableLabels } from '#/components/app/data-table'
import { DataTable } from '#/components/app/data-table'
import { useGlobalModal } from '#/hooks/use-global-overlay'
import { StageRowActions, useStageColumns } from '../components/stage-columns'
import { useStageMutations } from '../hooks'
import type { Stage } from '../model'

type Props = {
  stages: Stage[]
  loading: boolean
}

export function StageList({ stages, loading }: Props) {
  const t = useTranslations('production')
  const dt = useTranslations('dataTable')
  const { openModal } = useGlobalModal()
  const { deleteStage, reorderStages } = useStageMutations()
  const isReordering = reorderStages.isPending
  const deletingStageId = deleteStage.isPending
    ? deleteStage.variables?.id
    : null

  async function handleMoveUp(index: number) {
    if (index === 0) return
    const ids = stages.map((s) => s.id)
    ;[ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]
    await reorderStages.mutateAsync({ stageIds: ids })
  }

  async function handleMoveDown(index: number) {
    if (index === stages.length - 1) return
    const ids = stages.map((s) => s.id)
    ;[ids[index], ids[index + 1]] = [ids[index + 1], ids[index]]
    await reorderStages.mutateAsync({ stageIds: ids })
  }

  async function handleDelete(stageId: string) {
    await deleteStage.mutateAsync({ id: stageId })
  }

  const columns = useStageColumns({
    stages,
    isReordering,
    isDeletingId: deletingStageId,
    onMoveUp: handleMoveUp,
    onMoveDown: handleMoveDown,
  })

  const labels: DataTableLabels = {
    clearFilters: dt('clearFilters'),
    columnVisibility: dt('columnVisibility'),
    errorRetry: dt('errorRetry'),
    errorTitle: dt('errorTitle'),
    firstPage: dt('firstPage'),
    lastPage: dt('lastPage'),
    loading: dt('loading'),
    nextPage: dt('nextPage'),
    of: dt('of'),
    page: dt('page'),
    perPage: dt('perPage'),
    previousPage: dt('previousPage'),
    resetColumns: dt('resetColumns'),
    rowsSelected: (selected: number, total: number) =>
      dt('rowsSelected', { selected, total }),
    visibleRows: (from: number, to: number, total: number) =>
      dt('visibleRows', { from, to, total }),
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={stages}
        getRowId={(row) => row.id}
        isLoading={loading}
        labels={labels}
        onPageChange={() => {}}
        onPerPageChange={() => {}}
        page={1}
        perPage={stages.length || 1}
        tableId="production-stages"
        totalRows={stages.length}
        emptyTitle={t('stageManagement')}
        emptyDescription={t('noTasks')}
        noResultsTitle={t('stageManagement')}
        hasActiveFilters={false}
        rowActions={(stage: Stage) => (
          <div className="flex gap-1">
            <StageRowActions
              isReordering={isReordering}
              isDeleting={deletingStageId === stage.id}
              onEdit={() => openModal('stage-form', stage.id)}
              onDelete={() => handleDelete(stage.id)}
            />
          </div>
        )}
      />
    </div>
  )
}
