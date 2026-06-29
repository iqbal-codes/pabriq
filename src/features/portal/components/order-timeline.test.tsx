import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import type { OrderTaskEvent } from '../model'
import { OrderTimeline } from './order-timeline'

const events: OrderTaskEvent[] = [
  {
    id: 'act-1',
    taskId: 't1',
    lineItemId: 'li-1',
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
    lineItemId: 'li-1',
    taskNumber: 'TSK-1',
    productName: 'Custom T-Shirt',
    type: 'stage_transition',
    fromStageName: 'Design',
    toStageName: 'Production',
    createdAt: new Date('2026-05-12'),
  },
  {
    id: 'act-3',
    taskId: 't1',
    lineItemId: 'li-1',
    taskNumber: 'TSK-1',
    productName: 'Custom T-Shirt',
    type: 'stage_transition',
    fromStageName: 'Production',
    toStageName: null,
    createdAt: new Date('2026-05-14'),
    requirementResponses: [
      {
        stageName: 'Design',
        responses: [
          {
            requirementName: 'Artwork',
            value: 'logo.png',
            assetIds: [],
          },
        ],
      },
    ],
  },
]

const enMessages = {
  portal: {
    timelineQueued: 'Added to queue',
    timelineStarted: 'Started {stage}',
    timelineCompleted: '{stage} completed.',
    timelineTransition: '{from} completed, started {to}',
    timelineStageFallback: 'Stage',
    requirementsSubmitted: 'Requirements submitted',
  },
}

describe('OrderTimeline', () => {
  it('renders stage transition events with i18n descriptions', () => {
    render(
      <IntlProvider locale="en" messages={enMessages}>
        <OrderTimeline events={events} />
      </IntlProvider>,
    )
    expect(screen.getAllByText('TSK-1').length).toBe(3)
    expect(screen.getByText('Started Design')).toBeInTheDocument()
    expect(
      screen.getByText('Design completed, started Production'),
    ).toBeInTheDocument()
    expect(screen.getByText('Requirements submitted')).toBeInTheDocument()
  })
})
