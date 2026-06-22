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
import { Textarea } from '#/components/ui/textarea'
import { useSearchAreas } from '#/features/address/hooks'
import type { BiteshipArea } from '#/features/address/model'
import { cn } from '#/lib/utils'
import { useFieldContext } from './form-context-base'
import type { FieldProps } from './form-fields-shared'
import { firstError } from './form-utils'

export type AddressValue = {
  areaId: string
  areaName: string
  streetAddress: string
}

export function AddressField({
  label,
  optional,
  optionalLabel,
  disabled,
  showAreaSearch = true,
}: FieldProps & { showAreaSearch?: boolean }) {
  const field = useFieldContext<AddressValue>()
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

  const value = field.state.value
  const selectedArea: BiteshipArea | null =
    value.areaId && value.areaName
      ? { id: value.areaId, name: value.areaName, area: '' }
      : null

  function handleSearch(searchQuery: string) {
    setQuery(searchQuery)
  }

  function handleSelect(areaId: string) {
    const area = results.find((a) => a.id === areaId) ?? null
    if (area) {
      field.handleChange({
        ...value,
        areaId: area.id,
        areaName: area.name,
      })
    }
    setQuery('')
    setOpen(false)
    field.handleBlur()
  }

  function handleClear() {
    field.handleChange({
      ...value,
      areaId: '',
      areaName: '',
    })
    setQuery('')
    setDebouncedQuery('')
    field.handleBlur()
  }

  function handleStreetChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    field.handleChange({ ...value, streetAddress: e.target.value })
  }

  return (
    <div data-invalid={!!error}>
      {label && (
        <span className="text-sm font-medium">
          {label}
          {optional && optionalLabel && (
            <span className="text-muted-foreground font-normal">
              {optionalLabel}
            </span>
          )}
        </span>
      )}
      <div className="space-y-3 mt-1">
        {showAreaSearch && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <InputGroup>
                <InputGroupText
                  className={cn(
                    'w-full pl-3 cursor-default',
                    selectedArea ? 'text-foreground' : '',
                  )}
                >
                  {selectedArea
                    ? selectedArea.name
                    : t('areaSearchPlaceholder')}
                </InputGroupText>
                <InputGroupAddon align="inline-end" className="cursor-default!">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="cursor-pointer"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleClear()
                    }}
                  >
                    <XIcon
                      className="size-4 opacity-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleClear()
                      }}
                    />
                  </Button>
                </InputGroupAddon>
              </InputGroup>
            </PopoverTrigger>
            <PopoverContent
              className="p-0"
              style={{ width: 'var(--radix-popper-anchor-width)' }}
              align="start"
            >
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder={t('areaSearchPlaceholder')}
                  className="w-full"
                  value={query}
                  onValueChange={handleSearch}
                />
                <CommandList>
                  {isFetching && (
                    <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                      <Spinner className="size-4" />
                      <span>{t('searchingAreas')}</span>
                    </div>
                  )}
                  {!isFetching && !query && (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {t('startTypingToSearch')}
                    </div>
                  )}
                  {!isFetching && query && results.length === 0 && (
                    <CommandEmpty>{t('noResults')}</CommandEmpty>
                  )}
                  {!isFetching && query && results.length > 0 && (
                    <CommandGroup>
                      {results.map((area) => (
                        <CommandItem
                          key={area.id}
                          value={area.id}
                          onSelect={handleSelect}
                        >
                          <div className="flex flex-col">
                            <span>{area.name}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}

        <Textarea
          value={value.streetAddress}
          onChange={handleStreetChange}
          onBlur={field.handleBlur}
          placeholder={t('streetAddressPlaceholder')}
          disabled={disabled}
        />
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
