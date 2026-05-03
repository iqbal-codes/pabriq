import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { and, desc, eq, ilike, type SQL, sql } from 'drizzle-orm'
import {
  pricingBreakpoints as breakpointsTable,
  products as productsTable,
} from '#/db/schema'
import type { CreateProductInput, Product, UpdateProductInput } from './model'

export type ProductRow = {
  id: string
  name: string
  description: string | null
  active: boolean
  primaryImageAssetId: string | null
  basePrice: number
  productionDays: number
  minQuantity: number
  maxQuantity: number | null
  minDiscountPrice: number | null
}

export type ListProductsResult = {
  rows: ProductRow[]
  totalRows: number
}

async function resolveOrgId(): Promise<string> {
  const { auth } = await import('#/lib/auth')
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')

  const { db } = await import('#/db/index')
  const { member } = await import('#/db/schema')
  const { eq } = await import('drizzle-orm')
  const memberships = await db
    .select({ orgId: member.organizationId })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1)

  if (memberships.length === 0) throw new Error('No organization')
  return memberships[0].orgId
}

export const listProductsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { orgId: string; search?: string }) => data)
  .handler(async ({ data }): Promise<ListProductsResult> => {
    const { db } = await import('#/db/index')
    const conditions: SQL[] = [eq(productsTable.orgId, data.orgId)]

    if (data.search?.trim()) {
      const pattern = `%${data.search.trim()}%`
      conditions.push(ilike(productsTable.name, pattern) as SQL)
    }

    const allConditions = and(...conditions) as SQL

    const rows = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        description: productsTable.description,
        active: productsTable.active,
        primaryImageAssetId: productsTable.primaryImageAssetId,
        basePrice: productsTable.basePrice,
        productionDays: productsTable.productionDays,
        minQuantity: productsTable.minQuantity,
        maxQuantity: productsTable.maxQuantity,
        minDiscountPrice: sql<number | null>`(
          SELECT MIN(b.unit_price)
          FROM ${breakpointsTable} b
          WHERE b.product_id = ${productsTable.id}
        )`,
      })
      .from(productsTable)
      .where(allConditions)
      .orderBy(desc(productsTable.createdAt))

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(productsTable)
      .where(allConditions)

    return {
      rows,
      totalRows: Number(countResult[0]?.count ?? 0),
    }
  })

export const getProductFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<Product | null> => {
    const orgId = await resolveOrgId()
    const { getProduct } = await import('./model')
    return getProduct(data.id, orgId)
  })

export const createProductFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Omit<CreateProductInput, 'orgId'>) => input)
  .handler(async ({ data }): Promise<Product> => {
    const orgId = await resolveOrgId()
    const { createProduct } = await import('./model')
    return createProduct({ ...data, orgId })
  })

export const updateProductFn = createServerFn({ method: 'POST' })
  .inputValidator((input: UpdateProductInput) => input)
  .handler(async ({ data }): Promise<Product> => {
    const orgId = await resolveOrgId()
    const { updateProduct } = await import('./model')
    return updateProduct({ ...data, orgId })
  })
