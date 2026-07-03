import { useTranslations } from 'use-intl'
import { isFieldRequired } from './form-utils'

type FormLabelProps = {
  htmlFor?: string
  label?: string
  optional?: boolean
  optionalLabel?: string
  requiredLabel?: string
  field: unknown
}

export function FormLabel({
  htmlFor,
  label,
  optional,
  optionalLabel,
  requiredLabel,
  field,
}: FormLabelProps) {
  const t = useTranslations('common')

  if (!label) return null

  const isRequired = optional === undefined ? isFieldRequired(field) : !optional

  const content = (
    <>
      {label}
      {isRequired ? (
        requiredLabel ? (
          <span className="text-muted-foreground font-normal">
            {requiredLabel}
          </span>
        ) : (
          <span className="text-destructive ml-0.5" title={t('required')}>
            *
          </span>
        )
      ) : (
        optional &&
        optionalLabel && (
          <span className="text-muted-foreground font-normal">
            {optionalLabel}
          </span>
        )
      )}
    </>
  )

  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {content}
      </label>
    )
  }

  return <span className="text-sm font-medium">{content}</span>
}
