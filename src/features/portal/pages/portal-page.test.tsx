import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import type { PortalOrder } from '../model'
import { PortalPage } from './portal-page'

vi.mock('../hooks', () => ({
  usePortalOrder: vi.fn(),
}))

vi.mock('./pending-view', () => ({
  PendingView: () => <div data-testid="pending-view">PendingView</div>,
}))

vi.mock('./draft-view', () => ({
  DraftView: () => <div data-testid="draft-view">DraftView</div>,
}))

vi.mock('./rejected-view', () => ({
  RejectedView: () => <div data-testid="rejected-view">RejectedView</div>,
}))

vi.mock('./progress-view', () => ({
  ProgressView: () => <div data-testid="progress-view">ProgressView</div>,
}))

const messages = {
  portal: {
    loadingOrder: 'Loading order...',
    loadFailed: 'Could not load order',
    loadFailedDesc:
      'Refresh this page or contact the seller if the problem continues.',
    notFound: 'Order not found',
    notFoundHelp: 'Check the link or ask the seller for a new portal link.',
    retry: 'Retry',
  },
}

function renderPage() {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <PortalPage token="test-token" />
    </IntlProvider>,
  )
}

function makeOrder(overrides: Partial<PortalOrder> = {}): PortalOrder {
  return {
    id: 'ord-1',
    orgId: 'org-1',
    orgName: 'Test Org',
    orgLogoAssetId: null,
    orgPhone: null,
    status: 'pending',
    orderNumber: 'ORD-1',
    total: 0,
    shippingAddress: null,
    customerId: null,
    customerName: null,
    customerPhone: null,
    customerIsWni: null,
    customerPhotoAssetId: null,
    lineItems: [],
    invoices: [],
    createdAt: new Date(),
    ...overrides,
  }
}

describe('PortalPage', () => {
  it('renders loading state', async () => {
    const { usePortalOrder } = await import('../hooks')
    vi.mocked(usePortalOrder).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    } as never)

    renderPage()
    expect(screen.getByText('Loading order...')).toBeInTheDocument()
  })

  it('renders error state with retry button', async () => {
    const { usePortalOrder } = await import('../hooks')
    vi.mocked(usePortalOrder).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    } as never)

    renderPage()
    expect(screen.getByText('Could not load order')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Refresh this page or contact the seller if the problem continues.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('renders not-found state', async () => {
    const { usePortalOrder } = await import('../hooks')
    vi.mocked(usePortalOrder).mockReturnValue({
      data: { ok: false },
      isPending: false,
      isError: false,
    } as never)

    renderPage()
    expect(screen.getByText('Order not found')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Check the link or ask the seller for a new portal link.',
      ),
    ).toBeInTheDocument()
  })

  it('renders null data as error state', async () => {
    const { usePortalOrder } = await import('../hooks')
    vi.mocked(usePortalOrder).mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
    } as never)

    renderPage()
    expect(screen.getByText('Could not load order')).toBeInTheDocument()
  })

  it('routes pending status to PendingView', async () => {
    const { usePortalOrder } = await import('../hooks')
    vi.mocked(usePortalOrder).mockReturnValue({
      data: { ok: true, order: makeOrder({ status: 'pending' }) },
      isPending: false,
      isError: false,
    } as never)

    renderPage()
    expect(screen.getByTestId('pending-view')).toBeInTheDocument()
  })

  it('routes draft status to DraftView', async () => {
    const { usePortalOrder } = await import('../hooks')
    vi.mocked(usePortalOrder).mockReturnValue({
      data: { ok: true, order: makeOrder({ status: 'draft' }) },
      isPending: false,
      isError: false,
    } as never)

    renderPage()
    expect(screen.getByTestId('draft-view')).toBeInTheDocument()
  })

  it('routes rejected status to RejectedView', async () => {
    const { usePortalOrder } = await import('../hooks')
    vi.mocked(usePortalOrder).mockReturnValue({
      data: { ok: true, order: makeOrder({ status: 'rejected' }) },
      isPending: false,
      isError: false,
    } as never)

    renderPage()
    expect(screen.getByTestId('rejected-view')).toBeInTheDocument()
  })

  it('routes in_progress status to ProgressView', async () => {
    const { usePortalOrder } = await import('../hooks')
    vi.mocked(usePortalOrder).mockReturnValue({
      data: { ok: true, order: makeOrder({ status: 'in_progress' }) },
      isPending: false,
      isError: false,
    } as never)

    renderPage()
    expect(screen.getByTestId('progress-view')).toBeInTheDocument()
  })

  it('routes completed status to ProgressView', async () => {
    const { usePortalOrder } = await import('../hooks')
    vi.mocked(usePortalOrder).mockReturnValue({
      data: { ok: true, order: makeOrder({ status: 'completed' }) },
      isPending: false,
      isError: false,
    } as never)

    renderPage()
    expect(screen.getByTestId('progress-view')).toBeInTheDocument()
  })
})
