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
      priority: false,
      context: { productName: `Product ${id}`, customerName: 'Acme Corp' },
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    },
    stage,
  }
}

const enMessages = {
  production: {
    noTasks: 'No tasks',
    priorityBadge: 'Priority',
    openTask: 'Open task {task}',
    columnTaskCount: '{column}: {count, plural, one {# task} other {# tasks}}',
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

function renderColumn(
  tasks: BoardTask[],
  props: { title: string; count: number },
) {
  return render(
    <IntlProvider locale="en" messages={enMessages}>
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

  it('count badge has accessible name', () => {
    renderColumn([createTask('1')], { title: 'Queue', count: 1 })
    expect(screen.getByLabelText('Queue: 1 task')).toBeInTheDocument()
  })

  it('does not render side-stripe border', () => {
    const { container } = renderColumn([createTask('1')], {
      title: 'Queue',
      count: 1,
    })
    expect(container.querySelector('[class*="border-l-4"]')).toBeNull()
  })
})
