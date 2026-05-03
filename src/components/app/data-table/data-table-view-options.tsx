import { Settings2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { useDataTableContext } from './data-table-context'
import type { DataTableLabels } from './data-table-utils'
import { removeStoredVisibility } from './data-table-utils'

type ColumnVisibilityEntry = {
  id: string
  label: string
  getIsVisible: () => boolean
  getCanHide: () => boolean
  toggleVisibility: () => void
}

type DataTableViewOptionsProps = {
  columns: ColumnVisibilityEntry[]
  labels: DataTableLabels
}

export function DataTableViewOptions({
  columns,
  labels,
}: DataTableViewOptionsProps) {
  const { tableId } = useDataTableContext()
  const hideable = columns.filter((c) => c.getCanHide())

  if (hideable.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          tooltip={labels.columnVisibility}
        >
          <Settings2 className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{labels.columnVisibility}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hideable.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.id}
            checked={col.getIsVisible()}
            onCheckedChange={() => col.toggleVisibility()}
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start font-normal"
          onClick={() => {
            removeStoredVisibility(tableId)
            hideable.forEach((col) => {
              if (!col.getIsVisible()) col.toggleVisibility()
            })
          }}
        >
          {labels.resetColumns}
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
