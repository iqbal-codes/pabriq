import { render, screen } from '@testing-library/react'
import type React from 'react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '#/components/ui/tooltip'
import type { InvoiceRow } from '#/features/invoices/model'
import { OrderInvoicesCard } from './order-invoices-card'

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
  },
  status: {
    unpaid: 'Unpaid',
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
  createdAt: new Date('2026-06-01T00:00:00Z'),
  overdue: false,
}

function renderCard(
  invoicePayments: Record<string, Array<{ id: string; proofAssetId: string }>>,
) {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <TooltipProvider>
        <OrderInvoicesCard
          orderInvoices={[invoice]}
          invoicePayments={invoicePayments}
        />
      </TooltipProvider>
    </IntlProvider>,
  )
}
describe('OrderInvoicesCard', () => {
  it('shows uploaded customer payment proofs as image previews without download links', () => {
    renderCard({
      'invoice-1': [{ id: 'proof-asset-1', proofAssetId: 'proof-asset-1' }],
    })

    expect(screen.getByText('Payment Proof')).toBeInTheDocument()
    expect(screen.getByAltText('proof proof-asset-1')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'proof proof-asset-1' }),
    ).not.toBeInTheDocument()
  })
})
