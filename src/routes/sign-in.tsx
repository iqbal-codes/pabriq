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

export const Route = createFileRoute('/sign-in')({
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
  },
  component: SignInRoute,
})

function SignInRoute() {
  return <AuthForm mode="sign-in" redirectTo="/" />
}
