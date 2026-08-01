import { Link } from '@tanstack/react-router'
import { type ReactElement, useState } from 'react'
import { useTranslations } from 'use-intl'
import { useAppForm } from '#/components/app/form'
import { authClient } from '#/lib/auth-client'
import AuthCard from './AuthCard'

type ResetPasswordFormProps = { token: string }

export default function ResetPasswordForm({
  token,
}: ResetPasswordFormProps): ReactElement {
  const t = useTranslations('auth')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useAppForm({
    defaultValues: { newPassword: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      setError(null)
      if (value.newPassword !== value.confirmPassword) {
        setError(t('passwordMismatch'))
        return
      }
      const result = await authClient.resetPassword({
        newPassword: value.newPassword,
        token,
      })
      if (result.error) {
        setError(t('invalidResetLink'))
        return
      }
      setSuccess(true)
    },
  })

  return (
    <AuthCard
      title={success ? t('passwordResetSuccess') : t('resetPasswordTitle')}
      description={
        success ? t('passwordResetSuccessDesc') : t('resetPasswordDesc')
      }
    >
      {success ? (
        <Link
          className="text-primary underline-offset-4 hover:underline"
          to="/sign-in"
          search={{ redirect: undefined }}
        >
          {t('backToSignIn')}
        </Link>
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
            name="newPassword"
            validators={{
              onChange: ({ value }) =>
                value.length < 8 ? t('passwordMin') : undefined,
            }}
          >
            {(field) => (
              <field.PasswordField
                label={t('newPassword')}
                autoComplete="new-password"
              />
            )}
          </form.AppField>
          <form.AppField
            name="confirmPassword"
            validators={{
              onChange: ({ value }) =>
                value.length < 8 ? t('passwordMin') : undefined,
            }}
          >
            {(field) => (
              <field.PasswordField
                label={t('confirmPassword')}
                autoComplete="new-password"
              />
            )}
          </form.AppField>
          <form.AppForm>
            <form.SubmitButton className="w-full">
              {t('resetPassword')}
            </form.SubmitButton>
          </form.AppForm>
        </form>
      )}
    </AuthCard>
  )
}
