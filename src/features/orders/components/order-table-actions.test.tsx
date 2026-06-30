import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type React from 'react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '#/components/ui/tooltip'
import type { OrderRow } from '#/features/orders/model'
import { OrderRowActions } from './order-table-actions'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...props
  }: {
    to?: string
    children?: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

const mockCopyPortalLink = vi.fn()

vi.mock('./use-copy-order-portal-link', () => ({
  useCopyOrderPortalLink: () => ({
    copyPortalLink: mockCopyPortalLink,
    isGeneratingLink: false,
  }),
}))

const messages = {
  orders: {
    viewOrder: 'View Order',
    editOrder: 'Edit Order',
    copyPortalLink: 'Copy Portal Link',
    openPortalLink: 'Open Portal Link',
  },
}

const draftRowWithToken: OrderRow = {
  id: 'order-1',
  customerName: 'Acme Corp',
  status: 'draft',
  total: 500000,
  orderNumber: 'ORD-001',
  orderToken: 'token-1',
  createdAt: new Date('2024-01-15'),
  paymentStatus: 'unpaid',
  dueDate: null,
  maxDeadline: null,
}

const draftRowWithoutToken: OrderRow = {
  ...draftRowWithToken,
  orderToken: null,
}

const pendingRowWithToken: OrderRow = {
  ...draftRowWithToken,
  status: 'pending',
}

function renderActions(row: OrderRow) {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <TooltipProvider>
        <OrderRowActions row={row} />
      </TooltipProvider>
    </IntlProvider>,
  )
}

describe('OrderRowActions', () => {
  it('view link has accessible name View Order', () => {
    renderActions(draftRowWithToken)
    expect(screen.getByRole('link', { name: 'View Order' })).toBeInTheDocument()
  })

  it('edit link has accessible name Edit Order when status is draft', () => {
    renderActions(draftRowWithToken)
    expect(screen.getByRole('link', { name: 'Edit Order' })).toBeInTheDocument()
  })

  it('edit link is absent when status is not draft', () => {
    renderActions(pendingRowWithToken)
    expect(
      screen.queryByRole('link', { name: 'Edit Order' }),
    ).not.toBeInTheDocument()
  })

  it('copy button has accessible name Copy Portal Link', () => {
    renderActions(draftRowWithToken)
    expect(
      screen.getByRole('button', { name: 'Copy Portal Link' }),
    ).toBeInTheDocument()
  })

  it('open portal link has accessible name when orderToken exists', () => {
    renderActions(draftRowWithToken)
    expect(
      screen.getByRole('link', { name: 'Open Portal Link' }),
    ).toBeInTheDocument()
  })

  it('open portal link is absent when orderToken is null', () => {
    renderActions(draftRowWithoutToken)
    expect(
      screen.queryByRole('link', { name: 'Open Portal Link' }),
    ).not.toBeInTheDocument()
  })

  it('clicking copy calls copyPortalLink with row id and orderToken', async () => {
    const user = userEvent.setup()
    renderActions(draftRowWithToken)
    await user.click(screen.getByRole('button', { name: 'Copy Portal Link' }))
    expect(mockCopyPortalLink).toHaveBeenCalledWith({
      id: 'order-1',
      orderToken: 'token-1',
    })
  })
})
