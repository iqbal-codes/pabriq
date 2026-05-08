import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import type { Stage } from '../model'
import { StageList } from './stage-list'

const enMessages = {
  production: {
    addStage: 'Add Stage',
    noTasks: 'No tasks',
    reorder: 'Reorder',
    stageName: 'Stage Name',
    stageDescription: 'Description',
    stageDescriptionPlaceholder: 'Enter description...',
    needApproval: 'Needs Approval',
    needApprovalHint: 'Requires admin approval to advance',
    requirements: 'Requirements',
    addRequirement: 'Add Requirement',
    requirementLabel: 'Label',
    requirementType: 'Type',
    requirementTypeText: 'Text',
    requirementTypeNumber: 'Number',
    requirementTypeUpload: 'Upload',
    required: 'Required',
    optional: 'Optional',
    active: 'Active',
    inactive: 'Inactive',
    editStage: 'Edit',
    deleteStage: 'Delete',
  },
  common: {
    loading: 'Loading...',
    actions: 'Actions',
    cancel: 'Cancel',
    save: 'Save',
  },
}

const stages: Stage[] = [
  {
    id: '1',
    orgId: 'org-1',
    name: 'Design',
    board: 'pre_production',
    description: 'Design phase',
    needApproval: false,
    requirements: [],
    orderIndex: 0,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    orgId: 'org-1',
    name: 'Production',
    board: 'pre_production',
    description: null,
    needApproval: true,
    requirements: [{ id: 'qty', label: 'Qty', type: 'number', required: true }],
    orderIndex: 1,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

function renderStageList() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={enMessages}>
        <StageList stages={stages} loading={false} />
      </IntlProvider>
    </QueryClientProvider>,
  )
}

describe('StageList', () => {
  it('renders reorder buttons with svg icons', () => {
    renderStageList()

    const rows = screen.getAllByRole('row')
    const dataRow = rows[1]
    const reorderCell = dataRow.querySelector('td')
    const svgs = reorderCell?.querySelectorAll('svg')
    expect(svgs?.length).toBeGreaterThanOrEqual(1)
  })
})
