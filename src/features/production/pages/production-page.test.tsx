import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductionPage } from './production-page'
import type { Role } from '#/features/permissions/model'

vi.mock('nuqs', () => {
  const React = require('react')
  const parseAsStringEnum = (_values: readonly string[]) => ({
    withDefault: (value: string) => value,
  })
  return {
    parseAsStringEnum,
    useQueryState: (_key: string, defaultValue: string) => {
      const [state, setState] = React.useState(defaultValue)
      return [state, (v: string | null) => setState(v ?? defaultValue)]
    },
  }
})

vi.mock('../hooks', () => ({
  useTaskCounts: () => ({
    data: { active: 5, archived: 2 },
    isLoading: false,
  }),
}))

const mockKanbanPage = vi.hoisted(() =>
  vi.fn(({ orgId, role }: { orgId: string; role: Role }) => (
    <div data-testid="kanban-page" data-org-id={orgId} data-role={role}>
      Kanban Page Mock
    </div>
  )),
)

vi.mock('./kanban-page', () => ({
  KanbanPage: mockKanbanPage,
}))

vi.mock('./archived-tasks-page', () => ({
  ArchivedTasksPage: ({ orgId }: { orgId: string }) => (
    <div data-testid="archived-tasks-page" data-org-id={orgId}>
      Archived Tasks Mock
    </div>
  ),
}))

const enMessages = {
  production: {
    kanbanTitle: 'Kanban',
    tabActive: 'Active Tasks',
    tabArchive: 'Archive',
  },
}

function renderPage(props: { orgId: string; role: Role }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={enMessages}>
        <ProductionPage {...props} />
      </IntlProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockKanbanPage.mockClear()
})

describe('ProductionPage', () => {
  it('renders kanban title and tab triggers', () => {
    renderPage({ orgId: 'org-1', role: 'member' })
    expect(screen.getByText('Kanban')).toBeDefined()
    expect(screen.getByText('Active Tasks')).toBeDefined()
    expect(screen.getByText('Archive')).toBeDefined()
  })

  it('shows KanbanPage on the active tab by default', () => {
    renderPage({ orgId: 'org-1', role: 'member' })
    expect(screen.getByTestId('kanban-page')).toBeDefined()
    expect(screen.queryByTestId('archived-tasks-page')).not.toBeInTheDocument()
  })

  it('passes orgId and role to KanbanPage', () => {
    renderPage({ orgId: 'org-1', role: 'member' })
    const kanban = screen.getByTestId('kanban-page')
    expect(kanban.getAttribute('data-org-id')).toBe('org-1')
    expect(kanban.getAttribute('data-role')).toBe('member')
  })

  it('renders archived tasks page when archive tab is clicked', async () => {
    renderPage({ orgId: 'org-1', role: 'member' })
    await userEvent.click(screen.getByText('Archive'))
    expect(screen.getByTestId('archived-tasks-page')).toBeDefined()
  })

  it('passes orgId to ArchivedTasksPage', async () => {
    renderPage({ orgId: 'org-1', role: 'member' })
    await userEvent.click(screen.getByText('Archive'))
    const archived = screen.getByTestId('archived-tasks-page')
    expect(archived.getAttribute('data-org-id')).toBe('org-1')
  })
})
