import { USAGE_LIMITS } from '#/features/assets/model'
import {
  deleteAsset,
  finalizeUpload,
  getUploadUrl,
} from '#/features/assets/server'
import type { UploadItem } from '#/features/assets/upload-machine'
import type { AssetUploadConfig, UploaderAdapter, UploadResult } from './types'

async function computeSha256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function uploadToSignedUrl(
  uploadUrl: string,
  data: ArrayBuffer,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || event.total <= 0 || !onProgress) return
      onProgress(Math.round((event.loaded / event.total) * 100))
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      reject(new Error(`Upload failed with status ${xhr.status}`))
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network upload failed'))
    })

    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.send(data)
  })
}

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

      const checksumSha256 = await computeSha256(arrayBuffer)
      onProgress?.(10)

      const contentType = item.file.type || 'application/octet-stream'

      const { uploadUrl, storageKey, assetId } = await getUploadUrl({
        data: {
          fileName: item.file.name,
          fileType: contentType,
          fileSize: item.file.size,
          ownerType: config.ownerType,
          ownerId: config.ownerId,
          usage: config.usage,
        },
      })

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
        'image/png',
        'image/jpeg',
        'image/webp',
        'video/mp4',
        'video/webm',
        'application/pdf',
      ]
    case 'payment_proof':
      return ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
  }
}

export function getMaxBytes(usage: keyof typeof USAGE_LIMITS): number {
  return USAGE_LIMITS[usage].maxBytes
}
