import { and, asc, desc, eq, like } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  pricingBreakpoints as breakpointsTable,
  products as productsTable,
} from '#/db/schema'

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
  pricingMode: 'interpolated' | 'step'
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
  pricingMode?: 'interpolated' | 'step'
  pricingBreakpoints?: Array<{ minQuantity: number; unitPrice: number }>
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
  active?: boolean
  pricingMode?: 'interpolated' | 'step'
  pricingBreakpoints?: Array<{ minQuantity: number; unitPrice: number }>
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
  minDiscountPrice: number | null
  pricingMode: 'step' | 'interpolated'
}

function generateId(): string {
  return crypto.randomUUID()
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
    description: input.description ?? null,
    priority: input.priority ?? false,
    productionNotes: input.productionNotes ?? null,
    primaryImageAssetId: input.primaryImageAssetId ?? null,
    basePrice: input.basePrice ?? 0,
    productionDays: input.productionDays ?? 1,
    minQuantity: input.minQuantity ?? 1,
    maxQuantity: input.maxQuantity ?? null,
    pricingMode: input.pricingMode ?? 'interpolated',
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
  if (input.description !== undefined) updates.description = input.description
  if (input.priority !== undefined) updates.priority = input.priority
  if (input.productionNotes !== undefined)
    updates.productionNotes = input.productionNotes
  if (input.primaryImageAssetId !== undefined)
    updates.primaryImageAssetId = input.primaryImageAssetId
  if (input.basePrice !== undefined) updates.basePrice = input.basePrice
  if (input.productionDays !== undefined)
    updates.productionDays = input.productionDays
  if (input.minQuantity !== undefined) updates.minQuantity = input.minQuantity
  if (input.maxQuantity !== undefined) updates.maxQuantity = input.maxQuantity
  if (input.active !== undefined) updates.active = input.active
  if (input.pricingMode !== undefined) updates.pricingMode = input.pricingMode

  await db
    .update(productsTable)
    .set(updates)
    .where(
      and(eq(productsTable.id, input.id), eq(productsTable.orgId, input.orgId)),
    )

  if (input.pricingBreakpoints !== undefined) {
    await db
      .delete(breakpointsTable)
      .where(eq(breakpointsTable.productId, input.id))

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

  const rows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, input.id))
    .limit(1)

  return rows[0] as Product
}

export async function listProducts(
  options: ProductListOptions,
): Promise<Product[]> {
  const conditions = [eq(productsTable.orgId, options.orgId)]

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

export async function getProduct(
  id: string,
  orgId: string,
): Promise<Product | null> {
  const rows = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.id, id), eq(productsTable.orgId, orgId)))
    .limit(1)

  return (rows[0] as Product) ?? null
}

export async function deleteProduct(id: string, orgId: string): Promise<void> {
  await db
    .delete(productsTable)
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
): Promise<PricingBreakpoint[]> {
  const rows = await db
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
