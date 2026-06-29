import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { CompleteProductionModal } from './complete-production-modal'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

const mutateAsync = vi.fn()

vi.mock('#/features/orders/hooks', () => ({
  useCompleteProduction: () => ({
    mutateAsync,
    isPending: false,
  }),
}))

vi.mock('#/features/invoices/hooks', () => ({
  usePaymentMethods: () => ({
    data: [
      { id: 'pm-1', name: 'Bank Transfer' },
      { id: 'pm-2', name: 'Cash' },
    ],
  }),
}))

const messages = {
  production: {
    completeProduction: 'Complete Production',
    orderNumberLabel: 'Order #',
    allTasksCompleted: 'All tasks have been completed ✓',
    shipmentDetails: 'Shipment Details',
    shipmentAddress: 'Shipment Address',
    courier: 'Courier',
    courierPlaceholder: 'e.g., JNE, SiCepat, J&T',
    trackingNumber: 'Tracking Number',
    trackingNumberPlaceholder: 'Enter tracking number (optional)',
    shipmentFee: 'Shipment Fee',
    optional: '(optional)',
    shippingFeeDescription: 'Description',
    shippingFeeDescriptionPlaceholder: 'e.g., Shipping Fee',
    payment: 'Payment',
    finalInvoice: 'Final Invoice',
    orderTotal: 'Order Total',
    alreadyPaid: 'Already Paid',
    remainingPayment: 'Remaining Payment',
    total: 'Total',
    createInvoiceAndShip: 'Create Invoice & Ship',
    paymentMethodRequired: 'Please select a payment method',
    invoiceAmountRequired: 'Invoice amount must be greater than 0',
    completeProductionFailed: 'Failed',
    markAsShipped: 'Mark as Shipped',
  },
  invoices: {
    paymentMethod: 'Payment Method',
    dueDate: 'Due Date',
    notes: 'Notes',
  },
}

const defaultOrder = {
  id: 'order-1',
  orderNumber: 'ORD-001',
  total: 500000,
  invoicedPercentage: 50,
  invoicedAmount: 250000,
  remainingPercentage: 50,
  remainingAmount: 250000,
  customerId: 'cust-1',
  customerName: 'Acme Corp',
  shippingAddress: null,
}

function renderModal(orderOverrides: Record<string, unknown> = {}) {
  const onOpenChange = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const result = render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={messages}>
        <CompleteProductionModal
          open
          onOpenChange={onOpenChange}
          order={{ ...defaultOrder, ...orderOverrides }}
        />
      </IntlProvider>
    </QueryClientProvider>,
  )
  return { ...result, onOpenChange }
}

describe('CompleteProductionModal', () => {
  it('shows order number, all-tasks-completed state, payment method select, and final invoice total', () => {
    renderModal()

    expect(screen.getByText('Order #ORD-001')).toBeInTheDocument()
    expect(
      screen.getByText('All tasks have been completed ✓'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Payment Method').length).toBeGreaterThanOrEqual(1)
    // remainingAmount (250,000) formatted as IDR
    expect(screen.getAllByText(/250\.000/).length).toBeGreaterThanOrEqual(1)
  })

  it('entering a positive shipping fee reveals the description field and adds to total', async () => {
    const user = userEvent.setup()
    renderModal()

    const shippingFeeInput = screen.getByPlaceholderText('0')
    await user.type(shippingFeeInput, '50000')

    // Description field should appear
    expect(screen.getByText('Description')).toBeInTheDocument()

    // Total should now be remaining (250,000) + shipping (50,000) = 300,000
    await waitFor(() => {
      expect(screen.getByText(/300\.000/)).toBeInTheDocument()
    })
  })

  it('submitting without a payment method calls toast.error with paymentMethodRequired and does not call mutateAsync', async () => {
    const user = userEvent.setup()
    vi.mocked(toast.error).mockClear()
    mutateAsync.mockReset()
    renderModal()

    const submitButton = screen.getByRole('button', {
      name: /Create Invoice & Ship/,
    })
    await user.click(submitButton)

    expect(toast.error).toHaveBeenCalledWith('Please select a payment method')
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('submitting with a payment method calls mutateAsync with correct payload', async () => {
    const user = userEvent.setup()
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue({ ok: true })
    renderModal()

    // Select a payment method via native select
    const selects = document.querySelectorAll('select')
    if (selects.length > 0) {
      await user.selectOptions(selects[0], 'pm-1')
    }

    // Fill in shipping fee
    const shippingFeeInput = screen.getByPlaceholderText('0')
    await user.type(shippingFeeInput, '50000')

    const submitButton = screen.getByRole('button', {
      name: /Create Invoice & Ship/,
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'order-1',
          invoicePercentage: 100,
          invoicePaymentMethodId: 'pm-1',
          shippingFee: 50000,
        }),
      )
    })
  })
})
