import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import type { OrderTaskEvent } from '../model'
import { OrderTimeline } from './order-timeline'

const events: OrderTaskEvent[] = [
  {
    id: 'act-1',
    taskId: 't1',
    taskNumber: 'TSK-1',
    productName: 'Custom T-Shirt',
    type: 'stage_transition',
    fromStageName: null,
    toStageName: 'Design',
    createdAt: new Date('2026-05-10'),
  },
  {
    id: 'act-2',
    taskId: 't1',
    taskNumber: 'TSK-1',
    productName: 'Custom T-Shirt',
    type: 'stage_transition',
    fromStageName: 'Design',
    toStageName: 'Production',
    createdAt: new Date('2026-05-12'),
  },
]

const enMessages = {}

describe('OrderTimeline', () => {
  it('renders stage transition events', () => {
    render(
      <IntlProvider locale="en" messages={enMessages}>
        <OrderTimeline events={events} />
      </IntlProvider>,
    )
    expect(screen.getAllByText('TSK-1').length).toBe(2)
    expect(screen.getByText('Design → Production')).toBeInTheDocument()
    expect(screen.getByText('Queue → Design')).toBeInTheDocument()
  })
})
