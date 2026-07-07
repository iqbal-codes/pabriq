import { eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import { account, member, user } from '#/db/schema'
import { auth } from '#/lib/auth'
import { bootstrapOwnerAccount } from './bootstrap'

beforeEach(async () => {
  await db.execute(sql`TRUNCATE member, "user", account CASCADE`)
})

describe('bootstrapOwnerAccount', () => {
  it('creates normalized credential account without org membership', async () => {
    const result = await bootstrapOwnerAccount({
      auth,
      email: 'Owner@Example.Test',
      password: 'owner-pass-123',
      name: 'Factory Owner',
    })

    expect(result).toMatchObject({
      created: true,
      email: 'owner@example.test',
    })

    const [userRow] = await db
      .select()
      .from(user)
      .where(eq(user.email, 'owner@example.test'))
    expect(userRow).toBeDefined()
    expect(userRow.name).toBe('Factory Owner')

    const [accountRow] = await db
      .select()
      .from(account)
      .where(eq(account.userId, userRow.id))
    expect(accountRow).toBeDefined()
    expect(accountRow.providerId).toBe('credential')
    expect(accountRow.accountId).toBe(userRow.id)
    expect(accountRow.password).toBeTruthy()

    const ctx = await auth.$context
    const verified = await ctx.password.verify({
      hash: accountRow.password ?? '',
      password: 'owner-pass-123',
    })
    expect(verified).toBe(true)

    const memberships = await db
      .select()
      .from(member)
      .where(eq(member.userId, userRow.id))
    expect(memberships).toHaveLength(0)

    expect(result.userId).toBe(userRow.id)
  })

  it('rejects existing email without creating another account', async () => {
    await bootstrapOwnerAccount({
      auth,
      email: 'existing@example.test',
      password: 'owner-pass-123',
    })

    await expect(
      bootstrapOwnerAccount({
        auth,
        email: 'existing@example.test',
        password: 'owner-pass-456',
      }),
    ).rejects.toThrow('Email already has an account')

    const users = await db
      .select()
      .from(user)
      .where(eq(user.email, 'existing@example.test'))
    expect(users).toHaveLength(1)
  })
})
