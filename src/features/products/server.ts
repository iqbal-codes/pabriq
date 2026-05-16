import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import {
  type AnyColumn,
  and,
  asc,
  desc,
  eq,
  ilike,
  type SQL,
  sql,
} from 'drizzle-orm'
import {
  pricingBreakpoints as breakpointsTable,
  products as productsTable,
} from '#/db/schema'
import type {
  CreateProductInput,
  ListProductsParams,
  ListProductsResult,
  Product,
  UpdateProductInput,
} from './model'

export type { ListProductsResult, ProductRow } from './model'

export type MutationResult = { ok: true } | { ok: false; error: string }

async function resolveOrgId(): Promise<string> {
  const [{ auth }, { db }, { member }, { eq: eq2 }] = await Promise.all([
    import('#/lib/auth'),
    import('#/db/index'),
    import('#/db/schema'),
    import('drizzle-orm'),
  ])
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')

  const memberships = await db
    .select({ orgId: member.organizationId })
    .from(member)
    .where(eq2(member.userId, session.user.id))
    .limit(1)

  if (memberships.length === 0) throw new Error('No organization')
  return memberships[0].orgId
}

const ALLOWED_SORT_FIELDS = new Set([
  'name',
  'basePrice',
  'productionDays',
  'createdAt',
  'active',
])
const SORT_COLUMNS: Record<string, AnyColumn> = {
  name: productsTable.name,
  basePrice: productsTable.basePrice,
  productionDays: productsTable.productionDays,
  createdAt: productsTable.createdAt,
  active: productsTable.active,
}

export const listProductsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: ListProductsParams) => data)
  .handler(async ({ data }): Promise<ListProductsResult> => {
    const { db } = await import('#/db/index')
    const conditions: SQL[] = [eq(productsTable.orgId, data.orgId)]

    if (data.search?.trim()) {
      const pattern = `%${data.search.trim()}%`
      conditions.push(ilike(productsTable.name, pattern) as SQL)
    }

    if (data.status === 'active') {
      conditions.push(eq(productsTable.active, true))
    } else if (data.status === 'inactive') {
      conditions.push(eq(productsTable.active, false))
    }

    const allConditions = and(...conditions) as SQL

    const orderBy =
      data.sort && ALLOWED_SORT_FIELDS.has(data.sort.field)
        ? data.sort.direction === 'asc'
          ? asc(SORT_COLUMNS[data.sort.field])
          : desc(SORT_COLUMNS[data.sort.field])
        : desc(productsTable.createdAt)

    const page = data.page ?? 1
    const perPage = data.perPage ?? 25

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
        pricingMode: sql<'interpolated' | 'step'>`${productsTable.pricingMode}`,
        minDiscountPrice: sql<number | null>`(
          SELECT MIN(b.unit_price)
          FROM ${breakpointsTable} b
          WHERE b.product_id = products.id
        )`,
      })
      .from(productsTable)
      .where(allConditions)
      .orderBy(orderBy)
      .limit(perPage)
      .offset((page - 1) * perPage)

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
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { createProduct } = await import('./model')
      await createProduct({ ...data, orgId })
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const listBreakpointsFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { productId: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<Array<{ minQuantity: number; unitPrice: number }>> => {
      const { db } = await import('#/db/index')
      const { pricingBreakpoints } = await import('#/db/schema')
      const { eq, asc } = await import('drizzle-orm')
      const rows = await db
        .select({
          minQuantity: pricingBreakpoints.minQuantity,
          unitPrice: pricingBreakpoints.unitPrice,
        })
        .from(pricingBreakpoints)
        .where(eq(pricingBreakpoints.productId, data.productId))
        .orderBy(asc(pricingBreakpoints.minQuantity))
      return rows
    },
  )

export const calculateProductPriceFn = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      productId: string
      quantity: number
      pricingMode?: 'interpolated' | 'step'
    }) => input,
  )
  .handler(async ({ data }) => {
    const { db } = await import('#/db/index')
    const { pricingBreakpoints, products: productsTable } = await import(
      '#/db/schema'
    )
    const { eq, asc } = await import('drizzle-orm')

    const rows = await db
      .select({
        minQuantity: pricingBreakpoints.minQuantity,
        unitPrice: pricingBreakpoints.unitPrice,
      })
      .from(pricingBreakpoints)
      .where(eq(pricingBreakpoints.productId, data.productId))
      .orderBy(asc(pricingBreakpoints.minQuantity))

    const [product] = await db
      .select({
        basePrice: productsTable.basePrice,
        minQuantity: productsTable.minQuantity,
      })
      .from(productsTable)
      .where(eq(productsTable.id, data.productId))
      .limit(1)

    if (!product) {
      return { ok: false as const, error: 'Product not found' }
    }

    const hasExplicitAtMinQty = rows.some(
      (r) => r.minQuantity === product.minQuantity,
    )
    if (!hasExplicitAtMinQty) {
      rows.unshift({
        minQuantity: product.minQuantity,
        unitPrice: product.basePrice,
      })
    }

    const { calculateUnitPrice } = await import('#/features/pricing/engine')
    const result = calculateUnitPrice({
      quantity: data.quantity,
      breakpoints: rows,
      mode: data.pricingMode ?? 'interpolated',
    })

    if ('code' in result) {
      return { ok: false as const, error: result.message }
    }

    return {
      ok: true as const,
      unitPrice: result.unitPrice.amount,
      total: result.lineTotal.amount,
    }
  })

export const updateProductFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Omit<UpdateProductInput, 'orgId'>) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { updateProduct } = await import('./model')
      await updateProduct({ ...data, orgId })
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })
