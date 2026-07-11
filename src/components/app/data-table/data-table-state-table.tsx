import type { LucideIcon } from 'lucide-react'
import { AlertCircle, PackageOpen, RefreshCw, SearchX } from 'lucide-react'
import {
  EmptyState,
  type EmptyStateAction,
} from '#/components/app/page-shell/empty-state'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { cn } from '#/lib/utils'
import type { AppColumnDef, AppColumnMeta } from './data-table-utils'
import { getVisibleColumns } from './data-table-utils'

// ---------------------------------------------------------------------------
// Shared props for state-render components
// ---------------------------------------------------------------------------

export type DataTableStateRenderProps<TData> = {
  allColumns: AppColumnDef<TData>[]
  columnVisibility: Record<string, boolean>
  labels: {
    errorTitle: string
    errorRetry: string
    loading: string
    clearFilters: string
  }
  error?: string | null
  errorMessage?: string
  onRefetch?: () => void
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
}

// ---------------------------------------------------------------------------
// VisibleEmptyColumns – renders <TableHead> for each visible column
// ---------------------------------------------------------------------------

function VisibleEmptyColumns<TData>({
  allColumns,
}: {
  allColumns: AppColumnDef<TData>[]
}) {
  return allColumns.map((col) => {
    if ('accessorKey' in col || 'id' in col) {
      const id = 'accessorKey' in col ? col.accessorKey : col.id
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
  })
}

// ---------------------------------------------------------------------------
// StateTableShell – shared table wrapper for error / empty / no-results
// ---------------------------------------------------------------------------

type StateTableShellProps<TData> = {
  allColumns: AppColumnDef<TData>[]
  columnVisibility: Record<string, boolean>
  children: React.ReactNode
}

function StateTableShell<TData>({
  allColumns,
  columnVisibility,
  children,
}: StateTableShellProps<TData>) {
  const cols = getVisibleColumns(allColumns, columnVisibility)

  return (
    <div className="space-y-4">
      <div className="rounded-none border bg-muted/50 p-1.5">
        <div className="rounded-none border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 *:px-3 sm:*:px-4">
                <VisibleEmptyColumns
                  allColumns={cols as AppColumnDef<TData>[]}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={cols.length} className="text-center">
                  {children}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error render
// ---------------------------------------------------------------------------

export function DataTableErrorRender<TData>(
  props: DataTableStateRenderProps<TData>,
) {
  const {
    allColumns,
    columnVisibility,
    labels,
    errorMessage,
    error,
    onRefetch,
  } = props

  return (
    <StateTableShell
      allColumns={allColumns}
      columnVisibility={columnVisibility}
    >
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4">
          <AlertCircle className="size-8 text-destructive" />
        </div>
        <h3 className="mt-4 font-semibold">{labels.errorTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          {errorMessage || error}
        </p>
        {onRefetch && (
          <Button variant="outline" className="mt-4" onClick={onRefetch}>
            <RefreshCw className="mr-2 size-4" />
            {labels.errorRetry}
          </Button>
        )}
      </div>
    </StateTableShell>
  )
}

// ---------------------------------------------------------------------------
// Empty render
// ---------------------------------------------------------------------------

export function DataTableEmptyRender<TData>(
  props: DataTableStateRenderProps<TData>,
) {
  const {
    allColumns,
    columnVisibility,
    labels,
    emptyState,
    emptyIcon,
    emptyTitle,
    emptyDescription,
    emptyAction,
  } = props

  return (
    <StateTableShell
      allColumns={allColumns}
      columnVisibility={columnVisibility}
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
    </StateTableShell>
  )
}

// ---------------------------------------------------------------------------
// No-results render
// ---------------------------------------------------------------------------

export function DataTableNoResultsRender<TData>(
  props: DataTableStateRenderProps<TData>,
) {
  const {
    allColumns,
    columnVisibility,
    labels,
    noResultsState,
    noResultsIcon,
    noResultsTitle,
    noResultsDescription,
    noResultsAction,
    onClearFilters,
  } = props

  return (
    <StateTableShell
      allColumns={allColumns}
      columnVisibility={columnVisibility}
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
            <h3 className="mt-4 font-semibold">{labels.loading}</h3>
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
    </StateTableShell>
  )
}
