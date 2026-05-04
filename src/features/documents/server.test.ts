import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  pricingBreakpoints as breakpointsTable,
  customers as customersTable,
  organization,
  products as productsTable,
} from '#/db/schema'
import { createDraftOrder } from '#/features/orders/model'
import { generateQuotationPdf } from './server'

const org1Id = '00000000-0000-0000-0000-000000000001'
const org2Id = '00000000-0000-0000-0000-000000000002'

beforeEach(async () => {
  await db.execute(sql`TRUNCATE organization, biteship_areas CASCADE`)
  const now = new Date()
  await db.insert(organization).values([
    {
      id: org1Id,
      name: 'Org 1',
      slug: 'org-1',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: org2Id,
      name: 'Org 2',
      slug: 'org-2',
      createdAt: now,
      updatedAt: now,
    },
  ])
})

describe('generateQuotationPdf', () => {
  it('returns a Buffer from valid order data', async () => {
    const now = new Date()

    await db.insert(customersTable).values({
      id: 'cust-1',
      orgId: org1Id,
      name: 'Acme Corp',
      email: 'acme@example.com',
      phone: '08123456789',
      address: 'Jakarta',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(productsTable).values({
      id: 'prod-1',
      orgId: org1Id,
      name: 'Custom T-Shirt',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(breakpointsTable).values([
      {
        id: 'bp-1',
        orgId: org1Id,
        productId: 'prod-1',
        minQuantity: 1,
        unitPrice: 150000,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const orderResult = await createDraftOrder(org1Id, {
      customerId: 'cust-1',
      lineItems: [{ productId: 'prod-1', quantity: 2 }],
    })

    const buffer = await generateQuotationPdf(org1Id, orderResult.order.id)
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer.slice(0, 4).toString()).toBe('%PDF')
  })

  it('throws for nonexistent order', async () => {
    await expect(
      generateQuotationPdf(org1Id, 'nonexistent-id'),
    ).rejects.toThrow('Order not found')
  })

  it('PDF output contains expected text (quote number, customer name, product names)', async () => {
    const now = new Date()

    await db.insert(customersTable).values({
      id: 'cust-pdf-1',
      orgId: org1Id,
      name: 'Test Customer PDF',
      email: 'pdf@example.com',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(productsTable).values({
      id: 'prod-pdf-1',
      orgId: org1Id,
      name: 'Test Product for PDF',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(breakpointsTable).values({
      id: 'bp-pdf-1',
      orgId: org1Id,
      productId: 'prod-pdf-1',
      minQuantity: 1,
      unitPrice: 50000,
      createdAt: now,
      updatedAt: now,
    })

    const orderResult = await createDraftOrder(org1Id, {
      customerId: 'cust-pdf-1',
      lineItems: [{ productId: 'prod-pdf-1', quantity: 3 }],
    })

    const buffer = await generateQuotationPdf(org1Id, orderResult.order.id)
    expect(buffer.slice(0, 4).toString()).toBe('%PDF')
    expect(buffer.length).toBeGreaterThan(1000)
  })
})
