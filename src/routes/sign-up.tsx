import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthForm } from '#/features/auth/AuthForm'
import { getCurrentSession } from '#/lib/auth-session'

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
    const session = await getCurrentSession()

    if (session) {
      throw redirect({ to: search.redirect ?? '/onboarding' })
    }

    return { pageTitle: 'signUp' as const }
  },
  component: SignUpRoute,
})

function SignUpRoute() {
  const search = Route.useSearch()

  return (
    <AuthForm mode="sign-up" redirectTo={search.redirect ?? '/onboarding'} />
  )
}
