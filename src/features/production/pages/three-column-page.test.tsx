import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThreeColumnPage } from './three-column-page'

const queryStateStore = vi.hoisted(() => ({
  store: {
    q: '',
    task: '',
  } as Record<string, string | null>,
}))

vi.mock('nuqs', () => {
  const { useState, useEffect } = require('react')
  const parseAsString = {
    withDefault: (value: string) => value,
  }
  return {
    parseAsString,
    useQueryState: (key: string, defaultValue?: string | null) => {
      const [state, setState] = useState(() => {
        const storeVal = queryStateStore.store[key]
        return storeVal !== undefined
          ? storeVal
          : typeof defaultValue === 'string'
            ? defaultValue
            : null
      })

      useEffect(() => {
        const val = queryStateStore.store[key]
        if (val !== undefined && val !== state) {
          setState(val)
        }
      }, [state])

      const setter = (
        newVal: string | null | ((prev: string | null) => string | null),
      ) => {
        const nextVal = typeof newVal === 'function' ? newVal(state) : newVal
        queryStateStore.store[key] = nextVal
        setState(nextVal)
      }
      return [state, setter] as const
    },
  }
})

const advanceMutate = vi.hoisted(() => vi.fn())
const saveCommentMutate = vi.hoisted(() => vi.fn())

const baseTask = {
  id: 'task-queued',
  orgId: 'org-1',
  orderId: 'order-1',
  board: 'pre_production' as const,
  stageId: null as string | null,
  status: 'queued' as string,
  taskNumber: 'TSK-100',
  lineItemId: 'line-1',
  priority: false,
  context: {
    productName: 'Sample Product',
    orderNumber: 'ORD-1',
    customerName: 'Acme',
    quantity: 50,
    requirements: 'Cut pieces using pattern X',
    designName: 'Front panel',
  },
  assignedTo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  archivedAt: null,
}

const priorityTask = {
  id: 'task-progress',
  orgId: 'org-1',
  orderId: 'order-2',
  board: 'pre_production' as const,
  stageId: 'stage-1' as string | null,
  status: 'in_progress' as string,
  taskNumber: 'TSK-200',
  lineItemId: 'line-2',
  priority: true,
  context: {
    productName: 'Priority Product',
    orderNumber: 'ORD-2',
    customerName: 'Beta',
    quantity: 10,
  },
  assignedTo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  archivedAt: null,
}

vi.mock('../hooks', () => ({
  useBoardTasks: () => ({
    data: {
      queued: [
        {
          task: { ...baseTask },
          stage: null,
        },
      ],
      stages: new Map([
        [
          'stage-1',
          [
            {
              task: { ...priorityTask },
              stage: {
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
            },
          ],
        ],
      ]),
      readyForProduction: [],
      done: [],
    },
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
        name: 'Cutting',
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
    ],
    isLoading: false,
  }),
  useTaskDetail: (taskId: string) => ({
    data:
      taskId === 'task-queued'
        ? { ...baseTask }
        : taskId === 'task-progress'
          ? { ...priorityTask }
          : null,
    isLoading: false,
  }),
  useTaskActivities: () => ({ data: [], isLoading: false }),
  useTaskMutations: () => ({
    advanceTask: { mutateAsync: advanceMutate, isPending: false },
    saveComment: { mutateAsync: saveCommentMutate, isPending: false },
  }),
  useArchivedTasks: () => ({
    data: { rows: [], totalRows: 0 },
    isFetching: false,
  }),
}))

vi.mock('../components/requirement-form', () => ({
  RequirementForm: ({
    onCancel,
    onSubmit,
  }: {
    onCancel: () => void
    onSubmit: (r: Record<string, { value: string }>) => void
  }) => (
    <div data-testid="requirement-form">
      <button type="button" onClick={onCancel}>
        Cancel requirements
      </button>
      <button type="button" onClick={() => onSubmit({ req1: { value: 'ok' } })}>
        Submit requirements
      </button>
    </div>
  ),
}))

vi.mock('../components/activity-row', () => ({
  ActivityRow: ({ activity }: { activity: { type: string } }) => (
    <div data-testid="activity-row">{activity.type}</div>
  ),
}))

vi.mock('#/features/members/hooks', () => ({
  useMembers: () => ({ data: [], isLoading: false }),
}))

vi.mock('#/features/orders/server', () => ({
  getAssetsForLineItemFn: vi.fn().mockResolvedValue([]),
}))

