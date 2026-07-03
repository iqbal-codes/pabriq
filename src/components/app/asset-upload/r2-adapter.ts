import { USAGE_LIMITS } from '#/features/assets/model'
import {
  deleteAsset,
  finalizeUpload,
  getUploadUrl,
} from '#/features/assets/server'
import type { UploadItem } from '#/features/assets/upload-machine'
import type { AssetUploadConfig, UploaderAdapter, UploadResult } from './types'

import { computeSha256, uploadToSignedUrl } from './upload-utils'

export function createR2UploaderAdapter(
  config: AssetUploadConfig,
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
          getUploadUrl({
            data: {
              fileName: item.file.name,
              fileType: contentType,
              fileSize: item.file.size,
              ownerType: config.ownerType,
              ownerId: config.ownerId,
              usage: config.usage,
            },
          }),
        ])
      onProgress?.(10)

      await uploadToSignedUrl(uploadUrl, arrayBuffer, contentType, (pct) => {
        onProgress?.(10 + Math.round(pct * 0.7))
      })

      const result = await finalizeUpload({
        data: {
          assetId,
          draftId: config.ownerId ? undefined : crypto.randomUUID(),
          ownerType: config.ownerType,
          ownerId: config.ownerId,
          usage: config.usage,
          originalFilename: item.file.name,
          mimeType: contentType,
          sizeBytes: item.file.size,
          checksumSha256,
          storageKeyOriginal: storageKey,
          variantOriginalMimeType: contentType,
          variantOriginalSizeBytes: item.file.size,
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
      const result = await deleteAsset({ data: { assetId } })
      if (!result.ok) {
        throw new Error(result.error)
      }
    },
  }
}

export function getAcceptedMimeTypes(
  usage: keyof typeof USAGE_LIMITS,
): readonly string[] {
  switch (usage) {
    case 'logo':
    case 'profile':
      return ['image/png', 'image/jpeg', 'image/webp']
    case 'gallery':
      return [
        'image/png',
        'image/jpeg',
        'image/webp',
        'video/mp4',
        'video/webm',
      ]
    case 'attachment':
      return [
        'application/pdf',
        '.pdf',
        '.cdr',
        '.ai',
        '.zip',
        '.rar',
        '.png',
        '.jpg',
        '.jpeg',
        '.webp',
      ]
    case 'payment_proof':
      return ['image/png', 'image/jpeg', 'image/webp']
  }
}

export function getMaxBytes(usage: keyof typeof USAGE_LIMITS): number {
  return USAGE_LIMITS[usage].maxBytes
}
