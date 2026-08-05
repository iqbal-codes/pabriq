import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '#/lib/logger'

const mockCreateOrganization = vi.hoisted(() => vi.fn())
const mockDeleteOrganization = vi.hoisted(() => vi.fn())
const mockGetBusinessTemplate = vi.hoisted(() => vi.fn())
const mockMaterializeBusinessTemplate = vi.hoisted(() => vi.fn())
const mockGetRequestHeaders = vi.hoisted(() => vi.fn(() => ({})))
const mockOrgRows = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeaders: mockGetRequestHeaders,
}))

vi.mock('#/lib/auth', () => ({
  auth: {
    api: {
      createOrganization: mockCreateOrganization,
      deleteOrganization: mockDeleteOrganization,
    },
  },
}))

vi.mock('#/features/product-templates/model', () => ({
  getBusinessTemplate: mockGetBusinessTemplate,
  materializeBusinessTemplate: mockMaterializeBusinessTemplate,
}))

vi.mock('#/db/index', () => {
  const chain = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(() => mockOrgRows()),
  }
  chain.select.mockReturnValue(chain)
  chain.from.mockReturnValue(chain)
  chain.where.mockReturnValue(chain)
  return { db: chain }
})

const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})

beforeEach(() => {
  mockCreateOrganization.mockReset()
  mockDeleteOrganization.mockReset()
  mockGetBusinessTemplate.mockReset()
  mockMaterializeBusinessTemplate.mockReset()
  mockGetRequestHeaders.mockReset()
  mockOrgRows.mockReset()
  loggerErrorSpy.mockClear()

  mockCreateOrganization.mockResolvedValue(undefined)
  mockDeleteOrganization.mockResolvedValue(undefined)
  mockGetBusinessTemplate.mockResolvedValue({ id: 'business-1' })
  mockOrgRows.mockResolvedValue([{ id: 'org-1' }])
})

describe('createOrganizationHandler', () => {
  it('deletes the created organization when template materialization fails', async () => {
    mockMaterializeBusinessTemplate.mockRejectedValue(
      new Error('materialize failed'),
    )
    const { createOrganizationHandler } = await import('./org')

    const result = await createOrganizationHandler({
      name: 'Factory',
      businessTemplateId: 'business-1',
    })

    expect(result).toEqual({
      ok: false,
      error: 'template_materialization_failed',
    })
    expect(mockDeleteOrganization).toHaveBeenCalledWith({
      headers: {},
      body: { organizationId: 'org-1' },
    })
    expect(loggerErrorSpy).not.toHaveBeenCalled()
  })

  it('deletes the created organization when materialization returns no templates', async () => {
    mockMaterializeBusinessTemplate.mockResolvedValue([])
    const { createOrganizationHandler } = await import('./org')

    const result = await createOrganizationHandler({
      name: 'Factory',
      businessTemplateId: 'business-1',
    })

    expect(result).toEqual({
      ok: false,
      error: 'template_materialization_failed',
    })
    expect(mockDeleteOrganization).toHaveBeenCalledWith({
      headers: {},
      body: { organizationId: 'org-1' },
    })
    expect(loggerErrorSpy).not.toHaveBeenCalled()
  })

  it('does not return success when compensation (cleanup) fails', async () => {
    mockMaterializeBusinessTemplate.mockRejectedValue(
      new Error('materialize failed'),
    )
    mockDeleteOrganization.mockRejectedValue(new Error('delete failed'))
    const { createOrganizationHandler } = await import('./org')

    const result = await createOrganizationHandler({
      name: 'Factory',
      businessTemplateId: 'business-1',
    })

    expect(result).toEqual({
      ok: false,
      error: 'template_materialization_failed',
    })
    expect(mockDeleteOrganization).toHaveBeenCalledWith({
      headers: {},
      body: { organizationId: 'org-1' },
    })
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1' }),
      'Organization rollback failed after template materialization failure',
    )
  })

  it('preserves success when materialization produces templates', async () => {
    mockMaterializeBusinessTemplate.mockResolvedValue([{ id: 'product-1' }])
    const { createOrganizationHandler } = await import('./org')

    const result = await createOrganizationHandler({
      name: 'Factory',
      businessTemplateId: 'business-1',
    })

    expect(result).toEqual({ ok: true, orgId: 'org-1' })
    expect(mockDeleteOrganization).not.toHaveBeenCalled()
  })

  it('retries with a suffixed slug when the initial slug is taken', async () => {
    mockMaterializeBusinessTemplate.mockResolvedValue([{ id: 'product-1' }])
    mockCreateOrganization
      .mockRejectedValueOnce(new Error('slug already exists'))
      .mockResolvedValueOnce(undefined)
    const { createOrganizationHandler } = await import('./org')

    const result = await createOrganizationHandler({
      name: 'Factory',
      businessTemplateId: 'business-1',
    })

    expect(result).toEqual({ ok: true, orgId: 'org-1' })
    expect(mockCreateOrganization).toHaveBeenCalledTimes(2)
    expect(mockDeleteOrganization).not.toHaveBeenCalled()
  })
})
