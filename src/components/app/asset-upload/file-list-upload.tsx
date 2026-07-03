import { FileIcon, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { useTranslations } from 'use-intl'
import { CircularProgress } from '#/components/customized/progress/progress-08'
import { Button } from '#/components/ui/button'
import type { UploadItem } from '#/features/assets/upload-machine'
import { cn } from '#/lib/utils'
import type { AssetUploadDropzoneProps, UploadCompletePayload } from './types'
import { useUploadMachine } from './use-upload-machine'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface FileListUploadProps {
  items: UploadItem[]
  onItemsChange?: (items: UploadItem[]) => void
  config: AssetUploadDropzoneProps['config']
  adapter: AssetUploadDropzoneProps['adapter']
  acceptedMimeTypes: readonly string[]
  maxBytes: number
  disabled?: boolean
  keepCompletedItems?: boolean
  onUploadComplete?: (payload: UploadCompletePayload) => void
  onUploadError?: (itemId: string, error: string) => void
}

function FileRow({
  item,
  onRemove,
  onRetry,
}: {
  item: UploadItem
  onRemove: (id: string) => void
  onRetry: (id: string) => void
}) {
  const t = useTranslations('assetUpload')

  return (
    <div className="flex items-center gap-3 rounded-lg border py-2 pr-2 pl-3">
      <FileIcon className="h-7 w-10 text-muted-foreground" />
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
          {item.status === 'done' && (
            <span className="text-xs text-success">{t('states.done')}</span>
          )}
          {item.status === 'failed' && item.error && (
            <span className="text-xs text-destructive">{item.error}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {(item.status === 'uploading' || item.status === 'processing') && (
          <CircularProgress value={item.progress} strokeWidth={2} size={40} />
        )}
        {item.status === 'failed' && (
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={() => onRetry(item.id)}
          >
            <RefreshCw />
          </Button>
        )}
        {item.status === 'done' && (
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={() => onRemove(item.id)}
          >
            <X />
          </Button>
        )}
      </div>
    </div>
  )
}

export function FileListUpload(props: FileListUploadProps) {
  const t = useTranslations('assetUpload')
  const onItemsChangeRef = useRef(props.onItemsChange)

  useEffect(() => {
    onItemsChangeRef.current = props.onItemsChange
  }, [props.onItemsChange])

  const machineResult = useUploadMachine(props.items, {
    adapter: props.adapter,
    keepCompletedItems: props.keepCompletedItems,
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
      const validFiles = acceptedFiles.filter((file) => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase()
        return (
          file.size <= props.maxBytes &&
          (props.acceptedMimeTypes.length === 0 ||
            props.acceptedMimeTypes.includes(file.type) ||
            props.acceptedMimeTypes.includes(ext))
        )
      })
      if (validFiles.length > 0) {
        addFiles(validFiles)
      }
    },
    [addFiles, props.acceptedMimeTypes, props.maxBytes],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:
      props.acceptedMimeTypes.length > 0
        ? Object.fromEntries(props.acceptedMimeTypes.map((mime) => [mime, []]))
        : undefined,
    disabled: props.disabled,
    multiple: true,
  })

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted',
          props.disabled && 'opacity-50 pointer-events-none',
        )}
      >
        <input {...getInputProps()} />
        <FileIcon className="size-10 text-muted-foreground mb-4" />
        <p className="text-sm font-medium">{t('dropzone.title')}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('dropzone.hint')}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {t('hints.acceptedFormats', { size: formatBytes(props.maxBytes) })}
        </p>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <FileRow
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
