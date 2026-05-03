import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import { organization } from '#/db/schema'
import {
  createBreakpoint,
  createProduct,
  createVariant,
  deleteBreakpoint,
  deleteProduct,
  deleteVariant,
  getProduct,
  listBreakpoints,
  listProducts,
  listVariants,
  updateBreakpoint,
  updateProduct,
  updateVariant,
} from './model'

const org1Id = '00000000-0000-0000-0000-000000000001'
const org2Id = '00000000-0000-0000-0000-000000000002'

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

  it('deletes a product', async () => {
    const created = await createProduct({ orgId: org1Id, name: 'Delete Me' })

    await deleteProduct(created.id, org1Id)

    const fetched = await getProduct(created.id, org1Id)
    expect(fetched).toBeNull()
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

describe('variants', () => {
  it('creates a variant on a product', async () => {
    const product = await createProduct({ orgId: org1Id, name: 'T-Shirt' })

    const variant = await createVariant({
      orgId: org1Id,
      productId: product.id,
      name: 'Large',
      attributes: { size: 'L', color: 'Red' },
    })

    expect(variant.id).toBeDefined()
    expect(variant.name).toBe('Large')
    expect(variant.productId).toBe(product.id)
    expect(variant.orgId).toBe(org1Id)
    expect(variant.active).toBe(true)
  })

  it('lists variants for a product', async () => {
    const product = await createProduct({ orgId: org1Id, name: 'T-Shirt' })
    await createVariant({ orgId: org1Id, productId: product.id, name: 'S' })
    await createVariant({ orgId: org1Id, productId: product.id, name: 'M' })
    await createVariant({ orgId: org1Id, productId: product.id, name: 'L' })

    const variants = await listVariants(product.id)

    expect(variants).toHaveLength(3)
    expect(variants.map((v) => v.name)).toEqual(['S', 'M', 'L'])
  })

  it('updates a variant', async () => {
    const product = await createProduct({ orgId: org1Id, name: 'T-Shirt' })
    const variant = await createVariant({
      orgId: org1Id,
      productId: product.id,
      name: 'Small',
    })

    const updated = await updateVariant({
      id: variant.id,
      orgId: org1Id,
      name: 'Extra Small',
    })

    expect(updated.name).toBe('Extra Small')
  })

  it('toggles variant active status', async () => {
    const product = await createProduct({ orgId: org1Id, name: 'T-Shirt' })
    const variant = await createVariant({
      orgId: org1Id,
      productId: product.id,
      name: 'Limited',
    })
    expect(variant.active).toBe(true)

    const deactivated = await updateVariant({
      id: variant.id,
      orgId: org1Id,
      active: false,
    })
    expect(deactivated.active).toBe(false)
  })

  it('deletes a variant', async () => {
    const product = await createProduct({ orgId: org1Id, name: 'T-Shirt' })
    const variant = await createVariant({
      orgId: org1Id,
      productId: product.id,
      name: 'Delete Me',
    })

    await deleteVariant(variant.id, org1Id)

    const variants = await listVariants(product.id)
    expect(variants).toHaveLength(0)
  })

  it('does not delete variant from wrong org', async () => {
    const product = await createProduct({ orgId: org1Id, name: 'T-Shirt' })
    const variant = await createVariant({
      orgId: org1Id,
      productId: product.id,
      name: 'Safe',
    })

    await deleteVariant(variant.id, org2Id)

    const variants = await listVariants(product.id)
    expect(variants).toHaveLength(1)
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
    expect(bp.variantId).toBeNull()
  })

  it('creates variant-specific breakpoints', async () => {
    const product = await createProduct({ orgId: org1Id, name: 'Widget' })
    const variant = await createVariant({
      orgId: org1Id,
      productId: product.id,
      name: 'Premium',
    })

    const bp = await createBreakpoint({
      orgId: org1Id,
      productId: product.id,
      variantId: variant.id,
      minQuantity: 1,
      unitPrice: 15,
    })

    expect(bp.variantId).toBe(variant.id)
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

  it('filters breakpoints by variant', async () => {
    const product = await createProduct({ orgId: org1Id, name: 'Widget' })
    const v1 = await createVariant({
      orgId: org1Id,
      productId: product.id,
      name: 'Basic',
    })
    const v2 = await createVariant({
      orgId: org1Id,
      productId: product.id,
      name: 'Premium',
    })

    await createBreakpoint({
      orgId: org1Id,
      productId: product.id,
      variantId: v1.id,
      minQuantity: 1,
      unitPrice: 10,
    })
    await createBreakpoint({
      orgId: org1Id,
      productId: product.id,
      variantId: v2.id,
      minQuantity: 1,
      unitPrice: 20,
    })
    await createBreakpoint({
      orgId: org1Id,
      productId: product.id,
      minQuantity: 1,
      unitPrice: 5,
    })

    const v1bps = await listBreakpoints(product.id, v1.id)
    expect(v1bps).toHaveLength(1)
    expect(v1bps[0].unitPrice).toBe(10)
  })
})
