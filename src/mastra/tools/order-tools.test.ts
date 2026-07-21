import { RequestContext } from '@mastra/core/request-context'
import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  customers,
  member,
  orderLineItems,
  orders,
  organization,
  products,
  user,
} from '#/db/schema'
import {
  getOrderTool,
  searchOrderTool,
  updateDraftOrderTool,
} from './order-tools'

const org1Id = '00000000-0000-0000-0000-000000000001'
const org2Id = '00000000-0000-0000-0000-000000000002'
const user1Id = '00000000-0000-0000-0000-000000000011'

describe.sequential('order-tools', () => {
  beforeEach(async () => {
    await db.execute(
      sql`TRUNCATE "user", organization, member, customers, products, orders, order_line_items CASCADE`,
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
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    await db.insert(products).values([
      {
        id: 'prod-1',
        orgId: org1Id,
        name: 'Kaos Premium',
        basePrice: 50000,
        minQuantity: 100,
        productionDays: 3,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    await db.insert(orders).values([
      {
        id: 'order-1',
        orgId: org1Id,
        customerId: 'cust-1',
        status: 'draft',
        total: 1000000,
        orderNumber: 'ORD-2026-001',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'order-2',
        orgId: org1Id,
        customerId: 'cust-1',
        status: 'pending',
        total: 500000,
        orderNumber: 'ORD-2026-002',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'order-3',
        orgId: org2Id,
        customerId: null,
        status: 'draft',
        total: 200000,
        orderNumber: 'ORD-2026-003',
        createdAt: now,
        updatedAt: now,
      },
    ])

    await db.insert(orderLineItems).values([
      {
        id: 'line-1',
        orgId: org1Id,
        orderId: 'order-1',
        productId: 'prod-1',
        productName: 'Kaos Premium',
        quantity: 100,
        unitPrice: 50000,
        total: 5000000,
        createdAt: now,
        updatedAt: now,
      },
    ])
  })

  function createTestContext(orgId = org1Id) {
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

  it('searchOrderTool returns org1 orders with valid context', async () => {
    const requestContext = createTestContext(org1Id)
    const execute = searchOrderTool.execute
    if (!execute) throw new Error('searchOrderTool.execute is undefined')

    const result = (await execute({}, { requestContext } as never)) as Array<{
      id: string
      orderNumber: string | null
      customerName: string | null
      status: string
      total: number
      createdAt: string
    }>

    expect(result).toHaveLength(2)
    const ids = result.map((o) => o.id)
    expect(ids).toContain('order-1')
    expect(ids).toContain('order-2')
    expect(ids).not.toContain('order-3')
  })

  it('searchOrderTool filters by status draft returns only draft orders', async () => {
    const requestContext = createTestContext(org1Id)
    const execute = searchOrderTool.execute
    if (!execute) throw new Error('searchOrderTool.execute is undefined')

    const result = (await execute({ status: 'draft' }, {
      requestContext,
    } as never)) as Array<{
      id: string
      status: string
    }>

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('order-1')
    expect(result[0].status).toBe('draft')
  })

  it('searchOrderTool filters by customerId returns only matching orders', async () => {
    const requestContext = createTestContext(org1Id)
    const execute = searchOrderTool.execute
    if (!execute) throw new Error('searchOrderTool.execute is undefined')

    const result = (await execute({ customerId: 'cust-1' }, {
      requestContext,
    } as never)) as Array<{
      id: string
    }>

    expect(result).toHaveLength(2)
    const ids = result.map((o) => o.id)
    expect(ids).toContain('order-1')
    expect(ids).toContain('order-2')

    const emptyResult = (await execute({ customerId: 'nonexistent-cust' }, {
      requestContext,
    } as never)) as Array<{ id: string }>
    expect(emptyResult).toHaveLength(0)
  })

  it('searchOrderTool does not return cross-org orders', async () => {
    const requestContext = createTestContext(org1Id)
    const execute = searchOrderTool.execute
    if (!execute) throw new Error('searchOrderTool.execute is undefined')

    const result = (await execute({}, { requestContext } as never)) as Array<{
      id: string
    }>

    const ids = result.map((o) => o.id)
    expect(ids).not.toContain('order-3')
  })

  it('getOrderTool returns order with line items for org1 order', async () => {
    const requestContext = createTestContext(org1Id)
    const execute = getOrderTool.execute
    if (!execute) throw new Error('getOrderTool.execute is undefined')

    const result = (await execute({ orderId: 'order-1' }, {
      requestContext,
    } as never)) as {
      ok: boolean
      order?: { id: string; status: string }
      lineItems?: Array<{ id: string; productId: string }>
      customerName?: string | null
    }

    expect(result.ok).toBe(true)
    expect(result.order?.id).toBe('order-1')
    expect(result.customerName).toBe('Acme Corp')
    expect(result.lineItems).toBeDefined()
    expect(result.lineItems).toHaveLength(1)
    expect(result.lineItems?.[0].id).toBe('line-1')
  })

  it('getOrderTool returns Order not found for cross-org order ID', async () => {
    const requestContext = createTestContext(org1Id)
    const execute = getOrderTool.execute
    if (!execute) throw new Error('getOrderTool.execute is undefined')

    const result = (await execute({ orderId: 'order-3' }, {
      requestContext,
    } as never)) as {
      ok: boolean
      error?: string
    }

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Order not found')
  })

  it('updateDraftOrderTool updates notes on draft order returns ok:true', async () => {
    const requestContext = createTestContext(org1Id)
    const execute = updateDraftOrderTool.execute
    if (!execute) throw new Error('updateDraftOrderTool.execute is undefined')

    const result = (await execute(
      { orderId: 'order-1', notes: 'Updated notes from assistant' },
      { requestContext } as never,
    )) as {
      ok: boolean
      orderId?: string
      adminUrl?: string
      error?: string
    }
    if (!result.ok) throw new Error(`update notes error: ${result.error}`)
    expect(result.ok).toBe(true)
    expect(result.adminUrl).toContain('/orders/order-1')

    const getExecute = getOrderTool.execute
    if (!getExecute) throw new Error('getOrderTool.execute is undefined')
    const updated = (await getExecute({ orderId: 'order-1' }, {
      requestContext,
    } as never)) as {
      ok: boolean
      order?: { notes: string | null }
    }

    expect(updated.order?.notes).toBe('Updated notes from assistant')
  })

  it('updateDraftOrderTool rejects non-draft order with Can only modify draft orders', async () => {
    const requestContext = createTestContext(org1Id)
    const execute = updateDraftOrderTool.execute
    if (!execute) throw new Error('updateDraftOrderTool.execute is undefined')

    const result = (await execute(
      { orderId: 'order-2', notes: 'Try modifying pending order' },
      { requestContext } as never,
    )) as {
      ok: boolean
      error?: string
    }

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Can only modify draft orders')
  })

  it('updateDraftOrderTool replaces line items when supplied', async () => {
    const requestContext = createTestContext(org1Id)
    const execute = updateDraftOrderTool.execute
    if (!execute) throw new Error('updateDraftOrderTool.execute is undefined')

    const result = (await execute(
      {
        orderId: 'order-1',
        lineItems: [
          {
            productId: 'prod-1',
            quantity: 150,
            notes: 'Replacement item notes',
          },
        ],
      },
      { requestContext } as never,
    )) as {
      ok: boolean
      orderId?: string
      error?: string
    }
    if (!result.ok)
      throw new Error(`replaces line items error: ${result.error}`)
    expect(result.ok).toBe(true)

    const getExecute = getOrderTool.execute
    if (!getExecute) throw new Error('getOrderTool.execute is undefined')
    const updated = (await getExecute({ orderId: 'order-1' }, {
      requestContext,
    } as never)) as {
      ok: boolean
      lineItems?: Array<{
        productId: string
        quantity: number
        notes: string | null
      }>
    }

    expect(updated.lineItems).toHaveLength(1)
    expect(updated.lineItems?.[0].productId).toBe('prod-1')
    expect(updated.lineItems?.[0].quantity).toBe(150)
    expect(updated.lineItems?.[0].notes).toBe('Replacement item notes')
  })

  it('searchOrderTool rejects without request context', async () => {
    const execute = searchOrderTool.execute
    if (!execute) throw new Error('searchOrderTool.execute is undefined')

    await expect(execute({}, {} as never)).rejects.toThrow(
      'Assistant request context is missing',
    )
  })
})
