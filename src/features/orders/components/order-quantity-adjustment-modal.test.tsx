import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { OrderQuantityAdjustmentModal } from './order-quantity-adjustment-modal'

const mutateAsync = vi.fn().mockResolvedValue({ ok: true })

vi.mock('#/features/orders/hooks', () => ({
  useAdjustOrderQuantity: () => ({
    mutateAsync,
    isPending: false,
  }),
}))

const messages = {
  orders: {
    adjustQuantity: 'Adjust Quantity',
    adjustQuantityDescription:
      'Adjust the quantity for a line item in this order.',
    selectLineItem: 'Select Line Item',
    currentQuantity: 'Current Quantity',
    newQuantity: 'New Quantity',
    adjustmentReason: 'Reason for Adjustment',
    adjustmentReasonPlaceholder: 'Enter reason...',
    quantityAdjusted: 'Quantity adjusted successfully',
  },
}

const defaultLineItems = [
  {
    id: 'li-1',
    productId: 'prod-1',
    productName: 'Custom T-Shirt',
    designName: 'Logo V2',
    quantity: 100,
    unitPrice: 15,
    total: 1500,
    isRepeatOrder: false,
  },
]

const defaultProducts = [
  {
    id: 'prod-1',
    name: 'Custom T-Shirt',
    description: null,
    active: true,
    primaryImageAssetId: null,
    basePrice: 20,
    productionDays: 3,
    minQuantity: 1,
    maxQuantity: 500,
    negotiateAboveQuantity: null,
    repeatOrderUnitPrice: null,
    repeatOrderMinQuantity: null,
    maxProductionQuantity: null,
    minDiscountPrice: null,
    pricingMode: 'step' as const,
    createdAt: new Date(),
  },
]

function renderModal(lineItems = defaultLineItems, products = defaultProducts) {
  const onOpenChange = vi.fn()
  const onSuccess = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const result = render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={messages}>
        <OrderQuantityAdjustmentModal
          open
          onOpenChange={onOpenChange}
          orderId="order-1"
          lineItems={lineItems}
          products={products}
          onSuccess={onSuccess}
        />
      </IntlProvider>
    </QueryClientProvider>,
  )
  return { ...result, onOpenChange, onSuccess }
}

describe('OrderQuantityAdjustmentModal', () => {
  it('renders dialog with form fields and current quantity', () => {
    renderModal()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('New Quantity')).toBeInTheDocument()
    expect(screen.getByLabelText('Reason for Adjustment')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Adjust Quantity' }),
    ).toBeInTheDocument()
  })

  it('submits adjusted quantity with correct payload', async () => {
    const user = userEvent.setup()
    const { onSuccess, onOpenChange } = renderModal()

    // NumberField renders as text input with inputMode=numeric
    const quantityInput = screen.getByLabelText('New Quantity')
    await user.clear(quantityInput)
    await user.type(quantityInput, '50')

    // Enter reason
    const reasonInput = screen.getByLabelText('Reason for Adjustment')
    await user.type(reasonInput, 'Customer requested reduction')

    // Submit
    const submitButton = screen.getByRole('button', { name: 'Adjust Quantity' })
    await user.click(submitButton)

    expect(mutateAsync).toHaveBeenCalledWith({
      orderId: 'order-1',
      lineItemId: 'li-1',
      quantity: 50,
      reason: 'Customer requested reduction',
    })

    expect(onSuccess).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
