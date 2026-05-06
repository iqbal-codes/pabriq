import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import type { Requirement } from '../model'
import { RequirementForm } from './requirement-form'

const enMessages = {
  production: {
    completeRequirements: 'Complete Requirements',
    requirementRequired: 'Required',
    requirementOptional: 'Optional',
    uploadFile: 'Upload File',
  },
  common: {
    cancel: 'Cancel',
    save: 'Save',
  },
}

const requirements: Requirement[] = [
  { id: 'notes', label: 'Notes', type: 'text', required: false },
  { id: 'qty', label: 'Quantity', type: 'number', required: true },
]

describe('RequirementForm', () => {
  it('renders requirement fields', () => {
    render(
      <IntlProvider locale="en" messages={enMessages}>
        <RequirementForm
          requirements={requirements}
          onCancel={vi.fn()}
          onSubmit={vi.fn()}
        />
      </IntlProvider>,
    )
    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('Quantity')).toBeInTheDocument()
  })

  it('shows required/optional labels', () => {
    render(
      <IntlProvider locale="en" messages={enMessages}>
        <RequirementForm
          requirements={requirements}
          onCancel={vi.fn()}
          onSubmit={vi.fn()}
        />
      </IntlProvider>,
    )
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByText('Optional')).toBeInTheDocument()
  })

  it('calls onSubmit with responses', async () => {
    const onSubmit = vi.fn()
    render(
      <IntlProvider locale="en" messages={enMessages}>
        <RequirementForm
          requirements={requirements}
          onCancel={vi.fn()}
          onSubmit={onSubmit}
        />
      </IntlProvider>,
    )
    await userEvent.type(screen.getByLabelText('Notes'), 'Test notes')
    await userEvent.click(screen.getByText('Save'))
    expect(onSubmit).toHaveBeenCalledWith({
      notes: { value: 'Test notes' },
    })
  })
})
