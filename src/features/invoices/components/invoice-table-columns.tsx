import type {
  AppColumnDef,
  DataTableFiltersConfig,
} from '#/components/app/data-table'
import { StatusBadge } from '#/components/status-badge'
import type { InvoiceRow } from '#/features/invoices/model'

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

export type TranslationFn = (
  key: string,
  values?: Record<string, unknown>,
) => string

export function getInvoiceColumns(
  t: TranslationFn,
): AppColumnDef<InvoiceRow>[] {
  return [
    {
      accessorKey: 'invoiceNumber',
      header: t('invoiceNumber'),
      meta: { label: t('invoiceNumber'), mobileRole: 'title' },
    },
    {
      accessorKey: 'customerName',
      header: t('customer'),
      meta: { label: t('customer'), mobileRole: 'subtitle' },
    },
    {
      accessorKey: 'total',
      header: t('total'),
      meta: { label: t('total'), mobileRole: 'meta', align: 'end' },
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">
          {currencyFormatter.format(row.original.total)}
        </span>
      ),
    },
    {
      accessorKey: 'dueDate',
      header: t('dueDate'),
      meta: { label: t('dueDate'), mobileRole: 'meta' },
      cell: ({ row }) => <span>{row.original.dueDate}</span>,
    },
    {
      accessorKey: 'status',
      header: t('status'),
      meta: { label: t('status'), mobileRole: 'badge' },
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'createdAt',
      header: t('createdAt'),
      meta: { label: t('createdAt'), mobileRole: 'hidden' },
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

export function getInvoiceStatusOptions(st: TranslationFn) {
  return [
    { value: 'unpaid', label: st('unpaid') },
    { value: 'partially_paid', label: st('partially_paid') },
    { value: 'paid', label: st('paid') },
    { value: 'void', label: st('void') },
  ]
}

export function getInvoiceFiltersConfig({
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
