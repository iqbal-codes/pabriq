import { createFileRoute } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import type { AppColumnDef, DataTableLabels } from '#/components/app/data-table'
import { DataTable, DataTableSearch } from '#/components/app/data-table'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Badge } from '#/components/ui/badge'
import type { CustomerRow } from '#/features/customers/model'
import { listCustomersFn } from '#/features/customers/server'

type CustomerSearch = { q?: string }

export const Route = createFileRoute('/_org/customers/')({
  validateSearch: (search: Record<string, unknown>): CustomerSearch => ({
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
  beforeLoad: () => ({
    breadcrumb: 'customers',
    pageTitle: 'customers',
    primaryAction: { label: 'createCustomer', href: '/customers/new' },
  }),
  loaderDeps: ({ search: { q } }) => ({ q }),
  loader: async ({ context, deps }) => {
    const ctx = context as { org: { id: string } }
    const result = await listCustomersFn({
      data: { orgId: ctx.org.id, search: deps.q },
    })
    return result
  },
  component: CustomersList,
})

function CustomersList() {
  const { rows, totalRows } = Route.useLoaderData()
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''))
  const t = useTranslations('customers')
  const dt = useTranslations('dataTable')
  const st = useTranslations('status')

  const columns: AppColumnDef<CustomerRow>[] = [
    {
      id: 'photo',
      header: '',
      size: 48,
      cell: ({ row }) => (
        <AssetImage
          assetId={row.original.photoAssetId}
          className="rounded-full"
        />
      ),
    },
    {
      accessorKey: 'name',
      header: t('name'),
      meta: { label: t('name'), mobileRole: 'title' },
    },
    {
      accessorKey: 'email',
      header: t('email'),
      meta: { label: t('email'), mobileRole: 'meta' },
    },
    {
      accessorKey: 'phone',
      header: t('phone'),
      meta: { label: t('phone'), mobileRole: 'meta' },
    },
    {
      accessorKey: 'active',
      header: t('active'),
      meta: { label: st('active'), mobileRole: 'badge' },
      cell: ({ row }) => (
        <Badge variant={row.original.active ? 'default' : 'secondary'}>
          {row.original.active ? st('active') : st('inactive')}
        </Badge>
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
    rowsSelected: () => '',
    visibleRows: () => '',
  }

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
        isLoading={false}
        labels={labels}
        onPageChange={() => {}}
        onPerPageChange={() => {}}
        page={1}
        perPage={25}
        tableId="customers"
        totalRows={totalRows}
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
        hasActiveFilters={!!search}
        onClearFilters={() => setSearch(null)}
      />
    </PageContent>
  )
}
