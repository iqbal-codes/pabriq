export type InvoicePaymentSelection =
  | { paymentProvider: 'bank_transfer'; paymentMethodId: string }
  | { paymentProvider: 'midtrans'; paymentMethodId: null }

export function encodeBankPaymentSelection(paymentMethodId: string): string {
  return `bank:${paymentMethodId}`
}

export function parseInvoicePaymentSelection(
  value: string,
): InvoicePaymentSelection | null {
  if (!value) return null
  if (value === 'midtrans') {
    return { paymentProvider: 'midtrans', paymentMethodId: null }
  }
  if (value.startsWith('bank:')) {
    const id = value.slice(5)
    if (!id) return null
    return { paymentProvider: 'bank_transfer', paymentMethodId: id }
  }
  return null
}
