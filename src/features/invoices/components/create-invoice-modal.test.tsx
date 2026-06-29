import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { CreateInvoiceModal } from './create-invoice-modal'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mutateAsync = vi.fn()

vi.mock('#/features/invoices/hooks', () => ({
  useCreateInvoice: () => ({ mutateAsync, isPending: false }),
  usePaymentMethods: () => ({ data: [{ id: 'pm-1', name: 'Bank Transfer' }] }),
}))

const messages = {
  invoices: {
    title: 'Invoices',
    createInvoice: 'Create Invoice',
    orderLabel: 'Order #{orderNumber}',
    total: 'Total',
    invoiceAmount: 'Invoice amount',
    fullAmount: 'Full (100%)',
    remainingAmount: 'Remaining ({percentage}%)',
    customAmount: 'Custom',
    stepHint: '({percentage}% steps)',
    decreasePercentage: 'Decrease percentage',
    increasePercentage: 'Increase percentage',
    alreadyInvoiced: 'Already invoiced: {percentage}% ({amount})',
    paymentMethod: 'Payment Method',
    notes: 'Notes',
    failed: 'Failed',
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
}

function renderModal() {
  const onOpenChange = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const result = render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={messages}>
        <CreateInvoiceModal
          open
          onOpenChange={onOpenChange}
          order={defaultOrder}
        />
      </IntlProvider>
    </QueryClientProvider>,
  )
  return { ...result, onOpenChange }
}

describe('CreateInvoiceModal', () => {
  it('renders translated order label, invoice amount, remaining, custom, payment method, and previously invoiced helper', () => {
    renderModal()

    expect(screen.getByText('Order #ORD-001')).toBeInTheDocument()
    expect(screen.getByText('Invoice amount')).toBeInTheDocument()
    expect(screen.getByText('Remaining (50%)')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(screen.getAllByText('Payment Method').length).toBeGreaterThanOrEqual(
      1,
    )
    expect(screen.getByText(/Already invoiced: 50%/)).toBeInTheDocument()
    expect(screen.getAllByText(/250\.000/).length).toBeGreaterThanOrEqual(1)
  })

  it('clicking Custom then Increase percentage changes displayed percentage and submit amount', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Custom' }))

    // Initial custom mode starts at 50%
    expect(screen.getByText('50%')).toBeInTheDocument()

    // Click increase
    await user.click(
      screen.getByRole('button', { name: 'Increase percentage' }),
    )

    // Should now show 55%
    expect(screen.getByText('55%')).toBeInTheDocument()
    // Submit button should show 55% of 500,000 = 275,000
    const submitButton = screen.getByRole('button', {
      name: /Create Invoice/,
    })
    expect(submitButton.textContent).toMatch(/275\.000/)
  })

  it('custom mode shows translated step hint and accessible stepper buttons', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Custom' }))

    expect(screen.getByText('(5% steps)')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Decrease percentage' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Increase percentage' }),
    ).toBeInTheDocument()
  })
})
