export interface QuotationPdfData {
  orgName: string
  orgPhone: string | null
  quoteNumber: string
  createdAt: Date
  validUntil: Date | null
  customer: {
    name: string
    email: string | null
    phone: string | null
    address: string | null
  }
  lineItems: Array<{
    productName: string
    quantity: number
    unitPrice: number
    total: number
  }>
  grandTotal: number
}

export interface DocumentAuthResult {
  orgId: string
  userId: string
}
