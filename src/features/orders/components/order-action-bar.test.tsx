import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '#/components/ui/tooltip'
import { OrderActionBar } from './order-action-bar'

const messages = {
  orders: {
    copyPortalLink: 'Copy Portal Link',
    generateLink: 'Generate Portal Link',
    downloadQuotation: 'Download Quotation',
    approve: 'Approve',
    reject: 'Reject',
    completeOrder: 'Complete Order',
  },
  production: {
    markAsShipped: 'Mark as Shipped',
  },
}

const pendingOrder = {
  id: 'order-1',
  orderToken: 'token-1',
  status: 'pending',
}

function renderActionBar() {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <TooltipProvider>
        <OrderActionBar
          order={pendingOrder}
          onCopyPortalLink={vi.fn()}
          isGeneratingLink={false}
          onApprove={vi.fn()}
          isApproving={false}
          onReject={vi.fn()}
          isRejecting={false}
          onCompleteProduction={vi.fn()}
          onCompleteOrder={vi.fn()}
          isCompletingOrder={false}
          canCompleteProduction={false}
          canCompleteOrder={false}
        />
      </TooltipProvider>
    </IntlProvider>,
  )
}

describe('OrderActionBar', () => {
  it('Reject button uses destructive variant', () => {
    renderActionBar()
    const rejectButton = screen.getByRole('button', { name: 'Reject' })
    expect(rejectButton).toBeInTheDocument()
    expect(rejectButton.className).toContain('bg-destructive')
  })

  it('Copy Portal Link button uses sm size', () => {
    renderActionBar()
    const portalButton = screen.getByRole('button', {
      name: 'Copy Portal Link',
    })
    expect(portalButton).toBeInTheDocument()
    expect(portalButton.className).toContain('h-8')
  })

  it('Download Quotation link uses icon-sm size and has accessible name', () => {
    renderActionBar()
    const quotationLink = screen.getByRole('link', {
      name: 'Download Quotation',
    })
    expect(quotationLink).toBeInTheDocument()
    expect(quotationLink.className).toContain('size-8')
  })
})
