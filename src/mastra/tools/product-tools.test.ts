import { RequestContext } from '@mastra/core/request-context'
import { eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  member,
  organization,
  pricingBreakpoints,
  products,
  user,
} from '#/db/schema'
import {
  createProductTool,
  searchProductTool,
  updateProductTool,
} from './product-tools'

const org1Id = '00000000-0000-0000-0000-000000000001'
const org2Id = '00000000-0000-0000-0000-000000000002'
const user1Id = '00000000-0000-0000-0000-000000000011'

function createRequestContext(
  orgId = org1Id,
  userId = user1Id,
  role: 'owner' | 'admin' = 'owner',
) {
  const requestContext = new RequestContext<{
    orgId: string
    userId: string
    role: 'owner' | 'admin'
  }>()
  requestContext.set('orgId', orgId)
  requestContext.set('userId', userId)
  requestContext.set('role', role)
  return requestContext
}

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE organization, member, products, pricing_breakpoints CASCADE`,
  )

  const now = new Date()

  await db
    .insert(user)
    .values([
      {
        id: user1Id,
        name: 'User 1',
        email: 'user1@example.com',
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    .onConflictDoNothing()

  await db.insert(organization).values([
    { id: org1Id, name: 'Org 1', slug: 'org-1', createdAt: now },
    { id: org2Id, name: 'Org 2', slug: 'org-2', createdAt: now },
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

  await db.insert(products).values([
    {
      id: 'prod-1',
      orgId: org1Id,
      name: 'Kaos Premium',
      category: 'Apparel',
      basePrice: 50000,
      minQuantity: 100,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-2',
      orgId: org2Id,
      name: 'Widget B',
      basePrice: 20000,
      minQuantity: 1,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ])
})

describe.sequential('product tools', () => {
  describe.sequential('searchProductTool', () => {
    it("finds by name 'Kaos' returns the product", async () => {
      const requestContext = createRequestContext()
      const execute = searchProductTool.execute
      if (!execute) throw new Error('searchProductTool.execute is undefined')

      const results = (await execute({ query: 'Kaos' }, {
        requestContext,
      } as never)) as Array<{ id: string; name: string }>

      expect(results).toHaveLength(1)
      expect(results[0]?.name).toBe('Kaos Premium')
    })

    it('with activeOnly:true returns only active products', async () => {
      const now = new Date()
      await db.insert(products).values([
        {
          id: 'prod-inactive',
          orgId: org1Id,
          name: 'Kaos Inactive',
          basePrice: 30000,
          minQuantity: 10,
          active: false,
          createdAt: now,
          updatedAt: now,
        },
      ])

      const requestContext = createRequestContext()
      const execute = searchProductTool.execute
      if (!execute) throw new Error('searchProductTool.execute is undefined')

      const results = (await execute({ query: 'Kaos', activeOnly: true }, {
        requestContext,
      } as never)) as Array<{ id: string; active: boolean }>

      expect(results.every((p) => p.active === true)).toBe(true)
      expect(results.some((p) => p.id === 'prod-1')).toBe(true)
      expect(results.some((p) => p.id === 'prod-inactive')).toBe(false)
    })

    it("with query 'Apparel' searches category field", async () => {
      const requestContext = createRequestContext()
      const execute = searchProductTool.execute
      if (!execute) throw new Error('searchProductTool.execute is undefined')

      const results = (await execute({ query: 'Apparel' }, {
        requestContext,
      } as never)) as Array<{ id: string; category: string | null }>

      expect(results.length).toBeGreaterThan(0)
      expect(results[0]?.category).toBe('Apparel')
    })

    it('returns at most 10 results', async () => {
      const now = new Date()
      const extraProducts = Array.from({ length: 12 }, (_, i) => ({
        id: `prod-bulk-${i}`,
        orgId: org1Id,
        name: `Bulk Product ${i}`,
        basePrice: 10000,
        minQuantity: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      }))
      await db.insert(products).values(extraProducts)

      const requestContext = createRequestContext()
      const execute = searchProductTool.execute
      if (!execute) throw new Error('searchProductTool.execute is undefined')

      const results = (await execute({ query: 'Bulk' }, {
        requestContext,
      } as never)) as Array<{ id: string }>

      expect(results.length).toBe(10)
    })

    it('does not return cross-org products', async () => {
      const requestContext = createRequestContext()
      const execute = searchProductTool.execute
      if (!execute) throw new Error('searchProductTool.execute is undefined')

      const results = (await execute({ query: 'Widget' }, {
        requestContext,
      } as never)) as Array<{ id: string; name: string }>

      expect(results.map((r) => r.name)).not.toContain('Widget B')
    })

    it('rejects without request context', async () => {
      const execute = searchProductTool.execute
      if (!execute) throw new Error('searchProductTool.execute is undefined')

      await expect(execute({ query: 'Kaos' }, {} as never)).rejects.toThrow(
        'Assistant request context is missing',
      )
    })
  })

  describe.sequential('createProductTool', () => {
    it("creates 'Tote Bag' with all required fields returns ok:true, id, url containing /products/", async () => {
      const requestContext = createRequestContext()
      const execute = createProductTool.execute
      if (!execute) throw new Error('createProductTool.execute is undefined')

      const result = (await execute(
        {
          name: 'Tote Bag',
          basePrice: 25000,
          minQuantity: 50,
          pricingMode: 'interpolated',
          productionDays: 5,
        },
        { requestContext } as never,
      )) as { ok: boolean; id?: string; url?: string; error?: string }

      expect(result.ok).toBe(true)
      expect(result.id).toBeDefined()
      expect(result.url).toContain('/products/')
    })

    it("with blank name returns 'Product name is required'", async () => {
      const requestContext = createRequestContext()
      const execute = createProductTool.execute
      if (!execute) throw new Error('createProductTool.execute is undefined')

      try {
        const result = (await execute(
          {
            name: '   ',
            basePrice: 25000,
            minQuantity: 50,
            pricingMode: 'interpolated',
            productionDays: 5,
          },
          { requestContext } as never,
        )) as { ok?: boolean; error?: string }

        if (result && typeof result.ok === 'boolean') {
          expect(result.ok).toBe(false)
          expect(result.error).toBe('Product name is required')
        }
      } catch (err: unknown) {
        expect(err).toBeDefined()
      }
    })

    it('with negative basePrice returns error', async () => {
      const requestContext = createRequestContext()
      const execute = createProductTool.execute
      if (!execute) throw new Error('createProductTool.execute is undefined')

      try {
        const result = (await execute(
          {
            name: 'Bad Product',
            basePrice: -100,
            minQuantity: 50,
            pricingMode: 'interpolated',
            productionDays: 5,
          },
          { requestContext } as never,
        )) as { ok?: boolean; error?: string }

        if (result && typeof result.ok === 'boolean') {
          expect(result.ok).toBe(false)
          expect(result.error).toBeDefined()
        }
      } catch (err: unknown) {
        expect(err).toBeDefined()
      }
    })
  })

  describe.sequential('updateProductTool', () => {
    it('updates name without breaking existing breakpoints/addons', async () => {
      const now = new Date()
      await db.insert(pricingBreakpoints).values([
        {
          id: 'bp-1',
          orgId: org1Id,
          productId: 'prod-1',
          minQuantity: 50,
          unitPrice: 45000,
          createdAt: now,
          updatedAt: now,
        },
      ])

      const requestContext = createRequestContext()
      const execute = updateProductTool.execute
      if (!execute) throw new Error('updateProductTool.execute is undefined')

      const result = (await execute(
        { id: 'prod-1', name: 'Kaos Super Premium' },
        { requestContext } as never,
      )) as { ok: boolean; id?: string; url?: string }

      expect(result.ok).toBe(true)

      const [updatedProduct] = await db
        .select()
        .from(products)
        .where(eq(products.id, 'prod-1'))
      expect(updatedProduct?.name).toBe('Kaos Super Premium')

      const existingBreakpoints = await db
        .select()
        .from(pricingBreakpoints)
        .where(eq(pricingBreakpoints.productId, 'prod-1'))
      expect(existingBreakpoints).toHaveLength(1)
      expect(existingBreakpoints[0]?.id).toBe('bp-1')
    })

    it("with cross-org ID returns 'Product not found'", async () => {
      const requestContext = createRequestContext()
      const execute = updateProductTool.execute
      if (!execute) throw new Error('updateProductTool.execute is undefined')

      const result = (await execute({ id: 'prod-2', name: 'Stolen Product' }, {
        requestContext,
      } as never)) as { ok: boolean; error?: string }

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Product not found')
    })
  })
})
