import type { OwnerType, Usage } from '#/features/assets/model'
import type { UploadItem } from '#/features/assets/upload-machine'

export type UploaderAdapter = {
  uploadFile: (
    item: UploadItem,
    onProgress?: (pct: number) => void,
  ) => Promise<UploadResult>
  removeFile: (assetId: string) => Promise<void>
}

export type UploadResult = {
  assetId: string
  variants: {
    variantKey: string
    storageKey: string
    mimeType: string
    sizeBytes: number
  }[]
}

export type AssetUploadConfig = {
  ownerType: OwnerType
  ownerId?: string
  usage: Usage
  maxFiles?: number
  maxConcurrency?: number
}

export type AssetUploadDropzoneProps =
  | (AssetUploadDropzonePropsControlled & { items?: never })
  | (AssetUploadDropzonePropsUncontrolled & { items: UploadItem[] })

export type AssetUploadDropzonePropsBase = {
  config: AssetUploadConfig
  adapter: UploaderAdapter
  acceptedMimeTypes: readonly string[]
  maxBytes: number
  disabled?: boolean
  onUploadComplete?: (assetId: string) => void
  onUploadError?: (itemId: string, error: string) => void
}

export type AssetUploadDropzonePropsControlled =
  AssetUploadDropzonePropsBase & {
    onItemsChange: (items: UploadItem[]) => void
  }

export type AssetUploadDropzonePropsUncontrolled =
  AssetUploadDropzonePropsBase & {
    items: UploadItem[]
  }

export function isControlled(
  props: AssetUploadDropzoneProps,
): props is AssetUploadDropzonePropsControlled {
  return 'onItemsChange' in props && props.onItemsChange !== undefined
}
