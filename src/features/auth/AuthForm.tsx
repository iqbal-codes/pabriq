import { Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { useAppForm } from '#/components/app/form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { authClient } from '#/lib/auth-client'

type AuthMode = 'sign-in' | 'sign-up'

type AuthFormProps = {
  mode: AuthMode
  redirectTo: string
}

export function AuthForm({ mode, redirectTo }: AuthFormProps) {
  const router = useRouter()
  const [authError, setAuthError] = useState<string | null>(null)
  const isSignUp = mode === 'sign-up'
  const t = useTranslations('auth')

  const form = useAppForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setAuthError(null)

      const result = isSignUp
        ? await authClient.signUp.email({
            name: value.name,
            email: value.email,
            password: value.password,
          })
        : await authClient.signIn.email({
            email: value.email,
            password: value.password,
          })

      if (result.error) {
        setAuthError(result.error.message ?? t('authFailed'))
        return
      }

      await router.invalidate()
      await router.navigate({ to: redirectTo })
    },
  })

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {isSignUp ? t('signUpTitle') : t('signInTitle')}
          </CardTitle>
          <CardDescription>
            {isSignUp ? t('signUpDesc') : t('signInDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-6"
            onSubmit={(e) => {
              // react-doctor: intentional — TanStack Form handleSubmit needs preventDefault
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
          >
            {authError && (
              <form.AppForm>
                <form.FormError message={authError} />
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

            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? t('alreadyHaveAccount') : t('needAccount')}{' '}
              <Link
                to={isSignUp ? '/sign-in' : '/sign-up'}
                search={{ redirect: redirectTo }}
                className="font-medium text-foreground underline underline-offset-4"
              >
                {isSignUp ? t('signIn') : t('createOne')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
