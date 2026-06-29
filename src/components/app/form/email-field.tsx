import { Input } from '#/components/ui/input'
import type { FieldProps } from './form-fields-shared'
import { TextInputFieldShell } from './text-input-field-shell'

export function EmailField({ autoComplete = 'email', ...rest }: FieldProps) {
  return (
    <TextInputFieldShell {...rest} autoComplete={autoComplete}>
      {(inputProps) => <Input {...inputProps} type="email" />}
    </TextInputFieldShell>
  )
}
