import { createFileRoute } from '@tanstack/react-router'
import { AuthForm } from '#/features/auth/AuthForm'
import {
  resolvePublicAuthPage,
  sanitizeAuthRedirect,
} from '#/features/auth/route-guards'

export const Route = createFileRoute('/sign-up')({
  validateSearch: (search) => ({
    redirect: sanitizeAuthRedirect(search.redirect),
  }),
  beforeLoad: async ({ search }) =>
    resolvePublicAuthPage('signUp', search.redirect),
  component: SignUpRoute,
})

function SignUpRoute() {
  const { redirect } = Route.useSearch()
  return <AuthForm mode="sign-up" redirectTo={redirect ?? '/'} />
}
