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
      basePrice: 50000,
      productionDays: 3,
      minQuantity: 1,
      maxQuantity: 100,
      active: true,
      orgId: 'org-1',
      primaryImageAssetId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }),
  useUpdateProduct: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
  }),
}))

vi.mock('#/routes/_org/products/$id/edit', () => ({
  Route: {
    useParams: () => ({ id: 'product-1' }),
  },
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
          editTitle: 'Edit Product',
          updateProduct: 'Update Product',
          productInfo: 'Product Information',
          productionNotes: 'Production Notes',
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
