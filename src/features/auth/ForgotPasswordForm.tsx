import { Link } from '@tanstack/react-router'
import { type ReactElement, useState } from 'react'
import { useTranslations } from 'use-intl'
import { useAppForm } from '#/components/app/form'
import { authClient } from '#/lib/auth-client'
import AuthCard from './AuthCard'

export default function ForgotPasswordForm(): ReactElement {
  const t = useTranslations('auth')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useAppForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      setError(null)
      const result = await authClient.requestPasswordReset({
        email: value.email,
        redirectTo: '/reset-password',
      })
      if (result.error) {
        setError(result.error.message ?? t('authFailed'))
        return
      }
      setSent(true)
    },
  })

  return (
    <AuthCard
      title={t('forgotPasswordTitle')}
      description={t('forgotPasswordDesc')}
    >
      {sent ? (
        <div className="space-y-4">
          <p>{t('resetLinkSentDesc')}</p>
          <Link
            className="text-primary underline-offset-4 hover:underline"
            to="/sign-in"
            search={{ redirect: undefined }}
          >
            {t('backToSignIn')}
          </Link>
          <button
            className="block text-sm text-primary underline-offset-4 hover:underline"
            type="button"
            onClick={() => setSent(false)}
          >
            {t('forgotPassword')}
          </button>
        </div>
      ) : (
        <form
          className="space-y-6"
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
              {t('sendResetLink')}
            </form.SubmitButton>
          </form.AppForm>
          <Link
            className="block text-center text-primary underline-offset-4 hover:underline"
            to="/sign-in"
            search={{ redirect: undefined }}
          >
            {t('backToSignIn')}
          </Link>
        </form>
      )}
    </AuthCard>
  )
}
