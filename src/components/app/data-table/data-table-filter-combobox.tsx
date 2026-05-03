import { Check, ChevronsUpDown, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
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
import type { FilterOption } from './data-table-utils'

type ComboboxBaseProps = {
  options: FilterOption[]
  placeholder?: string
  emptyLabel?: string
  searchPlaceholder?: string
  noOptionsLabel?: string
}

type SingleComboboxProps = ComboboxBaseProps & {
  mode: 'single'
  value: string | null
  onChange: (value: string | null) => void
}

type MultiComboboxProps = ComboboxBaseProps & {
  mode: 'multi'
  value: string[]
  onChange: (value: string[]) => void
}

type DataTableFilterComboboxProps = SingleComboboxProps | MultiComboboxProps

function useOptions(options: FilterOption[], search: string) {
  return useMemo(() => {
    if (!search) return options
    const q = search.toLowerCase()
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    )
  }, [options, search])
}

export function DataTableFilterCombobox(props: DataTableFilterComboboxProps) {
  const {
    options,
    placeholder,
    emptyLabel,
    searchPlaceholder,
    noOptionsLabel,
  } = props
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = useOptions(options, search)

  if (props.mode === 'single') {
    const { value, onChange, mode: _m } = props
    const selectedLabel = value
      ? (options.find((o) => o.value === value)?.label ?? value)
      : null

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selectedLabel ? (
              <span className="truncate">{selectedLabel}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {noOptionsLabel ?? emptyLabel ?? 'No options'}
              </CommandEmpty>
              <CommandGroup>
                {filtered.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={(v) => {
                      onChange(v === value ? null : v)
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

  const { value, onChange, mode: _m2 } = props as MultiComboboxProps

  const removeValue = (v: string) => {
    onChange(value.filter((x) => x !== v))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex h-auto min-h-10 w-full justify-between gap-1.5 py-2 font-normal"
        >
          <div className="flex flex-wrap gap-1">
            {value.length > 0 ? (
              value.slice(0, 3).map((v) => (
                <Badge
                  key={v}
                  variant="secondary"
                  className="gap-1 whitespace-nowrap"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeValue(v)
                  }}
                >
                  {options.find((o) => o.value === v)?.label ?? v}
                  <X className="size-3" />
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            {value.length > 3 && (
              <Badge variant="secondary">+{value.length - 3}</Badge>
            )}
          </div>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {noOptionsLabel ?? emptyLabel ?? 'No options'}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((opt) => {
                const isSelected = value.includes(opt.value)
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => {
                      onChange(
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
