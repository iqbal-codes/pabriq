import type React from 'react'
import { useState } from 'react'
import type { AppColumnDef } from './data-table-utils'
import { getStoredVisibility, setStoredVisibility } from './data-table-utils'

export function useDataTableColumnVisibility<TData>(
  tableId: string,
  allColumns: AppColumnDef<TData>[],
): [
  Record<string, boolean>,
  React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
] {
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >(() => {
    const stored = getStoredVisibility(tableId)
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

  const handleVisibilityChange = (
    updater: React.SetStateAction<Record<string, boolean>>,
  ) => {
    setColumnVisibility((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      setStoredVisibility(tableId, next)
      return next
    })
  }

  return [columnVisibility, handleVisibilityChange]
}
