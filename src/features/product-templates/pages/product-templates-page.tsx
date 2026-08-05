import { Boxes, Download } from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { createDataTableLabels, DataTable } from '#/components/app/data-table'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { ConfirmDialog } from '#/components/confirm-dialog'
import {
  ProductTemplateRowActions,
  useProductTemplateColumns,
} from '#/features/product-templates/components/product-template-columns'
import {
  useArchiveProductTemplate,
  useBusinessTemplates,
  useDeleteProductTemplate,
  useDuplicateProductTemplate,
  useProductTemplates,
} from '#/features/product-templates/hooks'
import type { ProductTemplate } from '#/features/product-templates/model'
import { useGlobalModal } from '#/hooks/use-global-overlay'

type DeleteTarget = {
  id: string
  name: string
}

const PROTECTED_DELETE_ERROR = 'Product template is referenced by products'

export function ProductTemplatesPage() {
  const t = useTranslations('productTemplates')
  const dt = useTranslations('dataTable')
  const { data: templates, isLoading, isError, refetch } = useProductTemplates()
  const {
    data: businessTemplates,
    isLoading: businessTemplatesLoading,
    isError: businessTemplatesError,
  } = useBusinessTemplates()
  const archiveTemplate = useArchiveProductTemplate()
  const deleteTemplate = useDeleteProductTemplate()
  const duplicateTemplate = useDuplicateProductTemplate()

  const { openModal } = useGlobalModal()

  const [archiveTarget, setArchiveTarget] = useState<ProductTemplate | null>(
    null,
  )
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const templateList = templates ?? []

  const columns = useProductTemplateColumns()

  const labels = createDataTableLabels(
    dt as (key: string, values?: Record<string, number>) => string,
  )

  const handleEdit = useCallback(
    (template: ProductTemplate) => {
      void openModal('product-template-form', template.id)
    },
    [openModal],
  )

  const handleCreate = useCallback(() => {
    void openModal('product-template-form')
  }, [openModal])

  const handleDuplicate = useCallback(
    async (template: ProductTemplate) => {
      const result = await duplicateTemplate.mutateAsync({ id: template.id })
      if (result.ok) {
        toast.success(t('duplicated'))
      } else {
        toast.error(t('mutationFailed'))
      }
    },
    [duplicateTemplate, t],
  )

  const handleArchive = useCallback(
    async (template: ProductTemplate) => {
      const result = await archiveTemplate.mutateAsync(template.id)
      if (result.ok) {
        toast.success(t('archived'))
        setArchiveTarget(null)
      } else {
        toast.error(t('mutationFailed'))
      }
    },
    [archiveTemplate, t],
  )

  const handleDelete = useCallback(
    async (target: DeleteTarget) => {
      const result = await deleteTemplate.mutateAsync(target.id)
      if (result.ok) {
        toast.success(t('deleted'))
        setDeleteTarget(null)
      } else if (result.error === PROTECTED_DELETE_ERROR) {
        toast.error(t('protectedDelete.referencedByProducts'))
      } else {
        toast.error(t('mutationFailed'))
      }
    },
    [deleteTemplate, t],
  )

  const handleOpenMaterialize = useCallback(() => {
    void openModal('materialize-business-template')
  }, [openModal])

  const businessTemplatesUnavailable =
    businessTemplatesError ||
    (!businessTemplatesLoading && (businessTemplates?.length ?? 0) === 0)

  return (
    <PageContent>
      <PageHeader
        title={t('title')}
        description={t('listDescription')}
        primaryAction={{
          label: t('create'),
          onClick: handleCreate,
        }}
        secondaryActions={[
          {
            label: t('materialization.title'),
            icon: Download,
            disabled: businessTemplatesUnavailable,
            onClick: handleOpenMaterialize,
          },
        ]}
      />
      <DataTable
        columns={columns}
        data={templateList}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        error={isError ? t('loadFailed') : null}
        errorMessage={t('loadFailedDesc')}
        onRefetch={() => void refetch()}
        labels={labels}
        onPageChange={() => {}}
        onPerPageChange={() => {}}
        page={1}
        perPage={templateList.length || 1}
        tableId="product-templates"
        totalRows={templateList.length}
        emptyIcon={Boxes}
        emptyTitle={t('noTemplates')}
        emptyDescription={t('noTemplatesDesc')}
        emptyAction={{
          label: t('create'),
          onClick: handleCreate,
        }}
        noResultsTitle={t('noResults')}
        hasActiveFilters={false}
        rowActions={(template: ProductTemplate) => (
          <ProductTemplateRowActions
            template={template}
            isBusy={archiveTemplate.isPending || deleteTemplate.isPending}
            onEdit={() => handleEdit(template)}
            onDuplicate={() => void handleDuplicate(template)}
            onArchive={() => setArchiveTarget(template)}
            onDelete={() =>
              setDeleteTarget({ id: template.id, name: template.name })
            }
          />
        )}
      />

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={t('archive')}
        description={t('archiveConfirm')}
        confirmLabel={t('archive')}
        onConfirm={() => {
          if (archiveTarget) void handleArchive(archiveTarget)
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('delete')}
        description={t('deleteConfirm')}
        confirmLabel={t('delete')}
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget)
        }}
      />
    </PageContent>
  )
}
