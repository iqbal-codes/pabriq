import { useQuery } from '@tanstack/react-query'
import { Download, Package } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
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

export function AssetExtensionPlaceholder({
  filename,
  fallbackLabel,
  className,
}: {
  filename: string
  fallbackLabel: string
  className?: string
}) {
  const ext = getExtension(filename)
  const label = ext || fallbackLabel.toUpperCase()
  return (
    <div
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted',
        className,
      )}
    >
      <span className="max-w-full truncate px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

function AssetFileRow({
  metadata,
  showSize = true,
  className,
  token,
  showImagePreview = true,
}: {
  metadata: AssetMetadata
  showSize?: boolean
  className?: string
  token?: string
  showImagePreview?: boolean
}) {
  const common = useTranslations('common')
  const isImage = metadata.assetKind === 'image'
  const shouldShowPreview = isImage && showImagePreview
  const { data: signedUrlData } = useQuery({
    queryKey: [
      'asset-signed-url',
      metadata.id,
      'original',
      'attachment',
      token,
    ].filter(Boolean),
    queryFn: () =>
      getAssetSignedUrl({
        data: {
          assetId: metadata.id,
          variantKey: 'original',
          token,
          disposition: 'attachment',
        },
      }),
    enabled: !shouldShowPreview,
    staleTime: 5 * 60 * 1000,
  })

  const rowContent = (
    <>
      {shouldShowPreview ? (
        <AssetImage
          assetId={metadata.id}
          assetKind={metadata.assetKind as AssetKind}
          className="rounded-lg shrink-0"
          token={token}
        />
      ) : (
        <AssetExtensionPlaceholder
          filename={metadata.originalFilename}
          fallbackLabel={common('file')}
          className={cn(!signedUrlData?.url && 'opacity-60')}
        />
      )}
      <div className="flex-1 min-w-0 w-0 overflow-hidden">
        <p className="truncate text-sm font-medium">
          {metadata.originalFilename}
        </p>
        {showSize && (
          <span className="text-xs text-muted-foreground">
            {formatBytes(metadata.sizeBytes)}
          </span>
        )}
      </div>
      {signedUrlData?.url && (
        <Download className="size-4 shrink-0 text-muted-foreground" />
      )}
    </>
  )

  const rowClasses = cn(
    'flex items-center gap-3 rounded-lg border py-2 pr-2 pl-3',
    signedUrlData?.url && 'hover:bg-accent/50 cursor-pointer',
    className,
  )

  if (signedUrlData?.url) {
    return (
      <a
        href={signedUrlData.url}
        download={metadata.originalFilename}
        aria-label={`${common('download')} ${metadata.originalFilename}`}
        className={rowClasses}
      >
        {rowContent}
      </a>
    )
  }

  return <div className={rowClasses}>{rowContent}</div>
}

function AssetFileGridCard({
  metadata,
  showSize = true,
  token,
  showImagePreview = true,
}: {
  metadata: AssetMetadata
  showSize?: boolean
  token?: string
  showImagePreview?: boolean
}) {
  const common = useTranslations('common')
  const isImage = metadata.assetKind === 'image'
  const shouldShowPreview = isImage && showImagePreview
  const { data: signedUrlData } = useQuery({
    queryKey: [
      'asset-signed-url',
      metadata.id,
      'original',
      'attachment',
      token,
    ].filter(Boolean),
    queryFn: () =>
      getAssetSignedUrl({
        data: {
          assetId: metadata.id,
          variantKey: 'original',
          token,
          disposition: 'attachment',
        },
      }),
    enabled: !shouldShowPreview,
    staleTime: 5 * 60 * 1000,
  })

  const cardContent = (
    <>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted/30">
        {shouldShowPreview ? (
          <AssetImage
            assetId={metadata.id}
            assetKind={metadata.assetKind as AssetKind}
            className="size-full rounded-none"
            token={token}
          />
        ) : (
          <AssetExtensionPlaceholder
            filename={metadata.originalFilename}
            fallbackLabel={common('file')}
            className="size-full rounded-none bg-transparent"
          />
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
    </>
  )

  const cardClasses =
    'group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md'

  if (signedUrlData?.url) {
    return (
      <a
        href={signedUrlData.url}
        download={metadata.originalFilename}
        aria-label={`${common('download')} ${metadata.originalFilename}`}
        className={cardClasses}
      >
        {cardContent}
      </a>
    )
  }

  return <div className={cardClasses}>{cardContent}</div>
}

type AssetFileListProps = {
  assetIds: string[]
  layout?: 'list' | 'grid'
  showSize?: boolean
  maxVisible?: number
  className?: string
  token?: string
  prefetchedAssets?: AssetMetadata[]
  showImagePreview?: boolean
}

export function AssetFileList({
  assetIds,
  layout = 'list',
  showSize = true,
  maxVisible,
  className,
  token,
  prefetchedAssets,
  showImagePreview = true,
}: AssetFileListProps) {
  const common = useTranslations('common')
  const { data: queriedAssets } = useQuery({
    queryKey: ['asset-file-meta', assetIds, token].filter(Boolean),
    queryFn: () => getAssetsMetadata({ data: { assetIds, token } }),
    enabled: assetIds.length > 0 && !prefetchedAssets,
    staleTime: 60 * 1000,
  })

  const assets = prefetchedAssets ?? queriedAssets

  if (!assets || assets.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
        <Package className="size-4" />
        <span>{common('noAttachments')}</span>
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
            showImagePreview={showImagePreview}
          />
        ))}
        {remaining > 0 && (
          <div className="flex aspect-square items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
            {common('moreFiles', { count: remaining })}
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
          showImagePreview={showImagePreview}
        />
      ))}
      {remaining > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          {common('moreFiles', { count: remaining })}
        </p>
      )}
    </div>
  )
}
