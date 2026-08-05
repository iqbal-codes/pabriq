import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  redirect,
} from '@tanstack/react-router'
import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockSession = {
  session: {
    accessToken: string
    refreshToken: string
    accessTokenExpiresAt: string
    refreshTokenExpiresAt: string
    clientId: string
    userId: string
    scopes: string
  }
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

type MockOrg = {
  id: string
  name: string
  slug: string
  logo: string | null
  role: string
}

function createMockSession(): MockSession {
  return {
    session: {
      accessToken: 'test-token',
      refreshToken: 'test-refresh-token',
      accessTokenExpiresAt: '2026-01-01T00:00:00.000Z',
      refreshTokenExpiresAt: '2026-01-01T00:00:00.000Z',
      clientId: 'test-client',
      userId: 'user-1',
      scopes: '',
    },
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      image: null,
    },
  }
}

const mockGetCurrentSession = vi.fn<() => Promise<MockSession | null>>()
const mockListUserOrgs = vi.fn<() => Promise<Array<MockOrg>>>()

function ProtectedLayout() {
  return <Outlet />
}

function buildProtectedRouter(initialEntry: string) {
  const rootRoute = createRootRoute()
  const signInRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sign-in',
    component: () => <div>Sign In Page</div>,
  })
  const onboardingRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/onboarding',
    component: () => <div>Onboarding Page</div>,
  })
  const orgLayoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: '_org',
    beforeLoad: async ({ location }) => {
      const session = await mockGetCurrentSession()

      if (!session) {
        throw redirect({
          to: '/sign-in',
          search: { redirect: location.href },
        })
      }

      const orgs = await mockListUserOrgs()

      if (orgs.length === 0) {
        throw redirect({ to: '/onboarding' })
      }

      return { session, org: orgs[0] }
    },
    component: ProtectedLayout,
  })
  const orgIndexRoute = createRoute({
    getParentRoute: () => orgLayoutRoute,
    path: '/',
    component: () => <div>Dashboard Page</div>,
  })
  const orgNestedRoute = createRoute({
    getParentRoute: () => orgLayoutRoute,
    path: 'orders',
    component: () => <div>Orders Page</div>,
  })

  const routeTree = rootRoute.addChildren([
    signInRoute,
    onboardingRoute,
    orgLayoutRoute.addChildren([orgIndexRoute, orgNestedRoute]),
  ])

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  })
}

function buildAuthPageRouter(initialEntry: string) {
  const rootRoute = createRootRoute()
  const signInRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sign-in',
    component: () => <div>Sign In Page</div>,
  })
  const onboardingRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/onboarding',
    component: () => <div>Onboarding Page</div>,
  })
  const signUpRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sign-up',
    beforeLoad: async () => {
      const session = await mockGetCurrentSession()
      if (session) {
        const orgs = await mockListUserOrgs()
        if (orgs.length === 0) {
          throw redirect({ to: '/onboarding' })
        }
        throw redirect({ to: '/' })
      }
    },
    component: () => <div>Sign Up Page</div>,
  })
  const routeTree = rootRoute.addChildren([
    signInRoute,
    onboardingRoute,
    signUpRoute,
  ])

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  })
}

type TestRouter = React.ComponentProps<typeof RouterProvider>['router']

