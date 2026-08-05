import { eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  organization,
  products as productsTable,
  productTemplates,
} from '#/db/schema'
import { updateProductTemplate } from '#/features/product-templates/model'
import type { CreateProductInput } from './model'
import {
  createBreakpoint,
  createProduct as createProductModel,
  deleteBreakpoint,
  deleteProduct,
  getProduct,
  listBreakpoints,
  listProducts,
  updateBreakpoint,
  updateProduct,
} from './model'

const org1Id = '00000000-0000-0000-0000-000000000001'
const org2Id = '00000000-0000-0000-0000-000000000002'
const productTemplateId = '00000000-0000-0000-0000-000000000011'
const productTemplate2Id = '00000000-0000-0000-0000-000000000012'

const templateConfiguration = {
  itemizationMode: 'uniform' as const,
  fields: [],
  pricing: { basePrice: 100, productionDays: 2, minQuantity: 1 },
  production: { notes: null },
  workflowStages: [],
  bom: [],
}

async function createProduct(
  input: Omit<CreateProductInput, 'productTemplateId'> & {
    productTemplateId?: string
  },
) {
  return createProductModel({
    ...input,
    productTemplateId:
      input.productTemplateId ??
      (input.orgId === org2Id ? productTemplate2Id : productTemplateId),
  })
}

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
    {
      id: org2Id,
      name: 'Org 2',
      slug: 'org-2',
      createdAt: now,
      updatedAt: now,
    },
  ])
  await db.insert(productTemplates).values({
    id: productTemplateId,
    orgId: org1Id,
    businessTemplateId: null,
    name: 'Starter Template',
    description: null,
    category: null,
    status: 'active',
    configuration: templateConfiguration,
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(productTemplates).values({
    id: productTemplate2Id,
    orgId: org2Id,
    businessTemplateId: null,
    name: 'Org 2 Template',
    description: null,
    category: null,
    status: 'active',
    configuration: templateConfiguration,
    createdAt: now,
    updatedAt: now,
  })
})

