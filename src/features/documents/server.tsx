import { renderToBuffer } from '@react-pdf/renderer'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { and, eq, ne } from 'drizzle-orm'
import { db } from '#/db/index'
import { member } from '#/db/schema'
import { InvoiceDocument } from './templates/invoice'
import { QuotationDocument } from './templates/quotation'
import type {
  CustomerPdfInfo,
  InvoicePdfData,
  OrgPdfInfo,
  PdfLineItem,
  QuotationPdfData,
} from './types'

class DocumentAuthError extends Error {
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

async function buildOrgPdfInfo(
  orgId: string,
  token?: string,
): Promise<OrgPdfInfo> {
  const {
    organizationProfiles: profiles,
    addresses,
    organization,
  } = await import('#/db/schema')

  const orgRows = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1)
  const orgName = orgRows[0]?.name ?? 'Workshop'

  const profileRows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.orgId, orgId))
    .limit(1)
  const profile = profileRows[0] ?? null

  let addressStr: string | null = null
  if (profile?.addressId) {
    const addrRows = await db
      .select()
      .from(addresses)
      .where(eq(addresses.id, profile.addressId))
      .limit(1)
    const addr = addrRows[0] ?? null
    if (addr) {
      const parts = [addr.streetAddress, addr.areaName].filter(Boolean)
      addressStr = parts.join(', ')
    }
  }

  let logoUrl: string | null = null
  if (profile?.logoAssetId) {
    try {
      const { getAssetSignedUrl } = await import('#/features/assets/server')
      const result = await getAssetSignedUrl({
        data: {
          assetId: profile.logoAssetId,
          variantKey: 'preview' as const,
          token,
        },
      })
      logoUrl = result.url
    } catch {
      // Logo unavailable
    }
  }

  return {
    name: profile?.displayName ?? orgName,
    email: profile?.email ?? null,
    phone: profile?.phone ?? null,
    address: addressStr,
    logoUrl,
  }
}

async function buildCustomerPdfInfo(
  customerId: string,
): Promise<CustomerPdfInfo> {
  const { customers } = await import('#/db/schema')
  const rows = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1)
  const c = rows[0] ?? null
  return {
    name: c?.name ?? 'Unknown',
    email: c?.email ?? null,
    phone: c?.phone ?? null,
    address: c?.address ?? null,
  }
}

function computeLineItemTaxes(items: PdfLineItem[]): {
  items: PdfLineItem[]
  taxes: number
} {
  return {
    items,
    taxes: items.reduce(
      (sum, li) => sum + Math.round(li.total * li.taxPercent) / 100,
      0,
    ),
  }
}

export async function generateQuotationPdf(
  orgId: string,
  orderId: string,
): Promise<Buffer> {
  const { orders, orderLineItems, products } = await import('#/db/schema')

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

  const [orgPdfInfo, customerPdfInfo, itemRows, productRows] =
    await Promise.all([
      buildOrgPdfInfo(orgId),
      buildCustomerPdfInfo(order.customerId),
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
      db
        .select({ id: products.id, name: products.name })
        .from(products)
        .where(eq(products.orgId, orgId)),
    ])

  const productMap = new Map(productRows.map((p) => [p.id, p.name]))

  const lineItems = itemRows.map(
    (item) =>
      ({
        description: productMap.get(item.productId) ?? 'Unknown Product',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxPercent: 0,
        total: item.total,
      }) as PdfLineItem,
  )

  const { taxes } = computeLineItemTaxes(lineItems)
  const subtotal = lineItems.reduce((s, li) => s + li.total, 0)

  const pdfData: QuotationPdfData = {
    org: orgPdfInfo,
    quoteNumber: order.orderNumber ?? 'ORD-????-???',
    createdAt: order.createdAt,
    validUntil: order.validUntil ?? null,
    customer: customerPdfInfo,
    lineItems,
    subtotal,
    taxes,
    grandTotal: subtotal + taxes,
    notes: order.notes ?? null,
  }
  const buffer = await renderToBuffer(<QuotationDocument data={pdfData} />)
  return Buffer.from(buffer)
}

