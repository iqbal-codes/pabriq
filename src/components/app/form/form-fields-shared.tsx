import { useFieldContext } from './form-context'
import { firstError } from './form-utils'

export type FieldProps = {
  label?: string
  placeholder?: string
  optional?: boolean
  optionalLabel?: string
  disabled?: boolean
  autoComplete?: string
}

export type SelectOption = { value: string; label: string }

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

export function BaseField({
  label,
  optional,
  optionalLabel,
  children,
}: FieldProps & { children: React.ReactNode }) {
  const field = useFieldContext<string>()
  const error = firstError(field.state.meta.errors)

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
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
