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
  if (!hasValidJobSecret(request)) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const summary = await reconcileMidtransTransactions()
    logger.info(summary, 'Midtrans reconciliation job completed')
    return Response.json(summary)
  } catch (error: unknown) {
    logger.error({ err: error }, 'Midtrans reconciliation job failed')
    return new Response('Reconciliation failed', { status: 500 })
  }
}

export const Route = createFileRoute('/api/midtrans-reconciliation')({
  server: {
    handlers: {
      POST: ({ request }) => handleMidtransReconciliation(request),
    },
  },
})
