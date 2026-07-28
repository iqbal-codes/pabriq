import { beforeEach, describe, expect, it, vi } from 'vitest'

const reconcile = vi.hoisted(() => vi.fn())

vi.mock('#/features/invoices/model', () => ({
  reconcileMidtransTransactions: reconcile,
}))

import { handleMidtransReconciliation } from './midtrans-reconciliation'

describe('/api/midtrans-reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MIDTRANS_RECONCILIATION_SECRET = 'test-secret'
  })

  it('rejects requests without the scheduler secret', async () => {
    const response = await handleMidtransReconciliation(
      new Request('http://localhost/api/midtrans-reconciliation'),
    )

    expect(response?.status).toBe(401)
    expect(reconcile).not.toHaveBeenCalled()
  })

  it('runs reconciliation and returns its summary', async () => {
    reconcile.mockResolvedValue({
      processed: 2,
      confirmed: 1,
      pending: 1,
      mismatches: 0,
      failed: 0,
      reviewRequired: 0,
    })

    const response = await handleMidtransReconciliation(
      new Request('http://localhost/api/midtrans-reconciliation', {
        method: 'POST',
        headers: { 'x-reconciliation-secret': 'test-secret' },
      }),
    )

    expect(response?.status).toBe(200)
    expect(await response?.json()).toEqual({
      processed: 2,
      confirmed: 1,
      pending: 1,
      mismatches: 0,
      failed: 0,
      reviewRequired: 0,
    })
  })
})
