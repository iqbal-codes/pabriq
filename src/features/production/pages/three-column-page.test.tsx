import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThreeColumnPage } from './three-column-page'

// ---------------------------------------------------------------------------
// Controllable viewport mock for the 728px and 1728px breakpoints
// ---------------------------------------------------------------------------
const { getUseIsMobileMock, setPhone, setTwoColumn } = vi.hoisted(() => {
  let isPhone = false
  let isBelowWideDesktop = false

  return {
    getUseIsMobileMock: (breakpoint = 768) =>
      breakpoint === 728 ? isPhone : isBelowWideDesktop,
    setPhone: (value: boolean) => {
      isPhone = value
      isBelowWideDesktop = value
    },
    setTwoColumn: () => {
      isPhone = false
      isBelowWideDesktop = true
    },
  }
})

vi.mock('#/hooks/use-mobile', () => ({
  useIsMobile: getUseIsMobileMock,
}))

// ---------------------------------------------------------------------------
// Query-state store (nuqs mock)
// ---------------------------------------------------------------------------
const queryStateStore = vi.hoisted(() => ({
  store: {
    q: '',
    task: '',
  } as Record<string, string | null>,
}))

const boardState = vi.hoisted(() => ({ hasTasks: true }))
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

// ---------------------------------------------------------------------------
// Mutation mocks
// ---------------------------------------------------------------------------
const advanceMutate = vi.hoisted(() => vi.fn())
const saveCommentMutate = vi.hoisted(() => vi.fn())

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------
vi.mock('../hooks', () => ({
  useBoardTasks: () => ({
    data: boardState.hasTasks
      ? {
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
        }
      : {
          queued: [],
          stages: new Map(),
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

// ---------------------------------------------------------------------------
// Component mocks
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
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
    close: 'Close',
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
    // Workflow step subtitles
    stepSubtitleReleased: 'Released',
    stepSubtitleInQueue: 'In queue',
    stepSubtitleReadyToShip: 'Ready to ship',
    stepSubtitlePendingReview: 'Pending review',
    stepSubtitleCurrentStage: 'Current stage',
    stepSubtitleNextStage: 'Next stage',
    stepSubtitleLater: 'Later',
    stepSubtitleRequiresReview: 'Requires review',
    stepSubtitleDone: 'Done',
    // Selected-task pane section headings
    paneProductionSummary: 'Production Summary',
    paneCuttingInstructions: 'Cutting Instructions',
    paneProductionFiles: 'Production Files',
    paneStageRequirements: 'Stage Requirements',
    paneCountSeparator: 'of',
    paneCountComplete: 'complete',
    paneRequirementRequiredHint: 'Required before advancing',
    paneRequirementOptionalHint: 'Optional',
    paneEnterText: 'Enter text...',
    paneEnterNumber: 'Enter number...',
    paneRequirementRemaining:
      '{count, plural, one {# requirement remaining} other {# requirements remaining}}',
    paneRequirementRemainingHint: 'Complete all to move forward.',
    paneCompleteRequirements: 'Complete Requirements',
    // Work-queue board short labels
    boardShortPreProd: 'Pre-Prod',
    boardShortProd: 'Prod',
  },
  common: {
    pcs: 'pcs',
    cancel: 'Cancel',
    confirm: 'Confirm',
  },
}

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------
beforeEach(() => {
  queryStateStore.store = { q: '', task: '' }
  setPhone(false)
  boardState.hasTasks = true
  advanceMutate.mockReset()
  saveCommentMutate.mockReset()
  advanceMutate.mockResolvedValue({ ok: true, pendingApproval: false })
  saveCommentMutate.mockResolvedValue({ ok: true })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ThreeColumnPage', () => {
  // ---- Desktop: no task selected shows placeholders ----
  it('renders work queue and no-task placeholders when no task is selected', () => {
    renderPage()
    // Work queue is present
    expect(screen.getByRole('tab', { name: /Active Tasks/i })).toBeDefined()
    // Both detail and workflow columns show no-task placeholders
    expect(screen.getAllByText('No tasks yet').length).toBeGreaterThanOrEqual(2)
    // No detail-only content visible
    expect(screen.queryByText('Production Summary')).toBeNull()
    expect(screen.queryByText('Workflow')).toBeNull()
  })

  it('hides the workflow rail when no task is selected', () => {
    boardState.hasTasks = false
    renderPage()
    expect(screen.getAllByText('No tasks yet').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Workflow')).toBeNull()
    expect(screen.queryByPlaceholderText('Add a comment...')).toBeNull()
  })

  it('shows the current stage badge on each queue row', () => {
    renderPage()
    expect(screen.getAllByText('In queue').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Design').length).toBeGreaterThan(0)
  })

  // ---- Desktop: clicking a task renders detail and workflow inline ----
  it('desktop: clicking a task renders detail and workflow inline without a dialog', async () => {
    renderPage()
    // Initially no detail-only content
    expect(screen.queryByText('Production Summary')).toBeNull()

    // Click the sample product task row
    const taskRow = screen.getByText('Sample Product')
    await userEvent.click(taskRow.closest('button') ?? taskRow)

    // Task detail and workflow now visible
    expect(screen.getAllByText('Sample Product').length).toBeGreaterThan(0)
    expect(screen.getByText('Workflow')).toBeDefined()
    // No dialog
    expect(screen.queryByRole('dialog')).toBeNull()
    // No mobile tabs
    expect(screen.queryByRole('tab', { name: 'Task Detail' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Activity' })).toBeNull()
  })

  it('calls advanceTask with selected task id when advance button clicked', async () => {
    renderPage()
    // Click task to select it
    const taskRow = screen.getByText('Sample Product')
    await userEvent.click(taskRow.closest('button') ?? taskRow)
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
    // Click first task
    const taskRow = screen.getByText('Sample Product')
    await userEvent.click(taskRow.closest('button') ?? taskRow)

    // Click second task
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
    // Click task to select it
    const taskRow = screen.getByText('Sample Product')
    await userEvent.click(taskRow.closest('button') ?? taskRow)
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
    // Click task to select it
    const taskRow = screen.getByText('Sample Product')
    await userEvent.click(taskRow.closest('button') ?? taskRow)
    // Both stages are pre_production, so they should appear
    expect(screen.getAllByText('Design').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Cutting').length).toBeGreaterThan(0)
  })

  // ---- Desktop: invalid task param ----
  it('desktop: invalid task param shows no-task placeholders instead of selecting first task', () => {
    queryStateStore.store = { q: '', task: 'invalid-task-id' }
    renderPage()
    // No-task placeholders visible for both columns
    expect(screen.getAllByText('No tasks yet').length).toBeGreaterThanOrEqual(2)
    // No detail content rendered
    expect(screen.queryByText('Production Summary')).toBeNull()
  })

  // ---- Mobile: initial render without task param ----
  it('below-lg: renders task list without a dialog when no task param', () => {
    setPhone(true)
    renderPage()
    expect(screen.getByRole('tab', { name: /Active Tasks/i })).toBeDefined()
    expect(screen.getAllByText('Sample Product').length).toBeGreaterThan(0)
    expect(screen.getByText('Priority Product')).toBeDefined()
    // No dialog
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  // ---- Mobile: click opens tabbed Sheet with shared summary ----
  it('below-lg: clicking a task row opens Sheet with Task Detail active, shared summary visible, and Production Summary present', async () => {
    setPhone(true)
    renderPage()

    const taskRow = screen.getByText('Sample Product')
    await userEvent.click(taskRow.closest('button') ?? taskRow)

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeDefined()

    // Task Detail tab is selected
    const detailTab = within(dialog).getByRole('tab', { name: 'Task Detail' })
    expect(detailTab).toHaveAttribute('aria-selected', 'true')

    // Activity tab available but not selected
    const activityTab = within(dialog).getByRole('tab', { name: 'Activity' })
    expect(activityTab).toHaveAttribute('aria-selected', 'false')

    // Shared summary: product name and Design Name visible above tabs
    expect(within(dialog).getByText('Sample Product')).toBeDefined()
    expect(within(dialog).getByText('Front panel')).toBeDefined()

    // Production Summary visible in detail tab content
    expect(within(dialog).getByText('Production Summary')).toBeDefined()

    // Workflow absent (inactive tab)
    expect(within(dialog).queryByText('Workflow')).toBeNull()
  })

  // ---- Mobile: closing clears task param ----
  it('below-lg: closing the dialog clears the task param and returns to task list', async () => {
    setPhone(true)
    renderPage()

    const taskRow = screen.getByText('Sample Product')
    await userEvent.click(taskRow.closest('button') ?? taskRow)

    const dialog = await screen.findByRole('dialog')
    const closeButton = within(dialog).getByRole('button', { name: 'Close' })
    await userEvent.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    // Task list still visible
    expect(screen.getByRole('tab', { name: /Active Tasks/i })).toBeDefined()

    // Task param is cleared
    expect(queryStateStore.store.task).toBeNull()
  })

  // ---- Mobile: pre-seeded valid task opens Sheet ----
  it('below-lg: pre-seeded valid task query opens the Sheet immediately with Task Detail', () => {
    queryStateStore.store = { q: '', task: 'task-queued' }
    setPhone(true)
    renderPage()

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeDefined()

    const detailTab = within(dialog).getByRole('tab', { name: 'Task Detail' })
    expect(detailTab).toHaveAttribute('aria-selected', 'true')

    // Shared summary visible
    expect(within(dialog).getByText('Sample Product')).toBeDefined()
    expect(within(dialog).getByText('Front panel')).toBeDefined()
  })

  // ---- Mobile: invalid pre-seeded task does NOT open Sheet ----
  it('below-lg: invalid pre-seeded task param does not open Sheet or select first task', () => {
    queryStateStore.store = { q: '', task: 'invalid-task-id' }
    setPhone(true)
    renderPage()

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  // ---- Mobile: Activity tab preserves shared summary ----
  it('below-lg: switching to Activity preserves shared summary and shows Workflow without Production Summary', async () => {
    setPhone(true)
    renderPage()

    const taskRow = screen.getByText('Sample Product')
    await userEvent.click(taskRow.closest('button') ?? taskRow)

    const dialog = await screen.findByRole('dialog')

    // Initially on Task Detail
    const detailTab = within(dialog).getByRole('tab', { name: 'Task Detail' })
    expect(detailTab).toHaveAttribute('aria-selected', 'true')
    expect(within(dialog).getByText('Sample Product')).toBeDefined()
    expect(within(dialog).getByText('Front panel')).toBeDefined()
    expect(within(dialog).queryByText('Workflow')).toBeNull()

    // Switch to Activity
    const activityTab = within(dialog).getByRole('tab', { name: 'Activity' })
    await userEvent.click(activityTab)

    expect(activityTab).toHaveAttribute('aria-selected', 'true')
    expect(detailTab).toHaveAttribute('aria-selected', 'false')

    // Shared summary persists
    expect(within(dialog).getByText('Sample Product')).toBeDefined()
    expect(within(dialog).getByText('Front panel')).toBeDefined()

    // Workflow visible
    expect(within(dialog).getByText('Workflow')).toBeDefined()

    // Production Summary absent (detail-only content)
    expect(within(dialog).queryByText('Production Summary')).toBeNull()
  })

  // ---- Mobile: switching back restores detail without duplicating summary ----
  it('below-lg: switching back to Task Detail restores content without duplicating shared summary', async () => {
    setPhone(true)
    renderPage()

    const taskRow = screen.getByText('Sample Product')
    await userEvent.click(taskRow.closest('button') ?? taskRow)

    const dialog = await screen.findByRole('dialog')

    // Switch to Activity then back to Task Detail
    const activityTab = within(dialog).getByRole('tab', { name: 'Activity' })
    await userEvent.click(activityTab)
    expect(within(dialog).getByText('Workflow')).toBeDefined()

    const detailTab = within(dialog).getByRole('tab', { name: 'Task Detail' })
    await userEvent.click(detailTab)

    // Product name appears exactly once — shared summary only, not duplicated in detail
    expect(within(dialog).getAllByText('Sample Product')).toHaveLength(1)
    // Design Name still visible from shared summary
    expect(within(dialog).getByText('Front panel')).toBeDefined()
    // Production Summary restored
    expect(within(dialog).getByText('Production Summary')).toBeDefined()
    // Workflow gone
    expect(within(dialog).queryByText('Workflow')).toBeNull()
  })

  // ---- Mobile: Design Name persists across tab switch ----
  it('below-lg: Design Name remains visible in shared summary across all tab switches', async () => {
    setPhone(true)
    renderPage()

    const taskRow = screen.getByText('Sample Product')
    await userEvent.click(taskRow.closest('button') ?? taskRow)

    const dialog = await screen.findByRole('dialog')

    // Design Name visible on Task Detail
    expect(within(dialog).getByText('Front panel')).toBeDefined()

    // Switch to Activity — still visible
    const activityTab = within(dialog).getByRole('tab', { name: 'Activity' })
    await userEvent.click(activityTab)
    expect(within(dialog).getByText('Front panel')).toBeDefined()

    // Switch back to Task Detail — still visible
    const detailTab = within(dialog).getByRole('tab', { name: 'Task Detail' })
    await userEvent.click(detailTab)
    expect(within(dialog).getByText('Front panel')).toBeDefined()
  })

  // ---- Mobile: reopen resets to Task Detail with shared summary ----
  it('below-lg: closing then reopening resets tab to Task Detail with shared summary intact', async () => {
    setPhone(true)
    renderPage()

    // Open Sheet and switch to Activity
    const taskRow = screen.getByText('Sample Product')
    await userEvent.click(taskRow.closest('button') ?? taskRow)

    const dialog = await screen.findByRole('dialog')
    const activityTab = within(dialog).getByRole('tab', { name: 'Activity' })
    await userEvent.click(activityTab)
    expect(activityTab).toHaveAttribute('aria-selected', 'true')

    // Close
    const closeButton = within(dialog).getByRole('button', { name: 'Close' })
    await userEvent.click(closeButton)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    // Reopen
    await userEvent.click(taskRow.closest('button') ?? taskRow)
    const reopenedDialog = await screen.findByRole('dialog')

    // Task Detail tab selected again
    const detailTab = within(reopenedDialog).getByRole('tab', {
      name: 'Task Detail',
    })
    expect(detailTab).toHaveAttribute('aria-selected', 'true')

    const reopenedActivity = within(reopenedDialog).getByRole('tab', {
      name: 'Activity',
    })
    expect(reopenedActivity).toHaveAttribute('aria-selected', 'false')

    // Shared summary visible
    expect(within(reopenedDialog).getByText('Sample Product')).toBeDefined()
    expect(within(reopenedDialog).getByText('Front panel')).toBeDefined()
    // Production Summary in detail content
    expect(within(reopenedDialog).getByText('Production Summary')).toBeDefined()
  })

  // ---- Mobile: both tab bodies never appear simultaneously ----
  it('below-lg: tab bodies never render simultaneously — only the active tab content is present', async () => {
    setPhone(true)
    renderPage()

    const taskRow = screen.getByText('Sample Product')
    await userEvent.click(taskRow.closest('button') ?? taskRow)

    const dialog = await screen.findByRole('dialog')

    // On Task Detail: Production Summary present, Workflow absent
    expect(within(dialog).getByText('Production Summary')).toBeDefined()
    expect(within(dialog).queryByText('Workflow')).toBeNull()

    // Switch to Activity: Workflow present, Production Summary absent
    const activityTab = within(dialog).getByRole('tab', { name: 'Activity' })
    await userEvent.click(activityTab)

    expect(within(dialog).getByText('Workflow')).toBeDefined()
    expect(within(dialog).queryByText('Production Summary')).toBeNull()
  })

  it('wide desktop renders three inline columns without detail tabs', async () => {
    renderPage()

    const taskRow = screen.getByText('Sample Product')
    await userEvent.click(taskRow.closest('button') ?? taskRow)

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Task Detail' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Activity' })).toBeNull()
    expect(screen.getByText('Production Summary')).toBeDefined()
    expect(screen.getByText('Workflow')).toBeDefined()
  })

  it('tablet and smaller desktop hide detail tabs until a task is selected', async () => {
    setTwoColumn()
    renderPage()

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Task Detail' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Activity' })).toBeNull()
    expect(screen.getByText('No tasks yet')).toBeDefined()
    const taskRow = screen.getByText('Sample Product')
    await userEvent.click(taskRow.closest('button') ?? taskRow)

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('tab', { name: 'Task Detail' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('Production Summary')).toBeDefined()
    expect(screen.queryByText('Workflow')).toBeNull()

    await userEvent.click(screen.getByRole('tab', { name: 'Activity' }))

    expect(screen.getByText('Workflow')).toBeDefined()
    expect(screen.queryByText('Production Summary')).toBeNull()
  })

  it('tablet task selection resets the combined pane to Task Detail', async () => {
    setTwoColumn()
    renderPage()

    const sampleRow = screen.getByText('Sample Product')
    await userEvent.click(sampleRow.closest('button') ?? sampleRow)
    await userEvent.click(screen.getByRole('tab', { name: 'Activity' }))

    const priorityRow = screen.getByText('Priority Product')
    await userEvent.click(priorityRow.closest('button') ?? priorityRow)

    expect(screen.getByRole('tab', { name: 'Task Detail' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Activity' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(
      screen.getByRole('button', { name: 'Advance to Cutting' }),
    ).toBeDefined()
  })

  it('phone mode keeps the queue in one column and opens task detail in a full Sheet', async () => {
    setPhone(true)
    renderPage()

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Task Detail' })).toBeNull()

    const taskRow = screen.getByText('Sample Product')
    await userEvent.click(taskRow.closest('button') ?? taskRow)

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('tab', { name: 'Task Detail' }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(within(dialog).getByText('Production Summary')).toBeDefined()
  })
})
