import { useQuery } from '@tanstack/react-query'
import { FileIcon, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  createPortalR2UploaderAdapter,
  FileListUpload,
  getAcceptedMimeTypes,
  getMaxBytes,
} from '#/components/app/asset-upload'
import { Button } from '#/components/ui/button'
import type { Usage } from '#/features/assets/model'
import { getAssetsMetadata } from '#/features/assets/server'
import type { UploadItem } from '#/features/assets/upload-machine'
import { useFieldContext } from './form-context'
import type { FieldProps } from './form-fields-shared'
import { firstError } from './form-utils'

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

export function PortalFileUploadField({
  label,
  disabled,
  token,
  lineItemId,
  usage = 'attachment',
  maxFiles = 50,
  acceptedMimeTypes,
}: PortalFileUploadFieldProps) {
  const field = useFieldContext<string[]>()
  const error = firstError(field.state.meta.errors)
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const assetIds = field.state.value ?? []

  const mimeTypes = acceptedMimeTypes ?? getAcceptedMimeTypes(usage)
  const maxBytes = getMaxBytes(usage)

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

  const { data: existingAssets } = useQuery({
    queryKey: ['portal-assets-metadata', assetIds],
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
              const idx = assetIds.indexOf(asset.id)
              return (
                <div
                  key={asset.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">
                      {asset.originalFilename}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(asset.sizeBytes)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAsset(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
        <FileListUpload
          items={uploadItems}
          onItemsChange={(items) => setUploadItems(items)}
          config={{ ownerType: 'order', usage, maxFiles }}
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
