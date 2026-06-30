import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { TaskDetailModal } from './task-detail-modal'

const mutationMocks = vi.hoisted(() => ({
  advanceTaskMutate: vi.fn(),
  saveCommentMutate: vi.fn(),
}))

const enMessages = {
  production: {
    taskDetail: 'Task Detail',
    specification: 'Specification',
    activity: 'Activity',
    orderLabel: 'Order',
    productLabel: 'Product',
    customerLabel: 'Customer',
    quantityLabel: 'Quantity',
    comments: 'Comments',
    commentPlaceholder: 'Type a comment...',
    send: 'Send',
    startProduction: 'Start Pre-Production',
    advanceTo: 'Advance to {stage}',
    done: 'Done',
    reviewAdvancement: 'Review',
    requestReview: 'Request Review',
    continueToProduction: 'Continue to Production',
    queue: 'Queue',
    statusQueued: 'Queued',
    statusInProgress: 'In Progress',
    pendingApproval: 'Pending Approval',
    statusCompleted: 'Completed',
    attachments: 'Attachments',
    noActivity: 'No activity yet',
    openTask: 'Open task {task}',
    columnTaskCount: '{column}: {count, plural, one {# task} other {# tasks}}',
  },
  status: {
    queued: 'Queued',
    in_progress: 'In Progress',
    pending_approval: 'Pending Approval',
    completed: 'Completed',
  },
}

const taskStatusMap: Record<string, string> = {
  'task-1': 'in_progress',
  'task-queued': 'queued',
  'task-pending': 'pending_approval',
  'task-done': 'completed',
  'task-final-stage': 'in_progress',
  'task-approval': 'in_progress',
}

const taskStageMap: Record<string, string | null> = {
  'task-queued': null,
  'task-1': 'stage-1',
  'task-final-stage': 'stage-approval',
  'task-pending': 'stage-1',
  'task-done': 'stage-2',
  'task-approval': 'stage-approval',
}

