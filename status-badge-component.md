# StatusBadge Component

## Files Found

1. `src/components/status-badge.tsx` — main component
2. `src/components/status-badge.test.tsx` — unit tests

---

## Full Content: `src/components/status-badge.tsx`

```tsx
import { useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'

type StatusVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'

const statusMap: Record<string, StatusVariant> = {
  draft: 'secondary',
  pending: 'outline',
  approved: 'default',
  production: 'warning',
  in_delivery: 'default',
  completed: 'success',
  cancelled: 'destructive',
  active: 'success',
  inactive: 'secondary',
  paid: 'success',
  partially_paid: 'warning',
  unpaid: 'outline',
  void: 'destructive',
  pendingPayment: 'warning',
  overdue: 'destructive',
  failed: 'destructive',
}

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('status')
  const variant = statusMap[status] ?? 'outline'
  const label =
    status in statusMap
      ? t(
          status as
            | 'draft'
            | 'pending'
            | 'approved'
            | 'production'
            | 'in_delivery'
            | 'completed'
            | 'cancelled'
            | 'active'
            | 'inactive'
            | 'paid'
            | 'partially_paid'
            | 'unpaid'
            | 'void'
            | 'pendingPayment'
            | 'overdue'
            | 'failed',
        )
      : status
  return <Badge variant={variant as never}>{label}</Badge>
}
```

---

## Full Content: `src/components/status-badge.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './status-badge'

const testMessages = {
  status: {
    draft: 'Draft',
    pending: 'Pending',
    approved: 'Approved',
    production: 'In Production',
    in_delivery: 'In Delivery',
    completed: 'Completed',
    cancelled: 'Cancelled',
    active: 'Active',
    inactive: 'Inactive',
    paid: 'Paid',
    overdue: 'Overdue',
    failed: 'Failed',
  },
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <IntlProvider locale="en" messages={testMessages}>
      {children}
    </IntlProvider>
  )
}

describe('StatusBadge', () => {
  it('renders the status label for a known status', () => {
    render(
      <TestWrapper>
        <StatusBadge status="draft" />
      </TestWrapper>,
    )
    expect(screen.getByText('Draft')).toBeDefined()
  })

  it('renders fallback label for an unknown status', () => {
    render(
      <TestWrapper>
        <StatusBadge status="unknown" />
      </TestWrapper>,
    )
    expect(screen.getByText('unknown')).toBeDefined()
  })

  it('covers the full Pabriq order lifecycle statuses', () => {
    const statuses = [
      'draft',
      'pending',
      'approved',
      'production',
      'in_delivery',
      'completed',
      'cancelled',
    ]
    for (const s of statuses) {
      render(
        <TestWrapper>
          <StatusBadge status={s} />
        </TestWrapper>,
      )
    }
    expect(screen.getByText('Draft')).toBeDefined()
    expect(screen.getByText('Pending')).toBeDefined()
    expect(screen.getByText('Approved')).toBeDefined()
    expect(screen.getByText('In Production')).toBeDefined()
    expect(screen.getByText('In Delivery')).toBeDefined()
    expect(screen.getByText('Completed')).toBeDefined()
    expect(screen.getByText('Cancelled')).toBeDefined()
  })
})
```

---

## Summary

- **Path:** `src/components/status-badge.tsx` (component) and `src/components/status-badge.test.tsx` (tests)
- **Purpose:** Renders a `<Badge>` with a color variant mapped from a status key, with i18n support via `use-intl`.
- **Key details:**
  - `StatusVariant` type defines 6 badge variants: `default`, `secondary`, `destructive`, `outline`, `success`, `warning`
  - `statusMap` maps 16 known status strings to their corresponding `Badge` variant
  - Unknown statuses fall back to `outline` variant and display the raw status string as label
  - Uses `useTranslations('status')` for internationalized labels
