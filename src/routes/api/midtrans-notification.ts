import crypto from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  invoices as invoicesTable,
  organizationProfiles as organizationProfilesTable,
  payments as paymentsTable,
} from '#/db/schema'
import { confirmPayment, createPayment } from '#/features/invoices/model'

interface MidtransWebhookBody {
  order_id: string
  status_code: string
  gross_amount: string
  signature_key: string
  transaction_status: string
  fraud_status?: string
}

function verifyMidtransSignature(
  body: MidtransWebhookBody,
  serverKey: string,
): boolean {
  const hash = crypto
    .createHash('sha512')
    .update(body.order_id + body.status_code + body.gross_amount + serverKey)
    .digest('hex')
  const expected = Buffer.from(hash, 'hex')
  const received = Buffer.from(body.signature_key, 'hex')
  if (expected.length !== received.length) {
    return false
  }
  return crypto.timingSafeEqual(expected, received)
}

export const Route = createFileRoute('/api/midtrans-notification')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as MidtransWebhookBody

          const [invoice] = await db
            .select({
              id: invoicesTable.id,
              orgId: invoicesTable.orgId,
              midtransServerKey: organizationProfilesTable.midtransServerKey,
            })
            .from(invoicesTable)
            .leftJoin(
              organizationProfilesTable,
              eq(invoicesTable.orgId, organizationProfilesTable.orgId),
            )
            .where(eq(invoicesTable.midtransOrderId, body.order_id))
            .limit(1)

          if (!invoice) {
            return new Response('Invoice not found', { status: 404 })
          }

          const serverKey = (invoice.midtransServerKey ?? '').trim()
          if (!serverKey) {
            return new Response('Unauthorized signature', { status: 403 })
          }

          if (!verifyMidtransSignature(body, serverKey)) {
            return new Response('Unauthorized signature', { status: 403 })
          }

          const orgId = invoice.orgId

          // Check if a confirmed payment already exists with this order_id reference (idempotency)
          const [existingPayment] = await db
            .select()
            .from(paymentsTable)
            .where(
              and(
                eq(paymentsTable.invoiceId, invoice.id),
                eq(paymentsTable.reference, body.order_id),
                eq(paymentsTable.status, 'confirmed'),
              ),
            )
            .limit(1)

          if (existingPayment) {
            return new Response('OK', { status: 200 })
          }

          const status = body.transaction_status
          const fraud = body.fraud_status

          const isSuccess =
            status === 'settlement' ||
            (status === 'capture' && fraud === 'accept')

          if (isSuccess) {
            const payment = await createPayment(orgId, {
              invoiceId: invoice.id,
              amount: Number(body.gross_amount),
              method: 'midtrans',
              reference: body.order_id,
              receivedAt: new Date(),
            })

            await confirmPayment(orgId, payment.id, 'midtrans-webhook')
          }

          return new Response('OK', { status: 200 })
        } catch {
          return new Response('Internal error', { status: 500 })
        }
      },
    },
  },
})
