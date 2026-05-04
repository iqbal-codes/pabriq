import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '#/components/ui/input-group'
import { useFieldContext } from './form-context'
import type { FieldProps, NumberFieldCallbacks } from './form-fields-shared'
import { firstError, formatPhone, stripNonDigits } from './form-utils'

export function PhoneField({
  label,
  placeholder,
  optional,
  optionalLabel,
  disabled,
  autoComplete = 'tel',
  onValueChange,
  onBlurValue,
}: FieldProps & NumberFieldCallbacks<string>) {
  const field = useFieldContext<string>()
  const error = firstError(field.state.meta.errors)
  const displayValue = field.state.value
    ? formatPhone(field.state.value)
    : field.state.value

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
        <InputGroup>
          <InputGroupAddon>+62</InputGroupAddon>
          <InputGroupInput
            id={field.name}
            name={field.name}
            type="tel"
            autoComplete={autoComplete}
            value={displayValue}
            onChange={(e) => {
              const raw = stripNonDigits(e.target.value)
              field.handleChange(raw)
              onValueChange?.({
                rawValue: raw,
                displayValue: e.target.value,
                field,
              })
            }}
            onBlur={(e) => {
              field.handleBlur()
              const raw = stripNonDigits(e.target.value)
              const display = formatPhone(raw)
              onBlurValue?.({ rawValue: raw, displayValue: display, field })
            }}
            placeholder={placeholder}
            disabled={disabled}
          />
        </InputGroup>
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
