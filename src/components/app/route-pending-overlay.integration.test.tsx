import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import { RoutePendingOverlay } from './route-pending-overlay'

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

function createDeferred() {
  let resolvePromise: (() => void) | null = null
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve
  })

  return {
    promise,
    resolve() {
      resolvePromise?.()
    },
  }
}

function RootLayout() {
  return (
    <div className="relative min-h-24">
      <RoutePendingOverlay />
      <Outlet />
    </div>
  )
}

describe('RoutePendingOverlay integration', () => {
  it('shows the content overlay during a real pending navigation', async () => {
    const pendingNavigation = createDeferred()

    const rootRoute = createRootRoute({ component: RootLayout })
    const fromRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/from',
      component: () => <div>From page</div>,
    })
    const toRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/to',
      beforeLoad: async () => {
        await pendingNavigation.promise
      },
      component: () => <div>To page</div>,
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([fromRoute, toRoute]),
      history: createMemoryHistory({ initialEntries: ['/from'] }),
    })

    await router.load()

    render(
      <TestWrapper>
        <RouterProvider router={router} />
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('From page')).toBeVisible()
      expect(screen.queryByText('Loading')).toBeNull()
    })

    let navigationPromise: Promise<void> | null = null
    act(() => {
      navigationPromise = router.navigate({ href: '/to' })
    })

    await waitFor(() => {
      expect(screen.getByText('Loading')).toBeVisible()
    })
    expect(screen.getByText('From page')).toBeVisible()

    pendingNavigation.resolve()

    await act(async () => {
      await navigationPromise
    })

    await waitFor(() => {
      expect(screen.getByText('To page')).toBeVisible()
    })
    expect(screen.queryByText('Loading')).toBeNull()
  })
})
