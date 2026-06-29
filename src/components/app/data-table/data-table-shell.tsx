import type React from 'react'
import { DataTableProvider } from './data-table-context'

type DataTableShellProps<TData> = {
  tableId: string
  totalRows: number
  visibleRows: TData[]
  toolbar: React.ReactNode
  children: React.ReactNode
  filterPanel?: React.ReactNode
}

export function DataTableShell<TData>({
  tableId,
  totalRows,
  visibleRows,
  toolbar,
  children,
  filterPanel,
}: DataTableShellProps<TData>): React.ReactElement {
  return (
    <DataTableProvider
      tableId={tableId}
      totalRows={totalRows}
      visibleRows={visibleRows}
    >
      <div className="space-y-4">
        {toolbar}
        {children}
      </div>
      {filterPanel}
    </DataTableProvider>
  )
}
