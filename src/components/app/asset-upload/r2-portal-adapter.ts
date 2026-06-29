import type { UploadItem } from '#/features/assets/upload-machine'
import {
  portalFinalizeUploadFn,
  portalGetUploadUrlFn,
  portalRemoveUploadFn,
} from '#/features/portal/server'
import type { AssetUploadConfig, UploaderAdapter, UploadResult } from './types'

import { computeSha256, uploadToSignedUrl } from './upload-utils'

export function createPortalR2UploaderAdapter(
  config: AssetUploadConfig & { token: string },
): UploaderAdapter {
  return {
    async uploadFile(
      item: UploadItem,
      onProgress?: (pct: number) => void,
    ): Promise<UploadResult> {
      const arrayBuffer = await item.file.arrayBuffer()
      onProgress?.(5)

      const contentType = item.file.type || 'application/octet-stream'

      const [checksumSha256, { uploadUrl, storageKey, assetId }] =
        await Promise.all([
          computeSha256(arrayBuffer),
          portalGetUploadUrlFn({
            data: {
              token: config.token,
              fileName: item.file.name,
              fileType: contentType,
              fileSize: item.file.size,
              lineItemId: config.ownerId ?? '',
            },
          }),
        ])
      onProgress?.(10)

      await uploadToSignedUrl(uploadUrl, arrayBuffer, contentType, (pct) => {
        onProgress?.(10 + Math.round(pct * 0.7))
      })

      const result = await portalFinalizeUploadFn({
        data: {
          token: config.token,
          lineItemId: config.ownerId ?? '',
          assetId,
          originalFilename: item.file.name,
          mimeType: contentType,
          sizeBytes: item.file.size,
          checksumSha256,
          storageKey,
        },
      })

      return {
        assetId: result.assetId,
        variants: result.variants.map((v) => ({
          variantKey: v.variantKey,
          storageKey: v.storageKey,
          mimeType: v.mimeType,
          sizeBytes: v.sizeBytes,
        })),
      }
    },

    async removeFile(assetId: string): Promise<void> {
      const result = await portalRemoveUploadFn({
        data: {
          token: config.token,
          assetId,
        },
      })
      if (!result.ok) {
        throw new Error(result.error)
      }
    },
  }
}
