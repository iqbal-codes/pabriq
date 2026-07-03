import { X } from 'lucide-react'
import type React from 'react'
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
import { useFieldContext } from './form-context-base'
import type { FieldProps } from './form-fields-shared'
import { FormLabel } from './form-label'
import { firstError } from './form-utils'

function PhotoPreviewTile({
  assetId,
  disabled,
  onRemove,
}: {
  assetId: string
  disabled?: boolean
  onRemove: () => void
}): React.ReactElement {
  return (
    <div className="relative inline-block group">
      <AssetImage
        assetId={assetId}
        assetKind="image"
        className="size-24 rounded-lg object-cover"
      />
      <Button
        variant="secondary"
        size="icon"
        className="absolute -top-2 -right-2 z-10 flex size-6 items-center justify-center rounded-full opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
        onClick={onRemove}
        disabled={disabled}
      >
        <X className="size-3" />
      </Button>
    </div>
  )
}

export type PhotoUploadFieldProps = FieldProps & {
  ownerType?: OwnerType
  usage?: Usage
  maxFiles?: number
  multiple?: boolean
}

function PhotoUploadFieldSingle({
  label,
  optional,
  optionalLabel,
  requiredLabel,
  disabled,
  ownerType,
  usage,
  maxFiles,
}: {
  label?: string
  optional?: boolean
  optionalLabel?: string
  requiredLabel?: string
  disabled?: boolean
  ownerType: OwnerType
  usage: Usage
  maxFiles: number
}) {
  const field = useFieldContext<string | null>()
  const error = firstError(field.state.meta.errors)
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])

  const adapter = useMemo(
    () => createR2UploaderAdapter({ ownerType, usage }),
    [ownerType, usage],
  )

  function handleUploadComplete(upload: { assetId: string }) {
    field.handleChange(upload.assetId)
  }

  function handleRemovePhoto() {
    field.handleChange(null)
    setUploadItems([])
    field.handleBlur()
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
      <div className="mt-1">
        {field.state.value ? (
          <PhotoPreviewTile
            assetId={field.state.value}
            disabled={disabled}
            onRemove={handleRemovePhoto}
          />
        ) : (
          <PhotoGridUpload
            items={uploadItems}
            onItemsChange={(items) => setUploadItems(items)}
            config={{ ownerType, usage, maxFiles }}
            adapter={adapter}
            acceptedMimeTypes={getAcceptedMimeTypes(usage)}
            maxBytes={getMaxBytes(usage)}
            keepCompletedItems={false}
            onUploadComplete={handleUploadComplete}
            disabled={disabled}
          />
        )}
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}

function PhotoUploadFieldMultiple({
  label,
  optional,
  optionalLabel,
  requiredLabel,
  disabled,
  ownerType,
  usage,
  maxFiles,
}: {
  label?: string
  optional?: boolean
  optionalLabel?: string
  requiredLabel?: string
  disabled?: boolean
  ownerType: OwnerType
  usage: Usage
  maxFiles: number
}) {
  const field = useFieldContext<string[]>()
  const error = firstError(field.state.meta.errors)
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const assetIds = field.state.value ?? []

  const adapter = useMemo(
    () => createR2UploaderAdapter({ ownerType, usage }),
    [ownerType, usage],
  )

  function handleUploadComplete(upload: { assetId: string }) {
    field.handleChange([...(field.state.value ?? []), upload.assetId])
  }

  function handleRemovePhoto(index: number) {
    field.handleChange(assetIds.filter((_, i) => i !== index))
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
        {assetIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {assetIds.map((assetId, i) => (
              <PhotoPreviewTile
                key={assetId}
                assetId={assetId}
                disabled={disabled}
                onRemove={() => handleRemovePhoto(i)}
              />
            ))}
          </div>
        )}
        {assetIds.length < maxFiles && (
          <PhotoGridUpload
            items={uploadItems}
            onItemsChange={(items) => setUploadItems(items)}
            config={{ ownerType, usage, maxFiles }}
            adapter={adapter}
            acceptedMimeTypes={getAcceptedMimeTypes(usage)}
            maxBytes={getMaxBytes(usage)}
            keepCompletedItems={false}
            onUploadComplete={handleUploadComplete}
            disabled={disabled}
          />
        )}
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}

export function PhotoUploadField({
  label,
  optional,
  optionalLabel,
  requiredLabel,
  disabled,
  ownerType = 'customer',
  usage = 'profile',
  maxFiles = 1,
  multiple = false,
}: PhotoUploadFieldProps) {
  if (multiple) {
    return (
      <PhotoUploadFieldMultiple
        label={label}
        optional={optional}
        optionalLabel={optionalLabel}
        requiredLabel={requiredLabel}
        disabled={disabled}
        ownerType={ownerType}
        usage={usage}
        maxFiles={maxFiles}
      />
    )
  }

  return (
    <PhotoUploadFieldSingle
      label={label}
      optional={optional}
      optionalLabel={optionalLabel}
      requiredLabel={requiredLabel}
      disabled={disabled}
      ownerType={ownerType}
      usage={usage}
      maxFiles={maxFiles}
    />
  )
}
