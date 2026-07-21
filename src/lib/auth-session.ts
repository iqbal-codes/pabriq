import { createServerFn } from '@tanstack/react-start'
import { listUserOrgs } from '#/features/auth/org'
import type { Role } from '#/features/permissions/model'

interface SessionUser {
  id: string
  name: string | null
  email: string
  image: string | null
}

export interface AuthSession {
  session: Record<string, unknown>
  user: SessionUser
}

interface OrgInfo {
  id: string
  name: string
  slug: string
  logo: string | null
  role: Role
}

export type OrgContextResult =
  | {
      ok: true
      session: AuthSession
      org: OrgInfo
      role: Role
    }
  | {
      ok: false
      reason: 'unauthenticated'
    }
  | {
      ok: false
      reason: 'no-org'
      session: AuthSession
    }

export const getCurrentSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const [{ getRequestHeaders }, { auth }] = await Promise.all([
      import('@tanstack/react-start/server'),
      import('#/lib/auth'),
    ])
    const rawHeaders = getRequestHeaders()
    const headers = new Headers()
    for (const [key, value] of rawHeaders.entries()) {
      headers.set(key, value)
    }
    return auth.api.getSession({
      headers,
    })
  },
)

export async function resolveOrgContext(): Promise<OrgContextResult> {
  const rawSession = await getCurrentSession()
  if (!rawSession) {
    return { ok: false, reason: 'unauthenticated' }
  }
  const session = rawSession as unknown as AuthSession

  const orgs = await listUserOrgs()
  if (!orgs || orgs.length === 0) {
    return { ok: false, reason: 'no-org', session }
  }

  // TODO: add org switching when operators can belong to multiple orgs.
  const org = orgs[0]
  return { ok: true, session, org, role: org.role as Role }
}
