import { AlertCircle, CheckCircle, ImageIcon, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import { Progress } from '#/components/ui/progress'
import type { UploadItem } from '#/features/assets/upload-machine'
import { cn } from '#/lib/utils'
import type { AssetUploadDropzoneProps } from './types'
import { useUploadMachine } from './use-upload-machine'

interface PhotoGridUploadProps {
  items: UploadItem[]
  onItemsChange?: (items: UploadItem[]) => void
  config: AssetUploadDropzoneProps['config']
  adapter: AssetUploadDropzoneProps['adapter']
  acceptedMimeTypes: readonly string[]
  maxBytes: number
  disabled?: boolean
  onUploadComplete?: (assetId: string) => void
  onUploadError?: (itemId: string, error: string) => void
}

function PhotoThumbnail({
  item,
  onRemove,
  onRetry,
}: {
  item: UploadItem
  onRemove: (id: string) => void
  onRetry: (id: string) => void
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (item.file.type.startsWith('image/')) {
      const url = URL.createObjectURL(item.file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    return undefined
  }, [item.file])

  return (
    <div className="relative group rounded-lg border bg-background overflow-hidden">
      <div className="aspect-square flex items-center justify-center bg-muted">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={item.file.name}
            className="object-cover w-full h-full"
          />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      {item.status === 'uploading' || item.status === 'processing' ? (
        <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center p-2">
          <Progress value={item.progress} className="w-full h-1" />
          <span className="text-xs mt-1">{item.progress}%</span>
        </div>
      ) : item.status === 'failed' ? (
        <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
      ) : item.status === 'done' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-green-500/10">
          <CheckCircle className="h-6 w-6 text-green-500" />
        </div>
      ) : null}

      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {item.status === 'failed' && (
          <Button
            variant="secondary"
            size="icon"
            className="h-6 w-6"
            onClick={() => onRetry(item.id)}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="secondary"
          size="icon"
          className="h-6 w-6"
          onClick={() => onRemove(item.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

export function PhotoGridUpload(props: PhotoGridUploadProps) {
  const t = useTranslations('assetUpload')
  const onItemsChangeRef = useRef(props.onItemsChange)

  useEffect(() => {
    onItemsChangeRef.current = props.onItemsChange
  }, [props.onItemsChange])

  const machineResult = useUploadMachine(props.items, {
    adapter: props.adapter,
    onUploadComplete: props.onUploadComplete,
    onUploadError: props.onUploadError,
  })

  const { items, addFiles, removeItem, retryItem } = machineResult

  useEffect(() => {
    if (onItemsChangeRef.current) {
      onItemsChangeRef.current(items)
    }
  }, [items])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter(
        (file) =>
          file.size <= props.maxBytes &&
          props.acceptedMimeTypes.includes(file.type),
      )
      if (validFiles.length > 0) {
        addFiles(validFiles)
      }
    },
    [addFiles, props.acceptedMimeTypes, props.maxBytes],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.fromEntries(
      props.acceptedMimeTypes.map((mime) => [mime, []]),
    ),
    disabled: props.disabled,
    multiple: true,
  })

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'relative rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer',
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted',
          props.disabled && 'opacity-50 pointer-events-none',
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">{t('dropzone.title')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('dropzone.hint')}
          </p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => (
            <PhotoThumbnail
              key={item.id}
              item={item}
              onRemove={removeItem}
              onRetry={retryItem}
            />
          ))}
        </div>
      )}
    </div>
  )
}
