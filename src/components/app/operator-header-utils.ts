import type { useRouter } from '@tanstack/react-router'

import { authClient } from '#/lib/auth-client'

export async function signOutAndNavigate(
  router: ReturnType<typeof useRouter>,
): Promise<void> {
  await authClient.signOut()
  await Promise.all([
    router.invalidate(),
    router.navigate({ to: '/sign-in', search: { redirect: undefined } }),
  ])
}
