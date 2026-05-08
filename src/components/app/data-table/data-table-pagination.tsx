import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import type { DataTableLabels } from './data-table-utils'

type DataTablePaginationProps = {
  labels: DataTableLabels
  page: number
  perPage: number
  totalRows: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  disabled?: boolean
  perPageOptions?: number[]
}

export function DataTablePagination({
  labels,
  page,
  perPage,
  totalRows,
  onPageChange,
  onPerPageChange,
  disabled,
  perPageOptions = [10, 25, 50, 100],
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalRows / perPage))
  const from = totalRows === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, totalRows)

  return (
    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
      <p className="text-sm text-muted-foreground">
        {labels.visibleRows(from, to, totalRows)}
      </p>

      <div className="flex items-center gap-2">
        <NativeSelect
          value={String(perPage)}
          onChange={(e) => onPerPageChange(Number(e.target.value))}
          disabled={disabled}
          aria-label={labels.perPage}
        >
          {perPageOptions.map((n) => (
            <NativeSelectOption key={n} value={String(n)}>
              {n}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => onPageChange(page - 1)}
            disabled={disabled || page <= 1}
            aria-label={labels.previousPage}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span className="flex items-center gap-1 px-2 text-sm">
            {labels.page} <span className="font-medium">{page}</span>{' '}
            {labels.of} <span className="font-medium">{totalPages}</span>
          </span>

          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => onPageChange(page + 1)}
            disabled={disabled || page >= totalPages}
            aria-label={labels.nextPage}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
