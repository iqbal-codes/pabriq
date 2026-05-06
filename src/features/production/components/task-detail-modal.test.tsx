import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { TaskDetailModal } from './task-detail-modal'

const enMessages = {
  production: {
    taskDetail: 'Task Detail',
    specification: 'Specification',
    activity: 'Activity',
    comments: 'Comments',
    commentPlaceholder: 'Type a comment...',
    send: 'Send',
    startProduction: 'Start Production',
    advanceTo: 'Advance',
    reviewAdvancement: 'Review',
    queue: 'Queue',
  },
}

const taskStatusMap: Record<string, string> = {
  'task-1': 'in_progress',
  'task-queued': 'queued',
  'task-pending': 'pending_approval',
  'task-done': 'completed',
}

vi.mock('../hooks', () => {
  const advanceTask = { mutate: vi.fn() }
  const approveAdvance = { mutate: vi.fn() }
  const rejectAdvance = { mutate: vi.fn() }
  const saveComment = { mutate: vi.fn() }
  return {
    useTaskDetail: (taskId: string) => ({
      data: {
        id: taskId,
        orgId: 'org-1',
        orderId: 'order-1',
        stageId: taskStatusMap[taskId] === 'queued' ? null : 'stage-1',
        status: taskStatusMap[taskId] ?? 'in_progress',
        taskNumber: 'TSK-5',
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
        { id: 'stage-1', name: 'Design', orderIndex: 0, active: true },
        { id: 'stage-2', name: 'Production', orderIndex: 1, active: true },
      ],
      isLoading: false,
    }),
    useTaskMutations: () => ({
      advanceTask,
      approveAdvance,
      rejectAdvance,
      saveComment,
    }),
  }
})

function renderModal(taskId = 'task-1') {
  const onOpenChange = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={enMessages}>
        <TaskDetailModal
          taskId={taskId}
          open={true}
          onOpenChange={onOpenChange}
        />
      </IntlProvider>
    </QueryClientProvider>,
  )
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
    expect(screen.getByText('Advance Production')).toBeInTheDocument()
  })

  it('shows Start Production for queued tasks', () => {
    renderModal('task-queued')
    expect(screen.getByText('Start Production')).toBeInTheDocument()
  })

  it('shows activity tab content', async () => {
    renderModal()
    await userEvent.click(screen.getByText('Activity'))
    expect(screen.getByText('stage_transition')).toBeInTheDocument()
  })
})
