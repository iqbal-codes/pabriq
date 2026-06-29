import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import { RejectedView } from './rejected-view'

const messages = {
  portal: {
    rejectedTitle: 'Order Rejected',
    rejectedHelp:
      'Contact the seller to revise the order or confirm the next step.',
    orderSummary: 'Order Summary',
    orderTotal: 'Order Total',
    contactAdmin: 'Contact Admin via WhatsApp',
    whatsappOrderMessage: 'Hi, regarding order {order}',
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
      name: 'Custom T-Shirt',
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
    },
  ],
  invoices: [],
  createdAt: new Date('2026-01-01'),
  rejectReason: 'Artwork is blurry',
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
    expect(screen.getAllByText('Order Rejected').length).toBeGreaterThanOrEqual(
      1,
    )
  })

  it('renders the reject reason', () => {
    renderRejectedView()
    expect(screen.getByText('Artwork is blurry')).toBeInTheDocument()
  })

  it('renders rejectedHelp text', () => {
    renderRejectedView()
    expect(
      screen.getByText(
        'Contact the seller to revise the order or confirm the next step.',
      ),
    ).toBeInTheDocument()
  })

  it('renders line item name and quantity', () => {
    renderRejectedView()
    expect(screen.getByText('Custom T-Shirt × 10')).toBeInTheDocument()
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
    expect(screen.getAllByText('Order Rejected').length).toBeGreaterThanOrEqual(
      1,
    )
  })
})
