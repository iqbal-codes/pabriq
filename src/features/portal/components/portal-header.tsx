import { GalleryVerticalEnd } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { cn } from '#/lib/utils'

interface PortalHeaderProps {
  orgLogoAssetId: string | null
  title?: string
  orderNumber?: string | null
  elevated?: boolean
}

export function PortalHeader({
  orgLogoAssetId,
  title,
  orderNumber,
  elevated,
}: PortalHeaderProps) {
  const t = useTranslations('portal')
  const resolvedTitle = title ?? t('orderPillLabel')

  return (
    <header
      className={cn(
        'sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur transition-shadow',
        elevated && 'shadow-[0_1px_0_0_var(--border),0_8px_24px_-12px_rgba(0,0,0,0.12)]',
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4 sm:px-6">
        {orgLogoAssetId ? (
          <AssetImage
            assetId={orgLogoAssetId}
            assetKind="image"
            className="size-8 rounded-lg object-cover"
          />
        ) : (
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="truncate text-sm font-semibold text-foreground">
            {resolvedTitle}
          </span>
          {orderNumber ? (
            <>
              <span aria-hidden className="text-muted-foreground/40">·</span>
              <span className="truncate font-mono text-xs text-muted-foreground">
                {orderNumber}
              </span>
            </>
          ) : null}
        </div>
      </div>
    </header>
  )
}
