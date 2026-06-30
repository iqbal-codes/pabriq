import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import { formatOrderDeadlineCell, getOrderColumns } from './order-table-columns'

const t = (key: string) => key

function getColumns() {
  return getOrderColumns(t)
}

function findByAccessor(key: string) {
  return getColumns().find(
    (c): c is Extract<typeof c, { accessorKey: string }> =>
      'accessorKey' in c && c.accessorKey === key,
  )
}

describe('getOrderColumns', () => {
  it('sets customerName mobileRole to subtitle', () => {
    const col = findByAccessor('customerName')
    expect(col?.meta?.mobileRole).toBe('subtitle')
  })

  it('sets createdAt mobileRole to hidden', () => {
    const col = findByAccessor('createdAt')
    expect(col?.meta?.mobileRole).toBe('hidden')
  })

  it('sets total align to end', () => {
    const col = findByAccessor('total')
    expect(col?.meta?.align).toBe('end')
  })

  it('sets orderNumber mobileRole to title', () => {
    const col = findByAccessor('orderNumber')
    expect(col?.meta?.mobileRole).toBe('title')
  })

  it('sets maxDeadline label to deadline', () => {
    const col = findByAccessor('maxDeadline')
    expect(col?.meta?.label).toBe('deadline')
  })
  it('sets shippedAt label to completedAt', () => {
    const col = findByAccessor('shippedAt')
    expect(col?.meta?.label).toBe('completedAt')
  })

  it('renders overdue deadline cell with overdue text for non-completed order', () => {
    const pastDate = new Date('2020-01-01')
    const { container } = render(
      <IntlProvider locale="en" messages={{}}>
        <div>{formatOrderDeadlineCell(pastDate, 'pending', t)}</div>
      </IntlProvider>,
    )

    expect(screen.getByText('overdueDeadline')).toBeDefined()
    expect(container.textContent).toContain('2020')
  })

  it('does not show overdue for completed order past deadline', () => {
    const pastDate = new Date('2020-01-01')
    const { container } = render(
      <IntlProvider locale="en" messages={{}}>
        <div>{formatOrderDeadlineCell(pastDate, 'completed', t)}</div>
      </IntlProvider>,
    )

    expect(screen.queryByText('overdueDeadline')).toBeNull()
    expect(container.textContent).toContain('2020')
  })
})
