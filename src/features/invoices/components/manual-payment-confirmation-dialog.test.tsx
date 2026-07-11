import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import type { InvoicePaymentProof, InvoiceRow } from '#/features/invoices/model'
import { ManualPaymentConfirmationDialog } from './manual-payment-confirmation-dialog'

vi.mock('#/components/app/asset-image', () => ({
  AssetImage: ({
    assetId,
    assetKind,
  }: {
    assetId: string
    assetKind?: string
  }) => (
    <img
      alt={`proof ${assetId}`}
      data-testid="asset-image"
      src={`/api/assets/${assetId}?kind=${assetKind}`}
    />
  ),
}))

const mockUseInvoice = vi.fn()

vi.mock('#/features/invoices/hooks', () => ({
  useInvoice: (id: string) => mockUseInvoice(id),
}))

const messages = {
  invoices: {
    confirmManualPayment: 'Confirm Manual Payment',
    confirmManualPaymentDesc:
      'Review the payment proof and confirm this bank transfer payment.',
    invoiceNumber: 'Invoice #',
    destinationBank: 'Destination Bank',
    bankName: 'Bank Name',
    accountNumber: 'Account Number',
    accountHolder: 'Account Holder',
    noPaymentMethodConfigured: 'No bank account configured for this invoice.',
    latestProofSubmitted: 'Latest proof submitted',
    paymentProofs: 'Payment Proofs',
    noPaymentProofs: 'No payment proof submitted yet.',
    confirmSimple: 'Confirm',
    viewProof: 'View Proof',
    downloadProof: 'Download Proof',
  },
  common: {
    cancel: 'Cancel',
  },
}

const invoice: InvoiceRow = {
  id: 'invoice-1',
  invoiceNumber: 'INV-001',
  customerName: 'Acme Corp',
  status: 'unpaid',
  total: 500000,
  percentage: 50,
  dueDate: '2026-07-15',
  paymentMethodId: 'pm-1',
  paymentProvider: 'bank_transfer',
  createdAt: new Date('2026-06-01T00:00:00Z'),
  overdue: false,
}

const paymentMethod = {
  id: 'pm-1',
  orgId: 'org-1',
  name: 'BCA Business',
  type: 'bank_transfer' as const,
  bankName: 'BCA',
  accountNumber: '1234567890',
  accountHolder: 'PT Labq',
  instructions: null,
  isDefault: true,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const proofs: InvoicePaymentProof[] = [
  {
    id: 'proof-1',
    invoiceId: 'invoice-1',
    proofAssetId: 'asset-proof-1',
    createdAt: new Date('2026-06-20T10:30:00Z'),
  },
  {
    id: 'proof-2',
    invoiceId: 'invoice-1',
    proofAssetId: 'asset-proof-2',
    createdAt: new Date('2026-06-22T14:15:00Z'),
  },
]

function renderDialog({
  invoiceData = invoice,
  paymentProofs = proofs,
  onConfirm = vi.fn().mockResolvedValue(true),
  isConfirming = false,
  invoiceDetail = { invoice, lineItems: [], paymentMethod, customer: null },
}: {
  invoiceData?: InvoiceRow
  paymentProofs?: InvoicePaymentProof[]
  onConfirm?: () => Promise<boolean>
  isConfirming?: boolean
  invoiceDetail?: {
    invoice: typeof invoice
    lineItems: Array<unknown>
    paymentMethod: typeof paymentMethod | null
    customer: unknown
  }
} = {}) {
  mockUseInvoice.mockReturnValue({ data: invoiceDetail })

  const onOpenChange = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const result = render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={messages}>
        <ManualPaymentConfirmationDialog
          open
          onOpenChange={onOpenChange}
          invoice={invoiceData}
          paymentProofs={paymentProofs}
          onConfirm={onConfirm}
          isConfirming={isConfirming}
        />
      </IntlProvider>
    </QueryClientProvider>,
  )

  return { ...result, onOpenChange, onConfirm }
}

describe('ManualPaymentConfirmationDialog', () => {
  it('renders invoice number, amount, and destination bank details', () => {
    renderDialog()

    expect(screen.getByText('Confirm Manual Payment')).toBeInTheDocument()
    expect(screen.getByText('INV-001')).toBeInTheDocument()
    expect(screen.getByText('BCA')).toBeInTheDocument()
    expect(screen.getByText('1234567890')).toBeInTheDocument()
    expect(screen.getByText('PT Labq')).toBeInTheDocument()
  })

  it('shows latest proof submission timestamp and renders proof thumbnails', () => {
    renderDialog()

    expect(screen.getByText('Latest proof submitted')).toBeInTheDocument()
    expect(screen.getByText(/Jun 22, 2026/)).toBeInTheDocument()
    expect(screen.getAllByTestId('asset-image')).toHaveLength(2)
    expect(screen.getByAltText('proof asset-proof-1')).toBeInTheDocument()
    expect(screen.getByAltText('proof asset-proof-2')).toBeInTheDocument()
  })

  it('shows honest empty state when no payment proofs exist', () => {
    renderDialog({ paymentProofs: [] })

    expect(
      screen.getByText('No payment proof submitted yet.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Payment Proofs')).not.toBeInTheDocument()
  })

  it('shows honest empty state when no payment method is configured', () => {
    renderDialog({
      invoiceDetail: {
        invoice,
        lineItems: [],
        paymentMethod: null,
        customer: null,
      },
    })

    expect(
      screen.getByText('No bank account configured for this invoice.'),
    ).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(true)

    renderDialog({ onConfirm })

    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('does not close when onConfirm resolves false', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(false)
    const { onOpenChange } = renderDialog({ onConfirm })

    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled()
    })

    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('closes when onConfirm resolves true', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(true)
    const { onOpenChange } = renderDialog({ onConfirm })

    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('disables close while confirmation is in progress', async () => {
    const user = userEvent.setup()
    let resolveConfirm: (value: boolean) => void = () => {}
    const onConfirm = vi.fn().mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveConfirm = resolve
        }),
    )
    const { onOpenChange } = renderDialog({ onConfirm })

    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled()
    })

    resolveConfirm(true)

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
