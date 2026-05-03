import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import { Breadcrumbs } from './breadcrumbs'

const testMessages = {
  breadcrumb: {
    dashboard: 'Dashboard',
    customers: 'Customers',
    detail: 'Detail',
    edit: 'Edit',
    new: 'New',
    orders: 'Orders',
  },
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <IntlProvider locale="en" messages={testMessages}>
      {children}
    </IntlProvider>
  )
}

async function renderBreadcrumbs(
  routes: {
    path: string
    breadcrumb: string
    parentBreadcrumbs?: { label: string; href: string }[]
  }[],
) {
  const rootRoute = createRootRoute()

  const children = routes.map((r) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path: r.path,
      beforeLoad: () => ({
        breadcrumb: r.breadcrumb,
        parentBreadcrumbs: r.parentBreadcrumbs,
      }),
    }),
  )

  const routeTree = rootRoute.addChildren(children)
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [routes[routes.length - 1].path],
    }),
  })

  await router.load()

  return render(
    <TestWrapper>
      <RouterProvider
        router={router}
        defaultComponent={() => <Breadcrumbs />}
      />
    </TestWrapper>,
  )
}

describe('Breadcrumbs', () => {
  it('renders nothing for root-only match', async () => {
    const rootRoute = createRootRoute()
    const router = createRouter({
      routeTree: rootRoute,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    await router.load()

    const { container } = render(
      <TestWrapper>
        <RouterProvider
          router={router}
          defaultComponent={() => <Breadcrumbs />}
        />
      </TestWrapper>,
    )
    expect(container.textContent).toBe('')
  })

  it('renders a single breadcrumb for a dashboard route', async () => {
    await renderBreadcrumbs([{ path: '/', breadcrumb: 'dashboard' }])
    expect(screen.getByText('Dashboard')).toBeDefined()
  })

  it('does not render a home icon link', async () => {
    await renderBreadcrumbs([{ path: '/', breadcrumb: 'dashboard' }])
    expect(screen.queryByRole('link', { name: '' })).toBeNull()
  })

  it('renders the last crumb as the current page', async () => {
    await renderBreadcrumbs([
      { path: '/', breadcrumb: 'dashboard' },
      { path: '/orders', breadcrumb: 'orders' },
    ])
    expect(screen.getByText('Orders')).toBeDefined()
  })

  it('renders breadcrumb separators as list siblings', async () => {
    const { container } = await renderBreadcrumbs([
      { path: '/', breadcrumb: 'dashboard' },
      { path: '/orders', breadcrumb: 'orders' },
    ])

    expect(
      container.querySelectorAll('li li[data-slot="breadcrumb-separator"]'),
    ).toHaveLength(0)
  })

  it('renders explicit parent breadcrumbs before the current page', async () => {
    await renderBreadcrumbs([
      {
        path: '/customers/new',
        breadcrumb: 'new',
        parentBreadcrumbs: [{ label: 'customers', href: '/customers' }],
      },
    ])

    expect(screen.getByRole('link', { name: 'Customers' })).toBeDefined()
    expect(screen.getByText('New')).toBeDefined()
  })
})
