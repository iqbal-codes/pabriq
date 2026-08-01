import { redirect } from '@tanstack/react-router'
import { resolveOrgContext } from '#/lib/auth-session'

export function sanitizeAuthRedirect(value: unknown): string | undefined {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//')
  ) {
    return undefined
  }
  return value
}

export function buildVerificationCallbackUrl(email: string): string {
  return `/verify-email?email=${encodeURIComponent(email)}&verified=1`
}

export async function resolvePublicAuthPage(
  pageTitle: 'signIn' | 'signUp' | 'forgotPassword',
  redirectTo?: string,
): Promise<{ pageTitle: 'signIn' | 'signUp' | 'forgotPassword' }> {
  const result = await resolveOrgContext()
  if (result.ok) {
    if (result.role === 'member') throw redirect({ to: '/operator' })
    throw redirect({ to: sanitizeAuthRedirect(redirectTo) ?? '/' })
  }
  if (result.reason === 'no-org') throw redirect({ to: '/onboarding' })
  return { pageTitle }
}
