import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { useFieldContext } from './form-context'
import type { FieldProps, SelectOption } from './form-fields-shared'
import { firstError } from './form-utils'

export function SelectField({
  label,
  placeholder,
  optional,
  optionalLabel,
  disabled,
  options,
}: FieldProps & { options: SelectOption[] }) {
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
        <Select
          name={field.name}
          value={field.state.value || ''}
          onValueChange={(value) => field.handleChange(value)}
          onOpenChange={(open) => {
            if (!open) field.handleBlur()
          }}
          disabled={disabled}
        >
          <SelectTrigger id={field.name} className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
