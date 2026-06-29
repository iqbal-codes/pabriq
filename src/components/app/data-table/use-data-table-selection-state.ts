import type { Table } from '@tanstack/react-table'
import { useMemo } from 'react'
import type { DataTableSlotContext } from './data-table-utils'

export function useDataTableSelectionState<TData>(params: {
  table: Table<TData>
  rowSelection: Record<string, boolean>
  totalRows: number
  visibleRows: TData[]
}): DataTableSlotContext<TData> {
  const { table, rowSelection, totalRows, visibleRows } = params

  const selectedRowIds = useMemo(
    () => Object.keys(rowSelection).filter((k) => rowSelection[k]),
    [rowSelection],
  )

  const selectedRows = useMemo(() => {
    const idSet = new Set(selectedRowIds)
    return table.getSelectedRowModel().rows.reduce<TData[]>((acc, r) => {
      if (idSet.has(r.id)) acc.push(r.original)
      return acc
    }, [])
  }, [table, selectedRowIds])

  const slotContext = useMemo<DataTableSlotContext<TData>>(
    () => ({
      clearSelection: () => table.resetRowSelection(),
      selectedRowIds,
      selectedRows,
      totalRows,
      visibleRows,
    }),
    [table, selectedRowIds, selectedRows, totalRows, visibleRows],
  )

  return slotContext
}
