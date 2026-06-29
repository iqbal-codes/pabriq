import { createServerFn } from '@tanstack/react-start'

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
