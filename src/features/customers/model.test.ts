import { eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import { addresses, biteshipAreas, customers, organization } from '#/db/schema'
import {
  type CustomerInput,
  createCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
  validateCustomerInput,
} from './model'

const org1Id = '00000000-0000-0000-0000-000000000001'

beforeEach(async () => {
  await db.execute(sql`TRUNCATE organization, biteship_areas CASCADE`)

  const now = new Date()
  await db.insert(organization).values({
    id: org1Id,
    name: 'Org 1',
    slug: 'org-1',
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(biteshipAreas).values([
    {
      areaId: 'area-1',
      name: 'Cibis, Palmerah',
      subdistrict: 'Palmerah',
      district: 'Palmerah',
      city: 'Jakarta Barat',
      province: 'DKI Jakarta',
      postalCode: '11480',
    },
    {
      areaId: 'area-2',
      name: 'Kebayoran Baru',
      subdistrict: 'Kebayoran Baru',
      district: 'Kebayoran Baru',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      postalCode: '12120',
    },
  ])
})

describe('validateCustomerInput', () => {
  it('returns null for valid input', () => {
    const input: CustomerInput = { name: 'Acme Corp' }
    expect(validateCustomerInput(input)).toBeNull()
  })

  it('returns error for empty name', () => {
    const input: CustomerInput = { name: '' }
    expect(validateCustomerInput(input)).toBe('nameRequired')
  })

  it('returns error for whitespace-only name', () => {
    const input: CustomerInput = { name: '   ' }
    expect(validateCustomerInput(input)).toBe('nameRequired')
  })

  it('returns null for valid input with all optional fields', () => {
    const input: CustomerInput = {
      name: 'PT Maju Jaya',
      email: 'maju@jaya.com',
      phone: '081234567890',
      notes: 'Prefers morning delivery',
      active: true,
    }
    expect(validateCustomerInput(input)).toBeNull()
  })

  it('allows null optional fields', () => {
    const input: CustomerInput = {
      name: 'Test',
      email: null,
      phone: null,
      notes: null,
    }
    expect(validateCustomerInput(input)).toBeNull()
  })
})

describe('customer address persistence', () => {
  it('creates and returns an address with the customer', async () => {
    const customerInput: CustomerInput & { orgId: string } = {
      orgId: org1Id,
      name: 'Acme Corp',
      isWni: true,
      address: {
        areaId: 'area-1',
        areaName: 'Cibis, Palmerah',
        streetAddress: 'Jl. Raya Palmerah No. 123',
      },
    }

    await createCustomer(customerInput)

    const customerRows = await db
      .select({ id: customers.id, addressId: customers.addressId })
      .from(customers)
      .where(eq(customers.orgId, org1Id))
      .limit(1)

    const customerId = customerRows[0]?.id ?? ''
    const addressId = customerRows[0]?.addressId ?? ''

    expect(addressId).toBeTruthy()

    const addressRows = await db
      .select({
        areaId: addresses.areaId,
        areaName: addresses.areaName,
        streetAddress: addresses.streetAddress,
      })
      .from(addresses)
      .where(eq(addresses.id, addressId))
      .limit(1)

    expect(addressRows[0]).toMatchObject({
      areaId: 'area-1',
      areaName: 'Cibis, Palmerah',
      streetAddress: 'Jl. Raya Palmerah No. 123',
    })

    const customer = await getCustomer(customerId, org1Id)
    expect(customer?.address).toEqual({
      areaId: 'area-1',
      areaName: 'Cibis, Palmerah',
      streetAddress: 'Jl. Raya Palmerah No. 123',
    })
    expect(customer?.isWni).toBe(true)
  })

  it('saves WNA customer without an area', async () => {
    const customerInput: CustomerInput & { orgId: string } = {
      orgId: org1Id,
      name: 'Foreign Customer',
      isWni: false,
      address: {
        areaId: '',
        areaName: '',
        streetAddress: '123 Foreign Street',
      },
    }

    await createCustomer(customerInput)

    const customerRows = await db
      .select({
        id: customers.id,
        isWni: customers.isWni,
        addressId: customers.addressId,
      })
      .from(customers)
      .where(eq(customers.orgId, org1Id))
      .limit(1)

    expect(customerRows[0]).toMatchObject({
      isWni: false,
    })

    const addressRows = await db
      .select({ areaId: addresses.areaId, areaName: addresses.areaName })
      .from(addresses)
      .where(eq(addresses.id, customerRows[0]?.addressId ?? ''))
      .limit(1)

    expect(addressRows[0]).toMatchObject({
      areaId: null,
      areaName: null,
    })
  })

  it('updates the existing address when editing a customer', async () => {
    const customerInput: CustomerInput & { orgId: string } = {
      orgId: org1Id,
      name: 'Acme Corp',
      address: {
        areaId: 'area-1',
        areaName: 'Cibis, Palmerah',
        streetAddress: 'Jl. Raya Palmerah No. 123',
      },
    }

    await createCustomer(customerInput)

    const customerIdRows = await db
      .select({ id: customers.id, addressId: customers.addressId })
      .from(customers)
      .where(eq(customers.orgId, org1Id))
      .limit(1)

    const customerId = customerIdRows[0]?.id ?? ''
    const addressId = customerIdRows[0]?.addressId ?? ''

    await updateCustomer(customerId, org1Id, {
      name: 'Acme Corp',
      address: {
        areaId: 'area-2',
        areaName: 'Kebayoran Baru',
        streetAddress: 'Jl. Baru No. 456',
      },
    })

    const updatedAddressRows = await db
      .select({
        areaId: addresses.areaId,
        areaName: addresses.areaName,
        streetAddress: addresses.streetAddress,
      })
      .from(addresses)
      .where(eq(addresses.id, addressId))
      .limit(1)

    expect(updatedAddressRows[0]).toMatchObject({
      areaId: 'area-2',
      areaName: 'Kebayoran Baru',
      streetAddress: 'Jl. Baru No. 456',
    })

    const customer = await getCustomer(customerId, org1Id)
    expect(customer?.address).toEqual({
      areaId: 'area-2',
      areaName: 'Kebayoran Baru',
      streetAddress: 'Jl. Baru No. 456',
    })
  })
})

describe('listCustomers sorting', () => {
  it('sorts customers by supported fields through shared order builder', async () => {
    const now = new Date()
    // Insert with reverse createdAt order so fallback would be different
    await db.insert(customers).values([
      {
        id: 'sort-cust-1',
        orgId: org1Id,
        name: 'Zeta',
        email: 'zeta@example.com',
        active: true,
        createdAt: new Date('2026-06-01'),
        updatedAt: now,
      },
      {
        id: 'sort-cust-2',
        orgId: org1Id,
        name: 'Alpha',
        email: 'alpha@example.com',
        active: true,
        createdAt: new Date('2026-05-01'),
        updatedAt: now,
      },
      {
        id: 'sort-cust-3',
        orgId: org1Id,
        name: 'Beta',
        email: 'beta@example.com',
        active: false,
        createdAt: new Date('2026-04-01'),
        updatedAt: now,
      },
    ])

    // Ascending by email
    const ascResult = await listCustomers({
      orgId: org1Id,
      sort: { field: 'email', direction: 'asc' },
      perPage: 10,
    })
    expect(ascResult.rows.map((r) => r.email)).toEqual([
      'alpha@example.com',
      'beta@example.com',
      'zeta@example.com',
    ])

    // Descending by email
    const descResult = await listCustomers({
      orgId: org1Id,
      sort: { field: 'email', direction: 'desc' },
      perPage: 10,
    })
    expect(descResult.rows.map((r) => r.email)).toEqual([
      'zeta@example.com',
      'beta@example.com',
      'alpha@example.com',
    ])

    // Unsupported field falls back to createdAt DESC
    const unsupportedResult = await listCustomers({
      orgId: org1Id,
      sort: { field: 'phone', direction: 'asc' },
      perPage: 10,
    })
    // Fallback order: most recent createdAt first
    expect(unsupportedResult.rows.map((r) => r.email)).toEqual([
      'zeta@example.com',
      'alpha@example.com',
      'beta@example.com',
    ])
  })
})
