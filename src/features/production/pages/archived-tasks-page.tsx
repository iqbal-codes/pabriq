import { useCallback, useMemo } from 'react'
import { useTranslations } from 'use-intl'
import { Archive } from 'lucide-react'
import type { AppColumnDef, DataTableLabels } from '#/components/app/data-table'
import {
  DataTable,
  DataTableSearch,
  useListPageState,
} from '#/components/app/data-table'
import { PageContent } from '#/components/app/page-shell/page-content'
import { useArchivedTasks } from '../hooks'
import type { ArchivedTaskRow } from '../model'

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

type Props = {
  orgId: string
}

export function ArchivedTasksPage({ orgId }: Props) {
  const t = useTranslations('production')
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
  } = useListPageState()

  const queryFilters = useMemo(
    () => ({
      orgId,
      search: search || undefined,
      sort,
      page,
      perPage,
    }),
    [orgId, search, sort, page, perPage],
  )

  const { data, isFetching } = useArchivedTasks(queryFilters)
  const rows = data?.rows ?? []
  const totalRows = data?.totalRows ?? 0

  const handleClearAllFilters = useCallback(() => {
    setSearch(null)
    setPage(1)
  }, [setSearch, setPage])

  const columns: AppColumnDef<ArchivedTaskRow>[] = [
    {
      accessorKey: 'taskNumber',
      header: t('archivedTaskNumber'),
      meta: { label: t('archivedTaskNumber'), mobileRole: 'title' },
    },
    {
      accessorKey: 'orderNumber',
      header: t('archivedOrder'),
      meta: { label: t('archivedOrder'), mobileRole: 'meta' },
    },
    {
      accessorKey: 'productName',
      header: t('archivedProduct'),
      meta: { label: t('archivedProduct'), mobileRole: 'meta' },
    },
    {
      accessorKey: 'customerName',
      header: t('archivedCustomer'),
      meta: { label: t('archivedCustomer'), mobileRole: 'meta' },
    },
    {
      accessorKey: 'archivedAt',
      header: t('archivedDate'),
      meta: { label: t('archivedDate'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <span>
          {dateTimeFormatter.format(new Date(row.original.archivedAt))}
        </span>
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
    filters: dt('filters'),
    applyFilters: dt('applyFilters'),
    cancelFilters: dt('cancelFilters'),
    activeFilters: dt('activeFilters'),
  }

  const hasActiveFilters = !!search

  return (
    <PageContent className="px-4! pt-0!">
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        isRefetching={isFetching}
        isLoading={rows.length === 0 && isFetching}
        labels={labels}
        onPageChange={setPage}
        onPerPageChange={handlePerPageChange}
        page={page}
        perPage={perPage}
        tableId="archived-tasks"
        totalRows={totalRows}
        sort={sort}
        onSortChange={handleSortChange}
        toolbarStart={
          <DataTableSearch
            placeholder={t('tabArchive')}
            value={search}
            onChange={(v) => setSearch(v || null)}
          />
        }
        emptyIcon={Archive}
        emptyTitle={t('archivedEmpty')}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearAllFilters}
      />
    </PageContent>
  )
}
