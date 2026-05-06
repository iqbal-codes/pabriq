import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import type { BoardTask, Stage } from '../model'
import { KanbanTaskCard } from './kanban-task-card'

const stage: Stage = {
  id: 'stage-1',
  orgId: 'org-1',
  name: 'Production',
  description: 'Production phase',
  needApproval: false,
  requirements: [],
  orderIndex: 1,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function createMockTask(overrides: Partial<BoardTask['task']> = {}): BoardTask {
  return {
    task: {
      id: 'task-1',
      orgId: 'org-1',
      orderId: 'order-1',
      stageId: 'stage-1',
      status: 'queued',
      context: {
        productName: 'Custom T-Shirt',
        customerName: 'Acme Corp',
      },
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    },
    stage,
  }
}

const enMessages = {
  production: {
    startProduction: 'Start Production',
    advanceTo: 'Advance',
    reviewAdvancement: 'Review',
  },
}

function renderCard(task: BoardTask, canApprove = false) {
  const onAdvance = vi.fn()
  const onStart = vi.fn()
  const onReview = vi.fn()
  const result = render(
    <IntlProvider locale="en" messages={enMessages}>
      <KanbanTaskCard
        task={task}
        onAdvance={onAdvance}
        onStart={onStart}
        onReview={onReview}
        canApprove={canApprove}
      />
    </IntlProvider>,
  )
  return { onAdvance, onStart, onReview, result }
}

describe('KanbanTaskCard', () => {
  it('renders product name from context', () => {
    renderCard(createMockTask())
    expect(screen.getByText('Custom T-Shirt')).toBeInTheDocument()
  })

  it('renders customer name from context', () => {
    renderCard(createMockTask())
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('shows Start Production button for queued tasks', () => {
    renderCard(createMockTask({ status: 'queued', stageId: null }))
    expect(screen.getByText('Start Production')).toBeInTheDocument()
  })

  it('shows Advance button for in_progress tasks', () => {
    renderCard(createMockTask({ status: 'in_progress' }))
    expect(screen.getByText('Advance')).toBeInTheDocument()
  })

  it('does not show action buttons for pending_approval', () => {
    renderCard(createMockTask({ status: 'pending_approval' }))
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows Review button for pending_approval when canApprove is true', () => {
    renderCard(createMockTask({ status: 'pending_approval' }), true)
    expect(screen.getByText('Review')).toBeInTheDocument()
  })

  it('does not show action buttons for completed tasks', () => {
    renderCard(createMockTask({ status: 'completed', stageId: null }))
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onStart when Start Production is clicked', async () => {
    const { onStart } = renderCard(
      createMockTask({ status: 'queued', stageId: null }),
    )
    await userEvent.click(screen.getByText('Start Production'))
    expect(onStart).toHaveBeenCalledWith('task-1')
  })

  it('calls onAdvance when Advance is clicked', async () => {
    const { onAdvance } = renderCard(createMockTask({ status: 'in_progress' }))
    await userEvent.click(screen.getByText('Advance'))
    expect(onAdvance).toHaveBeenCalledWith('task-1')
  })

  it('calls onReview when Review is clicked', async () => {
    const { onReview } = renderCard(
      createMockTask({ status: 'pending_approval' }),
      true,
    )
    await userEvent.click(screen.getByText('Review'))
    expect(onReview).toHaveBeenCalledWith('task-1')
  })
})
