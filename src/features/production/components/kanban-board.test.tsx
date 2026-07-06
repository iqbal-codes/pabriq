import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import type { BoardTask, Stage } from '../model'
import { KanbanBoard } from './kanban-board'

const stage1: Stage = {
  id: 's1',
  orgId: 'org-1',
  name: 'Design',
  board: 'pre_production',
  description: null,
  needApproval: false,
  requirements: [],
  orderIndex: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const stage2: Stage = {
  id: 's2',
  orgId: 'org-1',
  name: 'Production',
  board: 'pre_production',
  description: null,
  needApproval: true,
  requirements: [],
  orderIndex: 1,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const prodStage1: Stage = {
  id: 'p1',
  orgId: 'org-1',
  name: 'Print',
  board: 'production',
  description: null,
  needApproval: false,
  requirements: [],
  orderIndex: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const prodStage2: Stage = {
  id: 'p2',
  orgId: 'org-1',
  name: 'Packing',
  board: 'production',
  description: null,
  needApproval: false,
  requirements: [],
  orderIndex: 1,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function atMidnight(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function isoAtDays(offset: number): string {
  const d = atMidnight(new Date())
  d.setDate(d.getDate() + offset)
  return d.toISOString()
}

function createTask(
  id: string,
  status: string,
  stageId: string | null,
): BoardTask {
  const matched = stageId === 's1' ? stage1 : stage2
  return {
    task: {
      id,
      orgId: 'org-1',
      orderId: 'order-1',
      board: 'pre_production',
      stageId,
      status,
      taskNumber: `TSK-${id}`,
      lineItemId: 'line-item-1',
      priority: false,
      context: { productName: `P-${id}`, customerName: 'Acme' },
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    },
    stage: matched,
  }
}

function createProductionTask(
  id: string,
  stage: Stage,
  deadlineOffset: number,
  status: 'completed' | 'in_progress' = 'in_progress',
): BoardTask {
  return {
    task: {
      id,
      orgId: 'org-1',
      orderId: 'order-1',
      board: 'production',
      stageId: stage.id,
      status,
      taskNumber: `TSK-${id}`,
      lineItemId: 'line-item-1',
      priority: false,
      context: {
        productName: `P-${id}`,
        customerName: 'Acme',
        orderNumber: 'ORD-001',
        quantity: 10,
        deadline: isoAtDays(deadlineOffset),
      },
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
    queue: 'Queue',
    done: 'Done',
    noTasks: 'No tasks',
    kanbanTab: 'Kanban',
    priorityBadge: 'Priority',
    productionTasks: 'Production Tasks',
    openTask: 'Open task {task}',
    columnTaskCount: '{column}: {count, plural, one {# task} other {# tasks}}',
    needApproval: 'Requires Approval',
    readyForProduction: 'Ready for Production',
    readyForProductionQueue: 'Queue for {stage}',
    deadlineToday: 'Due today',
    deadlineTomorrow: 'Due tomorrow',
    deadlineDaysLeft: '{days, plural, one {# day left} other {# days left}}',
    deadlineDaysOverdue:
      '{days, plural, one {# day overdue} other {# days overdue}}',
    deadlineLabel: 'Deadline {date}',
    deadlineFinishedEarly:
      '{days, plural, one {Early by # day} other {Early by # days}}',
    deadlineOnTime: 'On time',
    deadlineFinishedLate:
      '{days, plural, one {Late by # day} other {Late by # days}}',
  },
  status: {
    in_progress: 'In Progress',
    queued: 'Queued',
    pending_approval: 'Pending Approval',
    completed: 'Completed',
    ready_for_production: 'Ready for Production',
  },
  common: {
    pcs: 'pcs',
  },
}
function renderBoard(
  data: {
    queued: BoardTask[]
    stages: Map<string, BoardTask[]>
    readyForProduction: BoardTask[]
    done: BoardTask[]
  },
  stages: Stage[] = [stage1, stage2],
) {
  return render(
    <IntlProvider locale="en" messages={enMessages}>
      <KanbanBoard stages={stages} boardData={data} />
    </IntlProvider>,
  )
}

describe.skip('KanbanBoard', () => {
  it('renders Queue column', () => {
    renderBoard({
      queued: [createTask('t1', 'queued', null)],
      stages: new Map(),
      readyForProduction: [],
      done: [],
    })
    expect(screen.getByText('Queue')).toBeInTheDocument()
    expect(screen.getByText('P-t1')).toBeInTheDocument()
  })

  it('renders stage columns in order', () => {
    const stageTasks = new Map<string, BoardTask[]>()
    stageTasks.set('s1', [createTask('t1', 'in_progress', 's1')])
    stageTasks.set('s2', [createTask('t2', 'in_progress', 's2')])

    renderBoard({
      queued: [],
      stages: stageTasks,
      readyForProduction: [],
      done: [],
    })

    expect(screen.getByText('Design')).toBeInTheDocument()
    expect(screen.getByText('Production')).toBeInTheDocument()
    expect(screen.getByText('P-t1')).toBeInTheDocument()
    expect(screen.getByText('P-t2')).toBeInTheDocument()
  })

  it('renders Done column', () => {
    renderBoard({
      queued: [],
      stages: new Map(),
      readyForProduction: [],
      done: [createTask('t1', 'completed', null)],
    })
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('P-t1')).toBeInTheDocument()
  })

  it('renders Ready for Production column', () => {
    renderBoard({
      queued: [],
      stages: new Map(),
      readyForProduction: [createTask('t1', 'ready_for_production', null)],
      done: [],
    })
    expect(screen.getByText('Ready for Production')).toBeInTheDocument()
    expect(screen.getByText('P-t1')).toBeInTheDocument()
  })

  it('renders Ready for Production column even when empty', () => {
    renderBoard({
      queued: [],
      stages: new Map(),
      readyForProduction: [],
      done: [],
    })
    expect(screen.getByText('Ready for Production')).toBeInTheDocument()
  })

  it('board container has region role with accessible name', () => {
    renderBoard({
      queued: [],
      stages: new Map(),
      readyForProduction: [],
      done: [],
    })
    expect(
      screen.getByRole('region', { name: 'Production Tasks' }),
    ).toBeInTheDocument()
  })

  it('renders Requires Approval badge on stage with needApproval', () => {
    renderBoard({
      queued: [],
      stages: new Map(),
      readyForProduction: [],
      done: [],
    })
    // stage2 has needApproval: true
    expect(screen.getByText('Requires Approval')).toBeInTheDocument()
  })

  it('does not render Requires Approval badge on stage without needApproval', () => {
    renderBoard({
      queued: [],
      stages: new Map(),
      readyForProduction: [],
      done: [],
    })
    // Only one badge should appear (stage2 has needApproval: true, stage1 does not)
    const badges = screen.getAllByText('Requires Approval')
    expect(badges).toHaveLength(1)
  })
})

it('uses final-stage deadline copy only on the last production column', () => {
  const stageTasks = new Map<string, BoardTask[]>()
  stageTasks.set('p1', [createProductionTask('prod-1', prodStage1, 2)])
  stageTasks.set('p2', [createProductionTask('prod-2', prodStage2, 2)])

  renderBoard(
    {
      queued: [],
      stages: stageTasks,
      readyForProduction: [],
      done: [],
    },
    [stage1, stage2, prodStage1, prodStage2],
  )

  expect(screen.getByText('2 days left')).toBeInTheDocument()
  expect(screen.getByText('Early by 2 days')).toBeInTheDocument()
})

it('uses deadline outcome copy on done-column cards', () => {
  renderBoard(
    {
      queued: [],
      stages: new Map(),
      readyForProduction: [],
      done: [createProductionTask('done-1', prodStage2, 5, 'completed')],
    },
    [stage1, stage2, prodStage1, prodStage2],
  )

  expect(screen.getByText('Early by 5 days')).toBeInTheDocument()
})
