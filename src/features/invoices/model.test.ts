import { eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '#/db/index'
import {
  customers as customersTable,
  invoiceLineItems as invoiceLineItemsTable,
  invoices as invoicesTable,
  midtransTransactions as midtransTransactionsTable,
  orderLineItems as orderLineItemsTable,
  orders as ordersTable,
  organization,
  organizationProfiles as organizationProfilesTable,
  paymentMethods as paymentMethodsTable,
  payments as paymentsTable,
  products as productsTable,
} from '#/db/schema'
import {
  confirmPayment,
  createInvoice,
  createMidtransTransaction,
  createPayment,
  createPaymentMethod,
  deletePaymentMethod,
  getInvoice,
  getInvoiceBalance,
  getPaymentsForInvoice,
  listInvoices,
  listPaymentMethods,
  markInvoicePaid,
  reconcilePayment,
  rejectPayment,
  updatePaymentMethod,
  voidInvoice,
} from './model'

const mockCreateTransaction = vi.fn()
const mockSnapConfig = vi.fn()
const mockCoreApiConfig = vi.fn()
const mockTransactionStatus = vi.fn()

vi.mock('midtrans-client', () => {
  const SnapMock = vi.fn().mockImplementation(function (
    this: { createTransaction: unknown },
    config: unknown,
  ) {
    mockSnapConfig(config)
    this.createTransaction = mockCreateTransaction
  })
  const CoreApiMock = vi.fn().mockImplementation(function (
    this: { transaction: { status: unknown } },
    config: unknown,
  ) {
    mockCoreApiConfig(config)
    this.transaction = { status: mockTransactionStatus }
  })
  return {
    default: { Snap: SnapMock, CoreApi: CoreApiMock },
    Snap: SnapMock,
    CoreApi: CoreApiMock,
  }
})

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
        designName: 'T-Shirt',
        productionDays: 2,
        deadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
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
  it('creates an order-linked invoice with customProductTotal', async () => {
    const now = new Date()
    await db.insert(customersTable).values([
      {
        id: 'cust-3',
        orgId: org1Id,
        name: 'Down Payment Customer',
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
        id: 'order-dp',
        orgId: org1Id,
        customerId: 'cust-3',
        status: 'approved',
        total: 1027800,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(orderLineItemsTable).values([
      {
        id: 'li-dp-1',
        orgId: org1Id,
        orderId: 'order-dp',
        productId: 'prod-1',
        quantity: 6000,
        unitPrice: 100,
        total: 600000,
        designName: 'Design A',
        productionDays: 5,
        deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'li-dp-2',
        orgId: org1Id,
        orderId: 'order-dp',
        productId: 'prod-1',
        quantity: 4278,
        unitPrice: 100,
        total: 427800,
        designName: 'Design B',
        productionDays: 5,
        deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await createInvoice(org1Id, {
      orderId: 'order-dp',
      customerId: 'cust-3',
      customerName: 'Down Payment Customer',
      paymentMethodId: 'pm-1',
      dueDate: '2026-07-01',
      percentage: 97.3,
      customProductTotal: 1000000,
      lineItems: [],
    })

    expect(result.invoice.total).toBe(1000000)
    expect(result.invoice.percentage).toBe(97.3)
    expect(result.invoice.subtotal).toBe(1027800)
    expect(result.invoice.orderId).toBe('order-dp')
    expect(result.lineItems).toHaveLength(2)
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
    const [r2, r3] = await Promise.all([
      createInvoice(org1Id, {
        customerId: 'cust-1',
        customerName: 'C1',
        paymentMethodId: 'pm-1',
        dueDate: '2026-06-01',
        lineItems: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
      }),
      createInvoice(org2Id, {
        customerId: 'cust-2',
        customerName: 'C2',
        paymentMethodId: 'pm-2',
        dueDate: '2026-06-01',
        lineItems: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
      }),
    ])

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

  it('sorts invoices by due date', async () => {
    const now = new Date()
    await db.insert(customersTable).values([
      {
        id: 'inv-sort-cust',
        orgId: org1Id,
        name: 'Sort Customer',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(paymentMethodsTable).values([
      {
        id: 'inv-sort-pm',
        orgId: org1Id,
        name: 'BCA',
        type: 'bank_transfer',
        isDefault: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    // Create 3 invoices with distinct due dates and reversed creation order
    // Due dates: Jan, Mar, Feb; createdAt: newest→oldest (Feb, Mar, Jan)
    // So default order (createdAt DESC) would give Feb, Mar, Jan
    await db.insert(invoicesTable).values([
      {
        id: 'inv-feb',
        orgId: org1Id,
        invoiceNumber: 'INV-2026-FEB',
        customerId: 'inv-sort-cust',
        customerName: 'Sort Customer',
        status: 'unpaid',
        subtotal: 100,
        total: 100,
        dueDate: '2026-02-10',
        createdAt: new Date('2026-06-03'),
        updatedAt: now,
      },
      {
        id: 'inv-mar',
        orgId: org1Id,
        invoiceNumber: 'INV-2026-MAR',
        customerId: 'inv-sort-cust',
        customerName: 'Sort Customer',
        status: 'unpaid',
        subtotal: 100,
        total: 100,
        dueDate: '2026-03-10',
        createdAt: new Date('2026-06-02'),
        updatedAt: now,
      },
      {
        id: 'inv-jan',
        orgId: org1Id,
        invoiceNumber: 'INV-2026-JAN',
        customerId: 'inv-sort-cust',
        customerName: 'Sort Customer',
        status: 'unpaid',
        subtotal: 100,
        total: 100,
        dueDate: '2026-01-10',
        createdAt: new Date('2026-06-01'),
        updatedAt: now,
      },
    ])

    // dueDate ASC should return Jan, Feb, Mar
    const ascResult = await listInvoices({
      orgId: org1Id,
      sort: { field: 'dueDate', direction: 'asc' },
      perPage: 10,
    })
    expect(ascResult.rows.map((r) => r.id)).toEqual([
      'inv-jan',
      'inv-feb',
      'inv-mar',
    ])

    // dueDate DESC should return Mar, Feb, Jan
    const descResult = await listInvoices({
      orgId: org1Id,
      sort: { field: 'dueDate', direction: 'desc' },
      perPage: 10,
    })
    expect(descResult.rows.map((r) => r.id)).toEqual([
      'inv-mar',
      'inv-feb',
      'inv-jan',
    ])
  })
  it('includes shippingFee from shipping line items', async () => {
    const now = new Date()
    await db.insert(customersTable).values([
      {
        id: 'cust-ship',
        orgId: org1Id,
        name: 'Ship Customer',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(paymentMethodsTable).values([
      {
        id: 'pm-ship',
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
      customerId: 'cust-ship',
      customerName: 'Ship Customer',
      paymentMethodId: 'pm-ship',
      dueDate: '2026-06-01',
      lineItems: [{ description: 'Product', quantity: 1, unitPrice: 100 }],
    })

    // Insert a shipping line item directly to simulate order-based creation
    await db.insert(invoiceLineItemsTable).values({
      id: `li-ship-${invoice.id}`,
      invoiceId: invoice.id,
      lineType: 'shipping',
      description: 'Shipping Fee',
      quantity: 1,
      unitPrice: 50,
      total: 50,
      createdAt: now,
    })
    const result = await listInvoices({ orgId: org1Id })

    const row = result.rows.find((r) => r.id === invoice.id)
    expect(row).toMatchObject({ shippingFee: 50 })
  })

  it('returns shippingFee as 0 when no shipping line items exist', async () => {
    const now = new Date()
    await db.insert(customersTable).values([
      {
        id: 'cust-noship',
        orgId: org1Id,
        name: 'No Ship Customer',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.insert(paymentMethodsTable).values([
      {
        id: 'pm-noship',
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
      customerId: 'cust-noship',
      customerName: 'No Ship Customer',
      paymentMethodId: 'pm-noship',
      dueDate: '2026-06-01',
      lineItems: [{ description: 'Item', quantity: 2, unitPrice: 25 }],
    })
    const result = await listInvoices({ orgId: org1Id })

    const row = result.rows.find((r) => r.id === invoice.id)
    expect(row).toMatchObject({ shippingFee: 0 })
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

describe('createPayment', () => {
  const payOrgId = 'pay-test-org'

  beforeEach(async () => {
    const now = new Date()
    await db.insert(organization).values({
      id: payOrgId,
      name: 'Pay Test Org',
      slug: 'pay-test-org',
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(customersTable).values({
      id: 'pay-cust',
      orgId: payOrgId,
      name: 'Pay Customer',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
  })

  async function setupInvoice(): Promise<string> {
    const result = await createInvoice(payOrgId, {
      customerId: 'pay-cust',
      customerName: 'Pay Customer',
      dueDate: '2026-06-30',
      paymentMethodId: '',
      lineItems: [{ description: 'Item A', quantity: 2, unitPrice: 50000 }],
    })
    return result.invoice.id
  }

  it('creates a pending payment for an invoice', async () => {
    const invoiceId = await setupInvoice()
    const payment = await createPayment(payOrgId, {
      invoiceId,
      amount: 50000,
      method: 'bank_transfer',
      reference: 'TRF123',
    })

    expect(payment.id).toBeDefined()
    expect(payment.invoiceId).toBe(invoiceId)
    expect(payment.amount).toBe(50000)
    expect(payment.method).toBe('bank_transfer')
    expect(payment.reference).toBe('TRF123')
    expect(payment.status).toBe('pending')
    expect(payment.orgId).toBe(payOrgId)
  })

  it('creates payment without optional fields', async () => {
    const invoiceId = await setupInvoice()
    const payment = await createPayment(payOrgId, {
      invoiceId,
      amount: 100000,
      method: 'cash',
    })

    expect(payment.amount).toBe(100000)
    expect(payment.method).toBe('cash')
    expect(payment.reference).toBeNull()
  })
})

describe('confirmPayment', () => {
  const payOrgId = 'confirm-test-org'

  beforeEach(async () => {
    const now = new Date()
    await db.insert(organization).values({
      id: payOrgId,
      name: 'Confirm Test Org',
      slug: 'confirm-test-org',
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(customersTable).values({
      id: 'confirm-cust',
      orgId: payOrgId,
      name: 'Confirm Customer',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
  })

  async function setupInvoice(): Promise<string> {
    const result = await createInvoice(payOrgId, {
      customerId: 'confirm-cust',
      customerName: 'Confirm Customer',
      dueDate: '2026-06-30',
      paymentMethodId: '',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    return result.invoice.id
  }

  it('confirms a pending payment and updates invoice to paid', async () => {
    const invoiceId = await setupInvoice()
    const payment = await createPayment(payOrgId, {
      invoiceId,
      amount: 100000,
      method: 'bank_transfer',
    })

    const result = await confirmPayment(payOrgId, payment.id, 'admin-user')

    expect(result.payment.status).toBe('confirmed')
    expect(result.payment.confirmedBy).toBe('admin-user')
    expect(result.balance.isFullyPaid).toBe(true)
    expect(result.balance.remaining).toBe(0)

    // Invoice should now be 'paid'
    const dbInvoice = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId))
      .limit(1)
    expect(dbInvoice[0].status).toBe('paid')
  })

  it('sets invoice to partially_paid when payment is less than total', async () => {
    const invoiceId = await setupInvoice()
    const payment = await createPayment(payOrgId, {
      invoiceId,
      amount: 30000,
      method: 'bank_transfer',
    })

    const result = await confirmPayment(payOrgId, payment.id, 'admin-user')

    expect(result.payment.status).toBe('confirmed')
    expect(result.balance.isFullyPaid).toBe(false)
    expect(result.balance.confirmedAmount).toBe(30000)
    expect(result.balance.remaining).toBe(70000)

    // Invoice should be 'partially_paid'
    const dbInvoice = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId))
      .limit(1)
    expect(dbInvoice[0].status).toBe('partially_paid')
  })

  it('rejects confirming an already-confirmed payment', async () => {
    const invoiceId = await setupInvoice()
    const payment = await createPayment(payOrgId, {
      invoiceId,
      amount: 100000,
      method: 'bank_transfer',
    })

    await confirmPayment(payOrgId, payment.id, 'admin-user')

    await expect(
      confirmPayment(payOrgId, payment.id, 'admin-user'),
    ).rejects.toThrow('Only pending payments can be confirmed')
  })

  it('handles multiple payments reaching paid status', async () => {
    const invoiceId = await setupInvoice()

    // First payment: 40,000
    const p1 = await createPayment(payOrgId, {
      invoiceId,
      amount: 40000,
      method: 'bank_transfer',
    })
    const r1 = await confirmPayment(payOrgId, p1.id, 'admin')
    expect(r1.balance.confirmedAmount).toBe(40000)
    expect(r1.balance.remaining).toBe(60000)

    // Second payment: 60,000 → should make it paid
    const p2 = await createPayment(payOrgId, {
      invoiceId,
      amount: 60000,
      method: 'bank_transfer',
    })
    const r2 = await confirmPayment(payOrgId, p2.id, 'admin')
    expect(r2.balance.isFullyPaid).toBe(true)

    const dbInvoice = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId))
      .limit(1)
    expect(dbInvoice[0].status).toBe('paid')
  })
})

describe('rejectPayment', () => {
  const payOrgId = 'reject-test-org'

  beforeEach(async () => {
    const now = new Date()
    await db.insert(organization).values({
      id: payOrgId,
      name: 'Reject Test Org',
      slug: 'reject-test-org',
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(customersTable).values({
      id: 'reject-cust',
      orgId: payOrgId,
      name: 'Reject Customer',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
  })

  async function setupInvoice(): Promise<string> {
    const result = await createInvoice(payOrgId, {
      customerId: 'reject-cust',
      customerName: 'Reject Customer',
      dueDate: '2026-06-30',
      paymentMethodId: '',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    return result.invoice.id
  }

  it('rejects a pending payment with a reason', async () => {
    const invoiceId = await setupInvoice()
    const payment = await createPayment(payOrgId, {
      invoiceId,
      amount: 100000,
      method: 'bank_transfer',
    })

    const rejected = await rejectPayment(payOrgId, payment.id, 'Wrong amount')

    expect(rejected.status).toBe('rejected')
    expect(rejected.rejectedReason).toBe('Wrong amount')
  })

  it('rejects rejecting a confirmed payment', async () => {
    const invoiceId = await setupInvoice()
    const payment = await createPayment(payOrgId, {
      invoiceId,
      amount: 100000,
      method: 'bank_transfer',
    })

    await confirmPayment(payOrgId, payment.id, 'admin')

    await expect(
      rejectPayment(payOrgId, payment.id, 'Too late'),
    ).rejects.toThrow('Only pending payments can be rejected')
  })

  it('rejects rejecting a non-existent payment', async () => {
    await expect(
      rejectPayment(payOrgId, 'non-existent', 'No reason'),
    ).rejects.toThrow('Payment not found')
  })
})

describe('getPaymentsForInvoice', () => {
  const payOrgId = 'list-pay-org'

  beforeEach(async () => {
    const now = new Date()
    await db.insert(organization).values({
      id: payOrgId,
      name: 'List Pay Org',
      slug: 'list-pay-org',
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(customersTable).values({
      id: 'list-pay-cust',
      orgId: payOrgId,
      name: 'List Pay Customer',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
  })

  it('returns all payments for an invoice ordered by newest first', async () => {
    const result = await createInvoice(payOrgId, {
      customerId: 'list-pay-cust',
      customerName: 'List Pay Customer',
      dueDate: '2026-06-30',
      paymentMethodId: '',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoiceId = result.invoice.id

    await createPayment(payOrgId, {
      invoiceId,
      amount: 50000,
      method: 'bank_transfer',
    })
    await createPayment(payOrgId, {
      invoiceId,
      amount: 50000,
      method: 'bank_transfer',
    })

    const payments = await getPaymentsForInvoice(payOrgId, invoiceId)
    expect(payments).toHaveLength(2)
  })

  it('returns empty array when invoice has no payments', async () => {
    const result = await createInvoice(payOrgId, {
      customerId: 'list-pay-cust',
      customerName: 'List Pay Customer',
      dueDate: '2026-06-30',
      paymentMethodId: '',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoiceId = result.invoice.id

    const payments = await getPaymentsForInvoice(payOrgId, invoiceId)
    expect(payments).toHaveLength(0)
  })
})

describe('getInvoiceBalance', () => {
  const payOrgId = 'balance-test-org'

  beforeEach(async () => {
    const now = new Date()
    await db.insert(organization).values({
      id: payOrgId,
      name: 'Balance Test Org',
      slug: 'balance-test-org',
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(customersTable).values({
      id: 'balance-cust',
      orgId: payOrgId,
      name: 'Balance Customer',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
  })

  it('returns zero balance for unpaid invoice', async () => {
    const result = await createInvoice(payOrgId, {
      customerId: 'balance-cust',
      customerName: 'Balance Customer',
      dueDate: '2026-06-30',
      paymentMethodId: '',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })

    const balance = await getInvoiceBalance(result.invoice.id, payOrgId)
    expect(balance.total).toBe(100000)
    expect(balance.confirmedAmount).toBe(0)
    expect(balance.pendingAmount).toBe(0)
    expect(balance.remaining).toBe(100000)
    expect(balance.isFullyPaid).toBe(false)
  })

  it('includes pending payments in the count', async () => {
    const result = await createInvoice(payOrgId, {
      customerId: 'balance-cust',
      customerName: 'Balance Customer',
      dueDate: '2026-06-30',
      paymentMethodId: '',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoiceId = result.invoice.id

    await createPayment(payOrgId, {
      invoiceId,
      amount: 50000,
      method: 'bank_transfer',
    })

    const balance = await getInvoiceBalance(invoiceId, payOrgId)
    expect(balance.pendingAmount).toBe(50000)
    expect(balance.confirmedAmount).toBe(0)
    expect(balance.remaining).toBe(100000) // nothing confirmed yet
  })
})

describe('createMidtransTransaction', () => {
  const midtransOrgId = '00000000-0000-0000-0000-000000000009'

  beforeEach(async () => {
    const now = new Date()
    await db.insert(organization).values({
      id: midtransOrgId,
      name: 'Midtrans Org',
      slug: 'midtrans-org',
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(customersTable).values({
      id: 'midtrans-cust',
      orgId: midtransOrgId,
      name: 'Midtrans Customer',
      email: 'midtrans@example.com',
      phone: '1234567890',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(organizationProfilesTable).values({
      id: 'midtrans-profile',
      orgId: midtransOrgId,
      midtransServerKey: 'midtrans-server-key',
      midtransClientKey: 'midtrans-client-key',
      midtransIsProduction: true,
      createdAt: now,
      updatedAt: now,
    })
    mockCreateTransaction.mockReset()
    mockSnapConfig.mockClear()
    mockCoreApiConfig.mockClear()
    mockTransactionStatus.mockReset()
  })

  it('creates transaction with correct config and order details', async () => {
    const result = await createInvoice(midtransOrgId, {
      customerId: 'midtrans-cust',
      customerName: 'Midtrans Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoiceId = result.invoice.id
    mockCreateTransaction.mockResolvedValue({
      token: 'mock-snap-token',
      redirect_url: 'https://mock-redirect-url',
    })

    const { token, redirectUrl, clientKey, isProduction } =
      await createMidtransTransaction(invoiceId, midtransOrgId)

    expect(token).toBe('mock-snap-token')
    expect(redirectUrl).toBe('https://mock-redirect-url')
    expect(clientKey).toBe('midtrans-client-key')
    expect(isProduction).toBe(true)
    expect(mockSnapConfig).toHaveBeenCalledWith({
      isProduction: true,
      serverKey: 'midtrans-server-key',
      clientKey: 'midtrans-client-key',
    })
    expect(mockCreateTransaction).toHaveBeenCalled()
    const callArgs = mockCreateTransaction.mock.calls[0][0]
    expect(callArgs.transaction_details.gross_amount).toBe(100000)
    expect(callArgs.transaction_details.order_id).toContain(
      result.invoice.invoiceNumber,
    )
    expect(callArgs.customer_details.first_name).toBe('Midtrans Customer')
    expect(callArgs.customer_details.email).toBe('midtrans@example.com')
  })

  it('stores repeated Snap requests as distinct ledger attempts', async () => {
    const result = await createInvoice(midtransOrgId, {
      customerId: 'midtrans-cust',
      customerName: 'Midtrans Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    mockCreateTransaction.mockResolvedValue({
      token: 'repeat-token',
      redirect_url: 'https://repeat.example',
    })

    await createMidtransTransaction(result.invoice.id, midtransOrgId)
    await createMidtransTransaction(result.invoice.id, midtransOrgId)

    const attempts = await db
      .select()
      .from(midtransTransactionsTable)
      .where(eq(midtransTransactionsTable.invoiceId, result.invoice.id))
    expect(attempts).toHaveLength(2)
    expect(attempts[0].orderId).not.toBe(attempts[1].orderId)
  })

  it('records Snap creation failures for operator review', async () => {
    const result = await createInvoice(midtransOrgId, {
      customerId: 'midtrans-cust',
      customerName: 'Midtrans Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    mockCreateTransaction.mockRejectedValue(new Error('gateway unavailable'))

    await expect(
      createMidtransTransaction(result.invoice.id, midtransOrgId),
    ).rejects.toThrow(
      'Midtrans transaction creation failed: gateway unavailable',
    )

    const [attempt] = await db
      .select()
      .from(midtransTransactionsTable)
      .where(eq(midtransTransactionsTable.invoiceId, result.invoice.id))
    expect(attempt.transactionStatus).toBe('failed')
    expect(attempt.errorMessage).toBe('gateway unavailable')
    expect(attempt.failedAt).toBeInstanceOf(Date)
  })

  it('throws error if invoice is already fully paid', async () => {
    const result = await createInvoice(midtransOrgId, {
      customerId: 'midtrans-cust',
      customerName: 'Midtrans Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoiceId = result.invoice.id
    const payment = await createPayment(midtransOrgId, {
      invoiceId,
      amount: 100000,
      method: 'midtrans',
    })
    await confirmPayment(midtransOrgId, payment.id, 'admin')

    await expect(
      createMidtransTransaction(invoiceId, midtransOrgId),
    ).rejects.toThrow('Invoice is already fully paid')
  })

  it('omits email and phone if they are invalid or empty', async () => {
    const now = new Date()
    await db.insert(customersTable).values({
      id: 'midtrans-cust-invalid',
      orgId: midtransOrgId,
      name: 'Invalid Email/Phone Customer',
      email: 'invalid-email',
      phone: '12',
      active: true,
      createdAt: now,
      updatedAt: now,
    })

    const result = await createInvoice(midtransOrgId, {
      customerId: 'midtrans-cust-invalid',
      customerName: 'Invalid Email/Phone Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoiceId = result.invoice.id
    mockCreateTransaction.mockResolvedValue({
      token: 'mock-snap-token-2',
      redirect_url: 'https://mock-redirect-url-2',
    })

    const { token } = await createMidtransTransaction(invoiceId, midtransOrgId)

    expect(token).toBe('mock-snap-token-2')
    expect(mockCreateTransaction).toHaveBeenCalled()
    const callArgs = mockCreateTransaction.mock.calls[0][0]
    expect(callArgs.customer_details.first_name).toBe(
      'Invalid Email/Phone Customer',
    )
    expect(callArgs.customer_details.email).toBeUndefined()
    expect(callArgs.customer_details.phone).toBeUndefined()
  })

  it('throws when invoice paymentProvider is not midtrans', async () => {
    const result = await createInvoice(midtransOrgId, {
      customerId: 'midtrans-cust',
      customerName: 'Midtrans Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'bank_transfer',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoiceId = result.invoice.id

    await expect(
      createMidtransTransaction(invoiceId, midtransOrgId),
    ).rejects.toThrow('Invoice is not configured for Midtrans payment')
  })

  it('throws when org has no midtrans credentials', async () => {
    // Delete the org profile seeded in beforeEach
    await db
      .delete(organizationProfilesTable)
      .where(eq(organizationProfilesTable.orgId, midtransOrgId))

    const result = await createInvoice(midtransOrgId, {
      customerId: 'midtrans-cust',
      customerName: 'Midtrans Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoiceId = result.invoice.id

    await expect(
      createMidtransTransaction(invoiceId, midtransOrgId),
    ).rejects.toThrow('Midtrans credentials are missing for this organization')
  })

  it('reconcilePayment with midtrans invoice creates midtrans payment', async () => {
    const result = await createInvoice(midtransOrgId, {
      customerId: 'midtrans-cust',
      customerName: 'Midtrans Customer',
      dueDate: '2026-06-30',
      paymentProvider: 'midtrans',
      lineItems: [{ description: 'Item A', quantity: 1, unitPrice: 100000 }],
    })
    const invoice = result.invoice
    const attempt = {
      id: 'midtrans-attempt-123',
      orgId: midtransOrgId,
      invoiceId: invoice.id,
      orderId: 'MID-ORDER-123',
      expectedAmount: 100000,
      transactionStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await db.insert(midtransTransactionsTable).values(attempt)

    // Mock CoreApi transaction.status response
    mockTransactionStatus.mockResolvedValue({
      transaction_status: 'settlement',
      fraud_status: 'accept',
      gross_amount: '100000.00',
      order_id: 'MID-ORDER-123',
      settlement_time: '2026-01-01 12:00:00',
    })

    const result2 = await reconcilePayment(midtransOrgId, invoice.id)

    expect(result2.ok).toBe(true)
    if (!result2.ok) throw new Error('expected ok')
    expect(result2.confirmed).toBe(true)
    expect(result2.reason).toBe('confirmed')
    expect(mockCoreApiConfig).toHaveBeenCalledWith({
      isProduction: true,
      serverKey: 'midtrans-server-key',
      clientKey: 'midtrans-client-key',
    })
    expect(mockTransactionStatus).toHaveBeenCalledWith('MID-ORDER-123')

    // Verify payment was created with method 'midtrans'
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.invoiceId, invoice.id))
    expect(payments).toHaveLength(1)
    expect(payments[0].method).toBe('midtrans')
    expect(payments[0].status).toBe('confirmed')
  })
})

describe('createPayment — ownership and validation', () => {
  it('rejects payment when invoice belongs to a different org', async () => {
    const now = new Date()
    await db.insert(customersTable).values({
      id: 'cust-xorg',
      orgId: org1Id,
      name: 'Cross Org Customer',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    const { invoice } = await createInvoice(org1Id, {
      customerId: 'cust-xorg',
      customerName: 'Cross Org Customer',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
    })

    await expect(
      createPayment(org2Id, {
        invoiceId: invoice.id,
        amount: 50,
        method: 'bank_transfer',
      }),
    ).rejects.toThrow('Invoice not found')
  })

  it('rejects non-finite amount (NaN)', async () => {
    const now = new Date()
    await db.insert(customersTable).values({
      id: 'cust-nan',
      orgId: org1Id,
      name: 'NaN Customer',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    const { invoice } = await createInvoice(org1Id, {
      customerId: 'cust-nan',
      customerName: 'NaN Customer',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
    })

    await expect(
      createPayment(org1Id, {
        invoiceId: invoice.id,
        amount: Number.NaN,
        method: 'bank_transfer',
      }),
    ).rejects.toThrow('Payment amount must be a positive number')
  })

  it('rejects non-positive amount (zero)', async () => {
    const now = new Date()
    await db.insert(customersTable).values({
      id: 'cust-zero',
      orgId: org1Id,
      name: 'Zero Customer',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    const { invoice } = await createInvoice(org1Id, {
      customerId: 'cust-zero',
      customerName: 'Zero Customer',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
    })

    await expect(
      createPayment(org1Id, {
        invoiceId: invoice.id,
        amount: 0,
        method: 'bank_transfer',
      }),
    ).rejects.toThrow('Payment amount must be a positive number')
  })

  it('rejects negative amount', async () => {
    const now = new Date()
    await db.insert(customersTable).values({
      id: 'cust-neg',
      orgId: org1Id,
      name: 'Negative Customer',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    const { invoice } = await createInvoice(org1Id, {
      customerId: 'cust-neg',
      customerName: 'Negative Customer',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
    })

    await expect(
      createPayment(org1Id, {
        invoiceId: invoice.id,
        amount: -50,
        method: 'bank_transfer',
      }),
    ).rejects.toThrow('Payment amount must be a positive number')
  })

  it('rejects amount exceeding remaining balance', async () => {
    const now = new Date()
    await db.insert(customersTable).values({
      id: 'cust-over',
      orgId: org1Id,
      name: 'Overpay Customer',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    const { invoice } = await createInvoice(org1Id, {
      customerId: 'cust-over',
      customerName: 'Overpay Customer',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
    })

    await expect(
      createPayment(org1Id, {
        invoiceId: invoice.id,
        amount: 200,
        method: 'bank_transfer',
      }),
    ).rejects.toThrow('Payment amount exceeds remaining balance')
  })

  it('accepts valid amount within remaining balance', async () => {
    const now = new Date()
    await db.insert(customersTable).values({
      id: 'cust-valid',
      orgId: org1Id,
      name: 'Valid Customer',
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    const { invoice } = await createInvoice(org1Id, {
      customerId: 'cust-valid',
      customerName: 'Valid Customer',
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
    })

    const payment = await createPayment(org1Id, {
      invoiceId: invoice.id,
      amount: 50,
      method: 'bank_transfer',
    })

    expect(payment.amount).toBe(50)
    expect(payment.status).toBe('pending')
  })
})
