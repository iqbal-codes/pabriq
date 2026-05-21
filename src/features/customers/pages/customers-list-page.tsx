import { Link } from '@tanstack/react-router'
import { Eye, Pencil, Users } from 'lucide-react'
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'
import { useTranslations } from 'use-intl'
import { AvatarPhoto } from '#/components/app/avatar-photo'
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
import { Button } from '#/components/ui/button'
import { useCustomersList } from '#/features/customers/hooks'
import type { CustomerRow } from '#/features/customers/model'
import { Route } from '#/routes/_org/customers/index'

export function CustomersListPage() {
  const ctx = Route.useRouteContext() as { org: { id: string } }
  const t = useTranslations('customers')
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

  const { data, isFetching } = useCustomersList(queryFilters)
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

  const filtersConfig = useMemo<DataTableFiltersConfig>(
    () => ({
      definitions: [
        {
          id: 'status',
          label: t('active'),
          type: 'radio-chips' as const,
          options: [
            { value: 'active', label: st('active') },
            { value: 'inactive', label: st('inactive') },
          ],
        },
      ],
      values: { status: statusFilter || null },
      onApply: handleApplyFilters,
      onClear: handleClearStructuredFilters,
    }),
    [t, st, statusFilter, handleApplyFilters, handleClearStructuredFilters],
  )

  const columns: AppColumnDef<CustomerRow>[] = [
    {
      id: 'photo',
      header: '',
      size: 48,
      enableSorting: false,
      cell: ({ row }) => (
        <AvatarPhoto
          assetId={row.original.photoAssetId}
          name={row.original.name}
        />
      ),
    },
    {
      accessorKey: 'name',
      header: t('name'),
      meta: { label: t('name'), mobileRole: 'title' },
    },
    {
      accessorKey: 'phone',
      header: t('phone'),
      meta: { label: t('phone'), mobileRole: 'meta' },
    },
    {
      accessorKey: 'email',
      header: t('email'),
      meta: { label: t('email'), mobileRole: 'meta' },
    },
    {
      accessorKey: 'active',
      header: t('active'),
      meta: { label: st('active'), mobileRole: 'badge' },
      cell: ({ row }) => (
        <StatusBadge status={row.original.active ? 'active' : 'inactive'} />
      ),
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
          label: t('createCustomer'),
          href: '/customers/new',
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
        tableId="customers"
        totalRows={totalRows}
        filters={filtersConfig}
        toolbarStart={
          <DataTableSearch
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(v) => setSearch(v || null)}
          />
        }
        emptyIcon={Users}
        emptyTitle={t('noCustomers')}
        emptyDescription={t('noCustomersDesc')}
        emptyAction={{ label: t('createCustomer'), href: '/customers/new' }}
        noResultsTitle={t('noResults')}
        noResultsDescription={t('noCustomersDesc')}
        noResultsAction={{ label: t('createCustomer'), href: '/customers/new' }}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearAllFilters}
        rowActions={(row: CustomerRow) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              asChild
              tooltip={t('viewCustomer')}
            >
              <Link to="/customers/$id" params={{ id: row.id }}>
                <Eye className="size-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              asChild
              tooltip={t('editCustomer')}
            >
              <Link to="/customers/$id/edit" params={{ id: row.id }}>
                <Pencil className="size-4" />
              </Link>
            </Button>
          </div>
        )}
      />
    </PageContent>
  )
}
