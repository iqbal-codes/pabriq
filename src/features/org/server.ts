import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { member, organization } from '#/db/schema'
import type { Role } from '#/features/permissions/model'

export type ActiveOrg = {
  id: string
  slug: string
  name: string
  role: Role
}

export const getActiveOrg = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ActiveOrg | null> => {
    const { auth } = await import('#/lib/auth')
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    if (!session) return null

    const { db } = await import('#/db/index')
    const memberships = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        role: member.role,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, session.user.id))
      .limit(1)

    if (memberships.length === 0) return null

    const org = memberships[0]
    return {
      id: org.id,
      slug: org.slug,
      name: org.name,
      role: org.role as Role,
    }
  },
)
