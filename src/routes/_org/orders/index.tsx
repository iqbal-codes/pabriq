import { createFileRoute } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useTranslations } from 'use-intl'
import type { AppColumnDef, DataTableLabels } from '#/components/app/data-table'
import { DataTable, DataTableSearch } from '#/components/app/data-table'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Badge } from '#/components/ui/badge'
import { useOrdersList } from '#/features/orders/hooks'
import type { OrderRow } from '#/features/orders/model'

type OrderSearch = { q?: string }

export const Route = createFileRoute('/_org/orders/')({
  validateSearch: (search: Record<string, unknown>): OrderSearch => ({
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
  beforeLoad: () => ({
    breadcrumb: 'orders',
    pageTitle: 'orders',
    primaryAction: { label: 'createOrder', href: '/orders/new' },
  }),
  component: OrdersList,
})

function OrdersList() {
  const ctx = Route.useRouteContext() as { org: { id: string } }
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''))
  const {
    data: { rows, totalRows },
  } = useOrdersList({ orgId: ctx.org.id })
  const t = useTranslations('orders')
  const dt = useTranslations('dataTable')
  const st = useTranslations('status')

  const columns: AppColumnDef<OrderRow>[] = [
    {
      accessorKey: 'customerName',
      header: t('customer'),
      meta: { label: t('customer'), mobileRole: 'title' },
    },
    {
      accessorKey: 'status',
      header: t('status'),
      meta: { label: t('status'), mobileRole: 'badge' },
      cell: ({ row }) => (
        <Badge variant="secondary">{st(row.original.status)}</Badge>
      ),
    },
    {
      accessorKey: 'total',
      header: t('total'),
      meta: { label: t('total'), mobileRole: 'meta' },
      cell: ({ row }) => <span>${row.original.total.toFixed(2)}</span>,
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
          label: t('createOrder'),
          href: '/orders/new',
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
        tableId="orders"
        totalRows={totalRows}
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
        hasActiveFilters={!!search}
        onClearFilters={() => setSearch(null)}
      />
    </PageContent>
  )
}
