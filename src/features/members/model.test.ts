import { eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import { account, invitation, member, organization, user } from '#/db/schema'
import { auth } from '#/lib/auth'
import { createOperatorMemberAccount, DEFAULT_OPERATOR_PASSWORD } from './model'

const org1Id = '00000000-0000-0000-0000-000000000001'

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
      password: DEFAULT_OPERATOR_PASSWORD,
    })

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

    // Password hash verifies against DEFAULT_OPERATOR_PASSWORD
    const ctx = await auth.$context
    const verified = await ctx.password.verify({
      hash: accountRow.password ?? '',
      password: DEFAULT_OPERATOR_PASSWORD,
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
    expect(memberRow.role).toBe('member')

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
})
