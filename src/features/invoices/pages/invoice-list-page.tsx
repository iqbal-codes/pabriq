import { Link, useRouteContext } from '@tanstack/react-router'
import { Eye, Printer } from 'lucide-react'
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'
import { useTranslations } from 'use-intl'
import type { AppColumnDef } from '#/components/app/data-table'
import { DataTable } from '#/components/app/data-table'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { StatusBadge } from '#/components/status-badge'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { useInvoicesList } from '#/features/invoices/hooks'
import type { InvoiceRow } from '#/features/invoices/model'

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

export function InvoiceListPage() {
  const ctx = useRouteContext({ from: '/_org/invoices/' }) as {
    org: { id: string }
  }
  const t = useTranslations('invoices')
  const dt = useTranslations('dataTable')
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
          <StatusBadge status={row.original.status} />
        ),
      },
      {
        accessorKey: 'createdAt',
        header: t('createdAt'),
        meta: { label: t('createdAt') },
        cell: ({ row }: { row: { original: InvoiceRow } }) => {
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
    ],
    [t],
  )

  return (
    <PageContent>
      <PageHeader
        title={t('title')}
        description={t('listDescription')}
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
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" asChild>
                  <a
                    href={`/api/documents/invoices/${row.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Printer className="size-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('printInvoice')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" asChild>
                  <Link to="/invoices/$id" params={{ id: row.id }}>
                    <Eye className="size-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('viewInvoice')}</TooltipContent>
            </Tooltip>
          </div>
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
