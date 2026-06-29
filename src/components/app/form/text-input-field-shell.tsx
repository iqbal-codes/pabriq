import type { ChangeEvent, ReactElement, ReactNode } from 'react'
import { useFieldContext } from './form-context-base'
import type { FieldProps } from './form-fields-shared'
import { firstError } from './form-utils'

export type TextInputFieldShellProps = FieldProps & {
  children: (props: {
    id: string
    name: string
    value: string
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
    onBlur: () => void
    placeholder?: string
    disabled?: boolean
    autoComplete?: string
  }) => ReactNode
}

export function TextInputFieldShell({
  label,
  placeholder,
  optional,
  optionalLabel,
  disabled,
  autoComplete,
  children,
}: TextInputFieldShellProps): ReactElement {
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
      <div className="mt-1">
        {children({
          id: field.name,
          name: field.name,
          value: field.state.value,
          onChange: (e) => field.handleChange(e.target.value),
          onBlur: field.handleBlur,
          placeholder,
          disabled,
          autoComplete,
        })}
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
