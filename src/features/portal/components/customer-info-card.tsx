import { Phone, User } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'

interface CustomerInfoCardProps {
  name: string | null
  phone: string | null
  photoAssetId: string | null
}

export function CustomerInfoCard({
  name,
  phone,
  photoAssetId,
}: CustomerInfoCardProps) {
  const t = useTranslations('portal')

  if (!name) return null

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        {photoAssetId ? (
          <AssetImage
            assetId={photoAssetId}
            assetKind="image"
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <User className="size-5 text-muted-foreground" />
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-card-foreground">
            {t('customerInfo')}
          </p>
          <p className="text-sm text-card-foreground">{name}</p>
          {phone && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              {phone}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
