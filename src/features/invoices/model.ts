import { and, desc, eq, ilike, or, type SQL, sql } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  invoices as invoicesTable,
  invoiceLineItems as lineItemsTable,
  orderLineItems as orderLineItemsTable,
  orders as ordersTable,
  paymentMethods as paymentMethodsTable,
} from '#/db/schema'

export type Invoice = {
  id: string
  orgId: string
  invoiceNumber: string
  orderId: string | null
  customerId: string
  customerName: string
  status: 'unpaid' | 'paid' | 'void'
  percentage: number | null
  subtotal: number
  total: number
  dueDate: string
  issuedDate: string
  paymentMethodId: string | null
  paidAt: Date | null
  paidBy: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export type InvoiceLineItem = {
  id: string
  invoiceId: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  createdAt: Date
}

export type PaymentMethod = {
  id: string
  orgId: string
  name: string
  type: string
  bankName: string | null
  accountNumber: string | null
  accountHolder: string | null
  instructions: string | null
  isDefault: boolean
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export type CreateInvoiceInput = {
  orderId?: string
  customerId: string
  customerName: string
  lineItems: Array<{
    description: string
    quantity: number
    unitPrice: number
  }>
  percentage?: number
  dueDate: string
  issuedDate?: string
  paymentMethodId: string
  notes?: string
}

export type CreateInvoiceResult = {
  invoice: Invoice
  lineItems: InvoiceLineItem[]
}

export type InvoiceRow = {
  id: string
  invoiceNumber: string
  customerName: string
  status: string
  total: number
  percentage: number | null
  dueDate: string
  createdAt: Date
  overdue: boolean
}

export type ListInvoicesParams = {
  orgId: string
  status?: string
  q?: string
  page?: number
  perPage?: number
}

export type ListInvoicesResult = {
  rows: InvoiceRow[]
  totalRows: number
}

export type GetInvoiceResult = {
  invoice: Invoice
  lineItems: InvoiceLineItem[]
  paymentMethod: PaymentMethod | null
}

function generateId(): string {
  return crypto.randomUUID()
}

async function generateInvoiceNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`

  const existingRows = await db
    .select({ invoiceNumber: invoicesTable.invoiceNumber })
    .from(invoicesTable)
    .where(
      and(
        eq(invoicesTable.orgId, orgId),
        ilike(invoicesTable.invoiceNumber, `${prefix}%`),
      ),
    )
    .orderBy(desc(invoicesTable.invoiceNumber))
    .limit(1)

  const nextNum =
    existingRows.length > 0 && existingRows[0].invoiceNumber
      ? Number.parseInt(
          existingRows[0].invoiceNumber.split('-')[2] ?? '0',
          10,
        ) + 1
      : 1

  return `${prefix}${String(nextNum).padStart(4, '0')}`
}

export async function createInvoice(
  orgId: string,
  input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
  const now = new Date()
  const invoiceId = generateId()
  const invoiceNumber = await generateInvoiceNumber(orgId)
  const items: InvoiceLineItem[] = []

  if (input.orderId) {
    const orderRows = await db
      .select()
      .from(ordersTable)
      .where(
        and(eq(ordersTable.id, input.orderId), eq(ordersTable.orgId, orgId)),
      )
      .limit(1)

    if (orderRows.length === 0) throw new Error('Order not found')

    const order = orderRows[0]
    const percentage = input.percentage ?? 100

    const orderItemRows = await db
      .select()
      .from(orderLineItemsTable)
      .where(eq(orderLineItemsTable.orderId, input.orderId))

    for (const oi of orderItemRows) {
      items.push({
        id: generateId(),
        invoiceId,
        description: oi.name ?? 'Order item',
        quantity: oi.quantity,
        unitPrice: oi.unitPrice,
        total: oi.total,
        createdAt: now,
      })
    }

    const subtotal = items.reduce((sum, i) => sum + i.total, 0)
    const invoiceTotal = order.total * (percentage / 100)

    await db.insert(invoicesTable).values({
      id: invoiceId,
      orgId,
      invoiceNumber,
      orderId: input.orderId,
      customerId: input.customerId,
      customerName: input.customerName,
      status: 'unpaid',
      percentage,
      subtotal,
      total: Math.round(invoiceTotal * 100) / 100,
      dueDate: input.dueDate,
      issuedDate: input.issuedDate ?? new Date().toISOString().split('T')[0],
      paymentMethodId: input.paymentMethodId,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
  } else {
    for (const li of input.lineItems) {
      items.push({
        id: generateId(),
        invoiceId,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        total: li.unitPrice * li.quantity,
        createdAt: now,
      })
    }

    const subtotal = items.reduce((sum, i) => sum + i.total, 0)

    await db.insert(invoicesTable).values({
      id: invoiceId,
      orgId,
      invoiceNumber,
      orderId: null,
      customerId: input.customerId,
      customerName: input.customerName,
      status: 'unpaid',
      percentage: null,
      subtotal,
      total: subtotal,
      dueDate: input.dueDate,
      issuedDate: input.issuedDate ?? new Date().toISOString().split('T')[0],
      paymentMethodId: input.paymentMethodId,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
  }

  await db.insert(lineItemsTable).values(items)

  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, invoiceId))
    .limit(1)

  if (!invoice) throw new Error('Failed to create invoice')

  return {
    invoice: invoice as Invoice,
    lineItems: items,
  }
}

export async function getInvoice(
  id: string,
  orgId: string,
): Promise<GetInvoiceResult | null> {
  const invoiceRows = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.orgId, orgId)))
    .limit(1)

  if (invoiceRows.length === 0) return null

  const itemRows = await db
    .select()
    .from(lineItemsTable)
    .where(eq(lineItemsTable.invoiceId, id))
    .orderBy(lineItemsTable.createdAt)

  let paymentMethod: PaymentMethod | null = null
  const paymentMethodId = invoiceRows[0].paymentMethodId
  if (paymentMethodId) {
    const pmRows = await db
      .select()
      .from(paymentMethodsTable)
      .where(
        and(
          eq(paymentMethodsTable.id, paymentMethodId),
          eq(paymentMethodsTable.orgId, orgId),
        ),
      )
      .limit(1)
    paymentMethod = (pmRows[0] as PaymentMethod) ?? null
  }

  return {
    invoice: invoiceRows[0] as Invoice,
    lineItems: itemRows as InvoiceLineItem[],
    paymentMethod,
  }
}

export async function listInvoices(
  params: ListInvoicesParams,
): Promise<ListInvoicesResult> {
  const conditions: SQL[] = [eq(invoicesTable.orgId, params.orgId)]

  if (params.q?.trim()) {
    const pattern = `%${params.q.trim()}%`
    conditions.push(
      or(
        ilike(invoicesTable.invoiceNumber, pattern),
        ilike(invoicesTable.customerName, pattern),
      ) as SQL,
    )
  }

  if (params.status) {
    conditions.push(eq(invoicesTable.status, params.status))
  }

  const allConditions = and(...conditions) as SQL
  const page = params.page ?? 1
  const perPage = params.perPage ?? 25
  const today = new Date().toISOString().split('T')[0]

  const rows = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      customerName: invoicesTable.customerName,
      status: invoicesTable.status,
      total: invoicesTable.total,
      percentage: invoicesTable.percentage,
      dueDate: invoicesTable.dueDate,
      createdAt: invoicesTable.createdAt,
      overdue: sql<boolean>`(${invoicesTable.status} IN ('unpaid') AND ${invoicesTable.dueDate} < ${today}::date)`,
    })
    .from(invoicesTable)
    .where(allConditions)
    .orderBy(desc(invoicesTable.createdAt))
    .limit(perPage)
    .offset((page - 1) * perPage)

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoicesTable)
    .where(allConditions)

  return {
    rows: rows as InvoiceRow[],
    totalRows: Number(countResult[0]?.count ?? 0),
  }
}

export async function markInvoicePaid(
  id: string,
  orgId: string,
  userId: string,
): Promise<Invoice> {
  const invoiceRows = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.orgId, orgId)))
    .limit(1)

  if (invoiceRows.length === 0) throw new Error('Invoice not found')
  if (invoiceRows[0].status !== 'unpaid')
    throw new Error('Only unpaid invoices can be marked paid')

  const now = new Date()
  await db
    .update(invoicesTable)
    .set({
      status: 'paid',
      paidAt: now,
      paidBy: userId,
      updatedAt: now,
    })
    .where(eq(invoicesTable.id, id))

  const [updated] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, id))
    .limit(1)

  return updated as Invoice
}

export async function voidInvoice(id: string, orgId: string): Promise<Invoice> {
  const invoiceRows = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.orgId, orgId)))
    .limit(1)

  if (invoiceRows.length === 0) throw new Error('Invoice not found')
  if (invoiceRows[0].status !== 'unpaid')
    throw new Error('Only unpaid invoices can be voided')

  const now = new Date()
  await db
    .update(invoicesTable)
    .set({ status: 'void', updatedAt: now })
    .where(eq(invoicesTable.id, id))

  const [updated] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, id))
    .limit(1)

  return updated as Invoice
}

export async function listPaymentMethods(
  orgId: string,
): Promise<PaymentMethod[]> {
  const rows = await db
    .select()
    .from(paymentMethodsTable)
    .where(
      and(
        eq(paymentMethodsTable.orgId, orgId),
        eq(paymentMethodsTable.active, true),
      ),
    )
    .orderBy(desc(paymentMethodsTable.isDefault), paymentMethodsTable.name)

  return rows as PaymentMethod[]
}

export async function createPaymentMethod(
  input: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'> & {
    bankName?: string | null
    accountNumber?: string | null
    accountHolder?: string | null
    instructions?: string | null
  },
): Promise<PaymentMethod> {
  const id = generateId()
  const now = new Date()

  await db.insert(paymentMethodsTable).values({
    id,
    ...input,
    createdAt: now,
    updatedAt: now,
  })

  const [row] = await db
    .select()
    .from(paymentMethodsTable)
    .where(eq(paymentMethodsTable.id, id))
    .limit(1)

  return row as PaymentMethod
}

export async function updatePaymentMethod(
  id: string,
  orgId: string,
  input: Partial<
    Omit<PaymentMethod, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>
  >,
): Promise<PaymentMethod> {
  await db
    .update(paymentMethodsTable)
    .set({ ...input, updatedAt: new Date() })
    .where(
      and(eq(paymentMethodsTable.id, id), eq(paymentMethodsTable.orgId, orgId)),
    )

  const [row] = await db
    .select()
    .from(paymentMethodsTable)
    .where(eq(paymentMethodsTable.id, id))
    .limit(1)

  return row as PaymentMethod
}

export async function deletePaymentMethod(
  id: string,
  orgId: string,
): Promise<void> {
  await db
    .delete(paymentMethodsTable)
    .where(
      and(eq(paymentMethodsTable.id, id), eq(paymentMethodsTable.orgId, orgId)),
    )
}
