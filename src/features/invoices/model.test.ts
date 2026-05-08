import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  customers as customersTable,
  orderLineItems as orderLineItemsTable,
  orders as ordersTable,
  organization,
  paymentMethods as paymentMethodsTable,
  products as productsTable,
} from '#/db/schema'
import {
  createInvoice,
  createPaymentMethod,
  deletePaymentMethod,
  getInvoice,
  listInvoices,
  listPaymentMethods,
  markInvoicePaid,
  updatePaymentMethod,
  voidInvoice,
} from './model'

const org1Id = '00000000-0000-0000-0000-000000000001'
const org2Id = '00000000-0000-0000-0000-000000000002'

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE organization, biteship_areas, payment_methods CASCADE`,
  )
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

describe('createInvoice', () => {
  it('creates a standalone invoice with line items', async () => {
    const now = new Date()
    await db.insert(customersTable).values([
      {
        id: 'cust-1',
        orgId: org1Id,
        name: 'Acme Corp',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(paymentMethodsTable).values([
      {
        id: 'pm-1',
        orgId: org1Id,
        name: 'BCA Transfer',
        type: 'bank_transfer',
        bankName: 'BCA',
        accountNumber: '123456',
        accountHolder: 'PT Pabriq',
        isDefault: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await createInvoice(org1Id, {
      customerId: 'cust-1',
      customerName: 'Acme Corp',
      paymentMethodId: 'pm-1',
      dueDate: '2026-06-01',
      lineItems: [
        { description: 'Custom T-Shirt', quantity: 10, unitPrice: 15 },
        { description: 'Setup Fee', quantity: 1, unitPrice: 50 },
      ],
    })

    expect(result.invoice.status).toBe('unpaid')
    expect(result.invoice.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/)
    expect(result.invoice.percentage).toBeNull()
    expect(result.invoice.subtotal).toBe(200)
    expect(result.invoice.total).toBe(200)
    expect(result.invoice.orderId).toBeNull()
    expect(result.lineItems).toHaveLength(2)
    expect(result.lineItems[0].description).toBe('Custom T-Shirt')
  })

  it('creates an order-linked invoice with percentage', async () => {
    const now = new Date()
    await db.insert(customersTable).values([
      {
        id: 'cust-2',
        orgId: org1Id,
        name: 'Test Customer',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(paymentMethodsTable).values([
      {
        id: 'pm-1',
        orgId: org1Id,
        name: 'BCA Transfer',
        type: 'bank_transfer',
        isDefault: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(productsTable).values([
      {
        id: 'prod-1',
        orgId: org1Id,
        name: 'T-Shirt',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(ordersTable).values([
      {
        id: 'order-1',
        orgId: org1Id,
        customerId: 'cust-2',
        status: 'approved',
        total: 1000,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(orderLineItemsTable).values([
      {
        id: 'li-1',
        orgId: org1Id,
        orderId: 'order-1',
        productId: 'prod-1',
        quantity: 100,
        unitPrice: 10,
        total: 1000,
        name: 'T-Shirt',
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await createInvoice(org1Id, {
      orderId: 'order-1',
      customerId: 'cust-2',
      customerName: 'Test Customer',
      paymentMethodId: 'pm-1',
      dueDate: '2026-06-01',
      percentage: 50,
      lineItems: [],
    })

    expect(result.invoice.percentage).toBe(50)
    expect(result.invoice.total).toBe(500)
    expect(result.invoice.subtotal).toBe(1000)
    expect(result.invoice.orderId).toBe('order-1')
    expect(result.lineItems).toHaveLength(1)
  })

  it('generates unique invoice numbers per org', async () => {
    const now = new Date()
    await db.insert(customersTable).values([
      {
        id: 'cust-1',
        orgId: org1Id,
        name: 'C1',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cust-2',
        orgId: org2Id,
        name: 'C2',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(paymentMethodsTable).values([
      {
        id: 'pm-1',
        orgId: org1Id,
        name: 'BCA',
        type: 'bank_transfer',
        isDefault: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'pm-2',
        orgId: org2Id,
        name: 'BCA',
        type: 'bank_transfer',
        isDefault: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const r1 = await createInvoice(org1Id, {
      customerId: 'cust-1',
      customerName: 'C1',
      paymentMethodId: 'pm-1',
      dueDate: '2026-06-01',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
    })
    const r2 = await createInvoice(org1Id, {
      customerId: 'cust-1',
      customerName: 'C1',
      paymentMethodId: 'pm-1',
      dueDate: '2026-06-01',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
    })
    const r3 = await createInvoice(org2Id, {
      customerId: 'cust-2',
      customerName: 'C2',
      paymentMethodId: 'pm-2',
      dueDate: '2026-06-01',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
    })

    expect(r1.invoice.invoiceNumber).toBe(
      `INV-${new Date().getFullYear()}-0001`,
    )
    expect(r2.invoice.invoiceNumber).toBe(
      `INV-${new Date().getFullYear()}-0002`,
    )
    expect(r3.invoice.invoiceNumber).toBe(
      `INV-${new Date().getFullYear()}-0001`,
    )
  })
})

describe('getInvoice', () => {
  it('returns invoice with line items and payment method', async () => {
    const now = new Date()
    await db.insert(customersTable).values([
      {
        id: 'cust-1',
        orgId: org1Id,
        name: 'C1',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(paymentMethodsTable).values([
      {
        id: 'pm-1',
        orgId: org1Id,
        name: 'BCA',
        type: 'bank_transfer',
        isDefault: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const { invoice } = await createInvoice(org1Id, {
      customerId: 'cust-1',
      customerName: 'C1',
      paymentMethodId: 'pm-1',
      dueDate: '2026-06-01',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
    })

    const result = await getInvoice(invoice.id, org1Id)
    expect(result).not.toBeNull()
    expect(result?.invoice.id).toBe(invoice.id)
    expect(result?.lineItems).toHaveLength(1)
    expect(result?.paymentMethod).not.toBeNull()
    expect(result?.paymentMethod?.name).toBe('BCA')
  })

  it('returns null for wrong org', async () => {
    const now = new Date()
    await db.insert(customersTable).values([
      {
        id: 'cust-1',
        orgId: org1Id,
        name: 'C1',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(paymentMethodsTable).values([
      {
        id: 'pm-1',
        orgId: org1Id,
        name: 'BCA',
        type: 'bank_transfer',
        isDefault: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const { invoice } = await createInvoice(org1Id, {
      customerId: 'cust-1',
      customerName: 'C1',
      paymentMethodId: 'pm-1',
      dueDate: '2026-06-01',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
    })

    const result = await getInvoice(invoice.id, org2Id)
    expect(result).toBeNull()
  })
})

describe('listInvoices', () => {
  it('returns paginated invoices for org', async () => {
    const now = new Date()
    await db.insert(customersTable).values([
      {
        id: 'cust-1',
        orgId: org1Id,
        name: 'C1',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(paymentMethodsTable).values([
      {
        id: 'pm-1',
        orgId: org1Id,
        name: 'BCA',
        type: 'bank_transfer',
        isDefault: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    await createInvoice(org1Id, {
      customerId: 'cust-1',
      customerName: 'C1',
      paymentMethodId: 'pm-1',
      dueDate: '2026-06-01',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
    })

    const result = await listInvoices({ orgId: org1Id })
    expect(result.rows).toHaveLength(1)
    expect(result.totalRows).toBe(1)
    expect(result.rows[0].invoiceNumber).toBeDefined()
  })

  it('filters by status', async () => {
    const now = new Date()
    await db.insert(customersTable).values([
      {
        id: 'cust-1',
        orgId: org1Id,
        name: 'C1',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(paymentMethodsTable).values([
      {
        id: 'pm-1',
        orgId: org1Id,
        name: 'BCA',
        type: 'bank_transfer',
        isDefault: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const { invoice } = await createInvoice(org1Id, {
      customerId: 'cust-1',
      customerName: 'C1',
      paymentMethodId: 'pm-1',
      dueDate: '2026-06-01',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
    })
    await markInvoicePaid(invoice.id, org1Id, 'user-1')

    const unpaid = await listInvoices({ orgId: org1Id, status: 'unpaid' })
    expect(unpaid.rows).toHaveLength(0)

    const paid = await listInvoices({ orgId: org1Id, status: 'paid' })
    expect(paid.rows).toHaveLength(1)
  })

  it('searches by invoice number or customer name', async () => {
    const now = new Date()
    await db.insert(customersTable).values([
      {
        id: 'cust-1',
        orgId: org1Id,
        name: 'Alpha Corp',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(paymentMethodsTable).values([
      {
        id: 'pm-1',
        orgId: org1Id,
        name: 'BCA',
        type: 'bank_transfer',
        isDefault: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    await createInvoice(org1Id, {
      customerId: 'cust-1',
      customerName: 'Alpha Corp',
      paymentMethodId: 'pm-1',
      dueDate: '2026-06-01',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
    })

    const byName = await listInvoices({ orgId: org1Id, q: 'Alpha' })
    expect(byName.rows).toHaveLength(1)

    const byInv = await listInvoices({ orgId: org1Id, q: 'INV-' })
    expect(byInv.rows).toHaveLength(1)
  })
})

describe('markInvoicePaid', () => {
  it('marks unpaid invoice as paid', async () => {
    const now = new Date()
    await db.insert(customersTable).values([
      {
        id: 'cust-1',
        orgId: org1Id,
        name: 'C1',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(paymentMethodsTable).values([
      {
        id: 'pm-1',
        orgId: org1Id,
        name: 'BCA',
        type: 'bank_transfer',
        isDefault: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const { invoice } = await createInvoice(org1Id, {
      customerId: 'cust-1',
      customerName: 'C1',
      paymentMethodId: 'pm-1',
      dueDate: '2026-06-01',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
    })

    const paid = await markInvoicePaid(invoice.id, org1Id, 'admin-1')
    expect(paid.status).toBe('paid')
    expect(paid.paidBy).toBe('admin-1')
    expect(paid.paidAt).toBeInstanceOf(Date)
  })

  it('rejects marking paid or void invoices', async () => {
    const now = new Date()
    await db.insert(customersTable).values([
      {
        id: 'cust-1',
        orgId: org1Id,
        name: 'C1',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(paymentMethodsTable).values([
      {
        id: 'pm-1',
        orgId: org1Id,
        name: 'BCA',
        type: 'bank_transfer',
        isDefault: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const { invoice } = await createInvoice(org1Id, {
      customerId: 'cust-1',
      customerName: 'C1',
      paymentMethodId: 'pm-1',
      dueDate: '2026-06-01',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
    })

    await markInvoicePaid(invoice.id, org1Id, 'admin-1')
    await expect(
      markInvoicePaid(invoice.id, org1Id, 'admin-1'),
    ).rejects.toThrow()
  })
})

describe('voidInvoice', () => {
  it('voids an unpaid invoice', async () => {
    const now = new Date()
    await db.insert(customersTable).values([
      {
        id: 'cust-1',
        orgId: org1Id,
        name: 'C1',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(paymentMethodsTable).values([
      {
        id: 'pm-1',
        orgId: org1Id,
        name: 'BCA',
        type: 'bank_transfer',
        isDefault: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const { invoice } = await createInvoice(org1Id, {
      customerId: 'cust-1',
      customerName: 'C1',
      paymentMethodId: 'pm-1',
      dueDate: '2026-06-01',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
    })

    const v = await voidInvoice(invoice.id, org1Id)
    expect(v.status).toBe('void')
  })

  it('rejects voiding a paid invoice', async () => {
    const now = new Date()
    await db.insert(customersTable).values([
      {
        id: 'cust-1',
        orgId: org1Id,
        name: 'C1',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(paymentMethodsTable).values([
      {
        id: 'pm-1',
        orgId: org1Id,
        name: 'BCA',
        type: 'bank_transfer',
        isDefault: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const { invoice } = await createInvoice(org1Id, {
      customerId: 'cust-1',
      customerName: 'C1',
      paymentMethodId: 'pm-1',
      dueDate: '2026-06-01',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
    })
    await markInvoicePaid(invoice.id, org1Id, 'admin-1')
    await expect(voidInvoice(invoice.id, org1Id)).rejects.toThrow()
  })
})

describe('paymentMethods', () => {
  it('creates and lists payment methods', async () => {
    const now = new Date()
    await db.insert(organization).values([
      {
        id: 'pm-org',
        name: 'PM Org',
        slug: 'pm-org',
        createdAt: now,
        updatedAt: now,
      },
    ])

    await createPaymentMethod({
      orgId: 'pm-org',
      name: 'BCA Transfer',
      type: 'bank_transfer',
      bankName: 'BCA',
      accountNumber: '123456',
      accountHolder: 'PT Test',
      instructions: 'Transfer to BCA',
      isDefault: true,
      active: true,
    })

    const list = await listPaymentMethods('pm-org')
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('BCA Transfer')
  })

  it('updates a payment method', async () => {
    const now = new Date()
    await db.insert(organization).values([
      {
        id: 'pm-org',
        name: 'PM Org',
        slug: 'pm-org',
        createdAt: now,
        updatedAt: now,
      },
    ])

    const created = await createPaymentMethod({
      orgId: 'pm-org',
      name: 'Old Name',
      type: 'bank_transfer',
      bankName: null,
      accountNumber: null,
      accountHolder: null,
      instructions: null,
      isDefault: false,
      active: true,
    })

    const updated = await updatePaymentMethod(created.id, 'pm-org', {
      name: 'New Name',
    })
    expect(updated.name).toBe('New Name')
  })

  it('deletes a payment method', async () => {
    const now = new Date()
    await db.insert(organization).values([
      {
        id: 'pm-org',
        name: 'PM Org',
        slug: 'pm-org',
        createdAt: now,
        updatedAt: now,
      },
    ])

    const created = await createPaymentMethod({
      orgId: 'pm-org',
      name: 'To Delete',
      type: 'bank_transfer',
      bankName: null,
      accountNumber: null,
      accountHolder: null,
      instructions: null,
      isDefault: false,
      active: true,
    })

    await deletePaymentMethod(created.id, 'pm-org')
    const list = await listPaymentMethods('pm-org')
    expect(list).toHaveLength(0)
  })
})
