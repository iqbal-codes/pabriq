import { serializeSignedCookie } from 'better-call'
import { eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import { account, invitation, member, organization, user } from '#/db/schema'
import { auth } from '#/lib/auth'
import { createOperatorMemberAccount, inviteOrganizationMember } from './model'

const org1Id = '00000000-0000-0000-0000-000000000001'

// Mint a real owner session (email-verified credential account) so
// auth.api.createInvitation's session middleware accepts the request.
// signInEmail does not surface set-cookie headers in the vitest/happy-dom
// environment, so rebuild the signed session cookie from the returned token.
async function createOwnerSession(): Promise<Headers> {
  const ctx = await auth.$context
  const now = new Date()

  const created = await ctx.internalAdapter.createUser({
    email: 'owner@test.com',
    name: 'Owner',
    emailVerified: true,
  })
  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    accountId: created.id,
    providerId: 'credential',
    password: await ctx.password.hash('OwnerPass123!'),
  })
  await db.insert(member).values({
    id: 'owner-member-id',
    organizationId: org1Id,
    userId: created.id,
    role: 'owner',
    createdAt: now,
  })

  const signIn = await auth.api.signInEmail({
    body: { email: 'owner@test.com', password: 'OwnerPass123!' },
    asResponse: true,
  })
  const body = (await signIn.json()) as { token?: string }
  if (!body.token) throw new Error('owner sign-in returned no session token')

  const cookieName = ctx.authCookies.sessionToken.name
  const serialized = await serializeSignedCookie(
    cookieName,
    body.token,
    ctx.secret,
    {},
  )
  // serialized is a full Set-Cookie header ("name=value; Path=/; ...");
  // keep only the name=value pair for the request Cookie header.
  const cookieValue = serialized.split(';')[0]

  const headers = new Headers()
  headers.set('cookie', cookieValue)
  return headers
}

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE organization, member, "user", account, invitation CASCADE`,
  )

  const now = new Date()
  await db.insert(organization).values({
    id: org1Id,
    name: 'Org 1',
    slug: 'org-1',
    createdAt: now,
  })
})

describe('createOperatorMemberAccount', () => {
  it('creates operator account with normalized email', async () => {
    const result = await createOperatorMemberAccount({
      auth,
      organizationId: org1Id,
      email: 'Operator@Example.Test',
    })

    expect(result).toMatchObject({
      ok: true,
      mode: 'operator-account',
      email: 'operator@example.test',
    })
    expect(result.password).toBeTruthy()
    expect(result.password.length).toBeGreaterThanOrEqual(12)

    // One user row for the normalized email
    const [userRow] = await db
      .select()
      .from(user)
      .where(eq(user.email, 'operator@example.test'))
    expect(userRow).toBeDefined()
    expect(userRow.email).toBe('operator@example.test')

    // One credential account linked to that user
    const [accountRow] = await db
      .select()
      .from(account)
      .where(eq(account.userId, userRow.id))
    expect(accountRow).toBeDefined()
    expect(accountRow.providerId).toBe('credential')
    expect(accountRow.accountId).toBe(userRow.id)
    expect(accountRow.userId).toBe(userRow.id)
    expect(accountRow.password).toBeTruthy()

    // Password hash verifies against the returned per-account password
    const ctx = await auth.$context
    const verified = await ctx.password.verify({
      hash: accountRow.password ?? '',
      password: result.password,
    })
    expect(verified).toBe(true)

    // One member row for the org
    const [memberRow] = await db
      .select()
      .from(member)
      .where(eq(member.userId, userRow.id))
    expect(memberRow).toBeDefined()
    expect(memberRow.organizationId).toBe(org1Id)
    expect(memberRow.userId).toBe(userRow.id)
    expect(memberRow.role).toBe('operator')

    // Zero invitation rows for the email
    const invitations = await db
      .select()
      .from(invitation)
      .where(eq(invitation.email, 'operator@example.test'))
    expect(invitations).toHaveLength(0)

    // Result IDs match DB rows
    expect(result.userId).toBe(userRow.id)
    expect(result.memberId).toBe(memberRow.id)
  })

  it('rejects existing user email without creating member', async () => {
    // First call succeeds
    await createOperatorMemberAccount({
      auth,
      organizationId: org1Id,
      email: 'duplicate@test.com',
    })

    // Second call with same email rejects
    await expect(
      createOperatorMemberAccount({
        auth,
        organizationId: org1Id,
        email: 'duplicate@test.com',
      }),
    ).rejects.toThrow('Email already has an account')

    // Member count remains 1
    const members = await db
      .select()
      .from(member)
      .where(eq(member.organizationId, org1Id))
    expect(members).toHaveLength(1)
  })

  it('deletes user when membership creation fails', async () => {
    await expect(
      createOperatorMemberAccount({
        auth,
        organizationId: 'non-existent-org-id',
        email: 'cleanup@test.com',
      }),
    ).rejects.toThrow()

    // No user row for the normalized email (cascade deletes account too)
    const users = await db
      .select()
      .from(user)
      .where(eq(user.email, 'cleanup@test.com'))
    expect(users).toHaveLength(0)
  })

  it('creates operator account with a per-account random password', async () => {
    const a = await createOperatorMemberAccount({
      auth,
      organizationId: org1Id,
      email: 'random-pw-a@test.com',
    })
    const b = await createOperatorMemberAccount({
      auth,
      organizationId: org1Id,
      email: 'random-pw-b@test.com',
    })
    if (!a.ok || !b.ok) throw new Error('expected success')
    expect(a.password).not.toBe('operator123')
    expect(a.password).not.toBe(b.password)
    expect(a.password.length).toBeGreaterThanOrEqual(12)
  })
})

describe('inviteOrganizationMember', () => {
  it('creates an admin invitation for role admin', async () => {
    const headers = await createOwnerSession()
    const result = await inviteOrganizationMember({
      auth,
      headers,
      organizationId: org1Id,
      input: { email: 'admin-invite@test.com', role: 'admin' },
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.mode).toBe('invitation')
      const [inv] = await db
        .select()
        .from(invitation)
        .where(eq(invitation.email, 'admin-invite@test.com'))
      expect(inv?.role).toBe('admin')
    }
  })

  it('creates an operator invitation for role operator', async () => {
    const headers = await createOwnerSession()
    const result = await inviteOrganizationMember({
      auth,
      headers,
      organizationId: org1Id,
      input: { email: 'operator-invite@test.com', role: 'operator' },
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.mode).toBe('invitation')
      const [inv] = await db
        .select()
        .from(invitation)
        .where(eq(invitation.email, 'operator-invite@test.com'))
      expect(inv?.role).toBe('operator')
    }
  })

  it('creates an operator account for role member', async () => {
    const result = await inviteOrganizationMember({
      auth,
      headers: new Headers(),
      organizationId: org1Id,
      input: { email: 'member-account@test.com', role: 'member' },
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.mode).toBe('operator-account')
    }
  })
})
