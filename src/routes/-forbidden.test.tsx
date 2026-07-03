import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { act, render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { ForbiddenPage } from '../components/app/forbidden-page'

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  }
})

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
}

function buildForbiddenRouter(initialEntry: string) {
  const rootRoute = createRootRoute()

  const forbiddenRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/forbidden',
    component: () => (
      <IntlProvider locale="en" messages={enMessages}>
        <ForbiddenPage actionHref="/" actionKey="backToDashboard" />
      </IntlProvider>
    ),
  })

  const routeTree = rootRoute.addChildren([forbiddenRoute])

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  })
}

async function renderRouter(router: ReturnType<typeof buildForbiddenRouter>) {
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('forbidden route', () => {
  it('renders the access denied title', async () => {
    const router = buildForbiddenRouter('/forbidden')

    await router.load()
    await renderRouter(router)

    expect(await screen.findByText('Access denied')).toBeDefined()
  })

  it('renders a link to /', async () => {
    const router = buildForbiddenRouter('/forbidden')

    await router.load()
    await renderRouter(router)

    const link = screen.getByRole('link')
    expect(link).toBeDefined()
    expect(link.getAttribute('href')).toBe('/')
  })
})
