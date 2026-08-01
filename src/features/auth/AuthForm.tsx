import { Link, useRouter } from '@tanstack/react-router'
import { type ReactElement, useState } from 'react'
import { useTranslations } from 'use-intl'
import { useAppForm } from '#/components/app/form'
import { authClient } from '#/lib/auth-client'
import AuthCard from './AuthCard'
import { buildVerificationCallbackUrl } from './route-guards'

type AuthMode = 'sign-in' | 'sign-up'

type AuthFormProps = {
  mode: AuthMode
  redirectTo: string
}

export function AuthForm({ mode, redirectTo }: AuthFormProps): ReactElement {
  const router = useRouter()
  const [authError, setAuthError] = useState<string | null>(null)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const isSignUp = mode === 'sign-up'
  const t = useTranslations('auth')

  const form = useAppForm({
    defaultValues: { name: '', email: '', password: '' },
    onSubmit: async ({ value }) => {
      setAuthError(null)
      setUnverifiedEmail(null)
      const callbackURL = buildVerificationCallbackUrl(value.email)
      const result = isSignUp
        ? await authClient.signUp.email({
            name: value.name,
            email: value.email,
            password: value.password,
            callbackURL,
          })
        : await authClient.signIn.email({
            email: value.email,
            password: value.password,
            callbackURL,
          })

      if (result.error) {
        if (result.error.status === 403 && !isSignUp) {
          setUnverifiedEmail(value.email)
          setAuthError(t('emailNotVerified'))
        } else {
          setAuthError(result.error.message ?? t('authFailed'))
        }
        return
      }

      if (isSignUp) {
        await router.navigate({
          to: '/verify-email',
          search: {
            email: value.email,
            pending: '1',
            verified: undefined,
            error: undefined,
          },
        })
        return
      }

      await router.invalidate()
      await router.navigate({ to: redirectTo })
    },
  })

  return (
    <AuthCard
      title={isSignUp ? t('signUpTitle') : t('signInTitle')}
      description={isSignUp ? t('signUpDesc') : t('signInDesc')}
    >
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          form.handleSubmit()
        }}
      >
        {(authError || unverifiedEmail) && (
          <form.AppForm>
            <form.FormError message={authError} />
            {unverifiedEmail && (
              <Link
                className="text-sm text-primary underline-offset-4 hover:underline"
                to="/verify-email"
                search={{
                  email: unverifiedEmail,
                  pending: '1',
                  verified: undefined,
                  error: undefined,
                }}
              >
                {t('resendVerification')}
              </Link>
            )}
          </form.AppForm>
        )}

        {isSignUp && (
          <form.AppField
            name="name"
            validators={{
              onChange: ({ value }) =>
                value.trim().length < 2 ? t('nameMin') : undefined,
            }}
          >
            {(field) => (
              <field.TextField label={t('name')} autoComplete="name" />
            )}
          </form.AppField>
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

        <form.AppField
          name="password"
          validators={{
            onChange: ({ value }) =>
              value.length < 8 ? t('passwordMin') : undefined,
          }}
        >
          {(field) => (
            <field.PasswordField
              label={t('password')}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          )}
        </form.AppField>

        <form.AppForm>
          <form.SubmitButton className="w-full">
            {isSignUp ? t('signUp') : t('signIn')}
          </form.SubmitButton>
        </form.AppForm>

        {!isSignUp && (
          <div className="space-y-2 text-center">
            <Link
              className="block text-center text-primary underline-offset-4 hover:underline"
              to="/forgot-password"
            >
              {t('forgotPassword')}
            </Link>
            <p className="text-sm text-muted-foreground">
              {t('needAccount')}{' '}
              <Link
                className="text-primary underline-offset-4 hover:underline"
                to="/sign-up"
                search={{ redirect: redirectTo }}
              >
                {t('createOne')}
              </Link>
            </p>
          </div>
        )}
        {isSignUp && (
          <Link
            className="block text-center text-sm text-primary underline-offset-4 hover:underline"
            to="/sign-in"
            search={{ redirect: undefined }}
          >
            {t('backToSignIn')}
          </Link>
        )}
      </form>
    </AuthCard>
  )
}