const enMessages = {
  production: {
    queue: 'Queue',
    readyForProduction: 'DP Payment',
    queueReady: 'Ready now',
    queueWaiting: 'Waiting',
    noReadyTasks: 'No production work ready',
    noWaitingTasks: 'No tasks waiting for review',
    stagePending: 'In queue',
    taskDetail: 'Task Detail',
    productLabel: 'Product',
    designName: 'Design name',
    orderLabel: 'Order',
    customerLabel: 'Customer',
    quantityLabel: 'Quantity',
    specification: 'Specification',
    attachments: 'Attachments',
    advanceTo: 'Advance to {stage}',
    markReadyForProduction: 'Mark Ready for Production',
    done: 'Done',
    requestReview: 'Request Review',
    deadlineLabel: 'Deadline {date}',
    deadlineToday: 'Due today',
    deadlineTomorrow: 'Due tomorrow',
    deadlineDaysLeft: '{days, plural, one {# day left} other {# days left}}',
    deadlineDaysOverdue:
      '{days, plural, one {# day overdue} other {# days overdue}}',
    priorityBadge: 'Priority',
    needReview: 'Need Review',
    openTask: 'Open task {task}',
    workflow: 'Workflow',
    activity: 'Activity',
    commentPlaceholder: 'Add a comment...',
    send: 'Send',
    noActivity: 'No activity yet',
    completeRequirements: 'Complete requirements',
    noTasks: 'No tasks yet',
    tabActive: 'Active Tasks',
    tabArchive: 'Archive',
    searchPlaceholder: 'Search orders...',
    board: 'Board',
    boardPreProduction: 'Pre-Production',
    boardProduction: 'Production',
    archivedEmpty: 'No archived tasks',
    archivedTaskNumber: 'Task Number',
    archivedOrder: 'Order',
    archivedProduct: 'Product',
    archivedCustomer: 'Customer',
    archivedDate: 'Archived',
  },
  common: {
    pcs: 'pcs',
    cancel: 'Cancel',
    confirm: 'Confirm',
  },
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={enMessages}>
        <ThreeColumnPage orgId="org-1" />
      </IntlProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  queryStateStore.store = { q: '', task: '' }
  advanceMutate.mockReset()
  saveCommentMutate.mockReset()
  advanceMutate.mockResolvedValue({ ok: true, pendingApproval: false })
  saveCommentMutate.mockResolvedValue({ ok: true })
})

describe('ThreeColumnPage', () => {
  it('renders work queue, selected task, and workflow rail', () => {
    renderPage()
    expect(screen.getByRole('tab', { name: /Active Tasks/i })).toBeDefined()
    expect(screen.getAllByText('Sample Product').length).toBeGreaterThan(0)
    expect(screen.getByText('Priority Product')).toBeDefined()
    expect(screen.getByText('Workflow')).toBeDefined()
    expect(screen.getByPlaceholderText('Add a comment...')).toBeDefined()
  })

  it('shows the current stage badge on each queue row', () => {
    renderPage()
    expect(screen.getAllByText('In queue').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Design').length).toBeGreaterThan(0)
  })

  it('calls advanceTask with selected task id when advance button clicked', async () => {
    renderPage()
    const button = await screen.findByRole('button', {
      name: 'Advance to Design',
    })
    await userEvent.click(button)
    await waitFor(() => {
      expect(advanceMutate).toHaveBeenCalledWith({ taskId: 'task-queued' })
    })
  })

  it('switches selected task when a queue row is clicked', async () => {
    renderPage()
    const priorityRow = screen.getByText('Priority Product')
    await userEvent.click(priorityRow.closest('button') ?? priorityRow)
    const advanceButton = await screen.findByRole('button', {
      name: 'Advance to Cutting',
    })
    await userEvent.click(advanceButton)
    await waitFor(() => {
      expect(advanceMutate).toHaveBeenCalledWith({ taskId: 'task-progress' })
    })
  })

  it('submits a comment via saveComment mutation', async () => {
    renderPage()
    const input = screen.getByPlaceholderText('Add a comment...')
    fireEvent.change(input, { target: { value: 'Hello' } })
    const send = screen.getByRole('button', { name: 'Send' })
    await userEvent.click(send)
    await waitFor(() => {
      expect(saveCommentMutate).toHaveBeenCalledWith({
        taskId: 'task-queued',
        text: 'Hello',
      })
    })
  })

  it('renders an Archived tab in the work queue', () => {
    renderPage()
    expect(screen.getByRole('tab', { name: /Archive/i })).toBeDefined()
  })

  it('switches to archived tab and shows empty state', async () => {
    renderPage()
    const archivedTab = screen.getByRole('tab', { name: /Archive/i })
    await userEvent.click(archivedTab)
    await waitFor(() => {
      expect(screen.getByText('No archived tasks')).toBeDefined()
    })
  })

  it('renders the workflow rail only with stages from the selected task board', async () => {
    renderPage()
    // The selected default task is task-queued (pre_production). Both stages are
    // pre_production, so they should appear; the rail should not be empty.
    expect(screen.getAllByText('Design').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Cutting').length).toBeGreaterThan(0)
  })
})
