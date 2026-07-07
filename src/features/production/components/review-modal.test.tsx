import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { ReviewModal } from './review-modal'

const enMessages = {
  production: {
    reviewAdvancement: 'Review Advancement',
    approve: 'Approve & Advance',
    reject: 'Reject',
    reviewNotes: 'Review Notes',
    reviewTaskLabel: 'Task',
    reviewStageLabel: 'Stage',
    fulfilledRequirements: 'Fulfilled Requirements',
    attachmentCount: '{count, plural, one {# file} other {# files}}',
    close: 'Close',
    commentPlaceholder: 'Type a comment...',
  },
}

describe('ReviewModal', () => {
  it('renders task info and buttons', () => {
    const onApprove = vi.fn()
    const onReject = vi.fn()
    render(
      <IntlProvider locale="en" messages={enMessages}>
        <ReviewModal
          taskId="task-1"
          taskNumber="TSK-5"
          stageName="Production"
          open={true}
          onOpenChange={vi.fn()}
          onApprove={onApprove}
          onReject={onReject}
        />
      </IntlProvider>,
    )
    expect(screen.getByText(/TSK-5/)).toBeInTheDocument()
    expect(screen.getByText('Approve & Advance')).toBeInTheDocument()
    expect(screen.getByText('Reject')).toBeInTheDocument()
  })

  it('calls onApprove when approved', async () => {
    const onApprove = vi.fn()
    render(
      <IntlProvider locale="en" messages={enMessages}>
        <ReviewModal
          taskId="task-1"
          taskNumber="TSK-5"
          stageName="Production"
          open={true}
          onOpenChange={vi.fn()}
          onApprove={onApprove}
          onReject={vi.fn()}
        />
      </IntlProvider>,
    )
    await userEvent.click(screen.getByText('Approve & Advance'))
    expect(onApprove).toHaveBeenCalledWith('task-1', undefined)
  })

  it('calls onReject when rejected', async () => {
    const onReject = vi.fn()
    render(
      <IntlProvider locale="en" messages={enMessages}>
        <ReviewModal
          taskId="task-1"
          taskNumber="TSK-5"
          stageName="Production"
          open={true}
          onOpenChange={vi.fn()}
          onApprove={vi.fn()}
          onReject={onReject}
        />
      </IntlProvider>,
    )
    await userEvent.click(screen.getByText('Reject'))
    expect(onReject).toHaveBeenCalledWith('task-1', undefined)
  })

  it('renders human-readable requirement labels', () => {
    render(
      <IntlProvider locale="en" messages={enMessages}>
        <ReviewModal
          taskId="task-1"
          taskNumber="TSK-5"
          stageName="Production"
          requirements={[
            {
              id: 'req-proof',
              label: 'Proof approved',
              type: 'text',
              required: true,
            },
          ]}
          requirementResponses={{ 'req-proof': { value: 'Yes' } }}
          open={true}
          onOpenChange={vi.fn()}
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      </IntlProvider>,
    )
    expect(screen.getByText('Proof approved')).toBeInTheDocument()
    expect(screen.getByText(': Yes')).toBeInTheDocument()
    expect(screen.queryByText('req-proof')).not.toBeInTheDocument()
  })

  it('falls back to raw ID for stale/corrupted requirement data', () => {
    render(
      <IntlProvider locale="en" messages={enMessages}>
        <ReviewModal
          taskId="task-1"
          taskNumber="TSK-5"
          stageName="Production"
          requirements={[]}
          requirementResponses={{ 'missing-req': { value: 'Still visible' } }}
          open={true}
          onOpenChange={vi.fn()}
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      </IntlProvider>,
    )
    expect(screen.getByText('missing-req')).toBeInTheDocument()
    expect(screen.getByText(': Still visible')).toBeInTheDocument()
  })

  it('approve and reject buttons have aria-describedby', () => {
    render(
      <IntlProvider locale="en" messages={enMessages}>
        <ReviewModal
          taskId="task-1"
          taskNumber="TSK-5"
          stageName="Production"
          open={true}
          onOpenChange={vi.fn()}
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      </IntlProvider>,
    )
    expect(screen.getByText('Approve & Advance')).toHaveAttribute(
      'aria-describedby',
      'review-action-description',
    )
    expect(screen.getByText('Reject')).toHaveAttribute(
      'aria-describedby',
      'review-action-description',
    )
  })
})
