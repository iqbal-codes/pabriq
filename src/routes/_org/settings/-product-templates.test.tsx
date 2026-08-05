import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route } from './product-templates'

const mockGetRequestHeaders = vi.hoisted(() => vi.fn(() => ({})))
const mockGetSession = vi.hoisted(() => vi.fn())
const mockMemberships = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeaders: mockGetRequestHeaders,
}))

vi.mock('#/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}))

// Importing the route pulls in the page component, which transitively imports
// the server functions and #/db/index. Neutralize those so this stays a pure
// route-guard unit test.
vi.mock('#/db/index', () => {
  const chain = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(() => mockMemberships()),
  }
  chain.select.mockReturnValue(chain)
  chain.from.mockReturnValue(chain)
  chain.where.mockReturnValue(chain)
  return { db: chain }
})

beforeEach(() => {
  mockGetSession.mockResolvedValue({ user: { id: 'route-guard-user' } })
  mockMemberships.mockResolvedValue([{ orgId: 'org-1', role: 'owner' }])
})

type BeforeLoadArgs = Parameters<
  NonNullable<typeof Route.options.beforeLoad>
>[0]

describe('product-templates route', () => {
  it('redirects member away from product-templates settings', () => {
    const beforeLoad = Route.options.beforeLoad
    expect(beforeLoad).toBeDefined()
    if (!beforeLoad) {
      throw new Error('Expected beforeLoad to be defined')
    }
    expect(() =>
      beforeLoad({
        context: { org: { role: 'member' } },
      } as BeforeLoadArgs),
    ).toThrow()
  })

  it('allows owner to access product-templates settings', () => {
    const beforeLoad = Route.options.beforeLoad
    expect(beforeLoad).toBeDefined()
    if (!beforeLoad) {
      throw new Error('Expected beforeLoad to be defined')
    }
    const result = beforeLoad({
      context: { org: { role: 'owner' } },
    } as BeforeLoadArgs)
    expect(result).toEqual({
      breadcrumb: 'productTemplates',
      pageTitle: 'productTemplates',
    })
  })

  it('allows admin to access product-templates settings', () => {
    const beforeLoad = Route.options.beforeLoad
    expect(beforeLoad).toBeDefined()
    if (!beforeLoad) {
      throw new Error('Expected beforeLoad to be defined')
    }
    const result = beforeLoad({
      context: { org: { role: 'admin' } },
    } as BeforeLoadArgs)
    expect(result).toEqual({
      breadcrumb: 'productTemplates',
      pageTitle: 'productTemplates',
    })
  })
})
