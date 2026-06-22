import { useDebouncedCallback } from '@tanstack/react-pacer'
import { useRef } from 'react'
import { Input } from '#/components/ui/input'

type DataTableSearchProps = {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  debounceMs?: number
}

export function DataTableSearch({
  placeholder,
  value,
  onChange,
  debounceMs = 300,
}: DataTableSearchProps) {
  const prevValue = useRef(value)

  const debouncedOnChange = useDebouncedCallback(
    (val: string) => {
      onChange(val)
    },
    { wait: debounceMs },
  )

  return (
    <Input
      key={value}
      placeholder={placeholder}
      defaultValue={value}
      onChange={(e) => {
        debouncedOnChange(e.target.value)
      }}
      onBlur={(e) => {
        if (e.target.value !== prevValue.current) {
          prevValue.current = e.target.value
          onChange(e.target.value)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          prevValue.current = e.currentTarget.value
          onChange(e.currentTarget.value)
        }
      }}
    />
  )
}
