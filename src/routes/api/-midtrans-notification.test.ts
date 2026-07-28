import crypto from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  customers as customersTable,
  invoices as invoicesTable,
  midtransTransactions as midtransTransactionsTable,
  organization,
  organizationProfiles as organizationProfilesTable,
  payments as paymentsTable,
} from '#/db/schema'
import { createInvoice } from '#/features/invoices/model'
import { Route } from './midtrans-notification'

const webhookOrgId = '00000000-0000-0000-0000-000000000088'

describe('/api/midtrans-notification', () => {
  beforeEach(async () => {
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
    await db.insert(organizationProfilesTable).values({
      id: 'webhook-profile',
      orgId: webhookOrgId,
      midtransServerKey: 'mock_server_key',
      midtransClientKey: 'mock_client_key',
      midtransIsProduction: false,
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
  const serverOptions = Route.options.server as unknown as {
    handlers: {
      POST: (args: {
        request: Request
        params: Record<string, string>
      }) => Promise<Response>
    }
  }
  const handler = serverOptions.handlers.POST

  it('rejects with 403 on invalid signature', async () => {
    expect(handler).toBeDefined()
    if (!handler) return

    const result = await createInvoice(webhookOrgId, {
      customerId: 'webhook-cust',
      customerName: 'Webhook Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 10000 }],
    })
    await db.insert(midtransTransactionsTable).values({
      id: 'webhook-attempt-invalid',
      orgId: webhookOrgId,
      invoiceId: result.invoice.id,
      orderId: 'INV-123',
      expectedAmount: 10000,
      transactionStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

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

  it('returns 404 if transaction not found', async () => {
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
    expect(text).toBe('Transaction not found')
  })

  it('processes valid signature and confirms payment', async () => {
    expect(handler).toBeDefined()
    if (!handler) return

    // 1. Create invoice in DB with midtrans provider
    const result = await createInvoice(webhookOrgId, {
      customerId: 'webhook-cust',
      customerName: 'Webhook Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoice = result.invoice

    const orderId = `${invoice.invoiceNumber}-1718291823`
    await db.insert(midtransTransactionsTable).values({
      id: 'webhook-attempt-valid',
      orgId: webhookOrgId,
      invoiceId: invoice.id,
      orderId,
      expectedAmount: 100000,
      transactionStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await db.insert(midtransTransactionsTable).values({
      id: 'webhook-attempt-newer',
      orgId: webhookOrgId,
      invoiceId: invoice.id,
      orderId: `${invoice.invoiceNumber}-newer`,
      expectedAmount: 100000,
      transactionStatus: 'pending',
      createdAt: new Date(Date.now() + 1000),
      updatedAt: new Date(Date.now() + 1000),
    })

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

    // Verify payment was created and confirmed with method 'midtrans'
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.invoiceId, invoice.id))

    expect(payments).toHaveLength(1)
    expect(payments[0].amount).toBe(100000)
    expect(payments[0].status).toBe('confirmed')
    expect(payments[0].method).toBe('midtrans')
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
  it('ignores non-settlement statuses without confirming payment', async () => {
    expect(handler).toBeDefined()
    if (!handler) return

    const result = await createInvoice(webhookOrgId, {
      customerId: 'webhook-cust',
      customerName: 'Webhook Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 50000 }],
    })
    const invoice = result.invoice
    const orderId = `${invoice.invoiceNumber}-pending-test`
    await db.insert(midtransTransactionsTable).values({
      id: 'webhook-attempt-pending',
      orgId: webhookOrgId,
      invoiceId: invoice.id,
      orderId,
      expectedAmount: 50000,
      transactionStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const statusCode = '201'
    const grossAmount = '50000.00'
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
      transaction_status: 'pending',
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

    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.invoiceId, invoice.id))
    expect(payments).toHaveLength(0)
  })

  it('rejects amount mismatch with status 400', async () => {
    expect(handler).toBeDefined()
    if (!handler) return

    const result = await createInvoice(webhookOrgId, {
      customerId: 'webhook-cust',
      customerName: 'Webhook Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoice = result.invoice
    const orderId = `${invoice.invoiceNumber}-mismatch-test`

    await db.insert(midtransTransactionsTable).values({
      id: 'webhook-attempt-mismatch',
      orgId: webhookOrgId,
      invoiceId: invoice.id,
      orderId,
      expectedAmount: 100000,
      transactionStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const statusCode = '200'
    const grossAmount = '50000.00' // Mismatched amount
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
    expect(response.status).toBe(400)
    const text = await response.text()
    expect(text).toBe('Transaction amount mismatch')

    // Verify transaction status updated to mismatch in DB
    const [txRecord] = await db
      .select()
      .from(midtransTransactionsTable)
      .where(eq(midtransTransactionsTable.id, 'webhook-attempt-mismatch'))

    expect(txRecord.transactionStatus).toBe('mismatch')
    expect(txRecord.errorMessage).toContain(
      'Expected 100000, received 50000.00',
    )
  })

  it('handles concurrent duplicate notifications without creating duplicate payments', async () => {
    expect(handler).toBeDefined()
    if (!handler) return

    const result = await createInvoice(webhookOrgId, {
      customerId: 'webhook-cust',
      customerName: 'Webhook Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoice = result.invoice
    const orderId = `${invoice.invoiceNumber}-concurrent-test`

    await db.insert(midtransTransactionsTable).values({
      id: 'webhook-attempt-concurrent',
      orgId: webhookOrgId,
      invoiceId: invoice.id,
      orderId,
      expectedAmount: 100000,
      transactionStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

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

    const req1 = new Request('http://localhost/api/midtrans-notification', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })

    const req2 = new Request('http://localhost/api/midtrans-notification', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })

    // Execute concurrently
    const [res1, res2] = await Promise.all([
      handler({ request: req1, params: {} }),
      handler({ request: req2, params: {} }),
    ])

    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)

    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.invoiceId, invoice.id))

    expect(payments).toHaveLength(1)
    expect(payments[0].status).toBe('confirmed')
  })

  it('repairs/completes invoice state when retrying an event with existing pending or confirmed payment', async () => {
    expect(handler).toBeDefined()
    if (!handler) return

    const result = await createInvoice(webhookOrgId, {
      customerId: 'webhook-cust',
      customerName: 'Webhook Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoice = result.invoice
    const orderId = `${invoice.invoiceNumber}-retry-repair-test`

    await db.insert(midtransTransactionsTable).values({
      id: 'webhook-attempt-repair',
      orgId: webhookOrgId,
      invoiceId: invoice.id,
      orderId,
      expectedAmount: 100000,
      transactionStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Manually insert a pending payment with matching reference (simulating partial processing failure before confirmation)
    await db.insert(paymentsTable).values({
      id: 'pending-payment-to-repair',
      orgId: webhookOrgId,
      invoiceId: invoice.id,
      amount: 100000,
      method: 'midtrans',
      reference: orderId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

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
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await handler({ request, params: {} })
    expect(response.status).toBe(200)

    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.invoiceId, invoice.id))

    expect(payments).toHaveLength(1)
    expect(payments[0].id).toBe('pending-payment-to-repair')
    expect(payments[0].status).toBe('confirmed')

    const [updatedInvoice] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoice.id))

    expect(updatedInvoice.status).toBe('paid')
    expect(updatedInvoice.paidAt).toBeInstanceOf(Date)
  })

  it('updates amount of an existing pending payment if it differs from the gross_amount before confirming', async () => {
    expect(handler).toBeDefined()
    if (!handler) return

    const result = await createInvoice(webhookOrgId, {
      customerId: 'webhook-cust',
      customerName: 'Webhook Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoice = result.invoice
    const orderId = `${invoice.invoiceNumber}-pending-mismatch-test`

    await db.insert(midtransTransactionsTable).values({
      id: 'webhook-attempt-pending-mismatch',
      orgId: webhookOrgId,
      invoiceId: invoice.id,
      orderId,
      expectedAmount: 100000,
      transactionStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Insert pending payment with DIFFERENT amount (50,000 vs 100,000)
    await db.insert(paymentsTable).values({
      id: 'pending-payment-wrong-amount',
      orgId: webhookOrgId,
      invoiceId: invoice.id,
      amount: 50000,
      method: 'midtrans',
      reference: orderId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

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
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await handler({ request, params: {} })
    expect(response.status).toBe(200)

    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.invoiceId, invoice.id))

    expect(payments).toHaveLength(1)
    expect(payments[0].id).toBe('pending-payment-wrong-amount')
    expect(payments[0].status).toBe('confirmed')
    expect(payments[0].amount).toBe(100000)
  })

  it('repairs missing paidAt/paidBy metadata on retries even when invoice status is already paid', async () => {
    expect(handler).toBeDefined()
    if (!handler) return

    const result = await createInvoice(webhookOrgId, {
      customerId: 'webhook-cust',
      customerName: 'Webhook Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoice = result.invoice
    const orderId = `${invoice.invoiceNumber}-paid-metadata-repair`

    await db.insert(midtransTransactionsTable).values({
      id: 'webhook-attempt-paid-metadata',
      orgId: webhookOrgId,
      invoiceId: invoice.id,
      orderId,
      expectedAmount: 100000,
      transactionStatus: 'settlement',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Insert already confirmed payment
    await db.insert(paymentsTable).values({
      id: 'confirmed-payment-paid-repair',
      orgId: webhookOrgId,
      invoiceId: invoice.id,
      amount: 100000,
      method: 'midtrans',
      reference: orderId,
      status: 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Manually set invoice status to paid BUT missing paidBy and paidAt (simulating partial repair failure)
    await db
      .update(invoicesTable)
      .set({ status: 'paid', paidBy: null, paidAt: null })
      .where(eq(invoicesTable.id, invoice.id))

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
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await handler({ request, params: {} })
    expect(response.status).toBe(200)

    const [updatedInvoice] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoice.id))

    expect(updatedInvoice.status).toBe('paid')
    expect(updatedInvoice.paidBy).toBe('midtrans-webhook')
    expect(updatedInvoice.paidAt).toBeInstanceOf(Date)
  })
  it('returns status 400 for valid JSON with invalid schema', async () => {
    expect(handler).toBeDefined()
    if (!handler) return

    const body = {
      order_id: '', // Empty string fails .min(1) schema validation
      status_code: '200',
    }

    const request = new Request('http://localhost/api/midtrans-notification', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await handler({ request, params: {} })
    expect(response.status).toBe(400)
  })
  it('returns generic error without leaking internal details when internal exception occurs', async () => {
    expect(handler).toBeDefined()
    if (!handler) return

    // Mock db.select to throw an unexpected database error
    const spy = vi.spyOn(db, 'select').mockImplementationOnce(() => {
      throw new Error('Database connection failed unexpectedly')
    })

    const request = new Request('http://localhost/api/midtrans-notification', {
      method: 'POST',
      body: JSON.stringify({
        order_id: 'INV-123',
        status_code: '200',
        gross_amount: '10000',
        signature_key: 'sig',
        transaction_status: 'settlement',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await handler({ request, params: {} })
    expect(response.status).toBe(500)
    const text = await response.text()
    expect(text).toBe('Internal error')
    expect(text).not.toContain('Database')
    expect(text).not.toContain('failed')
    spy.mockRestore()
  })
  it('updates payment status on pending, deny, failure, cancel, and expire events without marking invoice paid', async () => {
    expect(handler).toBeDefined()
    if (!handler) return

    const statuses = ['deny', 'cancel', 'expire', 'failure'] as const

    for (const status of statuses) {
      const result = await createInvoice(webhookOrgId, {
        customerId: 'webhook-cust',
        customerName: 'Webhook Customer',
        dueDate: '2026-06-30',
        paymentProvider: 'midtrans',
        lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 50000 }],
      })
      const invoice = result.invoice
      const orderId = `${invoice.invoiceNumber}-${status}-test`

      await db.insert(midtransTransactionsTable).values({
        id: `attempt-${status}`,
        orgId: webhookOrgId,
        invoiceId: invoice.id,
        orderId,
        expectedAmount: 50000,
        transactionStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const signatureKey = crypto
        .createHash('sha512')
        .update(`${orderId}20050000mock_server_key`)
        .digest('hex')

      const body = {
        order_id: orderId,
        status_code: '200',
        gross_amount: '50000',
        signature_key: signatureKey,
        transaction_status: status,
      }

      const request = new Request(
        'http://localhost/api/midtrans-notification',
        {
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' },
        },
      )

      const response = await handler({ request, params: {} })
      expect(response.status).toBe(200)

      const [dbInvoice] = await db
        .select()
        .from(invoicesTable)
        .where(eq(invoicesTable.id, invoice.id))
      expect(dbInvoice.status).toBe('unpaid')
    }
  }, 20000)

  it('handles full and partial refunds, chargeback, and partial chargeback correctly', async () => {
    expect(handler).toBeDefined()
    if (!handler) return

    // 1. Partial refund test
    const res1 = await createInvoice(webhookOrgId, {
      customerId: 'webhook-cust',
      customerName: 'Webhook Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoice1 = res1.invoice
    const orderId1 = `${invoice1.invoiceNumber}-partial-refund-test`

    await db.insert(midtransTransactionsTable).values({
      id: 'attempt-partial-refund-test',
      orgId: webhookOrgId,
      invoiceId: invoice1.id,
      orderId: orderId1,
      expectedAmount: 100000,
      transactionStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const signatureKey1 = crypto
      .createHash('sha512')
      .update(`${orderId1}200100000mock_server_key`)
      .digest('hex')

    // Settle via capture accept
    await handler({
      request: new Request('http://localhost/api/midtrans-notification', {
        method: 'POST',
        body: JSON.stringify({
          order_id: orderId1,
          status_code: '200',
          gross_amount: '100000',
          fraud_status: 'accept',
          signature_key: signatureKey1,
          transaction_status: 'capture',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
      params: {},
    })

    // Send partial refund (30000 refunded out of 100000)
    await handler({
      request: new Request('http://localhost/api/midtrans-notification', {
        method: 'POST',
        body: JSON.stringify({
          order_id: orderId1,
          status_code: '200',
          gross_amount: '100000',
          refund_amount: '30000',
          signature_key: signatureKey1,
          transaction_status: 'partial_refund',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
      params: {},
    })

    const [partiallyRefundedInvoice] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoice1.id))
    expect(partiallyRefundedInvoice.status).toBe('partially_refunded')

    const [partialPayment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.invoiceId, invoice1.id))
    expect(partialPayment.status).toBe('partially_refunded')

    // 2. Full chargeback test
    const res2 = await createInvoice(webhookOrgId, {
      customerId: 'webhook-cust',
      customerName: 'Webhook Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item B', quantity: 1, unitPrice: 50000 }],
    })
    const invoice2 = res2.invoice
    const orderId2 = `${invoice2.invoiceNumber}-chargeback-test`

    await db.insert(midtransTransactionsTable).values({
      id: 'attempt-chargeback-test',
      orgId: webhookOrgId,
      invoiceId: invoice2.id,
      orderId: orderId2,
      expectedAmount: 50000,
      transactionStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const signatureKey2 = crypto
      .createHash('sha512')
      .update(`${orderId2}20050000mock_server_key`)
      .digest('hex')

    await handler({
      request: new Request('http://localhost/api/midtrans-notification', {
        method: 'POST',
        body: JSON.stringify({
          order_id: orderId2,
          status_code: '200',
          gross_amount: '50000',
          signature_key: signatureKey2,
          transaction_status: 'settlement',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
      params: {},
    })

    await handler({
      request: new Request('http://localhost/api/midtrans-notification', {
        method: 'POST',
        body: JSON.stringify({
          order_id: orderId2,
          status_code: '200',
          gross_amount: '50000',
          refund_amount: '50000',
          signature_key: signatureKey2,
          transaction_status: 'chargeback',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
      params: {},
    })
    const [inv2] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoice2.id))
    expect(inv2.status).toBe('refunded')
  }, 20000)

  it('prevents late settlement from overwriting a void or refunded invoice without review flag', async () => {
    const result = await createInvoice(webhookOrgId, {
      customerId: 'webhook-cust',
      customerName: 'Webhook Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoice = result.invoice
    const orderId = `${invoice.invoiceNumber}-void-test`

    await db.insert(midtransTransactionsTable).values({
      id: 'attempt-void-test',
      orgId: webhookOrgId,
      invoiceId: invoice.id,
      orderId,
      expectedAmount: 100000,
      transactionStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db
      .update(invoicesTable)
      .set({ status: 'void' })
      .where(eq(invoicesTable.id, invoice.id))

    const signatureKey = crypto
      .createHash('sha512')
      .update(`${orderId}200100000mock_server_key`)
      .digest('hex')

    await handler({
      request: new Request('http://localhost/api/midtrans-notification', {
        method: 'POST',
        body: JSON.stringify({
          order_id: orderId,
          status_code: '200',
          gross_amount: '100000',
          signature_key: signatureKey,
          transaction_status: 'settlement',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
      params: {},
    })

    const [voidInvoice] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoice.id))
    expect(voidInvoice.status).toBe('void')

    const [attempt] = await db
      .select()
      .from(midtransTransactionsTable)
      .where(eq(midtransTransactionsTable.id, 'attempt-void-test'))
    expect(attempt.transactionStatus).toBe('review_required')
  })
})
