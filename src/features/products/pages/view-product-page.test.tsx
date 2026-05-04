import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type React from 'react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { ViewProductPage } from './view-product-page'

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
      pricingMode: 'interpolated',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }),
  useProductBreakpoints: () => ({
    data: [
      { minQuantity: 1, unitPrice: 50000 },
      { minQuantity: 10, unitPrice: 45000 },
    ],
  }),
}))

vi.mock('#/routes/_org/products/$id/index', () => ({
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
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return (
    <QueryClientProvider client={queryClient}>
      <IntlProvider
        locale="en"
        messages={{
          products: {
            viewProduct: 'View Product',
            editProduct: 'Edit Product',
            productInfo: 'Product Information',
            pricingAndOrders: 'Pricing & Orders',
            name: 'Product Name',
            description: 'Description',
            productionNotes: 'Production Notes',
            basePrice: 'Base Price',
            productionDays: 'Production Days',
            minQuantity: 'Min. Quantity',
            maxQuantity: 'Max. Quantity',
            active: 'Active',
            inactive: 'Inactive',
            pricing: {
              interpolate: 'Interpolate pricing',
              interpolateOn: 'Prices use linear interpolation',
              interpolateOff: 'Prices use step pricing',
              breakpoints: 'Pricing Breakpoints',
              unitPrice: 'Unit Price',
              minQuantity: 'Min. Quantity',
            },
          },
          common: {
            back: 'Back',
          },
          status: {
            active: 'Active',
            inactive: 'Inactive',
          },
        }}
      >
        <ViewProductPage />
      </IntlProvider>
    </QueryClientProvider>
  )
}

describe('ViewProductPage', () => {
  it('renders the product name', () => {
    render(<TestWrapper />)
    expect(screen.getByText('Custom T-Shirt')).toBeDefined()
  })

  it('shows edit action', () => {
    render(<TestWrapper />)
    expect(screen.getByText('Edit Product')).toBeDefined()
  })
})
