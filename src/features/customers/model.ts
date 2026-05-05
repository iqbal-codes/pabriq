import {
  type AnyColumn,
  and,
  asc,
  desc,
  eq,
  ilike,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import { customers as customersTable } from '#/db/schema'
import {
  createAddressFn,
  getCustomerAddress,
  type ShippingAddress,
  updateAddressFn,
} from '#/features/address/model'

export type Customer = {
  id: string
  orgId: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  active: boolean
  isWni: boolean
  photoAssetId: string | null
  address: ShippingAddress | null
  createdAt: Date
  updatedAt: Date
}

export type CustomerInput = {
  name: string
  email?: string | null
  phone?: string | null
  notes?: string | null
  active?: boolean
  isWni?: boolean
  photoAssetId?: string | null
  address?: ShippingAddress | null
}

export type CustomerRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  active: boolean
  photoAssetId: string | null
}

export type ListCustomersResult = {
  rows: CustomerRow[]
  totalRows: number
}

export type ListCustomersParams = {
  orgId: string
  search?: string
  status?: string
  sort?: { field: string; direction: 'asc' | 'desc' } | null
  page?: number
  perPage?: number
}

export function validateCustomerInput(input: CustomerInput): string | null {
  if (!input.name || input.name.trim().length === 0) {
    return 'nameRequired'
  }
  return null
}

function normalizeAddress(
  address?: ShippingAddress | null,
): ShippingAddress | null {
  if (!address) return null

  const areaId = address.areaId.trim()
  const areaName = address.areaName.trim()
  const streetAddress = address.streetAddress.trim()

  if (!areaId && !areaName && !streetAddress) {
    return null
  }

  return {
    areaId,
    areaName,
    streetAddress,
  }
}

async function persistCustomerAddress(
  orgId: string,
  addressId: string | null,
  address: ShippingAddress | null,
  isWni: boolean,
): Promise<string | null> {
  if (!address) {
    return null
  }

  if (addressId) {
    const updateResult = await updateAddressFn(addressId, {
      ...address,
      isWni,
      areaId: isWni ? address.areaId : undefined,
      areaName: isWni ? address.areaName : undefined,
    })
    if (updateResult.ok) {
      return addressId
    }
  }

  const createResult = await createAddressFn({
    orgId,
    areaId: isWni ? address.areaId : undefined,
    areaName: isWni ? address.areaName : undefined,
    streetAddress: address.streetAddress,
    isWni,
  })

  if (!createResult.ok) {
    throw new Error(createResult.error)
  }

  return createResult.addressId
}

async function getDb() {
  const { db } = await import('#/db/index')
  return db
}

const ALLOWED_SORT_FIELDS = new Set(['name', 'email', 'createdAt', 'active'])
const SORT_COLUMNS: Record<string, AnyColumn> = {
  name: customersTable.name,
  email: customersTable.email,
  createdAt: customersTable.createdAt,
  active: customersTable.active,
}

export async function listCustomers(
  params: ListCustomersParams,
): Promise<ListCustomersResult> {
  const db = await getDb()
  const conditions: SQL[] = [eq(customersTable.orgId, params.orgId)]

  if (params.search?.trim()) {
    const pattern = `%${params.search.trim()}%`
    conditions.push(
      or(
        ilike(customersTable.name, pattern),
        ilike(customersTable.email, pattern),
        ilike(customersTable.phone, pattern),
      ) as SQL,
    )
  }

  if (params.status === 'active') {
    conditions.push(eq(customersTable.active, true))
  } else if (params.status === 'inactive') {
    conditions.push(eq(customersTable.active, false))
  }

  const allConditions = and(...conditions) as SQL

  const orderBy =
    params.sort && ALLOWED_SORT_FIELDS.has(params.sort.field)
      ? params.sort.direction === 'asc'
        ? asc(SORT_COLUMNS[params.sort.field])
        : desc(SORT_COLUMNS[params.sort.field])
      : desc(customersTable.createdAt)

  const page = params.page ?? 1
  const perPage = params.perPage ?? 25

  const rows = await db
    .select({
      id: customersTable.id,
      name: customersTable.name,
      email: customersTable.email,
      phone: customersTable.phone,
      active: customersTable.active,
      photoAssetId: customersTable.photoAssetId,
    })
    .from(customersTable)
    .where(allConditions)
    .orderBy(orderBy)
    .limit(perPage)
    .offset((page - 1) * perPage)

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(customersTable)
    .where(allConditions)

  return {
    rows,
    totalRows: Number(countResult[0]?.count ?? 0),
  }
}

export async function createCustomer(
  input: CustomerInput & { orgId: string },
): Promise<void> {
  const validationError = validateCustomerInput(input)
  if (validationError) {
    throw new Error(validationError)
  }

  const db = await getDb()
  const address = normalizeAddress(input.address)
  const isWni = input.isWni ?? true
  const addressId = await persistCustomerAddress(
    input.orgId,
    null,
    address,
    isWni,
  )

  await db.insert(customersTable).values({
    id: crypto.randomUUID(),
    orgId: input.orgId,
    name: input.name.trim(),
    email: input.email?.trim() ?? null,
    phone: input.phone?.trim() ?? null,
    notes: input.notes?.trim() ?? null,
    active: input.active ?? true,
    isWni,
    photoAssetId: input.photoAssetId ?? null,
    addressId,
  })
}

export async function updateCustomer(
  id: string,
  orgId: string,
  input: CustomerInput,
): Promise<void> {
  const validationError = validateCustomerInput(input)
  if (validationError) {
    throw new Error(validationError)
  }

  const db = await getDb()
  const existing = await db
    .select({ addressId: customersTable.addressId })
    .from(customersTable)
    .where(and(eq(customersTable.id, id), eq(customersTable.orgId, orgId)))
    .limit(1)

  if (existing.length === 0) {
    return
  }

  const address = normalizeAddress(input.address)
  const isWni = input.isWni ?? true
  const addressId = await persistCustomerAddress(
    orgId,
    existing[0].addressId,
    address,
    isWni,
  )

  await db
    .update(customersTable)
    .set({
      name: input.name.trim(),
      email: input.email?.trim() ?? null,
      phone: input.phone?.trim() ?? null,
      notes: input.notes?.trim() ?? null,
      active: input.active ?? true,
      isWni,
      photoAssetId: input.photoAssetId ?? null,
      addressId,
      updatedAt: new Date(),
    })
    .where(and(eq(customersTable.id, id), eq(customersTable.orgId, orgId)))
}

export async function getCustomer(
  id: string,
  orgId: string,
): Promise<Customer | null> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(customersTable)
    .where(and(eq(customersTable.id, id), eq(customersTable.orgId, orgId)))
    .limit(1)

  const customer = rows[0]
  if (!customer) {
    return null
  }

  const address = await getCustomerAddress(id, orgId)

  return {
    id: customer.id,
    orgId: customer.orgId,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    notes: customer.notes,
    active: customer.active,
    isWni: customer.isWni,
    photoAssetId: customer.photoAssetId,
    address: address
      ? {
          areaId: address.areaId ?? '',
          areaName: address.areaName ?? '',
          streetAddress: address.streetAddress ?? '',
        }
      : null,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  }
}
