import { and, desc, eq, ilike, inArray, or, type SQL, sql } from 'drizzle-orm'
import type { SnapTransactionParameters } from 'midtrans-client'
import midtransClient from 'midtrans-client'
import { db } from '#/db/index'
import {
  assets as assetsTable,
  customers as customersTable,
  invoices as invoicesTable,
  invoiceLineItems as lineItemsTable,
  orderLineItems as orderLineItemsTable,
  orders as ordersTable,
  organizationProfiles as organizationProfilesTable,
  paymentMethods as paymentMethodsTable,
  payments as paymentsTable,
} from '#/db/schema'
import { formatProductDesignLabel } from '#/features/orders/line-item-display'
import { buildOrderBy, type SortColumnMap, type SortState } from '#/lib/sorting'

const { Snap, CoreApi } = midtransClient

type CoreApiWithTransaction = {
  transaction: {
    status(transactionId: string): Promise<Record<string, unknown>>
  }
}

export type Invoice = {
  id: string
  orgId: string
  invoiceNumber: string
  orderId: string | null
  customerId: string
  customerName: string
  status: 'unpaid' | 'partially_paid' | 'paid' | 'void'
  percentage: number | null
  subtotal: number
  total: number
  lateFee: number
  dueDate: string
  issuedDate: string
  paymentProvider: 'bank_transfer' | 'midtrans'
  paymentMethodId: string | null
  paidAt: Date | null
  paidBy: string | null
  notes: string | null
  midtransOrderId: string | null
}
export type InvoiceLineItem = {
  id: string
  invoiceId: string
  lineType: 'product' | 'shipping' | 'fee' | 'discount' | 'tax' | 'cashback'
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
  type: 'bank_transfer'
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
  customProductTotal?: number
  dueDate?: string
  issuedDate?: string
  paymentProvider?: 'bank_transfer' | 'midtrans'
  paymentMethodId?: string | null
  notes?: string
  shippingFee?: number
  shippingFeeDescription?: string
  courier?: string
  lateFee?: number
  lateFeeDays?: number
  lateFeePerDay?: number
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
  paymentProvider: 'bank_transfer' | 'midtrans'
  paymentMethodId: string | null
  createdAt: Date
  overdue: boolean
  shippingFee?: number
}

export type Payment = {
  id: string
  orgId: string
  invoiceId: string
  amount: number
  method: 'bank_transfer' | 'midtrans' | 'cash'
  reference: string | null
  proofAssetId: string | null
  status: 'pending' | 'confirmed' | 'rejected' | 'refunded'
  receivedAt: Date | null
  confirmedAt: Date | null
  confirmedBy: string | null
  rejectedReason: string | null
  createdAt: Date
  updatedAt: Date
}

export type CreatePaymentInput = {
  invoiceId: string
  amount: number
  method: 'bank_transfer' | 'midtrans' | 'cash'
  reference?: string
  proofAssetId?: string
  receivedAt?: Date
}

export type InvoicePaymentProof = {
  id: string
  invoiceId: string
  proofAssetId: string
  createdAt: Date
}

export type InvoiceBalance = {
  total: number
  confirmedAmount: number
  pendingAmount: number
  remaining: number
  isFullyPaid: boolean
}

export type ListInvoicesParams = {
  orgId: string
  customerId?: string
  status?: string
  q?: string
  orderId?: string
  sort?: SortState | null
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
  customer: {
    id: string
    name: string
    phone: string | null
    photoAssetId: string | null
  } | null
}

