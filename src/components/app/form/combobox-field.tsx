'use client'

import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'use-intl'

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
import { Spinner } from '#/components/ui/spinner'
import { cn } from '#/lib/utils'

import { useFieldContext } from './form-context'
import type { ComboboxFieldProps, ComboboxOption } from './form-fields-shared'
import { firstError } from './form-utils'

function useFiltered(
  options: ComboboxOption[],
  query: string,
  clientSide: boolean,
) {
  return useMemo(() => {
    if (!clientSide || !query) return options
    const q = query.toLowerCase()
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    )
  }, [options, query, clientSide])
}

function defaultItemRender(opt: ComboboxOption) {
  return (
    <div className="flex flex-col">
      <span>{opt.label}</span>
      {opt.description && (
        <span className="text-xs text-muted-foreground">{opt.description}</span>
      )}
    </div>
  )
}

function ComboboxFieldSingle({
  label,
  placeholder,
  optional,
  optionalLabel,
  disabled,
  options: staticOptions,
  search,
  searchDelay = 300,
  itemRender,
}: ComboboxFieldProps) {
  const field = useFieldContext<string>()
  const error = firstError(field.state.meta.errors)
  const t = useTranslations('combobox')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [knownOptions, setKnownOptions] = useState<ComboboxOption[]>([])
  const [isFetching, setIsFetching] = useState(false)

  useEffect(() => {
    if (staticOptions) {
      setKnownOptions(staticOptions)
    }
  }, [staticOptions])

  useEffect(() => {
    if (!search || !debouncedQuery) return
    let cancelled = false
    setIsFetching(true)
    search(debouncedQuery).then((results) => {
      if (cancelled) return
      setKnownOptions((prev) => {
        const map = new Map(prev.map((o) => [o.value, o]))
        for (const opt of results) {
          map.set(opt.value, opt)
        }
        return Array.from(map.values())
      })
      setIsFetching(false)
    })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, search])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), searchDelay)
    return () => clearTimeout(timer)
  }, [query, searchDelay])

  const value = field.state.value
  const activeOptions = staticOptions ?? knownOptions
  const clientSide = !!staticOptions
  const filtered = useFiltered(activeOptions, query, clientSide)
  const selectedLabel = value
    ? (knownOptions.find((o) => o.value === value)?.label ?? value)
    : null

  function handleSelect(selectedValue: string) {
    field.handleChange(selectedValue)
    setQuery('')
    setOpen(false)
    field.handleBlur()
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    field.handleChange('')
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
              className="w-full justify-between font-normal"
              disabled={disabled}
            >
              {selectedLabel ? (
                <span className="truncate">{selectedLabel}</span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              {value ? (
                <XIcon
                  className="size-4 shrink-0 opacity-50"
                  onClick={handleClear}
                />
              ) : (
                <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0"
            style={{ width: 'var(--radix-popover-trigger-width)' }}
            align="start"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={placeholder ?? t('searchPlaceholder')}
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                {isFetching && (
                  <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                    <Spinner className="size-4" />
                    <span>{t('loading')}</span>
                  </div>
                )}
                {!isFetching && query && search && filtered.length === 0 && (
                  <CommandEmpty>{t('noResults')}</CommandEmpty>
                )}
                {filtered.length > 0 && (
                  <CommandGroup>
                    {filtered.map((opt) => (
                      <CommandItem
                        key={opt.value}
                        value={opt.value}
                        onSelect={() => handleSelect(opt.value)}
                      >
                        <div className="flex-1">
                          {itemRender
                            ? itemRender(opt, value === opt.value)
                            : defaultItemRender(opt)}
                        </div>
                        <CheckIcon
                          className={cn(
                            'mx-2 size-4',
                            value === opt.value ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}

function ComboboxFieldMulti({
  label,
  placeholder,
  optional,
  optionalLabel,
  disabled,
  options: staticOptions,
  search,
  searchDelay = 300,
  itemRender,
}: ComboboxFieldProps) {
  const field = useFieldContext<string[]>()
  const error = firstError(field.state.meta.errors)
  const t = useTranslations('combobox')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [knownOptions, setKnownOptions] = useState<ComboboxOption[]>([])
  const [isFetching, setIsFetching] = useState(false)

  useEffect(() => {
    if (staticOptions) {
      setKnownOptions(staticOptions)
    }
  }, [staticOptions])

  useEffect(() => {
    if (!search || !debouncedQuery) return
    let cancelled = false
    setIsFetching(true)
    search(debouncedQuery).then((results) => {
      if (cancelled) return
      setKnownOptions((prev) => {
        const map = new Map(prev.map((o) => [o.value, o]))
        for (const opt of results) {
          map.set(opt.value, opt)
        }
        return Array.from(map.values())
      })
      setIsFetching(false)
    })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, search])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), searchDelay)
    return () => clearTimeout(timer)
  }, [query, searchDelay])

  const values = field.state.value ?? []
  const activeOptions = staticOptions ?? knownOptions
  const clientSide = !!staticOptions
  const filtered = useFiltered(activeOptions, query, clientSide)

  function handleSelect(selectedValue: string) {
    const next = values.includes(selectedValue)
      ? values.filter((v) => v !== selectedValue)
      : [...values, selectedValue]
    field.handleChange(next)
    setQuery('')
    field.handleBlur()
  }

  function handleRemove(removeValue: string, e: React.MouseEvent) {
    e.stopPropagation()
    field.handleChange(values.filter((v) => v !== removeValue))
    field.handleBlur()
  }

  function getLabel(val: string): string {
    return knownOptions.find((o) => o.value === val)?.label ?? val
  }

  const visible = values.slice(0, 3)
  const overflow = values.length - 3

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
              className="flex h-auto min-h-10 w-full justify-between gap-1.5 py-2 font-normal"
              disabled={disabled}
            >
              <div className="flex flex-wrap gap-1">
                {values.length > 0 ? (
                  <>
                    {visible.map((v) => (
                      <Badge
                        key={v}
                        variant="secondary"
                        className="gap-1 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {getLabel(v)}
                        <XIcon
                          className="size-3"
                          onClick={(e) => handleRemove(v, e)}
                        />
                      </Badge>
                    ))}
                    {overflow > 0 && (
                      <Badge variant="secondary">+{overflow}</Badge>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
              </div>
              <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[--radix-popover-trigger-width] p-0"
            align="start"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={placeholder ?? t('searchPlaceholder')}
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                {isFetching && (
                  <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                    <Spinner className="size-4" />
                    <span>{t('loading')}</span>
                  </div>
                )}
                {!isFetching && query && search && filtered.length === 0 && (
                  <CommandEmpty>{t('noResults')}</CommandEmpty>
                )}
                {filtered.length > 0 && (
                  <CommandGroup>
                    {filtered.map((opt) => {
                      const isSelected = values.includes(opt.value)
                      return (
                        <CommandItem
                          key={opt.value}
                          value={opt.value}
                          onSelect={() => handleSelect(opt.value)}
                        >
                          <CheckIcon
                            className={cn(
                              'mr-2 size-4',
                              isSelected ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {itemRender
                            ? itemRender(opt, isSelected)
                            : defaultItemRender(opt)}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}

export function ComboboxField(props: ComboboxFieldProps) {
  if (props.mode === 'multi') {
    return <ComboboxFieldMulti {...props} />
  }

  return <ComboboxFieldSingle {...props} />
}
