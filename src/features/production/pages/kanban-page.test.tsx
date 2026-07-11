import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { KanbanPage } from './kanban-page'

const globalModalMock = vi.hoisted(() => ({
  openModal: vi.fn(),
  closeModal: vi.fn(),
  modal: null as string | null,
  modalId: null as string | null,
  isOpen: false,
}))

vi.mock('#/hooks/use-global-overlay', () => ({
  useGlobalModal: () => globalModalMock,
  useGlobalSheet: () => ({
    sheet: null,
    sheetId: null,
    openSheet: vi.fn(),
    closeSheet: vi.fn(),
    isOpen: false,
  }),
}))

const queryStateStore = vi.hoisted(() => ({
  store: {
    q: '',
    stage: '',
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
              context: {},
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
    kanbanTitle: 'Kanban',
    boardPreProduction: 'Pre-Production',
    boardProduction: 'Production',
    tabActive: 'Active Tasks',
    tabArchive: 'Archive',
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
  beforeEach(() => {
    queryStateStore.store = {
      q: '',
      stage: '',
    }
    globalModalMock.openModal.mockClear()
  })

  it('opens task-detail modal when clicking a kanban card', async () => {
    renderPage()
    await userEvent.click(screen.getByText('Open Task'))
    expect(globalModalMock.openModal).toHaveBeenCalledWith(
      'task-detail',
      'task-1',
    )
  })

  it('renders search and stage filter controls', () => {
    renderPage()
    expect(screen.getByPlaceholderText('Search orders...')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveTextContent('All Stages')
  })
})
