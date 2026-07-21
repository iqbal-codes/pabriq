import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  customers,
  invoices,
  member,
  orders,
  organization,
  pricingBreakpoints,
  productionStages,
  productionTasks,
  products,
  user,
} from '#/db/schema'
import {
  buildAssistantMemoryScope,
  getAssistantAllowedDomains,
  getAssistantBusinessOverview,
  normalizeMastraMemoryMessages,
  resolveOrderDraft,
  searchAssistantBusinessRecords,
} from './model'

const org1Id = '00000000-0000-0000-0000-000000000001'
const org2Id = '00000000-0000-0000-0000-000000000002'
const user1Id = '00000000-0000-0000-0000-000000000011'
const user2Id = '00000000-0000-0000-0000-000000000012'
beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE organization, "user", member, customers, products, orders, invoices, production_stages, production_tasks CASCADE`,
  )

  const now = new Date()

  // Seed two orgs
  await db.insert(organization).values([
    { id: org1Id, name: 'Org 1', slug: 'org-1', createdAt: now },
    { id: org2Id, name: 'Org 2', slug: 'org-2', createdAt: now },
  ])
  await db.insert(user).values([
    {
      id: user1Id,
      name: 'Owner One',
      email: 'owner-one@example.test',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: user2Id,
      name: 'Member Two',
      email: 'member-two@example.test',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
  ])

  // Seed members
  await db.insert(member).values([
    {
      id: 'member-1',
      organizationId: org1Id,
      userId: user1Id,
      role: 'owner',
      createdAt: now,
    },
    {
      id: 'member-2',
      organizationId: org1Id,
      userId: user2Id,
      role: 'member',
      createdAt: now,
    },
  ])

  // Seed customers
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
      orgId: org1Id,
      name: 'Beta Inc',
      email: 'beta@example.com',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cust-3',
      orgId: org2Id,
      name: 'Acme Other Org',
      email: 'acme-other@example.com',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ])

  // Seed products
  await db.insert(products).values([
    {
      id: 'prod-1',
      orgId: org1Id,
      name: 'Widget A',
      description: 'A fine widget',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-2',
      orgId: org2Id,
      name: 'Widget B',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ])

  // Seed orders
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
    {
      id: 'order-2',
      orgId: org1Id,
      customerId: 'cust-1',
      orderNumber: 'ORD-002',
      status: 'completed',
      total: 200,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'order-3',
      orgId: org2Id,
      orderNumber: 'ORD-003',
      status: 'pending',
      total: 50,
      createdAt: now,
      updatedAt: now,
    },
  ])

  // Seed invoices
  await db.insert(invoices).values([
    {
      id: 'inv-1',
      orgId: org1Id,
      orderId: 'order-1',
      customerId: 'cust-1',
      invoiceNumber: 'INV-001',
      customerName: 'Acme Corp',
      status: 'unpaid',
      subtotal: 100,
      total: 100,
      percentage: 100,
      dueDate: '2025-12-31',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'inv-2',
      orgId: org2Id,
      orderId: 'order-3',
      customerId: 'cust-3',
      invoiceNumber: 'INV-002',
      customerName: 'Other Corp',
      status: 'unpaid',
      subtotal: 50,
      total: 50,
      percentage: 100,
      dueDate: '2025-12-31',
      createdAt: now,
      updatedAt: now,
    },
  ])

  // Seed production stages and tasks
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
    {
      id: 'task-2',
      orgId: org2Id,
      orderId: 'order-3',
      board: 'pre_production',
      status: 'queued',
      context: {
        productName: 'Widget B',
        customerName: 'Other Corp',
        requirements: null,
      },
      createdAt: now,
      updatedAt: now,
    },
  ])
})

describe('getAssistantAllowedDomains', () => {
  it('returns all domains for owner', () => {
    const domains = getAssistantAllowedDomains('owner')
    expect(domains).toEqual([
      'customers',
      'products',
      'orders',
      'invoices',
      'production',
    ])
  })

  it('returns all domains for admin', () => {
    const domains = getAssistantAllowedDomains('admin')
    expect(domains).toEqual([
      'customers',
      'products',
      'orders',
      'invoices',
      'production',
    ])
  })

  it('returns only production for member', () => {
    const domains = getAssistantAllowedDomains('member')
    expect(domains).toEqual(['production'])
  })
})

describe('searchAssistantBusinessRecords', () => {
  it('returns org-scoped customer records for owner', async () => {
    const result = await searchAssistantBusinessRecords({
      context: { orgId: org1Id, userId: user1Id, role: 'owner' },
      query: 'Acme',
      domains: ['customers'],
      limit: 5,
    })

    expect(result.records).toHaveLength(1)
    expect(result.records[0].title).toBe('Acme Corp')
    expect(result.records[0].domain).toBe('customers')
    expect(result.records[0].href).toBe('/customers/cust-1')
    expect(result.omittedDomains).toEqual([])
  })

  it('does not return records from other orgs', async () => {
    const result = await searchAssistantBusinessRecords({
      context: { orgId: org1Id, userId: user1Id, role: 'owner' },
      query: 'Acme',
      domains: ['customers'],
      limit: 5,
    })

    // Should find Acme Corp in org1 but not Acme Other Org in org2
    const titles = result.records.map((r) => r.title)
    expect(titles).toContain('Acme Corp')
    expect(titles).not.toContain('Acme Other Org')
  })

  it('returns orders matching search', async () => {
    const result = await searchAssistantBusinessRecords({
      context: { orgId: org1Id, userId: user1Id, role: 'owner' },
      query: 'ORD-001',
      domains: ['orders'],
      limit: 5,
    })

    expect(result.records).toHaveLength(1)
    expect(result.records[0].title).toBe('ORD-001')
    expect(result.records[0].domain).toBe('orders')
  })

  it('restricts member to production only', async () => {
    const result = await searchAssistantBusinessRecords({
      context: { orgId: org1Id, userId: user2Id, role: 'member' },
      query: 'Acme',
      domains: ['customers', 'production'],
      limit: 5,
    })

    expect(result.omittedDomains).toContain('customers')
    // Production search may or may not find results, but customers must be omitted
    const customerRecords = result.records.filter(
      (r) => r.domain === 'customers',
    )
    expect(customerRecords).toHaveLength(0)
  })

  it('returns empty records when all requested domains are omitted', async () => {
    const result = await searchAssistantBusinessRecords({
      context: { orgId: org1Id, userId: user2Id, role: 'member' },
      query: 'test',
      domains: ['customers', 'orders', 'invoices'],
      limit: 5,
    })

    expect(result.records).toEqual([])
    expect(result.omittedDomains).toEqual(['customers', 'orders', 'invoices'])
  })
})

describe('getAssistantBusinessOverview', () => {
  it('returns counts for owner across all domains', async () => {
    const overview = await getAssistantBusinessOverview({
      orgId: org1Id,
      userId: user1Id,
      role: 'owner',
    })

    expect(overview.customers).toBe(2) // Acme Corp + Beta Inc
    expect(overview.activeProducts).toBe(1) // Widget A
    expect(overview.openOrders).toBe(1) // ORD-001 (pending)
    expect(overview.unpaidInvoices).toBe(1) // INV-001
    expect(overview.activeProductionTasks).toBe(1) // task-1
    expect(overview.omittedDomains).toEqual([])
  })

  it('returns null for restricted domains for member', async () => {
    const overview = await getAssistantBusinessOverview({
      orgId: org1Id,
      userId: user2Id,
      role: 'member',
    })

    expect(overview.customers).toBeNull()
    expect(overview.activeProducts).toBeNull()
    expect(overview.openOrders).toBeNull()
    expect(overview.unpaidInvoices).toBeNull()
    expect(overview.activeProductionTasks).toBe(1)
    expect(overview.omittedDomains).toEqual([
      'customers',
      'products',
      'orders',
      'invoices',
    ])
  })

  it('counts only org-scoped data', async () => {
    const overview = await getAssistantBusinessOverview({
      orgId: org2Id,
      userId: user1Id,
      role: 'owner',
    })

    expect(overview.customers).toBe(1) // Acme Other Org
    expect(overview.activeProducts).toBe(1) // Widget B
    expect(overview.openOrders).toBe(1) // ORD-003
    expect(overview.unpaidInvoices).toBe(1) // INV-002
    expect(overview.activeProductionTasks).toBe(1) // task-2
  })
})

describe('buildAssistantMemoryScope', () => {
  it('returns different thread/resource for different users in same org', () => {
    const scope1 = buildAssistantMemoryScope({
      orgId: 'org-1',
      userId: 'user-1',
    })
    const scope2 = buildAssistantMemoryScope({
      orgId: 'org-1',
      userId: 'user-2',
    })

    expect(scope1.thread).not.toBe(scope2.thread)
    expect(scope1.resource).not.toBe(scope2.resource)
    expect(scope1.thread).toBe('assistant:org-1:user-1')
    expect(scope2.thread).toBe('assistant:org-1:user-2')
  })

  it('returns different thread/resource for same user in different orgs', () => {
    const scope1 = buildAssistantMemoryScope({
      orgId: 'org-1',
      userId: 'user-1',
    })
    const scope2 = buildAssistantMemoryScope({
      orgId: 'org-2',
      userId: 'user-1',
    })

    expect(scope1.thread).not.toBe(scope2.thread)
    expect(scope1.resource).not.toBe(scope2.resource)
  })

  it('returns consistent values for same inputs', () => {
    const scope1 = buildAssistantMemoryScope({
      orgId: 'org-1',
      userId: 'user-1',
    })
    const scope2 = buildAssistantMemoryScope({
      orgId: 'org-1',
      userId: 'user-1',
    })

    expect(scope1.thread).toBe(scope2.thread)
    expect(scope1.resource).toBe(scope2.resource)
  })
})

describe('normalizeMastraMemoryMessages', () => {
  it('keeps user and assistant text messages', () => {
    const messages = [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Hi there',
        createdAt: '2024-01-01T00:00:01Z',
      },
    ]

    const result = normalizeMastraMemoryMessages(messages)
    expect(result).toHaveLength(2)
    expect(result[0].role).toBe('user')
    expect(result[0].content).toBe('Hello')
    expect(result[1].role).toBe('assistant')
    expect(result[1].content).toBe('Hi there')
  })

  it('drops tool and system messages', () => {
    const messages = [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        role: 'tool',
        content: 'result',
        createdAt: '2024-01-01T00:00:01Z',
      },
      {
        id: '3',
        role: 'system',
        content: 'system msg',
        createdAt: '2024-01-01T00:00:02Z',
      },
      {
        id: '4',
        role: 'assistant',
        content: 'Hi',
        createdAt: '2024-01-01T00:00:03Z',
      },
    ]

    const result = normalizeMastraMemoryMessages(messages)
    expect(result).toHaveLength(2)
    expect(result[0].role).toBe('user')
    expect(result[1].role).toBe('assistant')
  })

  it('sorts by createdAt ascending', () => {
    const messages = [
      {
        id: '2',
        role: 'assistant',
        content: 'Second',
        createdAt: '2024-01-02T00:00:00Z',
      },
      {
        id: '1',
        role: 'user',
        content: 'First',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]

    const result = normalizeMastraMemoryMessages(messages)
    expect(result[0].content).toBe('First')
    expect(result[1].content).toBe('Second')
  })

  it('extracts text from { text } objects', () => {
    const messages = [
      {
        id: '1',
        role: 'user',
        content: { text: 'Hello' },
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]

    const result = normalizeMastraMemoryMessages(messages)
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('Hello')
  })

  it('extracts text from array of text parts', () => {
    const messages = [
      {
        id: '1',
        role: 'user',
        content: [
          { type: 'text', text: 'Part 1' },
          { type: 'text', text: 'Part 2' },
        ],
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]

    const result = normalizeMastraMemoryMessages(messages)
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('Part 1\nPart 2')
  })

  it('extracts text and completed tool calls from Mastra format 2 content', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant',
        content: {
          format: 2,
          parts: [
            {
              type: 'tool-invocation',
              toolInvocation: {
                state: 'result',
                toolCallId: 'tc-1',
                toolName: 'businessSearch',
                args: { query: 'LeBron' },
                result: { count: 1 },
              },
            },
            { type: 'text', text: 'I found one customer.' },
          ],
        },
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]

    const result = normalizeMastraMemoryMessages(messages)

    expect(result).toEqual([
      {
        id: '1',
        role: 'assistant',
        content: 'I found one customer.',
        createdAt: '2024-01-01T00:00:00Z',
        metadata: undefined,
        toolCalls: [
          {
            toolCallId: 'tc-1',
            toolName: 'businessSearch',
            status: 'done',
            summary: null,
          },
        ],
      },
    ])
  })

  it('keeps tool-only assistant history visible', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant',
        content: {
          format: 2,
          parts: [
            {
              type: 'tool-invocation',
              toolInvocation: {
                state: 'result',
                toolCallId: 'tc-1',
                toolName: 'businessOverview',
                args: {},
                result: { status: 'ok' },
              },
            },
          ],
        },
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]

    const result = normalizeMastraMemoryMessages(messages)

    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('')
    expect(result[0].toolCalls).toEqual([
      {
        toolCallId: 'tc-1',
        toolName: 'businessOverview',
        status: 'done',
        summary: null,
      },
    ])
  })

  it('skips messages with no extractable text', () => {
    const messages = [
      {
        id: '1',
        role: 'user',
        content: null,
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        role: 'assistant',
        content: '',
        createdAt: '2024-01-01T00:00:01Z',
      },
      {
        id: '3',
        role: 'user',
        content: 'Valid',
        createdAt: '2024-01-01T00:00:02Z',
      },
    ]

    const result = normalizeMastraMemoryMessages(messages)
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('Valid')
  })
})

describe('resolveOrderDraft', () => {
  it('preserves duplicate candidates for the same product', async () => {
    await db
      .update(products)
      .set({ basePrice: 10, minQuantity: 1 })
      .where(sql`${products.id} = 'prod-1'`)
    await db.insert(pricingBreakpoints).values({
      id: 'bp-1',
      orgId: org1Id,
      productId: 'prod-1',
      minQuantity: 1,
      unitPrice: 10,
    })

    const result = await resolveOrderDraft({
      orgId: org1Id,
      candidates: [
        { productHint: 'Widget A', quantity: 2 },
        { productHint: 'Widget A', quantity: 3 },
      ],
    })

    expect(result).toMatchObject({
      status: 'resolved',
      total: 50,
      lineItems: [
        { productId: 'prod-1', quantity: 2, total: 20 },
        { productId: 'prod-1', quantity: 3, total: 30 },
      ],
    })
  })

  it('preserves LIKE underscore wildcard matching', async () => {
    const now = new Date()
    await db.insert(products).values([
      {
        id: 'prod-like-1',
        orgId: org1Id,
        name: 'Code_A',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-like-2',
        orgId: org1Id,
        name: 'CodeXA',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await resolveOrderDraft({
      orgId: org1Id,
      candidates: [{ productHint: 'Code_A', quantity: 1 }],
    })

    expect(result).toMatchObject({
      status: 'ambiguous',
      missing: [
        {
          productHint: 'Code_A',
          matchedProductIds: ['prod-like-2', 'prod-like-1'],
        },
      ],
    })
  })
})
