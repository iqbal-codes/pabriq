import { Link, useRouteContext } from '@tanstack/react-router'
import { Eye, Pencil, Users } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'
import { useTranslations } from 'use-intl'
import { AvatarPhoto } from '#/components/app/avatar-photo'
import type {
  AppColumnDef,
  DataTableFiltersConfig,
} from '#/components/app/data-table'
import {
  createDataTableLabels,
  DataTable,
  DataTableSearch,
  useListPageState,
} from '#/components/app/data-table'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { StatusBadge } from '#/components/status-badge'
import { Button } from '#/components/ui/button'
import { useCustomersList } from '#/features/customers/hooks'
import type { CustomerRow } from '#/features/customers/model'

export function CustomersListPage() {
  const ctx = useRouteContext({ from: '/_org/customers/' }) as {
    org: { id: string }
  }
  const t = useTranslations('customers')
  const dt = useTranslations('dataTable')
  const st = useTranslations('status')

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

  const { data, isFetching } = useCustomersList(queryFilters)
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
      enableSorting: false,
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

  const labels = useMemo(
    () =>
      createDataTableLabels(
        dt as (key: string, values?: Record<string, number>) => string,
      ),
    [dt],
  )

  const hasActiveFilters = !!(search || statusFilter)

  return (
    <PageContent>
      <PageHeader
        title={t('title')}
        description={t('listDescription')}
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