describe('products', () => {
  it('creates a product and returns it', async () => {
    const product = await createProduct({
      orgId: org1Id,
      name: 'Custom T-Shirt',
    })

    expect(product.id).toBeDefined()
    expect(product.name).toBe('Custom T-Shirt')
    expect(product.orgId).toBe(org1Id)
    expect(product.active).toBe(true)
    expect(product.priority).toBe(false)
    expect(product.description).toBeNull()
    expect(product.productionNotes).toBeNull()
  })

  it('lists products by org and does not leak across orgs', async () => {
    await createProduct({ orgId: org1Id, name: 'P1' })
    await createProduct({ orgId: org1Id, name: 'P2' })
    await createProduct({ orgId: org2Id, name: 'Other Org Product' })

    const products = await listProducts({ orgId: org1Id })

    expect(products).toHaveLength(2)
    expect(products.map((p) => p.name).sort()).toEqual(['P1', 'P2'])
  })

  it('copies template configuration and preserves legacy products', async () => {
    const originalConfiguration = structuredClone(templateConfiguration)
    const product = await createProduct({
      orgId: org1Id,
      name: 'Copied Product',
    })

    await updateProductTemplate({
      id: productTemplateId,
      orgId: org1Id,
      configuration: {
        ...templateConfiguration,
        pricing: { ...templateConfiguration.pricing, basePrice: 999 },
      },
    })

    expect((await getProduct(product.id, org1Id))?.configuration).toEqual(
      originalConfiguration,
    )

    const legacyId = '00000000-0000-0000-0000-000000000099'
    await db.insert(productsTable).values({
      id: legacyId,
      orgId: org1Id,
      name: 'Legacy Product',
      productTemplateId: null,
      itemizationMode: 'uniform',
      configuration: null,
    })
    expect(await getProduct(legacyId, org1Id)).toMatchObject({
      productTemplateId: null,
      itemizationMode: 'uniform',
      configuration: null,
    })
  })

  it('gets a product by id and orgId', async () => {
    const created = await createProduct({ orgId: org1Id, name: 'Find Me' })

    const found = await getProduct(created.id, org1Id)

    expect(found).not.toBeNull()
    expect(found?.name).toBe('Find Me')
  })

  it('returns null when product not found in org', async () => {
    const created = await createProduct({ orgId: org1Id, name: 'Not Found' })

    const result = await getProduct(created.id, org2Id)

    expect(result).toBeNull()
  })

  it('updates a product name', async () => {
    const created = await createProduct({ orgId: org1Id, name: 'Old Name' })

    const updated = await updateProduct({
      id: created.id,
      orgId: org1Id,
      name: 'New Name',
    })

    expect(updated.name).toBe('New Name')
    const fetched = await getProduct(updated.id, org1Id)
    expect(fetched?.name).toBe('New Name')
  })

  it('saves explicit priority on create', async () => {
    const product = await createProduct({
      orgId: org1Id,
      name: 'Priority Product',
      priority: true,
    })

    expect(product.priority).toBe(true)
  })

  it('updates product priority', async () => {
    const created = await createProduct({
      orgId: org1Id,
      name: 'Toggle Priority',
    })
    expect(created.priority).toBe(false)

    const prioritized = await updateProduct({
      id: created.id,
      orgId: org1Id,
      priority: true,
    })
    expect(prioritized.priority).toBe(true)

    const unprioritized = await updateProduct({
      id: created.id,
      orgId: org1Id,
      priority: false,
    })
    expect(unprioritized.priority).toBe(false)
  })

  it('toggles product active status', async () => {
    const created = await createProduct({ orgId: org1Id, name: 'Toggle Me' })
    expect(created.active).toBe(true)

    const deactivated = await updateProduct({
      id: created.id,
      orgId: org1Id,
      active: false,
    })
    expect(deactivated.active).toBe(false)

    const reactivated = await updateProduct({
      id: created.id,
      orgId: org1Id,
      active: true,
    })
    expect(reactivated.active).toBe(true)
  })

  it('soft deletes a product', async () => {
    const created = await createProduct({ orgId: org1Id, name: 'Delete Me' })

    await deleteProduct(created.id, org1Id)

    const fetched = await getProduct(created.id, org1Id)
    expect(fetched).toBeNull()

    const [deleted] = await db
      .select({
        active: productsTable.active,
        deletedAt: productsTable.deletedAt,
      })
      .from(productsTable)
      .where(eq(productsTable.id, created.id))
      .limit(1)
    expect(deleted?.active).toBe(false)
    expect(deleted?.deletedAt).toBeInstanceOf(Date)
  })

  it('does not delete from wrong org', async () => {
    const created = await createProduct({ orgId: org1Id, name: 'Safe' })

    await deleteProduct(created.id, org2Id)

    const fetched = await getProduct(created.id, org1Id)
    expect(fetched).not.toBeNull()
  })

  it('searches products by name', async () => {
    await createProduct({ orgId: org1Id, name: 'Red Widget' })
    await createProduct({ orgId: org1Id, name: 'Blue Widget' })
    await createProduct({ orgId: org1Id, name: 'Green Gadget' })

    const results = await listProducts({ orgId: org1Id, search: 'Widget' })

    expect(results).toHaveLength(2)
  })

  it('filters to active only', async () => {
    const p = await createProduct({ orgId: org1Id, name: 'Active Prod' })
    await createProduct({ orgId: org1Id, name: 'Inactive Prod' })
    await updateProduct({ id: p.id, orgId: org1Id, active: false })

    const all = await listProducts({ orgId: org1Id })
    expect(all).toHaveLength(2)

    const active = await listProducts({ orgId: org1Id, activeOnly: true })
    expect(active).toHaveLength(1)
    expect(active[0].name).toBe('Inactive Prod')
  })

  it('sorts by name', async () => {
    await createProduct({ orgId: org1Id, name: 'Zebra' })
    await createProduct({ orgId: org1Id, name: 'Apple' })
    await createProduct({ orgId: org1Id, name: 'Banana' })

    const ascResult = await listProducts({
      orgId: org1Id,
      sortBy: 'name',
      sortDir: 'asc',
    })
    expect(ascResult.map((p) => p.name)).toEqual(['Apple', 'Banana', 'Zebra'])

    const descResult = await listProducts({
      orgId: org1Id,
      sortBy: 'name',
      sortDir: 'desc',
    })
    expect(descResult.map((p) => p.name)).toEqual(['Zebra', 'Banana', 'Apple'])
  })
})

