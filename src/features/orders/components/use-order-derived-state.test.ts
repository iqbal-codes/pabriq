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
    paymentMethodId: null,
    createdAt: new Date(),
    overdue: false,
  }
}

function derive(
  data: GetOrderResult | null | undefined,
  orderInvoices: InvoiceRow[],
  tasksData?: Array<{ task: { status: string } }>,
) {
  return renderHook(() =>
    useOrderDerivedState({ data, orderInvoices, tasksData: tasksData ?? [] }),
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

describe('useOrderDerivedState.canStartProduction', () => {
  it('is false for approved order with paid invoice and no tasks', () => {
    const state = derive(
      makeOrder('approved'),
      [makeInvoice('i1', 'paid', 50, 500_000)],
      [],
    )
    expect(state.canStartProduction).toBe(false)
  })

  it('is false for approved order with no paid invoice', () => {
    const state = derive(makeOrder('approved'), [])
    expect(state.canStartProduction).toBe(false)
  })

  it('is false for approved order with paid invoice and queued task', () => {
    const state = derive(
      makeOrder('approved'),
      [makeInvoice('i1', 'paid', 50, 500_000)],
      [{ task: { status: 'queued' } }],
    )
    expect(state.canStartProduction).toBe(false)
  })

  it('is true for approved order with paid invoice and all tasks ready_for_production', () => {
    const state = derive(
      makeOrder('approved'),
      [makeInvoice('i1', 'paid', 50, 500_000)],
      [{ task: { status: 'ready_for_production' } }],
    )
    expect(state.canStartProduction).toBe(true)
  })

  it('is false when some tasks are not ready_for_production', () => {
    const state = derive(
      makeOrder('approved'),
      [makeInvoice('i1', 'paid', 50, 500_000)],
      [
        { task: { status: 'ready_for_production' } },
        { task: { status: 'queued' } },
      ],
    )
    expect(state.canStartProduction).toBe(false)
  })
})

describe('useOrderDerivedState.canSendDpInvoice', () => {
  it('is true when approved, all tasks ready, and no paid invoice', () => {
    const state = derive(
      makeOrder('approved'),
      [],
      [{ task: { status: 'ready_for_production' } }],
    )
    expect(state.canSendDpInvoice).toBe(true)
  })

  it('is false when tasks are ready but invoice already paid', () => {
    const state = derive(
      makeOrder('approved'),
      [makeInvoice('i1', 'paid', 50, 500_000)],
      [{ task: { status: 'ready_for_production' } }],
    )
    expect(state.canSendDpInvoice).toBe(false)
  })

  it('is false when tasks are not ready', () => {
    const state = derive(
      makeOrder('approved'),
      [],
      [{ task: { status: 'queued' } }],
    )
    expect(state.canSendDpInvoice).toBe(false)
  })
})

describe('useOrderDerivedState.canCompleteOrder', () => {
  it('is false for approved order with one paid 50% invoice', () => {
    const state = derive(makeOrder('approved'), [
      makeInvoice('i1', 'paid', 50, 500_000),
    ])
    expect(state.canCompleteOrder).toBe(false)
  })

  it('is true for in_delivery order with one paid 100% invoice', () => {
    const state = derive(makeOrder('in_delivery'), [
      makeInvoice('i1', 'paid', 100, 1_000_000),
    ])
    expect(state.canCompleteOrder).toBe(true)
  })
})

describe('useOrderDerivedState.canCompleteProduction', () => {
  it('is true for in_progress order with all tasks completed', () => {
    const state = derive(
      makeOrder('in_progress'),
      [],
      [{ task: { status: 'completed' } }],
    )
    expect(state.canCompleteProduction).toBe(true)
  })

  it('is true for approved order with all tasks completed (non-linear flow)', () => {
    const state = derive(
      makeOrder('approved'),
      [],
      [{ task: { status: 'completed' } }],
    )
    expect(state.canCompleteProduction).toBe(true)
  })

  it('is false for approved order with incomplete tasks', () => {
    const state = derive(
      makeOrder('approved'),
      [],
      [{ task: { status: 'in_progress' } }],
    )
    expect(state.canCompleteProduction).toBe(false)
  })

  it('is false when a final invoice already exists', () => {
    const state = derive(
      makeOrder('in_progress'),
      [makeInvoice('i1', 'paid', 100, 1_000_000)],
      [{ task: { status: 'completed' } }],
    )
    expect(state.canCompleteProduction).toBe(false)
  })
})
