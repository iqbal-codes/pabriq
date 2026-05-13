import { GalleryVerticalEnd } from 'lucide-react'
import { AssetImage } from '#/components/app/asset-image'

interface PortalHeaderProps {
  orgLogoAssetId: string | null
  title: string
}

export function PortalHeader({ orgLogoAssetId, title }: PortalHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
      {orgLogoAssetId ? (
        <AssetImage
          assetId={orgLogoAssetId}
          assetKind="image"
          className="size-8 rounded-lg"
        />
      ) : (
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GalleryVerticalEnd className="size-4" />
        </div>
      )}
      <span className="text-sm font-medium">{title}</span>
    </header>
  )
}
