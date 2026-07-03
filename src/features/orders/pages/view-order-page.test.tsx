import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ViewOrderPage } from './view-order-page'

// ── Router mocks ─────────────────────────────────────────────────
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
  useParams: () => ({ id: 'order-1' }),
  useRouteContext: () => ({ org: { id: 'org-1' } }),
}))

// ── Configurable invoice data ────────────────────────────────────
const mockInvoices: Array<{
  id: string
  invoiceNumber: string
  customerName: string
  status: string
  total: number
  percentage: number | null
  dueDate: string
  paymentMethodId: string | null
  createdAt: Date
  overdue: boolean
  shippingFee?: number
}> = []

// ── Hook mocks ───────────────────────────────────────────────────
vi.mock('#/features/orders/hooks', () => ({
  useOrder: () => ({
    data: {
      order: {
        id: 'order-1',
        orderNumber: 'ORD-001',
        status: 'in_delivery',
        total: 500000,
        courier: 'JNE',
        trackingNumber: 'JNE-12345',
        notes: null,
        validUntil: null,
        approvedAt: new Date('2026-06-01'),
        shippedAt: new Date('2026-06-15'),
        deliveredAt: null,
        customerId: 'cust-1',
        orderToken: null,
        rejectReason: null,
        createdAt: new Date('2026-06-01'),
        updatedAt: new Date('2026-06-15'),
        shippingAddress: null,
      },
      lineItems: [],
      customerName: 'Acme Corp',
      customerPhone: null,
      customerPhotoAssetId: null,
      customerEmail: null,
      shippingAddress: null,
    },
  }),
}))

vi.mock('#/features/invoices/hooks', () => ({
  useInvoicesList: () => ({
    data: { rows: mockInvoices, total: mockInvoices.length },
  }),
  useInvoicePaymentProofs: () => ({
    data: {},
  }),
  usePaymentMethods: () => ({
    data: [],
  }),
}))

vi.mock('#/features/production/hooks', () => ({
  useTasksByOrderId: () => ({
    data: [],
  }),
}))

vi.mock('#/features/orders/components/use-order-derived-state', () => ({
  useOrderDerivedState: () => ({
    isApprovedOrLater: true,
    canCreateInvoice: false,
    canSendDpInvoice: false,
    canSendSettlementInvoice: false,
    canStartProduction: false,
    invoicedPct: 0,
    invoicedAmt: 0,
    remainingPct: 100,
    remainingAmt: 500000,
    canCompleteProduction: false,
    canCompleteOrder: false,
  }),
}))

vi.mock('#/features/orders/components/use-order-mutations', () => ({
  useOrderMutations: () => ({
    handleApprove: vi.fn(),
    handleReject: vi.fn(),
    handleMarkInvoicePaid: vi.fn(),
    handleStartProduction: vi.fn(),
    handleCompleteOrder: vi.fn(),
    handleCopyPortalLink: vi.fn(),
    isApproving: false,
    isRejecting: false,
    isMarkingPaid: false,
    isStartingProduction: false,
    isCompletingOrder: false,
    isGeneratingLink: false,
  }),
}))

// ── Component mocks (shallow stubs for child components) ─────────
vi.mock('#/features/orders/components/order-line-items-card', () => ({
  OrderLineItemsCard: () => <div data-testid="order-line-items-card" />,
}))

vi.mock('#/features/orders/components/order-invoices-section', () => ({
  OrderInvoicesSection: () => <div data-testid="order-invoices-section" />,
}))

vi.mock('#/features/orders/components/order-status-badge', () => ({
  OrderStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="order-status-badge">{status}</span>
  ),
}))

vi.mock('#/features/orders/components/reject-reason-dialog', () => ({
  RejectReasonDialog: () => null,
}))

vi.mock('#/features/orders/components/rejected-reason-banner', () => ({
  RejectedReasonBanner: () => null,
}))

vi.mock('#/features/invoices/components/create-invoice-modal', () => ({
  CreateInvoiceModal: () => null,
}))

vi.mock('#/features/orders/components/complete-production-modal', () => ({
  CompleteProductionModal: () => null,
}))

