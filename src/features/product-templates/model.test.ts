import { eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  businessTemplates,
  organization,
  products,
  productTemplates,
} from '#/db/schema'
import type { BusinessTemplateConfiguration } from './config'
import {
  archiveProductTemplate,
  createProductTemplate,
  deleteProductTemplate,
  listProductTemplates,
  materializeBusinessTemplate,
} from './model'

const org1Id = '00000000-0000-0000-0000-000000000001'
const org2Id = '00000000-0000-0000-0000-000000000002'
const businessTemplateId = '00000000-0000-0000-0000-000000000010'

const configuration = {
  itemizationMode: 'uniform' as const,
  fields: [],
  pricing: { basePrice: 0, productionDays: 1, minQuantity: 1 },
  production: { notes: null },
  workflowStages: [],
  bom: [],
}

const businessConfiguration: BusinessTemplateConfiguration = {
  productTemplates: [
    { name: 'Tee', description: 'Starter tee', configuration },
  ],
}

beforeEach(async () => {
  await db.execute(sql`TRUNCATE organization, business_templates CASCADE`)
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
  await db.insert(businessTemplates).values({
    id: businessTemplateId,
    slug: 'custom-apparel',
    name: 'Custom Apparel',
    description: 'Starter products',
    active: true,
    configuration: businessConfiguration,
    createdAt: now,
    updatedAt: now,
  })
})

describe('product templates', () => {
  it('copies a business template into one organization and isolates reads', async () => {
    const copied = await materializeBusinessTemplate(org1Id, businessTemplateId)
    expect(copied).toHaveLength(1)
    expect(await listProductTemplates(org1Id)).toHaveLength(1)
    expect(await listProductTemplates(org2Id)).toEqual([])
    expect(copied[0]?.businessTemplateId).toBe(businessTemplateId)
  })
  it('rejects inactive or unknown business template provenance', async () => {
    await expect(
      createProductTemplate({
        orgId: org1Id,
        name: 'Invalid provenance',
        configuration,
        businessTemplateId: '00000000-0000-0000-0000-000000000099',
      }),
    ).rejects.toThrow('Business template not found')
  })

  it('rejects active business templates without starter products', async () => {
    await db
      .update(businessTemplates)
      .set({ configuration: { productTemplates: [] } })
      .where(eq(businessTemplates.id, businessTemplateId))

    await expect(
      materializeBusinessTemplate(org1Id, businessTemplateId),
    ).rejects.toThrow('starter product templates')
  })
  it('materialization is idempotent for an organization and business template', async () => {
    await materializeBusinessTemplate(org1Id, businessTemplateId)
    const copiedAgain = await materializeBusinessTemplate(
      org1Id,
      businessTemplateId,
    )
    expect(copiedAgain).toHaveLength(1)
    expect(await listProductTemplates(org1Id)).toHaveLength(1)
  })
  it('archives referenced templates and rejects unsafe deletion', async () => {
    const template = await createProductTemplate({
      orgId: org1Id,
      name: 'Tee',
      configuration,
    })
    await expect(deleteProductTemplate(template.id, org1Id)).rejects.toThrow(
      'archived',
    )
    expect((await archiveProductTemplate(template.id, org1Id)).status).toBe(
      'archived',
    )
    await db.insert(products).values({
      id: '00000000-0000-0000-0000-000000000099',
      orgId: org1Id,
      productTemplateId: template.id,
      name: 'Referenced Tee',
    })
    await expect(deleteProductTemplate(template.id, org1Id)).rejects.toThrow(
      'referenced',
    )
    await db
      .delete(products)
      .where(eq(products.id, '00000000-0000-0000-0000-000000000099'))
    await deleteProductTemplate(template.id, org1Id)
    expect(
      await db
        .select({ id: productTemplates.id })
        .from(productTemplates)
        .where(eq(productTemplates.id, template.id)),
    ).toEqual([])
  })
})