async function renderRouter(router: TestRouter) {
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

beforeEach(() => {
  mockGetCurrentSession.mockReset()
  mockListUserOrgs.mockReset()
})

describe('workspace route guards', () => {
  it('redirects unauthenticated users from / to sign-in', async () => {
    mockGetCurrentSession.mockResolvedValue(null)
    mockListUserOrgs.mockResolvedValue([])

    const router = buildProtectedRouter('/')

    await router.load()
    await renderRouter(router)

    expect(await screen.findByText('Sign In Page')).toBeDefined()
    expect(router.state.location.pathname).toBe('/sign-in')
    expect(router.state.location.href).toBe('/sign-in?redirect=%2F')
  })

  it('redirects unauthenticated users from nested workspace routes to sign-in', async () => {
    mockGetCurrentSession.mockResolvedValue(null)
    mockListUserOrgs.mockResolvedValue([])

    const router = buildProtectedRouter('/orders')

    await router.load()
    await renderRouter(router)

    expect(await screen.findByText('Sign In Page')).toBeDefined()
    expect(router.state.location.pathname).toBe('/sign-in')
    expect(router.state.location.href).toBe('/sign-in?redirect=%2Forders')
  })

  it('redirects authenticated users without an org to onboarding', async () => {
    mockGetCurrentSession.mockResolvedValue(createMockSession())
    mockListUserOrgs.mockResolvedValue([])

    const router = buildProtectedRouter('/')

    await router.load()
    await renderRouter(router)

    expect(await screen.findByText('Onboarding Page')).toBeDefined()
    expect(router.state.location.pathname).toBe('/onboarding')
  })

  it('renders the workspace for authenticated users with an org', async () => {
    mockGetCurrentSession.mockResolvedValue(createMockSession())
    mockListUserOrgs.mockResolvedValue([
      {
        id: 'org-1',
        name: 'My Workshop',
        slug: 'my-workshop',
        logo: null,
        role: 'admin',
      },
    ])

    const router = buildProtectedRouter('/')

    await router.load()
    await renderRouter(router)

    expect(await screen.findByText('Dashboard Page')).toBeDefined()
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('auth page guards', () => {
  it('renders sign-in for unauthenticated users', async () => {
    mockGetCurrentSession.mockResolvedValue(null)

    const router = buildAuthPageRouter('/sign-in')

    await router.load()
    await renderRouter(router)

    expect(await screen.findByText('Sign In Page')).toBeDefined()
    expect(router.state.location.pathname).toBe('/sign-in')
  })

  it('renders sign-up for unauthenticated users', async () => {
    mockGetCurrentSession.mockResolvedValue(null)

    const router = buildAuthPageRouter('/sign-up')

    await router.load()
    await renderRouter(router)

    expect(await screen.findByText('Sign Up Page')).toBeDefined()
    expect(router.state.location.pathname).toBe('/sign-up')
  })

  it('redirects sign-up to onboarding for authenticated users without an org', async () => {
    mockGetCurrentSession.mockResolvedValue(createMockSession())
    mockListUserOrgs.mockResolvedValue([])

    const router = buildAuthPageRouter('/sign-up')

    await router.load()
    await renderRouter(router)

    expect(await screen.findByText('Onboarding Page')).toBeDefined()
    expect(router.state.location.pathname).toBe('/onboarding')
  })
})

type RoleBasedOrgContext =
  | { access: 'forbidden'; session: MockSession; org: MockOrg; role: string }
  | { session: MockSession; org: MockOrg; role: string }

function buildRoleBasedRouter(initialEntry: string) {
  const rootRoute = createRootRoute()
  const onboardingRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/onboarding',
    component: () => <div>Onboarding Page</div>,
  })
  const signInRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sign-in',
    validateSearch: (search: Record<string, unknown>) => ({
      redirect:
        typeof search.redirect === 'string' ? search.redirect : undefined,
    }),
    beforeLoad: async ({ search }) => {
      const session = await mockGetCurrentSession()
      if (!session) return
      const orgs = await mockListUserOrgs()
      if (orgs.length === 0) throw redirect({ to: '/onboarding' })
      if (orgs[0].role === 'member') throw redirect({ to: '/operator' })
      throw redirect({
        to: (search as { redirect?: string }).redirect ?? '/',
      })
    },
    component: () => <div>Sign In Form</div>,
  })
  const operatorLayoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/operator',
    beforeLoad: async ({ location }) => {
      const session = await mockGetCurrentSession()
      if (!session)
        throw redirect({
          to: '/sign-in',
          search: { redirect: location.href },
        })
      const orgs = await mockListUserOrgs()
      if (orgs.length === 0) throw redirect({ to: '/onboarding' })
      if (orgs[0].role !== 'member') {
        return {
          access: 'forbidden' as const,
          session,
          org: orgs[0],
          role: orgs[0].role,
        } satisfies RoleBasedOrgContext
      }
      return {
        session,
        org: orgs[0],
        role: orgs[0].role,
      } satisfies RoleBasedOrgContext
    },
    component: () => {
      const ctx = operatorLayoutRoute.useRouteContext() as RoleBasedOrgContext
      if ('access' in ctx && ctx.access === 'forbidden') {
        return <div>Forbidden Page - Back to dashboard</div>
      }
      return <Outlet />
    },
  })
  const operatorIndexRoute = createRoute({
    getParentRoute: () => operatorLayoutRoute,
    path: '/',
    component: () => <div>Operator Page</div>,
  })
  const orgLayoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: '_org',
    beforeLoad: async ({ location }) => {
      const session = await mockGetCurrentSession()
      if (!session)
        throw redirect({
          to: '/sign-in',
          search: { redirect: location.href },
        })
      const orgs = await mockListUserOrgs()
      if (orgs.length === 0) throw redirect({ to: '/onboarding' })
      const role = orgs[0].role
      if (role === 'member' && location.pathname === '/') {
        throw redirect({ to: '/operator' })
      }
      return { session, org: orgs[0], role }
    },
    component: () => {
      const ctx = orgLayoutRoute.useRouteContext() as {
        role?: string
      }
      if (ctx.role === 'member') {
        return <div>Forbidden Page - Back to production</div>
      }
      return <Outlet />
    },
  })
  const orgIndexRoute = createRoute({
    getParentRoute: () => orgLayoutRoute,
    path: '/',
    component: () => <div>Admin Workspace</div>,
  })
  const orgOrdersRoute = createRoute({
    getParentRoute: () => orgLayoutRoute,
    path: 'orders',
    component: () => <div>Orders Page</div>,
  })

  const routeTree = rootRoute.addChildren([
    signInRoute,
    onboardingRoute,
    operatorLayoutRoute.addChildren([operatorIndexRoute]),
    orgLayoutRoute.addChildren([orgIndexRoute, orgOrdersRoute]),
  ])

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  })
}

