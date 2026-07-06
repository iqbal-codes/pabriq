import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { TaskStageCount } from '#/features/dashboard/model'
import { TaskStageList } from './task-stage-list'

function item(
  overrides: Partial<TaskStageCount> & { id: string },
): TaskStageCount {
  return {
    name: 'default-name',
    board: 'pre_production',
    count: 1,
    ...overrides,
  }
}

const queueItem = item({ id: 'queue', name: 'queue-internal' })
const readyItem = item({ id: 'ready_for_production', name: 'rfp-internal' })
const doneItem = item({ id: 'done', name: 'done-internal' })
const normalItem = item({
  id: 'custom-stage-42',
  name: 'Custom Stage',
  board: 'production',
})

const items: TaskStageCount[] = [queueItem, readyItem, doneItem, normalItem]

describe('TaskStageList', () => {
  it('renders queueLabel for the queue synthetic id', () => {
    render(
      <TaskStageList
        items={items}
        queueLabel="Queued Tasks"
        readyForProductionLabel="Ready"
        doneLabel="Completed"
        locale="en"
      />,
    )
    expect(screen.getByText('Queued Tasks')).toBeInTheDocument()
    expect(screen.queryByText('queue-internal')).not.toBeInTheDocument()
  })

  it('renders readyForProductionLabel for the ready_for_production synthetic id', () => {
    render(
      <TaskStageList
        items={items}
        queueLabel="Queued Tasks"
        readyForProductionLabel="Ready For Production"
        doneLabel="Completed"
        locale="en"
      />,
    )
    expect(screen.getByText('Ready For Production')).toBeInTheDocument()
    expect(screen.queryByText('rfp-internal')).not.toBeInTheDocument()
  })

  it('renders doneLabel for the done synthetic id', () => {
    render(
      <TaskStageList
        items={items}
        queueLabel="Queued Tasks"
        readyForProductionLabel="Ready"
        doneLabel="Done"
        locale="en"
      />,
    )
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.queryByText('done-internal')).not.toBeInTheDocument()
  })

  it('renders item.name for a normal (non-synthetic) stage', () => {
    render(
      <TaskStageList
        items={items}
        queueLabel="Queued Tasks"
        readyForProductionLabel="Ready"
        doneLabel="Completed"
        locale="en"
      />,
    )
    expect(screen.getByText('Custom Stage')).toBeInTheDocument()
  })
})
