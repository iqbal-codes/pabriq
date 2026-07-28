import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('#/db/index', () => ({
  db: {},
}))

import { reconcilePayment } from './model'
import { reconcileInvoicePaymentForRole } from './server'

vi.mock('./model', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./model')>()
  return { ...actual, reconcilePayment: vi.fn() }
})

const mockReconcilePayment = vi.mocked(reconcilePayment)

describe('reconcileInvoicePaymentForRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthorized members with Forbidden error', async () => {
    const result = await reconcileInvoicePaymentForRole(
      'org-123',
      'member',
      'inv-456',
    )

    expect(result).toEqual({ ok: false, error: 'Forbidden' })
    expect(mockReconcilePayment).not.toHaveBeenCalled()
  })

  it('allows owner to trigger reconciliation and maps confirmed response', async () => {
    mockReconcilePayment.mockResolvedValue({
      ok: true,
      confirmed: true,
      reason: 'confirmed',
      paymentId: 'pay-789',
    })

    const result = await reconcileInvoicePaymentForRole(
      'org-123',
      'owner',
      'inv-456',
    )

    expect(mockReconcilePayment).toHaveBeenCalledWith('org-123', 'inv-456')
    expect(result).toEqual({
      ok: true,
      status: 'paid',
      reason: 'confirmed',
      paymentId: 'pay-789',
    })
  })

  it('allows admin to trigger reconciliation and handles mismatch state', async () => {
    mockReconcilePayment.mockResolvedValue({
      ok: true,
      confirmed: false,
      reason: 'mismatch',
    })

    const result = await reconcileInvoicePaymentForRole(
      'org-123',
      'admin',
      'inv-456',
    )

    expect(mockReconcilePayment).toHaveBeenCalledWith('org-123', 'inv-456')
    expect(result).toEqual({ ok: true, status: 'mismatch' })
  })

  it('handles not_settled_yet state gracefully for repeated calls', async () => {
    mockReconcilePayment.mockResolvedValue({
      ok: true,
      confirmed: false,
      reason: 'not_settled_yet',
    })

    const result = await reconcileInvoicePaymentForRole(
      'org-123',
      'owner',
      'inv-456',
    )

    expect(result).toEqual({ ok: true, status: 'not_settled_yet' })
  })
})
