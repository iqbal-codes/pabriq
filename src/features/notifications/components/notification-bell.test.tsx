import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { NotificationBell } from './notification-bell'

const mockUseActionNotifications = vi.fn()

// Mock query hook
vi.mock('../hooks', () => ({
  useActionNotifications: () => mockUseActionNotifications(),
}))

// Mock `@tanstack/react-router` Link
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    search,
    children,
  }: {
    to: string
    params?: Record<string, string>
    search?: Record<string, string>
    children: React.ReactNode
  }) => {
    let href = to
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        href = href.replace(`$${k}`, v)
      }
    }
    if (search) {
      const q = new URLSearchParams(search).toString()
      if (q) href += `?${q}`
    }
    return <a href={href}>{children}</a>
  },
}))

const messages = {
  notifications: {
    title: 'Action notifications',
    subtitle:
      '{count, plural, =0 {No pending actions} one {# pending action} other {# pending actions}}',
    viewAll: 'View all',
    emptyTitle: 'No pending actions',
    emptyDescription:
      'Payment confirmations, order reviews, invoice requests, and task reviews will appear here.',
    paymentConfirmations: 'Payment confirmations',
    orderReviews: 'Order reviews',
    taskReviews: 'Task reviews',
    dpInvoiceRequests: 'DP invoice requests',
    finalInvoiceRequests: 'Final invoice requests',
    paymentConfirmationLabel: 'Payment confirmation',
    orderReviewLabel: 'Order review',
    taskReviewLabel: 'Task review',
    dpInvoiceLabel: 'Send DP invoice',
    finalInvoiceLabel: 'Send final invoice',
    paymentConfirmationMessage:
      '{customerName} submitted {amount} for invoice {invoiceNumber}.',
    orderReviewMessage:
      '{customerName} submitted order {orderNumber} for review.',
    taskReviewMessage: '{taskNumber} needs review at {stageName}.',
    dpInvoiceMessage:
      'All pre-production tasks for order {orderNumber} are queued for {stageName}. Send the DP invoice to {customerName} to continue the order.',
    finalInvoiceMessage:
      'All production tasks for order {orderNumber} are finished. Send the final invoice to {customerName}.',
    openAction: 'Open',
    amount: 'Amount',
    noCustomer: 'Unknown customer',
    noOrderNumber: 'No order number',
    noTaskNumber: 'No task number',
    noStage: 'Unknown stage',
    productionStageFallback: 'production',
  },
}

function renderBell() {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <NotificationBell />
    </IntlProvider>,
  )
}

