import { Input } from '#/components/ui/input'
import type { FieldProps } from './form-fields-shared'
import { TextInputFieldShell } from './text-input-field-shell'

export function PasswordField({
  autoComplete = 'current-password',
  ...rest
}: FieldProps) {
  return (
    <TextInputFieldShell {...rest} autoComplete={autoComplete}>
      {(inputProps) => <Input {...inputProps} type="password" />}
    </TextInputFieldShell>
  )
}
