import type { OrderForInvoice } from '#/features/invoices/model'

export type InvoicePercentageMode = 'full' | 'remaining' | 'custom'

export type CreateInvoiceLineItemValue = {
  description: string
  quantity: number
  unitPrice: number
}

export type CreateInvoiceFormValues = {
  customerId: string
  customerName: string
  dueDate: string
  paymentMethodId: string
  notes: string
  lineItems: CreateInvoiceLineItemValue[]
}

export function defaultCreateInvoiceValues(
  orderData: OrderForInvoice | null,
): CreateInvoiceFormValues {
  if (orderData) {
    return {
      customerId: orderData.order.customerId ?? '',
      customerName: orderData.order.customerName ?? '',
      dueDate: '',
      paymentMethodId: '',
      notes: '',
      lineItems: orderData.lineItems.map((item) => ({
        description: item.name ?? '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    }
  }
  return {
    customerId: '',
    customerName: '',
    dueDate: '',
    paymentMethodId: '',
    notes: '',
    lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
  }
}
