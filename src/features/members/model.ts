import { randomBytes } from 'node:crypto'
import type { auth } from '#/lib/auth'

function generateOperatorPassword(): string {
  return randomBytes(9).toString('base64url') // 12 chars, URL-safe
}

export type InviteMemberRole = 'admin' | 'member' | 'operator'

export type InviteMemberInput = {
  email: string
  role: InviteMemberRole
}

export type InviteMemberResult =
  | {
      ok: true
      mode: 'invitation'
      invitationId: string
      role: InviteMemberRole
    }
  | {
      ok: true
      mode: 'operator-account'
      userId: string
      memberId: string
      email: string
      password: string
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
    const password = generateOperatorPassword()
    const hashedPassword = await ctx.password.hash(password)

    await ctx.internalAdapter.linkAccount({
      userId: createdUser.id,
      accountId: createdUser.id,
      providerId: 'credential',
      password: hashedPassword,
    })

    const createdMember = await auth.api.addMember({
      body: {
        userId: createdUser.id,
        role: 'operator',
        organizationId,
      },
    })

    return {
      ok: true,
      mode: 'operator-account',
      userId: createdUser.id,
      memberId: createdMember.id,
      email: normalizedEmail,
      password,
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
      role: input.role, // 'admin' | 'operator' — pass through, never hard-code
      organizationId,
    },
  })

  return {
    ok: true,
    mode: 'invitation',
    invitationId: invitation.id,
    // better-auth types invitation.role as string; narrow to the enum
    role: invitation.role as InviteMemberRole,
  }
}
