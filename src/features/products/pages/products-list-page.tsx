import { Link, useRouteContext } from '@tanstack/react-router'
import { Eye, Package, Pencil } from 'lucide-react'
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
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
import { useProductsList } from '#/features/products/hooks'
import type { ProductRow } from '#/features/products/server'

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

function formatPrice(
  basePrice: number,
  minDiscountPrice: number | null,
): string {
  const fmt = (n: number) => currencyFormatter.format(n)
  if (minDiscountPrice != null) {
    return `${fmt(minDiscountPrice)} ~ ${fmt(basePrice)}`
  }
  return fmt(basePrice)
}

export function ProductsListPage() {
  const ctx = useRouteContext({ from: '/_org/products/' }) as {
    org: { id: string }
  }
  const t = useTranslations('products')
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

  const { data, isFetching } = useProductsList(queryFilters)
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

  const columns: AppColumnDef<ProductRow>[] = [
    {
      id: 'photo',
      header: '',
      size: 48,
      enableSorting: false,
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
      accessorKey: 'basePrice',
      header: t('price'),
      meta: { label: t('price'), mobileRole: 'meta' },
      cell: ({ row }) => {
        const { basePrice, minDiscountPrice } = row.original
        return formatPrice(basePrice, minDiscountPrice)
      },
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

  console.log({ rows })

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
        enableRowSelection
        labels={labels}
        onPageChange={setPage}
        onPerPageChange={handlePerPageChange}
        onSortChange={handleSortChange}
        sort={sort}
        page={page}
        perPage={perPage}
        tableId="products"
        totalRows={totalRows}
        filters={filtersConfig}
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
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearAllFilters}
        rowActions={(row: ProductRow) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              asChild
              tooltip={t('viewProduct')}
            >
              <Link to="/products/$id" params={{ id: row.id }}>
                <Eye className="size-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              asChild
              tooltip={t('editProduct')}
            >
              <Link to="/products/$id/edit" params={{ id: row.id }}>
                <Pencil className="size-4" />
              </Link>
            </Button>
          </div>
        )}
      />
    </PageContent>
  )
}
