import { createContext, use, useCallback, useMemo, useState } from 'react'
import type { DataTableSlotContext } from './data-table-utils'

type SelectionState = {
  rowIds: string[]
}

type DataTableContextValue<TData> = {
  slotContext: DataTableSlotContext<TData>
  selection: SelectionState
  setSelection: (ids: string[]) => void
  clearSelection: () => void
  tableId: string
  totalRows: number
  visibleRows: TData[]
}

const DataTableContext = createContext<DataTableContextValue<unknown> | null>(
  null,
)

export function useDataTableContext<TData>() {
  const ctx = use(DataTableContext)
  if (!ctx) throw new Error('useDataTableContext must be used within DataTable')
  return ctx as unknown as DataTableContextValue<TData>
}

type DataTableProviderProps<TData> = {
  tableId: string
  totalRows: number
  visibleRows: TData[]
  children: React.ReactNode
}

export function DataTableProvider<TData>({
  tableId,
  totalRows,
  visibleRows,
  children,
}: DataTableProviderProps<TData>) {
  const [selection, setSelectionState] = useState<SelectionState>({
    rowIds: [],
  })

  const setSelection = useCallback((ids: string[]) => {
    setSelectionState({ rowIds: ids })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectionState({ rowIds: [] })
  }, [])

  const slotContext = useMemo(
    () => ({
      clearSelection,
      selectedRowIds: selection.rowIds,
      selectedRows: visibleRows.filter((_, i) => i < selection.rowIds.length),
      totalRows,
      visibleRows,
    }),
    [clearSelection, selection.rowIds, visibleRows, totalRows],
  )

  const value = useMemo(
    () => ({
      slotContext,
      selection,
      setSelection,
      clearSelection,
      tableId,
      totalRows,
      visibleRows,
    }),
    [
      slotContext,
      selection,
      setSelection,
      clearSelection,
      tableId,
      totalRows,
      visibleRows,
    ],
  )

  return (
    <DataTableContext.Provider value={value as DataTableContextValue<unknown>}>
      {children}
    </DataTableContext.Provider>
  )
}
