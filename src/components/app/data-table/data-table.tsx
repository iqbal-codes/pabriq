import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { LucideIcon } from 'lucide-react'
import { AlertCircle, PackageOpen, RefreshCw, SearchX, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  EmptyState,
  type EmptyStateAction,
} from '#/components/app/page-shell/empty-state'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { cn } from '#/lib/utils'
import { DataTableProvider } from './data-table-context'
import { DataTableFilterPanel } from './data-table-filter-panel'
import {
  DataTableActiveFilterChips,
  DataTableFilterTrigger,
} from './data-table-filter-trigger'
import { DataTableMobileCard } from './data-table-mobile-card'
import { DataTablePagination } from './data-table-pagination'
import { DataTableToolbar } from './data-table-toolbar'
import type {
  AppColumnDef,
  AppColumnMeta,
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
import { DataTableViewOptions } from './data-table-view-options'

const DESKTOP_SKELETON = [
  'skeleton-0',
  'skeleton-1',
  'skeleton-2',
  'skeleton-3',
  'skeleton-4',
]
const MOBILE_SKELETON = ['s-card-0', 's-card-1', 's-card-2']

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
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
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

  const allColumns = useMemo(() => {
    const cols: AppColumnDef<TData>[] = []
    if (enableRowSelection) {
      cols.push({
        id: 'select',
        enableSorting: false,
        enableHiding: false,
        meta: { label: '', mobileRole: 'hidden' } as AppColumnMeta,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
          />
        ),
      } as AppColumnDef<TData>)
    }
    cols.push(...columns)
    if (rowActions && !cols.find((c) => 'id' in c && c.id === 'actions')) {
      cols.push({
        id: 'actions',
        enableHiding: false,
        meta: { label: '', mobileRole: 'actions' } as unknown as AppColumnMeta,
        header: ({ table }) => (
          <div className="flex items-center justify-between">
            {'Action'}
            <DataTableViewOptions
              columns={table.getAllLeafColumns().map((col) => ({
                id: col.id,
                label:
                  (col.columnDef.meta as AppColumnMeta | undefined)?.label ||
                  col.id,
                getIsVisible: () => col.getIsVisible(),
                getCanHide: () => col.getCanHide(),
                toggleVisibility: () => col.toggleVisibility(),
              }))}
              labels={labels}
            />
          </div>
        ),
        cell: ({ row }) => rowActions?.(row.original),
      } as AppColumnDef<TData>)
    } else {
      cols.push({
        id: 'column-visibility',
        enableHiding: false,
        meta: { label: '', mobileRole: 'hidden' } as AppColumnMeta,
        header: ({ table }) => (
          <div className="flex justify-end">
            <DataTableViewOptions
              columns={table.getAllLeafColumns().map((col) => ({
                id: col.id,
                label:
                  (col.columnDef.meta as AppColumnMeta | undefined)?.label ||
                  col.id,
                getIsVisible: () => col.getIsVisible(),
                getCanHide: () => col.getCanHide(),
                toggleVisibility: () => col.toggleVisibility(),
              }))}
              labels={labels}
            />
          </div>
        ),
      } as AppColumnDef<TData>)
    }
    return cols
  }, [columns, rowActions, enableRowSelection, labels])

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

  const table = useReactTable({
    data,
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

  const handleSort = useCallback(
    (field: string) => {
      if (!onSortChange) return
      if (sort?.field === field) {
        const next = sort.direction === 'asc' ? 'desc' : 'asc'
        onSortChange({ field, direction: next })
      } else {
        onSortChange({ field, direction: 'asc' })
      }
    },
    [onSortChange, sort],
  )

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
      visibleRows: data,
    }),
    [table, selectedRowIds, totalRows, data],
  )

  useEffect(() => {
    if (
      hasActiveFilters !== undefined ||
      page !== undefined ||
      perPage !== undefined ||
      sort !== undefined
    ) {
      table.resetRowSelection()
    }
  }, [hasActiveFilters, page, perPage, sort, table])

  const visibleEmptyColumns = useMemo(
    () =>
      allColumns.filter((col) => {
        if ('accessorKey' in col || 'id' in col) {
          const id = 'accessorKey' in col ? col.accessorKey : col.id
          if (id === 'select') return false
          return columnVisibility[id as string] !== false
        }
        return false
      }),
    [allColumns, columnVisibility],
  )

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

  if (error) {
    return (
      <DataTableProvider
        tableId={tableId}
        totalRows={totalRows}
        visibleRows={data}
      >
        <div className="space-y-4">
          <DataTableToolbar
            toolbarStart={toolbarStart}
            toolbarEnd={toolbarEnd}
            slotContext={slotContext}
            {...toolbarFilterProps}
          />
          <div className="rounded-xl border bg-muted/50 p-1.5">
            <div className="rounded-lg border bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 *:px-3 sm:*:px-4">
                    {visibleEmptyColumns.map((col) => {
                      if ('accessorKey' in col || 'id' in col) {
                        const id =
                          'accessorKey' in col ? col.accessorKey : col.id
                        const meta = col.meta as AppColumnMeta | undefined
                        return (
                          <TableHead
                            key={id as string}
                            className={cn(
                              meta?.align === 'end' && 'text-right',
                              meta?.align === 'center' && 'text-center',
                              meta?.headerClassName,
                            )}
                          >
                            {meta?.label || (id as string)}
                          </TableHead>
                        )
                      }
                      return null
                    })}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  <TableRow>
                    <TableCell
                      colSpan={visibleEmptyColumns.length}
                      className="text-center"
                    >
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="rounded-full bg-muted p-4">
                          <AlertCircle className="size-8 text-destructive" />
                        </div>
                        <h3 className="mt-4 font-semibold">
                          {labels.errorTitle}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                          {errorMessage || error}
                        </p>
                        {onRefetch && (
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={onRefetch}
                          >
                            <RefreshCw className="mr-2 size-4" />
                            {labels.errorRetry}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DataTableProvider>
    )
  }

  if (isLoading) {
    return (
      <DataTableProvider
        tableId={tableId}
        totalRows={totalRows}
        visibleRows={data}
      >
        <div className="space-y-4">
          <DataTableToolbar
            toolbarStart={toolbarStart}
            toolbarEnd={toolbarEnd}
            slotContext={slotContext}
            {...toolbarFilterProps}
          />
          <div className="hidden md:block">
            <div className="rounded-xl border bg-muted/50 p-1.5">
              <div className="rounded-lg border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {allColumns.map((col) => {
                        if ('accessorKey' in col || 'id' in col) {
                          const id =
                            'accessorKey' in col ? col.accessorKey : col.id
                          if (id === 'select') return null
                          const isHidden =
                            columnVisibility[id as string] === false
                          if (isHidden) return null
                          return (
                            <TableHead key={id as string}>
                              <Skeleton className="h-4 w-24" />
                            </TableHead>
                          )
                        }
                        return null
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DESKTOP_SKELETON.map((key) => (
                      <TableRow key={key}>
                        {allColumns.map((col) => {
                          if ('accessorKey' in col || 'id' in col) {
                            const id =
                              'accessorKey' in col ? col.accessorKey : col.id
                            if (id === 'select') return null
                            const isHidden =
                              columnVisibility[id as string] === false
                            if (isHidden) return null
                            return (
                              <TableCell key={id as string}>
                                <Skeleton className="h-4 w-full" />
                              </TableCell>
                            )
                          }
                          return null
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {MOBILE_SKELETON.map((key) => (
              <div key={key} className="rounded-lg border p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      </DataTableProvider>
    )
  }

  if (data.length === 0 && !hasActiveFilters) {
    return (
      <DataTableProvider
        tableId={tableId}
        totalRows={totalRows}
        visibleRows={data}
      >
        <div className="space-y-4">
          <DataTableToolbar
            toolbarStart={toolbarStart}
            toolbarEnd={toolbarEnd}
            slotContext={slotContext}
            {...toolbarFilterProps}
          />
          <div className="rounded-xl border bg-muted/50 p-1.5">
            <div className="rounded-lg border bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 *:px-3 sm:*:px-4">
                    {visibleEmptyColumns.map((col) => {
                      if ('accessorKey' in col || 'id' in col) {
                        const id =
                          'accessorKey' in col ? col.accessorKey : col.id
                        const meta = col.meta as AppColumnMeta | undefined
                        return (
                          <TableHead
                            key={id as string}
                            className={cn(
                              meta?.align === 'end' && 'text-right',
                              meta?.align === 'center' && 'text-center',
                              meta?.headerClassName,
                            )}
                          >
                            {meta?.label || (id as string)}
                          </TableHead>
                        )
                      }
                      return null
                    })}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  <TableRow>
                    <TableCell
                      colSpan={visibleEmptyColumns.length}
                      className="text-center"
                    >
                      {emptyState ??
                        (emptyTitle ? (
                          <EmptyState
                            icon={emptyIcon ?? PackageOpen}
                            title={emptyTitle}
                            description={emptyDescription ?? ''}
                            action={emptyAction}
                          />
                        ) : (
                          <EmptyState
                            icon={PackageOpen}
                            title={labels.loading}
                            description=""
                          />
                        ))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DataTableProvider>
    )
  }

  if (data.length === 0 && hasActiveFilters) {
    return (
      <DataTableProvider
        tableId={tableId}
        totalRows={totalRows}
        visibleRows={data}
      >
        <div className="space-y-4">
          <DataTableToolbar
            toolbarStart={toolbarStart}
            toolbarEnd={toolbarEnd}
            slotContext={slotContext}
            {...toolbarFilterProps}
          />
          <div className="rounded-xl border bg-muted/50 p-1.5">
            <div className="rounded-lg border bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 *:px-3 sm:*:px-4">
                    {visibleEmptyColumns.map((col) => {
                      if ('accessorKey' in col || 'id' in col) {
                        const id =
                          'accessorKey' in col ? col.accessorKey : col.id
                        const meta = col.meta as AppColumnMeta | undefined
                        return (
                          <TableHead
                            key={id as string}
                            className={cn(
                              meta?.align === 'end' && 'text-right',
                              meta?.align === 'center' && 'text-center',
                              meta?.headerClassName,
                            )}
                          >
                            {meta?.label || (id as string)}
                          </TableHead>
                        )
                      }
                      return null
                    })}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  <TableRow>
                    <TableCell
                      colSpan={visibleEmptyColumns.length}
                      className="text-center"
                    >
                      {noResultsState ??
                        (noResultsTitle ? (
                          <EmptyState
                            icon={noResultsIcon ?? SearchX}
                            title={noResultsTitle}
                            description={noResultsDescription ?? ''}
                            action={noResultsAction}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="rounded-full bg-muted p-4">
                              <SearchX className="size-8 text-muted-foreground" />
                            </div>
                            <h3 className="mt-4 font-semibold">
                              {labels.loading}
                            </h3>
                            {onClearFilters && (
                              <Button
                                variant="outline"
                                className="mt-4"
                                onClick={onClearFilters}
                              >
                                {labels.clearFilters}
                              </Button>
                            )}
                          </div>
                        ))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DataTableProvider>
    )
  }

  return (
    <DataTableProvider
      tableId={tableId}
      totalRows={totalRows}
      visibleRows={data}
    >
      <div className="space-y-4">
        <DataTableToolbar
          toolbarStart={toolbarStart}
          toolbarEnd={toolbarEnd}
          selectionToolbar={selectionToolbar}
          slotContext={slotContext}
          {...toolbarFilterProps}
        />

        <div className="relative">
          <div className="hidden md:block">
            <div className="rounded-xl border bg-muted/50 p-1.5">
              <div className="rounded-lg border bg-background">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="bg-muted/50">
                        {headerGroup.headers.map((header) => {
                          const meta = header.column.columnDef.meta as
                            | AppColumnMeta
                            | undefined
                          return (
                            <TableHead
                              key={header.id}
                              className={cn(
                                meta?.align === 'end' && 'text-right',
                                meta?.align === 'center' && 'text-center',
                                meta?.headerClassName,
                              )}
                            >
                              {header.column.getCanSort() && onSortChange ? (
                                <button
                                  type="button"
                                  className="flex items-center gap-1 hover:text-foreground cursor-pointer"
                                  onClick={() =>
                                    handleSort(header.column.id as string)
                                  }
                                >
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext(),
                                  )}
                                  {sort?.field === header.column.id && (
                                    <span className="text-xs">
                                      {sort.direction === 'asc' ? '↑' : '↓'}
                                    </span>
                                  )}
                                </button>
                              ) : (
                                flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )
                              )}
                            </TableHead>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                        onClick={() => onRowClick?.(row.original)}
                        className={cn(onRowClick && 'cursor-pointer')}
                      >
                        {row.getVisibleCells().map((cell) => {
                          const meta = cell.column.columnDef.meta as
                            | AppColumnMeta
                            | undefined
                          return (
                            <TableCell
                              key={cell.id}
                              className={cn(
                                meta?.align === 'end' && 'text-right',
                                meta?.align === 'center' && 'text-center',
                                meta?.cellClassName,
                              )}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {table.getRowModel().rows.map((row) => (
              <DataTableMobileCard
                key={row.id}
                row={row}
                customCard={customMobileCard}
              />
            ))}
          </div>

          {isRefetching && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[1px]">
              <RefreshCw className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <DataTablePagination
          labels={labels}
          page={page}
          perPage={perPage}
          totalRows={totalRows}
          onPageChange={onPageChange}
          onPerPageChange={onPerPageChange}
          disabled={isRefetching}
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
