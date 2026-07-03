import type { auth } from '#/lib/auth'

export const DEFAULT_OPERATOR_PASSWORD = 'operator123' as const

export type InviteMemberRole = 'admin' | 'member'

export type InviteMemberInput = {
  email: string
  role: InviteMemberRole
}

export type InviteMemberResult =
  | { ok: true; mode: 'invitation'; invitationId: string }
  | {
      ok: true
      mode: 'operator-account'
      userId: string
      memberId: string
      email: string
      password: typeof DEFAULT_OPERATOR_PASSWORD
    }
  | { ok: false; error: string }

type Auth = typeof auth

export async function createOperatorMemberAccount({
  auth,
  organizationId,
  email,
}: {
  auth: Auth
  organizationId: string
  email: string
}): Promise<Extract<InviteMemberResult, { mode: 'operator-account' }>> {
  const normalizedEmail = email.trim().toLowerCase()
  const ctx = await auth.$context

  const existing = await ctx.internalAdapter.findUserByEmail(normalizedEmail)
  if (existing?.user) {
    throw new Error('Email already has an account')
  }

  const createdUser = await ctx.internalAdapter.createUser({
    email: normalizedEmail,
    name: normalizedEmail.split('@')[0] || normalizedEmail,
    emailVerified: true,
  })

  try {
    const hashedPassword = await ctx.password.hash(DEFAULT_OPERATOR_PASSWORD)

    await ctx.internalAdapter.linkAccount({
      userId: createdUser.id,
      accountId: createdUser.id,
      providerId: 'credential',
      password: hashedPassword,
    })

    const createdMember = await auth.api.addMember({
      body: {
        userId: createdUser.id,
        role: 'member',
        organizationId,
      },
    })

    return {
      ok: true,
      mode: 'operator-account',
      userId: createdUser.id,
      memberId: createdMember.id,
      email: normalizedEmail,
      password: DEFAULT_OPERATOR_PASSWORD,
    }
  } catch (err: unknown) {
    try {
      await ctx.internalAdapter.deleteUser(createdUser.id)
    } catch {
      // best-effort cleanup; swallow secondary failure and rethrow original
    }
    throw err
  }
}

export async function inviteOrganizationMember({
  auth,
  headers,
  organizationId,
  input,
}: {
  auth: Auth
  headers: Headers
  organizationId: string
  input: InviteMemberInput
}): Promise<InviteMemberResult> {
  if (input.role === 'member') {
    return createOperatorMemberAccount({
      auth,
      organizationId,
      email: input.email,
    })
  }

  const invitation = await auth.api.createInvitation({
    headers,
    body: {
      email: input.email,
      role: 'admin',
      organizationId,
    },
  })

  return { ok: true, mode: 'invitation', invitationId: invitation.id }
}
