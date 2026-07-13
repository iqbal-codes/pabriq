import { ArrowDown, ArrowUp, Edit, Trash } from 'lucide-react'
import { useTranslations } from 'use-intl'
import type { AppColumnDef } from '#/components/app/data-table'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import type { Stage } from '../model'

export function useStageColumns({
  stages,
  isReordering,
  isDeletingId,
  onMoveUp,
  onMoveDown,
}: {
  stages: Stage[]
  isReordering: boolean
  isDeletingId: string | null
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}): AppColumnDef<Stage>[] {
  const t = useTranslations('production')

  return [
    {
      id: 'reorder',
      header: t('reorder'),
      enableSorting: false,
      meta: { label: t('reorder'), mobileRole: 'actions' },
      cell: ({ row }) => (
        <StageReorderActions
          isFirst={row.index === 0}
          isLast={row.index === stages.length - 1}
          isReordering={isReordering}
          isDeleting={isDeletingId === row.original.id}
          onMoveUp={() => onMoveUp(row.index)}
          onMoveDown={() => onMoveDown(row.index)}
        />
      ),
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
      meta: { label: t('active'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <Badge variant={row.original.active ? 'default' : 'secondary'}>
          {row.original.active ? t('active') : t('inactive')}
        </Badge>
      ),
    },
  ]
}

function StageReorderActions({
  isFirst,
  isLast,
  isReordering,
  isDeleting,
  onMoveUp,
  onMoveDown,
}: {
  isFirst: boolean
  isLast: boolean
  isReordering: boolean
  isDeleting: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMoveUp}
        isLoading={isReordering}
        disabled={isReordering || isDeleting || isFirst}
      >
        <ArrowUp className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onMoveDown}
        isLoading={isReordering}
        disabled={isReordering || isDeleting || isLast}
      >
        <ArrowDown className="size-4" />
      </Button>
    </div>
  )
}

export function StageRowActions({
  isReordering,
  isDeleting,
  onEdit,
  onDelete,
}: {
  isReordering: boolean
  isDeleting: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const t = useTranslations('production')
  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="icon"
        tooltip={t('editStage')}
        onClick={onEdit}
        disabled={isReordering || isDeleting}
      >
        <Edit className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        tooltip={t('deleteStage')}
        onClick={onDelete}
        isLoading={isDeleting}
        disabled={isReordering || isDeleting}
      >
        <Trash className="size-4 text-destructive" />
      </Button>
    </div>
  )
}
