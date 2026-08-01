import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslations } from 'use-intl'
import AuthCard from '#/features/auth/AuthCard'
import ResetPasswordForm from '#/features/auth/ResetPasswordForm'

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search) => ({
    token: typeof search.token === 'string' ? search.token : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  component: ResetPasswordRoute,
})

function ResetPasswordRoute() {
  const { token, error } = Route.useSearch()
  const t = useTranslations('auth')
  if (token && !error) return <ResetPasswordForm token={token} />
  return (
    <AuthCard title={t('invalidResetLink')} description={t('invalidResetLink')}>
      <div className="space-y-4">
        <Link
          className="block text-primary underline-offset-4 hover:underline"
          to="/forgot-password"
        >
          {t('forgotPassword')}
        </Link>
        <Link
          className="block text-primary underline-offset-4 hover:underline"
          to="/sign-in"
          search={{ redirect: undefined }}
        >
          {t('backToSignIn')}
        </Link>
      </div>
    </AuthCard>
  )
}
