import { and, desc, eq, ilike, or, type SQL, sql } from 'drizzle-orm'
import { customers as customersTable } from '#/db/schema'

export type Customer = {
  id: string
  orgId: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  active: boolean
  photoAssetId: string | null
  createdAt: Date
  updatedAt: Date
}

export type CustomerInput = {
  name: string
  email?: string | null
  phone?: string | null
  notes?: string | null
  active?: boolean
  photoAssetId?: string | null
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

export function validateCustomerInput(input: CustomerInput): string | null {
  if (!input.name || input.name.trim().length === 0) {
    return 'nameRequired'
  }
  return null
}

async function getDb() {
  const { db } = await import('#/db/index')
  return db
}

export async function listCustomers(
  orgId: string,
  search?: string,
): Promise<ListCustomersResult> {
  const db = await getDb()
  const conditions: SQL[] = [eq(customersTable.orgId, orgId)]

  if (search?.trim()) {
    const pattern = `%${search.trim()}%`
    conditions.push(
      or(
        ilike(customersTable.name, pattern),
        ilike(customersTable.email, pattern),
        ilike(customersTable.phone, pattern),
      ) as SQL,
    )
  }

  const allConditions = and(...conditions) as SQL

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
    .orderBy(desc(customersTable.createdAt))

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
  await db.insert(customersTable).values({
    id: crypto.randomUUID(),
    orgId: input.orgId,
    name: input.name.trim(),
    email: input.email?.trim() ?? null,
    phone: input.phone?.trim() ?? null,
    notes: input.notes?.trim() ?? null,
    active: input.active ?? true,
    photoAssetId: input.photoAssetId ?? null,
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
  await db
    .update(customersTable)
    .set({
      name: input.name.trim(),
      email: input.email?.trim() ?? null,
      phone: input.phone?.trim() ?? null,
      notes: input.notes?.trim() ?? null,
      active: input.active ?? true,
      photoAssetId: input.photoAssetId ?? null,
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

  return rows[0] ?? null
}