describe('role-based route guards', () => {
  it('redirects member from / to /operator', async () => {
    mockGetCurrentSession.mockResolvedValue(createMockSession())
    mockListUserOrgs.mockResolvedValue([
      {
        id: 'org-1',
        name: 'My Workshop',
        slug: 'my-workshop',
        logo: null,
        role: 'member',
      },
    ])

    const router = buildRoleBasedRouter('/')
    await router.load()
    await renderRouter(router)

    expect(await screen.findByText('Operator Page')).toBeDefined()
  })

  it('renders admin workspace for owner/admin on /', async () => {
    mockGetCurrentSession.mockResolvedValue(createMockSession())
    mockListUserOrgs.mockResolvedValue([
      {
        id: 'org-1',
        name: 'My Workshop',
        slug: 'my-workshop',
        logo: null,
        role: 'admin',
      },
    ])

    const router = buildRoleBasedRouter('/')
    await router.load()
    await renderRouter(router)

    expect(await screen.findByText('Admin Workspace')).toBeDefined()
    expect(router.state.location.pathname).toBe('/')
  })

  it('renders forbidden page for member on /orders and keeps pathname', async () => {
    mockGetCurrentSession.mockResolvedValue(createMockSession())
    mockListUserOrgs.mockResolvedValue([
      {
        id: 'org-1',
        name: 'My Workshop',
        slug: 'my-workshop',
        logo: null,
        role: 'member',
      },
    ])

    const router = buildRoleBasedRouter('/orders')
    await router.load()
    await renderRouter(router)

    expect(
      await screen.findByText('Forbidden Page - Back to production'),
    ).toBeDefined()
    expect(router.state.location.pathname).toBe('/orders')
  })

  it('redirects unauthenticated / to /sign-in with redirect', async () => {
    mockGetCurrentSession.mockResolvedValue(null)
    mockListUserOrgs.mockResolvedValue([])

    const router = buildRoleBasedRouter('/')
    await router.load()
    await renderRouter(router)

    expect(await screen.findByText('Sign In Form')).toBeDefined()
    expect(router.state.location.pathname).toBe('/sign-in')
  })

  it('redirects no-org authenticated user to /onboarding', async () => {
    mockGetCurrentSession.mockResolvedValue(createMockSession())
    mockListUserOrgs.mockResolvedValue([])

    const router = buildRoleBasedRouter('/')
    await router.load()
    await renderRouter(router)

    expect(await screen.findByText('Onboarding Page')).toBeDefined()
    expect(router.state.location.pathname).toBe('/onboarding')
  })

  it('renders forbidden page for owner/admin on /operator', async () => {
    mockGetCurrentSession.mockResolvedValue(createMockSession())
    mockListUserOrgs.mockResolvedValue([
      {
        id: 'org-1',
        name: 'My Workshop',
        slug: 'my-workshop',
        logo: null,
        role: 'admin',
      },
    ])

    const router = buildRoleBasedRouter('/operator')
    await router.load()
    await renderRouter(router)

    expect(
      await screen.findByText('Forbidden Page - Back to dashboard'),
    ).toBeDefined()
  })

  it('redirects authenticated member away from /sign-in to /operator', async () => {
    mockGetCurrentSession.mockResolvedValue(createMockSession())
    mockListUserOrgs.mockResolvedValue([
      {
        id: 'org-1',
        name: 'My Workshop',
        slug: 'my-workshop',
        logo: null,
        role: 'member',
      },
    ])

    const router = buildRoleBasedRouter('/sign-in')
    await router.load()
    await renderRouter(router)

    expect(await screen.findByText('Operator Page')).toBeDefined()
    expect(router.state.location.pathname).toBe('/operator')
  })

  it('renders sign-in form for unauthenticated /sign-in?redirect=/orders', async () => {
    mockGetCurrentSession.mockResolvedValue(null)
    mockListUserOrgs.mockResolvedValue([])

    const router = buildRoleBasedRouter('/sign-in?redirect=/orders')
    await router.load()
    await renderRouter(router)

    expect(await screen.findByText('Sign In Form')).toBeDefined()
    expect(router.state.location.pathname).toBe('/sign-in')
  })
})
