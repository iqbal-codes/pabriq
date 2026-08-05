import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import { useAppForm } from '#/components/app/form'
import type { ProductTemplateConfiguration } from '../config'
import {
  createDefaultProductTemplateFormValues,
  ProductTemplateFormFields,
} from './product-template-form-fields'

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

const messages = {
  productTemplates: {
    title: 'Product Templates',
    name: 'Template Name',
    namePlaceholder: 'e.g. Custom T-Shirt',
    description: 'Description',
    descriptionPlaceholder: 'Describe the template',
    category: 'Category',
    categoryPlaceholder: 'e.g. Apparel',
    configurationSummary: 'Configure the reusable template details.',
    itemizationMode: 'Itemization Mode',
    itemizationUniform: 'Uniform',
    itemizationMatrix: 'Matrix',
    itemizationPerItem: 'Per Item',
    basePrice: 'Base Price',
    productionDays: 'Production Days',
    minQuantity: 'Min. Quantity',
    productionNotes: 'Production Notes',
    fields: {
      title: 'Custom Fields',
      add: 'Add Field',
      empty: 'No fields configured',
      key: 'Field Key',
      label: 'Field Label',
      type: 'Field Type',
      required: 'Required',
    },
    stages: {
      title: 'Workflow Stages',
      add: 'Add Stage',
      empty: 'No workflow stages configured',
      key: 'Stage Key',
      label: 'Stage Label',
      board: 'Board',
    },
    bom: {
      title: 'BOM Items',
      add: 'Add Item',
      empty: 'No BOM items configured',
      materialId: 'Material ID',
      basis: 'Basis',
      quantity: 'Quantity',
      unit: 'Unit',
      wastePercent: 'Waste %',
      critical: 'Critical',
    },
  },
}

// Captured reactively during render so tests can assert on the live
// configuration arrays after user interactions — the observable authoring
// contract. `form.Subscribe` re-renders on every state change.
let capturedConfiguration: ProductTemplateConfiguration | undefined

function TestWrapper() {
  const form = useAppForm({
    defaultValues: createDefaultProductTemplateFormValues(),
  })

  return (
    <IntlProvider locale="en" messages={messages}>
      <form.Subscribe selector={(state) => state.values.configuration}>
        {(configuration) => {
          capturedConfiguration = configuration
          return <ProductTemplateFormFields form={form} />
        }}
      </form.Subscribe>
    </IntlProvider>
  )
}

function configuration() {
  if (!capturedConfiguration) throw new Error('form was not rendered')
  return capturedConfiguration
}

describe('ProductTemplateFormFields', () => {
  it('renders the base configuration fields', () => {
    render(<TestWrapper />)

    expect(screen.getByText('Template Name')).toBeDefined()
    expect(screen.getByText('Itemization Mode')).toBeDefined()
    expect(screen.getByText('Base Price')).toBeDefined()
    expect(screen.getByText('Production Notes')).toBeDefined()
  })

  it('shows empty states for fields, workflow stages, and BOM until added', () => {
    render(<TestWrapper />)

    expect(screen.getByText('No fields configured')).toBeDefined()
    expect(screen.getByText('No workflow stages configured')).toBeDefined()
    expect(screen.getByText('No BOM items configured')).toBeDefined()
  })

  it('adds a field and records its key in the configuration array', async () => {
    const user = userEvent.setup()
    render(<TestWrapper />)

    await user.click(screen.getByRole('button', { name: 'Add Field' }))
    await user.type(screen.getByLabelText('Field Key'), 'size')

    expect(configuration().fields).toHaveLength(1)
    expect(configuration().fields[0]).toMatchObject({ key: 'size' })
  })

  it('adds a workflow stage and records its key in the configuration array', async () => {
    const user = userEvent.setup()
    render(<TestWrapper />)

    await user.click(screen.getByRole('button', { name: 'Add Stage' }))
    await user.type(screen.getByLabelText('Stage Key'), 'cutting')

    expect(configuration().workflowStages).toHaveLength(1)
    expect(configuration().workflowStages[0]).toMatchObject({ key: 'cutting' })
  })

  it('adds a BOM item and records its material id in the configuration array', async () => {
    const user = userEvent.setup()
    render(<TestWrapper />)

    await user.click(screen.getByRole('button', { name: 'Add Item' }))
    await user.type(screen.getByLabelText('Material ID'), 'cotton')

    expect(configuration().bom).toHaveLength(1)
    expect(configuration().bom[0]).toMatchObject({ materialId: 'cotton' })
  })

  it('renders the editable row controls for each added field, stage, and BOM item', async () => {
    const user = userEvent.setup()
    render(<TestWrapper />)

    await user.click(screen.getByRole('button', { name: 'Add Field' }))
    await user.click(screen.getByRole('button', { name: 'Add Stage' }))
    await user.click(screen.getByRole('button', { name: 'Add Item' }))

    expect(screen.getByLabelText('Field Key')).toBeDefined()
    expect(screen.getByLabelText('Field Label')).toBeDefined()
    expect(screen.getByLabelText('Field Type')).toBeDefined()
    expect(screen.getByLabelText('Required')).toBeDefined()

    expect(screen.getByLabelText('Stage Key')).toBeDefined()
    expect(screen.getByLabelText('Stage Label')).toBeDefined()
    expect(screen.getByLabelText('Board')).toBeDefined()

    expect(screen.getByLabelText('Material ID')).toBeDefined()
    expect(screen.getByLabelText('Basis')).toBeDefined()
    expect(screen.getByLabelText('Quantity')).toBeDefined()
    expect(screen.getByLabelText('Unit')).toBeDefined()
    expect(screen.getByLabelText('Waste %')).toBeDefined()
    expect(screen.getByLabelText('Critical')).toBeDefined()
  })
})
