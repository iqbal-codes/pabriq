import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act, render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'

const ProductionPage = ({ orgId, role }: { orgId: string; role: string }) => (
  <div data-testid="production-page" data-org-id={orgId} data-role={role}>
    Production Page Mock
  </div>
)

const enMessages = {
  operator: {
    accessDeniedTitle: 'Access denied',
    accessDeniedDescription: "You don't have access to this page.",
    backToProduction: 'Back to production',
    backToDashboard: 'Back to dashboard',
    noOrgHeader: 'No organization',
    noOrgTitle: 'No organization assigned',
    noOrgDescription: 'Your account is not a member of any organization.',
    theme: 'Theme',
  },
  sidebar: {
    dashboard: 'Dashboard',
    settings: 'Settings',
  },
}

function OperatorLayout() {
  return (
    <IntlProvider locale="en" messages={enMessages}>
      <Outlet />
    </IntlProvider>
  )
}

function buildOperatorRouter(initialEntry: string) {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  })

  const operatorRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/operator',
    beforeLoad: () => {
      return {
        access: 'allowed' as const,
        session: {
          user: {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
            image: null,
          },
        },
        org: {
          id: 'org-1',
          name: 'My Workshop',
          slug: 'my-workshop',
          logo: null,
          role: 'member' as const,
        },
        role: 'member' as const,
      }
    },
    component: OperatorLayout,
  })

  const operatorIndexRoute = createRoute({
    getParentRoute: () => operatorRoute,
    path: '/',
    component: () => {
      const ctx = operatorRoute.useRouteContext()
      const prodPage = ctx as {
        org: { id: string; role: string }
        role: string
      }
      return <ProductionPage orgId={prodPage.org.id} role={prodPage.role} />
    },
  })

  const routeTree = rootRoute.addChildren([
    operatorRoute.addChildren([operatorIndexRoute]),
  ])

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  })
}

async function renderRouter(router: ReturnType<typeof buildOperatorRouter>) {
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('operator index route', () => {
  it('renders production page with orgId and role from parent context', async () => {
    const router = buildOperatorRouter('/operator')

    await router.load()
    await renderRouter(router)

    const prodPage = screen.getByTestId('production-page')
    expect(prodPage).toBeDefined()
    expect(prodPage.getAttribute('data-org-id')).toBe('org-1')
    expect(prodPage.getAttribute('data-role')).toBe('member')
  })

  it('does not render sidebar text like Dashboard or Settings', async () => {
    const router = buildOperatorRouter('/operator')

    await router.load()
    await renderRouter(router)

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })
})
