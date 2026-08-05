import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { useAppForm } from '#/components/app/form'
import type { ProductTemplate } from '#/features/product-templates/model'
import { ProductFormFields } from './product-form-fields'

if (!HTMLElement.prototype.setPointerCapture) {
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    value: () => {},
    writable: true,
  })
}
if (!HTMLElement.prototype.releasePointerCapture) {
  Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
    value: () => {},
    writable: true,
  })
}
if (!HTMLElement.prototype.hasPointerCapture) {
  Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
    value: () => false,
    writable: true,
  })
}

const template: ProductTemplate = {
  id: 'template-1',
  orgId: 'org-1',
  businessTemplateId: null,
  businessTemplateItemKey: null,
  name: 'Custom Apparel',
  description: null,
  category: null,
  status: 'active',
  configuration: {
    itemizationMode: 'uniform',
    fields: [],
    pricing: {
      basePrice: 25000,
      productionDays: 3,
      minQuantity: 5,
      pricingMode: 'step',
    },
    production: { notes: null },
    workflowStages: [],
    bom: [],
  },
  createdAt: new Date(),
  updatedAt: new Date(),
}

function TestWrapper({
  onTemplateChange,
  templates = [],
}: {
  onTemplateChange?: (templateId: string) => void
  templates?: ProductTemplate[]
}) {
  const form = useAppForm({
    defaultValues: {
      productTemplateId: '',
      name: '',
      description: '',
      priority: false,
      primaryImageAssetId: null as string | null,
      basePrice: undefined as number | undefined,
      productionDays: 1,
      minQuantity: 1,
      maxQuantity: undefined as number | undefined,
      negotiateAboveQuantity: undefined as number | undefined,
      repeatOrderUnitPrice: undefined as number | undefined,
      repeatOrderMinQuantity: undefined as number | undefined,
      maxProductionQuantity: undefined as number | undefined,
      pricingMode: 'interpolated' as 'interpolated' | 'step',
      pricingBreakpoints: [] as Array<{
        minQuantity: number
        unitPrice: number | undefined
      }>,
      productAddons: [] as Array<{
        name: string
        unitSurcharge: number | undefined
      }>,
    },
  })

  return (
    <IntlProvider
      locale="en"
      messages={{
        products: {
          template: 'Product Template',
          templatePlaceholder: 'Select a template',
          templateSourceDescription: 'Copied from source template',
          productInfo: 'Product Information',
          name: 'Product Name',
          namePlaceholder: 'e.g. Custom T-Shirt',
          description: 'Description',
          descriptionPlaceholder: 'Describe the product',
          priority: 'Priority product',
          priorityDescription: 'Priority description',
          basePrice: 'Base Price',
          productionDays: 'Production Days',
          minQuantity: 'Min. Quantity',
          maxQuantity: 'Max. Quantity',
          photo: 'Primary Photo',
          pricingAndOrders: 'Pricing & Orders',
          advancedSettings: 'Advanced Pricing & Configurations',
          advancedSettingsDescription: 'Advanced settings description',
          repeatOrderUnitPrice: 'Repeat Order Unit Price',
          repeatOrderUnitPriceDescription: 'Repeat price description',
          repeatOrderMinQuantity: 'Repeat Order Min Quantity',
          repeatOrderMinQuantityDescription: 'Repeat quantity description',
          negotiateAboveQuantity: 'Negotiate Above Quantity',
          negotiateAboveQuantityDescription: 'Negotiate quantity description',
          maxProductionQuantity: 'Max Production Quantity',
          maxProductionQuantityDescription: 'Max production description',
          pricing: {
            title: 'Pricing',
            breakpoints: 'Pricing Breakpoints',
            addBreakpoint: 'Add Breakpoint',
            noBreakpoints: 'No pricing breakpoints configured',
            unitPrice: 'Unit Price',
            minQuantity: 'Min. Quantity',
            interpolate: 'Interpolate pricing',
            interpolateOn: 'Prices use linear interpolation',
            interpolateOff: 'Prices use step pricing',
          },
          addons: {
            title: 'Addons',
            addAddon: 'Add Addon',
            noAddons: 'No addons configured',
            name: 'Addon Name',
            unitSurcharge: 'Unit Surcharge',
          },
        },
      }}
    >
      <ProductFormFields
        form={form}
        templates={templates}
        isTemplatesLoading={false}
        isEdit={false}
        onTemplateChange={onTemplateChange}
      />
    </IntlProvider>
  )
}

describe('ProductFormFields', () => {
  it('renders all section titles and field labels', () => {
    render(<TestWrapper />)
    expect(screen.getByText('Product Information')).toBeDefined()
    expect(screen.getByText('Pricing & Orders')).toBeDefined()
    expect(screen.getByText('Product Name')).toBeDefined()
    expect(screen.getByText('Base Price')).toBeDefined()
  })

  it('reports the selected template for default hydration', async () => {
    const user = userEvent.setup()
    const onTemplateChange = vi.fn()
    render(
      <TestWrapper
        templates={[template]}
        onTemplateChange={onTemplateChange}
      />,
    )

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onTemplateChange).toHaveBeenCalledWith('template-1')
  })
})