export type OrderForInvoice = {
  order: {
    id: string
    orderNumber: string | null
    customerId: string | null
    customerName: string | null
    customerPhone: string | null
    customerEmail: string | null
    total: number
    status: string
    notes: string | null
  }
  lineItems: Array<{
    id: string
    productName: string
    designName: string | null
    quantity: number
    unitPrice: number
    total: number
  }>
  existingInvoices: Array<{
    id: string
    invoiceNumber: string
    percentage: number | null
    total: number
    status: string
  }>
  invoicedPercentage: number
  invoicedAmount: number
  remainingPercentage: number
  remainingAmount: number
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
      const productName = oi.productName
      items.push({
        id: generateId(),
        invoiceId,
        lineType: 'product',
        description: formatProductDesignLabel(productName, oi.designName),
        quantity: oi.quantity,
        unitPrice: oi.unitPrice,
        total: oi.total,
        createdAt: now,
      })
    }

    const subtotal = items.reduce((sum, i) => sum + i.total, 0)
    const productTotal =
      input.customProductTotal !== undefined
        ? input.customProductTotal
        : order.total * (percentage / 100)
    const shippingFee = input.shippingFee ?? 0
    const lateFee = Math.max(0, input.lateFee ?? 0)
    const invoiceTotal = productTotal + shippingFee - lateFee

    // Add shipping fee line item if provided
    if (input.shippingFee && input.shippingFee > 0) {
      items.push({
        id: generateId(),
        invoiceId,
        lineType: 'shipping',
        description: input.shippingFeeDescription ?? 'Shipping Fee',
        quantity: 1,
        unitPrice: input.shippingFee,
        total: input.shippingFee,
        createdAt: now,
      })
    }

    // Add cashback line item if late fee applies
    if (lateFee > 0) {
      items.push({
        id: generateId(),
        invoiceId,
        lineType: 'cashback',
        description: `Late Delivery Cashback (${input.lateFeeDays ?? 0} days × Rp ${input.lateFeePerDay ?? 0})`,
        quantity: 1,
        unitPrice: -lateFee,
        total: -lateFee,
        createdAt: now,
      })
    }

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
      total: Math.max(0, Math.round(invoiceTotal * 100) / 100),
      lateFee,
      dueDate:
        input.dueDate ??
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      paymentProvider: input.paymentProvider ?? 'bank_transfer',
      paymentMethodId:
        input.paymentProvider === 'midtrans'
          ? null
          : input.paymentMethodId || null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })

    if (input.courier) {
      await db
        .update(ordersTable)
        .set({ courier: input.courier, updatedAt: now })
        .where(
          and(eq(ordersTable.id, input.orderId), eq(ordersTable.orgId, orgId)),
        )
    }
  } else {
    for (const li of input.lineItems) {
      items.push({
        id: generateId(),
        invoiceId,
        lineType: 'product',
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
      lateFee: 0,
      paymentProvider: input.paymentProvider ?? 'bank_transfer',
      paymentMethodId:
        input.paymentProvider === 'midtrans'
          ? null
          : input.paymentMethodId || null,
      dueDate:
        input.dueDate ??
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      issuedDate: input.issuedDate ?? new Date().toISOString().split('T')[0],
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

  let customer: GetInvoiceResult['customer'] = null
  const customerId = invoiceRows[0].customerId
  if (customerId) {
    const customerRows = await db
      .select({
        id: customersTable.id,
        name: customersTable.name,
        phone: customersTable.phone,
        photoAssetId: customersTable.photoAssetId,
      })
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .limit(1)
    if (customerRows.length > 0) {
      customer = {
        id: customerRows[0].id,
        name: customerRows[0].name,
        phone: customerRows[0].phone,
        photoAssetId: customerRows[0].photoAssetId,
      }
    }
  }

  return {
    invoice: invoiceRows[0] as Invoice,
    lineItems: itemRows as InvoiceLineItem[],
    paymentMethod,
    customer,
  }
}

const INVOICE_SORT_COLUMNS = {
  invoiceNumber: invoicesTable.invoiceNumber,
  customerName: invoicesTable.customerName,
  total: invoicesTable.total,
  dueDate: invoicesTable.dueDate,
  status: invoicesTable.status,
  createdAt: invoicesTable.createdAt,
} satisfies SortColumnMap

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

  if (params.orderId) {
    conditions.push(eq(invoicesTable.orderId, params.orderId))
  }

  if (params.customerId) {
    conditions.push(eq(invoicesTable.customerId, params.customerId))
  }

  const allConditions = and(...conditions) as SQL
  const page = params.page ?? 1
  const perPage = params.perPage ?? 25
  const today = new Date().toISOString().split('T')[0]
  const shippingFeeByInvoice = db
    .select({
      invoiceId: lineItemsTable.invoiceId,
      shippingFee: sql<number>`sum(${lineItemsTable.total})`.as('shipping_fee'),
    })
    .from(lineItemsTable)
    .where(eq(lineItemsTable.lineType, 'shipping'))
    .groupBy(lineItemsTable.invoiceId)
    .as('shipping_fee_by_invoice')

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: invoicesTable.id,
        invoiceNumber: invoicesTable.invoiceNumber,
        customerName: invoicesTable.customerName,
        status: invoicesTable.status,
        total: invoicesTable.total,
        percentage: invoicesTable.percentage,
        dueDate: invoicesTable.dueDate,
        paymentMethodId: invoicesTable.paymentMethodId,
        createdAt: invoicesTable.createdAt,
        overdue: sql<boolean>`(${invoicesTable.status} IN ('unpaid') AND ${invoicesTable.dueDate} < ${today}::date)`,
        shippingFee: sql<number>`coalesce(${shippingFeeByInvoice.shippingFee}, 0)`,
      })
      .from(invoicesTable)
      .leftJoin(
        shippingFeeByInvoice,
        eq(shippingFeeByInvoice.invoiceId, invoicesTable.id),
      )
      .where(allConditions)
      .orderBy(
        buildOrderBy(
          params.sort,
          INVOICE_SORT_COLUMNS,
          desc(invoicesTable.createdAt),
        ),
      )
      .limit(perPage)
      .offset((page - 1) * perPage),
    db
      .select({ count: sql<number>`count(*)` })
      .from(invoicesTable)
      .where(allConditions),
  ])

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
  if (
    invoiceRows[0].status !== 'unpaid' &&
    invoiceRows[0].status !== 'partially_paid'
  )
    throw new Error('Only unpaid or partially paid invoices can be marked paid')

  const invoice = invoiceRows[0]
  const now = new Date()

  // Create a payment record for the remaining balance
  const existingPayments = await db
    .select({ amount: paymentsTable.amount })
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.invoiceId, id),
        eq(paymentsTable.status, 'confirmed'),
      ),
    )

  const alreadyPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = invoice.total - alreadyPaid

  if (remaining > 0) {
    await db.insert(paymentsTable).values({
      id: generateId(),
      orgId,
      invoiceId: id,
      amount: remaining,
      method: 'bank_transfer',
      reference: null,
      proofAssetId: null,
      status: 'confirmed',
      receivedAt: now,
      confirmedAt: now,
      confirmedBy: userId,
      rejectedReason: null,
      createdAt: now,
      updatedAt: now,
    })
  }

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
        eq(paymentMethodsTable.type, 'bank_transfer'),
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

