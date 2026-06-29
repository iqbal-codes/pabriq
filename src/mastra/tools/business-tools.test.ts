import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  customers,
  member,
  orders,
  organization,
  productionStages,
  productionTasks,
} from '#/db/schema'
import { businessSearchTool } from './business-tools'

const org1Id = '00000000-0000-0000-0000-000000000001'
const org2Id = '00000000-0000-0000-0000-000000000002'
const user1Id = '00000000-0000-0000-0000-000000000011'

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE organization, member, customers, orders, production_stages, production_tasks CASCADE`,
  )

  const now = new Date()

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
    {
      id: 'cust-2',
      orgId: org2Id,
      name: 'Acme Other',
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
      orderNumber: 'ORD-001',
      status: 'pending',
      total: 100,
      createdAt: now,
      updatedAt: now,
    },
  ])

  await db.insert(productionStages).values([
    {
      id: 'stage-1',
      orgId: org1Id,
      name: 'Cutting',
      board: 'pre_production',
      orderIndex: 0,
      createdAt: now,
    },
  ])

  await db.insert(productionTasks).values([
    {
      id: 'task-1',
      orgId: org1Id,
      orderId: 'order-1',
      board: 'pre_production',
      stageId: 'stage-1',
      status: 'in_progress',
      taskNumber: 'TASK-001',
      context: {
        productName: 'Widget A',
        customerName: 'Acme Corp',
        requirements: null,
      },
      createdAt: now,
      updatedAt: now,
    },
  ])
})

describe('businessSearchTool', () => {
  it('returns seeded org records with valid request context', async () => {
    const { RequestContext } = await import('@mastra/core/request-context')
    const requestContext = new RequestContext<{
      orgId: string
      userId: string
      role: 'owner' | 'admin' | 'member'
    }>()
    requestContext.set('orgId', org1Id)
    requestContext.set('userId', user1Id)
    requestContext.set('role', 'owner')

    const execute = businessSearchTool.execute
    if (!execute) throw new Error('businessSearchTool.execute is undefined')

    const result = (await execute({ query: 'Acme', limit: 3 }, {
      requestContext,
    } as never)) as { records: { domain: string; title: string }[] }

    expect(result.records.length).toBeGreaterThan(0)
    const customerRecord = result.records.find((r) => r.domain === 'customers')
    expect(customerRecord).toBeDefined()
    expect(customerRecord?.title).toBe('Acme Corp')
  })

  it('does not return cross-org records', async () => {
    const { RequestContext } = await import('@mastra/core/request-context')
    const requestContext = new RequestContext<{
      orgId: string
      userId: string
      role: 'owner' | 'admin' | 'member'
    }>()
    requestContext.set('orgId', org1Id)
    requestContext.set('userId', user1Id)
    requestContext.set('role', 'owner')

    const execute = businessSearchTool.execute
    if (!execute) throw new Error('businessSearchTool.execute is undefined')

    const result = (await execute(
      { query: 'Acme', domains: ['customers'], limit: 5 },
      { requestContext } as never,
    )) as { records: { domain: string; title: string }[] }

    const titles = result.records.map((r) => r.title)
    expect(titles).toContain('Acme Corp')
    expect(titles).not.toContain('Acme Other')
  })

  it('rejects without request context', async () => {
    const execute = businessSearchTool.execute
    if (!execute) throw new Error('businessSearchTool.execute is undefined')

    await expect(
      execute({ query: 'test', limit: 3 }, {} as never),
    ).rejects.toThrow('Assistant request context is missing')
  })
})
