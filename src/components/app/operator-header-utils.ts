import type { useRouter } from '@tanstack/react-router'
import { authClient } from '#/lib/auth-client'
import { getQueryClient } from '#/lib/query-client'

export async function signOutAndNavigate(
  router: ReturnType<typeof useRouter>,
): Promise<void> {
  await authClient.signOut()
  getQueryClient().clear()
  await Promise.all([
    router.invalidate(),
    router.navigate({ to: '/sign-in', search: { redirect: undefined } }),
  ])
}
