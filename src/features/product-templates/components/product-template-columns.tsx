import { Archive, Copy, Edit, Trash2 } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import type { AppColumnDef } from '#/components/app/data-table'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import type { ProductTemplate } from '../model'

export function useProductTemplateColumns(): AppColumnDef<ProductTemplate>[] {
  const t = useTranslations('productTemplates')
  const st = useTranslations('status')
  const locale = useLocale()

  return [
    {
      accessorKey: 'name',
      header: t('name'),
      meta: { label: t('name'), mobileRole: 'title' },
    },
    {
      accessorKey: 'category',
      header: t('category'),
      meta: { label: t('category'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.category ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: t('status'),
      meta: { label: t('status'), mobileRole: 'badge' },
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'active' ? 'success' : 'secondary'}
        >
          {row.original.status === 'active'
            ? st('active')
            : t('statusArchived')}
        </Badge>
      ),
    },
    {
      id: 'fields',
      header: t('fieldsCount'),
      meta: { label: t('fieldsCount'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.configuration.fields.length}
        </span>
      ),
    },
    {
      id: 'provenance',
      header: t('provenance.title'),
      meta: { label: t('provenance.title'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <Badge
          variant={row.original.businessTemplateId ? 'secondary' : 'default'}
        >
          {row.original.businessTemplateId
            ? t('provenance.derivedFrom')
            : t('provenance.noSource')}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: t('createdAt'),
      meta: { label: t('createdAt'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleString(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
  ]
}

export function ProductTemplateRowActions({
  template,
  isBusy,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  template: ProductTemplate
  isBusy: boolean
  onEdit: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const t = useTranslations('productTemplates')
  const isArchived = template.status === 'archived'

  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="icon"
        tooltip={t('edit')}
        onClick={onEdit}
        disabled={isBusy}
      >
        <Edit className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        tooltip={t('duplicate')}
        onClick={onDuplicate}
        disabled={isBusy}
      >
        <Copy className="size-4" />
      </Button>
      {isArchived ? (
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive"
          tooltip={t('delete')}
          onClick={onDelete}
          disabled={isBusy}
        >
          <Trash2 className="size-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          tooltip={t('archive')}
          onClick={onArchive}
          disabled={isBusy}
        >
          <Archive className="size-4" />
        </Button>
      )}
    </div>
  )
}
