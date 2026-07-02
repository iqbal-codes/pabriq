import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { KanbanPage } from './kanban-page'

const mutationMocks = vi.hoisted(() => ({
  approveAdvanceMutate: vi.fn(),
  rejectAdvanceMutate: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useRouteContext: () => ({ org: { id: 'org-1', role: 'owner' } }),
}))

vi.mock('nuqs', () => {
  const parseAsString = {
    withDefault: (value: string) => value,
  }
  return {
    parseAsString,
    useQueryState: (_key: string, defaultValue: string) => [
      defaultValue,
      vi.fn(),
    ],
  }
})

vi.mock('../hooks', () => {
  return {
    useStages: () => ({
      data: [
        {
          id: 'stage-1',
          name: 'Design',
          board: 'pre_production',
          orderIndex: 0,
          active: true,
          needApproval: true,
          requirements: [
            {
              id: 'req-proof',
              label: 'Proof approved',
              type: 'text',
              required: true,
            },
          ],
          description: null,
          orgId: 'org-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'stage-2',
          name: 'Production',
          board: 'pre_production',
          orderIndex: 1,
          active: true,
          needApproval: false,
          requirements: [],
          description: null,
          orgId: 'org-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'stage-prod-1',
          name: 'Print',
          board: 'production',
          orderIndex: 0,
          active: true,
          needApproval: false,
          requirements: [],
          description: null,
          orgId: 'org-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      isLoading: false,
    }),
    useBoardTasks: () => ({
      data: {
        queued: [
          {
            task: {
              id: 'task-1',
              orgId: 'org-1',
              orderId: 'order-1',
              board: 'pre_production',
              stageId: 'stage-1',
              status: 'pending_approval',
              taskNumber: 'TSK-1',
              lineItemId: 'line-item-1',
              priority: false,
              context: {
                productName: 'Product A',
                customerName: 'Customer A',
                orderNumber: 'ORD-001',
                quantity: 100,
                requirementResponses: {
                  'req-proof': { value: 'Yes' },
                },
              },
              assignedTo: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              archivedAt: null,
            },
            stage: {
              id: 'stage-1',
              name: 'Design',
              board: 'pre_production',
              orderIndex: 0,
              active: true,
              needApproval: true,
              requirements: [],
              description: null,
              orgId: 'org-1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
        stages: new Map(),
        readyForProduction: [],
        done: [],
      },
      isLoading: false,
    }),
    useTaskDetail: (taskId: string) => ({
      data: taskId
        ? taskId === 'task-last-stage'
          ? {
              id: taskId,
              orgId: 'org-1',
              orderId: 'order-1',
              board: 'pre_production',
              stageId: 'stage-2',
              status: 'pending_approval',
              taskNumber: 'TSK-2',
              lineItemId: 'line-item-2',
              priority: false,
              context: {},
              assignedTo: null,
              createdAt: '2026-05-01T00:00:00Z',
              updatedAt: '2026-05-06T00:00:00Z',
            }
          : {
              id: taskId,
              orgId: 'org-1',
              orderId: 'order-1',
              board: 'pre_production',
              stageId: 'stage-1',
              status: 'pending_approval',
              taskNumber: 'TSK-1',
              lineItemId: 'line-item-1',
              priority: false,
              context: {
                productName: 'Product A',
                customerName: 'Customer A',
                orderNumber: 'ORD-001',
                quantity: 100,
                requirementResponses: {
                  'req-proof': { value: 'Yes' },
                },
              },
              assignedTo: null,
              createdAt: '2026-05-01T00:00:00Z',
              updatedAt: '2026-05-06T00:00:00Z',
            }
        : null,
      isLoading: false,
    }),
    useTaskMutations: () => ({
      advanceTask: { mutate: vi.fn() },
      saveComment: { mutate: vi.fn() },
      approveAdvance: { mutate: mutationMocks.approveAdvanceMutate },
      rejectAdvance: { mutate: mutationMocks.rejectAdvanceMutate },
    }),
    useTaskActivities: () => ({ data: [], isLoading: false }),
  }
})

vi.mock('../components/kanban-board', () => ({
  KanbanBoard: ({
    onClickCard,
  }: {
    onClickCard?: (taskId: string) => void
  }) => (
    <button type="button" onClick={() => onClickCard?.('task-1')}>
      Open Task
    </button>
  ),
}))

vi.mock('../components/task-detail-modal', () => ({
  TaskDetailModal: ({ onReview }: { onReview?: (taskId: string) => void }) => (
    <div>
      <button type="button" onClick={() => onReview?.('task-1')}>
        Review Task
      </button>
      <button type="button" onClick={() => onReview?.('task-last-stage')}>
        Review Last Stage Task
      </button>
    </div>
  ),
}))

const enMessages = {
  production: {
    title: 'Production',
    kanbanTab: 'Kanban',
    listTab: 'List',
    stagesTab: 'Stages',
    searchPlaceholder: 'Search orders...',
    allStages: 'All Stages',
    queue: 'Queue',
    done: 'Done',
    noTasks: 'No tasks yet',
    taskDetail: 'Task Detail',
    specification: 'Specification',
    attachments: 'Attachments',
    activity: 'Activity',
    comments: 'Comments',
    commentPlaceholder: 'Add a comment...',
    send: 'Send',
    startProduction: 'Start Pre-Production',
    continueToProduction: 'Continue to Production',
    advanceTo: 'Advance to {stage}',
    completeRequirements: 'Complete Requirements',
    requirementRequired: 'Required',
    requirementOptional: 'Optional',
    uploadFile: 'Upload File',
    requestReview: 'Request Review',
    reviewAdvancement: 'Review Advancement',
    approve: 'Approve & Advance',
    approveOrder: 'Approve Order',
    reject: 'Reject',
    rejectOrder: 'Reject Order',
    cancelOrder: 'Cancel Order',
    reviewNotes: 'Review Notes',
    reviewTaskLabel: 'Task',
    reviewStageLabel: 'Stage',
    fulfilledRequirements: 'Fulfilled Requirements',
    attachmentCount: '{count, plural, one {# file} other {# files}}',
    openTask: 'Open task {task}',
    columnTaskCount: '{column}: {count, plural, one {# task} other {# tasks}}',
    canceled: 'Canceled',
    stageManagement: 'Production Stages',
    addStage: 'Add Stage',
    editStage: 'Edit Stage',
    deleteStage: 'Delete Stage',
    deleteStageConfirm: 'Are you sure you want to delete this stage?',
    stageName: 'Stage Name',
    stageDescription: 'Description',
    stageDescriptionPlaceholder: 'Describe this stage',
    needApproval: 'Requires Approval',
    needApprovalHint: 'Advancing past this stage requires admin approval',
    active: 'Active',
    inactive: 'Inactive',
    requirements: 'Requirements',
    addRequirement: 'Add Requirement',
    requirementLabel: 'Label',
    requirementType: 'Type',
    requirementTypeText: 'Text',
    requirementTypeNumber: 'Number',
    requirementTypeUpload: 'Upload',
    required: 'Required',
    optional: 'Optional',
    reorder: 'Reorder',
    movedToStage: 'Moved to {stage}',
    advancedFromQueue: 'Advanced from Queue',
    advancementRequested: 'Advancement requested',
    approved: 'Approved by {actor}',
    rejected: 'Rejected by {actor}',
    savedRequirement: 'Requirement saved',
    taskCompleted: 'Task completed',
    orderApproved: 'Order approved successfully',
    orderRejected: 'Order rejected',
    pendingApproval: 'Pending Approval',
    statusQueued: 'Queued',
    statusInProgress: 'In Progress',
    statusCompleted: 'Completed',
    orderLabel: 'Order',
    productLabel: 'Product',
    customerLabel: 'Customer',
    quantityLabel: 'Quantity',
    priorityBadge: 'Priority',
    taskCreated: 'Task created',
    noActivity: 'No activity yet',
    tabActive: 'Active Tasks',
    tabArchive: 'Archive',
    board: 'Board',
    kanbanTitle: 'Kanban',
    boardPreProduction: 'Pre-Production',
    boardProduction: 'Production',
    archivedEmpty: 'No archived tasks',
    archivedTaskNumber: 'Task Number',
    archivedOrder: 'Order',
    archivedProduct: 'Product',
    archivedCustomer: 'Customer',
    archivedDate: 'Archived',
    requirementRemove: 'Remove requirement',
    productionTasks: 'Production Tasks',
    noTasksForOrder: 'No production tasks for this order',
    loading: 'Loading...',
    markAsShipped: 'Mark as Shipped',
    completeProduction: 'Complete Production',
    shipmentDetails: 'Shipment Details',
    shipmentAddress: 'Shipment Address',
    shipmentFee: 'Shipment Fee',
    shipmentFeePlaceholder: 'Enter shipment fee (optional)',
    courierPlaceholder: 'e.g., JNE, SiCepat, J&T',
    trackingNumber: 'Tracking Number',
    trackingNumberPlaceholder: 'Enter tracking number (optional)',
    allTasksCompleted: 'All tasks have been completed ✓',
    tasksNotCompleted: 'Some tasks are still in progress',
    remainingPayment: 'Remaining Payment',
    createInvoiceAndShip: 'Create Invoice & Ship',
    courier: 'Courier',
    payment: 'Payment',
    finalInvoice: 'Final Invoice',
    orderTotal: 'Order Total',
    alreadyPaid: 'Already Paid',
    shippingFeeDescription: 'Description',
    shippingFeeDescriptionPlaceholder: 'e.g., Shipping Fee',
    total: 'Total',
    paymentMethodRequired: 'Please select a payment method',
    invoiceAmountRequired: 'Invoice amount must be greater than 0',
    completeProductionFailed: 'Failed',
    orderNumberLabel: 'Order #',
  },
  status: {
    queued: 'Queued',
    in_progress: 'In Progress',
    pending_approval: 'Pending Approval',
    completed: 'Completed',
  },
  common: {
    pcs: 'pcs',
  },
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={enMessages}>
        <KanbanPage orgId="org-1" />
      </IntlProvider>
    </QueryClientProvider>,
  )
}

describe('KanbanPage', () => {
  it('keeps review modal open when approve returns a server error', async () => {
    mutationMocks.approveAdvanceMutate.mockImplementation(
      (_vars: unknown, options?: { onSuccess?: (result: unknown) => void }) => {
        options?.onSuccess?.({ ok: false, error: 'Approve failed' })
      },
    )
    renderPage()
    await userEvent.click(screen.getByText('Open Task'))
    await userEvent.click(screen.getByText('Review Task'))
    await userEvent.click(screen.getByText('Approve & Advance'))
    expect(screen.getByText('Review Advancement')).toBeInTheDocument()
  })

  it('closes review modal when approve succeeds', async () => {
    mutationMocks.approveAdvanceMutate.mockImplementation(
      (_vars: unknown, options?: { onSuccess?: (result: unknown) => void }) => {
        options?.onSuccess?.({ ok: true, pendingApproval: false })
      },
    )
    renderPage()
    await userEvent.click(screen.getByText('Open Task'))
    await userEvent.click(screen.getByText('Review Task'))
    await userEvent.click(screen.getByText('Approve & Advance'))
    expect(screen.queryByText('Review Advancement')).not.toBeInTheDocument()
  })

  it('keeps review modal open when reject returns a server error', async () => {
    mutationMocks.rejectAdvanceMutate.mockImplementation(
      (_vars: unknown, options?: { onSuccess?: (result: unknown) => void }) => {
        options?.onSuccess?.({ ok: false, error: 'Reject failed' })
      },
    )
    renderPage()
    await userEvent.click(screen.getByText('Open Task'))
    await userEvent.click(screen.getByText('Review Task'))
    await userEvent.click(screen.getByText('Reject'))
    expect(screen.getByText('Review Advancement')).toBeInTheDocument()
  })

  it('closes review modal when reject succeeds', async () => {
    mutationMocks.rejectAdvanceMutate.mockImplementation(
      (_vars: unknown, options?: { onSuccess?: (result: unknown) => void }) => {
        options?.onSuccess?.({ ok: true })
      },
    )
    renderPage()
    await userEvent.click(screen.getByText('Open Task'))
    await userEvent.click(screen.getByText('Review Task'))
    await userEvent.click(screen.getByText('Reject'))
    expect(screen.queryByText('Review Advancement')).not.toBeInTheDocument()
  })

  it('shows production entry stage as destination for last pre_production stage review', async () => {
    renderPage()
    await userEvent.click(screen.getByText('Open Task'))
    await userEvent.click(screen.getByText('Review Last Stage Task'))
    // task-last-stage is at stage-2 (last pre_production stage)
    // reviewNextStageName should show 'Print' (first production stage)
    expect(screen.getByText('Review Advancement')).toBeInTheDocument()
    expect(screen.getByText('Print')).toBeInTheDocument()
  })
})
