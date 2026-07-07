import { useNavigate, useRouteContext } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'
import { useTranslations } from 'use-intl'
import {
  createDataTableLabels,
  DataTable,
  DataTableSearch,
  useListPageState,
} from '#/components/app/data-table'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import {
  OrderFormSheet,
  type OrderFormSheetMode,
} from '#/features/orders/components/order-form-sheet'
import { OrderRowActions } from '#/features/orders/components/order-table-actions'
import {
  getOrderColumns,
  getOrderFiltersConfig,
  getOrderStatusOptions,
  type TranslationFn,
} from '#/features/orders/components/order-table-columns'
import { useOrdersList } from '#/features/orders/hooks'

export function OrdersListPage({ sheet }: { sheet?: OrderFormSheetMode } = {}) {
  const navigate = useNavigate()
  const ctx = useRouteContext({ from: '/_org' }) as {
    org: { id: string }
  }
  const t = useTranslations('orders')
  const dt = useTranslations('dataTable')

  const {
    search,
    setSearch,
    page,
    setPage,
    perPage,
    sort,
    handleSortChange,
    handlePerPageChange,
    resetPage,
  } = useListPageState()
  const [statusFilter, setStatusFilter] = useQueryState(
    'status',
    parseAsString.withDefault(''),
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

  const { data, error, isFetching, isLoading, refetch } =
    useOrdersList(queryFilters)
  const rows = data?.rows ?? []
  const totalRows = data?.totalRows ?? 0

  const handleApplyFilters = useCallback(
    (values: Record<string, unknown>) => {
      setStatusFilter((values.status as string) || null)
      resetPage()
    },
    [setStatusFilter, resetPage],
  )

  const handleClearStructuredFilters = useCallback(() => {
    setStatusFilter(null)
    resetPage()
  }, [setStatusFilter, resetPage])

  const handleClearAllFilters = useCallback(() => {
    setSearch(null)
    setStatusFilter(null)
    resetPage()
  }, [setSearch, setStatusFilter, resetPage])

  const statusOptions = useMemo(
    () => getOrderStatusOptions(t as TranslationFn),
    [t],
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
  const labels = useMemo(() => createDataTableLabels(dt as TranslationFn), [dt])

  const hasActiveFilters = !!(search || statusFilter)

  return (
    <PageContent>
      <PageHeader
        title={t('title')}
        description={t('listDescription')}
        primaryAction={{
          label: t('createOrder'),
          href: '/orders/new',
        }}
      />
      <DataTable
        columns={columns}
        data={rows}
        error={error ? t('loadOrdersFailed') : null}
        errorMessage={error ? t('loadOrdersFailedDesc') : undefined}
        getRowId={(row) => row.id}
        isRefetching={isFetching && !isLoading}
        isLoading={isLoading}
        onRefetch={() => void refetch()}
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
      {sheet && (
        <OrderFormSheet
          mode={sheet}
          orgId={ctx.org.id}
          open={Boolean(sheet)}
          onOpenChange={(open) => {
            if (!open) navigate({ to: '/orders' })
          }}
          onSaved={(orderId) => {
            if (orderId) {
              navigate({ to: '/orders/$id', params: { id: orderId } })
            } else {
              navigate({ to: '/orders' })
            }
          }}
        />
      )}
    </PageContent>
  )
}
