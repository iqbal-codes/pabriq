import { describe, expect, it } from 'vitest'
import {
  encodeBankPaymentSelection,
  parseInvoicePaymentSelection,
} from './payment-selection'

describe('parseInvoicePaymentSelection', () => {
  it('returns null for blank string', () => {
    expect(parseInvoicePaymentSelection('')).toBeNull()
  })

  it('parses midtrans', () => {
    const result = parseInvoicePaymentSelection('midtrans')
    expect(result).toEqual({
      paymentProvider: 'midtrans',
      paymentMethodId: null,
    })
  })

  it('parses bank:pm-1', () => {
    const result = parseInvoicePaymentSelection('bank:pm-1')
    expect(result).toEqual({
      paymentProvider: 'bank_transfer',
      paymentMethodId: 'pm-1',
    })
  })

  it('returns null for unknown prefix', () => {
    expect(parseInvoicePaymentSelection('unknown:123')).toBeNull()
  })
})

describe('encodeBankPaymentSelection', () => {
  it('encodes payment method id', () => {
    expect(encodeBankPaymentSelection('pm-1')).toBe('bank:pm-1')
  })
})