// ── Payment functions ──────────────────────────────────────────

export async function createPayment(
  orgId: string,
  input: CreatePaymentInput,
): Promise<Payment> {
  // Verify invoice belongs to this org
  const invoiceRows = await db
    .select()
    .from(invoicesTable)
    .where(
      and(
        eq(invoicesTable.id, input.invoiceId),
        eq(invoicesTable.orgId, orgId),
      ),
    )
    .limit(1)
  if (invoiceRows.length === 0) throw new Error('Invoice not found')

  // Validate amount is finite and positive
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Payment amount must be a positive number')
  }

  // Validate amount does not exceed remaining balance
  const balance = await getInvoiceBalance(input.invoiceId, orgId)
  if (input.amount > balance.remaining) {
    throw new Error(
      `Payment amount exceeds remaining balance of ${balance.remaining}`,
    )
  }

  // Verify proof asset belongs to this org
  if (input.proofAssetId) {
    const [asset] = await db
      .select()
      .from(assetsTable)
      .where(
        and(
          eq(assetsTable.id, input.proofAssetId),
          eq(assetsTable.orgId, orgId),
        ),
      )
      .limit(1)
    if (!asset) throw new Error('Proof asset not found in this organization')
  }

  const now = new Date()
  const id = generateId()

  await db.insert(paymentsTable).values({
    id,
    orgId,
    invoiceId: input.invoiceId,
    amount: input.amount,
    method: input.method,
    reference: input.reference ?? null,
    proofAssetId: input.proofAssetId ?? null,
    status: 'pending',
    receivedAt: input.receivedAt ?? null,
    confirmedAt: null,
    confirmedBy: null,
    rejectedReason: null,
    createdAt: now,
    updatedAt: now,
  })

  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.id, id))
    .limit(1)

  return payment as Payment
}

