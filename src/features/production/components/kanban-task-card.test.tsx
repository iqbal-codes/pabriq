import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import type { BoardTask } from '../model'
import { KanbanTaskCard } from './kanban-task-card'

function createMockTask(overrides: Partial<BoardTask['task']> = {}): BoardTask {
  return {
    task: {
      id: 'task-1',
      orgId: 'org-1',
      orderId: 'order-1',
      board: 'pre_production',
      stageId: 'stage-1',
      status: 'queued',
      taskNumber: 'TSK-5',
      lineItemId: 'line-item-1',
      priority: false,
      context: {
        productName: 'Custom T-Shirt',
        customerName: 'Acme Corp',
        orderNumber: 'ORD-001',
        quantity: 500,
      },
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
      ...overrides,
    },
    stage: null,
  }
}

const enMessages = {
  production: {
    priorityBadge: 'Priority',
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

function renderCard(task: BoardTask) {
  const onClick = vi.fn()
  const result = render(
    <IntlProvider locale="en" messages={enMessages}>
      <KanbanTaskCard task={task} onClick={onClick} />
    </IntlProvider>,
  )
  return { onClick, result }
}

describe('KanbanTaskCard', () => {
  it('renders task number', () => {
    renderCard(createMockTask())
    expect(screen.getByText('TSK-5')).toBeInTheDocument()
  })

  it('renders order number', () => {
    renderCard(createMockTask())
    expect(screen.getByText(/ORD-001/)).toBeInTheDocument()
  })

  it('renders product name', () => {
    renderCard(createMockTask())
    expect(screen.getByText('Custom T-Shirt')).toBeInTheDocument()
  })

  it('does not render customer name on the compact card', () => {
    renderCard(createMockTask())
    expect(screen.queryByText(/Acme Corp/)).not.toBeInTheDocument()
  })

  it('renders quantity', () => {
    renderCard(createMockTask())
    expect(screen.getByText(/500/)).toBeInTheDocument()
  })

  it('renders status badge', () => {
    renderCard(createMockTask())
    expect(screen.getByText('Queued')).toBeInTheDocument()
  })

  it('renders priority badge only for priority tasks', () => {
    renderCard(createMockTask({ priority: true }))
    expect(screen.getByText('Priority')).toBeInTheDocument()

    renderCard(createMockTask())
    expect(screen.getAllByText('Queued')).toHaveLength(2)
    expect(screen.getAllByText('Custom T-Shirt')).toHaveLength(2)
    expect(screen.getAllByText('TSK-5')).toHaveLength(2)
    expect(screen.getAllByText('ORD-001')).toHaveLength(2)
    expect(screen.getAllByText(/500/)).toHaveLength(2)
    expect(screen.getAllByText('Priority')).toHaveLength(1)
  })

  it('has no action buttons', () => {
    renderCard(createMockTask({ status: 'queued', stageId: null }))
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onClick when card is clicked', async () => {
    const { onClick } = renderCard(createMockTask())
    const text = screen.getByText('TSK-5')
    const card = text.closest('div[class*="cursor-pointer"]')
    expect(card).toBeTruthy()
    if (card) {
      await userEvent.click(card)
      expect(onClick).toHaveBeenCalledWith('task-1')
    }
  })
})
