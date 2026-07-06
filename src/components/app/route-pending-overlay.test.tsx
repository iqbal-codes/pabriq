import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { RoutePendingOverlay } from './route-pending-overlay'

type MockRouterState = {
  isLoading: boolean
  status: 'idle' | 'pending'
}

let routerState: MockRouterState = {
  isLoading: false,
  status: 'idle',
}

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({
    select,
  }: {
    select: (state: MockRouterState) => boolean
  }) => select(routerState),
}))

const testMessages = {
  common: {
    loading: 'Loading',
  },
}

function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <IntlProvider locale="en" messages={testMessages}>
      {children}
    </IntlProvider>
  )
}

describe('RoutePendingOverlay', () => {
  it('renders nothing when the router is idle on the resolved route', () => {
    routerState = {
      isLoading: false,
      status: 'idle',
    }

    render(
      <TestWrapper>
        <RoutePendingOverlay />
      </TestWrapper>,
    )

    expect(screen.queryByText('Loading')).toBeNull()
  })

  it('renders an overlay when navigation is pending for a different location', () => {
    routerState = {
      isLoading: true,
      status: 'pending',
    }

    render(
      <TestWrapper>
        <RoutePendingOverlay />
      </TestWrapper>,
    )

    expect(screen.getByText('Loading')).toBeDefined()
    expect(screen.getByRole('status', { name: 'Loading' })).toBeDefined()
  })
})
