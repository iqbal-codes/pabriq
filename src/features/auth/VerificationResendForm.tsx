import { type ReactElement, useState } from 'react'
import { useTranslations } from 'use-intl'
import { useAppForm } from '#/components/app/form'
import { authClient } from '#/lib/auth-client'
import { buildVerificationCallbackUrl } from './route-guards'

type VerificationResendFormProps = { initialEmail?: string }

export default function VerificationResendForm({
  initialEmail,
}: VerificationResendFormProps): ReactElement {
  const t = useTranslations('auth')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useAppForm({
    defaultValues: { email: initialEmail ?? '' },
    onSubmit: async ({ value }) => {
      setError(null)
      const result = await authClient.sendVerificationEmail({
        email: value.email,
        callbackURL: buildVerificationCallbackUrl(value.email),
      })
      if (result.error) {
        setError(result.error.message ?? t('authFailed'))
        return
      }
      setSent(true)
    },
  })

  if (sent) return <p>{t('verificationSentDesc')}</p>
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        form.handleSubmit()
      }}
    >
      {error && (
        <form.AppForm>
          <form.FormError message={error} />
        </form.AppForm>
      )}
      <form.AppField
        name="email"
        validators={{
          onChange: ({ value }) =>
            /^\S+@\S+\.\S+$/.test(value) ? undefined : t('emailValid'),
        }}
      >
        {(field) => <field.EmailField label={t('email')} />}
      </form.AppField>
      <form.AppForm>
        <form.SubmitButton className="w-full">
          {t('resendVerification')}
        </form.SubmitButton>
      </form.AppForm>
    </form>
  )
}
