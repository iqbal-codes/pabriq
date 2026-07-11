import type { AnyRouter } from '@tanstack/react-router'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { act, render } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { beforeEach, describe, expect, it } from 'vitest'
import { type Messages, messages } from '#/messages'
import { getPageTitleKey, PageTitleSetter } from './__root'

type BreadcrumbKey = keyof Messages['breadcrumb']
type TestRouteContext = {
  pageTitle?: BreadcrumbKey
}

function buildRouter(initialEntry: string, context: TestRouteContext = {}) {
  const rootRoute = createRootRoute()
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: initialEntry,
    beforeLoad: () => context,
    component: PageTitleSetter,
  })

  return createRouter({
    routeTree: rootRoute.addChildren([pageRoute]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  })
}

async function renderRouter(router: AnyRouter) {
  await act(async () => {
    render(
      <IntlProvider locale="en" messages={messages.en}>
        <RouterProvider router={router} />
      </IntlProvider>,
    )
  })
}

describe('dynamic page title', () => {
  beforeEach(() => {
    document.title = ''
  })

  it('sets title for /orders route', async () => {
    const router = buildRouter('/orders', { pageTitle: 'orders' })

    await router.load()
    await renderRouter(router)

    expect(document.title).toBe('labq.dev - Orders')
  })

  it('sets title for /customers route', async () => {
    const router = buildRouter('/customers', { pageTitle: 'customers' })

    await router.load()
    await renderRouter(router)

    expect(document.title).toBe('labq.dev - Customers')
  })

  it('sets title for /sign-in route', async () => {
    const router = buildRouter('/sign-in', { pageTitle: 'signIn' })

    await router.load()
    await renderRouter(router)

    expect(document.title).toBe('labq.dev - Sign in')
  })

  it('falls back to app title when no pageTitle context', async () => {
    const router = buildRouter('/about')

    await router.load()
    await renderRouter(router)

    expect(document.title).toBe('labq.dev')
  })
})

describe('getPageTitleKey', () => {
  it('returns the leaf pageTitle when present', () => {
    expect(
      getPageTitleKey([
        { routeId: 'root', context: {} },
        { routeId: '/orders', context: { pageTitle: 'orders' } },
      ]),
    ).toBe('orders')
  })

  it('falls back to parent pageTitle when leaf has none', () => {
    expect(
      getPageTitleKey([
        { routeId: 'root', context: {} },
        { routeId: '/settings', context: { pageTitle: 'settings' } },
        { routeId: '/settings/general', context: {} },
      ]),
    ).toBe('settings')
  })

  it('skips root route matches', () => {
    expect(
      getPageTitleKey([
        { routeId: '__root__', context: { pageTitle: 'orders' } },
        { routeId: '/other', context: {} },
      ]),
    ).toBeUndefined()
  })
})
