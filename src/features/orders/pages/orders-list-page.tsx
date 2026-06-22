import { Link, useRouteContext } from '@tanstack/react-router'
import { Eye, Link2, Pencil, ShoppingCart } from 'lucide-react'
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import type {
  AppColumnDef,
  DataTableFiltersConfig,
  DataTableLabels,
  SortState,
} from '#/components/app/data-table'
import {
  DataTable,
  DataTableSearch,
  decodeSort,
  encodeSort,
} from '#/components/app/data-table'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { StatusBadge } from '#/components/status-badge'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { useOrdersList } from '#/features/orders/hooks'
import type { OrderRow } from '#/features/orders/model'
import { generateOrderTokenFn } from '#/features/portal/server'

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

export function OrdersListPage() {
  const ctx = useRouteContext({ from: '/_org/orders/' }) as {
    org: { id: string }
  }
  const t = useTranslations('orders')
  const dt = useTranslations('dataTable')
  const st = useTranslations('status')

  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''))
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [perPage, setPerPage] = useQueryState(
    'perPage',
    parseAsInteger.withDefault(25),
  )
  const [sortEncoded, setSortEncoded] = useQueryState(
    'sort',
    parseAsString.withDefault(''),
  )
  const [statusFilter, setStatusFilter] = useQueryState(
    'status',
    parseAsString.withDefault(''),
  )

  const sort = useMemo<SortState | null>(
    () => (sortEncoded ? decodeSort(sortEncoded) : null),
    [sortEncoded],
  )

  const queryFilters = useMemo(
    () => ({
      orgId: ctx.org.id,
      search: search || undefined,
      status: statusFilter || undefined,
      sort,
      page,
      perPage,
    }),
    [ctx.org.id, search, statusFilter, sort, page, perPage],
  )

  const { data, isFetching } = useOrdersList(queryFilters)
  const rows = data?.rows ?? []
  const totalRows = data?.totalRows ?? 0

  const handleSortChange = useCallback(
    (newSort: SortState | null) => {
      setSortEncoded(
        newSort ? encodeSort(newSort.field, newSort.direction) : null,
      )
      setPage(1)
    },
    [setSortEncoded, setPage],
  )

  const handlePerPageChange = useCallback(
    (pp: number) => {
      setPerPage(pp)
      setPage(1)
    },
    [setPerPage, setPage],
  )

  const handleApplyFilters = useCallback(
    (values: Record<string, unknown>) => {
      setStatusFilter((values.status as string) || null)
      setPage(1)
    },
    [setStatusFilter, setPage],
  )

  const handleClearStructuredFilters = useCallback(() => {
    setStatusFilter(null)
    setPage(1)
  }, [setStatusFilter, setPage])

  const handleClearAllFilters = useCallback(() => {
    setSearch(null)
    setStatusFilter(null)
    setPage(1)
  }, [setSearch, setStatusFilter, setPage])

  const statusOptions = useMemo(
    () => [
      { value: 'draft', label: st('draft') },
      { value: 'pending', label: st('pending') },
      { value: 'approved', label: st('approved') },
      { value: 'in_progress', label: st('in_progress') },
      { value: 'production', label: st('production') },
      { value: 'in_delivery', label: st('in_delivery') },
      { value: 'completed', label: st('completed') },
      { value: 'cancelled', label: st('cancelled') },
      { value: 'rejected', label: st('rejected') },
    ],
    [st],
  )

  const filtersConfig = useMemo<DataTableFiltersConfig>(
    () => ({
      definitions: [
        {
          id: 'status',
          label: t('status'),
          type: 'radio-chips' as const,
          options: statusOptions,
        },
      ],
      values: { status: statusFilter || null },
      onApply: handleApplyFilters,
      onClear: handleClearStructuredFilters,
    }),
    [
      t,
      statusFilter,
      statusOptions,
      handleApplyFilters,
      handleClearStructuredFilters,
    ],
  )

  const columns: AppColumnDef<OrderRow>[] = [
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
    filters: dt('filters'),
    applyFilters: dt('applyFilters'),
    cancelFilters: dt('cancelFilters'),
    activeFilters: dt('activeFilters'),
  }

  const hasActiveFilters = !!(search || statusFilter)

  return (
    <PageContent>
      <PageHeader
        title={t('title')}
        primaryAction={{
          label: t('createOrder'),
          href: '/orders/new',
        }}
      />
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        isRefetching={isFetching}
        isLoading={rows.length === 0 && isFetching}
        enableRowSelection
        labels={labels}
        onPageChange={setPage}
        onPerPageChange={handlePerPageChange}
        onSortChange={handleSortChange}
        sort={sort}
        page={page}
        perPage={perPage}
        tableId="orders"
        totalRows={totalRows}
        filters={filtersConfig}
        toolbarStart={
          <DataTableSearch
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(v) => setSearch(v || null)}
          />
        }
        emptyIcon={ShoppingCart}
        emptyTitle={t('noOrders')}
        emptyDescription={t('noOrdersDesc')}
        emptyAction={{ label: t('createOrder'), href: '/orders/new' }}
        noResultsTitle={t('noResults')}
        noResultsDescription={t('noOrdersDesc')}
        noResultsAction={{ label: t('createOrder'), href: '/orders/new' }}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearAllFilters}
        rowActions={(row: OrderRow) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              asChild
              tooltip={t('viewOrder')}
            >
              <Link to="/orders/$id" params={{ id: row.id }}>
                <Eye className="size-4" />
              </Link>
            </Button>
            {row.status === 'draft' && (
              <Button
                variant="ghost"
                size="icon-sm"
                asChild
                tooltip={t('editOrder')}
              >
                <Link to="/orders/$id/edit" params={{ id: row.id }}>
                  <Pencil className="size-4" />
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              tooltip={t('copyOrderLink')}
              onClick={async () => {
                let token = row.orderToken
                if (!token) {
                  const result = await generateOrderTokenFn({
                    data: { orderId: row.id },
                  })
                  if (!('token' in result)) {
                    toast.error('Failed to generate link')
                    return
                  }
                  token = result.token
                }
                const url = `${window.location.origin}/order/${token}`
                await navigator.clipboard.writeText(url)
                toast.success(t('orderLinkCopied'))
              }}
            >
              <Link2 className="size-4" />
            </Button>
          </div>
        )}
      />
    </PageContent>
  )
}