export async function confirmPayment(
  orgId: string,
  paymentId: string,
  userId: string,
): Promise<{ payment: Payment; balance: InvoiceBalance }> {
  const paymentRows = await db
    .select()
    .from(paymentsTable)
    .where(and(eq(paymentsTable.id, paymentId), eq(paymentsTable.orgId, orgId)))
    .limit(1)

  if (paymentRows.length === 0) throw new Error('Payment not found')
  if (paymentRows[0].status !== 'pending')
    throw new Error('Only pending payments can be confirmed')

  const payment = paymentRows[0]
  const now = new Date()

  await db
    .update(paymentsTable)
    .set({
      status: 'confirmed',
      confirmedAt: now,
      confirmedBy: userId,
      updatedAt: now,
    })
    .where(eq(paymentsTable.id, paymentId))

  // Update invoice status based on balance
  const balance = await getInvoiceBalance(payment.invoiceId, orgId)

  if (balance.remaining <= 0) {
    await db
      .update(invoicesTable)
      .set({
        status: 'paid',
        paidAt: now,
        paidBy: userId,
        updatedAt: now,
      })
      .where(eq(invoicesTable.id, payment.invoiceId))
  } else {
    await db
      .update(invoicesTable)
      .set({ status: 'partially_paid', updatedAt: now })
      .where(eq(invoicesTable.id, payment.invoiceId))
  }

  const [updated] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.id, paymentId))
    .limit(1)

  return { payment: updated as Payment, balance }
}

export async function rejectPayment(
  orgId: string,
  paymentId: string,
  reason: string,
): Promise<Payment> {
  const paymentRows = await db
    .select()
    .from(paymentsTable)
    .where(and(eq(paymentsTable.id, paymentId), eq(paymentsTable.orgId, orgId)))
    .limit(1)

  if (paymentRows.length === 0) throw new Error('Payment not found')
  if (paymentRows[0].status !== 'pending')
    throw new Error('Only pending payments can be rejected')

  const now = new Date()
  await db
    .update(paymentsTable)
    .set({
      status: 'rejected',
      rejectedReason: reason,
      updatedAt: now,
    })
    .where(eq(paymentsTable.id, paymentId))

  const [updated] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.id, paymentId))
    .limit(1)

  return updated as Payment
}

export async function getPaymentsForInvoice(
  orgId: string,
  invoiceId: string,
): Promise<Payment[]> {
  const rows = await db
    .select()
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.invoiceId, invoiceId),
        eq(paymentsTable.orgId, orgId),
      ),
    )
    .orderBy(desc(paymentsTable.createdAt))

  return rows as Payment[]
}

export async function getPaymentsForInvoices(
  orgId: string,
  invoiceIds: string[],
): Promise<Record<string, Payment[]>> {
  if (invoiceIds.length === 0) return {}

  const rows = await db
    .select()
    .from(paymentsTable)
    .where(
      and(
        inArray(paymentsTable.invoiceId, invoiceIds),
        eq(paymentsTable.orgId, orgId),
      ),
    )
    .orderBy(desc(paymentsTable.createdAt))

  const grouped: Record<string, Payment[]> = {}
  for (const row of rows) {
    const invId = row.invoiceId
    if (!grouped[invId]) grouped[invId] = []
    grouped[invId].push(row as Payment)
  }

  // Ensure every requested invoice has an entry
  for (const invId of invoiceIds) {
    if (!grouped[invId]) grouped[invId] = []
  }

  return grouped
}

