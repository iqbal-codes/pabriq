import { flexRender, type Table } from '@tanstack/react-table'
import { RefreshCw } from 'lucide-react'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Table as UITable,
} from '#/components/ui/table'
import { cn } from '#/lib/utils'
import { DataTablePagination } from './data-table-pagination'
import type {
  AppColumnMeta,
  DataTableLabels,
  SortState,
} from './data-table-utils'

type DataTableDesktopViewProps<TData> = {
  table: Table<TData>
  sort?: SortState | null
  onSortChange?: (sort: SortState | null) => void
  onRowClick?: (row: TData) => void
  isRefetching?: boolean
  labels: DataTableLabels
  page: number
  perPage: number
  totalRows: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}

export function DataTableDesktopView<TData>({
  table,
  sort,
  onSortChange,
  onRowClick,
  isRefetching,
  labels,
  page,
  perPage,
  totalRows,
  onPageChange,
  onPerPageChange,
}: DataTableDesktopViewProps<TData>) {
  function handleSort(field: string) {
    if (!onSortChange) return
    if (sort?.field === field) {
      const next = sort.direction === 'asc' ? 'desc' : 'asc'
      onSortChange({ field, direction: next })
    } else {
      onSortChange({ field, direction: 'asc' })
    }
  }

  return (
    <div className="relative">
      <div className="hidden md:block">
        <div className="rounded-xl border bg-muted/50 p-1.5">
          <div className="rounded-lg border bg-background">
            <UITable>
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
                              onClick={() => handleSort(header.column.id)}
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
            </UITable>
          </div>
        </div>
      </div>

      {isRefetching && (
        <div className="absolute inset-0 z-10 hidden md:flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[1px]">
          <RefreshCw className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="hidden md:block">
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
    </div>
  )
}
