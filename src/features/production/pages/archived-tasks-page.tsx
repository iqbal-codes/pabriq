import { Archive } from 'lucide-react'
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'
import { useTranslations } from 'use-intl'
import type { AppColumnDef, DataTableLabels } from '#/components/app/data-table'
import { DataTable, DataTableSearch } from '#/components/app/data-table'
import { PageContent } from '#/components/app/page-shell/page-content'
import { useArchivedTasks } from '../hooks'
import type { ArchivedTaskRow } from '../model'

type Props = {
  orgId: string
  board?: string
}

export function ArchivedTasksPage({ orgId, board = 'pre_production' }: Props) {
  const t = useTranslations('production')
  const dt = useTranslations('dataTable')

  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''))
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [perPage, setPerPage] = useQueryState(
    'perPage',
    parseAsInteger.withDefault(25),
  )

  const queryFilters = useMemo(
    () => ({
      orgId,
      board,
      search: search || undefined,
      page,
      perPage,
    }),
    [orgId, board, search, page, perPage],
  )

  const { data, isFetching } = useArchivedTasks(queryFilters)
  const rows = data?.rows ?? []
  const totalRows = data?.totalRows ?? 0

  const handlePerPageChange = useCallback(
    (pp: number) => {
      setPerPage(pp)
      setPage(1)
    },
    [setPerPage, setPage],
  )

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
          {new Intl.DateTimeFormat('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(row.original.archivedAt))}
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
