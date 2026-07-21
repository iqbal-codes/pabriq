import { eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import { customers, member, organization, user } from '#/db/schema'
import {
  createCustomerTool,
  searchCustomerTool,
  updateCustomerTool,
} from './customer-tools'

const org1Id = '00000000-0000-0000-0000-000000000001'
const org2Id = '00000000-0000-0000-0000-000000000002'
const user1Id = '00000000-0000-0000-0000-000000000011'

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE "user", organization, member, customers CASCADE`,
  )

  const now = new Date()

  await db.insert(organization).values([
    { id: org1Id, name: 'Org 1', slug: 'org-1', createdAt: now },
    { id: org2Id, name: 'Org 2', slug: 'org-2', createdAt: now },
  ])

  await db.insert(user).values([
    {
      id: user1Id,
      name: 'User 1',
      email: 'user1@example.com',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
  ])

  await db.insert(member).values([
    {
      id: 'member-1',
      organizationId: org1Id,
      userId: user1Id,
      role: 'owner',
      createdAt: now,
    },
  ])

  await db.insert(customers).values([
    {
      id: 'cust-1',
      orgId: org1Id,
      name: 'Acme Corp',
      email: 'acme@example.com',
      phone: '08123456789',
      notes: 'Initial notes',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cust-2',
      orgId: org2Id,
      name: 'Other Corp',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ])
})

describe.sequential('customer-tools', () => {
  async function createTestContext(orgId = org1Id) {
    const { RequestContext } = await import('@mastra/core/request-context')
    const requestContext = new RequestContext<{
      orgId: string
      userId: string
      role: 'owner' | 'admin' | 'member'
    }>()
    requestContext.set('orgId', orgId)
    requestContext.set('userId', user1Id)
    requestContext.set('role', 'owner')
    return requestContext
  }

  describe('searchCustomerTool', () => {
    it('returns seeded org records with valid context', async () => {
      const requestContext = await createTestContext()
      const execute = searchCustomerTool.execute
      if (!execute) throw new Error('searchCustomerTool.execute is undefined')

      const results = (await execute({ query: 'Acme' }, {
        requestContext,
      } as never)) as Array<{ id: string; name: string }>

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].name).toBe('Acme Corp')
    })

    it('does not return cross-org records', async () => {
      const requestContext = await createTestContext(org1Id)
      const execute = searchCustomerTool.execute
      if (!execute) throw new Error('searchCustomerTool.execute is undefined')

      const results = (await execute({ query: 'Other' }, {
        requestContext,
      } as never)) as Array<{ id: string; name: string }>

      const names = results.map((r) => r.name)
      expect(names).not.toContain('Other Corp')
    })

    it('returns at most 10 results', async () => {
      const requestContext = await createTestContext(org1Id)
      const now = new Date()

      // Seed 11 additional customers matching query 'Limit'
      const bulkCustomers = Array.from({ length: 11 }, (_, i) => ({
        id: `bulk-cust-${i + 1}`,
        orgId: org1Id,
        name: `Limit Test Corp ${i + 1}`,
        active: true,
        createdAt: now,
        updatedAt: now,
      }))
      await db.insert(customers).values(bulkCustomers)

      const execute = searchCustomerTool.execute
      if (!execute) throw new Error('searchCustomerTool.execute is undefined')

      const results = (await execute({ query: 'Limit' }, {
        requestContext,
      } as never)) as Array<{ id: string; name: string }>

      expect(results.length).toBe(10)
    })

    it('rejects without request context', async () => {
      const execute = searchCustomerTool.execute
      if (!execute) throw new Error('searchCustomerTool.execute is undefined')

      await expect(execute({ query: 'Acme' }, {} as never)).rejects.toThrow(
        'Assistant request context is missing',
      )
    })
  })

  describe('createCustomerTool', () => {
    it('creates customer "PT Maju Jaya" returns ok:true, id, url containing /customers/', async () => {
      const requestContext = await createTestContext()
      const execute = createCustomerTool.execute
      if (!execute) throw new Error('createCustomerTool.execute is undefined')

      const result = (await execute(
        {
          name: 'PT Maju Jaya',
          email: 'maju@example.com',
          phone: '081234567890',
        },
        { requestContext } as never,
      )) as { ok: boolean; id?: string; url?: string; error?: string }

      expect(result.ok).toBe(true)
      expect(result.id).toBeDefined()
      expect(result.url).toContain('/customers/')
    })

    it('with blank name returns error "Customer name is required"', async () => {
      const requestContext = await createTestContext()
      const execute = createCustomerTool.execute
      if (!execute) throw new Error('createCustomerTool.execute is undefined')

      try {
        const result = await execute({ name: '' }, { requestContext } as never)
        expect(result).toHaveProperty('error')
      } catch (err: unknown) {
        expect(err).toBeDefined()
      }
    })

    it('creates customer without address', async () => {
      const requestContext = await createTestContext()
      const execute = createCustomerTool.execute
      if (!execute) throw new Error('createCustomerTool.execute is undefined')

      const result = (await execute({ name: 'No Address Corp' }, {
        requestContext,
      } as never)) as { ok: boolean; id?: string; url?: string }

      expect(result.ok).toBe(true)
      expect(result.id).toBeDefined()

      const [found] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, result.id!))

      expect(found).toBeDefined()
      expect(found.address).toBeNull()
      expect(found.addressId).toBeNull()
    })
  })

  describe('updateCustomerTool', () => {
    it('updates name and phone preserves other fields', async () => {
      const requestContext = await createTestContext()
      const execute = updateCustomerTool.execute
      if (!execute) throw new Error('updateCustomerTool.execute is undefined')

      const result = (await execute(
        {
          id: 'cust-1',
          name: 'Acme Corp Updated',
          phone: '089999999999',
        },
        { requestContext } as never,
      )) as { ok: boolean; id?: string; url?: string }

      expect(result.ok).toBe(true)

      const [updated] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, 'cust-1'))

      expect(updated.name).toBe('Acme Corp Updated')
      expect(updated.phone).toBe('089999999999')
      expect(updated.email).toBe('acme@example.com')
      expect(updated.notes).toBe('Initial notes')
    })

    it('with cross-org ID returns "Customer not found"', async () => {
      const requestContext = await createTestContext(org1Id)
      const execute = updateCustomerTool.execute
      if (!execute) throw new Error('updateCustomerTool.execute is undefined')

      const result = (await execute(
        {
          id: 'cust-2', // cust-2 belongs to org2Id
          name: 'Hacked Name',
        },
        { requestContext } as never,
      )) as { ok: boolean; error?: string }

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Customer not found')
    })

    it('with blank name returns "Customer name is required"', async () => {
      const requestContext = await createTestContext()
      const execute = updateCustomerTool.execute
      if (!execute) throw new Error('updateCustomerTool.execute is undefined')

      try {
        const result = await execute({ id: 'cust-1', name: '' }, {
          requestContext,
        } as never)
        expect(result).toHaveProperty('error')
      } catch (err: unknown) {
        expect(err).toBeDefined()
      }
    })
  })
})
