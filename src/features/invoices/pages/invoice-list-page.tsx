import { useRouteContext } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
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
import { InvoiceRowActions } from '#/features/invoices/components/invoice-table-actions'
import {
  getInvoiceColumns,
  getInvoiceFiltersConfig,
  getInvoiceStatusOptions,
  type TranslationFn,
} from '#/features/invoices/components/invoice-table-columns'
import { useInvoicesList } from '#/features/invoices/hooks'

export function InvoiceListPage() {
  const ctx = useRouteContext({ from: '/_org/invoices/' }) as {
    org: { id: string }
  }
  const t = useTranslations('invoices')
  const st = useTranslations('status')
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
      q: search || undefined,
      status: statusFilter || undefined,
      sort,
      page,
      perPage,
    }),
    [ctx.org.id, search, statusFilter, sort, page, perPage],
  )

  const { data, error, isFetching, isLoading, refetch } =
    useInvoicesList(queryFilters)
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
    () => getInvoiceStatusOptions(st as TranslationFn),
    [st],
  )

  const filtersConfig = useMemo(
    () =>
      getInvoiceFiltersConfig({
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

  const columns = useMemo(() => getInvoiceColumns(t as TranslationFn), [t])
  const labels = useMemo(() => createDataTableLabels(dt as TranslationFn), [dt])

  const hasActiveFilters = !!(search || statusFilter)

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
        error={error ? t('loadInvoicesFailed') : null}
        errorMessage={error ? t('loadInvoicesFailedDesc') : undefined}
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
        tableId="invoices"
        totalRows={totalRows}
        filters={filtersConfig}
        toolbarStart={
          <DataTableSearch
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(v) => setSearch(v || null)}
          />
        }
        emptyIcon={FileText}
        emptyTitle={t('noInvoices')}
        emptyDescription={t('noInvoicesDesc')}
        emptyAction={{ label: t('createInvoice'), href: '/invoices/new' }}
        noResultsTitle={t('noResults')}
        noResultsDescription={t('noInvoicesDesc')}
        noResultsAction={{ label: t('createInvoice'), href: '/invoices/new' }}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearAllFilters}
        rowActions={(row) => <InvoiceRowActions row={row} />}
      />
    </PageContent>
  )
}
