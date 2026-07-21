import {
  and,
  asc,
  desc,
  eq,
  ilike,
  isNull,
  like,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import { db } from '#/db/index'
import {
  productAddons as addonsTable,
  pricingBreakpoints as breakpointsTable,
  products as productsTable,
} from '#/db/schema'
import { buildOrderBy, type SortColumnMap } from '#/lib/sorting'

export type DbClient = Pick<typeof db, 'select'>
export type Product = {
  id: string
  orgId: string
  name: string
  description: string | null
  active: boolean
  priority: boolean
  productionNotes: string | null
  primaryImageAssetId: string | null
  basePrice: number
  productionDays: number
  minQuantity: number
  maxQuantity: number | null
  negotiateAboveQuantity: number | null
  repeatOrderUnitPrice: number | null
  repeatOrderMinQuantity: number | null
  maxProductionQuantity: number | null
  pricingMode: 'interpolated' | 'step'
  category: string | null
  createdAt: Date
  updatedAt: Date
}
export type CreateProductInput = {
  orgId: string
  name: string
  description?: string
  priority?: boolean
  productionNotes?: string
  primaryImageAssetId?: string | null
  basePrice?: number
  productionDays?: number
  minQuantity?: number
  maxQuantity?: number
  negotiateAboveQuantity?: number
  repeatOrderUnitPrice?: number
  repeatOrderMinQuantity?: number
  maxProductionQuantity?: number
  category?: string
  pricingMode?: 'interpolated' | 'step'
  pricingBreakpoints?: Array<{ minQuantity: number; unitPrice: number }>
  productAddons?: Array<{ name: string; unitSurcharge: number }>
}

export type UpdateProductInput = {
  id: string
  orgId: string
  name?: string
  description?: string | null
  priority?: boolean
  productionNotes?: string | null
  primaryImageAssetId?: string | null
  basePrice?: number
  productionDays?: number
  minQuantity?: number
  maxQuantity?: number | null
  negotiateAboveQuantity?: number | null
  repeatOrderUnitPrice?: number | null
  repeatOrderMinQuantity?: number | null
  maxProductionQuantity?: number | null
  active?: boolean
  pricingMode?: 'interpolated' | 'step'
  category?: string | null
  pricingBreakpoints?: Array<{ minQuantity: number; unitPrice: number }>
  productAddons?: Array<{ name: string; unitSurcharge: number }>
}

export type ProductListOptions = {
  orgId: string
  search?: string
  activeOnly?: boolean
  sortBy?: 'createdAt' | 'name'
  sortDir?: 'asc' | 'desc'
}

export type ListProductsParams = {
  orgId: string
  search?: string
  status?: string
  sort?: { field: string; direction: 'asc' | 'desc' } | null
  page?: number
  perPage?: number
}

export type ListProductsResult = {
  rows: ProductRow[]
  totalRows: number
}

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
  negotiateAboveQuantity: number | null
  repeatOrderUnitPrice: number | null
  repeatOrderMinQuantity: number | null
  maxProductionQuantity: number | null
  minDiscountPrice: number | null
  pricingMode: 'step' | 'interpolated'
  category: string | null
  createdAt: Date
}

function generateId(): string {
  return crypto.randomUUID()
}
/** Coerce empty-string and undefined to null (covers form fields that submit '' for optional columns). */
function toNull<T>(value: T | '' | null | undefined): T | null {
  if (value === '' || value == null) return null
  return value
}

export async function createProduct(
  input: CreateProductInput,
): Promise<Product> {
  const id = generateId()
  const now = new Date()
  await db.insert(productsTable).values({
    id,
    orgId: input.orgId,
    name: input.name,
    description: toNull(input.description),
    priority: input.priority ?? false,
    productionNotes: toNull(input.productionNotes),
    primaryImageAssetId: toNull(input.primaryImageAssetId),
    basePrice: input.basePrice ?? 0,
    productionDays: input.productionDays ?? 1,
    minQuantity: input.minQuantity ?? 1,
    maxQuantity: toNull(input.maxQuantity),
    negotiateAboveQuantity: toNull(input.negotiateAboveQuantity),
    repeatOrderUnitPrice: toNull(input.repeatOrderUnitPrice),
    repeatOrderMinQuantity: toNull(input.repeatOrderMinQuantity),
    maxProductionQuantity: toNull(input.maxProductionQuantity),
    pricingMode: input.pricingMode ?? 'interpolated',
    category: toNull(input.category),
    active: true,
    createdAt: now,
    updatedAt: now,
  })

  if (input.pricingBreakpoints && input.pricingBreakpoints.length > 0) {
    const breakpoints = input.pricingBreakpoints.map((bp) => ({
      id: generateId(),
      orgId: input.orgId,
      productId: id,
      minQuantity: bp.minQuantity,
      unitPrice: bp.unitPrice,
      createdAt: now,
      updatedAt: now,
    }))
    await db.insert(breakpointsTable).values(breakpoints)
  }

  if (input.productAddons && input.productAddons.length > 0) {
    const addons = input.productAddons.map((a) => ({
      id: generateId(),
      orgId: input.orgId,
      productId: id,
      name: a.name,
      unitSurcharge: a.unitSurcharge,
      createdAt: now,
      updatedAt: now,
    }))
    await db.insert(addonsTable).values(addons)
  }

  const rows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id))
    .limit(1)

  return rows[0] as Product
}

