import { flexRender } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Checkbox } from '#/components/ui/checkbox'
import type {
  AppColumnDef,
  AppColumnMeta,
  DataTableLabels,
} from './data-table-utils'
import { DataTableViewOptions } from './data-table-view-options'

// ---------------------------------------------------------------------------
// useDataTableColumns – builds the full column list (selection + data + actions)
// ---------------------------------------------------------------------------

type UseDataTableColumnsParams<TData> = {
  columns: AppColumnDef<TData>[]
  rowActions?: (row: TData) => ReactNode
  enableRowSelection?: boolean
  labels: DataTableLabels
}

export function useDataTableColumns<TData>({
  columns,
  rowActions,
  enableRowSelection,
  labels,
}: UseDataTableColumnsParams<TData>) {
  return useMemo(() => {
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
    } else if (cols.length > 0) {
      const lastIndex = cols.length - 1
      const lastCol = cols[lastIndex]
      cols[lastIndex] = {
        ...lastCol,
        header: (ctx) => (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{flexRender(lastCol.header, ctx)}</span>
            <DataTableViewOptions
              columns={ctx.table.getAllLeafColumns().map((col) => ({
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
      } as AppColumnDef<TData>
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
}
