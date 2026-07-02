export type OrderFormValues = {
  customerId: string
  notes: string
  lineItems: Array<{
    id: string
    productId: string
    quantity: string
    unitPrice: string
    designName: string
    notes: string
    attachments: string[]
    addonIds: string[]
    isRepeatOrder: boolean
    deadline: string
    manualDeadline: boolean
  }>
}

export const defaultOrderValues = (): OrderFormValues => ({
  customerId: '',
  notes: '',
  lineItems: [],
})
