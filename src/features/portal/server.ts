import { createServerFn } from '@tanstack/react-start'
import type { UpdatePortalLineItemInput } from './model'

export const getPortalOrderFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const { getPortalOrder } = await import('./model')
    return getPortalOrder(data.token)
  })

export const confirmPortalOrderFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data }) => {
    const { confirmPortalOrder } = await import('./model')
    return confirmPortalOrder(data.orderId)
  })

export const generateOrderTokenFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data }) => {
    const { generateOrderToken } = await import('./model')
    return generateOrderToken(data.orderId)
  })

export const updatePortalLineItemFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { itemId: string } & UpdatePortalLineItemInput) => input,
  )
  .handler(async ({ data }) => {
    const { updatePortalLineItem } = await import('./model')
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
    const { savePortalAddress } = await import('./model')
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
