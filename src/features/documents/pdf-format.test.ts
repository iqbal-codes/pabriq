import { describe, expect, it } from 'vitest'
import {
  formatPdfCurrency,
  formatPdfDate,
  formatPdfPercent,
} from './pdf-format'

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
})
