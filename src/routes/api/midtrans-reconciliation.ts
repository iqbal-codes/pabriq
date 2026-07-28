import crypto from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { reconcileMidtransTransactions } from '#/features/invoices/model'
import { logger } from '#/lib/logger'

function hasValidJobSecret(request: Request): boolean {
  const configuredSecret = process.env.MIDTRANS_RECONCILIATION_SECRET?.trim()
  const receivedSecret = request.headers.get('x-reconciliation-secret')?.trim()
  if (!configuredSecret || !receivedSecret) return false
  const expected = Buffer.from(configuredSecret)
  const received = Buffer.from(receivedSecret)
  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  )
}

export async function handleMidtransReconciliation(
  request: Request,
): Promise<Response> {
  const correlationId =
    request.headers.get('x-correlation-id')?.trim() || crypto.randomUUID()
  if (!hasValidJobSecret(request)) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const summary = await reconcileMidtransTransactions()
    logger.info(
      { correlationId, ...summary },
      'Midtrans reconciliation job completed',
    )
    return Response.json(summary, {
      headers: { 'x-correlation-id': correlationId },
    })
  } catch (error: unknown) {
    logger.error(
      {
        alert: 'midtrans_reconciliation_failed',
        correlationId,
        errorType: error instanceof Error ? error.name : 'unknown',
      },
      'ALERT: Midtrans reconciliation job failed',
    )
    return new Response('Reconciliation failed', {
      status: 500,
      headers: { 'x-correlation-id': correlationId },
    })
  }
}

export const Route = createFileRoute('/api/midtrans-reconciliation')({
  server: {
    handlers: {
      POST: ({ request }) => handleMidtransReconciliation(request),
    },
  },
})
