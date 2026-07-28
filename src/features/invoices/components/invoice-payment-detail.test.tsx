import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { InvoiceRow } from '#/features/invoices/model'
import { InvoicePaymentDetail } from './invoice-payment-detail'

const mockUseInvoice = vi.fn()
const mockMutateAsync = vi.fn()
const mockConfirmPaymentMutate = vi.fn()

vi.mock('#/features/invoices/hooks', () => ({
  useInvoice: (id: string) => mockUseInvoice(id),
  useReconcilePayment: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useConfirmPayment: () => ({
    mutate: mockConfirmPaymentMutate,
    isPending: false,
  }),
  useRejectPayment: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

const messages = {
  invoices: {
    paymentSource: 'Payment Source',
    invoiceTotal: 'Invoice Total',
    gatewayOrderId: 'Gateway Order ID',
    gatewayTransactionId: 'Transaction ID',
    reconcileWithMidtrans: 'Lookup Midtrans transaction',
    reconcilePaid: 'Payment confirmed via Midtrans',
    reconcileMismatch: 'Midtrans amount does not match invoice total',
    reconcileNotSettled: 'Midtrans reports this transaction is not yet settled',
    reconcileNoOrderId: 'No Midtrans transaction linked to this invoice',
    manualReviewRequired: 'Manual review required',
    reconcileFailed: 'Reconciliation lookup failed',
    transactionHistory: 'Midtrans Transaction History ({count})',
    transactionError: 'Gateway error',
    midtransOnlineGateway: 'Midtrans (Online Gateway)',
    bankTransferManual: 'Bank Transfer (Manual)',
    transactionId: 'Transaction ID: {id}',
    paymentRecords: 'Payment Records ({count})',
    referencePrefix: 'Ref: {reference}',
    confirmSimple: 'Confirm',
    rejectSimple: 'Reject',
    paymentConfirmed: 'Payment confirmed',
    confirmedByLabel: 'Confirmed by',
    receivedAtLabel: 'Received at',
    syncTimeLabel: 'Last sync',
    rejectedReasonLabel: 'Rejection reason',
  },
}

const mockMidtransInvoice: InvoiceRow = {
  id: 'inv-mid-1',
  invoiceNumber: 'INV-MID-001',
  customerName: 'Midtrans Cust',
  status: 'unpaid',
  total: 500000,
  percentage: 100,
  dueDate: '2026-08-01',
  paymentProvider: 'midtrans',
  paymentMethodId: null,
  midtransOrderId: 'MID-ORDER-999',
  createdAt: new Date(),
  overdue: false,
}

const mockManualInvoice: InvoiceRow = {
  id: 'inv-man-1',
  invoiceNumber: 'INV-MAN-001',
  customerName: 'Manual Cust',
  status: 'unpaid',
  total: 250000,
  percentage: 50,
  dueDate: '2026-08-01',
  paymentProvider: 'bank_transfer',
  paymentMethodId: 'pm-1',
  midtransOrderId: null,
  createdAt: new Date(),
  overdue: false,
}

function renderComponent(props: Parameters<typeof InvoicePaymentDetail>[0]) {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <InvoicePaymentDetail {...props} />
    </IntlProvider>,
  )
}

describe('InvoicePaymentDetail Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseInvoice.mockReturnValue({
      data: {
        payments: [],
        midtransAttempts: [],
      },
      isLoading: false,
    })
  })

  it('renders payment source, gateway order ID, and amount for Midtrans invoice', () => {
    mockUseInvoice.mockReturnValue({
      data: {
        payments: [],
        midtransAttempts: [
          {
            id: 'att-1',
            orderId: 'MID-ORDER-999',
            transactionId: 'TX-MID-123',
            transactionStatus: 'pending',
            paymentType: 'qris',
            grossAmount: 500000,
          },
        ],
      },
      isLoading: false,
    })

    renderComponent({ invoice: mockMidtransInvoice, orgRole: 'owner' })

    expect(screen.getByText('Midtrans (Online Gateway)')).toBeInTheDocument()
    expect(screen.getAllByText('MID-ORDER-999')).toHaveLength(2)
    expect(screen.getByText('TX-MID-123')).toBeInTheDocument()
    expect(screen.getByText('Lookup Midtrans transaction')).toBeInTheDocument()
  })

  it('shows retry reconciliation action for owner and handles success state', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValue({
      ok: true,
      status: 'paid',
      reason: 'confirmed',
    })

    renderComponent({ invoice: mockMidtransInvoice, orgRole: 'owner' })

    const reconcileBtn = screen.getByRole('button', {
      name: 'Lookup Midtrans transaction',
    })
    expect(reconcileBtn).toBeInTheDocument()

    await user.click(reconcileBtn)

    expect(mockMutateAsync).toHaveBeenCalledWith('inv-mid-1')
    expect(
      await screen.findByText('Payment confirmed via Midtrans'),
    ).toBeInTheDocument()
  })

  it('handles mismatch reconciliation state', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValue({
      ok: true,
      status: 'mismatch',
    })

    renderComponent({ invoice: mockMidtransInvoice, orgRole: 'admin' })

    const reconcileBtn = screen.getByRole('button', {
      name: 'Lookup Midtrans transaction',
    })
    await user.click(reconcileBtn)

    expect(
      await screen.findByText('Midtrans amount does not match invoice total'),
    ).toBeInTheDocument()
  })

  it('disables/hides retry reconciliation action for unauthorized member role', () => {
    renderComponent({ invoice: mockMidtransInvoice, orgRole: 'member' })

    expect(
      screen.queryByRole('button', { name: 'Lookup Midtrans transaction' }),
    ).not.toBeInTheDocument()
  })

  it('preserves manual payment confirmation button and triggers onManualConfirm', async () => {
    const user = userEvent.setup()
    const handleManualConfirm = vi.fn()

    renderComponent({
      invoice: mockManualInvoice,
      orgRole: 'owner',
      onManualConfirm: handleManualConfirm,
    })

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmBtn).toBeInTheDocument()

    await user.click(confirmBtn)
    expect(handleManualConfirm).toHaveBeenCalledTimes(1)
  })

  it('renders payment record timestamps, confirmedBy source, and rejection reason', () => {
    mockUseInvoice.mockReturnValue({
      data: {
        payments: [
          {
            id: 'pay-1',
            method: 'bank_transfer',
            amount: 250000,
            status: 'confirmed',
            reference: 'REF-123',
            receivedAt: new Date('2026-07-20T10:00:00Z'),
            confirmedAt: new Date('2026-07-20T10:05:00Z'),
            confirmedBy: 'operator-1',
          },
          {
            id: 'pay-2',
            method: 'bank_transfer',
            amount: 100000,
            status: 'rejected',
            rejectedReason: 'Invalid proof document',
          },
        ],
        midtransAttempts: [],
      },
      isLoading: false,
    })

    renderComponent({ invoice: mockManualInvoice, orgRole: 'owner' })

    expect(screen.getByText(/operator-1/)).toBeInTheDocument()
    expect(
      screen.getByText('Rejection reason: Invalid proof document'),
    ).toBeInTheDocument()
  })
})
