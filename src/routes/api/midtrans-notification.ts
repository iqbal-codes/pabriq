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
  midtransAmountsMatch,
} from '#/features/invoices/model'
import { logger } from '#/lib/logger'

function getCorrelationId(request: Request): string {
  return request.headers.get('x-correlation-id')?.trim() || crypto.randomUUID()
}

function responseWithCorrelation(
  body: BodyInit,
  init?: ResponseInit,
  correlationId?: string,
): Response {
  const headers = new Headers(init?.headers)
  if (correlationId) {
    headers.set('x-correlation-id', correlationId)
  }
  return new Response(body, { ...init, headers })
}

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
  refund_amount: z.string().optional(),
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
        const correlationId = getCorrelationId(request)
        const res = (body: BodyInit, init?: ResponseInit) =>
          responseWithCorrelation(body, init, correlationId)

        try {
          let raw: unknown
          try {
            raw = await request.json()
          } catch {
            logger.warn(
              { correlationId },
              'Malformed Midtrans webhook request body',
            )
            return res('Invalid request body', { status: 400 })
          }

          const parseResult = midtransWebhookSchema.safeParse(raw)
          if (!parseResult.success) {
            logger.warn({ correlationId }, 'Invalid Midtrans webhook payload')
            return res('Invalid request body', { status: 400 })
          }
          const body = parseResult.data
          const [attempt] = await db
            .select({
              id: midtransTransactionsTable.id,
              orgId: midtransTransactionsTable.orgId,
              invoiceId: midtransTransactionsTable.invoiceId,
              expectedAmount: midtransTransactionsTable.expectedAmount,
              transactionStatus: midtransTransactionsTable.transactionStatus,
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

          if (!attempt) {
            logger.warn(
              {
                correlationId,
                orderId: body.order_id,
                transactionId: body.transaction_id,
              },
              'Unknown Midtrans transaction received on webhook',
            )
            return res('Transaction not found', { status: 404 })
          }

          const serverKey = (attempt.serverKey ?? '').trim()
          if (!serverKey || !verifyMidtransSignature(body, serverKey)) {
            logger.warn(
              { correlationId, orderId: body.order_id },
              'Midtrans webhook signature verification failed',
            )
            return res('Unauthorized signature', { status: 403 })
          }

          const grossAmount = Number(body.gross_amount)
          const settlementTime = body.settlement_time
            ? new Date(body.settlement_time)
            : null
          const isAmountMatch =
            Number.isFinite(grossAmount) &&
            midtransAmountsMatch(body.gross_amount, attempt.expectedAmount)

          const isSettlement =
            body.transaction_status === 'settlement' ||
            (body.transaction_status === 'capture' &&
              body.fraud_status === 'accept')

          const isRefund =
            body.transaction_status === 'refund' ||
            body.transaction_status === 'partial_refund' ||
            body.transaction_status === 'chargeback' ||
            body.transaction_status === 'partial_chargeback'

          const isTerminalAttempt =
            attempt.transactionStatus === 'settlement' ||
            attempt.transactionStatus === 'capture' ||
            attempt.transactionStatus === 'refund' ||
            attempt.transactionStatus === 'partial_refund' ||
            attempt.transactionStatus === 'chargeback' ||
            attempt.transactionStatus === 'partial_chargeback'

          if (isTerminalAttempt) {
            if (
              attempt.transactionStatus === 'refund' ||
              attempt.transactionStatus === 'chargeback'
            ) {
              return res('OK', { status: 200 })
            }
            if (!isSettlement && !isRefund) {
              return res('OK', { status: 200 })
            }
          }

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
            logger.error(
              {
                correlationId,
                attemptId: attempt.id,
                invoiceId: attempt.invoiceId,
                orderId: body.order_id,
              },
              'Midtrans webhook amount mismatch requires reconciliation',
            )
            return res('Transaction amount mismatch', { status: 400 })
          }

          return await db.transaction(async (tx) => {
            const [lockedInvoice] = await tx
              .select({
                id: invoicesTable.id,
                status: invoicesTable.status,
                paidBy: invoicesTable.paidBy,
                paidAt: invoicesTable.paidAt,
              })
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
              return res('Transaction not found', { status: 404 })
            }

            if (isRefund) {
              const isPartialEvent =
                body.transaction_status === 'partial_refund' ||
                body.transaction_status === 'partial_chargeback'

              let refundedAmount: number
              if (body.refund_amount) {
                const parsed = Number(body.refund_amount)
                if (!Number.isFinite(parsed) || parsed <= 0) {
                  return res('Invalid refund amount', { status: 400 })
                }
                refundedAmount = parsed
              } else if (isPartialEvent) {
                return res('Missing refund_amount for partial refund', {
                  status: 400,
                })
              } else {
                refundedAmount = grossAmount
              }
              await tx
                .update(midtransTransactionsTable)
                .set({
                  refundedAmount,
                  updatedAt: new Date(),
                })
                .where(eq(midtransTransactionsTable.id, attempt.id))

              let confirmedPayment = (
                await tx
                  .select()
                  .from(paymentsTable)
                  .where(
                    and(
                      eq(paymentsTable.orgId, attempt.orgId),
                      eq(paymentsTable.invoiceId, attempt.invoiceId),
                      eq(paymentsTable.reference, body.order_id),
                      eq(paymentsTable.method, 'midtrans'),
                    ),
                  )
                  .limit(1)
              )[0]

              if (!confirmedPayment) {
                const created = await createPayment(
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
                confirmedPayment = (
                  await tx
                    .select()
                    .from(paymentsTable)
                    .where(eq(paymentsTable.id, created.id))
                    .limit(1)
                )[0]
              }

              if (confirmedPayment) {
                const isPartial = refundedAmount < confirmedPayment.amount
                const newPaymentStatus = isPartial
                  ? 'partially_refunded'
                  : 'refunded'

                await tx
                  .update(paymentsTable)
                  .set({
                    status: newPaymentStatus,
                    updatedAt: new Date(),
                  })
                  .where(eq(paymentsTable.id, confirmedPayment.id))

                const balance = await getInvoiceBalance(
                  attempt.invoiceId,
                  attempt.orgId,
                  tx,
                )
                const newInvoiceStatus =
                  newPaymentStatus === 'partially_refunded'
                    ? 'partially_refunded'
                    : balance.confirmedAmount > 0
                      ? 'partially_paid'
                      : 'refunded'

                await tx
                  .update(invoicesTable)
                  .set({
                    status: newInvoiceStatus,
                    updatedAt: new Date(),
                  })
                  .where(eq(invoicesTable.id, attempt.invoiceId))

                if (
                  (lockedInvoice.status === 'paid' ||
                    lockedInvoice.status === 'partially_paid') &&
                  (newInvoiceStatus as string) === 'paid'
                ) {
                  logger.error(
                    {
                      alert: 'payment_refund_invoice_state_mismatch',
                      correlationId,
                      invoiceId: attempt.invoiceId,
                      orderId: body.order_id,
                      invoiceStatus: newInvoiceStatus,
                    },
                    'ALERT: refund event processed but invoice remains paid',
                  )
                }
              }

              return res('OK', { status: 200 })
            }

            if (!isSettlement) {
              if (
                lockedInvoice.status === 'paid' ||
                lockedInvoice.status === 'partially_paid' ||
                lockedInvoice.status === 'refunded' ||
                lockedInvoice.status === 'partially_refunded'
              ) {
                return res('OK', { status: 200 })
              }

              const nonSettlementPaymentStatus =
                body.transaction_status === 'deny'
                  ? 'deny'
                  : body.transaction_status === 'cancel'
                    ? 'cancel'
                    : body.transaction_status === 'expire'
                      ? 'expired'
                      : body.transaction_status === 'failure'
                        ? 'failed'
                        : 'pending'

              const [existingPendingPayment] = await tx
                .select({ id: paymentsTable.id })
                .from(paymentsTable)
                .where(
                  and(
                    eq(paymentsTable.orgId, attempt.orgId),
                    eq(paymentsTable.invoiceId, attempt.invoiceId),
                    eq(paymentsTable.reference, body.order_id),
                    eq(paymentsTable.method, 'midtrans'),
                  ),
                )
                .limit(1)

              if (existingPendingPayment) {
                await tx
                  .update(paymentsTable)
                  .set({
                    status: nonSettlementPaymentStatus,
                    rejectedReason: `Midtrans transaction ${body.transaction_status}`,
                    updatedAt: new Date(),
                  })
                  .where(eq(paymentsTable.id, existingPendingPayment.id))
              }

              return res('OK', { status: 200 })
            }

            if (
              lockedInvoice.status === 'refunded' ||
              lockedInvoice.status === 'partially_refunded'
            ) {
              await tx
                .update(midtransTransactionsTable)
                .set({
                  transactionStatus: 'review_required',
                  errorMessage:
                    'Settlement received after invoice was refunded',
                  updatedAt: new Date(),
                })
                .where(eq(midtransTransactionsTable.id, attempt.id))
              return res('OK', { status: 200 })
            }

            if (lockedInvoice.status === 'void') {
              await tx
                .update(midtransTransactionsTable)
                .set({
                  transactionStatus: 'review_required',
                  errorMessage: 'Settlement received for void invoice',
                  updatedAt: new Date(),
                })
                .where(eq(midtransTransactionsTable.id, attempt.id))
              return res('OK', { status: 200 })
            }

            const [existingConfirmedPayment] = await tx
              .select({ id: paymentsTable.id })
              .from(paymentsTable)
              .where(
                and(
                  eq(paymentsTable.orgId, attempt.orgId),
                  eq(paymentsTable.invoiceId, attempt.invoiceId),
                  eq(paymentsTable.reference, body.order_id),
                  eq(paymentsTable.method, 'midtrans'),
                  eq(paymentsTable.status, 'confirmed'),
                ),
              )
              .limit(1)

            if (existingConfirmedPayment) {
              const balance = await getInvoiceBalance(
                attempt.invoiceId,
                attempt.orgId,
                tx,
              )
              const targetStatus = balance.isFullyPaid
                ? 'paid'
                : balance.confirmedAmount > 0
                  ? 'partially_paid'
                  : lockedInvoice.status

              const needsPaidRepair =
                balance.isFullyPaid &&
                (lockedInvoice.status !== 'paid' ||
                  !lockedInvoice.paidBy ||
                  !lockedInvoice.paidAt)
              const needsStatusUpdate =
                lockedInvoice.status !== targetStatus || needsPaidRepair

              if (needsStatusUpdate) {
                await tx
                  .update(invoicesTable)
                  .set({
                    status: targetStatus,
                    paidBy: lockedInvoice.paidBy ?? 'midtrans-webhook',
                    paidAt:
                      lockedInvoice.paidAt ??
                      (balance.isFullyPaid
                        ? (settlementTime ?? new Date())
                        : undefined),
                    updatedAt: new Date(),
                  })
                  .where(
                    and(
                      eq(invoicesTable.id, attempt.invoiceId),
                      eq(invoicesTable.orgId, attempt.orgId),
                    ),
                  )
              }
              return res('OK', { status: 200 })
            }

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
              return res('OK', { status: 200 })
            }

            let paymentId: string
            const [existingPendingPayment] = await tx
              .select({ id: paymentsTable.id, amount: paymentsTable.amount })
              .from(paymentsTable)
              .where(
                and(
                  eq(paymentsTable.orgId, attempt.orgId),
                  eq(paymentsTable.invoiceId, attempt.invoiceId),
                  eq(paymentsTable.reference, body.order_id),
                  eq(paymentsTable.method, 'midtrans'),
                  eq(paymentsTable.status, 'pending'),
                ),
              )
              .limit(1)

            if (existingPendingPayment) {
              if (existingPendingPayment.amount !== grossAmount) {
                await tx
                  .update(paymentsTable)
                  .set({
                    amount: grossAmount,
                    updatedAt: new Date(),
                  })
                  .where(eq(paymentsTable.id, existingPendingPayment.id))
              }
              paymentId = existingPendingPayment.id
            } else {
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
              paymentId = payment.id
            }

            await confirmPayment(
              attempt.orgId,
              paymentId,
              'midtrans-webhook',
              tx,
            )

            const [confirmedInvoice] = await tx
              .select({ status: invoicesTable.status })
              .from(invoicesTable)
              .where(
                and(
                  eq(invoicesTable.id, attempt.invoiceId),
                  eq(invoicesTable.orgId, attempt.orgId),
                ),
              )
              .limit(1)
            if (confirmedInvoice?.status !== 'paid') {
              logger.error(
                {
                  alert: 'confirmed_payment_invoice_not_paid',
                  correlationId,
                  invoiceId: attempt.invoiceId,
                  orderId: body.order_id,
                  invoiceStatus: confirmedInvoice?.status,
                },
                'ALERT: confirmed Midtrans payment did not mark invoice paid',
              )
            }

            return res('OK', { status: 200 })
          })
        } catch (error: unknown) {
          logger.error(
            {
              correlationId,
              errorType: error instanceof Error ? error.name : 'unknown',
            },
            'Midtrans webhook processing failed',
          )
          return res('Internal error', {
            status: 500,
          })
        }
      },
    },
  },
})
