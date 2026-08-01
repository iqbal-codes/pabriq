import { createFileRoute } from '@tanstack/react-router'
import ForgotPasswordForm from '#/features/auth/ForgotPasswordForm'
import { resolvePublicAuthPage } from '#/features/auth/route-guards'

export const Route = createFileRoute('/forgot-password')({
  beforeLoad: async () => resolvePublicAuthPage('forgotPassword'),
  component: ForgotPasswordRoute,
})

function ForgotPasswordRoute() {
  return <ForgotPasswordForm />
}
