import { AlertCircle, CheckCircle, ImageIcon, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
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
    <div className="relative size-24 rounded-lg border bg-background overflow-hidden group shrink-0">
      <div className="flex items-center justify-center bg-muted w-full h-full">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={item.file.name}
            className="object-cover w-full h-full"
          />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground" />
        )}
      </div>

      {item.status === 'uploading' || item.status === 'processing' ? (
        <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center p-1">
          <Progress value={item.progress} className="w-full h-0.5" />
          <span className="text-[10px] mt-0.5">{item.progress}%</span>
        </div>
      ) : item.status === 'failed' ? (
        <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="size-5 text-destructive" />
        </div>
      ) : item.status === 'done' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-green-500/10">
          <CheckCircle className="size-5 text-green-500" />
        </div>
      ) : null}

      <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
        {item.status === 'failed' && (
          <Button
            variant="secondary"
            size="icon"
            className="size-5"
            onClick={() => onRetry(item.id)}
          >
            <RefreshCw className="size-2.5" />
          </Button>
        )}
        <Button
          variant="secondary"
          size="icon"
          className="size-5"
          onClick={() => onRemove(item.id)}
        >
          <X className="size-2.5" />
        </Button>
      </div>
    </div>
  )
}

export function PhotoGridUpload(props: PhotoGridUploadProps) {
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
    <div className="flex flex-wrap gap-2">
      <div
        {...getRootProps()}
        className={cn(
          'size-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted transition-colors cursor-pointer shrink-0',
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted',
          props.disabled && 'opacity-50 pointer-events-none',
        )}
      >
        <input {...getInputProps()} />
        <ImageIcon className="size-6 text-muted-foreground" />
      </div>

      {items.map((item) => (
        <PhotoThumbnail
          key={item.id}
          item={item}
          onRemove={removeItem}
          onRetry={retryItem}
        />
      ))}
    </div>
  )
}
