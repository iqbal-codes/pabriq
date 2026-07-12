import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { AssetExtensionPlaceholder } from '#/components/app/asset-file'
import { AssetImage } from '#/components/app/asset-image'
import type { UploaderAdapter } from '#/components/app/asset-upload'
import {
  createPortalR2UploaderAdapter,
  createR2UploaderAdapter,
  FileListUpload,
  getAcceptedMimeTypes,
  getMaxBytes,
} from '#/components/app/asset-upload'
import { Button } from '#/components/ui/button'
import type { OwnerType, Usage } from '#/features/assets/model'
import type { AssetMetadata } from '#/features/assets/server'
import { getAssetsMetadata } from '#/features/assets/server'
import type { UploadItem } from '#/features/assets/upload-machine'
import { useFieldContext } from './form-context-base'
import type { FieldProps } from './form-fields-shared'
import { FormLabel } from './form-label'
import { firstError } from './form-utils'

export type FileUploadFieldProps = FieldProps & {
  ownerType?: OwnerType
  ownerId?: string
  usage?: Usage
  maxFiles?: number
  acceptedMimeTypes?: readonly string[]
}

export type PortalFileUploadFieldProps = FieldProps & {
  token: string
  lineItemId: string
  usage?: Usage
  maxFiles?: number
  acceptedMimeTypes?: readonly string[]
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getAssetKindFromMimeType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  return 'file'
}

