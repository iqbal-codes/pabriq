import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import { useAppForm } from '#/components/app/form'
import { ProductFormFields } from './product-form-fields'

function TestWrapper() {
  const form = useAppForm({
    defaultValues: {
      name: '',
      description: '',
      productionNotes: '',
      priority: false,
      primaryImageAssetId: null as string | null,
      basePrice: 0,
      productionDays: 1,
      minQuantity: 1,
      maxQuantity: undefined as number | undefined,
      pricingMode: 'interpolated' as 'interpolated' | 'step',
      pricingBreakpoints: [] as Array<{
        minQuantity: number
        unitPrice: number
      }>,
    },
  })

  return (
    <IntlProvider
      locale="en"
      messages={{
        products: {
          productInfo: 'Product Information',
          name: 'Product Name',
          namePlaceholder: 'e.g. Custom T-Shirt',
          description: 'Description',
          descriptionPlaceholder: 'Describe the product',
          productionNotes: 'Production Notes',
          productionNotesPlaceholder: 'Special instructions',
          priority: 'Priority product',
          priorityDescription:
            'Tasks spawned from this product will be marked priority.',
          basePrice: 'Base Price',
          productionDays: 'Production Days',
          minQuantity: 'Min. Quantity',
          maxQuantity: 'Max. Quantity',
          photo: 'Primary Photo',
          pricingAndOrders: 'Pricing & Orders',
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
      }}
    >
      <ProductFormFields form={form} />
    </IntlProvider>
  )
}

describe('ProductFormFields', () => {
  it('renders all section titles', () => {
    render(<TestWrapper />)
    expect(screen.getByText('Product Information')).toBeDefined()
    expect(screen.getByText('Pricing & Orders')).toBeDefined()
  })

  it('renders all field labels', () => {
    render(<TestWrapper />)
    expect(screen.getByText('Product Name')).toBeDefined()
    expect(screen.getByText('Description')).toBeDefined()
    expect(screen.getByText('Base Price')).toBeDefined()
    expect(screen.getByText('Production Days')).toBeDefined()
    expect(screen.getByText('Priority product')).toBeDefined()
    expect(screen.getByText('Min. Quantity')).toBeDefined()
    expect(screen.getByText('Max. Quantity')).toBeDefined()
  })
})
