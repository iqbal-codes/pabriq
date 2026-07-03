import type { ChangeEvent, ReactElement, ReactNode } from 'react'
import { useFieldContext } from './form-context-base'
import type { FieldProps } from './form-fields-shared'
import { FormLabel } from './form-label'
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
  requiredLabel,
  disabled,
  autoComplete,
  children,
}: TextInputFieldShellProps): ReactElement {
  const field = useFieldContext<string>()
  const error = firstError(field.state.meta.errors)

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
