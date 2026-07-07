import { renderToBuffer } from '@react-pdf/renderer'
import { describe, expect, it } from 'vitest'
import {
  formatPdfCurrency,
  formatPdfDate,
  formatPdfDateTime,
  formatPdfPercent,
} from './pdf-format'
import { InvoiceDocument } from './templates/invoice'
import type { InvoicePdfData } from './types'

describe('PDF Indonesian formatters', () => {
  it('formats dates with Indonesian day-month-year order', () => {
    const result = formatPdfDate(new Date('2026-06-29T12:00:00.000Z'))
    expect(result).toContain('29')
    expect(result).toContain('Jun')
    expect(result).toContain('2026')
  })

  it('formats IDR currency with Indonesian separators', () => {
    const result = formatPdfCurrency(1_250_000)
    expect(result).toContain('1.250.000,00')
  })

  it('formats percentages with two decimals', () => {
    expect(formatPdfPercent(11)).toBe('11.00%')
  })

  it('formats dates and times together', () => {
    const date = new Date(2026, 6, 2, 14, 30)
    const result = formatPdfDateTime(date)
    expect(result).toContain('02')
    expect(result).toContain('Jul')
    expect(result).toContain('2026')
    expect(result).toContain('14:30')
  })
})

describe('InvoiceDocument PDF Rendering', () => {
  const mockInvoiceData: InvoicePdfData = {
    org: {
      name: 'Toko MJ',
      email: 'mj@example.com',
      phone: '88802309350',
      address: 'Jl. ciroyom',
      logoUrl: null,
    },
    invoiceNumber: 'INV-2026-0001',
    issuedDate: '2026-07-02',
    dueDate: '2026-08-01',
    createdAt: '2026-07-02T14:30:00.000Z',
    percentage: 50,
    paymentLabel: 'Uang Muka (DP) 50%',
    customer: {
      name: 'Muhammad Iqbal',
      email: 'iqbal@example.com',
      phone: '88802309350',
      address: 'Jl. ciroyom',
    },
    lineItems: [
      {
        description: 'Patch Karet 3D',
        quantity: 300,
        unitPrice: 25000,
        taxPercent: 0,
        total: 7500000,
      },
    ],
    subtotal: 7500000,
    taxes: 0,
    total: 3750000,
    shippingFee: 0,
    lateFee: 0,
    alreadyPaid: 0,
    shippingAddress: null,
    notes: null,
    paymentMethod: null,
  }

  it('renders invoice with partial percentage payment correctly', async () => {
    const buffer = await renderToBuffer(
      <InvoiceDocument data={mockInvoiceData} />,
    )
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('renders full payment invoice correctly', async () => {
    const fullInvoiceData = {
      ...mockInvoiceData,
      percentage: null,
      paymentLabel: null,
      total: 7500000,
    }
    const buffer = await renderToBuffer(
      <InvoiceDocument data={fullInvoiceData} />,
    )
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(0)
  })
})
