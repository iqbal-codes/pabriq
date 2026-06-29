export type OrderFormValues = {
  customerId: string
  notes: string
  lineItems: Array<{
    id: string
    productId: string
    quantity: string
    unitPrice: string
    name: string
    notes: string
    attachments: string[]
  }>
}

export const defaultOrderValues = (): OrderFormValues => ({
  customerId: '',
  notes: '',
  lineItems: [],
})
