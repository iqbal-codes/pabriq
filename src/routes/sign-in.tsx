import { createFileRoute } from '@tanstack/react-router'
import { AuthForm } from '#/features/auth/AuthForm'
import {
  resolvePublicAuthPage,
  sanitizeAuthRedirect,
} from '#/features/auth/route-guards'

export const Route = createFileRoute('/sign-in')({
  validateSearch: (search) => ({
    redirect: sanitizeAuthRedirect(search.redirect),
  }),
  beforeLoad: async ({ search }) =>
    resolvePublicAuthPage('signIn', search.redirect),
  component: SignInRoute,
})

function SignInRoute() {
  const { redirect } = Route.useSearch()
  return <AuthForm mode="sign-in" redirectTo={redirect ?? '/'} />
}
