import { render, screen } from '@testing-library/react'
import type React from 'react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { CreateProductPage } from './create-product-page'

vi.mock('#/features/products/hooks', () => ({
  useCreateProduct: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
  }),
}))

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
  useNavigate: () => vi.fn(),
}))

function TestWrapper() {
  return (
    <IntlProvider
      locale="en"
      messages={{
        products: {
          createTitle: 'New Product',
          createProduct: 'Create Product',
          productInfo: 'Product Information',
          productionNotes: 'Production Notes',
          priority: 'Priority product',
          priorityDescription:
            'Tasks spawned from this product will be marked priority.',
          pricingAndOrders: 'Pricing & Orders',
          name: 'Product Name',
          namePlaceholder: 'e.g. Custom T-Shirt',
          description: 'Description',
          descriptionPlaceholder: 'Describe the product',
          productionNotesPlaceholder: 'Special instructions',
          basePrice: 'Base Price',
          productionDays: 'Production Days',
          minQuantity: 'Min. Quantity',
          maxQuantity: 'Max. Quantity',
          photo: 'Primary Photo',
          pricing: {
            breakpoints: 'Pricing Breakpoints',
            addBreakpoint: 'Add Breakpoint',
            noBreakpoints: 'No pricing breakpoints configured',
            unitPrice: 'Unit Price',
            minQuantity: 'Min. Quantity',
            interpolate: 'Interpolate pricing',
            interpolateOn: 'Prices use linear interpolation',
            interpolateOff: 'Prices use step pricing',
          },
        },
        common: {
          back: 'Back',
        },
      }}
    >
      <CreateProductPage />
    </IntlProvider>
  )
}

describe('CreateProductPage', () => {
  it('renders the page title', () => {
    render(<TestWrapper />)
    expect(screen.getByText('New Product')).toBeDefined()
  })
})
