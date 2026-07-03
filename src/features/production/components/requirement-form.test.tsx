import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import type { Requirement } from '../model'
import { RequirementForm } from './requirement-form'

const enMessages = {
  assetUpload: {
    dropzone: {
      title: 'Drop files here',
      hint: 'Upload files',
    },
    hints: {
      acceptedFormats: 'Accepted formats up to {size}',
    },
    states: {
      uploaded: 'Uploaded',
    },
  },
  production: {
    completeRequirements: 'Complete Requirements',
    requirementRequired: 'Required',
    requirementOptional: 'Optional',
    uploadFile: 'Upload File',
  },
  common: {
    cancel: 'Cancel',
    confirm: 'Confirm',
  },
}

const requirements: Requirement[] = [
  { id: 'notes', label: 'Notes', type: 'text', required: false },
  { id: 'qty', label: 'Quantity', type: 'number', required: true },
]

const uploadRequirements: Requirement[] = [
  { id: 'file', label: 'Reference File', type: 'upload', required: true },
]

function renderForm(requirements: Requirement[], onSubmit = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={enMessages}>
        <RequirementForm
          taskId="task-1"
          requirements={requirements}
          onCancel={vi.fn()}
          onSubmit={onSubmit}
        />
      </IntlProvider>
    </QueryClientProvider>,
  )
}

describe('RequirementForm', () => {
  it('renders requirement fields', () => {
    renderForm(requirements)
    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('Quantity')).toBeInTheDocument()
  })

  it('shows required/optional labels', () => {
    renderForm(requirements)
    expect(screen.getByText(/Required/)).toBeInTheDocument()
    expect(screen.getByText(/Optional/)).toBeInTheDocument()
  })

  it('calls onSubmit with responses', async () => {
    const onSubmit = vi.fn()
    renderForm(requirements, onSubmit)
    await userEvent.type(screen.getByLabelText(/Notes/), 'Test notes')
    await userEvent.click(screen.getByText('Confirm'))
    expect(onSubmit).toHaveBeenCalledWith({
      notes: { value: 'Test notes' },
    })
  })

  it('renders file upload field for upload requirements', () => {
    renderForm(uploadRequirements)
    expect(screen.getByText('Reference File')).toBeInTheDocument()
    expect(screen.getByText('Upload files')).toBeInTheDocument()
  })
})
