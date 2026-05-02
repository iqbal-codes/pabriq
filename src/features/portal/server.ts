import { createServerFn } from '@tanstack/react-start'
import {
  confirmPortalOrder,
  generateOrderToken,
  getPortalOrder,
  savePortalAddress,
  type UpdatePortalLineItemInput,
  updatePortalLineItem,
} from './model'

export const getPortalOrderFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    return getPortalOrder(data.token)
  })

export const confirmPortalOrderFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data }) => {
    return confirmPortalOrder(data.orderId)
  })

export const generateOrderTokenFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data }) => {
    return generateOrderToken(data.orderId)
  })

export const updatePortalLineItemFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { itemId: string } & UpdatePortalLineItemInput) => input,
  )
  .handler(async ({ data }) => {
    return updatePortalLineItem(data.itemId, {
      name: data.name,
      notes: data.notes,
      assetId: data.assetId,
    })
  })

export const savePortalAddressFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      orderId: string
      areaId: string
      areaName: string
      streetAddress: string
      isWni: boolean
    }) => input,
  )
  .handler(async ({ data }) => {
    return savePortalAddress(
      data.orderId,
      {
        areaId: data.areaId,
        areaName: data.areaName,
        streetAddress: data.streetAddress,
      },
      data.isWni,
    )
  })
