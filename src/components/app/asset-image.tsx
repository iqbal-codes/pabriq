import { useQuery } from '@tanstack/react-query'
import { Package, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '#/components/ui/dialog'
import type { AssetKind } from '#/features/assets/model'
import { getAssetSignedUrl } from '#/features/assets/server'
import { cn } from '#/lib/utils'

interface AssetImageProps {
  assetId: string | null
  assetKind?: AssetKind
  className?: string
}

const previewableKinds: readonly AssetKind[] = ['image', 'video']

export function AssetImage({ assetId, assetKind, className }: AssetImageProps) {
  const common = useTranslations('common')
  const [open, setOpen] = useState(false)
  const isPreviewable = assetKind ? previewableKinds.includes(assetKind) : false

  const previewQuery = useQuery({
    queryKey: ['asset-signed-url', assetId, 'preview'],
    queryFn: () => {
      if (!assetId) throw new Error('assetId is required')
      return getAssetSignedUrl({ data: { assetId, variantKey: 'preview' } })
    },
    enabled: !!assetId && isPreviewable,
    staleTime: 15 * 60 * 1000,
  })

  const originalQuery = useQuery({
    queryKey: ['asset-signed-url', assetId, 'original'],
    queryFn: () => {
      if (!assetId) throw new Error('assetId is required')
      return getAssetSignedUrl({ data: { assetId, variantKey: 'original' } })
    },
    enabled: !!assetId && isPreviewable && open,
    staleTime: 15 * 60 * 1000,
  })

  if (!assetId || !isPreviewable || previewQuery.isError) {
    return (
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0',
          className,
        )}
      >
        <Package className="h-5 w-5 text-muted-foreground" />
      </div>
    )
  }

  if (previewQuery.isLoading || !previewQuery.data?.url) {
    return (
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg bg-muted animate-pulse shrink-0',
          className,
        )}
      />
    )
  }

  const previewLabel = common('preview')
  const closeLabel = common('close')
  const thumbnailUrl = previewQuery.data.url
  const dialogUrl = originalQuery.data?.url ?? thumbnailUrl

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label={previewLabel}
          className={cn(
            'group relative inline-flex h-10 w-10 shrink-0 overflow-hidden bg-transparent p-0 shadow-none transition-transform duration-150 hover:scale-[1.02] hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            className,
          )}
        >
          {assetKind === 'video' ? (
            <video
              src={thumbnailUrl}
              muted
              playsInline
              preload="metadata"
              tabIndex={-1}
              className={cn(
                'pointer-events-none h-full w-full object-cover',
                className,
              )}
            />
          ) : (
            <img
              src={thumbnailUrl}
              alt=""
              className={cn(
                'pointer-events-none h-full w-full object-cover',
                className,
              )}
            />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-label={previewLabel}
        showCloseButton={false}
        className="max-w-6xl w-full rounded-none border-0 bg-transparent p-0 shadow-none outline-none"
      >
        <div className="relative mx-auto w-full">
          <DialogClose asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              aria-label={closeLabel}
              className="absolute top-2 right-2 z-10 rounded-full bg-background/80 shadow-sm backdrop-blur"
            >
              <X className="size-4" />
            </Button>
          </DialogClose>
          {assetKind === 'video' ? (
            <video
              src={dialogUrl}
              controls
              preload="metadata"
              className="max-h-[85vh] w-full max-w-6xl object-contain"
            >
              <track
                kind="captions"
                label={previewLabel}
                srcLang="en"
                src="data:text/vtt,WEBVTT%0A%0A"
                default
              />
            </video>
          ) : (
            <img
              src={dialogUrl}
              alt=""
              className="max-h-[85vh] w-full max-w-6xl object-contain"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
