import { render, screen, within } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import { RejectedView } from './rejected-view'

const messages = {
  portal: {
    progressHeroLabel: 'Order status',
    rejectedHeroTitle: 'This order needs revision',
    rejectedHeroSubtitle: 'Use the note below to fix and resubmit.',
    rejectedReasonTitle: 'Reason from the seller',
    rejectedReasonEmpty: 'No reason provided.',
    rejectedAffectedItems: 'Affected items',
    rejectedNote: 'Reason: {note}',
    rejectedHelp:
      'Contact the seller to revise the order or confirm the next step.',
    rejectedResubmitCta: 'Discuss with the seller',
    retry: 'Retry',
    contactAdmin: 'Contact Admin via WhatsApp',
    whatsappOrderMessage: 'Hi, regarding order {order}',
    orderSummary: 'Order Summary',
    orderTotal: 'Order Total',
    shippingAddress: 'Shipping Address',
    noShippingAddress: 'No shipping address provided',
    quantity: 'Qty',
  },
}

const order = {
  id: 'ord-1',
  orgId: 'org-1',
  orgName: 'Test Org',
  orgLogoAssetId: null,
  orgPhone: '0812-3456-7890',
  status: 'rejected',
  orderNumber: 'ORD-1',
  total: 100000,
  shippingAddress: null,
  customerId: null,
  customerName: null,
  customerPhone: null,
  customerIsWni: null,
  customerPhotoAssetId: null,
  lineItems: [
    {
      id: 'li-1',
      taskId: 't1',
      taskNumber: 'TSK-1',
      designName: 'Custom T-Shirt',
      productName: 'T-Shirt',
      quantity: 10,
      unitPrice: 10000,
      total: 100000,
      notes: null,
      currentStageName: null,
      assetIds: [],
      assets: [],
      createdAt: new Date('2026-01-01'),
      productionDays: 0,
      deadline: new Date('2026-01-05'),
    },
  ],
  specifications: [],
  invoices: [],
  createdAt: new Date('2026-01-01'),
  rejectReason: 'Artwork is blurry',
  courier: null,
  trackingNumber: null,
  approvedAt: null,
  shippedAt: null,
  deliveredAt: null,
}

function renderRejectedView(o = order) {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <RejectedView order={o} />
    </IntlProvider>,
  )
}

describe('RejectedView', () => {
  it('renders the rejected title', () => {
    renderRejectedView()
    expect(
      screen.getByRole('heading', { name: 'This order needs revision' }),
    ).toBeInTheDocument()
  })

  it('renders the reject reason', () => {
    renderRejectedView()
    const reasons = screen.getAllByText('Artwork is blurry')
    expect(reasons.length).toBeGreaterThanOrEqual(1)
    renderRejectedView()
    expect(
      screen.getByText(
        'Contact the seller to revise the order or confirm the next step.',
      ),
    ).toBeInTheDocument()
  })

  it('renders line item name and quantity', () => {
    renderRejectedView()
    const list = screen.getByRole('list')
    expect(within(list).getByText('Custom T-Shirt')).toBeInTheDocument()
  })

  it('renders formatted total', () => {
    renderRejectedView()
    // formatCurrency(100000, 'en') produces IDR 100,000
    expect(screen.getAllByText('IDR 100,000')).toHaveLength(2)
  })

  it('renders WhatsApp link with correct href', () => {
    renderRejectedView()
    const link = screen.getByRole('link', {
      name: /Contact Admin via WhatsApp/i,
    })
    const href = link.getAttribute('href') ?? ''
    expect(href).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/)
    expect(href).toContain(encodeURIComponent('Hi, regarding order ORD-1'))
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('does not render reject reason when absent', () => {
    const { rejectReason: _, ...orderWithoutReason } = order
    renderRejectedView(orderWithoutReason as typeof order)
    expect(screen.queryByText('Artwork is blurry')).not.toBeInTheDocument()
    // Title should still render
    expect(
      screen.getByRole('heading', { name: 'This order needs revision' }),
    ).toBeInTheDocument()
  })
})
