import { createFileRoute } from '@tanstack/react-router'
import { Package } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import type { AppColumnDef, DataTableLabels } from '#/components/app/data-table'
import { DataTable, DataTableSearch } from '#/components/app/data-table'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Badge } from '#/components/ui/badge'
import { useProductsList } from '#/features/products/hooks'
import type { ProductRow } from '#/features/products/server'

type ProductSearch = { q?: string }

export const Route = createFileRoute('/_org/products/')({
  validateSearch: (search: Record<string, unknown>): ProductSearch => ({
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
  beforeLoad: () => ({
    breadcrumb: 'products',
    pageTitle: 'products',
    primaryAction: { label: 'createProduct', href: '/products/new' },
  }),
  component: ProductsList,
})

function ProductsList() {
  const ctx = Route.useRouteContext() as { org: { id: string } }
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''))
  const { data, isFetching } = useProductsList({
    orgId: ctx.org.id,
    search,
  })
  const rows = data?.rows ?? []
  const totalRows = data?.totalRows ?? 0
  const t = useTranslations('products')
  const dt = useTranslations('dataTable')
  const st = useTranslations('status')

  const columns: AppColumnDef<ProductRow>[] = [
    {
      accessorKey: 'primaryImageAssetId',
      header: t('noPhoto'),
      meta: { label: t('noPhoto'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <AssetImage
          assetId={row.original.primaryImageAssetId}
          assetKind="image"
        />
      ),
    },
    {
      accessorKey: 'name',
      header: t('name'),
      meta: { label: t('name'), mobileRole: 'title' },
    },
    {
      accessorKey: 'description',
      header: t('description'),
      meta: { label: t('description'), mobileRole: 'meta' },
      cell: ({ row }) => row.original.description ?? '—',
    },
    {
      accessorKey: 'basePrice',
      header: t('basePrice'),
      meta: { label: t('basePrice'), mobileRole: 'meta' },
      cell: ({ row }) => {
        const { basePrice, minDiscountPrice } = row.original
        if (minDiscountPrice != null) {
          const fmt = (n: number) =>
            new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
            }).format(n)
          return `${fmt(minDiscountPrice)} ~ ${fmt(basePrice)}`
        }
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
        }).format(basePrice)
      },
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
          label: t('createProduct'),
          href: '/products/new',
        }}
      />
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        isRefetching={isFetching}
        isLoading={rows.length === 0 && isFetching}
        labels={labels}
        onPageChange={() => {}}
        onPerPageChange={() => {}}
        page={1}
        perPage={25}
        tableId="products"
        totalRows={totalRows}
        toolbarStart={
          <DataTableSearch
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(v) => setSearch(v || null)}
          />
        }
        emptyIcon={Package}
        emptyTitle={t('noProducts')}
        emptyDescription={t('noProductsDesc')}
        emptyAction={{ label: t('createProduct'), href: '/products/new' }}
        noResultsTitle={t('noResults')}
        noResultsDescription={t('noProductsDesc')}
        noResultsAction={{ label: t('createProduct'), href: '/products/new' }}
        hasActiveFilters={!!search}
        onClearFilters={() => setSearch(null)}
      />
    </PageContent>
  )
}
