import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from '#/components/status-badge'
import en from '#/messages/en'
import id from '#/messages/id'
import { OrderStatusBadge } from './order-status-badge'

describe('OrderStatusBadge', () => {
  it('uses order-specific completed labels without changing task status labels', () => {
    render(
      <IntlProvider locale="id" messages={id}>
        <div>
          <OrderStatusBadge status="completed" />
          <StatusBadge status="completed" />
        </div>
      </IntlProvider>,
    )

    expect(screen.getByText('Selesai')).toBeInTheDocument()
    expect(screen.getByText('Siap Kirim')).toBeInTheDocument()
  })

  it('uses Completed for completed orders in English', () => {
    render(
      <IntlProvider locale="en" messages={en}>
        <OrderStatusBadge status="completed" />
      </IntlProvider>,
    )

    expect(screen.getByText('Completed')).toBeInTheDocument()
  })
})
