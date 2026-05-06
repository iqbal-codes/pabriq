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
    expect(screen.getByText('TSK-5')).toBeInTheDocument()
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
})
