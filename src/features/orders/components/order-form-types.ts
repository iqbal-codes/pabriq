import type { ShippingAddress } from '#/features/address/model'

export type OrderFormValues = {
  customerId: string
  notes: string
  address: ShippingAddress
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
  address: {
    areaId: '',
    areaName: '',
    streetAddress: '',
  },
  lineItems: [],
})
