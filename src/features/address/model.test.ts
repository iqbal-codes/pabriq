import { eq, sql } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '#/db/index'
import { addresses, biteshipAreas, organization } from '#/db/schema'
import { createAddressFn, searchAreas, updateAddressFn } from './model'

const org1Id = '00000000-0000-0000-0000-000000000001'

beforeEach(async () => {
  await db.execute(sql`TRUNCATE organization, biteship_areas CASCADE`)

  const now = new Date()
  await db.insert(organization).values([
    {
      id: org1Id,
      name: 'Org 1',
      slug: 'org-1',
      createdAt: now,
      updatedAt: now,
    },
  ])

  await db.insert(biteshipAreas).values([
    {
      areaId: 'area-1',
      name: 'Cibis, Palmerah',
      subdistrict: 'Palmerah',
      district: 'Palmerah',
      city: 'Jakarta Barat',
      province: 'DKI Jakarta',
      postalCode: '11480',
    },
    {
      areaId: 'area-2',
      name: 'Kebayoran Baru',
      subdistrict: 'Kebayoran Baru',
      district: 'Kebayoran Baru',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      postalCode: '12120',
    },
  ])

  process.env.BITESHIP_API_KEY = 'test-key'
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createAddressFn', () => {
  it('creates address with area', async () => {
    const result = await createAddressFn({
      orgId: org1Id,
      areaId: 'area-1',
      areaName: 'Cibis, Palmerah',
      streetAddress: 'Jl. Raya Palmerah No. 123',
    })

    expect(result.ok).toBe(true)
  })

  it('rejects WNI without area', async () => {
    const result = await createAddressFn({
      orgId: org1Id,
      areaId: undefined,
      isWni: true,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('areaRequired')
    }
  })

  it('allows WNA without area', async () => {
    const result = await createAddressFn({
      orgId: org1Id,
      isWni: false,
      streetAddress: '123 Foreign Street',
    })

    expect(result.ok).toBe(true)
  })

  it('clears area when updating WNA address', async () => {
    const addrId = crypto.randomUUID()
    await db.insert(addresses).values({
      id: addrId,
      orgId: org1Id,
      areaId: 'area-1',
      areaName: 'Cibis, Palmerah',
      streetAddress: 'Old Street',
      isDefault: false,
    })

    const updateResult = await updateAddressFn(addrId, {
      isWni: false,
      streetAddress: 'New Street',
    })

    expect(updateResult.ok).toBe(true)

    const rows = await db
      .select({ areaId: addresses.areaId, areaName: addresses.areaName })
      .from(addresses)
      .where(eq(addresses.id, addrId))
      .limit(1)

    expect(rows[0]).toMatchObject({
      areaId: null,
      areaName: null,
    })
  })

  it('rejects address without orgId', async () => {
    const result = await createAddressFn({
      orgId: '',
      areaId: 'area-1',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('orgIdRequired')
    }
  })
})

describe('updateAddressFn', () => {
  it('updates address fields', async () => {
    const addrId = crypto.randomUUID()
    await db.insert(addresses).values({
      id: addrId,
      orgId: org1Id,
      areaId: 'area-2',
      streetAddress: 'Old Street',
      isDefault: false,
    })

    const updateResult = await updateAddressFn(addrId, {
      streetAddress: 'New Street',
    })

    expect(updateResult.ok).toBe(true)
  })
})

describe('searchAreas', () => {
  it('returns results from Biteship API', async () => {
    const mockResponse = {
      success: true,
      areas: [
        {
          id: 'IDNP6IDNC148IDND843IDZ12250',
          name: 'Pesanggrahan, Jakarta Selatan, DKI Jakarta. 12250',
          country_name: 'Indonesia',
          country_code: 'ID',
          administrative_division_level_1_name: 'DKI Jakarta',
          administrative_division_level_1_type: 'province',
          administrative_division_level_2_name: 'Jakarta Selatan',
          administrative_division_level_2_type: 'city',
          administrative_division_level_3_name: 'Pesanggrahan',
          administrative_division_level_3_type: 'district',
          postal_code: 12250,
        },
      ],
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    )

    const results = await searchAreas('Jakarta')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('IDNP6IDNC148IDND843IDZ12250')
    expect(results[0].name).toContain('Pesanggrahan')
    expect(results[0].area).toBe('Pesanggrahan')
  })

  it('returns empty array for empty query', async () => {
    const results = await searchAreas('')
    expect(results).toEqual([])
  })

  it('returns empty array on API error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 }),
    )

    const results = await searchAreas('Jakarta')
    expect(results).toEqual([])
  })

  it('sends API key in authorization header', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, areas: [] }), {
        status: 200,
      }),
    )

    await searchAreas('Jakarta')

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/v1/maps/areas'),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'test-key',
        }),
      }),
    )
  })

  it('builds correct query parameters', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, areas: [] }), {
        status: 200,
      }),
    )

    await searchAreas('Jakarta Selatan')

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('countries=ID'),
      expect.anything(),
    )
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('input=Jakarta+Selatan'),
      expect.anything(),
    )
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('type=single'),
      expect.anything(),
    )
  })
})
