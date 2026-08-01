import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslations } from 'use-intl'
import AuthCard from '#/features/auth/AuthCard'
import VerificationResendForm from '#/features/auth/VerificationResendForm'

export const Route = createFileRoute('/verify-email')({
  validateSearch: (search) => ({
    email: typeof search.email === 'string' ? search.email : undefined,
    pending: typeof search.pending === 'string' ? search.pending : undefined,
    verified: typeof search.verified === 'string' ? search.verified : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  component: VerifyEmailRoute,
})

function VerifyEmailRoute() {
  const search = Route.useSearch()
  const t = useTranslations('auth')
  if (search.pending === '1') {
    return (
      <AuthCard
        title={t('verificationPendingTitle')}
        description={t('verificationPendingDesc')}
      >
        <div className="space-y-4">
          {search.email && <p>{search.email}</p>}
          <VerificationResendForm initialEmail={search.email} />
          <Link
            className="text-primary underline-offset-4 hover:underline"
            to="/sign-in"
            search={{ redirect: undefined }}
          >
            {t('backToSignIn')}
          </Link>
        </div>
      </AuthCard>
    )
  }
  if (search.verified === '1' && !search.error) {
    return (
      <AuthCard
        title={t('emailVerifiedTitle')}
        description={t('emailVerifiedDesc')}
      >
        <Link
          className="text-primary underline-offset-4 hover:underline"
          to="/"
        >
          {t('continueToApp')}
        </Link>
      </AuthCard>
    )
  }
  const isExpired = search.error === 'TOKEN_EXPIRED'
  return (
    <AuthCard
      title={t('invalidVerificationLink')}
      description={
        isExpired ? t('verificationExpired') : t('invalidVerificationLink')
      }
    >
      <div className="space-y-4">
        {search.email && <VerificationResendForm initialEmail={search.email} />}
        <Link
          className="text-primary underline-offset-4 hover:underline"
          to="/sign-in"
          search={{ redirect: undefined }}
        >
          {t('backToSignIn')}
        </Link>
      </div>
    </AuthCard>
  )
}