export async function updateProduct(
  input: UpdateProductInput,
): Promise<Product> {
  const now = new Date()
  const updates: Record<string, unknown> = { updatedAt: now }
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined)
    updates.description = toNull(input.description)
  if (input.priority !== undefined) updates.priority = input.priority
  if (input.productionNotes !== undefined)
    updates.productionNotes = toNull(input.productionNotes)
  if (input.primaryImageAssetId !== undefined)
    updates.primaryImageAssetId = toNull(input.primaryImageAssetId)
  if (input.basePrice !== undefined) updates.basePrice = input.basePrice
  if (input.productionDays !== undefined)
    updates.productionDays = input.productionDays
  if (input.minQuantity !== undefined) updates.minQuantity = input.minQuantity
  if (input.maxQuantity !== undefined)
    updates.maxQuantity = toNull(input.maxQuantity)
  if (input.negotiateAboveQuantity !== undefined)
    updates.negotiateAboveQuantity = toNull(input.negotiateAboveQuantity)
  if (input.repeatOrderUnitPrice !== undefined)
    updates.repeatOrderUnitPrice = toNull(input.repeatOrderUnitPrice)
  if (input.repeatOrderMinQuantity !== undefined)
    updates.repeatOrderMinQuantity = toNull(input.repeatOrderMinQuantity)
  if (input.maxProductionQuantity !== undefined)
    updates.maxProductionQuantity = toNull(input.maxProductionQuantity)
  if (input.active !== undefined) updates.active = input.active
  if (input.pricingMode !== undefined) updates.pricingMode = input.pricingMode
  if (input.category !== undefined) updates.category = toNull(input.category)

  await db
    .update(productsTable)
    .set(updates)
    .where(
      and(eq(productsTable.id, input.id), eq(productsTable.orgId, input.orgId)),
    )

  if (input.pricingBreakpoints !== undefined) {
    await db
      .delete(breakpointsTable)
      .where(
        and(
          eq(breakpointsTable.productId, input.id),
          eq(breakpointsTable.orgId, input.orgId),
        ),
      )

    if (input.pricingBreakpoints.length > 0) {
      const breakpoints = input.pricingBreakpoints.map((bp) => ({
        id: generateId(),
        orgId: input.orgId,
        productId: input.id,
        minQuantity: bp.minQuantity,
        unitPrice: bp.unitPrice,
        createdAt: now,
        updatedAt: now,
      }))
      await db.insert(breakpointsTable).values(breakpoints)
    }
  }

  if (input.productAddons !== undefined) {
    await db
      .delete(addonsTable)
      .where(
        and(
          eq(addonsTable.productId, input.id),
          eq(addonsTable.orgId, input.orgId),
        ),
      )

    if (input.productAddons.length > 0) {
      const addons = input.productAddons.map((a) => ({
        id: generateId(),
        orgId: input.orgId,
        productId: input.id,
        name: a.name,
        unitSurcharge: a.unitSurcharge,
        createdAt: now,
        updatedAt: now,
      }))
      await db.insert(addonsTable).values(addons)
    }
  }

  const rows = await db
    .select()
    .from(productsTable)
    .where(
      and(eq(productsTable.id, input.id), eq(productsTable.orgId, input.orgId)),
    )
    .limit(1)

  if (rows.length === 0) throw new Error('Product not found')
  return rows[0] as Product
}

export async function listProducts(
  options: ProductListOptions,
): Promise<Product[]> {
  const conditions = [
    eq(productsTable.orgId, options.orgId),
    isNull(productsTable.deletedAt),
  ]

  if (options.activeOnly) {
    conditions.push(eq(productsTable.active, true))
  }

  if (options.search) {
    const pattern = `%${options.search}%`
    conditions.push(like(productsTable.name, pattern))
  }

  const orderBy =
    options.sortBy === 'name'
      ? options.sortDir === 'desc'
        ? desc(productsTable.name)
        : asc(productsTable.name)
      : options.sortDir === 'desc'
        ? desc(productsTable.createdAt)
        : asc(productsTable.createdAt)

  const rows = await db
    .select()
    .from(productsTable)
    .where(and(...conditions))
    .orderBy(orderBy)

  return rows as Product[]
}
const PRODUCT_SORT_COLUMNS = {
  name: productsTable.name,
  createdAt: productsTable.createdAt,
  basePrice: productsTable.basePrice,
  productionDays: productsTable.productionDays,
  minQuantity: productsTable.minQuantity,
} satisfies SortColumnMap