export async function getPaymentProofsForInvoices(
  orgId: string,
  invoiceIds: string[],
): Promise<Record<string, InvoicePaymentProof[]>> {
  if (invoiceIds.length === 0) return {}

  const [paymentRows, assetRows] = await Promise.all([
    db
      .select({
        id: paymentsTable.id,
        invoiceId: paymentsTable.invoiceId,
        proofAssetId: paymentsTable.proofAssetId,
        createdAt: paymentsTable.createdAt,
      })
      .from(paymentsTable)
      .where(
        and(
          inArray(paymentsTable.invoiceId, invoiceIds),
          eq(paymentsTable.orgId, orgId),
        ),
      ),
    db
      .select({
        id: assetsTable.id,
        invoiceId: assetsTable.ownerId,
        proofAssetId: assetsTable.id,
        createdAt: assetsTable.createdAt,
      })
      .from(assetsTable)
      .where(
        and(
          eq(assetsTable.orgId, orgId),
          eq(assetsTable.ownerType, 'invoice'),
          eq(assetsTable.usage, 'payment_proof'),
          eq(assetsTable.status, 'active'),
          inArray(assetsTable.ownerId, invoiceIds),
        ),
      ),
  ])

  const grouped: Record<string, InvoicePaymentProof[]> = {}
  const seen = new Set<string>()

  for (const invId of invoiceIds) {
    grouped[invId] = []
  }

  const addProof = (proof: InvoicePaymentProof): void => {
    const key = `${proof.invoiceId}:${proof.proofAssetId}`
    if (seen.has(key)) return
    seen.add(key)
    grouped[proof.invoiceId]?.push(proof)
  }

  for (const payment of paymentRows) {
    if (!payment.proofAssetId) continue
    addProof({
      id: payment.id,
      invoiceId: payment.invoiceId,
      proofAssetId: payment.proofAssetId,
      createdAt: payment.createdAt,
    })
  }

  for (const asset of assetRows) {
    if (!asset.invoiceId) continue
    addProof({
      id: asset.id,
      invoiceId: asset.invoiceId,
      proofAssetId: asset.proofAssetId,
      createdAt: asset.createdAt,
    })
  }

  for (const proofs of Object.values(grouped)) {
    proofs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  return grouped
}

export async function getInvoiceBalance(
  invoiceId: string,
  orgId: string,
): Promise<InvoiceBalance> {
  const invoiceRows = await db
    .select({ total: invoicesTable.total })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.orgId, orgId)))
    .limit(1)

  if (invoiceRows.length === 0) throw new Error('Invoice not found')

  const paymentRows = await db
    .select({ amount: paymentsTable.amount, status: paymentsTable.status })
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.invoiceId, invoiceId),
        eq(paymentsTable.orgId, orgId),
      ),
    )

  const confirmedAmount = paymentRows
    .filter((p) => p.status === 'confirmed')
    .reduce((sum, p) => sum + p.amount, 0)

  const pendingAmount = paymentRows
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0)

  const total = invoiceRows[0].total
  const remaining = total - confirmedAmount

  return {
    total,
    confirmedAmount,
    pendingAmount,
    remaining: Math.max(0, remaining),
    isFullyPaid: remaining <= 0,
  }
}

export async function updateInvoice(
  id: string,
  orgId: string,
  input: Partial<{
    notes: string
    dueDate: string
    paymentMethodId: string
    customerName: string
    paymentProvider: 'bank_transfer' | 'midtrans'
  }>,
): Promise<Invoice> {
  const now = new Date()
  const updateData: Record<string, unknown> = {
    ...input,
    updatedAt: now,
    paymentMethodId:
      input.paymentProvider === 'midtrans' ? null : input.paymentMethodId,
  }
  await db
    .update(invoicesTable)
    .set(updateData)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.orgId, orgId)))

  const [updated] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, id))
    .limit(1)

  return updated as Invoice
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
type InvoiceRewriteClient = Pick<
  DbTransaction,
  'select' | 'insert' | 'delete' | 'update'
>

