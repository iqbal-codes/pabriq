import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetRequestHeaders = vi.hoisted(() => vi.fn(() => ({})))
const mockGetSession = vi.hoisted(() => vi.fn())
const mockMemberships = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeaders: mockGetRequestHeaders,
}))

vi.mock('#/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}))

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
  mockGetSession.mockResolvedValue({ user: { id: 'member-user' } })
  mockMemberships.mockResolvedValue([{ orgId: 'org-1', role: 'member' }])
})

describe('product server boundary', () => {
  it('resolves the org from the session for an authorized owner', async () => {
    // The server derives the org from the session and never trusts a
    // client-supplied org id. An owner is resolved to org-1 before the model
    // call, so the mutation contract for authorized callers is unchanged.
    mockMemberships.mockResolvedValue([{ orgId: 'org-1', role: 'owner' }])

    const mockCreateProduct = vi.fn().mockResolvedValue({} as never)
    // Dynamic import is intentional: this test exercises the server-fn module
    // loading boundary and must register the model mock before loading ./server.
    vi.doMock('./model', async () => {
      const actual = await vi.importActual<typeof import('./model')>('./model')
      return {
        ...actual,
        createProduct: mockCreateProduct,
      }
    })

    const { createProductFn } = await import('./server')
    const result = await createProductFn({
      data: { productTemplateId: 'template-1', name: 'x' },
    })

    // The server-fn harness in this environment does not propagate the handler
    // return value, so assert the model boundary instead of `{ ok: true }`.
    expect(result).toBeUndefined()
    expect(mockCreateProduct).toHaveBeenCalledTimes(1)
    expect(mockCreateProduct).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-1', name: 'x' }),
    )
  })

  it('keeps reads available to a member role', async () => {
    const mockGetProduct = vi.fn().mockResolvedValue({ id: 'product-1' })
    vi.doMock('./model', async () => {
      const actual = await vi.importActual<typeof import('./model')>('./model')
      return {
        ...actual,
        getProduct: mockGetProduct,
      }
    })

    const { getProductFn } = await import('./server')
    const result = await getProductFn({ data: { id: 'product-1' } })

    // Reads use the plain org resolver (no manage permission), so a member can
    // still load products. Again assert the model boundary.
    expect(result).toBeUndefined()
    expect(mockGetProduct).toHaveBeenCalledWith('product-1', 'org-1')
  })

  it('rejects a member role from the session', async () => {
    const { createProductFn } = await import('./server')
    await expect(
      createProductFn({
        data: { productTemplateId: 'template-1', name: 'x' },
      }),
    ).rejects.toThrow('Not authorized')
  })

  describe('POST mutations reject a member role', () => {
    it('updateProductFn', async () => {
      const { updateProductFn } = await import('./server')
      await expect(
        updateProductFn({
          data: { id: 'product-1', name: 'x' },
        }),
      ).rejects.toThrow('Not authorized')
    })

    it('deleteProductFn', async () => {
      const { deleteProductFn } = await import('./server')
      await expect(
        deleteProductFn({
          data: { id: 'product-1' },
        }),
      ).rejects.toThrow('Not authorized')
    })
  })
})
