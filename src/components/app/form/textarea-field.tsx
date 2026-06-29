import { Textarea } from '#/components/ui/textarea'
import type { FieldProps } from './form-fields-shared'
import { TextInputFieldShell } from './text-input-field-shell'

export function TextareaField(props: FieldProps) {
  return (
    <TextInputFieldShell {...props}>
      {(inputProps) => <Textarea {...inputProps} />}
    </TextInputFieldShell>
  )
}
