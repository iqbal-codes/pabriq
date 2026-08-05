import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthForm } from '#/features/auth/AuthForm'
import { resolveOrgContext } from '#/lib/auth-session'

function sanitizeRedirect(value: unknown) {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//')
  ) {
    return undefined
  }

  return value
}

export const Route = createFileRoute('/sign-up')({
  validateSearch: (search) => ({
    redirect: sanitizeRedirect(search.redirect),
  }),
  beforeLoad: async ({ search }) => {
    const result = await resolveOrgContext()

    if (result.ok) {
      if (result.role === 'member') {
        throw redirect({ to: '/operator' })
      }
      throw redirect({ to: search.redirect ?? '/' })
    }

    if (result.reason === 'no-org') {
      throw redirect({ to: '/onboarding' })
    }

    return { pageTitle: 'signUp' as const }
  },
  component: SignUpRoute,
})

function SignUpRoute() {
  return <AuthForm mode="sign-up" redirectTo="/onboarding" />
}
