import { ArrowDown, ArrowUp, Edit, Trash } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import type { AppColumnDef, DataTableLabels } from '#/components/app/data-table'
import { DataTable } from '#/components/app/data-table'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { useStageMutations } from '../hooks'
import type { Stage } from '../model'
import { StageForm } from './stage-form'

type Props = {
  stages: Stage[]
  loading: boolean
}

export function StageList({ stages, loading }: Props) {
  const t = useTranslations('production')
  const dt = useTranslations('dataTable')
  const { deleteStage, reorderStages } = useStageMutations()
  const [editStage, setEditStage] = useState<Stage | undefined>()
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

  const columns: AppColumnDef<Stage>[] = [
    {
      id: 'reorder',
      header: t('reorder'),
      enableSorting: false,
      meta: { label: t('reorder'), mobileRole: 'hidden' },
      cell: ({ row }) => {
        const i = stages.findIndex((s) => s.id === row.original.id)
        return (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleMoveUp(i)}
              isLoading={isReordering}
              disabled={isReordering || deleteStage.isPending || i === 0}
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleMoveDown(i)}
              isLoading={isReordering}
              disabled={
                isReordering || deleteStage.isPending || i === stages.length - 1
              }
            >
              <ArrowDown className="size-4" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: 'name',
      header: t('stageName'),
      meta: { label: t('stageName'), mobileRole: 'title' },
    },
    {
      accessorKey: 'description',
      header: t('stageDescription'),
      meta: { label: t('stageDescription'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.description ?? '—'}
        </span>
      ),
    },
    {
      id: 'needApproval',
      header: t('needApproval'),
      meta: { label: t('needApproval'), mobileRole: 'badge' },
      cell: ({ row }) => (
        <Badge variant={row.original.needApproval ? 'default' : 'secondary'}>
          {row.original.needApproval ? t('required') : t('optional')}
        </Badge>
      ),
    },
    {
      id: 'requirements',
      header: t('requirements'),
      meta: { label: t('requirements'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <span className="text-sm">
          {(row.original.requirements as Array<unknown>)?.length ?? 0}
        </span>
      ),
    },
    {
      id: 'active',
      header: t('active'),
      meta: { label: t('active'), mobileRole: 'badge' },
      cell: ({ row }) => (
        <Badge variant={row.original.active ? 'default' : 'secondary'}>
          {row.original.active ? t('active') : t('inactive')}
        </Badge>
      ),
    },
  ]

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
        toolbarStart={<div />}
        rowActions={(stage: Stage) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              tooltip={t('editStage')}
              onClick={() => setEditStage(stage)}
              disabled={isReordering || deleteStage.isPending}
            >
              <Edit className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              tooltip={t('deleteStage')}
              onClick={() => handleDelete(stage.id)}
              isLoading={deletingStageId === stage.id}
              disabled={isReordering || deleteStage.isPending}
            >
              <Trash className="size-4 text-destructive" />
            </Button>
          </div>
        )}
      />

      {editStage && (
        <StageForm
          stage={editStage}
          open={true}
          onOpenChange={() => setEditStage(undefined)}
        />
      )}
    </div>
  )
}
