import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { CreateInvoicePage } from './create-invoice-page'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mutateAsync = vi.fn()

vi.mock('#/features/invoices/hooks', () => ({
  useCreateInvoice: () => ({ mutateAsync, isPending: false }),
  useOrderForInvoice: (orderId: string) => ({
    data: orderId
      ? {
          order: {
            id: 'order-1',
            orderNumber: 'ORD-001',
            total: 6_000_000,
            customerId: 'cust-1',
            customerName: 'Acme Corp',
            customerPhone: null,
            customerEmail: null,
            status: 'in_progress',
            notes: null,
          },
          invoicedPercentage: 50,
          invoicedAmount: 3_000_000,
          remainingPercentage: 50,
          remainingAmount: 3_000_000,
          lineItems: [
            {
              id: 'li-1',
              name: 'Widget',
              quantity: 10,
              unitPrice: 600_000,
              total: 6_000_000,
            },
          ],
          existingInvoices: [
            {
              id: 'inv-1',
              invoiceNumber: 'INV-2024-001',
              percentage: 50,
              total: 3_000_000,
              status: 'paid',
            },
          ],
        }
      : null,
    isLoading: false,
  }),
  usePaymentMethods: () => ({
    data: [{ id: 'pm-1', name: 'Bank Transfer' }],
  }),
}))

const mockNavigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: mockNavigate }),
}))

vi.mock('nuqs', () => ({
  parseAsString: {},
  useQueryState: (key: string) => {
    if (key === 'orderId') return ['order-1', vi.fn()] as const
    return [null, vi.fn()] as const
  },
}))

const messages = {
  invoices: {
    title: 'Invoices',
    createInvoice: 'Create Invoice',
    failed: 'Failed',
    fullAmount: 'Full (100%)',
    remainingAmount: 'Remaining ({percentage}%)',
    customAmount: 'Custom',
    decreasePercentage: 'Decrease percentage',
    increasePercentage: 'Increase percentage',
    stepHint: '({percentage}% steps)',
    orderLabel: 'Order #{orderNumber}',
    total: 'Total',
    invoiceAmount: 'Invoice amount',
    alreadyInvoiced: 'Already invoiced: {percentage}% ({amount})',
    paymentMethod: 'Payment Method',
    notes: 'Notes',
    customer: 'Customer',
    remaining: 'Remaining',
    invoiceTotal: 'Invoice Total: {amount}',
    remainingFrom: 'from {amount}',
    dueDate: 'Due Date',
    lineItems: 'Line Items',
    description: 'Description',
    qty: 'Qty',
    rate: 'Rate',
  },
  status: {
    in_progress: 'In Progress',
    draft: 'Draft',
    completed: 'Completed',
  },
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={messages}>
        <CreateInvoicePage />
      </IntlProvider>
    </QueryClientProvider>,
  )
}

describe('CreateInvoicePage', () => {
  it('defaults to remaining mode and shows the remaining amount for a partially invoiced order', async () => {
    renderPage()

    await waitFor(() => {
      // Submit button should show remaining amount (3,000,000), not full (6,000,000)
      const submitButton = screen.getByRole('button', {
        name: /Create Invoice/,
      })
      expect(submitButton.textContent).toMatch(/3[.,]000[.,]000/)
    })

    // Should NOT show 6,000,000 in the submit button
    const submitButton = screen.getByRole('button', { name: /Create Invoice/ })
    expect(submitButton.textContent).not.toMatch(/6[.,]000[.,]000/)
  })

  it('clicking full mode changes the displayed amount to the full order total', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      const submitButton = screen.getByRole('button', {
        name: /Create Invoice/,
      })
      expect(submitButton.textContent).toMatch(/3[.,]000[.,]000/)
    })

    // Click the Full (100%) button
    const fullButton = screen.getByRole('button', { name: /Full/ })
    await user.click(fullButton)

    await waitFor(() => {
      const submitButton = screen.getByRole('button', {
        name: /Create Invoice/,
      })
      expect(submitButton.textContent).toMatch(/6[.,]000[.,]000/)
    })
  })
})
