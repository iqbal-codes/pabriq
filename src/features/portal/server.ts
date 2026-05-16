import { createServerFn } from '@tanstack/react-start'
import type { Usage } from '#/features/assets/model'
import type {
  ConfirmPortalOrderInput,
  UpdatePortalLineItemInput,
} from './model'

async function getOrgIdFromToken(token: string): Promise<string> {
  const { getPortalOrder } = await import('./model')
  const result = await getPortalOrder(token)
  if (!result.ok) throw new Error('Invalid token')
  return result.order.orgId
}

export const portalGetUploadUrlFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      token: string
      fileName: string
      fileType: string
      fileSize: number
      lineItemId: string
    }) => input,
  )
  .handler(
    async ({
      data,
    }): Promise<{ uploadUrl: string; storageKey: string; assetId: string }> => {
      const [orgId, { buildUploadUrl }] = await Promise.all([
        getOrgIdFromToken(data.token),
        import('#/features/assets/model'),
      ])
      return buildUploadUrl(
        orgId,
        'order',
        data.lineItemId,
        data.fileName,
        data.fileType,
        data.fileSize,
        'attachment' as Usage,
      )
    },
  )

export const portalFinalizeUploadFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      token: string
      lineItemId: string
      assetId: string
      originalFilename: string
      mimeType: string
      sizeBytes: number
      checksumSha256?: string
      storageKey: string
    }) => input,
  )
  .handler(async ({ data }) => {
    const [orgId, { insertAsset }] = await Promise.all([
      getOrgIdFromToken(data.token),
      import('#/features/assets/model'),
    ])
    const result = await insertAsset({
      assetId: data.assetId,
      orgId,
      ownerType: 'order',
      ownerId: data.lineItemId,
      usage: 'attachment',
      originalFilename: data.originalFilename,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      checksumSha256: data.checksumSha256 ?? null,
      storageKeyOriginal: data.storageKey,
      variantOriginalMimeType: data.mimeType,
      variantOriginalSizeBytes: data.sizeBytes,
    })
    return result
  })

export const getPortalOrderFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const { getPortalOrder } = await import('./model')
    return getPortalOrder(data.token)
  })

export const confirmPortalOrderFn = createServerFn({ method: 'POST' })
  .inputValidator((input: ConfirmPortalOrderInput) => input)
  .handler(
    async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
      const { confirmPortalOrder } = await import('./model')
      return confirmPortalOrder(data)
    },
  )

export const generateOrderTokenFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data }) => {
    const { generateOrderToken } = await import('./model')
    const token = await generateOrderToken(data.orderId)
    return { ok: true as const, token }
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

export const portalRemoveUploadFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { token: string; assetId: string }) => input)
  .handler(async ({ data }) => {
    const { removePortalAsset } = await import('./model')
    return removePortalAsset(data.token, data.assetId)
  })

export const savePortalAddressFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      orderId: string
      areaId: string
      areaName: string
      streetAddress: string
    }) => input,
  )
  .handler(async ({ data }) => {
    const { savePortalAddress } = await import('./model')
    return savePortalAddress(data.orderId, {
      areaId: data.areaId,
      areaName: data.areaName,
      streetAddress: data.streetAddress,
    })
  })

export const portalGetInvoiceUploadUrlFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      token: string
      invoiceId: string
      fileName: string
      fileType: string
      fileSize: number
    }) => input,
  )
  .handler(
    async ({
      data,
    }): Promise<{ uploadUrl: string; storageKey: string; assetId: string }> => {
      const orgId = await getOrgIdFromToken(data.token)
      const { buildUploadUrl } = await import('#/features/assets/model')
      return buildUploadUrl(
        orgId,
        'invoice',
        data.invoiceId,
        data.fileName,
        data.fileType,
        data.fileSize,
        'payment_proof' as Usage,
      )
    },
  )

export const submitPaymentProofFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      token: string
      invoiceId: string
      assetId: string
      originalFilename: string
      mimeType: string
      sizeBytes: number
      storageKey: string
    }) => input,
  )
  .handler(
    async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        const [orgId, { insertAsset }] = await Promise.all([
          getOrgIdFromToken(data.token),
          import('#/features/assets/model'),
        ])
        await insertAsset({
          assetId: data.assetId,
          orgId,
          ownerType: 'invoice',
          ownerId: data.invoiceId,
          usage: 'payment_proof',
          originalFilename: data.originalFilename,
          mimeType: data.mimeType,
          sizeBytes: data.sizeBytes,
          checksumSha256: null,
          storageKeyOriginal: data.storageKey,
          variantOriginalMimeType: data.mimeType,
          variantOriginalSizeBytes: data.sizeBytes,
        })
        return { ok: true }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        }
      }
    },
  )

export const getOrderTasksTimelineFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const { getOrderTasksTimeline } = await import('./model')
    return getOrderTasksTimeline(data.token)
  })
