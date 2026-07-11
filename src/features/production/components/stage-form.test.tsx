import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import type { Stage } from '../model'
import { StageForm } from './stage-form'

const enMessages = {
  production: {
    addStage: 'Add Stage',
    editStage: 'Edit Stage',
    stageName: 'Stage Name',
    stageDescription: 'Description',
    stageDescriptionPlaceholder: 'Enter description...',
    board: 'Board',
    boardPreProduction: 'Pre-Production',
    boardProduction: 'Production',
    needApproval: 'Needs Approval',
    needApprovalHint: 'Requires admin approval to advance',
    requirements: 'Requirements',
    addRequirement: 'Add Requirement',
    requirementLabel: 'Label',
    requirementType: 'Type',
    requirementTypeText: 'Text',
    requirementTypeNumber: 'Number',
    requirementTypeUpload: 'Upload',
    requirementRequired: 'Required',
    requirementRemove: 'Remove',
  },
  common: {
    cancel: 'Cancel',
  },
}

vi.mock('../hooks', () => ({
  useStageMutations: () => ({
    createStage: { mutateAsync: vi.fn(), isPending: false },
    updateStage: { mutateAsync: vi.fn(), isPending: false },
  }),
}))

const existingStage: Stage = {
  id: 'stage-1',
  orgId: 'org-1',
  name: 'Existing Stage',
  board: 'pre_production',
  description: 'An existing description',
  needApproval: false,
  requirements: [],
  orderIndex: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function renderForm(
  props: Partial<React.ComponentProps<typeof StageForm>> = {},
) {
  return render(
    <IntlProvider locale="en" messages={enMessages}>
      <StageForm open onOpenChange={vi.fn()} {...props} />
    </IntlProvider>,
  )
}

describe('StageForm focus stability', () => {
  it('keeps focus on stage name input during sequential typing (create)', async () => {
    renderForm()

    const nameInput = screen.getByLabelText('Stage Name')
    nameInput.focus()

    // Simulate rapid sequential typing — each keystroke should not remount the input
    await userEvent.type(nameInput, 'Stage One')

    expect(nameInput).toHaveFocus()
    expect(nameInput).toHaveValue('Stage One')
  })

  it('keeps focus on stage name input during sequential typing (edit)', async () => {
    renderForm({ stage: existingStage })

    const nameInput = screen.getByLabelText('Stage Name')
    nameInput.focus()

    await userEvent.type(nameInput, ' — Updated')

    expect(nameInput).toHaveFocus()
    expect(nameInput).toHaveValue('Existing Stage — Updated')
  })

  it('preserves value after rapid typing with no gaps', async () => {
    renderForm()

    const nameInput = screen.getByLabelText('Stage Name')

    // Type a long string in one burst — any rerender mid-type would drop characters or lose focus
    const longName = 'A Very Long Stage Name That Tests Stability'
    await userEvent.type(nameInput, longName)

    expect(nameInput).toHaveValue(longName)
    expect(nameInput).toHaveFocus()
  })

  it('preserves description textarea value during typing', async () => {
    renderForm()

    const descInput = screen.getByLabelText('Description')
    descInput.focus()

    await userEvent.type(descInput, 'Some description text')

    expect(descInput).toHaveFocus()
    expect(descInput).toHaveValue('Some description text')
  })
})
