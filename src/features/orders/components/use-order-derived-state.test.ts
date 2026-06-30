import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { InvoiceRow } from '#/features/invoices/model'
import type { GetOrderResult } from '#/features/orders/model'
import { useOrderDerivedState } from './use-order-derived-state'

function makeOrder(status: string): GetOrderResult {
  return {
    order: {
      id: 'order-1',
      orgId: 'org-1',
      customerId: 'cust-1',
      status,
      notes: null,
      total: 1_000_000,
      orderNumber: 'ORD-1',
      orderToken: null,
      validUntil: null,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      rejectReason: null,
      courier: null,
      trackingNumber: null,
      shippedAt: null,
      deliveredAt: null,
      shippingAddress: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    lineItems: [],
    customerName: 'Cust',
    customerPhone: null,
    customerPhotoAssetId: null,
    customerEmail: null,
    shippingAddress: null,
  }
}

function makeInvoice(
  id: string,
  status: InvoiceRow['status'],
  percentage: number | null,
  total = 1_000_000,
): InvoiceRow {
  return {
    id,
    invoiceNumber: `INV-${id}`,
    customerName: 'Cust',
    status,
    total,
    percentage,
    dueDate: '2026-12-31',
    createdAt: new Date(),
    overdue: false,
  }
}

function derive(
  data: GetOrderResult | null | undefined,
  orderInvoices: InvoiceRow[],
) {
  return renderHook(() =>
    useOrderDerivedState({ data, orderInvoices, tasksData: [] }),
  ).result.current
}

describe('useOrderDerivedState.canCreateInvoice', () => {
  it('is true for an approved order with no invoices', () => {
    const state = derive(makeOrder('approved'), [])
    expect(state.canCreateInvoice).toBe(true)
  })

  it('is true when partially invoiced and order is still active', () => {
    const state = derive(makeOrder('in_progress'), [
      makeInvoice('i1', 'paid', 50, 500_000),
    ])
    expect(state.canCreateInvoice).toBe(true)
  })

  it('is false when the order is completed even if fully invoiced', () => {
    const state = derive(makeOrder('completed'), [
      makeInvoice('i1', 'paid', 100, 1_000_000),
    ])
    expect(state.canCreateInvoice).toBe(false)
  })

  it('is false when the order is cancelled', () => {
    const state = derive(makeOrder('cancelled'), [])
    expect(state.canCreateInvoice).toBe(false)
  })

  it('is false when the order is rejected', () => {
    const state = derive(makeOrder('rejected'), [])
    expect(state.canCreateInvoice).toBe(false)
  })

  it('is false when 100% already invoiced on an active order', () => {
    const state = derive(makeOrder('in_progress'), [
      makeInvoice('i1', 'paid', 100, 1_000_000),
    ])
    expect(state.canCreateInvoice).toBe(false)
  })

  it('is false for a draft order', () => {
    const state = derive(makeOrder('draft'), [])
    expect(state.canCreateInvoice).toBe(false)
  })
})
