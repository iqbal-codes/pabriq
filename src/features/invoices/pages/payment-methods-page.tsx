import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import type { DataTableLabels } from '#/components/app/data-table'
import { DataTable } from '#/components/app/data-table'
import { PageHeader } from '#/components/app/page-shell/page-header'
import {
  PaymentMethodRowActions,
  usePaymentMethodColumns,
} from '#/features/invoices/components/payment-method-columns'
import { PaymentMethodDeleteDialog } from '#/features/invoices/components/payment-method-delete-dialog'
import { PaymentMethodFormDialog } from '#/features/invoices/components/payment-method-form-dialog'
import {
  useDeletePaymentMethod,
  usePaymentMethods,
} from '#/features/invoices/hooks'
import type { PaymentMethod } from '#/features/invoices/model'

export function PaymentMethodsPage() {
  const t = useTranslations('settings')
  const dt = useTranslations('dataTable')

  const { data: methods, isLoading } = usePaymentMethods()
  const deletePaymentMethod = useDeletePaymentMethod()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null)

  function openEdit(method: PaymentMethod) {
    setEditingMethod(method)
    setDialogOpen(true)
  }

  function openCreate() {
    setEditingMethod(null)
    setDialogOpen(true)
  }

  const columns = usePaymentMethodColumns()

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

  const methodList = methods ?? []

  return (
    <>
      <PageHeader
        title={t('paymentMethods')}
        primaryAction={{
          label: t('addPaymentMethod'),
          onClick: openCreate,
        }}
      />

      <DataTable
        columns={columns}
        data={methodList}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        labels={labels}
        onPageChange={() => {}}
        onPerPageChange={() => {}}
        page={1}
        perPage={methodList.length || 1}
        tableId="payment-methods"
        totalRows={methodList.length}
        emptyTitle={t('noPaymentMethods')}
        emptyDescription={t('noPaymentMethodsDesc')}
        noResultsTitle={t('noPaymentMethods')}
        hasActiveFilters={false}
        rowActions={(method: PaymentMethod) => (
          <PaymentMethodRowActions
            onEdit={() => openEdit(method)}
            onDelete={() => setDeleteTarget(method)}
          />
        )}
      />

      <PaymentMethodFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingMethod={editingMethod}
        onSaved={() => {}}
      />

      <PaymentMethodDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        isDeleting={deletePaymentMethod.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return
          const result = await deletePaymentMethod.mutateAsync(deleteTarget.id)
          if (result.ok) {
            setDeleteTarget(null)
          } else {
            toast.error(result.error ?? t('deletePaymentMethod'))
          }
        }}
      />
    </>
  )
}
