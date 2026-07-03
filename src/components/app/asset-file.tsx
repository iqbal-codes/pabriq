import { useQuery } from '@tanstack/react-query'
import {
  ExternalLink,
  File,
  FileArchive,
  FileSpreadsheet,
  FileText,
  FileType,
  Package,
} from 'lucide-react'
import { AssetImage } from '#/components/app/asset-image'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import type { AssetKind } from '../../features/assets/model'
import type { AssetMetadata } from '../../features/assets/server'
import {
  getAssetSignedUrl,
  getAssetsMetadata,
} from '../../features/assets/server'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? (parts.pop() ?? '').toUpperCase() : ''
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return FileText
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
    return FileSpreadsheet
  if (
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.startsWith('text/')
  )
    return FileText
  if (
    mimeType.includes('zip') ||
    mimeType.includes('rar') ||
    mimeType.includes('tar') ||
    mimeType.includes('7z') ||
    mimeType.includes('gzip') ||
    mimeType.includes('compress')
  )
    return FileArchive
  if (
    mimeType.startsWith('font/') ||
    mimeType.includes('json') ||
    mimeType.includes('xml') ||
    mimeType.includes('csv')
  )
    return FileType
  return File
}

function FileIconDisplay({
  mimeType,
  className,
}: {
  mimeType: string
  className?: string
}) {
  const Icon = getFileIcon(mimeType)
  return <Icon className={cn('shrink-0', className)} />
}

function AssetFileRow({
  metadata,
  showSize = true,
  className,
  token,
}: {
  metadata: AssetMetadata
  showSize?: boolean
  className?: string
  token?: string
}) {
  const isImage = metadata.assetKind === 'image'
  const isVideo = metadata.assetKind === 'video'
  const isPreviewable = isImage || isVideo
  const ext = getExtension(metadata.originalFilename)
  const { data: signedUrlData } = useQuery({
    queryKey: ['asset-signed-url', metadata.id, 'original', token].filter(
      Boolean,
    ),
    queryFn: () =>
      getAssetSignedUrl({
        data: { assetId: metadata.id, variantKey: 'original', token },
      }),
    enabled: !isPreviewable,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border py-2 pr-2 pl-3',
        className,
      )}
    >
      {isPreviewable ? (
        <AssetImage
          assetId={metadata.id}
          assetKind={metadata.assetKind as AssetKind}
          className="rounded-lg shrink-0"
          token={token}
        />
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <FileIconDisplay
            mimeType={metadata.mimeType}
            className="size-5 text-muted-foreground"
          />
        </div>
      )}
      <div className="flex-1 min-w-0 w-0 overflow-hidden">
        <p className="truncate text-sm font-medium">
          {metadata.originalFilename}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {showSize && (
            <span className="text-xs text-muted-foreground">
              {formatBytes(metadata.sizeBytes)}
            </span>
          )}
          {!isPreviewable && ext && (
            <Badge variant="outline" className="text-xs leading-3 py-0 h-4">
              {ext}
            </Badge>
          )}
        </div>
      </div>
      {!isPreviewable && signedUrlData?.url && (
        <Button variant="ghost" size="icon-sm" asChild className="shrink-0">
          <a
            href={signedUrlData.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download"
          >
            <ExternalLink className="size-4" />
          </a>
        </Button>
      )}
    </div>
  )
}

function AssetFileGridCard({
  metadata,
  showSize = true,
  token,
}: {
  metadata: AssetMetadata
  showSize?: boolean
  token?: string
}) {
  const isImage = metadata.assetKind === 'image'
  const isVideo = metadata.assetKind === 'video'
  const isPreviewable = isImage || isVideo
  const ext = getExtension(metadata.originalFilename)

  const { data: signedUrlData } = useQuery({
    queryKey: ['asset-signed-url', metadata.id, 'original', token].filter(
      Boolean,
    ),
    queryFn: () =>
      getAssetSignedUrl({
        data: { assetId: metadata.id, variantKey: 'original', token },
      }),
    enabled: !isPreviewable,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
      <div className="flex aspect-square items-center justify-center bg-muted/30">
        {isPreviewable ? (
          <AssetImage
            assetId={metadata.id}
            assetKind={metadata.assetKind as AssetKind}
            className="size-full rounded-lg object-cover"
            token={token}
          />
        ) : (
          <div className="flex items-center justify-center">
            <FileIconDisplay
              mimeType={metadata.mimeType}
              className="size-12 text-muted-foreground"
            />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-2.5">
        <p className="truncate text-xs font-medium leading-tight">
          {metadata.originalFilename}
        </p>
        {showSize && (
          <p className="text-xs text-muted-foreground">
            {formatBytes(metadata.sizeBytes)}
          </p>
        )}
      </div>
      {!isPreviewable && signedUrlData?.url && (
        <Button
          variant="ghost"
          size="icon-sm"
          asChild
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur"
        >
          <a
            href={signedUrlData.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={metadata.originalFilename}
          >
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      )}
      {!isPreviewable && ext && (
        <Badge
          variant="secondary"
          className="absolute top-1.5 left-1.5 text-xs leading-3 py-0 h-4"
        >
          {ext}
        </Badge>
      )}
    </div>
  )
}

type AssetFileListProps = {
  assetIds: string[]
  layout?: 'list' | 'grid'
  showSize?: boolean
  maxVisible?: number
  className?: string
  token?: string
}

export function AssetFileList({
  assetIds,
  layout = 'list',
  showSize = true,
  maxVisible,
  className,
  token,
}: AssetFileListProps) {
  const { data: assets } = useQuery({
    queryKey: ['asset-file-meta', assetIds, token].filter(Boolean),
    queryFn: () => getAssetsMetadata({ data: { assetIds, token } }),
    enabled: assetIds.length > 0,
    staleTime: 60 * 1000,
  })

  if (!assets || assets.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
        <Package className="size-4" />
        <span>No attachments</span>
      </div>
    )
  }

  const visible = maxVisible ? assets.slice(0, maxVisible) : assets
  const remaining = maxVisible ? assets.length - maxVisible : 0

  if (layout === 'grid') {
    return (
      <div
        className={cn(
          'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3',
          className,
        )}
      >
        {visible.map((asset) => (
          <AssetFileGridCard
            key={asset.id}
            metadata={asset}
            showSize={showSize}
            token={token}
          />
        ))}
        {remaining > 0 && (
          <div className="flex aspect-square items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
            +{remaining} more
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {visible.map((asset) => (
        <AssetFileRow
          key={asset.id}
          metadata={asset}
          showSize={showSize}
          token={token}
        />
      ))}
      {remaining > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          +{remaining} more file{remaining > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