export function ExistingFileRow({
  metadata,
  onRemove,
  token,
}: {
  metadata: AssetMetadata
  onRemove?: () => void
  token?: string
}) {
  const t = useTranslations('assetUpload')
  const common = useTranslations('common')

  return (
    <div className="flex items-center gap-3 rounded-lg border py-2 pr-2 pl-3">
      {metadata.assetKind === 'image' ? (
        <AssetImage
          assetId={metadata.id}
          assetKind="image"
          className="rounded-lg"
          token={token}
        />
      ) : (
        <AssetExtensionPlaceholder
          filename={metadata.originalFilename}
          fallbackLabel={common('file')}
          className="rounded-lg"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-left truncate text-sm font-medium">
          {metadata.originalFilename}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatBytes(metadata.sizeBytes)}
          </span>
          <span className="text-xs text-success">{t('states.uploaded')}</span>
        </div>
      </div>
      {onRemove && (
        <Button variant="ghost" size="icon-lg" onClick={() => onRemove()}>
          <X />
        </Button>
      )}
    </div>
  )
}

export function ExistingFileList({
  assets,
  token,
  onRemove,
}: {
  assets: readonly AssetMetadata[]
  token?: string
  onRemove?: (asset: AssetMetadata) => void | Promise<void>
}) {
  if (assets.length === 0) return null
  return (
    <div className="space-y-2">
      {assets.map((asset) => (
        <ExistingFileRow
          key={asset.id}
          metadata={asset}
          onRemove={onRemove ? () => onRemove(asset) : undefined}
          token={token}
        />
      ))}
    </div>
  )
}

type FileUploadFieldBaseProps = FieldProps & {
  adapter: UploaderAdapter
  queryKey: string[]
  ownerType: OwnerType
  ownerId?: string
  usage?: Usage
  maxFiles?: number
  acceptedMimeTypes?: readonly string[]
  token?: string
}

function FileUploadFieldBase({
  label,
  optional,
  optionalLabel,
  requiredLabel,
  disabled,
  adapter,
  queryKey,
  ownerType,
  ownerId,
  usage = 'attachment',
  maxFiles = 50,
  acceptedMimeTypes,
  token,
}: FileUploadFieldBaseProps) {
  const field = useFieldContext<string[]>()
  const error = firstError(field.state.meta.errors)
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const [optimisticAssets, setOptimisticAssets] = useState<AssetMetadata[]>([])
  const assetIds = field.state.value ?? []

  const mimeTypes = acceptedMimeTypes ?? getAcceptedMimeTypes(usage)
  const maxBytes = getMaxBytes(usage)

  const { data: existingAssets } = useQuery({
    queryKey: [...queryKey, assetIds, token].filter(Boolean),
    queryFn: () => getAssetsMetadata({ data: { assetIds, token } }),
    enabled: assetIds.length > 0,
    placeholderData: (previousData) => previousData,
  })

  const displayedAssets = useMemo(() => {
    const assetsById = new Map(
      existingAssets?.map((asset) => [asset.id, asset]),
    )
    for (const asset of optimisticAssets) {
      if (!assetsById.has(asset.id)) {
        assetsById.set(asset.id, asset)
      }
    }

    return [...assetIds]
      .reverse()
      .map((assetId) => assetsById.get(assetId))
      .filter((asset): asset is AssetMetadata => asset !== undefined)
  }, [assetIds, existingAssets, optimisticAssets])

  function handleUploadComplete(upload: { assetId: string; file: File }) {
    setOptimisticAssets((current) => [
      ...current.filter((asset) => asset.id !== upload.assetId),
      {
        id: upload.assetId,
        originalFilename: upload.file.name,
        mimeType: upload.file.type || 'application/octet-stream',
        sizeBytes: upload.file.size,
        assetKind: getAssetKindFromMimeType(upload.file.type),
      },
    ])

    field.handleChange([...(field.state.value ?? []), upload.assetId])
  }

  async function handleRemoveAsset(
    assetId: string,
    index: number,
  ): Promise<void> {
    try {
      await adapter.removeFile(assetId)
      setOptimisticAssets((current) =>
        current.filter((asset) => asset.id !== assetId),
      )
      field.handleChange(
        (field.state.value ?? []).filter((_, i) => i !== index),
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="col-span-full" data-invalid={!!error}>
      <FormLabel
        label={label}
        optional={optional}
        optionalLabel={optionalLabel}
        requiredLabel={requiredLabel}
        field={field}
      />
      <div className="mt-1 space-y-3">
        <FileListUpload
          items={uploadItems}
          onItemsChange={(items) => setUploadItems(items)}
          config={{ ownerType, ownerId, usage, maxFiles }}
          adapter={adapter}
          acceptedMimeTypes={mimeTypes}
          maxBytes={maxBytes}
          keepCompletedItems={false}
          onUploadComplete={handleUploadComplete}
          disabled={disabled}
        />
        <ExistingFileList
          assets={displayedAssets}
          token={token}
          onRemove={(asset) => {
            const index = assetIds.indexOf(asset.id)
            if (index !== -1) return handleRemoveAsset(asset.id, index)
          }}
        />
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}

export function FileUploadField({
  ownerType = 'order',
  ownerId,
  usage = 'attachment',
  maxFiles = 50,
  acceptedMimeTypes,
  label,
  optional,
  optionalLabel,
  requiredLabel,
  disabled,
}: FileUploadFieldProps) {
  const adapter = useMemo(
    () => createR2UploaderAdapter({ ownerType, ownerId, usage }),
    [ownerType, ownerId, usage],
  )

  return (
    <FileUploadFieldBase
      label={label}
      optional={optional}
      optionalLabel={optionalLabel}
      requiredLabel={requiredLabel}
      disabled={disabled}
      adapter={adapter}
      queryKey={['assets-metadata']}
      ownerType={ownerType}
      ownerId={ownerId}
      usage={usage}
      maxFiles={maxFiles}
      acceptedMimeTypes={acceptedMimeTypes}
    />
  )
}

export function PortalFileUploadField({
  token,
  lineItemId,
  usage = 'attachment',
  maxFiles = 50,
  acceptedMimeTypes,
  label,
  optional,
  optionalLabel,
  requiredLabel,
  disabled,
}: PortalFileUploadFieldProps) {
  const adapter = useMemo(
    () =>
      createPortalR2UploaderAdapter({
        ownerType: 'order',
        ownerId: lineItemId,
        usage,
        token,
      }),
    [token, lineItemId, usage],
  )

  return (
    <FileUploadFieldBase
      label={label}
      optional={optional}
      optionalLabel={optionalLabel}
      requiredLabel={requiredLabel}
      disabled={disabled}
      adapter={adapter}
      queryKey={['portal-assets-metadata']}
      ownerType="order"
      usage={usage}
      maxFiles={maxFiles}
      acceptedMimeTypes={acceptedMimeTypes}
      token={token}
    />
  )
}
