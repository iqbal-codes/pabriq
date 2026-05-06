import { flexRender, type Row } from '@tanstack/react-table'
import { Card } from '#/components/ui/card'
import type { AppColumnMeta } from './data-table-utils'

type DataTableMobileCardProps<TData> = {
  row: Row<TData>
  customCard?: (row: TData) => React.ReactNode
}

export function DataTableMobileCard<TData>({
  row,
  customCard,
}: DataTableMobileCardProps<TData>) {
  if (customCard) return <>{customCard(row.original)}</>

  const titleCol = row.getAllCells().find((c) => {
    const meta = c.column.columnDef.meta as AppColumnMeta | undefined
    return meta?.mobileRole === 'title'
  })
  const subtitleCol = row.getAllCells().find((c) => {
    const meta = c.column.columnDef.meta as AppColumnMeta | undefined
    return meta?.mobileRole === 'subtitle'
  })
  const badgeCol = row.getAllCells().find((c) => {
    const meta = c.column.columnDef.meta as AppColumnMeta | undefined
    return meta?.mobileRole === 'badge'
  })
  const metaCols = row.getAllCells().filter((c) => {
    const meta = c.column.columnDef.meta as AppColumnMeta | undefined
    return meta?.mobileRole === 'meta'
  })

  return (
    <Card className="p-4 gap-3!">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {titleCol && (
            <div className="text-sm font-medium">
              {flexRender(
                titleCol.column.columnDef.cell,
                titleCol.getContext(),
              )}
            </div>
          )}
          {subtitleCol && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              {flexRender(
                subtitleCol.column.columnDef.cell,
                subtitleCol.getContext(),
              )}
            </div>
          )}
        </div>
        {badgeCol && (
          <div className="shrink-0">
            {flexRender(badgeCol.column.columnDef.cell, badgeCol.getContext())}
          </div>
        )}
      </div>
      {metaCols.length > 0 && (
        <div className="space-y-1">
          {metaCols.map((col) => {
            const meta = col.column.columnDef.meta as AppColumnMeta | undefined
            const label = meta?.label ?? col.column.id
            return (
              <div
                key={col.id}
                className="flex flex-row justify-between items-center"
              >
                <div className="text-muted-foreground text-sm">{label}</div>
                <div className="text-sm">
                  {flexRender(col.column.columnDef.cell, col.getContext())}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {row.getVisibleCells().find((c) => {
        const meta = c.column.columnDef.meta as AppColumnMeta | undefined
        return meta?.mobileRole === 'actions'
      }) && (
        <div className="flex justify-end gap-1">
          {row
            .getVisibleCells()
            .filter((c) => {
              const meta = c.column.columnDef.meta as AppColumnMeta | undefined
              return meta?.mobileRole === 'actions'
            })
            .map((c) => (
              <div key={c.id}>
                {flexRender(c.column.columnDef.cell, c.getContext())}
              </div>
            ))}
        </div>
      )}
    </Card>
  )
}