vi.mock('../hooks', () => {
  const approveAdvance = { mutate: vi.fn() }
  const rejectAdvance = { mutate: vi.fn() }
  return {
    useTaskDetail: (taskId: string) => ({
      data: {
        id: taskId,
        orgId: 'org-1',
        orderId: 'order-1',
        board: 'pre_production',
        stageId: taskStageMap[taskId] ?? null,
        status: taskStatusMap[taskId] ?? 'in_progress',
        taskNumber: 'TSK-5',
        lineItemId: 'line-item-1',
        priority: false,
        context: {
          productName: 'Custom T-Shirt',
          customerName: 'Acme Corp',
          orderNumber: 'ORD-001',
          quantity: 500,
          requirements: 'Red color',
        },
        assignedTo: null,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-06T00:00:00Z',
      },
      isLoading: false,
    }),
    useTaskActivities: () => ({
      data: [
        {
          id: 'act-1',
          type: 'stage_transition',
          fromStageId: null,
          toStageId: 'stage-1',
          data: {},
          actorId: 'admin-1',
          createdAt: '2026-05-02T10:00:00Z',
        },
      ],
      isLoading: false,
    }),
    useStages: () => ({
      data: [
        {
          id: 'stage-1',
          name: 'Design',
          board: 'pre_production',
          orderIndex: 0,
          active: true,
          needApproval: false,
          requirements: [],
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
          id: 'stage-approval',
          name: 'QC',
          board: 'pre_production',
          orderIndex: 2,
          active: true,
          needApproval: true,
          requirements: [],
          description: null,
          orgId: 'org-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      isLoading: false,
    }),
    useTaskMutations: () => ({
      advanceTask: { mutate: mutationMocks.advanceTaskMutate },
      approveAdvance,
      rejectAdvance,
      saveComment: { mutate: mutationMocks.saveCommentMutate },
    }),
  }
})

function renderModal(
  taskId = 'task-1',
  props?: { canApprove?: boolean; onReview?: (taskId: string) => void },
) {
  const onOpenChange = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const result = render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={enMessages}>
        <TaskDetailModal
          taskId={taskId}
          orgId="org-1"
          open={true}
          onOpenChange={onOpenChange}
          canApprove={props?.canApprove}
          onReview={props?.onReview}
        />
      </IntlProvider>
    </QueryClientProvider>,
  )
  return { ...result, onOpenChange }
}

describe('TaskDetailModal', () => {
  it('renders task summary info', () => {
    renderModal()
    expect(screen.getByText('TSK-5')).toBeInTheDocument()
    expect(screen.getByText('Custom T-Shirt')).toBeInTheDocument()
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument()
    expect(screen.getByText(/500/)).toBeInTheDocument()
  })

  it('renders Details and Activity tabs', () => {
    renderModal()
    expect(screen.getAllByText('Specification').length).toBeGreaterThanOrEqual(
      1,
    )
    expect(screen.getByText('Activity')).toBeInTheDocument()
  })

  it('shows Advance button with next stage name for in_progress tasks', () => {
    renderModal()
    expect(screen.getByText('Advance to Production')).toBeInTheDocument()
  })

  it('shows advance action for queued tasks', () => {
    renderModal('task-queued')
    expect(screen.getByText('Advance to Design')).toBeInTheDocument()
  })

  it('shows activity tab content', async () => {
    renderModal()
    await userEvent.click(screen.getByText('Activity'))
    expect(screen.getByText('Started Design')).toBeInTheDocument()
  })

  it('shows Request Review for final active stage with needApproval', () => {
    renderModal('task-final-stage')
    expect(screen.getByText('Request Review')).toBeInTheDocument()
  })

  it('does not close when advance returns a server error', async () => {
    mutationMocks.advanceTaskMutate.mockImplementation(
      (_vars: unknown, options?: { onSuccess?: (result: unknown) => void }) => {
        options?.onSuccess?.({ ok: false, error: 'Failed to advance' })
      },
    )
    const { onOpenChange } = renderModal()
    await userEvent.click(screen.getByText('Advance to Production'))
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('closes when advance succeeds', async () => {
    mutationMocks.advanceTaskMutate.mockImplementation(
      (_vars: unknown, options?: { onSuccess?: (result: unknown) => void }) => {
        options?.onSuccess?.({ ok: true, pendingApproval: false })
      },
    )
    const { onOpenChange } = renderModal()
    await userEvent.click(screen.getByText('Advance to Production'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not clear comment when save comment returns a server error', async () => {
    mutationMocks.saveCommentMutate.mockImplementation(
      (_vars: unknown, options?: { onSuccess?: (result: unknown) => void }) => {
        options?.onSuccess?.({ ok: false, error: 'Failed to comment' })
      },
    )
    renderModal()
    await userEvent.click(screen.getByText('Activity'))
    const input = screen.getByPlaceholderText('Type a comment...')
    await userEvent.type(input, 'Hello world')
    await userEvent.click(screen.getByText('Send'))
    expect(input).toHaveValue('Hello world')
  })

  it('clears comment when save comment succeeds', async () => {
    mutationMocks.saveCommentMutate.mockImplementation(
      (_vars: unknown, options?: { onSuccess?: (result: unknown) => void }) => {
        options?.onSuccess?.({ ok: true })
      },
    )
    renderModal()
    await userEvent.click(screen.getByText('Activity'))
    const input = screen.getByPlaceholderText('Type a comment...')
    await userEvent.type(input, 'Hello world')
    await userEvent.click(screen.getByText('Send'))
    expect(input).toHaveValue('')
  })

  it('shows Request Review for in_progress task at needApproval stage', () => {
    renderModal('task-approval')
    expect(screen.getByText('Request Review')).toBeInTheDocument()
  })

  it('calls onReview when advance returns pendingApproval and canApprove is true', async () => {
    mutationMocks.advanceTaskMutate.mockImplementation(
      (_vars: unknown, options?: { onSuccess?: (result: unknown) => void }) => {
        options?.onSuccess?.({ ok: true, pendingApproval: true })
      },
    )
    const onReview = vi.fn()
    renderModal('task-approval', { canApprove: true, onReview })
    await userEvent.click(screen.getByText('Request Review'))
    expect(onReview).toHaveBeenCalledWith('task-approval')
  })

  it('closes modal when advance returns pendingApproval but canApprove is false', async () => {
    mutationMocks.advanceTaskMutate.mockImplementation(
      (_vars: unknown, options?: { onSuccess?: (result: unknown) => void }) => {
        options?.onSuccess?.({ ok: true, pendingApproval: true })
      },
    )
    const { onOpenChange } = renderModal('task-approval', { canApprove: false })
    await userEvent.click(screen.getByText('Request Review'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
