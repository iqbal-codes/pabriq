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

describe('product template server boundary', () => {
  it('does not trust a client organization id', async () => {
    // The server derives the org from the session and rejects client-supplied
    // org ids. A member is denied before any model call runs, and an
    // owner/admin who sends an attacker org id is still resolved to org-1.
    mockMemberships.mockResolvedValue([{ orgId: 'org-1', role: 'owner' }])

    const mockCreateProductTemplate = vi.fn().mockResolvedValue({} as never)
    // Dynamic import is intentional: this test exercises the server-fn module
    // loading boundary and must register the model mock before loading ./server.
    vi.doMock('./model', async () => {
      const actual = await vi.importActual<typeof import('./model')>('./model')
      return {
        ...actual,
        createProductTemplate: mockCreateProductTemplate,
      }
    })

    const { createProductTemplateFn } = await import('./server')
    const result = await createProductTemplateFn({
      data: {
        orgId: 'attacker-org',
        name: 'x',
        configuration: {
          itemizationMode: 'uniform',
          fields: [],
          pricing: { basePrice: 0, productionDays: 1, minQuantity: 1 },
          production: { notes: null },
          workflowStages: [],
          bom: [],
        },
      },
    })

    expect(result).toEqual({ ok: true })
    expect(mockCreateProductTemplate).toHaveBeenCalledTimes(1)
    expect(mockCreateProductTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-1', name: 'x' }),
    )
    expect(mockCreateProductTemplate).not.toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'attacker-org' }),
    )
  })

  it('rejects a member role from the session', async () => {
    const { createProductTemplateFn } = await import('./server')
    await expect(
      createProductTemplateFn({
        data: {
          orgId: 'attacker-org',
          name: 'x',
          configuration: {
            itemizationMode: 'uniform',
            fields: [],
            pricing: { basePrice: 0, productionDays: 1, minQuantity: 1 },
            production: { notes: null },
            workflowStages: [],
            bom: [],
          },
        },
      }),
    ).rejects.toThrow('Not authorized')
  })

  describe('POST mutations reject a member role', () => {
    it('updateProductTemplateFn', async () => {
      const { updateProductTemplateFn } = await import('./server')
      await expect(
        updateProductTemplateFn({
          data: {
            orgId: 'attacker-org',
            id: 'template-1',
            name: 'x',
          },
        }),
      ).rejects.toThrow('Not authorized')
    })

    it('duplicateProductTemplateFn', async () => {
      const { duplicateProductTemplateFn } = await import('./server')
      await expect(
        duplicateProductTemplateFn({
          data: { id: 'template-1', name: 'x' },
        }),
      ).rejects.toThrow('Not authorized')
    })

    it('archiveProductTemplateFn', async () => {
      const { archiveProductTemplateFn } = await import('./server')
      await expect(
        archiveProductTemplateFn({
          data: { id: 'template-1' },
        }),
      ).rejects.toThrow('Not authorized')
    })

    it('deleteProductTemplateFn', async () => {
      const { deleteProductTemplateFn } = await import('./server')
      await expect(
        deleteProductTemplateFn({
          data: { id: 'template-1' },
        }),
      ).rejects.toThrow('Not authorized')
    })

    it('materializeBusinessTemplateFn', async () => {
      const { materializeBusinessTemplateFn } = await import('./server')
      await expect(
        materializeBusinessTemplateFn({
          data: { businessTemplateId: 'business-template-1' },
        }),
      ).rejects.toThrow('Not authorized')
    })
  })
})