describe('NotificationBell', () => {
  it('renders empty state when there are no notifications', async () => {
    mockUseActionNotifications.mockReturnValue({
      data: {
        items: [],
        totalCount: 0,
        counts: {
          payment_confirmation: 0,
          order_review: 0,
          dp_invoice_request: 0,
          final_invoice_request: 0,
          task_review: 0,
        },
      },
      isLoading: false,
    })

    renderBell()

    // Trigger click on bell button to open dropdown
    const trigger = screen.getByRole('button')
    await userEvent.click(trigger)

    expect(screen.getAllByText('No pending actions')).toHaveLength(2)
    expect(
      screen.getByText(
        'Payment confirmations, order reviews, invoice requests, and task reviews will appear here.',
      ),
    ).toBeInTheDocument()
  })

  it('renders badge with 99+ cap when totalCount > 99', () => {
    mockUseActionNotifications.mockReturnValue({
      data: {
        items: [],
        totalCount: 150,
        counts: {
          payment_confirmation: 50,
          order_review: 50,
          dp_invoice_request: 25,
          final_invoice_request: 25,
          task_review: 0,
        },
      },
      isLoading: false,
    })

    renderBell()

    const badge = screen.getByText('99+')
    expect(badge).toBeInTheDocument()
  })

  it('renders rows for payment, order, invoice request, and task notifications with correct links', async () => {
    const mockItems = [
      {
        id: 'payment:pay-1',
        type: 'payment_confirmation',
        priority: 'high',
        createdAt: new Date('2026-07-04T12:00:00Z'),
        href: '/invoices/inv-1',
        context: {
          invoiceId: 'inv-1',
          invoiceNumber: 'INV-100',
          customerName: 'Customer A',
          amount: 500000,
          method: 'bank_transfer',
          reference: null,
          proofAssetId: null,
        },
      },
      {
        id: 'order:ord-1',
        type: 'order_review',
        priority: 'high',
        createdAt: new Date('2026-07-04T11:00:00Z'),
        href: '/orders/ord-1',
        context: {
          orderId: 'ord-1',
          orderNumber: 'ORD-200',
          customerName: 'Customer B',
          total: 1000000,
        },
      },
      {
        id: 'dp_invoice:ord-dp',
        type: 'dp_invoice_request',
        priority: 'high',
        createdAt: new Date('2026-07-04T10:45:00Z'),
        href: '/orders/ord-dp',
        context: {
          orderId: 'ord-dp',
          orderNumber: 'ORD-DP',
          customerName: 'Customer C',
          total: 750000,
          firstProductionStageName: 'Print',
        },
      },
      {
        id: 'final_invoice:ord-final',
        type: 'final_invoice_request',
        priority: 'high',
        createdAt: new Date('2026-07-04T10:30:00Z'),
        href: '/orders/ord-final',
        context: {
          orderId: 'ord-final',
          orderNumber: 'ORD-FINAL',
          customerName: 'Customer D',
          total: 1250000,
        },
      },
      {
        id: 'task:tsk-1',
        type: 'task_review',
        priority: 'normal',
        createdAt: new Date('2026-07-04T10:00:00Z'),
        href: '/production?reviewTask=tsk-1',
        context: {
          taskId: 'tsk-1',
          taskNumber: 'TSK-300',
          orderId: 'ord-1',
          orderNumber: 'ORD-200',
          customerName: 'Customer B',
          productName: 'Custom Banner',
          stageName: 'Design',
        },
      },
    ]

    mockUseActionNotifications.mockReturnValue({
      data: {
        items: mockItems,
        totalCount: 5,
        counts: {
          payment_confirmation: 1,
          order_review: 1,
          dp_invoice_request: 1,
          final_invoice_request: 1,
          task_review: 1,
        },
      },
      isLoading: false,
    })

    renderBell()

    // Badge shows 5
    expect(screen.getByText('5')).toBeInTheDocument()

    // Trigger click on bell button to open dropdown
    const trigger = screen.getByRole('button')
    await userEvent.click(trigger)

    // Check payment notification
    expect(screen.getByText('Payment confirmation')).toBeInTheDocument()
    expect(
      screen.getByText(
        (content) =>
          content.includes('Customer A submitted') &&
          content.includes('for invoice INV-100.'),
      ),
    ).toBeInTheDocument()
    const paymentLink = screen.getAllByRole('link', { name: 'Open' })[0]
    expect(paymentLink.getAttribute('href')).toBe('/invoices/inv-1')

    // Check order notification
    expect(screen.getByText('Order review')).toBeInTheDocument()
    expect(
      screen.getByText('Customer B submitted order ORD-200 for review.'),
    ).toBeInTheDocument()
    const orderLink = screen.getAllByRole('link', { name: 'Open' })[1]
    expect(orderLink.getAttribute('href')).toBe('/orders/ord-1')

    // Check DP invoice notification
    expect(screen.getByText('Send DP invoice')).toBeInTheDocument()
    expect(
      screen.getByText(
        'All pre-production tasks for order ORD-DP are queued for Print. Send the DP invoice to Customer C to continue the order.',
      ),
    ).toBeInTheDocument()
    const dpInvoiceLink = screen.getAllByRole('link', { name: 'Open' })[2]
    expect(dpInvoiceLink.getAttribute('href')).toBe('/orders/ord-dp')

    // Check final invoice notification
    expect(screen.getByText('Send final invoice')).toBeInTheDocument()
    expect(
      screen.getByText(
        'All production tasks for order ORD-FINAL are finished. Send the final invoice to Customer D.',
      ),
    ).toBeInTheDocument()
    const finalInvoiceLink = screen.getAllByRole('link', { name: 'Open' })[3]
    expect(finalInvoiceLink.getAttribute('href')).toBe('/orders/ord-final')

    // Check task notification
    expect(screen.getByText('Task review')).toBeInTheDocument()
    expect(
      screen.getByText('TSK-300 needs review at Design.'),
    ).toBeInTheDocument()
    const taskLink = screen.getAllByRole('link', { name: 'Open' })[4]
    expect(taskLink.getAttribute('href')).toBe('/production?reviewTask=tsk-1')
  })
})
