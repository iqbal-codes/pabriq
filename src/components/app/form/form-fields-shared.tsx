import type { useFieldContext } from './form-context-base'

export type FieldProps = {
  label?: string
  placeholder?: string
  optional?: boolean
  optionalLabel?: string
  disabled?: boolean
  autoComplete?: string
}

export type SelectOption = { value: string; label: string }

export type ComboboxOption = {
  value: string
  label: string
  description?: string
  [key: string]: unknown
}

export type ComboboxFieldProps = FieldProps & {
  mode?: 'single' | 'multi'
  options?: ComboboxOption[]
  search?: (query: string) => Promise<ComboboxOption[]>
  searchDelay?: number
  itemRender?: (option: ComboboxOption, isSelected: boolean) => React.ReactNode
  onValueChange?: (value: string | string[]) => void
}

export type NumberFieldCallbacks<TValue = number> = {
  onValueChange?: (params: {
    rawValue: string
    displayValue: string
    field: ReturnType<typeof useFieldContext<TValue>>
  }) => void
  onBlurValue?: (params: {
    rawValue: string
    displayValue: string
    field: ReturnType<typeof useFieldContext<TValue>>
  }) => void
}

export type AreaSearchFieldProps = FieldProps & {
  value: import('#/features/address/model').BiteshipArea | null
  onChange: (
    area: import('#/features/address/model').BiteshipArea | null,
  ) => void
}
