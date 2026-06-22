import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'

type MemberUser = {
  id: string
  name: string
  email: string
  image: string | null
}

export type MemberItem = {
  id: string
  role: string
  createdAt: string
  user: MemberUser
}

export type InvitationItem = {
  id: string
  email: string
  role: string
  status: string
  createdAt: string
  inviterId: string
  organizationName?: string
}

async function resolveOrgId(): Promise<string> {
  const [{ auth }, { db }, { member }] = await Promise.all([
    import('#/lib/auth'),
    import('#/db/index'),
    import('#/db/schema'),
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

export const listMembersFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<MemberItem[]> => {
    const [orgId, { auth }] = await Promise.all([
      resolveOrgId(),
      import('#/lib/auth'),
    ])
    const headers = getRequestHeaders()

    const data = await auth.api.listMembers({
      headers,
      query: { organizationId: orgId, limit: 200 },
    })

    return (data.members ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      createdAt:
        typeof m.createdAt === 'string'
          ? m.createdAt
          : m.createdAt.toISOString(),
      user: {
        id: m.user?.id ?? '',
        name: m.user?.name ?? '',
        email: m.user?.email ?? '',
        image: m.user?.image ?? null,
      },
    }))
  },
)

export const updateMemberRoleFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { memberId: string; role: string }) => input)
  .handler(
    async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
      const [orgId, { auth }] = await Promise.all([
        resolveOrgId(),
        import('#/lib/auth'),
      ])
      const headers = getRequestHeaders()

      try {
        await auth.api.updateMemberRole({
          headers,
          body: {
            memberId: data.memberId,
            role: data.role as 'admin' | 'member',
            organizationId: orgId,
          },
        })
        return { ok: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return { ok: false, error: message }
      }
    },
  )

export const removeMemberFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { memberIdOrEmail: string }) => input)
  .handler(
    async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
      const [orgId, { auth }] = await Promise.all([
        resolveOrgId(),
        import('#/lib/auth'),
      ])
      const headers = getRequestHeaders()

      try {
        await auth.api.removeMember({
          headers,
          body: {
            memberIdOrEmail: data.memberIdOrEmail,
            organizationId: orgId,
          },
        })
        return { ok: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return { ok: false, error: message }
      }
    },
  )

export const inviteMemberFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { email: string; role: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<
      { ok: true; invitationId: string } | { ok: false; error: string }
    > => {
      const [orgId, { auth }] = await Promise.all([
        resolveOrgId(),
        import('#/lib/auth'),
      ])
      const headers = getRequestHeaders()
      try {
        const invitation = await auth.api.createInvitation({
          headers,
          body: {
            email: data.email,
            role: data.role as 'admin' | 'member',
            organizationId: orgId,
          },
        })
        return { ok: true, invitationId: invitation.id }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return { ok: false, error: message }
      }
    },
  )

export const listInvitationsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<InvitationItem[]> => {
    const [orgId, { auth }] = await Promise.all([
      resolveOrgId(),
      import('#/lib/auth'),
    ])
    const headers = getRequestHeaders()

    const data = await auth.api.listInvitations({
      headers,
      query: { organizationId: orgId },
    })

    return (Array.isArray(data) ? data : []).map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      createdAt:
        typeof inv.createdAt === 'string'
          ? inv.createdAt
          : inv.createdAt.toISOString(),
      inviterId: inv.inviterId,
    }))
  },
)

export const cancelInvitationFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { invitationId: string }) => input)
  .handler(
    async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
      const { auth } = await import('#/lib/auth')
      const headers = getRequestHeaders()

      try {
        await auth.api.cancelInvitation({
          headers,
          body: { invitationId: data.invitationId },
        })
        return { ok: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return { ok: false, error: message }
      }
    },
  )

export const acceptInvitationFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { invitationId: string }) => input)
  .handler(
    async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
      const { auth } = await import('#/lib/auth')
      const headers = getRequestHeaders()

      try {
        await auth.api.acceptInvitation({
          headers,
          body: { invitationId: data.invitationId },
        })
        return { ok: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return { ok: false, error: message }
      }
    },
  )

export const rejectInvitationFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { invitationId: string }) => input)
  .handler(
    async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
      const { auth } = await import('#/lib/auth')
      const headers = getRequestHeaders()

      try {
        await auth.api.rejectInvitation({
          headers,
          body: { invitationId: data.invitationId },
        })
        return { ok: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return { ok: false, error: message }
      }
    },
  )

export const getInvitationFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<InvitationItem | null> => {
    const { auth } = await import('#/lib/auth')
    const headers = getRequestHeaders()

    try {
      const invitation = await auth.api.getInvitation({
        headers,
        query: { id: data.id },
      })
      return {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        createdAt:
          typeof invitation.createdAt === 'string'
            ? invitation.createdAt
            : invitation.createdAt.toISOString(),
        inviterId: invitation.inviterId,
        organizationName: invitation.organizationName,
      }
    } catch {
      return null
    }
  })