describe('pricing breakpoints', () => {
  it('creates a breakpoint on a product', async () => {
    const product = await createProduct({ orgId: org1Id, name: 'Widget' })

    const bp = await createBreakpoint({
      orgId: org1Id,
      productId: product.id,
      minQuantity: 1,
      unitPrice: 10,
    })

    expect(bp.id).toBeDefined()
    expect(bp.minQuantity).toBe(1)
    expect(bp.unitPrice).toBe(10)
    expect(bp.productId).toBe(product.id)
  })

  it('lists breakpoints sorted by minQuantity', async () => {
    const product = await createProduct({ orgId: org1Id, name: 'Widget' })
    await createBreakpoint({
      orgId: org1Id,
      productId: product.id,
      minQuantity: 50,
      unitPrice: 5,
    })
    await createBreakpoint({
      orgId: org1Id,
      productId: product.id,
      minQuantity: 1,
      unitPrice: 10,
    })
    await createBreakpoint({
      orgId: org1Id,
      productId: product.id,
      minQuantity: 10,
      unitPrice: 8,
    })

    const bps = await listBreakpoints(product.id)

    expect(bps).toHaveLength(3)
    expect(bps[0].minQuantity).toBe(1)
    expect(bps[1].minQuantity).toBe(10)
    expect(bps[2].minQuantity).toBe(50)
  })

  it('updates a breakpoint', async () => {
    const product = await createProduct({ orgId: org1Id, name: 'Widget' })
    const bp = await createBreakpoint({
      orgId: org1Id,
      productId: product.id,
      minQuantity: 1,
      unitPrice: 10,
    })

    const updated = await updateBreakpoint({
      id: bp.id,
      orgId: org1Id,
      unitPrice: 12,
    })

    expect(updated.unitPrice).toBe(12)
  })

  it('deletes a breakpoint', async () => {
    const product = await createProduct({ orgId: org1Id, name: 'Widget' })
    const bp = await createBreakpoint({
      orgId: org1Id,
      productId: product.id,
      minQuantity: 1,
      unitPrice: 10,
    })

    await deleteBreakpoint(bp.id, org1Id)

    const bps = await listBreakpoints(product.id)
    expect(bps).toHaveLength(0)
  })

  it('creates a product with breakpoints', async () => {
    const product = await createProduct({
      orgId: org1Id,
      name: 'Widget',
      pricingBreakpoints: [
        { minQuantity: 1, unitPrice: 10 },
        { minQuantity: 10, unitPrice: 8 },
      ],
    })

    const bps = await listBreakpoints(product.id)
    expect(bps).toHaveLength(2)
    expect(bps[0].minQuantity).toBe(1)
    expect(bps[0].unitPrice).toBe(10)
    expect(bps[1].minQuantity).toBe(10)
    expect(bps[1].unitPrice).toBe(8)
  })

  it('creates a product with step pricing mode', async () => {
    const product = await createProduct({
      orgId: org1Id,
      name: 'Step Priced',
      pricingMode: 'step',
    })

    expect(product.pricingMode).toBe('step')
  })

  it('updates a product and syncs breakpoints', async () => {
    const product = await createProduct({
      orgId: org1Id,
      name: 'Widget',
      pricingBreakpoints: [
        { minQuantity: 1, unitPrice: 10 },
        { minQuantity: 10, unitPrice: 8 },
      ],
    })

    const updated = await updateProduct({
      id: product.id,
      orgId: org1Id,
      pricingMode: 'step',
      pricingBreakpoints: [{ minQuantity: 1, unitPrice: 12 }],
    })

    expect(updated.pricingMode).toBe('step')

    const bps = await listBreakpoints(product.id)
    expect(bps).toHaveLength(1)
    expect(bps[0].unitPrice).toBe(12)
  })

  it('clears breakpoints when empty array is provided', async () => {
    const product = await createProduct({
      orgId: org1Id,
      name: 'Widget',
      pricingBreakpoints: [
        { minQuantity: 1, unitPrice: 10 },
        { minQuantity: 10, unitPrice: 8 },
      ],
    })

    await updateProduct({
      id: product.id,
      orgId: org1Id,
      pricingBreakpoints: [],
    })

    const bps = await listBreakpoints(product.id)
    expect(bps).toHaveLength(0)
  })
})
