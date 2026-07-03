import { createServerFn } from '@tanstack/react-start'
import { listUserOrgs } from '#/features/auth/org'
import type { Role } from '#/features/permissions/model'

interface SessionUser {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface AuthSession {
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
    return auth.api.getSession({
      headers: getRequestHeaders(),
    })
  },
)

export async function resolveOrgId(): Promise<string> {
  const [{ getRequestHeaders }, { auth }, { db }, { member }, { eq }] =
    await Promise.all([
      import('@tanstack/react-start/server'),
      import('#/lib/auth'),
      import('#/db/index'),
      import('#/db/schema'),
      import('drizzle-orm'),
    ])
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')

  const memberships = await db
    .select({ orgId: member.organizationId })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1)

  if (memberships.length === 0) throw new Error('No organization')
  return memberships[0].orgId
}

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
