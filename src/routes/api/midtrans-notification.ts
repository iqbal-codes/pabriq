import crypto from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db/index'
import {
  invoices as invoicesTable,
  midtransTransactions as midtransTransactionsTable,
  organizationProfiles as organizationProfilesTable,
  payments as paymentsTable,
} from '#/db/schema'
import {
  confirmPayment,
  createPayment,
  getInvoiceBalance,
} from '#/features/invoices/model'

const midtransWebhookSchema = z.object({
  order_id: z.string().min(1),
  status_code: z.string().min(1),
  gross_amount: z.string().min(1),
  signature_key: z.string().min(1),
  transaction_status: z.string().min(1),
  fraud_status: z.string().optional(),
  transaction_id: z.string().optional(),
  payment_type: z.string().optional(),
  settlement_time: z.string().optional(),
})
type MidtransWebhookBody = z.infer<typeof midtransWebhookSchema>

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
  if (expected.length !== received.length) return false
  return crypto.timingSafeEqual(expected, received)
}

export const Route = createFileRoute('/api/midtrans-notification')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = midtransWebhookSchema.parse(await request.json())
          const [attempt] = await db
            .select({
              id: midtransTransactionsTable.id,
              orgId: midtransTransactionsTable.orgId,
              invoiceId: midtransTransactionsTable.invoiceId,
              expectedAmount: midtransTransactionsTable.expectedAmount,
              serverKey: organizationProfilesTable.midtransServerKey,
            })
            .from(midtransTransactionsTable)
            .leftJoin(
              organizationProfilesTable,
              eq(
                midtransTransactionsTable.orgId,
                organizationProfilesTable.orgId,
              ),
            )
            .where(eq(midtransTransactionsTable.orderId, body.order_id))
            .limit(1)

          if (!attempt)
            return new Response('Transaction not found', { status: 404 })

          const serverKey = (attempt.serverKey ?? '').trim()
          if (!serverKey || !verifyMidtransSignature(body, serverKey)) {
            return new Response('Unauthorized signature', { status: 403 })
          }

          const grossAmount = Number(body.gross_amount)
          const settlementTime = body.settlement_time
            ? new Date(body.settlement_time)
            : null
          const isAmountMatch =
            Number.isFinite(grossAmount) &&
            grossAmount === attempt.expectedAmount
          await db
            .update(midtransTransactionsTable)
            .set({
              grossAmount: Number.isFinite(grossAmount) ? grossAmount : null,
              transactionId: body.transaction_id ?? null,
              transactionStatus: isAmountMatch
                ? body.transaction_status
                : 'mismatch',
              errorMessage: isAmountMatch
                ? null
                : `Expected ${attempt.expectedAmount}, received ${body.gross_amount}`,
              fraudStatus: body.fraud_status ?? null,
              paymentType: body.payment_type ?? null,
              settlementTime:
                settlementTime && !Number.isNaN(settlementTime.getTime())
                  ? settlementTime
                  : null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(midtransTransactionsTable.id, attempt.id),
                eq(midtransTransactionsTable.orgId, attempt.orgId),
              ),
            )

          if (!isAmountMatch) {
            return new Response('Transaction amount mismatch', { status: 400 })
          }

          const isSuccessStatus =
            body.transaction_status === 'settlement' ||
            (body.transaction_status === 'capture' &&
              body.fraud_status === 'accept')

          if (!isSuccessStatus) {
            return new Response('OK', { status: 200 })
          }

          try {
            return await db.transaction(async (tx) => {
              const [lockedInvoice] = await tx
                .select({ id: invoicesTable.id })
                .from(invoicesTable)
                .where(
                  and(
                    eq(invoicesTable.id, attempt.invoiceId),
                    eq(invoicesTable.orgId, attempt.orgId),
                  ),
                )
                .for('update')
                .limit(1)

              if (!lockedInvoice) {
                return new Response('Transaction not found', { status: 404 })
              }

              const [existingConfirmedPayment] = await tx
                .select({ id: paymentsTable.id })
                .from(paymentsTable)
                .where(
                  and(
                    eq(paymentsTable.orgId, attempt.orgId),
                    eq(paymentsTable.invoiceId, attempt.invoiceId),
                    eq(paymentsTable.reference, body.order_id),
                    eq(paymentsTable.status, 'confirmed'),
                  ),
                )
                .limit(1)

              if (existingConfirmedPayment)
                return new Response('OK', { status: 200 })

              const balance = await getInvoiceBalance(
                attempt.invoiceId,
                attempt.orgId,
                tx,
              )
              if (grossAmount > balance.remaining) {
                await tx
                  .update(midtransTransactionsTable)
                  .set({
                    transactionStatus: 'superseded',
                    errorMessage: 'Invoice was settled by another attempt',
                    updatedAt: new Date(),
                  })
                  .where(eq(midtransTransactionsTable.id, attempt.id))
                return new Response('OK', { status: 200 })
              }

              try {
                const payment = await createPayment(
                  attempt.orgId,
                  {
                    invoiceId: attempt.invoiceId,
                    amount: grossAmount,
                    method: 'midtrans',
                    reference: body.order_id,
                    receivedAt: settlementTime ?? new Date(),
                  },
                  tx,
                )
                await confirmPayment(
                  attempt.orgId,
                  payment.id,
                  'midtrans-webhook',
                  tx,
                )
              } catch (error: unknown) {
                const [existingConfirmed] = await tx
                  .select({ id: paymentsTable.id })
                  .from(paymentsTable)
                  .where(
                    and(
                      eq(paymentsTable.orgId, attempt.orgId),
                      eq(paymentsTable.invoiceId, attempt.invoiceId),
                      eq(paymentsTable.reference, body.order_id),
                      eq(paymentsTable.status, 'confirmed'),
                    ),
                  )
                  .limit(1)
                if (existingConfirmed)
                  return new Response('OK', { status: 200 })
                await tx
                  .update(midtransTransactionsTable)
                  .set({
                    transactionStatus: 'orphaned',
                    errorMessage:
                      error instanceof Error
                        ? error.message
                        : 'Payment confirmation failed',
                    updatedAt: new Date(),
                  })
                  .where(eq(midtransTransactionsTable.id, attempt.id))
                return new Response('Internal error', { status: 500 })
              }

              return new Response('OK', { status: 200 })
            })
          } catch {
            return new Response('Internal error', { status: 500 })
          }
        } catch {
          return new Response('Internal error', { status: 500 })
        }
      },
    },
  },
})
