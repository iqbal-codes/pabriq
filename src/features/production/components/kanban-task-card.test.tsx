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
  description: null,
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
      taskNumber: 'TSK-5',
      context: {
        productName: 'Custom T-Shirt',
        customerName: 'Acme Corp',
        orderNumber: 'ORD-001',
        quantity: 500,
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
  production: {},
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

  it('renders customer name', () => {
    renderCard(createMockTask())
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument()
  })

  it('renders quantity', () => {
    renderCard(createMockTask())
    expect(screen.getByText(/500/)).toBeInTheDocument()
  })

  it('renders status badge', () => {
    renderCard(createMockTask())
    expect(screen.getByText('queued')).toBeInTheDocument()
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
