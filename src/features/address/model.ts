import { createServerFn } from '@tanstack/react-start'
import { and, eq, ilike, or } from 'drizzle-orm'
import { addresses, biteshipAreas, customers } from '#/db/schema'

export type BiteshipArea = {
  id: string
  name: string
  area: string
}

export type Address = {
  id: string
  orgId: string
  areaId: string | null
  areaName: string | null
  streetAddress: string | null
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

export type AddressInput = {
  orgId: string
  areaId?: string
  areaName?: string
  streetAddress?: string
  isDefault?: boolean
  isWni?: boolean
}

export type ShippingAddress = {
  areaId: string
  areaName: string
  streetAddress: string
}

export function validateAddressInput(input: AddressInput): string | null {
  if (!input.orgId) {
    return 'orgIdRequired'
  }
  if (input.isWni !== false && !input.areaId) {
    return 'areaRequired'
  }
  return null
}

async function getDb() {
  const { db } = await import('#/db/index')
  return db
}

export async function createAddressFn(
  input: AddressInput,
): Promise<{ ok: true; addressId: string } | { ok: false; error: string }> {
  const validationError = validateAddressInput(input)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  const shouldSetDefault = input.isDefault ?? false
  const db = await getDb()

  if (shouldSetDefault) {
    await db
      .update(addresses)
      .set({ isDefault: false })
      .where(
        and(eq(addresses.orgId, input.orgId), eq(addresses.isDefault, true)),
      )
  }

  const addressId = crypto.randomUUID()
  await db.insert(addresses).values({
    id: addressId,
    orgId: input.orgId,
    areaId: input.areaId ?? null,
    areaName: input.areaName ?? null,
    streetAddress: input.streetAddress ?? null,
    isDefault: shouldSetDefault,
  })

  return { ok: true, addressId }
}

export async function updateAddressFn(
  id: string,
  input: Partial<AddressInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb()
  const existing = await db
    .select()
    .from(addresses)
    .where(eq(addresses.id, id))
    .limit(1)

  if (existing.length === 0) {
    return { ok: false, error: 'notFound' }
  }

  const currentAreaId = existing[0].areaId
  const newAreaId = input.areaId !== undefined ? input.areaId : currentAreaId
  const isWni = input.isWni !== undefined ? input.isWni : true

  if (isWni !== false && !newAreaId) {
    return { ok: false, error: 'areaRequired' }
  }

  const shouldSetDefault = input.isDefault ?? false

  if (shouldSetDefault) {
    await db
      .update(addresses)
      .set({ isDefault: false })
      .where(
        and(
          eq(addresses.orgId, existing[0].orgId),
          eq(addresses.isDefault, true),
        ),
      )
  }

  await db
    .update(addresses)
    .set({
      areaId: newAreaId,
      areaName: input.areaName ?? existing[0].areaName,
      streetAddress: input.streetAddress ?? existing[0].streetAddress,
      isDefault: shouldSetDefault,
      updatedAt: new Date(),
    })
    .where(eq(addresses.id, id))

  return { ok: true }
}

export async function searchAreas(query: string): Promise<BiteshipArea[]> {
  if (!query.trim()) {
    return []
  }

  const pattern = `%${query.trim()}%`
  const db = await getDb()

  const rows = await db
    .select({
      id: biteshipAreas.areaId,
      name: biteshipAreas.name,
      area: biteshipAreas.subdistrict,
    })
    .from(biteshipAreas)
    .where(
      or(
        ilike(biteshipAreas.name, pattern),
        ilike(biteshipAreas.postalCode, pattern),
      ),
    )
    .limit(20)

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    area: r.area,
  }))
}

export const searchAreasFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { query: string }) => input)
  .handler(async ({ data }) => {
    return searchAreas(data.query)
  })

export async function getCustomerAddress(
  customerId: string,
  orgId: string,
): Promise<{
  areaId: string | null
  areaName: string | null
  streetAddress: string | null
  isWni: boolean
} | null> {
  const db = await getDb()
  const rows = await db
    .select({
      areaId: customers.addressId,
      isWni: customers.isWni,
    })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.orgId, orgId)))
    .limit(1)

  if (!rows[0]?.areaId) return null

  const addrRows = await db
    .select({
      areaId: addresses.areaId,
      areaName: addresses.areaName,
      streetAddress: addresses.streetAddress,
    })
    .from(addresses)
    .where(eq(addresses.id, rows[0].areaId))
    .limit(1)

  if (!addrRows[0]) return null

  return {
    areaId: addrRows[0].areaId,
    areaName: addrRows[0].areaName,
    streetAddress: addrRows[0].streetAddress,
    isWni: rows[0].isWni,
  }
}

export const prefillOrderAddress = createServerFn({ method: 'GET' })
  .inputValidator((data: { customerId: string; orgId: string }) => data)
  .handler(async ({ data }): Promise<ShippingAddress | null> => {
    const addr = await getCustomerAddress(data.customerId, data.orgId)
    if (!addr) return null
    return {
      areaId: addr.areaId ?? '',
      areaName: addr.areaName ?? '',
      streetAddress: addr.streetAddress ?? '',
    }
  })

export const updateCustomerAddress = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      customerId: string
      orgId: string
      addressId: string | null
      isWni: boolean
    }) => input,
  )
  .handler(
    async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
      const db = await getDb()
      await db
        .update(customers)
        .set({
          addressId: data.addressId,
          isWni: data.isWni,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(customers.id, data.customerId),
            eq(customers.orgId, data.orgId),
          ),
        )

      return { ok: true }
    },
  )
