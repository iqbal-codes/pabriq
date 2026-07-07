import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const rootRoute = createRootRoute({
  component: () => (
    <div>
      <Outlet />
    </div>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <div>Dashboard</div>,
})

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: () => <div>Page not found</div>,
})

const routeTree = rootRoute.addChildren([indexRoute, notFoundRoute])

function renderRouter(historyEntries: string[]) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: historyEntries }),
  })
  return render(<RouterProvider router={router} />)
}

describe('Invoice routes disabled', () => {
  it('lands on 404/not found for /invoices', async () => {
    await act(async () => {
      renderRouter(['/invoices'])
    })
    expect(await screen.findByText('Not Found')).toBeDefined()
  })

  it('lands on 404/not found for /invoices/new', async () => {
    await act(async () => {
      renderRouter(['/invoices/new'])
    })
    expect(await screen.findByText('Not Found')).toBeDefined()
  })

  it('lands on 404/not found for /invoices/inv-123', async () => {
    await act(async () => {
      renderRouter(['/invoices/inv-123'])
    })
    expect(await screen.findByText('Not Found')).toBeDefined()
  })
})