vi.mock('#/components/app/avatar-photo', () => ({
  AvatarPhoto: ({ name }: { name?: string }) => (
    <div data-testid="avatar-photo">{name}</div>
  ),
}))

vi.mock('#/components/app/page-shell/page-content', () => ({
  PageContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

vi.mock('#/components/app/page-shell/page-header', () => ({
  PageHeader: ({
    title,
    secondaryActions,
  }: {
    title: React.ReactNode
    secondaryActions?: Array<{ label: string }>
  }) => (
    <div>
      <div data-testid="page-header-title">{title}</div>
      {secondaryActions?.map((action) => (
        <span key={action.label}>{action.label}</span>
      ))}
    </div>
  ),
}))

vi.mock('#/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick?: () => void
  }) => <button onClick={onClick}>{children}</button>,
}))

// ── Translation messages ─────────────────────────────────────────
const messages = {
  orders: {
    summary: 'Order Summary',
    total: 'Total',
    createdAt: 'Created At',
    customer: 'Customer',
    guestCustomer: 'Guest',
    shippingDetail: 'Shipping Detail',
    customerDueDate: 'Customer Due',
    editOrder: 'Edit Order',
    approve: 'Approve',
    reject: 'Reject',
    generateLink: 'Generate Portal Link',
    copyPortalLink: 'Copy Portal Link',
    downloadQuotation: 'Download Quotation',
    sendDpInvoice: 'Send DP Invoice',
    sendSettlementInvoice: 'Send Settlement Invoice',
    confirmDpPayment: 'Confirm DP Payment',
    confirmSettlementPayment: 'Confirm Settlement',
    completeOrder: 'Complete Order',
    paymentPaid: 'Paid',
    paymentUnpaid: 'Unpaid',
    validUntil: 'Valid Until',
  },
  common: {
    back: 'Back',
  },
  status: {
    approved: 'Approved',
    in_delivery: 'In Delivery',
    completed: 'Completed',
  },
  portal: {
    shippingAddress: 'Shipping Address',
  },
  production: {
    courier: 'Courier',
    trackingNumber: 'Tracking Number',
    shipmentFee: 'Shipment Fee',
    markAsShipped: 'Mark as Shipped',
    startOrderProduction: 'Start Production',
  },
}

function renderPage() {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <ViewOrderPage />
    </IntlProvider>,
  )
}

describe('ViewOrderPage – shipping card', () => {
  beforeEach(() => {
    mockInvoices.length = 0
  })
  it('renders the shipping card with "Shipping Detail" title when courier is present', () => {
    renderPage()

    expect(screen.getByText('Shipping Detail')).toBeInTheDocument()
    expect(screen.queryByText('Customer Due')).not.toBeInTheDocument()
  })

  it('displays the courier name in the shipping card', () => {
    renderPage()

    expect(screen.getByText('JNE')).toBeInTheDocument()
  })

  it('displays the tracking number in the shipping card', () => {
    renderPage()

    expect(screen.getByText('JNE-12345')).toBeInTheDocument()
  })

  it('shows shipment fee when invoice carries a shipping fee', () => {
    mockInvoices.length = 0
    mockInvoices.push({
      id: 'inv-1',
      invoiceNumber: 'INV-001',
      customerName: 'Acme Corp',
      status: 'paid',
      total: 250000,
      percentage: 50,
      dueDate: '2026-07-01',
      paymentMethodId: null,
      createdAt: new Date('2026-06-01'),
      overdue: false,
      shippingFee: 50000,
    })

    renderPage()

    expect(screen.getByText('Shipment Fee')).toBeInTheDocument()
    expect(screen.getByText(/50\.000/)).toBeInTheDocument()

  })

  it('does not show shipment fee when invoice has no shipping fee', () => {
    mockInvoices.length = 0
    mockInvoices.push({
      id: 'inv-2',
      invoiceNumber: 'INV-002',
      customerName: 'Acme Corp',
      status: 'paid',
      total: 250000,
      percentage: 50,
      dueDate: '2026-07-01',
      paymentMethodId: null,
      createdAt: new Date('2026-06-01'),
      overdue: false,
    })

    renderPage()

    expect(screen.queryByText('Shipment Fee')).not.toBeInTheDocument()

  })
})