export async function rewriteFinalInvoiceFromOrder(
  client: InvoiceRewriteClient,
  params: {
    orgId: string
    orderId: string
    invoiceId: string
    paidAmount: number
  },
): Promise<{
  invoiceId: string
  total: number
  percentage: number
  overpaidAmount: number
}> {
  const { orgId, orderId, invoiceId, paidAmount } = params

  // 1. Read the target invoice
  const invoiceRows = await client
    .select({
      id: invoicesTable.id,
      orderId: invoicesTable.orderId,
      status: invoicesTable.status,
    })
    .from(invoicesTable)
    .where(
      and(
        eq(invoicesTable.id, invoiceId),
        eq(invoicesTable.orgId, orgId),
        eq(invoicesTable.orderId, orderId),
      ),
    )
    .limit(1)

  if (invoiceRows.length === 0) throw new Error('Final invoice not found')
  const invoiceRow = invoiceRows[0]
  if (invoiceRow.status === 'paid')
    throw new Error('Cannot rewrite paid final invoice')
  if (invoiceRow.status === 'void')
    throw new Error('Cannot rewrite void final invoice')

  // 2. Read current order and line items
  const [orderRow, orderItemRows] = await Promise.all([
    client
      .select({ total: ordersTable.total })
      .from(ordersTable)
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.orgId, orgId)))
      .limit(1)
      .then((r) => r[0]),
    client
      .select()
      .from(orderLineItemsTable)
      .where(eq(orderLineItemsTable.orderId, orderId)),
  ])

  if (!orderRow) throw new Error('Order not found')

  // 3. Build product invoice lines from current order lines
  const now = new Date()
  const productLines = orderItemRows.map((oi) => ({
    id: crypto.randomUUID(),
    invoiceId,
    lineType: 'product' as const,
    description: formatProductDesignLabel(oi.productName, oi.designName),
    quantity: oi.quantity,
    unitPrice: oi.unitPrice,
    taxPercent: 0,
    total: oi.total,
    createdAt: now,
  }))

  // 4. Read existing non-product invoice lines before deleting
  const existingNonProductLines = await client
    .select()
    .from(lineItemsTable)
    .where(and(eq(lineItemsTable.invoiceId, invoiceId)))
    .then((rows) => rows.filter((r) => r.lineType !== 'product'))

  const preservedNonProductLines = existingNonProductLines.map((line) => ({
    id: crypto.randomUUID(),
    invoiceId,
    lineType: line.lineType,
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    taxPercent: line.taxPercent,
    total: line.total,
    createdAt: now,
  }))

  // 5. Delete all existing lines and insert rebuilt lines
  await client
    .delete(lineItemsTable)
    .where(eq(lineItemsTable.invoiceId, invoiceId))

  const allLines = [...productLines, ...preservedNonProductLines]
  if (allLines.length > 0) {
    await client.insert(lineItemsTable).values(allLines)
  }

  // 6. Compute new totals
  const productSubtotal = productLines.reduce((sum, l) => sum + l.total, 0)
  const nonProductTotal = preservedNonProductLines.reduce(
    (sum, l) => sum + l.total,
    0,
  )
  const remainingProductAmount = Math.max(0, orderRow.total - paidAmount)
  const overpaidAmount = Math.max(0, paidAmount - orderRow.total)
  const newTotal = Math.max(
    0,
    Math.round((remainingProductAmount + nonProductTotal) * 100) / 100,
  )
  const newSubtotal = Math.round(productSubtotal * 100) / 100
  const percentage =
    orderRow.total > 0
      ? Math.round((remainingProductAmount / orderRow.total) * 10_000) / 100
      : 0

  // 7. Update invoice totals
  await client
    .update(invoicesTable)
    .set({
      percentage,
      subtotal: newSubtotal,
      total: newTotal,
      updatedAt: now,
    })
    .where(eq(invoicesTable.id, invoiceId))

  return { invoiceId, total: newTotal, percentage, overpaidAmount }
}

