import { useRouteContext } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'
import { useTranslations } from 'use-intl'
import type { SortState } from '#/components/app/data-table'
import {
  DataTable,
  DataTableSearch,
  decodeSort,
  encodeSort,
} from '#/components/app/data-table'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { OrderRowActions } from '#/features/orders/components/order-table-actions'
import {
  getOrderColumns,
  getOrderFiltersConfig,
  getOrderLabels,
  getOrderStatusOptions,
  type TranslationFn,
} from '#/features/orders/components/order-table-columns'
import { useOrdersList } from '#/features/orders/hooks'

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
    () => getOrderStatusOptions(st as TranslationFn),
    [st],
  )

  const filtersConfig = useMemo(
    () =>
      getOrderFiltersConfig({
        t: t as TranslationFn,
        statusFilter,
        statusOptions,
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

  const columns = useMemo(() => getOrderColumns(t as TranslationFn), [t])
  const labels = useMemo(() => getOrderLabels(dt as TranslationFn), [dt])

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
        rowActions={(row) => <OrderRowActions row={row} />}
      />
    </PageContent>
  )
}