export async function listProductRows(
  params: ListProductsParams,
): Promise<ListProductsResult> {
  const conditions: SQL[] = [
    eq(productsTable.orgId, params.orgId),
    isNull(productsTable.deletedAt),
  ]

  if (params.search?.trim()) {
    const pattern = `%${params.search.trim()}%`
    conditions.push(
      or(
        ilike(productsTable.name, pattern),
        ilike(productsTable.category, pattern),
      ) as SQL,
    )
  }

  if (params.status === 'active') {
    conditions.push(eq(productsTable.active, true))
  } else if (params.status === 'inactive') {
    conditions.push(eq(productsTable.active, false))
  }

  const allConditions = and(...conditions) as SQL

  const orderBy = buildOrderBy(
    params.sort,
    PRODUCT_SORT_COLUMNS,
    desc(productsTable.createdAt),
  )

  const page = params.page ?? 1
  const perPage = params.perPage ?? 25

  const [rows, countResult] = await Promise.all([
    db
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
        category: productsTable.category,
        negotiateAboveQuantity: productsTable.negotiateAboveQuantity,
        repeatOrderUnitPrice: productsTable.repeatOrderUnitPrice,
        repeatOrderMinQuantity: productsTable.repeatOrderMinQuantity,
        maxProductionQuantity: productsTable.maxProductionQuantity,
        minDiscountPrice: sql<number | null>`(
        SELECT MIN(b.unit_price)
        FROM ${breakpointsTable} b
        WHERE b.product_id = products.id
      )`,
        createdAt: productsTable.createdAt,
      })
      .from(productsTable)
      .where(allConditions)
      .orderBy(orderBy)
      .limit(perPage)
      .offset((page - 1) * perPage),
    db
      .select({ count: sql<number>`count(*)` })
      .from(productsTable)
      .where(allConditions),
  ])

  return {
    rows,
    totalRows: Number(countResult[0]?.count ?? 0),
  }
}

export async function getProduct(
  id: string,
  orgId: string,
): Promise<Product | null> {
  const rows = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, id),
        eq(productsTable.orgId, orgId),
        isNull(productsTable.deletedAt),
      ),
    )
    .limit(1)

  return (rows[0] as Product) ?? null
}

export async function deleteProduct(id: string, orgId: string): Promise<void> {
  await db
    .update(productsTable)
    .set({ active: false, deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(productsTable.id, id), eq(productsTable.orgId, orgId)))
}

export type PricingBreakpoint = {
  id: string
  orgId: string
  productId: string
  minQuantity: number
  unitPrice: number
  createdAt: Date
  updatedAt: Date
}

export type CreateBreakpointInput = {
  orgId: string
  productId: string
  minQuantity: number
  unitPrice: number
}

export async function createBreakpoint(
  input: CreateBreakpointInput,
): Promise<PricingBreakpoint> {
  const id = generateId()
  const now = new Date()
  await db.insert(breakpointsTable).values({
    id,
    orgId: input.orgId,
    productId: input.productId,
    minQuantity: input.minQuantity,
    unitPrice: input.unitPrice,
    createdAt: now,
    updatedAt: now,
  })

  const rows = await db
    .select()
    .from(breakpointsTable)
    .where(eq(breakpointsTable.id, id))
    .limit(1)

  return rows[0] as PricingBreakpoint
}

export async function listBreakpoints(
  productId: string,
  client: DbClient = db,
): Promise<PricingBreakpoint[]> {
  const rows = await client
    .select()
    .from(breakpointsTable)
    .where(eq(breakpointsTable.productId, productId))
    .orderBy(asc(breakpointsTable.minQuantity))

  return rows as PricingBreakpoint[]
}

export async function updateBreakpoint(input: {
  id: string
  orgId: string
  minQuantity?: number
  unitPrice?: number
}): Promise<PricingBreakpoint> {
  const now = new Date()
  const updates: Record<string, unknown> = { updatedAt: now }
  if (input.minQuantity !== undefined) updates.minQuantity = input.minQuantity
  if (input.unitPrice !== undefined) updates.unitPrice = input.unitPrice

  await db
    .update(breakpointsTable)
    .set(updates)
    .where(
      and(
        eq(breakpointsTable.id, input.id),
        eq(breakpointsTable.orgId, input.orgId),
      ),
    )

  const rows = await db
    .select()
    .from(breakpointsTable)
    .where(eq(breakpointsTable.id, input.id))
    .limit(1)

  return rows[0] as PricingBreakpoint
}

export async function deleteBreakpoint(
  id: string,
  orgId: string,
): Promise<void> {
  await db
    .delete(breakpointsTable)
    .where(and(eq(breakpointsTable.id, id), eq(breakpointsTable.orgId, orgId)))
}
