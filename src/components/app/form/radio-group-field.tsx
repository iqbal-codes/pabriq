import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { RadioGroupItem } from '#/components/ui/radio-group'
import { cn } from '#/lib/utils'
import { useFieldContext } from './form-context'
import type { FieldProps, SelectOption } from './form-fields-shared'
import { firstError } from './form-utils'

function RadioGroupField({
  label,
  optional,
  optionalLabel,
  disabled,
  options,
  layout = 'vertical',
}: FieldProps & {
  options: SelectOption[]
  layout?: 'vertical' | 'horizontal'
}) {
  const field = useFieldContext<string>()
  const error = firstError(field.state.meta.errors)

  return (
    <div data-invalid={!!error}>
      {label && (
        <span className="text-sm font-medium">
          {label}
          {optional && optionalLabel && (
            <span className="text-muted-foreground font-normal">
              {optionalLabel}
            </span>
          )}
        </span>
      )}
      <RadioGroupPrimitive.Root
        className={cn(
          'mt-1',
          layout === 'horizontal' ? 'flex gap-6' : 'grid gap-3',
        )}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
        onBlur={() => field.handleBlur()}
        disabled={disabled}
      >
        {options.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <RadioGroupItem
              value={opt.value}
              id={`${field.name}-${opt.value}`}
            />
            <label
              htmlFor={`${field.name}-${opt.value}`}
              className="text-sm cursor-pointer"
            >
              {opt.label}
            </label>
          </div>
        ))}
      </RadioGroupPrimitive.Root>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}

function RadioCardField({
  label,
  optional,
  optionalLabel,
  disabled,
  options,
  cols = 3,
}: FieldProps & { options: SelectOption[]; cols?: number }) {
  const field = useFieldContext<string>()
  const error = firstError(field.state.meta.errors)

  return (
    <div data-invalid={!!error}>
      {label && (
        <span className="text-sm font-medium">
          {label}
          {optional && optionalLabel && (
            <span className="text-muted-foreground font-normal">
              {optionalLabel}
            </span>
          )}
        </span>
      )}
      <RadioGroupPrimitive.Root
        className="mt-1 grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
        onBlur={() => field.handleBlur()}
        disabled={disabled}
      >
        {options.map((opt) => (
          <RadioGroupPrimitive.Item
            key={opt.value}
            value={opt.value}
            disabled={disabled}
            className="rounded-lg px-3 py-2 ring-[1px] ring-border data-[state=checked]:ring-2 data-[state=checked]:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 transition-[color,box-shadow]"
          >
            <span className="font-semibold tracking-tight text-sm">
              {opt.label}
            </span>
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}

export { RadioCardField, RadioGroupField }
