import { FormLabel } from './form-label'

;('use client')

import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from '#/components/ui/input-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { Spinner } from '#/components/ui/spinner'
import { cn } from '#/lib/utils'

import { useFieldContext } from './form-context-base'
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
  requiredLabel,
  options: staticOptions,
  search,
  searchDelay = 300,
  itemRender,
  onValueChange,
}: ComboboxFieldProps) {
  const field = useFieldContext<string>()
  const error = firstError(field.state.meta.errors)
  const t = useTranslations('combobox')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQueryRef = useRef('')
  const [knownOptions, setKnownOptions] = useState<ComboboxOption[]>([])
  const [isFetching, setIsFetching] = useState(false)

  useEffect(() => {
    if (!query || !search) {
      debouncedQueryRef.current = ''
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      debouncedQueryRef.current = query
      setIsFetching(true)
      search(query).then((results) => {
        if (cancelled) return
        setKnownOptions((prev) => {
          const map = new Map(prev.map((o) => [o.value, o]))
          for (const opt of results) {
            map.set(opt.value, opt)
          }
          return Array.from(map.values())
        })
        if (!cancelled) setIsFetching(false)
      })
    }, searchDelay)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, search, searchDelay])

  const value = field.state.value
  const activeOptions = staticOptions ?? knownOptions
  const clientSide = !!staticOptions
  const filtered = useFiltered(activeOptions, query, clientSide)
  const selectedLabel = value
    ? (activeOptions.find((o) => o.value === value)?.label ?? value)
    : null

  function handleSelect(selectedValue: string) {
    field.handleChange(selectedValue)
    onValueChange?.(selectedValue)
    setQuery('')
    setOpen(false)
    field.handleBlur()
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    field.handleChange('')
    onValueChange?.('')
    setQuery('')
    debouncedQueryRef.current = ''
    field.handleBlur()
  }

  return (
    <div data-invalid={!!error}>
      <FormLabel
        htmlFor={field.name}
        label={label}
        optional={optional}
        optionalLabel={optionalLabel}
        requiredLabel={requiredLabel}
        field={field}
      />
      <div className="mt-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <InputGroup>
              <InputGroupText className={cn('w-full cursor-default pl-3')}>
                {selectedLabel ? (
                  <span className="truncate text-foreground">
                    {selectedLabel}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
              </InputGroupText>
              {value && (
                <InputGroupAddon align="inline-end" className="cursor-default!">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    type="button"
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleClear(e)
                    }}
                  >
                    <XIcon className="size-4 opacity-50 hover:opacity-100" />
                  </Button>
                </InputGroupAddon>
              )}
              <InputGroupAddon align="inline-end" className="cursor-default!">
                <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
              </InputGroupAddon>
            </InputGroup>
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
  requiredLabel,
  options: staticOptions,
  search,
  searchDelay = 300,
  itemRender,
  onValueChange,
}: ComboboxFieldProps) {
  const field = useFieldContext<string[]>()
  const error = firstError(field.state.meta.errors)
  const t = useTranslations('combobox')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQueryRef = useRef('')
  const [knownOptions, setKnownOptions] = useState<ComboboxOption[]>([])
  const [isFetching, setIsFetching] = useState(false)

  useEffect(() => {
    if (!query || !search) {
      debouncedQueryRef.current = ''
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      debouncedQueryRef.current = query
      setIsFetching(true)
      search(query).then((results) => {
        if (cancelled) return
        setKnownOptions((prev) => {
          const map = new Map(prev.map((o) => [o.value, o]))
          for (const opt of results) {
            map.set(opt.value, opt)
          }
          return Array.from(map.values())
        })
        if (!cancelled) setIsFetching(false)
      })
    }, searchDelay)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, search, searchDelay])

  const values = useMemo(() => field.state.value ?? [], [field.state.value])
  const activeOptions = staticOptions ?? knownOptions
  const clientSide = !!staticOptions
  const filtered = useFiltered(activeOptions, query, clientSide)
  const valuesSet = useMemo(() => new Set(values), [values])

  function handleSelect(selectedValue: string) {
    const next = valuesSet.has(selectedValue)
      ? values.filter((v) => v !== selectedValue)
      : [...values, selectedValue]
    field.handleChange(next)
    onValueChange?.(next)
    setQuery('')
    field.handleBlur()
  }

  function handleRemove(removeValue: string, e: React.MouseEvent) {
    e.stopPropagation()
    const next = values.filter((v) => v !== removeValue)
    field.handleChange(next)
    onValueChange?.(next)
    field.handleBlur()
  }

  function getLabel(val: string): string {
    return activeOptions.find((o) => o.value === val)?.label ?? val
  }

  const visible = values.slice(0, 3)
  const overflow = values.length - 3

  return (
    <div data-invalid={!!error}>
      <FormLabel
        htmlFor={field.name}
        label={label}
        optional={optional}
        optionalLabel={optionalLabel}
        requiredLabel={requiredLabel}
        field={field}
      />
      <div className="mt-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <InputGroup>
              <InputGroupText className="cursor-default">
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
                            className="size-3 cursor-pointer"
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
              </InputGroupText>
              <InputGroupAddon align="inline-end" className="cursor-default!">
                <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
              </InputGroupAddon>
            </InputGroup>
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
