import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FormRoot, useAppForm } from '#/components/app/form'
import type { ProductRow } from '#/features/products/model'
import type { OrderFormValues } from './order-form-types'
import { OrderLineItemRow } from './order-line-item-row'

const productHooks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}))

type PriceInput = {
  productId: string
  quantity: number
  pricingMode?: 'interpolated' | 'step'
  isRepeatOrder?: boolean
  addonIds?: string[]
}

vi.mock('#/features/products/hooks', () => ({
  useCalculateProductPrice: () => ({
    mutateAsync: productHooks.mutateAsync,
    isPending: false,
  }),
  useProductAddons: () => ({
    data: [{ id: 'addon-1', name: 'Gold Foil', unitSurcharge: 5000 }],
  }),
}))

const messages = {
  orders: {
    productName: 'Product',
    designName: 'Design Name',
    designNamePlaceholder: 'Design name',
    quantity: 'Quantity',
    hargaNego: 'Negotiated Price',
    unitPrice: 'Unit Price',
    repeatOrder: 'Repeat Order',
    addons: 'Addons',
    specification: 'Specification',
    attachments: 'Attachments',
    lineSubtotal: 'Subtotal',
    minQtyError: 'Minimum quantity is {min}',
    maxQtyError: 'Maximum quantity is {max}',
  },
}

const PRICE_RECALCULATION_DEBOUNCE_MS = 300

const product: ProductRow = {
  id: 'product-1',
  name: 'Canvas Bag',
  description: null,
  active: true,
  primaryImageAssetId: null,
  basePrice: 50_000,
  productionDays: 3,
  minQuantity: 5,
  maxQuantity: null,
  negotiateAboveQuantity: 8,
  repeatOrderUnitPrice: 35_000,
  repeatOrderMinQuantity: 5,
  maxProductionQuantity: null,
  minDiscountPrice: null,
  pricingMode: 'interpolated',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

const lineItem: OrderFormValues['lineItems'][number] = {
  id: 'line-item-1',
  productId: product.id,
  quantity: '10',
  unitPrice: '50000',
  designName: '',
  notes: '',
  attachments: [],
  addonIds: [],
  isRepeatOrder: false,
  deadline: '',
  manualDeadline: false,
}

function TestOrderLineItemRow() {
  const form = useAppForm({
    defaultValues: {
      customerId: '',
      notes: '',
      address: {
        areaId: '',
        areaName: '',
        streetAddress: '',
      },
      deadline: '',
      manualDeadline: false,
      lineItems: [lineItem],
    },
    onSubmit: vi.fn(),
  })

  return (
    <FormRoot form={form}>
      <form.Subscribe selector={(state) => state.values.lineItems[0]}>
        {(item) => (
          <OrderLineItemRow
            form={form}
            index={0}
            item={item}
            products={[product]}
          />
        )}
      </form.Subscribe>
    </FormRoot>
  )
}

function renderLineItemRow() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="id" messages={messages}>
        <TestOrderLineItemRow />
      </IntlProvider>
    </QueryClientProvider>,
  )
}

describe('OrderLineItemRow', () => {
  beforeEach(() => {
    productHooks.mutateAsync.mockReset()
    productHooks.mutateAsync.mockImplementation(async (input: PriceInput) => {
      const unitPrice = input.isRepeatOrder
        ? (product.repeatOrderUnitPrice ?? product.basePrice)
        : product.basePrice

      return {
        ok: true,
        unitPrice,
        total: unitPrice * input.quantity,
      }
    })
  })

  async function waitForInitialPriceCalculation(): Promise<void> {
    await waitFor(() => {
      expect(productHooks.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: product.id,
          quantity: 10,
          isRepeatOrder: false,
        }),
      )
    })
    productHooks.mutateAsync.mockClear()
  }

  async function wait(ms: number): Promise<void> {
    await new Promise((resolve) => window.setTimeout(resolve, ms))
  }

  it('debounces rapid price recalculation changes', async () => {
    renderLineItemRow()
    await waitForInitialPriceCalculation()

    const quantityInput = screen.getByLabelText('Quantity', { exact: false })
    fireEvent.change(quantityInput, { target: { value: '' } })
    fireEvent.change(quantityInput, { target: { value: '1' } })
    fireEvent.change(quantityInput, { target: { value: '12' } })
    await wait(PRICE_RECALCULATION_DEBOUNCE_MS - 50)
    expect(productHooks.mutateAsync).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(productHooks.mutateAsync).toHaveBeenCalledTimes(1)
      expect(productHooks.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: product.id,
          quantity: 12,
          isRepeatOrder: false,
        }),
      )
    })
  })

  it('recalculates from form state when quantity changes', async () => {
    const user = userEvent.setup()

    renderLineItemRow()
    await waitForInitialPriceCalculation()

    const quantityInput = screen.getByLabelText('Quantity', { exact: false })
    await user.clear(quantityInput)
    await user.type(quantityInput, '12')

    await waitFor(() => {
      expect(productHooks.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: product.id,
          quantity: 12,
          isRepeatOrder: false,
        }),
      )
    })
  })

  it('recalculates from form state when repeat order changes', async () => {
    const user = userEvent.setup()

    renderLineItemRow()
    await waitForInitialPriceCalculation()

    expect(screen.getByText('Negotiated Price')).toBeInTheDocument()

    await user.click(screen.getByRole('switch'))

    await waitFor(() => {
      expect(productHooks.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: product.id,
          quantity: 10,
          isRepeatOrder: true,
        }),
      )
    })
    await waitFor(() => {
      expect(screen.queryByText('Negotiated Price')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Unit Price')).toBeInTheDocument()
  })

  it('recalculates from form state when addons change', async () => {
    const user = userEvent.setup()

    renderLineItemRow()
    await waitForInitialPriceCalculation()

    await user.click(screen.getByLabelText(/Gold Foil/))

    await waitFor(() => {
      expect(productHooks.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: product.id,
          quantity: 10,
          isRepeatOrder: false,
          addonIds: ['addon-1'],
        }),
      )
    })
  })
})
