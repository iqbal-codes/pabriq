import { format } from 'date-fns'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Calendar } from '#/components/ui/calendar'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '#/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { cn } from '#/lib/utils'
import {
  type DataTableFilterValues,
  type DateRangeValue,
  type FilterDefinition,
  type FilterDefinitions,
  type FilterOption,
  type FilterValue,
  isFilterActive,
} from './data-table-utils'

const DATE_FMT = 'yyyy-MM-dd'
const DISPLAY_FMT = 'MMM d, yyyy'

export type DataTableInlineFiltersProps = {
  definitions: FilterDefinitions
  values: DataTableFilterValues
  onApply: (id: string, value: FilterValue) => void
}

/* ── helper: narrow a FilterDefinition union member ───────────────── */

function asCombobox(def: FilterDefinition): {
  options: FilterOption[]
  placeholder?: string
} {
  return def as Extract<
    FilterDefinition,
    { type: 'combobox-single' | 'combobox-multi' }
  >
}
function asRadioChips(def: FilterDefinition): { options: FilterOption[] } {
  return def as Extract<FilterDefinition, { type: 'radio-chips' }>
}

/* ── trigger button base styles ──────────────────────────────────── */

const triggerBase =
  'inline-flex h-8 items-center gap-1.5 rounded-none border bg-background px-2 text-xs font-medium transition-colors cursor-pointer select-none whitespace-nowrap'
const triggerIdle = 'border-border hover:bg-accent/50'
const triggerActive = 'border-primary/30 bg-primary/5'

