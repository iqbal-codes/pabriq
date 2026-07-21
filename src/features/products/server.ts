import { createServerFn } from '@tanstack/react-start'
import { and } from 'drizzle-orm'
import { resolveOrgId } from '#/lib/auth-session-server'
import type { MutationResult } from '#/lib/server-results'
import type {
  CreateProductInput,
  ListProductsParams,
  ListProductsResult,
  Product,
  UpdateProductInput,
} from './model'

export type { ProductRow } from './model'

export const listProductsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: ListProductsParams) => data)
  .handler(async ({ data }): Promise<ListProductsResult> => {
    const { listProductRows } = await import('./model')
    return listProductRows(data)
  })

export const getProductFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<Product | null> => {
    const [orgId, { getProduct }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return getProduct(data.id, orgId)
  })

export const createProductFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Omit<CreateProductInput, 'orgId'>) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const [orgId, { createProduct }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    try {
      await createProduct({ ...data, orgId })
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const deleteProductFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const [{ deleteProduct }, orgId] = await Promise.all([
      import('./model'),
      resolveOrgId(),
    ])
    try {
      await deleteProduct(data.id, orgId)
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
      const [{ db }, { pricingBreakpoints }, { eq, asc }] = await Promise.all([
        import('#/db/index'),
        import('#/db/schema'),
        import('drizzle-orm'),
      ])
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

export const listProductAddonsFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { productId: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<Array<{ id: string; name: string; unitSurcharge: number }>> => {
      const [{ db }, { productAddons }, { eq, asc }, orgId] = await Promise.all(
        [
          import('#/db/index'),
          import('#/db/schema'),
          import('drizzle-orm'),
          resolveOrgId(),
        ],
      )
      const rows = await db
        .select({
          id: productAddons.id,
          name: productAddons.name,
          unitSurcharge: productAddons.unitSurcharge,
        })
        .from(productAddons)
        .where(
          and(
            eq(productAddons.productId, data.productId),
            eq(productAddons.orgId, orgId),
          ),
        )
        .orderBy(asc(productAddons.createdAt))
      return rows
    },
  )

export const calculateProductPriceFn = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      productId: string
      quantity: number
      pricingMode?: 'interpolated' | 'step'
      isRepeatOrder?: boolean
      addonIds?: string[]
    }) => input,
  )
  .handler(async ({ data }) => {
    const [
      { db },
      { pricingBreakpoints, products: productsTable, productAddons },
      { eq, asc, and, inArray },
      orgId,
    ] = await Promise.all([
      import('#/db/index'),
      import('#/db/schema'),
      import('drizzle-orm'),
      resolveOrgId(),
    ])

    const [rows, [product]] = await Promise.all([
      db
        .select({
          minQuantity: pricingBreakpoints.minQuantity,
          unitPrice: pricingBreakpoints.unitPrice,
        })
        .from(pricingBreakpoints)
        .where(eq(pricingBreakpoints.productId, data.productId))
        .orderBy(asc(pricingBreakpoints.minQuantity)),
      db
        .select({
          basePrice: productsTable.basePrice,
          minQuantity: productsTable.minQuantity,
          pricingMode: productsTable.pricingMode,
          repeatOrderUnitPrice: productsTable.repeatOrderUnitPrice,
          repeatOrderMinQuantity: productsTable.repeatOrderMinQuantity,
          negotiateAboveQuantity: productsTable.negotiateAboveQuantity,
        })
        .from(productsTable)
        .where(eq(productsTable.id, data.productId))
        .limit(1),
    ])

    if (!product) {
      return { ok: false as const, error: 'Product not found' }
    }

    // Load selected addons
    let addonSurcharge = 0
    if (data.addonIds && data.addonIds.length > 0) {
      const addonRows = await db
        .select({
          id: productAddons.id,
          unitSurcharge: productAddons.unitSurcharge,
        })
        .from(productAddons)
        .where(
          and(
            eq(productAddons.productId, data.productId),
            eq(productAddons.orgId, orgId),
            inArray(productAddons.id, data.addonIds),
          ),
        )
      if (addonRows.length !== data.addonIds.length) {
        return { ok: false as const, error: 'Invalid product addon' }
      }
      addonSurcharge = addonRows.reduce(
        (sum: number, a: { id: string; unitSurcharge: number }) =>
          sum + a.unitSurcharge,
        0,
      )
    }

    // Inject base price at minQuantity if no explicit breakpoint
    const hasExplicitAtMinQty = rows.some(
      (r) => r.minQuantity === product.minQuantity,
    )
    if (!hasExplicitAtMinQty) {
      rows.unshift({
        minQuantity: product.minQuantity,
        unitPrice: product.basePrice,
      })
    }

    let baseUnitPrice: number

    if (data.isRepeatOrder) {
      if (product.repeatOrderUnitPrice == null) {
        return {
          ok: false as const,
          error: 'Product does not support repeat orders',
        }
      }
      const minQty = product.repeatOrderMinQuantity ?? product.minQuantity
      if (data.quantity < minQty) {
        return {
          ok: false as const,
          error: `Quantity below repeat order minimum of ${minQty}`,
        }
      }
      baseUnitPrice = product.repeatOrderUnitPrice
    } else if (
      product.negotiateAboveQuantity != null &&
      data.quantity > product.negotiateAboveQuantity
    ) {
      const cheapest =
        rows.length > 0
          ? Math.min(...rows.map((bp) => bp.unitPrice))
          : product.basePrice
      baseUnitPrice = cheapest
    } else {
      const { calculateUnitPrice } = await import('#/features/pricing/engine')
      const result = calculateUnitPrice({
        quantity: data.quantity,
        breakpoints: rows,
        mode: data.pricingMode ?? 'interpolated',
      })

      if ('code' in result) {
        return { ok: false as const, error: result.message }
      }
      baseUnitPrice = result.unitPrice.amount
    }

    const unitPrice = baseUnitPrice + addonSurcharge
    return {
      ok: true as const,
      unitPrice,
      total: unitPrice * data.quantity,
    }
  })

export const updateProductFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Omit<UpdateProductInput, 'orgId'>) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const [{ updateProduct }, orgId] = await Promise.all([
      import('./model'),
      resolveOrgId(),
    ])
    try {
      await updateProduct({ ...data, orgId })
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })
