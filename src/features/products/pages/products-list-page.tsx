import { Link, useRouteContext } from '@tanstack/react-router'
import { Package, Pencil, Trash2 } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
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
import { ConfirmDialog } from '#/components/confirm-dialog'
import { StatusBadge } from '#/components/status-badge'
import { Button } from '#/components/ui/button'
import { useDeleteProduct, useProductsList } from '#/features/products/hooks'
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

  const { data, isFetching } = useProductsList(queryFilters)
  const rows = data?.rows ?? []
  const totalRows = data?.totalRows ?? 0
  const deleteProduct = useDeleteProduct()
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null)

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

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    const result = await deleteProduct.mutateAsync(deleteTarget.id)
    if (result.ok) {
      toast.success(t('deleted'))
      setDeleteTarget(null)
      return
    }
    toast.error(result.error)
  }, [deleteProduct, deleteTarget, t])

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
              tooltip={t('editProduct')}
            >
              <Link to="/products/$id" params={{ id: row.id }}>
                <Pencil className="size-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              tooltip={t('deleteProduct')}
              onClick={() => setDeleteTarget(row)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('deleteProduct')}
        description={t('deleteConfirm')}
        confirmLabel={t('deleteProduct')}
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </PageContent>
  )
}
