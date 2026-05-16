import { XIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslations } from 'use-intl'

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
import { useSearchAreas } from '#/features/address/hooks'
import { useFieldContext } from './form-context'
import type { AreaSearchFieldProps } from './form-fields-shared'
import { firstError } from './form-utils'

export function AreaSearchField({
  label,
  placeholder,
  optional,
  optionalLabel,
  disabled,
  value,
  onChange,
}: AreaSearchFieldProps) {
  const field = useFieldContext<string>()
  const error = firstError(field.state.meta.errors)
  const t = useTranslations('address')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: results = [], isFetching } = useSearchAreas(debouncedQuery)

  function handleSearch(searchQuery: string) {
    setQuery(searchQuery)
  }

  function handleSelect(areaId: string) {
    const area = results.find((a) => a.id === areaId) ?? null
    onChange(area)
    setQuery('')
    setOpen(false)
    field.handleBlur()
  }

  function handleClear() {
    onChange(null)
    setQuery('')
    setDebouncedQuery('')
    field.handleBlur()
  }

  return (
    <div data-invalid={!!error}>
      {label && (
        <label htmlFor={field.name} className="text-sm font-medium">
          {label}
          {optional && optionalLabel && (
            <span className="text-muted-foreground font-normal">
              {optionalLabel}
            </span>
          )}
        </label>
      )}
      <div className="mt-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-controls={open ? 'area-search-listbox' : undefined}
              className="w-full justify-between font-normal"
              aria-haspopup="listbox"
              disabled={disabled}
            >
              {value ? (
                <span className="truncate">{value.name}</span>
              ) : (
                <span className="text-muted-foreground">
                  {placeholder ?? t('areaSearchPlaceholder')}
                </span>
              )}
              <XIcon
                className="size-4 opacity-50"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[--radix-popover-trigger-width] p-0"
            align="start"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={t('areaSearchPlaceholder')}
                value={query}
                onValueChange={handleSearch}
              />
              <CommandList id="area-search-listbox">
                {isFetching && (
                  <div className="p-2 text-sm text-muted-foreground">...</div>
                )}
                {!isFetching && query && results.length === 0 && (
                  <CommandEmpty>{t('noResults')}</CommandEmpty>
                )}
                <CommandGroup>
                  {results.map((area) => (
                    <CommandItem
                      key={area.id}
                      value={area.id}
                      onSelect={handleSelect}
                    >
                      <div className="flex flex-col">
                        <span>{area.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {area.area}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