function isValidEmail(email: string | null | undefined): email is string {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidPhone(phone: string | null | undefined): phone is string {
  if (!phone) return false
  const cleaned = phone.replace(/[^0-9+]/g, '')
  return cleaned.length >= 5 && cleaned.length <= 19
}

async function getMidtransCredentials(
  orgId: string,
): Promise<{ serverKey: string; clientKey: string; isProduction: boolean }> {
  const [profile] = await db
    .select({
      serverKey: organizationProfilesTable.midtransServerKey,
      clientKey: organizationProfilesTable.midtransClientKey,
      isProduction: organizationProfilesTable.midtransIsProduction,
    })
    .from(organizationProfilesTable)
    .where(eq(organizationProfilesTable.orgId, orgId))
    .limit(1)

  if (!profile) {
    throw new Error('Midtrans credentials are missing for this organization')
  }

  const serverKey = profile.serverKey?.trim() ?? ''
  const clientKey = profile.clientKey?.trim() ?? ''

  if (!serverKey || !clientKey) {
    throw new Error('Midtrans credentials are missing for this organization')
  }

  return { serverKey, clientKey, isProduction: profile.isProduction }
}

export async function createMidtransTransaction(
  invoiceId: string,
  orgId: string,
): Promise<{
  token: string
  redirectUrl: string
  clientKey: string
  isProduction: boolean
}> {
  const [invoice] = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      customerId: invoicesTable.customerId,
      paymentProvider: invoicesTable.paymentProvider,
      paymentMethodId: invoicesTable.paymentMethodId,
    })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.orgId, orgId)))
    .limit(1)

  if (!invoice) {
    throw new Error('Invoice not found')
  }

  if (invoice.paymentProvider !== 'midtrans') {
    throw new Error('Invoice is not configured for Midtrans payment')
  }

  const balance = await getInvoiceBalance(invoiceId, orgId)

  if (balance.remaining <= 0) {
    throw new Error('Invoice is already fully paid')
  }

  const [customer] = await db
    .select({
      name: customersTable.name,
      email: customersTable.email,
      phone: customersTable.phone,
    })
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, invoice.customerId),
        eq(customersTable.orgId, orgId),
      ),
    )
    .limit(1)

  const credentials = await getMidtransCredentials(orgId)

  const snap = new Snap({
    isProduction: credentials.isProduction,
    serverKey: credentials.serverKey,
    clientKey: credentials.clientKey,
  })

  const orderId = `${invoice.invoiceNumber}-${Date.now()}`

  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: Math.round(balance.remaining),
    },
    customer_details: customer
      ? {
          first_name: customer.name,
          email: isValidEmail(customer.email) ? customer.email : undefined,
          phone: isValidPhone(customer.phone)
            ? customer.phone.replace(/[^0-9+]/g, '')
            : undefined,
        }
      : undefined,
    enabled_payments: ['qris', 'bca_va', 'bni_va', 'bri_va'],
    credit_card: {
      secure: true,
    },
  }

  try {
    const res = await snap.createTransaction(
      parameter as unknown as SnapTransactionParameters, // Cast required because library type definition is incomplete
    )
    await db
      .update(invoicesTable)
      .set({ midtransOrderId: orderId, updatedAt: new Date() })
      .where(
        and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.orgId, orgId)),
      )
    return {
      token: res.token,
      redirectUrl: res.redirect_url,
      clientKey: credentials.clientKey,
      isProduction: credentials.isProduction,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Midtrans transaction creation failed: ${errorMessage}`)
  }
}

export type MidtransTransactionStatus = {
  transactionStatus: string
  fraudStatus?: string | null
  grossAmount: string
  orderId: string
  paymentType?: string | null
  transactionId?: string | null
  transactionTime?: string | null
  settlementTime?: string | null
  raw: Record<string, unknown>
}

export async function getMidtransTransactionStatus(params: {
  orgId: string
  orderId: string
}): Promise<MidtransTransactionStatus> {
  const credentials = await getMidtransCredentials(params.orgId)
  const coreApi = new CoreApi({
    isProduction: credentials.isProduction,
    serverKey: credentials.serverKey,
    clientKey: credentials.clientKey,
  }) as unknown as CoreApiWithTransaction
  const res = (await coreApi.transaction.status(params.orderId)) as Record<
    string,
    unknown
  >
  return {
    transactionStatus: String(res.transaction_status ?? ''),
    fraudStatus: typeof res.fraud_status === 'string' ? res.fraud_status : null,
    grossAmount: String(res.gross_amount ?? ''),
    orderId: String(res.order_id ?? params.orderId),
    paymentType: typeof res.payment_type === 'string' ? res.payment_type : null,
    transactionId:
      typeof res.transaction_id === 'string' ? res.transaction_id : null,
    transactionTime:
      typeof res.transaction_time === 'string' ? res.transaction_time : null,
    settlementTime:
      typeof res.settlement_time === 'string' ? res.settlement_time : null,
    raw: res,
  }
}

export type ReconcileResult =
  | {
      ok: true
      confirmed: boolean
      reason:
        | 'confirmed'
        | 'already_paid'
        | 'not_settled_yet'
        | 'no_midtrans_order_id'
        | 'mismatch'
      paymentId?: string
    }
  | { ok: false; error: string }

/**
 * Pull-based reconciliation: ask Midtrans Core API for the current transaction
 * status, and if Midtrans says it's settled/captured-accepted, run the same
 * confirm flow the webhook does. Idempotent — safe to call repeatedly.
 *
 * Used by:
 *  - the portal client when the post-pay poll times out (webhook never arrived)
 *  - the operator "Lookup transaction" button on the invoice detail page
 */
export async function reconcilePayment(
  orgId: string,
  invoiceId: string,
): Promise<ReconcileResult> {
  const [invoice] = await db
    .select({
      id: invoicesTable.id,
      orgId: invoicesTable.orgId,
      status: invoicesTable.status,
      paymentProvider: invoicesTable.paymentProvider,
      midtransOrderId: invoicesTable.midtransOrderId,
      total: invoicesTable.total,
    })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.orgId, orgId)))
    .limit(1)

  if (!invoice) {
    return { ok: false, error: 'Invoice not found' }
  }

  if (invoice.status === 'paid') {
    return { ok: true, confirmed: true, reason: 'already_paid' }
  }

  if (invoice.paymentProvider !== 'midtrans') {
    return { ok: true, confirmed: false, reason: 'no_midtrans_order_id' }
  }

  const orderId = invoice.midtransOrderId
  if (!orderId) {
    return { ok: true, confirmed: false, reason: 'no_midtrans_order_id' }
  }

  let status: MidtransTransactionStatus
  try {
    status = await getMidtransTransactionStatus({ orgId, orderId })
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Midtrans lookup failed',
    }
  }

  // Reject if amount doesn't match — never create a payment for the wrong amount.
  const expectedAmount = String(Math.round(invoice.total))
  const grossAmount = status.grossAmount.split('.')[0] ?? '0'
  if (grossAmount !== expectedAmount) {
    return { ok: true, confirmed: false, reason: 'mismatch' }
  }

  const isSuccess =
    status.transactionStatus === 'settlement' ||
    (status.transactionStatus === 'capture' && status.fraudStatus === 'accept')

  if (!isSuccess) {
    return { ok: true, confirmed: false, reason: 'not_settled_yet' }
  }

  // Idempotency: skip if a confirmed payment with this order_id reference exists.
  const [existing] = await db
    .select({ id: paymentsTable.id })
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.invoiceId, invoiceId),
        eq(paymentsTable.reference, orderId),
        eq(paymentsTable.status, 'confirmed'),
      ),
    )
    .limit(1)

  if (existing) {
    return {
      ok: true,
      confirmed: true,
      reason: 'already_paid',
      paymentId: existing.id,
    }
  }

  const payment = await createPayment(orgId, {
    invoiceId,
    amount: Number(status.grossAmount),
    method: 'midtrans',
    reference: orderId,
    receivedAt: status.settlementTime
      ? new Date(status.settlementTime)
      : new Date(),
  })

  await confirmPayment(orgId, payment.id, 'midtrans-reconcile')

  return {
    ok: true,
    confirmed: true,
    reason: 'confirmed',
    paymentId: payment.id,
  }
}
