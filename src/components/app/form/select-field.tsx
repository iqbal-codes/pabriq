import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { useFieldContext } from './form-context-base'
import type { FieldProps, SelectOption } from './form-fields-shared'
import { FormLabel } from './form-label'
import { firstError } from './form-utils'

export function SelectField({
  label,
  placeholder,
  optional,
  optionalLabel,
  requiredLabel,
  disabled,
  options,
  onValueChange,
}: FieldProps & {
  options: SelectOption[]
  onValueChange?: (value: string) => void
}) {
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
        <Select
          name={field.name}
          value={field.state.value || ''}
          onValueChange={(value) => {
            field.handleChange(value)
            onValueChange?.(value)
          }}
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
