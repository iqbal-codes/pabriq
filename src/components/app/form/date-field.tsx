import { Input } from '#/components/ui/input'
import { useFieldContext } from './form-context-base'
import type { FieldProps } from './form-fields-shared'
import { firstError } from './form-utils'

export function DateField({
  label,
  placeholder,
  optional,
  optionalLabel,
  disabled,
}: FieldProps) {
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
        <Input
          id={field.name}
          name={field.name}
          type="date"
          value={field.state.value ?? ''}
          onChange={(e) => field.handleChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
        />
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
