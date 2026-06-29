import { Input } from '#/components/ui/input'
import type { FieldProps } from './form-fields-shared'
import { TextInputFieldShell } from './text-input-field-shell'

export function TextField(props: FieldProps) {
  return (
    <TextInputFieldShell {...props}>
      {(inputProps) => <Input {...inputProps} />}
    </TextInputFieldShell>
  )
}