export async function generateInvoicePdf(
  orgId: string,
  invoiceId: string,
  token?: string,
): Promise<Buffer> {
  const {
    invoices: invoicesTable,
    invoiceLineItems,
    paymentMethods,
    orders,
  } = await import('#/db/schema')

  const invoiceRows = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.orgId, orgId)))
    .limit(1)

  if (invoiceRows.length === 0) {
    throw new DocumentAuthError('Invoice not found', 404)
  }

  const invoice = invoiceRows[0]

  const [orgPdfInfo, customerPdfInfo, itemRows, pmRows, orderRows] =
    await Promise.all([
      buildOrgPdfInfo(orgId, token),
      buildCustomerPdfInfo(invoice.customerId),
      db
        .select()
        .from(invoiceLineItems)
        .where(eq(invoiceLineItems.invoiceId, invoiceId)),
      invoice.paymentMethodId
        ? db
            .select()
            .from(paymentMethods)
            .where(eq(paymentMethods.id, invoice.paymentMethodId))
            .limit(1)
        : Promise.resolve([]),
      invoice.orderId
        ? db
            .select({ shippingAddress: orders.shippingAddress })
            .from(orders)
            .where(eq(orders.id, invoice.orderId))
            .limit(1)
        : Promise.resolve([]),
    ])

  const lineItems = itemRows.map(
    (item) =>
      ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxPercent: item.taxPercent,
        total: item.total,
        lineType: item.lineType ?? 'product',
      }) as PdfLineItem,
  )

  const { taxes } = computeLineItemTaxes(lineItems)
  const shippingFee = lineItems
    .filter((item) => item.lineType === 'shipping')
    .reduce((sum, item) => sum + item.total, 0)
  const paymentMethod = pmRows[0] ?? null

  // Extract shipping address from order
  type ShippingAddress = { areaName: string; streetAddress: string }
  const shippingAddress: ShippingAddress | null =
    (orderRows[0]?.shippingAddress as ShippingAddress | null) ?? null

  // Sum total from other paid invoices for the same order (DP already paid)
  let alreadyPaid = 0
  if (invoice.orderId) {
    const otherPaidInvoices = await db
      .select({ total: invoicesTable.total })
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.orderId, invoice.orderId),
          eq(invoicesTable.orgId, orgId),
          eq(invoicesTable.status, 'paid'),
          ne(invoicesTable.id, invoiceId),
        ),
      )
    alreadyPaid = otherPaidInvoices.reduce((sum, inv) => sum + inv.total, 0)
  }

  // Compute payment label based on percentage and order context
  let paymentLabel: string | null = null
  let isDP = false
  let isFinal = false
  if (invoice.orderId && invoice.percentage != null) {
    const { PDF_LOCALE } = await import('./pdf-locale')
    if (invoice.percentage >= 100) {
      paymentLabel = PDF_LOCALE.paymentTypeFull
    } else {
      // Check if there are other invoices for this order
      const otherInvoices = await db
        .select({ percentage: invoicesTable.percentage })
        .from(invoicesTable)
        .where(
          and(
            eq(invoicesTable.orderId, invoice.orderId),
            eq(invoicesTable.orgId, orgId),
            ne(invoicesTable.id, invoiceId),
          ),
        )
      const otherTotal = otherInvoices.reduce(
        (sum, inv) => sum + (inv.percentage ?? 0),
        0,
      )
      if (otherInvoices.length === 0) {
        // First invoice for this order with percentage < 100 → DP
        paymentLabel = `${PDF_LOCALE.paymentTypeDP} ${invoice.percentage}%`
        isDP = true
      } else if (invoice.percentage + otherTotal >= 100) {
        // Combined percentage reaches 100 → this is the final payment
        paymentLabel = `${PDF_LOCALE.paymentTypePelunasan} ${invoice.percentage}%`
        isFinal = true
      } else {
        // More payments expected → installment
        paymentLabel = `${PDF_LOCALE.paymentTypeTermin} ${invoice.percentage}%`
      }
    }
  }

  const pdfData: InvoicePdfData = {
    org: orgPdfInfo,
    invoiceNumber: invoice.invoiceNumber,
    issuedDate: invoice.issuedDate,
    dueDate: invoice.dueDate,
    createdAt: invoice.createdAt.toISOString(),
    percentage: invoice.percentage,
    paymentLabel,
    isDP,
    isFinal,
    customer: customerPdfInfo,
    lineItems,
    subtotal: invoice.subtotal,
    taxes,
    total: invoice.total,
    shippingFee,
    lateFee: invoice.lateFee ?? 0,
    alreadyPaid,
    shippingAddress,
    notes: invoice.notes ?? null,
    paymentMethod: paymentMethod
      ? {
          name: paymentMethod.name,
          bankName: paymentMethod.bankName,
          accountNumber: paymentMethod.accountNumber,
          accountHolder: paymentMethod.accountHolder,
          instructions: paymentMethod.instructions,
        }
      : null,
  }

  const buffer = await renderToBuffer(<InvoiceDocument data={pdfData} />)
  return Buffer.from(buffer)
}
