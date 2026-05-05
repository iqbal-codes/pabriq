import { renderToBuffer } from '@react-pdf/renderer'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { member } from '#/db/schema'
import { QuotationDocument } from './templates/quotation'
import type { QuotationPdfData } from './types'

export class DocumentAuthError extends Error {
  constructor(
    message: string,
    public statusCode: 401 | 403 | 404,
  ) {
    super(message)
    this.name = 'DocumentAuthError'
  }
}

export async function resolveOrgForDocument(
  headers?: Headers,
): Promise<{ orgId: string; userId: string }> {
  const { auth } = await import('#/lib/auth')
  const requestHeaders = headers ?? getRequestHeaders()
  const session = await auth.api.getSession({ headers: requestHeaders })

  if (!session) {
    throw new DocumentAuthError('Unauthorized', 401)
  }

  const memberships = await db
    .select({ orgId: member.organizationId })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1)

  if (memberships.length === 0) {
    throw new DocumentAuthError('No organization', 403)
  }

  return { orgId: memberships[0].orgId, userId: session.user.id }
}

export async function generateQuotationPdf(
  orgId: string,
  orderId: string,
): Promise<Buffer> {
  const {
    orders,
    orderLineItems,
    customers,
    products,
    organizationProfiles: profiles,
  } = await import('#/db/schema')

  const orderRows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.orgId, orgId)))
    .limit(1)

  if (orderRows.length === 0) {
    throw new DocumentAuthError('Order not found', 404)
  }

  const order = orderRows[0]
  if (!order.customerId) {
    throw new Error('Customer not found')
  }

  const [customerRows, profileRows, itemRows] = await Promise.all([
    db
      .select()
      .from(customers)
      .where(eq(customers.id, order.customerId))
      .limit(1),
    db.select().from(profiles).where(eq(profiles.orgId, orgId)).limit(1),
    db
      .select({
        itemId: orderLineItems.id,
        productId: orderLineItems.productId,
        quantity: orderLineItems.quantity,
        unitPrice: orderLineItems.unitPrice,
        total: orderLineItems.total,
      })
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId)),
  ])

  if (customerRows.length === 0) {
    throw new Error('Customer not found')
  }

  const customer = customerRows[0]
  const profile = profileRows[0] ?? {
    displayName: null,
    phone: null,
    logoAssetId: null,
  }

  const [productRows] = await Promise.all([
    db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(and(eq(products.orgId, orgId))),
  ])

  const productMap = new Map(productRows.map((p) => [p.id, p.name]))

  const lineItems = itemRows.map((item) => ({
    productName: productMap.get(item.productId) ?? 'Unknown Product',
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total,
  }))

  const pdfData: QuotationPdfData = {
    orgName: profile.displayName ?? 'Workshop',
    orgPhone: profile.phone ?? null,
    quoteNumber: order.orderNumber ?? 'ORD-????-???',
    createdAt: order.createdAt,
    validUntil: order.validUntil ?? null,
    customer: {
      name: customer.name,
      email: customer.email ?? null,
      phone: customer.phone ?? null,
      address: customer.address ?? null,
    },
    lineItems,
    grandTotal: order.total,
  }

  const buffer = await renderToBuffer(<QuotationDocument data={pdfData} />)
  return Buffer.from(buffer)
}
