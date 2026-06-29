import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import type { LucideIcon } from 'lucide-react'
import { X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { EmptyStateAction } from '#/components/app/page-shell/empty-state'
import { Button } from '#/components/ui/button'
import { useIsMobile } from '#/hooks/use-mobile'
import { DataTableProvider } from './data-table-context'
import { DataTableDesktopView } from './data-table-desktop-view'
import { DataTableFilterPanel } from './data-table-filter-panel'
import {
  DataTableActiveFilterChips,
  DataTableFilterTrigger,
} from './data-table-filter-trigger'
import { DataTableMobileView } from './data-table-mobile-view'
import {
  DataTableDesktopSkeleton,
  DataTableMobileSkeleton,
} from './data-table-skeleton'
import {
  DataTableEmptyRender,
  DataTableErrorRender,
  DataTableNoResultsRender,
} from './data-table-state-render'
import { DataTableToolbar } from './data-table-toolbar'
import type {
  AppColumnDef,
  DataTableFiltersConfig,
  DataTableLabels,
  DataTableSlotContext,
  SortState,
} from './data-table-utils'
import {
  getActiveFilterCount,
  getStoredVisibility,
  setStoredVisibility,
} from './data-table-utils'
import { useDataTableAccumulation } from './use-data-table-accumulation'
import { useDataTableColumns } from './use-data-table-columns'

type DataTableProps<TData> = {
  columns: AppColumnDef<TData>[]
  data: TData[]
  error?: string | null
  getRowId: (row: TData) => string
  isLoading?: boolean
  isRefetching?: boolean
  labels: DataTableLabels
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  onSortChange?: (sort: SortState | null) => void
  enableRowSelection?: boolean
  page: number
  perPage: number
  sort?: SortState | null
  tableId: string
  totalRows: number
  emptyState?: React.ReactNode
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: EmptyStateAction
  noResultsState?: React.ReactNode
  noResultsIcon?: LucideIcon
  noResultsTitle?: string
  noResultsDescription?: string
  noResultsAction?: EmptyStateAction
  hasActiveFilters?: boolean
  onClearFilters?: () => void
  onRowClick?: (row: TData) => void
  rowActions?: (row: TData) => React.ReactNode
  toolbarStart?: React.ReactNode
  toolbarEnd?: React.ReactNode
  selectionToolbar?: (ctx: DataTableSlotContext<TData>) => React.ReactNode
  customMobileCard?: (row: TData) => React.ReactNode
  onRefetch?: () => void
  errorMessage?: string
  filters?: DataTableFiltersConfig
}

export function DataTable<TData>({
  columns,
  data,
  error,
  getRowId,
  isLoading,
  isRefetching,
  labels,
  onPageChange,
  onPerPageChange,
  onSortChange,
  enableRowSelection,
  page,
  perPage,
  sort,
  tableId,
  totalRows,
  emptyState,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  noResultsState,
  noResultsIcon,
  noResultsTitle,
  noResultsDescription,
  noResultsAction,
  hasActiveFilters,
  onClearFilters,
  onRowClick,
  rowActions,
  toolbarStart,
  toolbarEnd,
  selectionToolbar,
  customMobileCard,
  onRefetch,
  errorMessage,
  filters,
}: DataTableProps<TData>) {
  const isMobile = useIsMobile()
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)

  const { displayData, sentinelRef } = useDataTableAccumulation(
    data,
    page,
    isMobile,
    getRowId,
    onPageChange,
    totalRows,
    perPage,
    !!isRefetching,
    !!isLoading,
  )

  const filterLabels = useMemo(
    () => ({
      filters: labels.filters ?? 'Filters',
      applyFilters: labels.applyFilters ?? 'Apply',
      cancelFilters: labels.cancelFilters ?? 'Cancel',
      clearFilters: labels.clearFilters,
      activeFilters: labels.activeFilters ?? 'Active filters',
    }),
    [labels],
  )
  const filterActiveCount = useMemo(
    () =>
      filters ? getActiveFilterCount(filters.definitions, filters.values) : 0,
    [filters],
  )

  const allColumns = useDataTableColumns({
    columns,
    rowActions,
    enableRowSelection,
    labels,
  })

  const visibilityKey = `${tableId}`

  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >(() => {
    const stored = getStoredVisibility(visibilityKey)
    const vis: Record<string, boolean> = {}
    for (const col of allColumns) {
      if ('accessorKey' in col || 'id' in col) {
        const id = 'accessorKey' in col ? col.accessorKey : col.id
        if (id && typeof id === 'string') {
          const def = col.enableHiding === false ? true : undefined
          vis[id] = stored[id] ?? def ?? true
        }
      }
    }
    return vis
  })

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  const tableData = isMobile ? displayData : data

  const table = useReactTable({
    data: tableData,
    columns: allColumns as AppColumnDef<TData>[],
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => getRowId(row),
    state: {
      columnVisibility,
      ...(enableRowSelection ? { rowSelection } : {}),
    },
    onColumnVisibilityChange: (updater) => {
      setColumnVisibility((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        setStoredVisibility(visibilityKey, next)
        return next
      })
    },
    ...(enableRowSelection
      ? {
          enableRowSelection: true,
          onRowSelectionChange: setRowSelection,
        }
      : {}),
  })

  const selectedRowIds = useMemo(
    () => table.getSelectedRowModel().rows.map((r) => r.id),
    [table],
  )

  const slotContext = useMemo<DataTableSlotContext<TData>>(
    () => ({
      clearSelection: () => table.resetRowSelection(),
      selectedRowIds,
      selectedRows: table.getSelectedRowModel().rows.map((r) => r.original),
      totalRows,
      visibleRows: isMobile ? displayData : data,
    }),
    [table, selectedRowIds, totalRows, isMobile, displayData, data],
  )

  // Reset row selection when filter/pagination/sort state changes
  const prevFilterPageRef = useRef({ hasActiveFilters, page, perPage, sort })
  useEffect(() => {
    const prev = prevFilterPageRef.current
    if (
      hasActiveFilters !== prev.hasActiveFilters ||
      page !== prev.page ||
      perPage !== prev.perPage ||
      sort !== prev.sort
    ) {
      table.resetRowSelection()
      prevFilterPageRef.current = { hasActiveFilters, page, perPage, sort }
    }
  }, [hasActiveFilters, page, perPage, sort, table])

  const hasStructuredFilters = filterActiveCount > 0
  const filterTrigger = filters ? (
    <DataTableFilterTrigger
      activeCount={filterActiveCount}
      labels={filterLabels}
      onClick={() => setIsFilterPanelOpen(true)}
    />
  ) : null
  const clearButton = hasStructuredFilters ? (
    <Button
      variant="outline"
      size="sm"
      className="hidden md:inline-flex"
      onClick={() => {
        filters?.onClear()
      }}
    >
      <X className="size-4 md:mr-1.5" />
      <span className="hidden md:inline">{labels.clearFilters}</span>
    </Button>
  ) : null
  const activeFilterChips = filters ? (
    <DataTableActiveFilterChips
      definitions={filters.definitions}
      values={filters.values}
      onClear={(id) => {
        const next = { ...filters.values }
        delete next[id]
        filters.onApply(next)
      }}
    />
  ) : null

  const toolbarFilterProps = {
    filterTrigger,
    clearButton,
    activeFilterChips,
    hasStructuredFilters,
  }

  const stateRenderProps = {
    allColumns,
    columnVisibility,
    labels,
    error,
    errorMessage,
    onRefetch,
    emptyState,
    emptyIcon,
    emptyTitle,
    emptyDescription,
    emptyAction,
    noResultsState,
    noResultsIcon,
    noResultsTitle,
    noResultsDescription,
    noResultsAction,
    hasActiveFilters,
    onClearFilters,
  }

  // Error state
  if (error) {
    return (
      <DataTableProvider
        tableId={tableId}
        totalRows={totalRows}
        visibleRows={displayData}
      >
        <div className="space-y-4">
          <DataTableToolbar
            toolbarStart={toolbarStart}
            toolbarEnd={toolbarEnd}
            slotContext={slotContext}
            {...toolbarFilterProps}
          />
          <DataTableErrorRender {...stateRenderProps} />
        </div>
      </DataTableProvider>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <DataTableProvider
        tableId={tableId}
        totalRows={totalRows}
        visibleRows={displayData}
      >
        <div className="space-y-4">
          <DataTableToolbar
            toolbarStart={toolbarStart}
            toolbarEnd={toolbarEnd}
            slotContext={slotContext}
            {...toolbarFilterProps}
          />
          <div className="hidden md:block">
            <DataTableDesktopSkeleton
              allColumns={allColumns}
              columnVisibility={columnVisibility}
            />
          </div>
          <DataTableMobileSkeleton />
        </div>
      </DataTableProvider>
    )
  }

  // Empty state (no data, no filters)
  if (data.length === 0 && !hasActiveFilters) {
    return (
      <DataTableProvider
        tableId={tableId}
        totalRows={totalRows}
        visibleRows={displayData}
      >
        <div className="space-y-4">
          <DataTableToolbar
            toolbarStart={toolbarStart}
            toolbarEnd={toolbarEnd}
            slotContext={slotContext}
            {...toolbarFilterProps}
          />
          <DataTableEmptyRender {...stateRenderProps} />
        </div>
      </DataTableProvider>
    )
  }

  // No results state (data filtered, but no matches)
  if (data.length === 0 && hasActiveFilters) {
    return (
      <DataTableProvider
        tableId={tableId}
        totalRows={totalRows}
        visibleRows={displayData}
      >
        <div className="space-y-4">
          <DataTableToolbar
            toolbarStart={toolbarStart}
            toolbarEnd={toolbarEnd}
            slotContext={slotContext}
            {...toolbarFilterProps}
          />
          <DataTableNoResultsRender {...stateRenderProps} />
        </div>
      </DataTableProvider>
    )
  }

  // Normal render
  return (
    <DataTableProvider
      tableId={tableId}
      totalRows={totalRows}
      visibleRows={displayData}
    >
      <div className="space-y-4">
        <DataTableToolbar
          toolbarStart={toolbarStart}
          toolbarEnd={toolbarEnd}
          selectionToolbar={selectionToolbar}
          slotContext={slotContext}
          {...toolbarFilterProps}
        />

        <DataTableDesktopView
          table={table}
          sort={sort}
          onSortChange={onSortChange}
          onRowClick={onRowClick}
          isRefetching={isRefetching}
          labels={labels}
          page={page}
          perPage={perPage}
          totalRows={totalRows}
          onPageChange={onPageChange}
          onPerPageChange={onPerPageChange}
        />

        <DataTableMobileView
          table={table}
          customMobileCard={customMobileCard}
          isRefetching={isRefetching}
          isMobile={isMobile}
          sentinelRef={sentinelRef}
        />
      </div>

      {filters && (
        <DataTableFilterPanel
          open={isFilterPanelOpen}
          onOpenChange={setIsFilterPanelOpen}
          definitions={filters.definitions}
          committedValues={filters.values}
          onApply={filters.onApply}
          onClear={filters.onClear}
          labels={filterLabels}
          customContent={filters.customContent}
        />
      )}
    </DataTableProvider>
  )
}
