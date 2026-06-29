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
    openTask: 'Open task {task}',
  },
  status: {
    in_progress: 'In Progress',
    queued: 'Queued',
    pending_approval: 'Pending Approval',
    completed: 'Completed',
  },
  common: {
    pcs: 'pcs',
  },
}

function renderCard(task: BoardTask, onClick = vi.fn()) {
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
    expect(screen.getByText('ORD-001')).toBeInTheDocument()
  })

  it('renders product name', () => {
    renderCard(createMockTask())
    expect(screen.getByText('Custom T-Shirt')).toBeInTheDocument()
  })

  it('does not render customer name on the compact card', () => {
    renderCard(createMockTask())
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument()
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
    const { rerender } = render(
      <IntlProvider locale="en" messages={enMessages}>
        <KanbanTaskCard
          task={createMockTask({ priority: false })}
          onClick={vi.fn()}
        />
      </IntlProvider>,
    )
    expect(screen.queryByText('Priority')).not.toBeInTheDocument()

    rerender(
      <IntlProvider locale="en" messages={enMessages}>
        <KanbanTaskCard
          task={createMockTask({ priority: true })}
          onClick={vi.fn()}
        />
      </IntlProvider>,
    )
    expect(screen.getByText('Priority')).toBeInTheDocument()
  })

  it('renders as a keyboard-focusable button when onClick is provided', () => {
    renderCard(createMockTask())
    const button = screen.getByRole('button', { name: 'Open task TSK-5' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('tabindex', '0')
  })

  it('does not expose button semantics without onClick', () => {
    render(
      <IntlProvider locale="en" messages={enMessages}>
        <KanbanTaskCard task={createMockTask()} />
      </IntlProvider>,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onClick when Enter is pressed', async () => {
    const { onClick } = renderCard(createMockTask())
    const button = screen.getByRole('button', { name: 'Open task TSK-5' })
    button.focus()
    await userEvent.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledWith('task-1')
  })

  it('calls onClick when Space is pressed', async () => {
    const { onClick } = renderCard(createMockTask())
    const button = screen.getByRole('button', { name: 'Open task TSK-5' })
    button.focus()
    await userEvent.keyboard('{Space}')
    expect(onClick).toHaveBeenCalledWith('task-1')
  })
})
