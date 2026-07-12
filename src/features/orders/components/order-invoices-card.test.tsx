import { render, screen } from '@testing-library/react'
import type React from 'react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '#/components/ui/tooltip'
import type { InvoiceRow } from '#/features/invoices/model'
import { OrderInvoicesSection } from './order-invoices-section'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
  }: {
    to?: string
    params?: Record<string, string>
    children?: React.ReactNode
  }) => <a href={to?.replace('$id', params?.id ?? '')}>{children}</a>,
}))

vi.mock('#/components/app/asset-image', () => ({
  AssetImage: ({ assetId }: { assetId: string }) => (
    <img alt={`proof ${assetId}`} src={`/api/assets/${assetId}`} />
  ),
}))

const messages = {
  invoices: {
    title: 'Invoices',
    noInvoices: 'No invoices yet',
    printInvoice: 'Print Invoice',
    viewInvoice: 'View Invoice',
    markAsPaid: 'Mark as Paid',
    paymentProof: 'Payment Proof',
    paymentProofs: 'Payment Proofs',
  },
  status: {
    unpaid: 'Unpaid',
  },
  portal: {
    invoiceDownPayment: 'Down Payment',
    invoiceFinalPayment: 'Final Payment',
    invoiceShipmentFee: 'Shipment fee',
    invoiceShowAll: 'View all ({count})',
    invoiceShowLess: 'Hide',
  },
}

const invoice: InvoiceRow = {
  id: 'invoice-1',
  invoiceNumber: 'INV-001',
  customerName: 'Acme Corp',
  status: 'unpaid',
  total: 100000,
  percentage: 50,
  dueDate: '2026-06-30',
  paymentMethodId: null,
  paymentProvider: 'bank_transfer',
  createdAt: new Date('2026-06-01T00:00:00Z'),
  overdue: false,
}

function renderSection(
  invoicePayments: Record<string, Array<{ id: string; proofAssetId: string }>>,
  orderInvoices: InvoiceRow[] = [invoice],
) {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <TooltipProvider>
        <OrderInvoicesSection
          orderInvoices={orderInvoices}
          invoicePayments={invoicePayments}
        />
      </TooltipProvider>
    </IntlProvider>,
  )
}

describe('OrderInvoicesSection', () => {
  it('shows uploaded customer payment proofs as image previews without download links', () => {
    renderSection({
      'invoice-1': [{ id: 'proof-asset-1', proofAssetId: 'proof-asset-1' }],
    })

    expect(screen.getByText('Invoices')).toBeInTheDocument()
    expect(screen.getByAltText('proof proof-asset-1')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'proof proof-asset-1' }),
    ).not.toBeInTheDocument()
  })

  it('shows a down payment badge for a single partial invoice', () => {
    renderSection({})

    expect(screen.getByText('Down Payment')).toBeInTheDocument()
    expect(screen.queryByText('Final Payment')).not.toBeInTheDocument()
  })

  it('labels the last of multiple invoices as the final payment', () => {
    const finalInvoice: InvoiceRow = {
      ...invoice,
      id: 'invoice-2',
      invoiceNumber: 'INV-002',
      percentage: 50,
    }

    renderSection({}, [invoice, finalInvoice])

    expect(screen.getByText('Down Payment')).toBeInTheDocument()
    expect(screen.getByText('Final Payment')).toBeInTheDocument()
  })
})
