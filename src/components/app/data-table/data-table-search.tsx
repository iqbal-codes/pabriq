import { useDebouncedCallback } from '@tanstack/react-pacer'
import { Search } from 'lucide-react'
import { useRef } from 'react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '#/components/ui/input-group'

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
    <InputGroup>
      <InputGroupAddon>
        <Search className="size-4 text-muted-foreground" />
      </InputGroupAddon>
      <InputGroupInput
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
    </InputGroup>
  )
}