function TriggerButton({
  active,
  label,
  valueText,
  onClick,
  onRemove,
}: {
  active: boolean
  label: string
  valueText?: string | null
  onClick?: () => void
  onRemove?: () => void
}) {
  return (
    <div className={cn(triggerBase, active ? triggerActive : triggerIdle)}>
      <button
        type="button"
        onClick={onClick}
        className="flex-1 inline-flex items-center gap-1.5"
        aria-label={`Filter by ${label}`}
      >
        {active && valueText ? (
          <>
            <span className="text-muted-foreground">{label}:</span>
            <span className="truncate max-w-[8rem]">{valueText}</span>
          </>
        ) : (
          <span className="text-muted-foreground">{label}</span>
        )}
        {!active && <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />}
      </button>
      {active && valueText && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-none text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={`Clear ${label} filter`}
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}

/* ── combobox-single ─────────────────────────────────────────────── */

function InlineComboboxSingle({
  def,
  value,
  onApply,
}: {
  def: FilterDefinition
  value: string | null
  onApply: (value: FilterValue) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { options, placeholder } = asCombobox(def)

  const selectedLabel = value
    ? (options.find((o) => o.value === value)?.label ?? value)
    : null

  const filtered = useMemo(() => {
    if (!search) return options
    const q = search.toLowerCase()
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    )
  }, [options, search])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span>
          <TriggerButton
            active={isFilterActive(def, value)}
            label={def.label}
            valueText={selectedLabel}
            onClick={() => setOpen(true)}
            onRemove={() => onApply(null)}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-[14rem] p-0">
        <Command>
          <CommandInput
            placeholder={placeholder ?? 'Search...'}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No options</CommandEmpty>
            <CommandGroup>
              {filtered.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={(v) => {
                    onApply(v === value ? null : v)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4',
                      value === opt.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/* ── combobox-multi ──────────────────────────────────────────────── */

function InlineComboboxMulti({
  def,
  value,
  onApply,
}: {
  def: FilterDefinition
  value: string[]
  onApply: (value: FilterValue) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { options, placeholder } = asCombobox(def)

  const filtered = useMemo(() => {
    if (!search) return options
    const q = search.toLowerCase()
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    )
  }, [options, search])
  const valueSet = useMemo(() => new Set(value), [value])

  const valueText =
    value.length > 0
      ? value.length === 1
        ? (options.find((o) => o.value === value[0])?.label ?? value[0])
        : `${options.find((o) => o.value === value[0])?.label ?? value[0]} +${value.length - 1}`
      : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span>
          <TriggerButton
            active={isFilterActive(def, value)}
            label={def.label}
            valueText={valueText}
            onClick={() => setOpen(true)}
            onRemove={() => onApply([])}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-[14rem] p-0">
        <Command>
          <CommandInput
            placeholder={placeholder ?? 'Search...'}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No options</CommandEmpty>
            <CommandGroup>
              {filtered.map((opt) => {
                const isSelected = valueSet.has(opt.value)
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => {
                      onApply(
                        isSelected
                          ? value.filter((x) => x !== opt.value)
                          : [...value, opt.value],
                      )
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 size-4',
                        isSelected ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {opt.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/* ── radio-chips ─────────────────────────────────────────────────── */

function InlineRadioChips({
  def,
  value,
  onApply,
}: {
  def: FilterDefinition
  value: string | null
  onApply: (value: FilterValue) => void
}) {
  const [open, setOpen] = useState(false)
  const { options } = asRadioChips(def)

  const selectedLabel = value
    ? (options.find((o) => o.value === value)?.label ?? value)
    : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span>
          <TriggerButton
            active={isFilterActive(def, value)}
            label={def.label}
            valueText={selectedLabel}
            onClick={() => setOpen(true)}
            onRemove={() => onApply(null)}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-[14rem] p-0">
        <Command>
          <CommandList>
            <CommandEmpty>No options</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => {
                  onApply(null)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    'mr-2 size-4',
                    value === null ? 'opacity-100' : 'opacity-0',
                  )}
                />
                All
              </CommandItem>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={(v) => {
                    onApply(v === value ? null : v)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4',
                      value === opt.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/* ── date-single ─────────────────────────────────────────────────── */

function InlineDateSingle({
  def,
  value,
  onApply,
}: {
  def: FilterDefinition
  value: string | null
  onApply: (value: FilterValue) => void
}) {
  const [open, setOpen] = useState(false)
  const date = useMemo(
    () => (value ? new Date(`${value}T00:00:00`) : undefined),
    [value],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span>
          <TriggerButton
            active={isFilterActive(def, value)}
            label={def.label}
            valueText={date ? format(date, DISPLAY_FMT) : null}
            onClick={() => setOpen(true)}
            onRemove={() => onApply(null)}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onApply(d ? format(d, DATE_FMT) : null)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

/* ── date-range ──────────────────────────────────────────────────── */

function InlineDateRange({
  def,
  value,
  onApply,
}: {
  def: FilterDefinition
  value: DateRangeValue
  onApply: (value: FilterValue) => void
}) {
  const [open, setOpen] = useState(false)

  const range = useMemo(() => {
    const from = value.from ? new Date(`${value.from}T00:00:00`) : undefined
    const to = value.to ? new Date(`${value.to}T00:00:00`) : undefined
    return from || to ? { from, to } : undefined
  }, [value.from, value.to])

  const displayText = useMemo(() => {
    if (value.from && value.to)
      return `${format(new Date(`${value.from}T00:00:00`), DISPLAY_FMT)} — ${format(new Date(`${value.to}T00:00:00`), DISPLAY_FMT)}`
    if (value.from)
      return `From ${format(new Date(`${value.from}T00:00:00`), DISPLAY_FMT)}`
    if (value.to)
      return `Until ${format(new Date(`${value.to}T00:00:00`), DISPLAY_FMT)}`
    return null
  }, [value.from, value.to])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span>
          <TriggerButton
            active={isFilterActive(def, value)}
            label={def.label}
            valueText={displayText}
            onClick={() => setOpen(true)}
            onRemove={() => onApply({ from: null, to: null })}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={(r) => {
            onApply({
              from: r?.from ? format(r.from, DATE_FMT) : null,
              to: r?.to ? format(r.to, DATE_FMT) : null,
            })
          }}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}

/* ── main component ──────────────────────────────────────────────── */

export function DataTableInlineFilters({
  definitions,
  values,
  onApply,
}: DataTableInlineFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {definitions.map((def) => {
        const value = values[def.id]

        switch (def.type) {
          case 'combobox-single':
            return (
              <InlineComboboxSingle
                key={def.id}
                def={def}
                value={value as string | null}
                onApply={(v) => onApply(def.id, v)}
              />
            )
          case 'combobox-multi':
            return (
              <InlineComboboxMulti
                key={def.id}
                def={def}
                value={(value as string[]) ?? []}
                onApply={(v) => onApply(def.id, v)}
              />
            )
          case 'date-single':
            return (
              <InlineDateSingle
                key={def.id}
                def={def}
                value={value as string | null}
                onApply={(v) => onApply(def.id, v)}
              />
            )
          case 'date-range':
            return (
              <InlineDateRange
                key={def.id}
                def={def}
                value={(value as DateRangeValue) ?? { from: null, to: null }}
                onApply={(v) => onApply(def.id, v)}
              />
            )
          case 'radio-chips':
            return (
              <InlineRadioChips
                key={def.id}
                def={def}
                value={value as string | null}
                onApply={(v) => onApply(def.id, v)}
              />
            )
          case 'custom':
            return (
              <span key={def.id}>
                {def.render({
                  value,
                  onChange: (v) => onApply(def.id, v),
                })}
              </span>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
