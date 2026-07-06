import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import { PendingView } from './pending-view'

const messages = {
  portal: {
    waitApproval:
      'Your order has been submitted. Please wait for admin approval.',
    pendingHelp:
      'We received your order details. The seller will review them before production starts.',
    progressHeroLabel: 'Order status',
    pendingHeroTitle: 'Order received',
    pendingHeroSubtitle: 'Sent to {org} for review.',
    pendingReceivedAt: 'Received {date}',
    statusPending: 'Awaiting Approval',
    shippingAddress: 'Shipping Address',
    noShippingAddress: 'No shipping address provided',
    orderNumber: 'Order Number',
    orderSummary: 'Order Summary',
    lineItems: 'Order Items',
    orderTotal: 'Order Total',
    quantity: 'Qty',
    chatOnWhatsApp: 'Chat on WhatsApp',
    whatsappOrderMessage: 'Hi, regarding order {order}',
  },
}

const order = {
  id: 'ord-1',
  orgId: 'org-1',
  orgName: 'Test Org',
  orgLogoAssetId: null,
  orgPhone: '0812-3456-7890',
  status: 'pending',
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
  invoices: [],
  createdAt: new Date('2026-01-01'),
  courier: null,
  trackingNumber: null,
  approvedAt: null,
  shippedAt: null,
  deliveredAt: null,
}

function renderPendingView(props?: { order?: typeof order }) {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <PendingView order={props?.order ?? order} />
    </IntlProvider>,
  )
}

describe('PendingView', () => {
  it('renders the wait approval heading', () => {
    renderPendingView()
    expect(
      screen.getByRole('heading', {
        name: 'Order received',
      }),
    ).toBeInTheDocument()
  })

  it('renders pendingHelp text', () => {
    renderPendingView()
    expect(
      screen.getByText(
        'We received your order details. The seller will review them before production starts.',
      ),
    ).toBeInTheDocument()
  })

  it('renders order number', () => {
    renderPendingView()
    expect(screen.getAllByText(/ORD-1/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders line item product name and quantity', () => {
    renderPendingView()
    expect(screen.getByText('T-Shirt')).toBeInTheDocument()
  })

  it('renders total formatted as currency', () => {
    renderPendingView()
    const matches = screen.getAllByText(/100,000/)
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('renders WhatsApp link with correct phone and encoded message', () => {
    renderPendingView()
    const link = screen.getByRole('link', { name: /Chat on WhatsApp/ })
    expect(link).toHaveAttribute('href')
    const href = link.getAttribute('href') ?? ''
    expect(href).toContain('https://wa.me/6281234567890')
    expect(href).toContain(encodeURIComponent('Hi, regarding order ORD-1'))
  })
})
