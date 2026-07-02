import crypto from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  invoices as invoicesTable,
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

function verifyMidtransSignature(body: MidtransWebhookBody): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? ''
  const hash = crypto
    .createHash('sha512')
    .update(body.order_id + body.status_code + body.gross_amount + serverKey)
    .digest('hex')
  return hash === body.signature_key
}

export const Route = createFileRoute('/api/midtrans-notification')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as MidtransWebhookBody

          if (!verifyMidtransSignature(body)) {
            return new Response('Unauthorized signature', { status: 403 })
          }

          // Extract invoiceNumber from order_id (handling retry timestamp suffixes)
          const orderIdStr = body.order_id
          const lastHyphenIndex = orderIdStr.lastIndexOf('-')
          const invoiceNumber =
            lastHyphenIndex !== -1
              ? orderIdStr.substring(0, lastHyphenIndex)
              : orderIdStr

          const [invoice] = await db
            .select()
            .from(invoicesTable)
            .where(eq(invoicesTable.invoiceNumber, invoiceNumber))
            .limit(1)

          if (!invoice) {
            return new Response('Invoice not found', { status: 404 })
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
              method: 'payment_gateway',
              reference: body.order_id,
              receivedAt: new Date(),
            })

            await confirmPayment(orgId, payment.id, 'midtrans-webhook')
          }

          return new Response('OK', { status: 200 })
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          return new Response(`Error processing webhook: ${errorMessage}`, {
            status: 500,
          })
        }
      },
    },
  },
})
