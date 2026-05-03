import { useQuery } from '@tanstack/react-query'
import { Package } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { getAssetSignedUrl } from '#/features/assets/server'
import { cn } from '#/lib/utils'

interface AssetImageProps {
  assetId: string | null
  className?: string
}

export function AssetImage({ assetId, className }: AssetImageProps) {
  const t = useTranslations('products')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['asset-signed-url', assetId],
    queryFn: () => {
      if (!assetId) throw new Error('assetId is required')
      return getAssetSignedUrl({ data: { assetId, variantKey: 'preview' } })
    },
    enabled: !!assetId,
    staleTime: 15 * 60 * 1000,
  })

  if (!assetId || isError) {
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

  if (isLoading || !data?.url) {
    return (
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg bg-muted animate-pulse shrink-0',
          className,
        )}
      />
    )
  }

  return (
    <img
      src={data.url}
      alt={t('noPhoto')}
      className={cn(
        'h-10 w-10 rounded-lg object-cover shrink-0 transition-opacity duration-150',
        className,
      )}
    />
  )
}
