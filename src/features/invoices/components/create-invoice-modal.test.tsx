import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
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

vi.mock('#/features/settings/hooks', () => ({
  useOrgSettings: () => ({
    data: {
      address: {
        areaId: 'area-origin',
        areaName: 'Jakarta',
        streetAddress: 'Jl. Test',
      },
    },
  }),
}))

vi.mock('#/features/address/hooks', () => ({
  useCalculateShippingRates: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
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
    remaining: 'Remaining',
    customAmount: 'Custom',
    stepHint: '({percentage}% steps)',
    decreasePercentage: 'Decrease percentage',
    increasePercentage: 'Increase percentage',
    alreadyInvoiced: 'Already invoiced: {percentage}% ({amount})',
    paymentMethod: 'Payment Method',
    notes: 'Notes',
    failed: 'Failed',
    shipmentMethod: 'Shipment Method',
    shipmentMethodBiteship: 'Calculate with Biteship',
    shipmentMethodManual: 'Manual / Outside Biteship',
    shipmentMethodPickup: 'Customer Pickup / No Shipping',
    packageWeightKg: 'Package Weight (kg)',
    calculateShipmentFee: 'Calculate Shipping Fee',
    shipmentRate: 'Shipment Rate',
    selectShipmentRateRequired: 'Select a rate',
    noShipmentRatesFound: 'No rates found',
    biteshipApiKeyMissing: 'API key missing',
    biteshipRateCalculationFailed: 'Calculation failed',
    shippingAreaRequired: 'Area required',
    packageWeightRequired: 'Weight required',
    customerPickupNoShipping: 'No shipping',
  },
  production: {
    courier: 'Courier',
    courierPlaceholder: 'Courier Placeholder',
    shipmentFee: 'Shipment Fee',
    shippingFeeDescription: 'Description',
    shippingFeeDescriptionPlaceholder: 'e.g. Shipping Fee',
  },
  address: {
    orgAddressRequired: 'Org address required',
    areaNotSupported: 'Area not supported',
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

const dpOrder = {
  ...defaultOrder,
  invoicedPercentage: 0,
  invoicedAmount: 0,
  remainingPercentage: 100,
  remainingAmount: 500000,
}

function renderModal(order = defaultOrder) {
  const onOpenChange = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const result = render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={messages}>
        <CreateInvoiceModal open onOpenChange={onOpenChange} order={order} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  return { ...result, onOpenChange }
}

describe('CreateInvoiceModal', () => {
  it('renders translated order label, total, remaining, payment method, and shipment method in Pelunasan mode', () => {
    renderModal()

    expect(screen.getByText('Order #ORD-001')).toBeInTheDocument()
    expect(screen.queryByText('Invoice amount')).not.toBeInTheDocument()
    expect(screen.getByText('Remaining (50%)')).toBeInTheDocument()
    expect(screen.queryByText('Custom')).not.toBeInTheDocument()
    expect(screen.getAllByText('Payment Method').length).toBeGreaterThanOrEqual(
      1,
    )
    expect(screen.getByText(/Already invoiced: 50%/)).toBeInTheDocument()
    expect(screen.getAllByText(/250\.000/).length).toBeGreaterThanOrEqual(1)

    // Shipment method selector should be visible in Pelunasan mode
    expect(screen.getByText('Shipment Method')).toBeInTheDocument()
    expect(screen.getByText('Manual / Outside Biteship')).toBeInTheDocument()
    expect(
      screen.getByText('Customer Pickup / No Shipping'),
    ).toBeInTheDocument()
  })

  it('renders manual amount input and quick amount buttons in DP mode', () => {
    renderModal(dpOrder)

    expect(screen.getByText('Order #ORD-001')).toBeInTheDocument()
    expect(screen.getByLabelText('Invoice amount')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '30%' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '50%' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '100%' })).toBeInTheDocument()
    expect(screen.queryByText('Shipment Method')).not.toBeInTheDocument()
  })

  it('updates the DP invoice total from quick buttons and manual amount input', async () => {
    const user = userEvent.setup()
    renderModal(dpOrder)

    await user.click(screen.getByRole('button', { name: '30%' }))

    let submitButton = screen.getByRole('button', {
      name: /Create Invoice/,
    })
    expect(submitButton.textContent).toMatch(/150\.000/)

    const amountInput = screen.getByLabelText('Invoice amount')
    await user.clear(amountInput)
    await user.type(amountInput, '275000')

    submitButton = screen.getByRole('button', {
      name: /Create Invoice/,
    })
    expect(submitButton.textContent).toMatch(/275\.000/)
  })

  it('keeps settlement invoices on the remaining percentage', async () => {
    const user = userEvent.setup()
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue({ ok: true })
    renderModal(defaultOrder)

    const selects = document.querySelectorAll('select')
    if (selects.length > 0) {
      await user.selectOptions(selects[0], 'pm-1')
    }

    await user.click(screen.getByRole('button', { name: /Create Invoice/ }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          percentage: 50,
        }),
      )
    })
  })
})
