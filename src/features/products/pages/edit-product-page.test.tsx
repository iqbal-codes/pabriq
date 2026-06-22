import { render, screen } from '@testing-library/react'
import type React from 'react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { EditProductPage } from './edit-product-page'

vi.mock('#/features/products/hooks', () => ({
  useProduct: () => ({
    data: {
      id: 'product-1',
      name: 'Custom T-Shirt',
      description: 'A nice shirt',
      productionNotes: 'Handle with care',
      priority: true,
      basePrice: 50000,
      productionDays: 3,
      minQuantity: 1,
      maxQuantity: 100,
      active: true,
      orgId: 'org-1',
      primaryImageAssetId: null,
      pricingMode: 'interpolated',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }),
  useProductBreakpoints: () => ({
    data: [] as Array<{ minQuantity: number; unitPrice: number }>,
  }),
  useUpdateProduct: () => ({
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
  useParams: () => ({ id: 'product-1' }),
}))

function TestWrapper() {
  return (
    <IntlProvider
      locale="en"
      messages={{
        products: {
          editTitle: 'Edit Product',
          updateProduct: 'Update Product',
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
      <EditProductPage />
    </IntlProvider>
  )
}

describe('EditProductPage', () => {
  it('renders the page title', () => {
    render(<TestWrapper />)
    expect(screen.getByText('Edit Product')).toBeDefined()
  })
})
