import { cn } from '#/lib/utils'
import type { FilterOption } from './data-table-utils'

type DataTableFilterChipsProps = {
  options: FilterOption[]
  value: string | null
  onChange: (value: string | null) => void
  allLabel?: string
}

export function DataTableFilterChips({
  options,
  value,
  onChange,
  allLabel = 'All',
}: DataTableFilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          'rounded-full px-3 py-1 text-xs font-medium transition-colors',
          value === null
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80',
        )}
      >
        {allLabel}
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            value === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
