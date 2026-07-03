import { Checkbox } from '#/components/ui/checkbox'
import { cn } from '#/lib/utils'
import { useFieldContext } from './form-context-base'
import type { FieldProps, SelectOption } from './form-fields-shared'
import { FormLabel } from './form-label'
import { firstError } from './form-utils'

function CheckboxGroupField({
  label,
  optional,
  optionalLabel,
  requiredLabel,
  disabled,
  options,
  layout = 'vertical',
}: FieldProps & {
  options: SelectOption[]
  layout?: 'vertical' | 'horizontal'
}) {
  const field = useFieldContext<string[]>()
  const error = firstError(field.state.meta.errors)
  const values = field.state.value ?? []

  function handleToggle(optionValue: string) {
    const next = values.includes(optionValue)
      ? values.filter((v) => v !== optionValue)
      : [...values, optionValue]
    field.handleChange(next)
  }

  return (
    <div data-invalid={!!error}>
      <FormLabel
        label={label}
        optional={optional}
        optionalLabel={optionalLabel}
        requiredLabel={requiredLabel}
        field={field}
      />
      <fieldset
        className={cn(
          'mt-1',
          layout === 'horizontal' ? 'flex gap-6' : 'grid gap-3',
        )}
        onBlur={() => field.handleBlur()}
      >
        {options.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <Checkbox
              id={`${field.name}-${opt.value}`}
              checked={values.includes(opt.value)}
              onCheckedChange={() => handleToggle(opt.value)}
              disabled={disabled}
            />
            <label
              htmlFor={`${field.name}-${opt.value}`}
              className="text-sm cursor-pointer"
            >
              {opt.label}
            </label>
          </div>
        ))}
      </fieldset>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}

export { CheckboxGroupField }
