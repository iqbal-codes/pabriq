import { Link } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'
import { useTranslations } from 'use-intl'
import type { AppColumnDef } from '#/components/app/data-table'
import { DataTable } from '#/components/app/data-table'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { useInvoicesList } from '#/features/invoices/hooks'
import type { InvoiceRow } from '#/features/invoices/model'
import { Route } from '#/routes/_org/invoices/index'

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

export function InvoiceListPage() {
  const ctx = Route.useRouteContext() as { org: { id: string } }
  const t = useTranslations('invoices')
  const dt = useTranslations('dataTable')
  const st = useTranslations('status')

  const [search] = useQueryState('q', parseAsString.withDefault(''))
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [perPage, setPerPage] = useQueryState(
    'perPage',
    parseAsInteger.withDefault(25),
  )
  const [statusFilter] = useQueryState('status', parseAsString.withDefault(''))

  const queryFilters = useMemo(
    () => ({
      orgId: ctx.org.id,
      q: search || undefined,
      status: statusFilter || undefined,
      page,
      perPage,
    }),
    [ctx.org.id, search, statusFilter, page, perPage],
  )

  const { data, isFetching } = useInvoicesList(queryFilters)
  const rows = data?.rows ?? []
  const totalRows = data?.totalRows ?? 0

  const handlePerPageChange = useCallback(
    (pp: number) => {
      setPerPage(pp)
      setPage(1)
    },
    [setPerPage, setPage],
  )

  const columns = useMemo<AppColumnDef<InvoiceRow>[]>(
    () => [
      {
        accessorKey: 'invoiceNumber',
        header: t('invoiceNumber'),
        meta: { label: t('invoiceNumber'), mobileRole: 'title' },
      },
      {
        accessorKey: 'customerName',
        header: t('customer'),
        meta: { label: t('customer') },
      },
      {
        accessorKey: 'total',
        header: t('total'),
        meta: { label: t('total') },
        cell: ({ row }: { row: { original: InvoiceRow } }) => (
          <span>{currencyFormatter.format(row.original.total)}</span>
        ),
      },
      {
        accessorKey: 'dueDate',
        header: t('dueDate'),
        meta: { label: t('dueDate') },
        cell: ({ row }: { row: { original: InvoiceRow } }) => (
          <span>{row.original.dueDate}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('status'),
        meta: { label: t('status'), mobileRole: 'badge' },
        cell: ({ row }: { row: { original: InvoiceRow } }) => (
          <Badge>
            {st(
              row.original.status as
                | 'draft'
                | 'pending'
                | 'approved'
                | 'production'
                | 'in_delivery'
                | 'completed'
                | 'cancelled'
                | 'rejected'
                | 'active'
                | 'inactive'
                | 'paid'
                | 'partially_paid'
                | 'unpaid'
                | 'void'
                | 'overdue'
                | 'pendingPayment'
                | 'failed',
            )}
          </Badge>
        ),
      },
    ],
    [t, st],
  )

  return (
    <PageContent>
      <PageHeader
        title={t('title')}
        primaryAction={{
          label: t('createInvoice'),
          href: '/invoices/new',
        }}
      />
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        tableId="invoices"
        isLoading={isFetching}
        totalRows={totalRows}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={handlePerPageChange}
        rowActions={(row) => (
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to="/invoices/$id" params={{ id: row.id }}>
              <FileText className="h-4 w-4" />
            </Link>
          </Button>
        )}
        labels={{
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
          filters: dt('filters'),
          applyFilters: dt('applyFilters'),
          cancelFilters: dt('cancelFilters'),
          activeFilters: dt('activeFilters'),
        }}
      />
    </PageContent>
  )
}
