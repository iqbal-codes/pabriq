import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import type { AppColumnDef, DataTableLabels } from '#/components/app/data-table'
import { DataTable } from '#/components/app/data-table'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { StatusBadge } from '#/components/status-badge'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { PaymentMethodDeleteDialog } from '#/features/invoices/components/payment-method-delete-dialog'
import { PaymentMethodFormDialog } from '#/features/invoices/components/payment-method-form-dialog'
import {
  useDeletePaymentMethod,
  usePaymentMethods,
} from '#/features/invoices/hooks'
import type { PaymentMethod } from '#/features/invoices/model'

const TYPE_LABEL_KEYS: Record<string, 'bankTransfer' | 'paymentGateway'> = {
  bank_transfer: 'bankTransfer',
  payment_gateway: 'paymentGateway',
}

export function PaymentMethodsPage() {
  const t = useTranslations('settings')
  const ct = useTranslations('common')
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

  const columns: AppColumnDef<PaymentMethod>[] = [
    {
      id: 'type',
      header: ct('type'),
      meta: { label: ct('type'), mobileRole: 'badge' },
      cell: ({ row }) => {
        const labelKey = TYPE_LABEL_KEYS[row.original.type] ?? row.original.type
        return <Badge variant="secondary">{t(labelKey)}</Badge>
      },
    },
    {
      id: 'bankName',
      header: t('bankName'),
      meta: { label: t('bankName'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.bankName ?? '—'}
        </span>
      ),
    },
    {
      id: 'account',
      header: t('accountNumber'),
      meta: { label: t('accountNumber'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.accountNumber
            ? `${row.original.accountNumber}${row.original.accountHolder ? ` (${row.original.accountHolder})` : ''}`
            : '—'}
        </span>
      ),
    },
    {
      id: 'isDefault',
      header: t('defaultPayment'),
      meta: { label: t('defaultPayment'), mobileRole: 'badge' },
      cell: ({ row }) =>
        row.original.isDefault ? <Badge>{t('defaultPayment')}</Badge> : null,
    },
    {
      id: 'active',
      header: ct('status'),
      meta: { label: ct('status'), mobileRole: 'badge' },
      cell: ({ row }) => (
        <StatusBadge status={row.original.active ? 'active' : 'inactive'} />
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
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              tooltip={t('editPaymentMethod')}
              onClick={() => openEdit(method)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              tooltip={t('deletePaymentMethod')}
              onClick={() => setDeleteTarget(method)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
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
