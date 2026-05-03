import { ListFilter, X } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import type {
  DataTableFilterLabels,
  DataTableFilterValues,
  FilterDefinition,
  FilterDefinitions,
  FilterValue,
} from './data-table-utils'

type DataTableFilterTriggerProps = {
  activeCount: number
  labels: DataTableFilterLabels
  onClick: () => void
}

export function DataTableFilterTrigger({
  activeCount,
  labels,
  onClick,
}: DataTableFilterTriggerProps) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="relative">
      <ListFilter className="size-4 md:mr-1.5" />
      <span className="hidden md:inline">{labels.filters}</span>
      {activeCount > 0 && (
        <Badge
          variant="secondary"
          className="ml-1 size-5 rounded-full p-0 text-[11px] leading-none md:static md:size-auto md:rounded-md md:px-1.5 md:py-0.5"
        >
          {activeCount}
        </Badge>
      )}
    </Button>
  )
}

type DataTableActiveFilterChipsProps = {
  definitions: FilterDefinitions
  values: DataTableFilterValues
  onClear: (id: string) => void
}

export function DataTableActiveFilterChips({
  definitions,
  values,
  onClear,
}: DataTableActiveFilterChipsProps) {
  const active = definitions.filter((def) => {
    const v = values[def.id]
    if (v == null) return false
    if (typeof v === 'string' && v === '') return false
    if (Array.isArray(v) && v.length === 0) return false
    if (typeof v === 'object' && !Array.isArray(v)) {
      const r = v as { from: string | null; to: string | null }
      if (!r.from && !r.to) return false
    }
    return true
  })

  if (active.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active.map((def) => {
        const v = values[def.id]
        const label = getChipLabel(def, v)
        if (!label) return null
        return (
          <Badge key={def.id} variant="secondary" className="gap-1">
            <span className="text-muted-foreground">{def.label}:</span>
            {label}
            <button
              type="button"
              onClick={() => onClear(def.id)}
              className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
            >
              <X className="size-3" />
              <span className="sr-only">Remove {def.label} filter</span>
            </button>
          </Badge>
        )
      })}
    </div>
  )
}

function getChipLabel(def: FilterDefinition, value: FilterValue): string {
  if (value == null) return ''
  if (typeof value === 'string') {
    if (def.type === 'combobox-single' || def.type === 'radio-chips') {
      return def.options?.find((o) => o.value === value)?.label ?? value
    }
    if (def.type === 'date-single') return value
    return value
  }
  if (Array.isArray(value)) return `${value.length} selected`
  if (typeof value === 'object' && !Array.isArray(value)) {
    const r = value as { from: string | null; to: string | null }
    if (r.from && r.to) return `${r.from} — ${r.to}`
    if (r.from) return `From ${r.from}`
    if (r.to) return `Until ${r.to}`
  }
  return ''
}
