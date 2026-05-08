import { AlertCircle, CheckCircle, RefreshCw, Upload, X } from 'lucide-react'
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import { Progress } from '#/components/ui/progress'
import type { UploadItem } from '#/features/assets/upload-machine'
import { cn } from '#/lib/utils'
import type { AssetUploadDropzoneProps } from './types'
import { isControlled } from './types'
import { useUploadMachine } from './use-upload-machine'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DropzoneIcon({ status }: { status: UploadItem['status'] }) {
  switch (status) {
    case 'done':
      return <CheckCircle className="h-8 w-8 text-success" />
    case 'failed':
      return <AlertCircle className="h-8 w-8 text-destructive" />
    case 'uploading':
    case 'processing':
      return <RefreshCw className="h-8 w-8 text-primary animate-spin" />
    default:
      return <Upload className="h-8 w-8 text-muted-foreground" />
  }
}

interface UploadItemRowProps {
  item: UploadItem
  onRemove: (id: string) => void
  onRetry: (id: string) => void
}

function UploadItemRow({ item, onRemove, onRetry }: UploadItemRowProps) {
  const t = useTranslations('assetUpload')
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <DropzoneIcon status={item.status} />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{item.file.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatBytes(item.file.size)}
          </span>
          {item.status === 'uploading' && (
            <span className="text-xs text-muted-foreground">
              {t('states.uploading')}
            </span>
          )}
          {item.status === 'processing' && (
            <span className="text-xs text-muted-foreground">
              {t('states.processing')}
            </span>
          )}
          {item.status === 'failed' && item.error && (
            <span className="text-xs text-destructive">{item.error}</span>
          )}
        </div>
        {(item.status === 'uploading' || item.status === 'processing') && (
          <Progress value={item.progress} className="mt-2 h-1" />
        )}
      </div>
      {item.status === 'failed' && (
        <Button variant="ghost" size="sm" onClick={() => onRetry(item.id)}>
          <RefreshCw className="h-4 w-4" />
          <span className="sr-only">{t('actions.retry')}</span>
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={() => onRemove(item.id)}>
        <X className="h-4 w-4" />
        <span className="sr-only">{t('actions.remove')}</span>
      </Button>
    </div>
  )
}

export function AssetUploadDropzone(props: AssetUploadDropzoneProps) {
  const t = useTranslations('assetUpload')

  const controlled = isControlled(props)
  const { adapter, acceptedMimeTypes, maxBytes, disabled } = props

  const handleUploadComplete = props.onUploadComplete
  const handleUploadError = props.onUploadError

  const machineResult = useUploadMachine(controlled ? [] : props.items, {
    adapter,
    onUploadComplete: handleUploadComplete,
    onUploadError: handleUploadError,
  })

  const { items, addFiles, removeItem, retryItem } = machineResult

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter((file) => {
        if (file.size > maxBytes) return false
        return acceptedMimeTypes.includes(file.type)
      })
      if (validFiles.length > 0) {
        addFiles(validFiles)
      }
    },
    [addFiles, acceptedMimeTypes, maxBytes],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.fromEntries(acceptedMimeTypes.map((mime) => [mime, []])),
    disabled,
    multiple: true,
  })

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted',
          disabled && 'opacity-50 pointer-events-none',
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-sm font-medium">{t('dropzone.title')}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('dropzone.hint')}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {t('hints.acceptedFormats', { size: formatBytes(maxBytes) })}
        </p>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <UploadItemRow
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
