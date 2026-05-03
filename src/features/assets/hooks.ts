import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '#/lib/query-keys'
import type { VariantKey } from './model'
import { getAssetSignedUrl } from './server'

export function useAssetSignedUrl(
  assetId: string | null,
  variantKey: VariantKey = 'preview',
) {
  return useQuery({
    queryKey: queryKeys.assets.signedUrl(assetId ?? ''),
    queryFn: () =>
      getAssetSignedUrl({ data: { assetId: assetId ?? '', variantKey } }),
    enabled: !!assetId,
    staleTime: 15 * 60 * 1000,
  })
}
