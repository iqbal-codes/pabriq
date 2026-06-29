import type {
  AppColumnDef,
  DataTableFiltersConfig,
} from '#/components/app/data-table'
import { StatusBadge } from '#/components/status-badge'
import { Badge } from '#/components/ui/badge'
import type { OrderRow } from '#/features/orders/model'

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

export type TranslationFn = (
  key: string,
  values?: Record<string, unknown>,
) => string

export function getOrderColumns(t: TranslationFn): AppColumnDef<OrderRow>[] {
  return [
    {
      accessorKey: 'orderNumber',
      header: t('orderNumber'),
      meta: { label: t('orderNumber'), mobileRole: 'title' },
    },
    {
      accessorKey: 'customerName',
      header: t('customer'),
      meta: { label: t('customer'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <span>{row.original.customerName ?? t('guestCustomer')}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: t('status'),
      meta: { label: t('status'), mobileRole: 'badge' },
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'total',
      header: t('total'),
      meta: { label: t('total'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <span>{currencyFormatter.format(row.original.total)}</span>
      ),
    },
    {
      accessorKey: 'paymentStatus',
      header: t('paymentStatus'),
      meta: { label: t('paymentStatus'), mobileRole: 'meta' },
      cell: ({ row }) => {
        const status = row.original.paymentStatus
        if (status === 'no_invoice')
          return <span className="text-muted-foreground">—</span>
        return (
          <Badge
            variant={
              status === 'paid'
                ? 'success'
                : status === 'unpaid'
                  ? 'warning'
                  : status === 'partially_paid'
                    ? 'outline'
                    : 'secondary'
            }
          >
            {t(
              status === 'no_invoice'
                ? 'paymentNoInvoice'
                : status === 'paid'
                  ? 'paymentPaid'
                  : status === 'unpaid'
                    ? 'paymentUnpaid'
                    : status === 'partially_paid'
                      ? 'paymentPartiallyPaid'
                      : 'paymentVoid',
            )}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'dueDate',
      header: t('dueDate'),
      meta: { label: t('dueDate'), mobileRole: 'meta' },
      cell: ({ row }) => {
        const date = row.original.dueDate
        if (!date) return <span className="text-muted-foreground">—</span>
        return (
          <span>
            {new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )
      },
    },
    {
      accessorKey: 'maxDeadline',
      header: t('deadline'),
      meta: { label: t('deadline'), mobileRole: 'meta' },
      cell: ({ row }) => {
        const date = row.original.maxDeadline
        if (!date) return <span className="text-muted-foreground">—</span>
        const deadline = new Date(date)
        const now = new Date()
        const isOverdue = deadline < now
        return (
          <span className={isOverdue ? 'text-destructive font-medium' : ''}>
            {deadline.toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: t('createdAt'),
      meta: { label: t('createdAt'), mobileRole: 'meta' },
      cell: ({ row }) => {
        const date = row.original.createdAt
        if (!date) return <span className="text-muted-foreground">—</span>
        return (
          <span>
            {new Date(date).toLocaleString('id-ID', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )
      },
    },
  ]
}

export function getOrderStatusOptions(st: TranslationFn) {
  return [
    { value: 'draft', label: st('draft') },
    { value: 'pending', label: st('pending') },
    { value: 'approved', label: st('approved') },
    { value: 'in_progress', label: st('in_progress') },
    { value: 'production', label: st('production') },
    { value: 'in_delivery', label: st('in_delivery') },
    { value: 'completed', label: st('completed') },
    { value: 'cancelled', label: st('cancelled') },
    { value: 'rejected', label: st('rejected') },
  ]
}

export function getOrderFiltersConfig({
  t,
  statusFilter,
  statusOptions,
  onApply,
  onClear,
}: {
  t: TranslationFn
  statusFilter: string
  statusOptions: Array<{ value: string; label: string }>
  onApply: (values: Record<string, unknown>) => void
  onClear: () => void
}): DataTableFiltersConfig {
  return {
    definitions: [
      {
        id: 'status',
        label: t('status'),
        type: 'radio-chips' as const,
        options: statusOptions,
      },
    ],
    values: { status: statusFilter || null },
    onApply,
    onClear,
  }
}
