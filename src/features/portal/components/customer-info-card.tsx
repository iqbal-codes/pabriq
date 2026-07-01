import { Phone, User } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { cn } from '#/lib/utils'

interface CustomerInfoCardProps {
  name: string | null
  phone: string | null
  photoAssetId: string | null
  className?: string
  compact?: boolean
}

export function CustomerInfoCard({
  name,
  phone,
  photoAssetId,
  className,
  compact,
}: CustomerInfoCardProps) {
  const t = useTranslations('portal')

  if (!name && !phone) return null

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border bg-card p-4',
        compact && 'p-3',
        className,
      )}
    >
      {photoAssetId ? (
        <AssetImage
          assetId={photoAssetId}
          assetKind="image"
          className={cn(
            'shrink-0 rounded-full object-cover',
            compact ? 'size-8' : 'size-10',
          )}
        />
      ) : (
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-muted',
            compact ? 'size-8' : 'size-10',
          )}
        >
          <User
            className={cn(
              'text-muted-foreground',
              compact ? 'size-4' : 'size-5',
            )}
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('customerInfo')}
        </p>
        {name ? (
          <p className="mt-0.5 truncate text-sm font-medium text-foreground">
            {name}
          </p>
        ) : null}
        {phone ? (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground tabular-nums">
            <Phone className="size-3" />
            {phone}
          </p>
        ) : null}
      </div>
    </div>
  )
}
