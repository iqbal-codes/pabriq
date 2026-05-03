import { format } from 'date-fns'
import { CalendarIcon, X } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { cn } from '#/lib/utils'
import type { DateRangeValue } from './data-table-utils'

const DATE_FMT = 'yyyy-MM-dd'
const DISPLAY_FMT = 'MMM d, yyyy'

type DateSingleProps = {
  mode: 'single'
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
}

type DateRangeProps = {
  mode: 'range'
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
  placeholder?: string
}

type DataTableFilterDateProps = DateSingleProps | DateRangeProps

function SingleDateFilter({
  value,
  onChange,
  placeholder,
  mode: _m,
}: DateSingleProps) {
  const date = useMemo(
    () => (value ? new Date(`${value}T00:00:00`) : undefined),
    [value],
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start gap-2 font-normal',
            !value && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="size-4" />
          {date ? format(date, DISPLAY_FMT) : placeholder}
          {value && (
            <X
              className="ml-auto size-4 shrink-0 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onChange(null)
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onChange(d ? format(d, DATE_FMT) : null)
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

function RangeDateFilter({
  value,
  onChange,
  placeholder,
  mode: _m,
}: DateRangeProps) {
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
    return ''
  }, [value.from, value.to])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start gap-2 font-normal',
            !displayText && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="size-4" />
          {displayText || placeholder}
          {displayText && (
            <X
              className="ml-auto size-4 shrink-0 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onChange({ from: null, to: null })
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={(r) => {
            onChange({
              from: r?.from ? format(r.from, DATE_FMT) : null,
              to: r?.to ? format(r.to, DATE_FMT) : null,
            })
          }}
          initialFocus
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}

export function DataTableFilterDate(props: DataTableFilterDateProps) {
  if (props.mode === 'single') {
    return <SingleDateFilter {...props} />
  }
  return <RangeDateFilter {...props} />
}
