export interface OrgPdfInfo {
  name: string
  email: string | null
  phone: string | null
  address: string | null
  logoUrl: string | null
}

export interface CustomerPdfInfo {
  name: string
  email: string | null
  phone: string | null
  address: string | null
}

export interface PdfLineItem {
  description: string
  quantity: number
  unitPrice: number
  taxPercent: number
  total: number
  lineType?: string
}

export interface QuotationPdfData {
  org: OrgPdfInfo
  quoteNumber: string
  createdAt: Date
  validUntil: Date | null
  customer: CustomerPdfInfo
  lineItems: PdfLineItem[]
  subtotal: number
  taxes: number
  grandTotal: number
  notes: string | null
}

export interface InvoicePdfData {
  org: OrgPdfInfo
  invoiceNumber: string
  issuedDate: string
  dueDate: string
  percentage: number | null
  customer: CustomerPdfInfo
  lineItems: PdfLineItem[]
  subtotal: number
  taxes: number
  total: number
  alreadyPaid: number
  shippingAddress: {
    areaName: string
    streetAddress: string
  } | null
  notes: string | null
  paymentMethod: {
    name: string
    bankName: string | null
    accountNumber: string | null
    accountHolder: string | null
    instructions: string | null
  } | null
}

export interface DocumentAuthResult {
  orgId: string
  userId: string
}
