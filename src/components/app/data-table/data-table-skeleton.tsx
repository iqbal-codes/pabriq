import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import type { AppColumnDef } from './data-table-utils'

const DESKTOP_SKELETON = [
  'skeleton-0',
  'skeleton-1',
  'skeleton-2',
  'skeleton-3',
  'skeleton-4',
]
const MOBILE_SKELETON = ['s-card-0', 's-card-1', 's-card-2']

type DataTableSkeletonProps<TData> = {
  allColumns: AppColumnDef<TData>[]
  columnVisibility: Record<string, boolean>
}

export function DataTableDesktopSkeleton<TData>({
  allColumns,
  columnVisibility,
}: DataTableSkeletonProps<TData>) {
  return (
    <div className="rounded-xl border bg-muted/50 p-1.5">
      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              {allColumns.map((col) => {
                if ('accessorKey' in col || 'id' in col) {
                  const id = 'accessorKey' in col ? col.accessorKey : col.id
                  if (id === 'select') return null
                  const isHidden = columnVisibility[id as string] === false
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
                    const id = 'accessorKey' in col ? col.accessorKey : col.id
                    if (id === 'select') return null
                    const isHidden = columnVisibility[id as string] === false
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
  )
}

export function DataTableMobileSkeleton() {
  return (
    <div className="space-y-3 md:hidden">
      {MOBILE_SKELETON.map((key) => (
        <div key={key} className="rounded-lg border p-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  )
}
