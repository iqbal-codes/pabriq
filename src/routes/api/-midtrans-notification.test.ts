import crypto from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  customers as customersTable,
  invoices as invoicesTable,
  organization,
  payments as paymentsTable,
} from '#/db/schema'
import { createInvoice } from '#/features/invoices/model'
import { Route } from './midtrans-notification'

const webhookOrgId = '00000000-0000-0000-0000-000000000088'

describe('/api/midtrans-notification', () => {
  beforeEach(async () => {
    process.env.MIDTRANS_SERVER_KEY = 'mock_server_key'

    await db.execute(
      sql`TRUNCATE organization, biteship_areas, payment_methods CASCADE`,
    )

    const now = new Date()
    await db.insert(organization).values({
      id: webhookOrgId,
      name: 'Webhook Org',
      slug: 'webhook-org',
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(customersTable).values({
      id: 'webhook-cust',
      orgId: webhookOrgId,
      name: 'Webhook Customer',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
  })

  // Cast the server options to retrieve the POST handler since TanStack Router's typings hide it at compile time.
  const serverOptions = Route.options.server as {
    handlers?: {
      POST?: (args: {
        request: Request
        params: Record<string, string>
      }) => Promise<Response>
    }
  }
  const handler = serverOptions?.handlers?.POST

  it('rejects with 403 on invalid signature', async () => {
    expect(handler).toBeDefined()
    if (!handler) return

    const body = {
      order_id: 'INV-123',
      status_code: '200',
      gross_amount: '10000',
      signature_key: 'invalid_sig',
      transaction_status: 'settlement',
    }

    const request = new Request('http://localhost/api/midtrans-notification', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await handler({ request, params: {} })
    expect(response.status).toBe(403)
    const text = await response.text()
    expect(text).toBe('Unauthorized signature')
  })

  it('returns 404 if invoice not found', async () => {
    expect(handler).toBeDefined()
    if (!handler) return

    const orderId = 'INV-999-12345'
    const statusCode = '200'
    const grossAmount = '10000'
    const serverKey = 'mock_server_key'

    const signatureKey = crypto
      .createHash('sha512')
      .update(orderId + statusCode + grossAmount + serverKey)
      .digest('hex')

    const body = {
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signatureKey,
      transaction_status: 'settlement',
    }

    const request = new Request('http://localhost/api/midtrans-notification', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await handler({ request, params: {} })
    expect(response.status).toBe(404)
    const text = await response.text()
    expect(text).toBe('Invoice not found')
  })

  it('processes valid signature and confirms payment', async () => {
    expect(handler).toBeDefined()
    if (!handler) return

    // 1. Create invoice in DB
    const result = await createInvoice(webhookOrgId, {
      customerId: 'webhook-cust',
      customerName: 'Webhook Customer',
      dueDate: '2026-06-30',
      paymentMethodId: null,
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoice = result.invoice

    const orderId = `${invoice.invoiceNumber}-1718291823`
    const statusCode = '200'
    const grossAmount = '100000.00'
    const serverKey = 'mock_server_key'

    const signatureKey = crypto
      .createHash('sha512')
      .update(orderId + statusCode + grossAmount + serverKey)
      .digest('hex')

    const body = {
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signatureKey,
      transaction_status: 'settlement',
    }

    const request = new Request('http://localhost/api/midtrans-notification', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await handler({ request, params: {} })
    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).toBe('OK')

    // Verify payment was created and confirmed
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.invoiceId, invoice.id))

    expect(payments).toHaveLength(1)
    expect(payments[0].amount).toBe(100000)
    expect(payments[0].status).toBe('confirmed')
    expect(payments[0].reference).toBe(orderId)
    expect(payments[0].confirmedBy).toBe('midtrans-webhook')

    // Verify invoice status is paid
    const [updatedInvoice] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoice.id))
      .limit(1)

    expect(updatedInvoice.status).toBe('paid')
    expect(updatedInvoice.paidBy).toBe('midtrans-webhook')

    // 2. Test Idempotency: Send the same webhook again
    const request2 = new Request('http://localhost/api/midtrans-notification', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const response2 = await handler({ request: request2, params: {} })
    expect(response2.status).toBe(200)

    // Verify no duplicate payment record was created
    const paymentsAfter = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.invoiceId, invoice.id))
    expect(paymentsAfter).toHaveLength(1)
  })
})
