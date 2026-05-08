import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import type { BoardTask, Stage } from '../model'
import { KanbanColumn } from './kanban-column'

const stage: Stage = {
  id: 'stage-1',
  orgId: 'org-1',
  name: 'Production',
  board: 'pre_production',
  description: null,
  needApproval: false,
  requirements: [],
  orderIndex: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function createTask(id: string): BoardTask {
  return {
    task: {
      id,
      orgId: 'org-1',
      orderId: 'order-1',
      board: 'pre_production',
      stageId: stage.id,
      status: 'in_progress',
      taskNumber: `TSK-${id}`,
      lineItemId: 'line-item-1',
      context: { productName: `Product ${id}`, customerName: 'Acme Corp' },
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    },
    stage,
  }
}

function renderColumn(
  tasks: BoardTask[],
  props: { title: string; count: number },
) {
  return render(
    <IntlProvider locale="en" messages={{ production: {} }}>
      <KanbanColumn tasks={tasks} title={props.title} count={props.count} />
    </IntlProvider>,
  )
}

describe('KanbanColumn', () => {
  it('renders title and count', () => {
    renderColumn([createTask('1')], { title: 'Queue', count: 1 })
    expect(screen.getByText('Queue')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders task cards for each task', () => {
    const tasks = [createTask('1'), createTask('2')]
    renderColumn(tasks, { title: 'Queue', count: 2 })
    expect(screen.getByText('Product 1')).toBeInTheDocument()
    expect(screen.getByText('Product 2')).toBeInTheDocument()
  })

  it('shows empty state when no tasks', () => {
    renderColumn([], { title: 'Queue', count: 0 })
    expect(screen.getByText('No tasks')).toBeInTheDocument()
  })
})
