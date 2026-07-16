import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'
import {
  type InviteMemberResult,
  inviteOrganizationMember,
} from '#/features/members/model'
import type { Role } from '#/features/permissions/model'
import { canManageMembers } from '#/features/permissions/model'
import { resolveOrgAndRole, resolveOrgId } from '#/lib/auth-session-server'

async function resolveManageMembersOrgId(): Promise<string> {
  const { orgId, role } = await resolveOrgAndRole()
  if (!canManageMembers(role as Role)) {
    throw new Error('Not authorized')
  }
  return orgId
}

const inviteMemberSchema = z.object({
  email: z.email(),
  role: z.enum(['admin', 'member']),
})

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
  .inputValidator((data) => inviteMemberSchema.parse(data))
  .handler(async ({ data }): Promise<InviteMemberResult> => {
    try {
      // Dynamic import keeps #/lib/auth out of the client bundle (project-wide
      // convention for server functions).
      const { auth } = await import('#/lib/auth')
      const headers = getRequestHeaders()
      const orgId = await resolveManageMembersOrgId()
      return await inviteOrganizationMember({
        auth,
        headers,
        organizationId: orgId,
        input: data,
      })
    } catch (err: unknown) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  })

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
