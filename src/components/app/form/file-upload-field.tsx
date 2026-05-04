import { useQuery } from '@tanstack/react-query'
import { FileIcon, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
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
import { useFieldContext } from './form-context'
import type { FieldProps } from './form-fields-shared'
import { firstError } from './form-utils'

export type FileUploadFieldProps = FieldProps & {
  ownerType?: OwnerType
  usage?: Usage
  maxFiles?: number
  acceptedMimeTypes?: readonly string[]
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileKindIcon({ kind }: { kind: string }) {
  if (kind === 'image' || kind === 'video') {
    return <FileIcon className="h-5 w-5 text-muted-foreground" />
  }
  return <FileIcon className="h-5 w-5 text-muted-foreground" />
}

function ExistingFileRow({
  metadata,
  onRemove,
}: {
  metadata: AssetMetadata
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <FileKindIcon kind={metadata.assetKind} />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">
          {metadata.originalFilename}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatBytes(metadata.sizeBytes)}
          </span>
          <span className="text-xs text-green-600">uploaded</span>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function FileUploadField({
  label,
  disabled,
  ownerType = 'order',
  usage = 'attachment',
  maxFiles = 50,
  acceptedMimeTypes,
}: FileUploadFieldProps) {
  const field = useFieldContext<string[]>()
  const error = firstError(field.state.meta.errors)
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const assetIds = field.state.value ?? []

  const mimeTypes = acceptedMimeTypes ?? getAcceptedMimeTypes(usage)
  const maxBytes = getMaxBytes(usage)

  const adapter = useMemo(
    () => createR2UploaderAdapter({ ownerType, usage }),
    [ownerType, usage],
  )

  const { data: existingAssets } = useQuery({
    queryKey: ['assets-metadata', assetIds],
    queryFn: () => getAssetsMetadata({ data: { assetIds } }),
    enabled: assetIds.length > 0,
  })

  function handleUploadComplete(assetId: string) {
    field.handleChange([...assetIds, assetId])
  }

  function handleRemoveAsset(index: number) {
    field.handleChange(assetIds.filter((_, i) => i !== index))
  }

  return (
    <div className="col-span-full" data-invalid={!!error}>
      {label && <span className="text-sm font-medium">{label}</span>}
      <div className="mt-1 space-y-3">
        {existingAssets && existingAssets.length > 0 && (
          <div className="space-y-2">
            {existingAssets.map((asset) => {
              const index = assetIds.indexOf(asset.id)
              return (
                <ExistingFileRow
                  key={asset.id}
                  metadata={asset}
                  onRemove={() => handleRemoveAsset(index)}
                />
              )
            })}
          </div>
        )}
        <FileListUpload
          items={uploadItems}
          onItemsChange={(items) => setUploadItems(items)}
          config={{ ownerType, usage, maxFiles }}
          adapter={adapter}
          acceptedMimeTypes={mimeTypes}
          maxBytes={maxBytes}
          onUploadComplete={handleUploadComplete}
          disabled={disabled}
        />
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
