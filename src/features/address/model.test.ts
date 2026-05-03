import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
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
})

describe('createAddressFn', () => {
  it('creates address with area', async () => {
    await db.insert(biteshipAreas).values({
      areaId: 'area-1',
      name: 'Cibis, Palmerah',
      subdistrict: 'Palmerah',
      district: 'West Jakarta',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '11480',
    })

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
    await db.insert(biteshipAreas).values({
      areaId: 'area-2',
      name: 'Senayan, Kebayoran Baru',
      subdistrict: 'Kebayoran Baru',
      district: 'South Jakarta',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '12110',
    })

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
  beforeEach(async () => {
    await db.insert(biteshipAreas).values([
      {
        areaId: 'area-jakarta-1',
        name: 'Cibis, Palmerah',
        subdistrict: 'Palmerah',
        district: 'West Jakarta',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '11480',
      },
      {
        areaId: 'area-jakarta-2',
        name: 'Senayan, Kebayoran Baru',
        subdistrict: 'Kebayoran Baru',
        district: 'South Jakarta',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12110',
      },
      {
        areaId: 'area-bandung-1',
        name: 'Dago, Coblong',
        subdistrict: 'Coblong',
        district: 'Bandung',
        city: 'Bandung',
        province: 'West Java',
        postalCode: '40135',
      },
    ])
  })

  it('returns up to 20 results', async () => {
    const results = await searchAreas('Jakarta')
    expect(results.length).toBeLessThanOrEqual(20)
  })

  it('matches by name', async () => {
    const results = await searchAreas('Senayan')
    expect(results.some((r) => r.name.includes('Senayan'))).toBe(true)
  })

  it('matches by postal code', async () => {
    const results = await searchAreas('11480')
    expect(results.some((r) => r.id === 'area-jakarta-1')).toBe(true)
  })

  it('returns empty array for empty query', async () => {
    const results = await searchAreas('')
    expect(results).toEqual([])
  })
})
