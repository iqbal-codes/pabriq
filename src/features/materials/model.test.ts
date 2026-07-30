import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import { organization } from '#/db/schema'
import {
  deleteMaterial,
  getMaterial,
  getResolvedTaskMaterials,
  listMaterials,
  saveMaterial,
} from '#/features/materials/model'

const org1Id = '00000000-0000-0000-0000-000000000001'
const org2Id = '00000000-0000-0000-0000-000000000002'

beforeEach(async () => {
  await db.execute(sql`TRUNCATE organization CASCADE`)
  const now = new Date()
  await db.insert(organization).values([
    {
      id: org1Id,
      name: 'Org 1',
      slug: 'org-1',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: org2Id,
      name: 'Org 2',
      slug: 'org-2',
      createdAt: now,
      updatedAt: now,
    },
  ])
})

describe('Materials model', () => {
  it('creates and retrieves a material with identity, unit, supplier, and waste allowance', async () => {
    const created = await saveMaterial(org1Id, {
      key: 'pvc_resin',
      name: 'PVC Resin',
      unit: 'kg',
      supplier: 'Chemical Corp',
      referenceData: 'SKU-1234',
      estimatedQuantity: 5,
      wasteAllowance: 0.05,
    })

    expect(created.key).toBe('pvc_resin')
    expect(created.name).toBe('PVC Resin')
    expect(created.unit).toBe('kg')
    expect(created.supplier).toBe('Chemical Corp')
    expect(created.estimatedQuantity).toBe(5)
    expect(created.wasteAllowance).toBe(0.05)

    const retrieved = await getMaterial(org1Id, 'pvc_resin')
    expect(retrieved).not.toBeNull()
    expect(retrieved?.name).toBe('PVC Resin')
    expect(retrieved?.supplier).toBe('Chemical Corp')
  })

  it('lists materials for an organization', async () => {
    await saveMaterial(org1Id, {
      name: 'Plastisol Ink',
      unit: 'liters',
    })
    await saveMaterial(org1Id, {
      name: 'Embroidery Backing',
      unit: 'sheets',
    })

    const list = await listMaterials(org1Id)
    expect(list.length).toBe(2)
    const names = list.map((m) => m.name)
    expect(names).toContain('Plastisol Ink')
    expect(names).toContain('Embroidery Backing')
  })

  it('updates an existing material', async () => {
    await saveMaterial(org1Id, {
      key: 'ink_black',
      name: 'Black Ink',
      unit: 'liters',
      estimatedQuantity: 1,
    })

    const updated = await saveMaterial(org1Id, {
      key: 'ink_black',
      name: 'Black Ink Premium',
      unit: 'liters',
      supplier: 'Ink Supplier Inc',
      estimatedQuantity: 2,
      wasteAllowance: 0.1,
    })

    expect(updated.name).toBe('Black Ink Premium')
    expect(updated.supplier).toBe('Ink Supplier Inc')
    expect(updated.estimatedQuantity).toBe(2)
    expect(updated.wasteAllowance).toBe(0.1)

    const retrieved = await getMaterial(org1Id, 'ink_black')
    expect(retrieved?.name).toBe('Black Ink Premium')
  })

  it('deletes a material', async () => {
    await saveMaterial(org1Id, {
      key: 'temp_mat',
      name: 'Temp Material',
      unit: 'pcs',
    })

    await deleteMaterial(org1Id, 'temp_mat')

    const retrieved = await getMaterial(org1Id, 'temp_mat')
    expect(retrieved).toBeNull()
  })

  it('enforces organization isolation', async () => {
    await saveMaterial(org1Id, {
      key: 'shared_key',
      name: 'Org 1 Material',
      unit: 'kg',
    })

    const org2List = await listMaterials(org2Id)
    expect(org2List.length).toBe(0)

    const org2Material = await getMaterial(org2Id, 'shared_key')
    expect(org2Material).toBeNull()
  })
  it('resolves task materials for default and attached materials', async () => {
    await saveMaterial(org1Id, {
      key: 'resin_1',
      name: 'Resin 1',
      unit: 'kg',
      estimatedQuantity: 2,
    })

    const defaultRes = await getResolvedTaskMaterials(org1Id)
    expect(defaultRes?.length).toBe(1)
    expect(defaultRes?.[0].key).toBe('resin_1')

    const attachedRes = await getResolvedTaskMaterials(org1Id, [
      { materialKey: 'resin_1', estimatedQuantity: 10, wasteAllowance: 0.02 },
    ])
    expect(attachedRes?.length).toBe(1)
    expect(attachedRes?.[0].estimatedQuantity).toBe(10)
    expect(attachedRes?.[0].wasteAllowance).toBe(0.02)
  })
})
