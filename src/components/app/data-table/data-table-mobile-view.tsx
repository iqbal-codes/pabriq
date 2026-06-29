import type { Table } from '@tanstack/react-table'
import { RefreshCw } from 'lucide-react'
import { DataTableMobileCard } from './data-table-mobile-card'

type DataTableMobileViewProps<TData> = {
  table: Table<TData>
  customMobileCard?: (row: TData) => React.ReactNode
  isRefetching?: boolean
  isMobile: boolean
  sentinelRef: React.RefCallback<HTMLDivElement>
}

export function DataTableMobileView<TData>({
  table,
  customMobileCard,
  isRefetching,
  isMobile,
  sentinelRef,
}: DataTableMobileViewProps<TData>) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {table.getRowModel().rows.map((row) => (
          <DataTableMobileCard
            key={row.id}
            row={row}
            customCard={customMobileCard}
          />
        ))}
      </div>

      {isMobile && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {isRefetching && (
            <RefreshCw className="size-5 animate-spin text-muted-foreground" />
          )}
        </div>
      )}
    </>
  )
}
