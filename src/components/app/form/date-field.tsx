import {
  addDays,
  endOfMonth,
  isSameDay,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import { CalendarIcon, ChevronDown, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { useLocale, useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { cn } from '#/lib/utils'
import { useFieldContext } from './form-context-base'
import type { FieldProps } from './form-fields-shared'
import { FormLabel } from './form-label'
import { firstError } from './form-utils'

export type DateRangeLike = {
  from: string | Date | null | undefined
  to?: string | Date | null | undefined
}

export type DateFieldValue =
  | string
  | Date
  | DateRange
  | DateRangeLike
  | null
  | undefined

export type DateFieldProps = FieldProps & {
  mode?: 'single' | 'range'
  enableDropdowns?: boolean
  presets?: boolean | Array<{ label: string; value: Date | DateRange }>
  valueFormat?: 'string' | 'date'
  calendarProps?: Omit<
    React.ComponentProps<typeof Calendar>,
    'mode' | 'selected' | 'onSelect' | 'captionLayout' | 'disabled'
  >
}

function parseDateString(val: string): Date | undefined {
  if (!val) return undefined
  const parts = val.split('-')
  if (parts.length !== 3) return undefined
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10) - 1
  const d = parseInt(parts[2], 10)
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return undefined
  return new Date(y, m, d)
}

function formatDateToString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isDateRangeLike(val: unknown): val is DateRangeLike {
  if (val && typeof val === 'object') {
    return 'from' in val
  }
  return false
}

function parseDateValue(
  val: DateFieldValue,
  mode: 'single' | 'range',
): Date | DateRange | undefined {
  if (!val) return undefined

  if (mode === 'single') {
    if (val instanceof Date) return val
    if (typeof val === 'string') return parseDateString(val)
    if (isDateRangeLike(val)) {
      const from = val.from
      return typeof from === 'string'
        ? parseDateString(from)
        : from instanceof Date
          ? from
          : undefined
    }
    return undefined
  }

  if (isDateRangeLike(val)) {
    const from =
      typeof val.from === 'string'
        ? parseDateString(val.from)
        : val.from instanceof Date
          ? val.from
          : undefined
    const to =
      typeof val.to === 'string'
        ? parseDateString(val.to)
        : val.to instanceof Date
          ? val.to
          : undefined
    return { from, to } as DateRange
  }
  return undefined
}

export function DateField({
  label,
  placeholder,
  optional,
  optionalLabel,
  requiredLabel,
  disabled,
  mode = 'single',
  enableDropdowns = true,
  presets = false,
  valueFormat,
  calendarProps,
}: DateFieldProps) {
  const field = useFieldContext<DateFieldValue>()
  const error = firstError(field.state.meta.errors)
  const locale = useLocale()
  const t = useTranslations('dateField')
  const dateFormatterLong = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [locale],
  )
  const dateFormatterShort = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    [locale],
  )

  const [open, setOpen] = useState(false)

  const parsedValue = useMemo(() => {
    return parseDateValue(field.state.value, mode)
  }, [field.state.value, mode])

  const parsedSingleValue = mode === 'single' ? (parsedValue as Date | undefined) : undefined

  const parsedRangeValue = mode === 'range' ? (parsedValue as DateRange | undefined) : undefined

  const isStringValue = useMemo(() => {
    if (valueFormat === 'string') return true
    if (valueFormat === 'date') return false
    const val = field.state.value
    if (typeof val === 'string') return true
    if (isDateRangeLike(val) && typeof val.from === 'string') {
      return true
    }
    return false
  }, [field.state.value, valueFormat])

  const serverLabel =
    mode === 'single'
      ? (placeholder || t('pickDate'))
      : (placeholder || t('pickDateRange'))
  const [formattedLabel, setFormattedLabel] = useState(serverLabel)
  useEffect(() => {
    if (mode === 'single') {
      const val = parsedSingleValue
      if (!val) {
        setFormattedLabel(placeholder || t('pickDate'))
        return
      }
      setFormattedLabel(dateFormatterLong.format(val))
    } else {
      const val = parsedRangeValue
      if (!val?.from) {
        setFormattedLabel(placeholder || t('pickDateRange'))
        return
      }
      const fromStr = dateFormatterShort.format(val.from)
      if (!val.to) {
        setFormattedLabel(fromStr)
        return
      }
      const toStr = dateFormatterShort.format(val.to)
      setFormattedLabel(`${fromStr} - ${toStr}`)
    }
  }, [parsedSingleValue, parsedRangeValue, mode, placeholder, t, locale])

  const today = startOfDay(new Date())

  const defaultPresets = useMemo(() => {
    if (mode === 'single') {
      return [
        { label: t('today'), value: today },
        { label: t('yesterday'), value: subDays(today, 1) },
        { label: t('tomorrow'), value: addDays(today, 1) },
        { label: t('nextWeek'), value: addDays(today, 7) },
      ]
    }
    return [
      { label: t('today'), value: { from: today, to: today } },
      {
        label: t('yesterday'),
        value: { from: subDays(today, 1), to: subDays(today, 1) },
      },
      { label: t('last7Days'), value: { from: subDays(today, 6), to: today } },
      {
        label: t('last30Days'),
        value: { from: subDays(today, 29), to: today },
      },
      {
        label: t('thisMonth'),
        value: { from: startOfMonth(today), to: endOfMonth(today) },
      },
      {
        label: t('lastMonth'),
        value: {
          from: startOfMonth(subMonths(today, 1)),
          to: endOfMonth(subMonths(today, 1)),
        },
      },
    ]
  }, [mode, today, t])

  const presetItems = Array.isArray(presets) ? presets : presets === true ? defaultPresets : []

  const showPresets = presetItems.length > 0

  const checkPresetActive = (presetVal: Date | DateRange) => {
    if (mode === 'single') {
      if (!(presetVal instanceof Date)) return false
      if (!parsedSingleValue) return false
      return isSameDay(presetVal, parsedSingleValue)
    }

    if (presetVal instanceof Date) return false
    if (!parsedRangeValue?.from || !parsedRangeValue.to) return false
    if (!presetVal.from || !presetVal.to) return false
    return (
      isSameDay(presetVal.from, parsedRangeValue.from) &&
      isSameDay(presetVal.to, parsedRangeValue.to)
    )
  }

  const handleSelectSingle = (date: Date | undefined) => {
    if (!date) {
      field.handleChange(isStringValue ? '' : undefined)
      setOpen(false)
      return
    }

    if (isStringValue) {
      field.handleChange(formatDateToString(date))
    } else {
      field.handleChange(date)
    }
    setOpen(false)
  }

  const handleSelectRange = (range: DateRange | undefined) => {
    if (!range) {
      field.handleChange(undefined)
      return
    }

    if (isStringValue) {
      const fromStr = range.from ? formatDateToString(range.from) : undefined
      const toStr = range.to ? formatDateToString(range.to) : undefined
      field.handleChange({ from: fromStr, to: toStr })
    } else {
      field.handleChange(range)
    }
  }

  const handlePresetClick = (presetVal: Date | DateRange) => {
    if (mode === 'single') {
      if (presetVal instanceof Date) {
        handleSelectSingle(presetVal)
      }
    } else {
      if (!(presetVal instanceof Date)) {
        handleSelectRange(presetVal)
      }
    }
  }

  const handleClear = () => {
    if (mode === 'single') {
      field.handleChange(isStringValue ? '' : undefined)
    } else {
      field.handleChange(undefined)
    }
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
            <Button
              id={field.name}
              variant="outline"
              disabled={disabled}
              className={cn(
                'w-full justify-start text-left font-normal h-10 px-3 border border-input shadow-xs hover:bg-accent hover:text-accent-foreground select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                !parsedValue && 'text-muted-foreground',
                error &&
                  'border-destructive ring-destructive/20 focus-visible:border-destructive focus-visible:ring-destructive/20',
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
              <span className="truncate flex-1">{formattedLabel}</span>
              {parsedValue && !disabled && (
                <button
                  type="button"
                  className="ml-auto p-1 rounded-sm opacity-70 hover:opacity-100 focus:outline-hidden hover:bg-accent/80 select-none cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear()
                  }}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">{t('clear')}</span>
                </button>
              )}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex flex-col sm:flex-row sm:divide-x divide-border">
              {showPresets && (
                <div className="flex flex-row sm:flex-col gap-1 p-2 sm:w-40 overflow-x-auto sm:overflow-x-visible shrink-0 max-sm:border-b max-sm:border-border sm:max-h-[350px] sm:overflow-y-auto">
                  {presetItems.map((preset) => {
                    const isActive = checkPresetActive(preset.value)
                    return (
                      <Button
                        key={preset.label}
                        type="button"
                        variant="ghost"
                        size="xs"
                        className={cn(
                          'justify-start text-xs font-normal whitespace-nowrap',
                          isActive &&
                            'bg-accent text-accent-foreground font-medium',
                        )}
                        onClick={() => handlePresetClick(preset.value)}
                      >
                        {preset.label}
                      </Button>
                    )
                  })}
                </div>
              )}
              <div className="p-3">
                {mode === 'single' ? (
                  <Calendar
                    mode="single"
                    selected={parsedSingleValue}
                    onSelect={handleSelectSingle}
                    defaultMonth={parsedSingleValue}
                    captionLayout={enableDropdowns ? 'dropdown' : 'label'}
                    disabled={disabled}
                    {...calendarProps}
                  />
                ) : (
                  <Calendar
                    mode="range"
                    selected={parsedRangeValue}
                    onSelect={handleSelectRange}
                    defaultMonth={parsedRangeValue?.from}
                    captionLayout={enableDropdowns ? 'dropdown' : 'label'}
                    disabled={disabled}
                    {...calendarProps}
                  />
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
