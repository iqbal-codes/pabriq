import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AssetImage } from '#/components/app/asset-image'
import {
  createR2UploaderAdapter,
  getAcceptedMimeTypes,
  getMaxBytes,
  PhotoGridUpload,
} from '#/components/app/asset-upload'
import { Button } from '#/components/ui/button'
import type { OwnerType, Usage } from '#/features/assets/model'
import type { UploadItem } from '#/features/assets/upload-machine'
import { useFieldContext } from './form-context'
import type { FieldProps } from './form-fields-shared'
import { firstError } from './form-utils'

export type PhotoUploadFieldProps = FieldProps & {
  ownerType?: OwnerType
  usage?: Usage
  maxFiles?: number
}

export function PhotoUploadField({
  label,
  disabled,
  ownerType = 'customer',
  usage = 'profile',
  maxFiles = 1,
}: PhotoUploadFieldProps) {
  const field = useFieldContext<string | null>()
  const error = firstError(field.state.meta.errors)
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])

  const adapter = useMemo(
    () => createR2UploaderAdapter({ ownerType, usage }),
    [ownerType, usage],
  )

  function handleUploadComplete(assetId: string) {
    field.handleChange(assetId)
  }

  function handleRemovePhoto() {
    field.handleChange(null)
    setUploadItems([])
    field.handleBlur()
  }

  return (
    <div className="col-span-full" data-invalid={!!error}>
      {label && <span className="text-sm font-medium">{label}</span>}
      <div className="mt-1">
        {field.state.value ? (
          <div className="relative inline-block group">
            <AssetImage
              assetId={field.state.value}
              className="size-24 rounded-lg object-cover"
            />
            <Button
              variant="secondary"
              size="icon"
              className="absolute -top-2 -right-2 z-10 flex size-6 items-center justify-center rounded-full opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
              onClick={handleRemovePhoto}
              disabled={disabled}
            >
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <PhotoGridUpload
            items={uploadItems}
            onItemsChange={(items) => setUploadItems(items)}
            config={{ ownerType, usage, maxFiles }}
            adapter={adapter}
            acceptedMimeTypes={getAcceptedMimeTypes(usage)}
            maxBytes={getMaxBytes(usage)}
            onUploadComplete={handleUploadComplete}
            disabled={disabled}
          />
        )}
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
